# Upload Transactions Review

## Verdict
NEEDS_FIXES

## Summary
Implementation is largely faithful to the plan and the type-check is clean
(`tsconfig.app.json` passes, `tsconfig.spec.json` passes except for the
pre-existing out-of-scope `change-password.component.spec.ts` error). Service
classification covers all 13 documented categories, the state-machine template
renders exactly one card per step, quarter is preserved across `reset()` /
`retry()`, and the exact server message flows through to `result.message` for
the success path.

There is exactly one concrete spec violation that must be fixed before approval.

---

## Issues

### 1. `onUploadComplete` is not emitted on the error path (contract violation)

- **File**: `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.ts:221` (success emit), and the `error:` handler at lines ~226-242.
- **Spec requirement** (review checklist item 2 and Chunk 2 acceptance):
  > The `onUploadComplete` event emitter still fires on both success and error (the contract).
- **Observed behavior**: `this.onUploadComplete.emit(resultMessage)` is called only inside the `case HttpEventType.Response:` branch (line 221). The `error: (err) => { ... }` branch assigns `this.result` and sets `this.step = 'result';` but never emits `onUploadComplete`. Grep confirms only one emit call site:
  ```
  $ grep -n "onUploadComplete" upload-transactions.component.ts
  51:  @Output() onUploadComplete = new EventEmitter<string>();
  221:              this.onUploadComplete.emit(resultMessage);
  ```
- **Impact**: Any parent that subscribes to `(onUploadComplete)` to react to upload completion will silently miss error outcomes. This breaks the documented public contract.
- **Suggested fix**: After building `this.result` in the `error` callback and before/after `this.step = 'result';`, add an emit. The natural payload is the friendly error message:
  ```ts
  error: (err) => {
    // ... existing classification + result assignment ...
    this.step = 'result';
    this.onUploadComplete.emit(this.result.message);   // <-- add this
  }
  ```
  Optionally also add a regression test that subscribes to `onUploadComplete` in tests 7 and 8 and asserts it fires with the classified message.

---

## Things checked and clean (no issues found)

- **Service layer (`src/app/services/transaction.service.ts`)**
  - `uploadTransactions` no longer forces `responseType: 'text'`; the auth interceptor (`src/app/core/auth.interceptor.ts:25`) will see `event.body` as `{data: "..."}` and unwrap it to the inner string before the component sees it. The component then matches `typeof body === 'string'` and renders the message verbatim. End-to-end chain works.
  - All 13 categories present in `classifyUploadError`:
    `no-file`, `bad-extension`, `too-large`, `no-email`,
    `unauthorized` (401), `forbidden` (403), `not-found` (404),
    `payload-too-large` (413), `unsupported-media` (415),
    `bad-request` (400), `server` (>=500), `network` (status 0 with keyword),
    `unknown` (status 0 without keyword or anything else).
  - Title and message text for each HTTP-status branch matches the spec table (titles: "Session expired", "Not allowed", "Portfolio not found", "Server rejected file", "Unsupported file", "Couldn't process file", "Server error", "Connection problem", "Upload failed"). Messages match where the spec is explicit (`unauthorized`, `forbidden`, `payload-too-large`, `unsupported-media`, `bad-request`, `server`, `network`, `unknown`).
  - Status 0 keyword check is `HttpErrorResponse | network | failed to fetch | cors` (case-insensitive on the latter three). A status-0 error whose message does not contain any of these keywords correctly falls through to `unknown` — verified by reading the `if (looksNetwork) ... return network` / `return unknown` structure.
  - Note (not a bug): the service's `bad-extension` and `too-large` client-side classifications drop the `<ext>` / `<size>` interpolation that the spec table shows. This is safe because the component never reaches `classifyUploadError` for these — `onFilePicked` populates the inline `this.fileError` with the full message including the actual extension/size before any HTTP call. User-visible rendering is correct.

- **Component state machine (`upload-transactions.component.ts`)**
  - `Step` union is exactly `'pick-file' | 'review' | 'uploading' | 'result'` — four values, all reachable (`pick-file` initial; `review` via `onFilePicked`; `uploading` via `startUpload`; `result` via response or error).
  - `reset()` and `retry()` leave `this.quarter` untouched — verified at lines ~256 and ~282.
  - `cancelUpload()` calls `this.uploadSub.unsubscribe()` then sets `step = 'review'` — verified at lines ~249-257. The `finalize` operator makes the unsubscribe cleanup idempotent.
  - Success path preserves the exact server string. For a successful `HttpResponse` with `body` of type `string`, the component assigns `resultMessage = body` and stores it verbatim in `this.result.message` (line ~206). The template renders it with `whitespace-pre-wrap break-words`, no truncation or wrapping.
  - Quarter banner is rendered above the `@switch` block so it is always visible.

- **Error UX (`upload-transactions.component.html`)**
  - "Technical details" `<details>` block is gated on `result?.category` being one of `bad-request`, `unsupported-media`, `payload-too-large`, `server`, `network`, `unknown`. The exclusion list (implicit: categories NOT in the show list) is exactly `unauthorized`, `forbidden`, `not-found`, `no-file`, `bad-extension`, `too-large`, `no-email` — matches the spec.
  - Inline `fileError` on the dropzone has a dismiss button (`(click)="dismissFileError()"`) and `dismissFileError()` clears the field — verified.

- **Public API contract**
  - `@Output() onUploadComplete = new EventEmitter<string>()` still exists at line 51, with `string` payload — unchanged.
  - `@Input('showToast') showToastInput?:` still present at line 52.
  - `showToast(message: string, type: ToastType): void` method signature unchanged at line 54.

- **Spec quality (`upload-transactions.component.spec.ts`)**
  - Exactly 10 tests present, covering the matrix plus retry/reset extensions.
  - Tests use direct TS-state assertions (`component.step`, `component.result`, `component.file`, etc.) — no DOM queries. The fixture is created but `detectChanges()` is intentionally never called (line ~125), so lucide/primeng DOM dependencies do not matter.
  - The pre-existing `change-password.component.spec.ts` error is out of scope and the new spec file itself compiles clean.

- **Visual consistency**
  - Colors used in the template (`#10A37F`, `#0D8968`, `#2E2E2E`, `#3A3A3A`, `#232323`, `#1A1A1A`, plus the existing gray scale `#888888`, `#A0A0A0`, `#B3B3B3`, `#CCCCCC`, `#666666`, `#505050`, `#404040`) are all from the pre-existing palette — no new colors introduced.
  - `<app-expansion-panel>` wrapper retained with original `title`, `subtitle`, `titleIcon`, and gradient `iconBgClass`.
  - "Download Template" link preserved (appears once at the bottom of the card always, plus a second copy inside the success-result block as a post-upload convenience — both use the existing `lucide download` icon and `text-[#10A37F]` styling).

- **Build / type-check**
  - `npx tsc --noEmit -p tsconfig.app.json` → no output, no errors.
  - `npx tsc --noEmit -p tsconfig.spec.json` → only the pre-existing `change-password.component.spec.ts(3,10): error TS2305: Module '"./change-password.component"' has no exported member 'ForgotPasswordComponent'` (out of scope per review brief).
