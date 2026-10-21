# Plan: Tax Filing + Portfolio Analytics Features

## Goal

Build out the two empty/placeholder pages (`tax-filing`, `portfolio-analytics`) so they show meaningful analytics derived from the user's existing BUY/SELL transactions, reusing and extending the math that's already in `TransactionsTableComponent`.

## Current state (verified)

| Area | Status |
|---|---|
| Header nav links | ✅ Both `tax-filing` and `portfolio-analytics` routes exist in nav |
| `app.routes.ts` | ❌ Neither route registered |
| `tax-filing.routes.ts` | ❌ Empty (`[]`) |
| `features/portfolio-analytics/` | ❌ Folder doesn't exist |
| Transaction data | ✅ Loaded via `TransactionService.getCurrentTransactions()` + `getTemporaryTransactions()` |
| Charts | ❌ `PrimeNgModule` doesn't export `ChartModule`; `chart.js` not in `package.json` |

## File layout (new + modified)

```
src/app/
├── app.routes.ts                                       [MODIFY] register 2 new routes
├── core/
│   ├── prime-ng.module.ts                              [MODIFY] add ChartModule
│   └── services/
│       └── portfolio-analytics.service.ts              [NEW] extracted + new math
├── features/
│   ├── tax-filing/
│   │   ├── tax-filing.routes.ts                        [MODIFY] was empty []
│   │   └── pages/tax-filing/
│   │       ├── tax-filing.component.ts                 [NEW]
│   │       ├── tax-filing.component.html               [NEW]
│   │       └── tax-filing.component.css                [NEW]
│   └── portfolio-analytics/                            [NEW folder]
│       ├── portfolio-analytics.routes.ts               [NEW]
│       └── pages/portfolio-analytics/
│           ├── portfolio-analytics.component.ts        [NEW]
│           ├── portfolio-analytics.component.html      [NEW]
│           └── portfolio-analytics.component.css       [NEW]
├── features/investments-tracking/
│   └── components/transactions-table/
│       └── transactions-table.component.ts             [MODIFY] delegate to shared service
└── package.json                                        [MODIFY] add chart.js dep
```

New spec file:
- `core/services/portfolio-analytics.service.spec.ts` — unit tests for the math

## Phase 1 — Foundation

### 1.1 Add `chart.js` dependency
`npm install chart.js@^4` (PrimeNG 21 `ChartModule` is a wrapper around Chart.js v4). Verify by running `npm ls chart.js`.

### 1.2 Extend `PrimeNgModule`
Add `ChartModule` import from `primeng/chart` and re-export it.

### 1.3 Extract shared analytics into `PortfolioAnalyticsService`
Create a new `@Injectable({ providedIn: 'root' })` service that owns **all** the computation.

Methods (all pure, all return new arrays — no mutation):

| Method | Source | Notes |
|---|---|---|
| `mergeTransactions(temp, portfolio)` | new | Merge both sources, tag with source (`temp` / `portfolio`) |
| `computeStats(rows)` | extract | exact same shape |
| `computeHoldings(rows)` | extract | exact same shape |
| `computeInsights(rows, stats)` | extract | exact same shape |
| `computeAssetAllocation(rows)` | new | `[{ label, value, pct }]` grouped by `assetType` |
| `computeBrokerBreakdown(rows)` | new | `[{ broker, count, buyValue, sellValue, totalValue, pct }]` |
| `computeMonthlyActivity(rows)` | new | `[{ month: 'YYYY-MM', buyValue, sellValue, buyCount, sellCount }]` |
| `computeTopMovers(rows, limit)` | new | `{ winners: [...], losers: [...] }` by realized P&L per stock |
| `computeFifoRealizedGains(rows)` | new | FIFO cost-basis matching across all BUYs/SELLs per stock |
| `classifyHoldingPeriod(buyDate, sellDate, assetType)` | new | ST (< 12 mo) / LT (≥ 12 mo) for equity; < 36 mo / ≥ 36 mo for DEBT |
| `computeCapitalGainsSummary(rows, fy?)` | new | `{ totalGain, stcg, ltcg, byAssetType: [...], byFy: [...] }` |
| `deriveFinancialYears(rows)` | new | `['2023-24', '2024-25', ...]` from distinct `transactionDate` years using Indian FY convention (Apr–Mar) |

### 1.4 Unit tests for the math (`portfolio-analytics.service.spec.ts`)
Karma+Jasmine tests covering:
- FIFO matching: multiple BUYs then partial SELL consumes oldest lots first
- Holding period classification: 364-day = ST; 365-day = LT; DEBT asset type threshold is 36 months
- FY boundary: 31-Mar vs 1-Apr correctly placed in different FYs
- Capital gains summary: empty input, single SELL after single BUY, multi-stock mix
- Asset allocation: rounding (totals to 100%)
- Monthly activity: months sort ascending

## Phase 2 — Tax Filing page

Route: `/tax-filing` (auth-guarded). Single page component.

Layout:
1. Header strip — title, FY selector, asset-type filter
2. Summary cards (4): Total realized P&L · STCG · LTCG · Estimated tax
3. FY-wise capital gains table
4. Per-stock tax report table
5. Export controls — CSV + Excel

## Phase 3 — Portfolio Analytics page

Route: `/portfolio-analytics` (auth-guarded). Single page component.

Layout:
1. Header strip — title, date-range chips
2. Performance summary cards (5): Total Invested · Realized P&L · # Holdings · Total Charges · Biggest Position
3. Charts grid: Asset allocation (doughnut) · Broker breakdown (bar) · Transaction activity (line) · Exchange breakdown (pie)
4. Top movers — Winners / Losers tables
5. Current holdings table

## Phase 4 — Wiring & verification

- Register both routes in `app.routes.ts` with `authGuard`
- Populate `tax-filing.routes.ts`
- Refactor `TransactionsTableComponent` to delegate to `PortfolioAnalyticsService`
- Run `ng build` and `ng test --watch=false`

## Out of scope

- No backend changes
- No live market prices
- Tax rates are best-effort estimates (configurable in component, not user-editable in v1)
- No sector mapping
- No PDF export
