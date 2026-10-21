# Review — Tax Filing & Portfolio Analytics UX Overhaul

**Verdict:** NEEDS_FIXES

## Summary
Tax Filing passes all 10 acceptance criteria. Portfolio Analytics fails criterion 3: the loading block is rendered AFTER Panel A inside the `@if/@else` chain, but the spec requires it at the TOP of `<main>`, BEFORE Panel A. TypeScript compiles cleanly (`npx tsc -p tsconfig.app.json --noEmit` exits 0).

## Acceptance criteria — Tax Filing
- [x] PASS — Flicker wrapper removed. Line 3 is unconditional: `<div class="w-full min-h-screen flex flex-col bg-[#191919]">`. No `flow-page-enter` / `opacity-0` anywhere in `tax-filing.component.html` (grep returns no matches).
- [x] PASS — 4 `<app-expansion-panel>` blocks in spec order. Line 53 (Tax Summary, `BarChart3`), line 124 (Filters, `Filter`), line 208 (Capital Gains Reports, `FileSpreadsheet`), line 380 (Tax FAQ / Notes, `Info`). Each carries `[title] [subtitle] [titleIcon] [iconBgClass]` matching the spec.
- [x] PASS — Panel D (`isExpanded="false"`) at line 380; Panels A/B/C carry `[isExpanded]="true"`.
- [x] PASS — Empty state sits outside Panel C and before it. The `@if (!loading && !hasRows)` block is at line 156-170; Panel C opens at line 208.
- [x] PASS — Mock-data banner at top of `<main>` (lines 30-41), before Panel A at line 53.
- [x] PASS — Loading inside Panel A (KPI grid) at lines 75-117 using `@if (!loading) { ... } @else { Loading summary… }`. Loading inside Panel C at lines 217-220 using `@if (loading) { Loading reports… }`.
- [x] PASS — Every `<td>` and `<th>` in both `<p-table>` instances uses `px-4 py-3` (FY-wise table lines 235-291, Per-stock table lines 359-405). Grep for `px-3 py-2` in this file only finds it on the Reset button (line 167), not on any table cell.
- [x] PASS — `tax-filing.component.ts:135-137` calls `window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })` BEFORE `this.loadTemporary()` (line 140) and `this.loadPortfolio()` (line 141).
- [x] PASS — `ExpansionPanelComponent` imported at `tax-filing.component.ts:17` and added to `imports` array at line 73.
- [x] PASS — `tax-filing.component.css` last lines append the cell-padding override: `:host ::ng-deep .p-datatable .p-datatable-thead > tr > th, :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem !important; }`.

## Acceptance criteria — Portfolio Analytics
- [x] PASS — 5 `<app-expansion-panel>` blocks in spec order. Line 47 (Date Range Filter, `Calendar`), line 150 (Performance Summary, `Sparkles`), line 234 (Charts, `BarChart3`), line 304 (Top Movers, `TrendingUp`), line 408 (Current Holdings, `Briefcase`). Each carries `[title] [subtitle] [titleIcon] [iconBgClass]` matching the spec.
- [x] PARTIAL — Panel A (`<app-expansion-panel>` Date Range Filter at line 47) is correctly OUTSIDE the `@if/@else` chain. Panels B, C, D, E are correctly INSIDE the `@else` branch (line 146 wraps them, line 506 closes the chain). However the loading block currently starts the `@if` chain AT line 115, AFTER Panel A — see Issue 1 below.
- [x] FAIL — Loading block `@if (loading)` at line 115 sits AFTER Panel A (which closes at line 113), not at the TOP of `<main>` BEFORE Panel A. Spec is explicit: "Loading block sits at the TOP of `<main>`, BEFORE Panel A."
- [x] PASS — Empty state (`@else if (filteredRows.length === 0)`) at lines 122-145 sits AFTER Panel A. Spec explicitly permits "BEFORE Panel A or AFTER Panel A".
- [x] PASS — Mock-data banner at top of `<main>` (lines 30-41), before Panel A.
- [x] PASS — Chart grid in Panel C uses `gap-4`: line 240 `<section class="grid grid-cols-1 lg:grid-cols-2 gap-4">`. The `gap-6` on line 317 is for the Top Movers grid in Panel D (Winners + Losers side-by-side), which the spec does not restrict.
- [x] PASS — Every `<td>` and `<th>` in the three `<p-table>` instances (Winners line 312+, Losers line 348+, Holdings line 442+) uses `px-4 py-3`. The lone `px-3 py-2` in the file (line 75) is on the Reset filter button, not a table cell.
- [x] PASS — `portfolio-analytics.component.ts:155-157` calls `window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })` BEFORE `this.loadTemporaryTransactions()` (line 160) and `this.loadPortfolioTransactions()` (line 161).
- [x] PASS — `ExpansionPanelComponent` imported at `portfolio-analytics.component.ts:15` and added to `imports` array at lines 58 and 60.
- [x] PASS — `portfolio-analytics.component.css` font-size is `14px` (lines 31 and 38); the `padding: 0.75rem 1rem !important` override is appended as the last block of the file.

## Cross-cutting
- PASS — No new npm dependencies. Implementation only edits template, TS, and CSS of the two pages; no `package.json` modification implied.
- PASS — `src/app/shared/components/expansion-panel/expansion-panel.component.ts` unchanged (read-only reference).
- PASS — `npx tsc -p tsconfig.app.json --noEmit` exits 0 with no output (no type errors, no missing imports, no broken references).
- PASS — All referenced component symbols (`ExpansionPanelComponent`, `LucideIconsModule`, `PrimeNgModule`, `FooterComponent`) are present in both component `imports` arrays.

## Issues (if NEEDS_FIXES)
1. **[portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.html:115]** — The loading block `@if (loading) { ... }` opens at line 115, AFTER Panel A (which closes at line 113). The spec requires the loading block to sit at the TOP of `<main>`, BEFORE Panel A. Fix: move the loading block above Panel A and out of the shared `@if/@else` chain. Concretely, replace the current structure with three top-level siblings inside `<main>`:
   - mock-data banner (lines 30-41, unchanged)
   - a standalone `@if (loading) { <div ...Loading transactions…</div> }` block placed BEFORE the Panel A `<app-expansion-panel>` tag
   - Panel A `<app-expansion-panel>` (line 47, unchanged)
   - then the existing `@else if (filteredRows.length === 0) { ... } @else { Panels B-E }` chain (Panels B-E must still only render when there's data)

   This satisfies all three sub-criteria simultaneously: Panel A stays outside any conditional (always visible), the loading block sits above it, and Panels B-E remain gated on `filteredRows.length > 0`.
