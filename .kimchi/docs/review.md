# Review: Tax Filing + Portfolio Analytics Features

## Verdict
APPROVED

## Build status
- `tsc --noEmit -p tsconfig.app.json`: PASS (exit 0, no errors)
- `tsc --noEmit -p tsconfig.spec.json`: PASS (exit 0; only the pre-existing `ForgotPasswordComponent` export error in `change-password.component.spec.ts`, ignored per instructions)
- Unit tests: did not run (Chromium unavailable in WSL; pre-existing spec error blocks Karma)

## Files reviewed
- `src/app/core/services/portfolio-analytics.service.ts` — ✅
- `src/app/core/services/portfolio-analytics.service.spec.ts` — ✅
- `src/app/core/prime-ng.module.ts` — ✅
- `src/app/core/icons/lucide-icons.ts` — ✅
- `src/app/features/tax-filing/tax-filing.routes.ts` — ✅
- `src/app/features/tax-filing/pages/tax-filing/tax-filing.component.{ts,html,css}` — ✅ (one ⚠️ on the load-guard; see Issues)
- `src/app/features/portfolio-analytics/portfolio-analytics.routes.ts` — ✅
- `src/app/features/portfolio-analytics/pages/portfolio-analytics/portfolio-analytics.component.{ts,html,css}` — ✅
- `src/app/app.routes.ts` — ✅
- `src/app/features/investments-tracking/components/transactions-table/transactions-table.component.ts` — ✅
- `package.json` / `package-lock.json` — ✅ (`chart.js@^4.5.1` present)

## Acceptance criteria check

- Tax Filing page: ✅
  - 4 summary cards (Total P&L, STCG, LTCG, Estimated Tax) · FY-wise table · per-stock table · CSV+Excel export · FY + asset-type filters with chips · loading/empty/error states (mock-data banner + retry) · auth-guarded (`canActivate: [authGuard]` in `app.routes.ts`).
- Portfolio Analytics page: ✅
  - 5 summary cards (Invested, Realized P&L, Holdings, Charges, Biggest position) · 4 charts (asset-allocation doughnut, broker bar, activity line, exchange pie) · top winners + losers tables · holdings table with sort/paginate · date preset + custom-range filter with chips · loading/empty/error states · auth-guarded.
- Shared service: ✅
  - FIFO correctness verified: 1:1 match, partial SELL consumes oldest lots, multi-lot SELL, multi-stock independence, short-sell residual with `buyDate: null` and `gain: -sellValue`.
  - ST/LT classification verified: 364-day = ST, 365-day = LT, DEBT 36-month threshold, same-day = ST, UNKNOWN for missing/invalid dates.
  - FY boundary verified: 2024-03-31 → `2023-24`, 2024-04-01 → `2024-25`.
  - 14 methods pure, well-typed, no input mutation (`mergeTransactions` spec asserts original rows are untouched).
- Wiring & refactor: ✅
  - Both routes registered in `app.routes.ts` with `authGuard` + `loadChildren`.
  - `tax-filing.routes.ts` and `portfolio-analytics.routes.ts` populated and exported.
  - `TransactionsTableComponent` compute methods (`computeStats`, `computeHoldings`, `computeInsights`) delegate to the service; the three shared types are imported from the service. Template field-by-field audit: every `stats.*`, `h.*`, `insight.*` reference in `transactions-table.component.html` resolves against the service-side `SummaryStats` / `HoldingRow` / `InsightItem` interfaces — refactor is fully template-transparent.

## Issues

### 🚨 Critical (must fix before merge)
(none)

### ⚠️ Important (should fix)
1. **`src/app/features/tax-filing/pages/tax-filing/tax-filing.component.ts:198`** — `onDataReady()` guard `if (this.temporaryTransactions === null || this.portfolioTransactions === null) return;` is dead code because both fields are initialized as `[]` (not `null`), so the guard never fires. As a result, `mergeTransactions` / `recompute` / `loading = false` run twice (once after the first endpoint settles, once after the second), which contradicts the inline comment "Wait until both calls have resolved … before merging". The portfolio-analytics page already uses the correct pattern (`tempLoaded` / `portLoaded` flags in `afterLoad()`) — apply the same here. Suggested fix: replace the dead `=== null` check with two boolean flags (`tempLoaded`, `portLoaded`) that are flipped to `true` in each `next`/`error` handler, and only proceed to merge when both are true; set `this.loading = false` once on the combined path.

### 💅 Nit (optional)
1. **`src/app/core/services/portfolio-analytics.service.ts:407-414`** — `computeFifoRealizedGains` uses stable sort by ISO date for FIFO ordering; same-date tie-break therefore depends on the order rows arrive from `TransactionService`. Reasonable behaviour, but worth a doc-comment line (e.g. "Same-date BUYs/SELLs are processed in the order returned by the backend; tests should sort fixtures explicitly if order matters") so future readers don't read more into it than intended.
2. **`src/app/features/tax-filing/pages/tax-filing/tax-filing.component.ts:204`** — `usingMockTemp` / `usingMockPort` mock rows contain only BUYs (no SELLs), so during fallback the capital-gains tables will appear empty even with "mock data" loaded. Consider seeding one SELL in each mock set so the fallback state actually exercises the FIFO tables.

## What was done well
- **Math correctness**: FIFO, ST/LT classification, FY boundaries, and capital-gains aggregation are all implemented carefully with documented edge cases (short-sell residual, calendar-month delta for holding period, `''` for unparseable FY input).
- **Spec coverage**: The `portfolio-analytics.service.spec.ts` covers every behaviour the plan called out — including a dedicated `numeric safety` test that throws NaN/Infinity/null/undefined at the service to confirm it doesn't blow up.
- **Refactor hygiene**: `TransactionsTableComponent`'s three compute methods are now thin one-liners over the service, and the inline interfaces were lifted into the service module unchanged, so the existing template continued to compile without a single template edit. TypeScript agrees (full `tsc --noEmit` is clean on both `tsconfig.app.json` and `tsconfig.spec.json` apart from the pre-existing, unrelated `ForgotPasswordComponent` issue).
- **Loading/empty/error UX**: Both pages have consistent mock-data banners with a Retry button, skeleton-style loading text, and an explicit empty-state card — matching the existing `transactions-table` pattern.

## Out of scope (do not fail on these)
- Pre-existing `ForgotPasswordComponent` export error in `change-password.component.spec.ts`
- Lack of live market prices (documented in plan)
- Tax rate approximation (documented in plan)
- `ng test` not executed (WSL Chromium unavailable)
