# Tax Filing & Portfolio Analytics — UX Overhaul Spec

## Goal
Make **Tax Filing** and **Portfolio Analytics** pages behave like proper routed
pages (no first-click flicker), use the same **expand/collapse per feature**
pattern as Investment Tracking, and tighten table/chart spacing so content
stops overlapping.

## Reference patterns (read-only context)

### Investment Tracking — expand/collapse pattern
`src/app/features/investments-tracking/pages/investments/investments.component.html`
hosts three independent `<app-expansion-panel>` siblings:

```html
<app-upload-transactions></app-upload-transactions>
<app-transactions-table></app-transactions-table>
<app-all-transactions></app-all-transactions>
```

Each one wraps its body in `<app-expansion-panel [title] [subtitle] [titleIcon]
[iconBgClass] [isExpanded]>` (see
`src/app/shared/components/expansion-panel/expansion-panel.component.ts`).
Default `isExpanded = true`; clicking the header toggles it.

### Investment Tracking — table spacing
- Cell padding: `px-4 py-3` (`transactions-table.component.html`) — NOT `px-3 py-2`.
- Every cell uses `whitespace-nowrap` plus an explicit `truncate max-w-[…px]` +
  `[title]` for long fields.
- `table-scroll-container` wraps every `<p-table>` for horizontal scroll.
- Sortable headers use the same wrapper: `<div class="flex items-center gap-1
  whitespace-nowrap">Label <p-sortIcon field="…"/></div>`.

### Tax Filing — current wrapper causing flicker
`tax-filing.component.html` line 3:
```html
<div [ngClass]="{ 'flow-page-enter': !loading, 'opacity-0': loading }"
  class="w-full min-h-screen flex flex-col bg-[#191919]">
```
`loading: true` on init → `opacity-0` → invisible page → after data resolves,
`loading: false` → `flow-page-enter` (blur + fade) animation plays. This is
what creates the "first click takes time, second click is instant" feel.

## Required behaviour

1. **No page-load flicker.** Both pages must render their layout shell (header
   strip, panels) immediately on navigation. The skeleton/empty state for
   "loading data" may appear inside the panel body, but the page chrome and
   the panel headers must always be visible from frame 0.

2. **Expand/collapse per feature.** Each page must wrap its major sections in
   `<app-expansion-panel>` with a clear title, subtitle, and icon. Default
   state is `isExpanded = true` (matches investment tracking). Clicking the
   header OR the Collapse/Expand button toggles.

   - **Tax Filing** — three panels:
     1. *Tax Summary* (4 KPI cards)
     2. *Filters* (FY + asset type filter strip)
     3. *Capital Gains Reports* (FY-wise table + per-stock table)
     4. *Tax FAQ / Notes* (small static help block — collapsed by default)

   - **Portfolio Analytics** — four panels:
     1. *Date Range Filter* (date preset + custom range + chips)
     2. *Performance Summary* (5 KPI cards)
     3. *Charts* (4 charts in 2×2 grid)
     4. *Top Movers* (winners + losers tables)
     5. *Current Holdings* (holdings table)

   Each panel header gets a distinct gradient icon background matching the
   page accent colour (tax filing → blue `#3B82F6`, portfolio analytics →
   purple `#8B5CF6`) and a relevant lucide icon
   (`BarChart3`, `Filter`, `FileSpreadsheet`, `Calendar`, etc.).

3. **Tight table & chart spacing.** Adopt the investment-tracking reference
   exactly:
   - Every `<td>`/`<th>` uses `px-4 py-3` and `whitespace-nowrap`.
   - Long text fields use `truncate max-w-[200-240px]` plus `[title]` attr.
   - All `<p-table>` wrapped in `.table-scroll-container` (already styled in
     the page's CSS).
   - `<p-chart>` containers keep `h-72` minimum; add `flex flex-col gap-4` to
     chart panels so labels, headers, and canvas are vertically stacked with
     1rem gaps (no overlap with KPI card grid above).
   - Numeric cells: `text-right tabular-nums whitespace-nowrap`.
   - Add explicit `min-w-[64rem]` (per-stock), `min-w-[80rem]` (wide reports)
     on `<p-table>` via `[tableStyle]` — already present, keep it.

4. **Scroll restoration on Portfolio Analytics.** Keep `<html>` scroll reset
   on navigation by adding `window.scrollTo({ top: 0, behavior: 'instant' as
   ScrollBehavior })` inside `ngOnInit` (Angular standalone routing does not
   auto-restore). This makes the page feel like a fresh route, not an
   in-place re-render.

5. **Loading affordance without opacity flicker.** Replace `opacity-0`
   wrapper with a localised skeleton. Inside each data-driven panel body,
   while `loading === true`, render a small "Loading…" indicator (matches the
   portfolio-analytics existing loading state). The page chrome stays
   visible.

## Files to touch

| File | Change |
|---|---|
| `src/app/features/tax-filing/pages/tax-filing/tax-filing.component.html` | Remove flicker wrapper; wrap content in 4 `<app-expansion-panel>`; standardise cell padding to `px-4 py-3`; tighten chart-free spacing |
| `src/app/features/tax-filing/pages/tax-filing/tax-filing.component.ts` | Import `ExpansionPanelComponent`; add `scrollTo(0,0)` in `ngOnInit` |
| `src/app/features/tax-filing/pages/tax-filing/tax-filing.component.css` | Add `.section-stack { display:flex; flex-direction:column; gap:1.5rem; }`; tighten `.p-datatable` cell padding override to match reference (14px / py-3) |
| `src/app/features/portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.html` | Wrap sections in 5 `<app-expansion-panel>`; standardise `px-4 py-3`; add gap-4 wrapper around charts |
| `src/app/features/portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.ts` | Import `ExpansionPanelComponent`; add scroll-to-top in `ngOnInit` |
| `src/app/features/portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.css` | Mirror investment-tracking cell padding (13px → 14px) for consistency |

## Reuse, don't reinvent
- `<app-expansion-panel>` is already a standalone, well-tested component — use
  it as-is. Do **not** modify it.
- `LucideIconsModule` and `PrimeNgModule` already provide every icon and
  PrimeNG control we need.
- Existing CSS files already dark-theme the tables correctly. We only adjust
  padding/font-size to match the reference.

## Acceptance criteria

For **Tax Filing** (`/tax-filing`):
- [ ] Navigating from `/home` (first click) shows the page header + 4 panel
      headers instantly. No `opacity-0` flash.
- [ ] All four panels (`Tax Summary`, `Filters`, `Capital Gains Reports`,
      `Tax FAQ / Notes`) are collapsible independently.
- [ ] Every table cell uses `px-4 py-3` and `whitespace-nowrap`; numeric
      columns are right-aligned with `tabular-nums`; long stock names are
      truncated with `max-w-[220px]` + `[title]`.
- [ ] On screen width ≥ 1280px the FY-wise and per-stock tables fit fully;
      on smaller widths the `.table-scroll-container` provides horizontal
      scroll with no content overlap.

For **Portfolio Analytics** (`/portfolio-analytics`):
- [ ] Navigating from `/home` (first click) renders page header + 5 panel
      headers instantly. No flicker.
- [ ] All five panels (`Date Range Filter`, `Performance Summary`, `Charts`,
      `Top Movers`, `Current Holdings`) are collapsible independently.
- [ ] The 4-chart grid is vertically separated from KPI cards by ≥ 1.5rem.
- [ ] Top Movers and Holdings tables use `px-4 py-3`; numeric cells right-
      aligned with `tabular-nums`; column widths do not overlap.

For **both pages**:
- [ ] `npm run build` succeeds with no new warnings or errors.
- [ ] No console errors on first navigation.
- [ ] Browser scroll position resets to top on every navigation.

## Out of scope
- No backend / API changes.
- No new dependencies.
- No changes to the `<app-expansion-panel>` itself.
- No changes to the investment-tracking page (reference, must stay untouched).
- No changes to the header navigation.
- No dark/light theme toggle work.

## Implementation order

1. **Chunk 1 — Tax Filing wrapper fix only (small, isolated).**
   Files: `tax-filing.component.html` (remove flicker wrapper, add scroll
   reset, ensure header strip + 1 skeleton-friendly section), `.ts` (add
   `scrollTo`), `.css` (cell padding).
   Complexity: **simple**. Verifies the flicker-free pattern in isolation.

2. **Chunk 2 — Tax Filing panel restructuring + table padding.**
   Files: `tax-filing.component.html` (4 `<app-expansion-panel>` wrappers,
   `px-4 py-3` sweep), `.ts` (import `ExpansionPanelComponent`),
   `.css` (padding tweak).
   Complexity: **simple**. Reuses existing expansion panel; mostly template
   restructuring.

3. **Chunk 3 — Portfolio Analytics panel restructuring + spacing.**
   Files: `portfolio-analytics.component.html` (5 `<app-expansion-panel>`,
   `px-4 py-3` sweep, chart-grid gap-4), `.ts` (import + `scrollTo`),
   `.css` (padding tweak).
   Complexity: **simple**. Same pattern as Chunk 2, different page.

4. **Chunk 4 — Build verification.**
   Run `npm run build`. Iterate on any TS / template errors.
   Complexity: **simple**. Standard lint/build gate.

Each chunk's spec is detailed enough for a standard-tier Builder. No
concurrency, no algorithms, no async design decisions required — the
expansion-panel API is fixed and the data flow in both pages is already
correct.
