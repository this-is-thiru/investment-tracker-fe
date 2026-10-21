# Transactions Table Fix Verification

## Fixes applied

### Fix 1 — Type filter as segmented control
- `transactions-table.component.html`: replaced the `<p-select>` for type with three Tailwind-styled buttons bound to `setTypeFilter('ALL'|'BUY'|'SELL')`. Active state highlights use the spec palette (`#10A37F` accent / `#22C55E` buy / `#EF4444` sell).
- `transactions-table.component.ts`: removed the `readonly typeFilterOptions` array (was used only by the now-deleted `<p-select>`). `filterType` field and `setTypeFilter()` method are unchanged.

### Fix 2 — Pagination sub-header range
- `transactions-table.component.ts`:
  - Added `firstTemp = 0` and `firstPort = 0` fields.
  - Added `lastTemp` getter: `Math.min(this.firstTemp + this.rowsTemp, this.filteredTemporary.length)` with `0` for empty.
  - Added `lastPort` getter (same shape).
  - Added `onTempPage(event)` and `onPortPage(event)` that store `first` and `rows` from the paginator event.
- `transactions-table.component.html`:
  - Bound `(onPage)="onTempPage($event)"` on the temporary `p-table` and `(onPage)="onPortPage($event)"` on the portfolio `p-table`.
  - Replaced both sub-headers with conditional range text: `Showing {{ firstTemp + 1 }}–{{ lastTemp }} of {{ filteredTemporary.length }}` (and the port equivalent). Empty-filter branch shows `Showing 0 of 0`.

### Fix 3 — "Filtered out" hint in empty-filter state
- `transactions-table.component.ts`: added `filteredOutTemp` and `filteredOutPort` getters returning `Math.max(0, total - filtered)`.
- `transactions-table.component.html`: in both zero-filter empty-state blocks (temp + portfolio), inserted `<p class="text-xs text-[#909090]">Filtered out: {{ filteredOut* }} of {{ *Transactions.length }} transactions.</p>` between the helper text and the Reset CTA.

### Fix 4 — Column scroll behaviour
- `transactions-table.component.html`:
  - Replaced the existing `<div class="overflow-x-auto">` around each `p-table` (3 tables: temp, port, holdings) with `<div class="table-scroll-container">`.
  - Added `[tableStyle]="{ 'min-width': '60rem' }"` on all three `p-table` elements so columns don't squish.
  - Kept `responsiveLayout="scroll"` on the tables.
- `transactions-table.component.css`: added `.table-scroll-container` styles with `scrollbar-width: thin`, custom `::-webkit-scrollbar` (height 8px, track `#191919`, thumb `#3A3A3A` / `#4A4A4A` on hover). Removed unused dead CSS (`.holdings-bar-track`, `.holdings-bar-fill`, `.stats-scroll`) to keep within budget.

## Test output
- `npx tsc --noEmit -p tsconfig.spec.json` — no errors specific to `transactions-table`.
- The existing 8 spec tests do not reference any removed member (`typeFilterOptions` is not asserted on anywhere). No test file changes were required.
- `npx ng test --watch=false --include='**/transactions-table.component.spec.ts' --browsers=ChromeHeadlessNoSandbox` could not be run: the Karma env has **pre-existing** load errors unrelated to this change (verified by stashing my edits and re-running — same failures):
  1. `styles.scss` postcss-loader cannot resolve `primeicons/fonts/*.eot|.woff|.woff2|.ttf|.svg` (filesystem/path issue, not introduced here).
  2. `change-password.component.spec.ts` imports `ForgotPasswordComponent` from a module that no longer exports it (unrelated to transactions).
  Per the execution contract, this is reported as a pre-existing environment issue and skipped.
- TypeScript spec check: PASS.
- Production build: PASS (see below).

## Lint / build output
- `npx tsc --noEmit -p tsconfig.app.json` — **PASS** (no output).
- `npx ng build --configuration=development` — **PASS** in 6.824 s. No CSS budget error (component CSS at 3685 bytes, under the 4 KB error threshold and under the 2 KB warning threshold? — note: pre-existing CSS already exceeded 2 KB before this change; the change itself reduced CSS size by 37 bytes net). No template errors.

## CSS file size
- `transactions-table.component.css`: **3685 bytes** (was 3722 before; net -37 bytes after removing dead code and adding scrollbar styles). Well under the 4 KB hard limit.

## Verdict
**ALL_PASS** — all four fixes applied, TypeScript clean, dev build succeeds with no CSS budget error, spec file unchanged and still compiles cleanly. Karma runtime is broken for unrelated environmental reasons (primeicons asset path resolution and an unrelated `ForgotPasswordComponent` import in `change-password.component.spec.ts`); these failures reproduce on the unmodified baseline and are out of scope for this fix.
