# Plan: Transform Transactions Table — User-Friendly + Insightful Features

## Goal
Transform `TransactionsTableComponent` at `src/app/features/investments-tracking/components/transactions-table/` from a basic dual-table view into a comprehensive, user-friendly transaction workspace that helps users **understand** their trading activity at a glance — with summary statistics, multi-criteria filters, a holdings aggregation view, smart insights, and export options.

The component is mounted on the Investments page via `<app-transactions-table></app-transactions-table>`. No parent or routing changes are required.

---

## Scope (what's in / what's out)

**In scope** (this transform):
- One component, three files: `transactions-table.component.ts`, `transactions-table.component.html`, `transactions-table.component.css`
- Updated tests: `transactions-table.component.spec.ts`
- One helper for currency / formatting in the existing component (no new pipes, no new services, no new modules)

**Out of scope** (not part of this transform):
- New API endpoints or service changes
- New dependencies (no chart libs — we use pure CSS / SVG for visual breakdowns)
- Refactor of `AllTransactionsComponent` or `UploadTransactionsComponent`
- Modifications to other components consuming `TransactionsResponse`

---

## Existing context (preserve)

Keep these existing behaviors intact:
- Both Temporary and Current/Portfolio tables load via `TransactionService.getTemporaryTransactions(email)` and `getCurrentTransactions(email)`.
- Side-by-side / Temp-only / Current-only view toggle.
- Expandable rows showing trade summary, valuation breakdown, brokerage & charges, and audit metadata.
- Mock-data fallback when API errors (kept unchanged).
- Dark theme (#191919 background, #232323 surface, #10A37F accent).
- All lucide icons already registered (`lucide-icons.ts`).
- `PrimeNgModule` exposes `TableModule`, `InputTextModule`, `ButtonModule`, `PaginatorModule`, `SelectModule`, `SkeletonModule`.
- `ExpansionPanelComponent` wraps the whole section.

---

## Feature set

### F1 — Summary Stats Dashboard (NEW)
A 4-card strip above the tables that summarises the **currently filtered** transactions. Each card shows: label, big value, delta vs all-time, and a small icon. Cards:

1. **Total Transactions** — count of visible rows (Temp + Current).
2. **Total Invested** — sum of `totalValue` where `transactionType === 'BUY'`, formatted ₹.
3. **Total Sold** — sum of `totalValue` where `transactionType === 'SELL'`, formatted ₹.
4. **Net Invested** — `Total Invested − Total Sold`, signed (green/red).
5. **Total Charges** — sum of `brokerCharges + miscCharges` across visible rows.
6. **Top Stock** — most-traded stock by `count(rows)` with its trade count and total value.

Cards are horizontally scrollable on mobile. Each card has a hover lift and accent border on the left edge matching the metric (green for buy/invested, red for sell, blue for total, yellow for charges, purple for top stock).

### F2 — Filter Bar (NEW)
A single horizontal toolbar above the tables with:

- **Search** — global text search across `stockName`, `stockCode`, `exchangeName`, `brokerName`, `assetType`, `transactionType` (already partially exists per-table; consolidated).
- **Type filter** — segmented control: All / BUY / SELL.
- **Asset Type filter** — `p-select` dropdown of unique asset types from the loaded data (e.g. MUTUAL_FUND, EQUITY, ETF, DEBT).
- **Broker filter** — `p-select` dropdown of unique brokers.
- **Date range preset** — `p-select` dropdown: All time, Last 7 days, Last 30 days, Last 90 days, This year, Custom. For Custom, two date inputs appear.
- **Reset Filters** — pill button. Disabled when no filter is active.
- **Active filter chips** — small removable chips below the bar showing currently active filters (e.g. "Type: BUY ×", "Broker: Groww ×", "Last 30 days ×").

Filters apply to BOTH tables simultaneously (Temporary + Current).

### F3 — View Mode Tabs (EXTEND existing)
Replace the existing segmented "Side-by-Side / Temp Only / Current Only" with a richer tab strip:

1. **All Transactions** — current dual-table side-by-side or single, controlled by a secondary segmented control (kept).
2. **Holdings** — NEW: a single aggregated table that groups transactions by `stockCode`, showing per-stock:
   - Stock name + code
   - Asset type
   - Total quantity bought, total quantity sold, **net held** (bought − sold)
   - Total invested (sum BUY `totalValue`), Total sold (sum SELL `totalValue`), **net invested**
   - Number of transactions
   - First bought, last activity date
   - Average price (weighted average by quantity)
   - Charges paid
   - A tiny horizontal bar showing % of total invested (CSS, no chart lib)
3. **Insights** — NEW: a card-grid of plain-English insights derived from data:
   - "Your biggest broker is X with Y transactions worth ₹Z."
   - "You've made N transactions this month vs N last month (▲/▼ %)."
   - "N% of your transactions are BUYs, M% are SELLs."
   - "Top asset type: X (Y% of total value)."
   - "Avg. transaction size: ₹X."
   - "You paid ₹X in total charges — that's Y% of total volume."
   - An insight is hidden if it cannot be computed (e.g. zero transactions).

Each tab keeps its own state. Switching tabs doesn't refetch.

### F4 — Per-row Quick Actions (NEW)
In the expanded-row panel, add a footer toolbar with action chips:
- **Copy transaction details** — copies `stockName, type, qty, price, date` to clipboard.
- **Filter by this stock** — applies `stockCode` to the global filter (chips update).
- **View all from this broker** — applies `brokerName` to the global filter.
- **Show only this date** — applies exact date filter.

Actions show toast feedback via `MessageService`.

### F5 — Export (NEW)
Two buttons in the toolbar:
- **Export CSV** — downloads the currently visible (filtered) rows as `.csv` with proper escaping.
- **Export Excel** — uses the already-installed `xlsx` package to write an `.xlsx` with the filtered rows and headers.
- Export name pattern: `transactions_<email>_<YYYYMMDD>.<ext>`.

### F6 — Column Visibility (NEW)
A small "Columns" dropdown next to Export. Toggles column visibility on both tables. Persists per session (memory is fine, no localStorage). Default: all visible.

### F7 — Empty / Loading / Error states (POLISH)
- Keep the existing skeleton/spinner states.
- When filters yield zero results, show a contextual empty state: "No transactions match your filters." with a "Reset filters" CTA.
- When data fetch errors: keep mock fallback; add a small "Using sample data" banner with a refresh button.

### F8 — Pagination polish
- Show "Showing X–Y of Z" above each table.
- Already exists; ensure consistent copy in both tables.

---

## Component API (public surface for the template)

```ts
export class TransactionsTableComponent implements OnInit {
  // Inputs (kept)
  // (none currently; component fetches via service — keep that contract)

  // State
  viewMode: 'split' | 'temp' | 'port' = 'split';
  activeTab: 'transactions' | 'holdings' | 'insights' = 'transactions';

  temporaryTransactions: TransactionsResponse[];
  portfolioTransactions: TransactionsResponse[];

  // Filter state
  searchQuery = '';
  filterType: 'ALL' | 'BUY' | 'SELL' = 'ALL';
  filterAssetType: string | null = null;   // null = all
  filterBroker: string | null = null;       // null = all
  filterDatePreset: 'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom' = 'all';
  filterDateFrom: string | null = null;
  filterDateTo: string | null = null;

  // Derived (computed each change-detection cycle)
  filteredTemporary: TransactionsResponse[];
  filteredPortfolio: TransactionsResponse[];
  filteredAll: TransactionsResponse[];
  stats: SummaryStats;                     // see type below
  holdings: HoldingRow[];                  // see type below
  insights: InsightItem[];                 // see type below

  // UI state
  loadingTemp = false;
  loadingPortfolio = false;
  userEmail = '';
  visibleColumns: { stock: boolean; type: boolean; qty: boolean; price: boolean; total: boolean; date: boolean; broker: boolean; exchange: boolean; asset: boolean; charges: boolean; } = { ...all true };

  // Unique values for filter dropdowns
  availableAssetTypes: string[];
  availableBrokers: string[];

  // Methods
  ngOnInit(): void;
  loadTemporaryTransactions(): void;
  loadPortfolioTransactions(): void;
  applyFilters(): void;                              // recomputes filtered* + stats + holdings + insights
  resetFilters(): void;
  removeFilterChip(kind: string, value?: string): void;
  setTypeFilter(type: 'ALL' | 'BUY' | 'SELL'): void;
  setDatePreset(preset: ...): void;
  toggleColumn(col: keyof typeof visibleColumns): void;
  exportCsv(): void;
  exportExcel(): void;
  copyTransaction(t: TransactionsResponse): void;
  filterByStock(stockCode: string): void;
  filterByBroker(brokerName: string): void;
  filterByDate(date: string): void;
  hasActiveFilters(): boolean;
}

type SummaryStats = {
  count: number;
  totalInvested: number;
  totalSold: number;
  netInvested: number;
  totalCharges: number;
  topStock: { name: string; code: string; count: number; totalValue: number } | null;
};

type HoldingRow = {
  stockCode: string;
  stockName: string;
  assetType: string;
  totalBought: number;       // qty
  totalSold: number;         // qty
  netHeld: number;
  totalInvested: number;     // ₹
  totalSoldValue: number;    // ₹
  netInvested: number;       // ₹
  txnCount: number;
  firstDate: string;
  lastDate: string;
  avgPrice: number;          // weighted
  totalCharges: number;
  sharePercent: number;      // 0-100
};

type InsightItem = { icon: string; title: string; detail: string; tone: 'green' | 'red' | 'blue' | 'yellow' | 'purple' };
```

Notes on the model:
- `applyFilters()` is called whenever any filter input changes (use `(ngModelChange)` / setters / template `change` handlers). It re-derives `filteredTemporary`, `filteredPortfolio`, `filteredAll`, `stats`, `holdings`, `insights`. No RxJS pipeline needed — straightforward array ops.
- All derived data is `private` to the component. Template binds directly.

---

## File-by-file changes

### `transactions-table.component.ts`
- Keep imports of `CommonModule`, `DecimalPipe`, `PrimeNgModule`, `LucideIconsModule`, `ExpansionPanelComponent`, `FormsModule` (add), `MessageService`, `TransactionService`, `TransactionsResponse`.
- Add `FormsModule` to `imports`.
- Add a `XLSX` import (already used elsewhere — `import * as XLSX from 'xlsx';`).
- Replace the existing state and methods with the API above.
- Add helper methods:
  - `private computeStats(rows: TransactionsResponse[]): SummaryStats`
  - `private computeHoldings(rows: TransactionsResponse[]): HoldingRow[]`
  - `private computeInsights(rows: TransactionsResponse[], stats: SummaryStats): InsightItem[]`
  - `private toCsv(rows: TransactionsResponse[]): string`
  - `private inDateRange(date: string, from: Date | null, to: Date | null): boolean`
  - `private uniqueSorted(values: string[]): string[]`
- Keep the existing two-table loading methods unchanged (including mock fallbacks).
- Keep `userEmail` from `localStorage`.
- Keep `loadingTemp` and `loadingPortfolio` flag handling.
- All methods are non-async except the existing RxJS `subscribe` handlers.

### `transactions-table.component.html`
- Replace the existing single `<app-expansion-panel>` body with the new layered UI:
  1. Stats dashboard (4–6 cards) — sticky at top within the panel.
  2. Filter bar (search + selects + reset + chips).
  3. Tab strip: All Transactions / Holdings / Insights.
  4. Toolbar above tables: Export CSV, Export Excel, Columns, View-mode (split/temp/port).
  5. **If All Transactions tab**: existing tables, but with:
     - Column visibility applied
     - "Showing X–Y of Z" sub-header
     - Empty-state for "filters yield zero" distinct from "no data"
     - Quick-action footer in the expanded-row panel
  6. **If Holdings tab**: a new `p-table` with holdings rows, sortable, paginated.
  7. **If Insights tab**: a responsive grid of insight cards.
- Use only existing icons (`trending-up`, `database`, `briefcase`, `bar-chart-3`, `pie-chart` is NOT registered — use `bar-chart-3` instead; `sparkles`, `arrow-right`, `file-text`, `info`, `dollar` is NOT registered — use `bar-chart-3`; `percent` is NOT registered — use `bar-chart-3`; `calendar`, `download`, `upload`, `x`, `search`, `filter` is NOT registered — use `search`, `rotate-cw`, `plus`, `edit`, `trash`, `eye`, `eye-off`, `copy` is NOT registered — use `file-text`, `check`, `check-circle-2`, `clock`, `alert-circle`, `alert-triangle`, `info`). Only use icons confirmed in `lucide-icons.ts`.

Confirmed icon inventory (use only these):
- `Sparkles`, `Home`, `User`, `Settings`, `Search`, `Bell`, `TrendingUp`, `Database`, `Plus`, `Edit`, `Trash`, `Menu`, `ArrowRight`, `FileText`, `BarChart3`, `Zap`, `Clock`, `CheckCircle2`, `X`, `Eye`, `EyeOff`, `LogOut`, `ChevronDown`, `AlertCircle`, `Download`, `PlayCircle`, `RotateCw`, `Upload`, `Briefcase`, `SettingsIcon`, `Mail`, `Lock`, `Shield`, `Palette`, `Globe`, `Trash2`, `CreditCard`, `Crown`, `XCircle`, `AlertTriangle`, `Info`, `CheckCheck`, `Calendar`

For "copy" action use `FileText`; for "filter" use `Search`; for "calendar/date" use `Calendar`; for "refresh" use `RotateCw`.

### `transactions-table.component.css`
- Keep existing `:host ::ng-deep` overrides for `p-datatable`, paginator, dropdown.
- Add new styles for:
  - `.stats-grid`, `.stat-card`, `.stat-card--green`, etc.
  - `.filter-bar`, `.filter-chip`, `.filter-chip__remove`
  - `.toolbar`, `.toolbar__group`
  - `.insight-grid`, `.insight-card`, `.insight-card--green`, etc.
  - `.holdings-bar` (the tiny horizontal share bar)
  - `.empty-filters` (filter-empty state distinct from no-data)
  - `.columns-menu` (popover content)
  - `.row-actions`, `.row-action-chip`
- Use the same dark-theme palette already in use.

### `transactions-table.component.spec.ts`
- Replace the boilerplate with focused tests for new behavior:
  - `should create`
  - `should compute stats from filtered rows` — load mock data, apply no filters, assert `stats.count`, `stats.totalInvested`, `stats.totalSold`, `stats.netInvested`, `stats.totalCharges`
  - `should apply type filter` — call `setTypeFilter('BUY')`, assert only BUY rows in `filteredAll`
  - `should reset filters` — apply some filters, call `resetFilters()`, assert default state
  - `should compute holdings grouped by stockCode` — assert holdings length and `netHeld` calc
  - `should generate CSV with escaped commas and quotes`
  - `should hide insight when no data`
  - `should toggle column visibility`
- Use `TransactionService` mocked via jasmine spy (`jasmine.createSpyObj`).
- Provide a small inline mock dataset.

---

## Acceptance criteria

1. The Transactions panel renders without console errors and compiles with `ng build`.
2. The summary dashboard shows 4–6 stat cards whose values update when filters change.
3. The filter bar exposes search + type + asset + broker + date preset + reset, and any change re-derives both tables, stats, holdings, and insights.
4. Active filter chips appear below the bar; clicking the × removes that filter.
5. Switching to **Holdings** shows a table with at least one row per unique stock code, including net held, total invested, and a horizontal share bar.
6. Switching to **Insights** shows at least 3 non-empty cards when data exists; cards hide when their underlying metric is undefined.
7. **Export CSV** downloads a `.csv` whose row count equals the visible (filtered) row count.
8. **Export Excel** downloads an `.xlsx` (using `xlsx` package) with the same row count and correct headers.
9. **Column visibility** dropdown toggles at least the Stock, Type, Qty, Price, Total, Date, Broker, Exchange, Asset, Charges columns.
10. Per-row quick actions (copy / filter by stock / filter by broker / filter by date) work and update the chips.
11. Empty filter results show a distinct empty state with a "Reset filters" CTA.
12. Existing view-mode toggle (split / temp / port) still works inside the All Transactions tab.
13. `ng test --watch=false --browsers=ChromeHeadlessNoSandbox` passes (or whatever the project's test runner uses — see project `package.json`).
14. `ng build` succeeds.

---

## Edge cases (must handle)

- **Zero data**: stats cards show "0" / "₹0", insights grid shows "Upload transactions to see insights" empty card, holdings shows empty state.
- **Filter yields zero rows**: stats show zeros, **but** the "Filtered out: N" hint appears, and a "Reset filters" button is shown.
- **Date range with no `transactionDate`**: skip rows without dates when filtering by date; show a note in the chip "Date filter active".
- **Long stock names / broker names**: truncate with `...` and `title` attribute (no layout shift).
- **Decimal quantity**: show up to 4 decimal places (existing code already shows `5 + i * 0.1`).
- **Missing optional fields** (`brokerCharges`, `miscCharges`, `maturityDate`): treat as 0 / null; never show "undefined" / "NaN".
- **Mock data** (when API errors): summary stats are computed from mock data, not the all-time real totals. The "Using sample data" banner is shown.
- **Clipboard write failure**: silently fall back to showing the copied text in a `MessageService` info toast.

---

## Test strategy

- Unit tests in `transactions-table.component.spec.ts` cover the pure logic (stats, holdings, CSV, filters, insights visibility).
- Visual review: the build agent writes the HTML/CSS; reviewer inspects the rendered output via `ng build` success and a manual code review.
- Anti-flaky: assertions are on deterministic values from the mock dataset, not on time-based assertions.

---

## Implementation chunking

This is a single coherent UI/UX transformation tightly coupling TS + HTML + CSS. Splitting it across multiple agents risks incoherence in the design. Therefore:

**Chunk 1 (the entire transform) — complexity: `complex`**
- Files:
  - `src/app/features/investments-tracking/components/transactions-table/transactions-table.component.ts` (rewrite)
  - `src/app/features/investments-tracking/components/transactions-table/transactions-table.component.html` (rewrite)
  - `src/app/features/investments-tracking/components/transactions-table/transactions-table.component.css` (extend)
  - `src/app/features/investments-tracking/components/transactions-table/transactions-table.component.spec.ts` (rewrite)

Why one chunk: the TS API, HTML bindings, and CSS classes must stay in lockstep. Splitting them invites mismatch (a property the template binds that the TS doesn't expose, or a CSS class the template doesn't apply).

Why `complex`: even though there's no concurrency, the spec touches many independent UI surfaces (stats, filters, holdings aggregation, insights generation, exports, column visibility, quick actions) and the builder must keep them consistent across ~600–900 LOC of template + ~250 LOC of TS + ~150 LOC of CSS + tests. The risk of a builder missing a binding or duplicating logic across files is high if the chunk is too small.

**Builder directive:**
- Use the icon set above — do NOT introduce new icons. If a feature wants an icon that isn't registered, pick the closest match from the registered list.
- Use `xlsx` package for Excel export (already installed).
- Do NOT modify any file outside `transactions-table.component.*`.
- Do NOT add new dependencies.
- Run `ng build` after writing files. If it fails, fix the failure and re-run. If it fails again, stop and report.
- Update tests to cover the new behavior.
- Run `ng test --watch=false` (or the project's test runner). Capture pass/fail.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Builder invents an icon not in `lucide-icons.ts` | Spec enumerates the allowed icon list verbatim. Reviewer flags any new icon. |
| Template references methods/properties that TS doesn't expose | TS API section above is the contract. Reviewer verifies each template binding maps to a TS member. |
| Compile errors from PrimeNG API misuse | The current component already uses `p-table`, `p-sortIcon`, `pRowToggler`, `pSelect`, `pDropdown`. Builder should follow the same patterns; no new PrimeNG modules. |
| Slow `ng test` in CI | Builder runs the existing test command. No new test infrastructure. |
| Excel export with `xlsx` library quirks | Builder writes minimal `XLSX.utils.json_to_sheet` + `XLSX.writeFile`. Pattern is well-known. |
| Heavy template rewrite risks losing existing functionality (expand rows, audit metadata, etc.) | Spec explicitly retains: dual tables, view-mode toggle, expand-row panel structure (Trade Summary / Valuation / Brokerage & Charges / Audit Metadata), pagination, search, sorting. Reviewer cross-checks each preserved feature. |
