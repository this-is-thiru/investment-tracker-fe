# Upload Transactions — UX & Error Handling Improvement Plan

## Goal
Make the upload-transactions feature user-friendly, simple to understand for any user, and bulletproof against errors. The backend responds with a wrapped payload `{"data": "All transactions uploaded successfully from: TRANSCATIONS-BUY-JUL 2023-SEP 2023.xlsx, quarter: Q1"}`. The UI must show the actual server message clearly, handle every error scenario with a friendly explanation, and work reliably for every quarter.

## Current Pain Points
1. **State confusion** — three overlapping booleans (`selectedFile`, `hasUploadedFile`, `isUploading`) plus `uploadStatus` produce 8 possible UI states; the template branches are tangled and the success/filtered paths are commented out and forgotten.
2. **No quarter visibility up-front** — quarter is hidden inside the "File Selected" card; users can submit without realising Q1 is pre-selected.
3. **Response handling is fragile** — service forces `responseType: 'text'` then template does `event.body` directly. The auth interceptor unwraps `event.body.data` for object bodies but not text. When the backend sends JSON with `Content-Type: application/json`, the unwrapped string is shown fine; when the backend sends text, it's also fine. But the code never parses or interprets the response — any stringy payload (error message, success message, "filtered") looks identical to the user.
4. **Error handling is too generic** — only `err?.error?.message` is used. Common cases (400 wrong quarter, 401 expired session, 413 file too large, 415 unsupported media type, 500 server error, network down, CORS) all collapse into the same toast.
5. **No retry / no clear next-step guidance** — after error the user must manually clear the file and re-select. After success they must click X to remove the file.
6. **No validation feedback on the quarter selector** — if a user picks nothing (or the default is bad) nothing happens until upload; the failure shows as an opaque server error.
7. **No client-side empty-row / content sanity check** — the template can be filled with a header-only xlsx and the user only finds out after upload.
8. **Duplicate success banners** — two identical "Uploaded Successfully!" blocks stack when `hasUploadedFile` is true.

## Target UX Flow (linear, 5 steps)

```
[1. Pick Quarter] → [2. Pick File] → [3. Review & Upload] → [4. Progress] → [5. Result]
```

- Each step has its own dedicated card; only one is visible at a time (linear state machine).
- Quarter is always visible at the top in a small banner so the user always knows what's selected.
- Step 2 shows file requirements (max 10 MB, .xlsx/.xls) inline under the dropzone.
- Step 3 shows a clear summary: file name, size, quarter — with **Change** buttons so the user can go back without losing the file.
- Step 5 shows the **exact server response message** in a large readable card. Success → green, error → red, with retry/back buttons depending on outcome.

## Target Error Handling

The component classifies errors into named categories and renders each one with a user-friendly title, a plain-English explanation, and the actionable next step:

| Category | Trigger | Title | Body | Action |
|---|---|---|---|---|
| `no-file` | Submit without selecting a file | "No file selected" | "Please choose an .xlsx or .xls file to upload." | highlight dropzone |
| `bad-extension` | File extension not in [.xlsx, .xls] | "Wrong file type" | "We accept .xlsx and .xls files. Your file is `<ext>`." | re-pick |
| `too-large` | File > 10 MB | "File too large" | "Maximum size is 10 MB. Yours is `<size>`. Try splitting the file by quarter." | re-pick |
| `no-email` | `authService.getUserEmail()` is null | "Please sign in" | "You need to be signed in to upload transactions." | redirect to sign-in |
| `unauthorized` (401) | Token expired / invalid | "Session expired" | "Please sign in again to continue." | re-login |
| `forbidden` (403) | User lacks permission | "Not allowed" | "Your account doesn't have upload permission." | contact support |
| `not-found` (404) | Email not registered for portfolio | "Portfolio not found" | "We couldn't find a portfolio for `<email>`. Please contact support." | contact support |
| `payload-too-large` (413) | Server rejects file size | "Server rejected file" | "The file is too large for our server. Please try a smaller file." | re-pick |
| `unsupported-media` (415) | Backend rejects MIME | "Unsupported file" | "The server couldn't read this file. Make sure it's a valid .xlsx." | re-pick |
| `bad-request` (400) | Quarter / data validation failure | "Couldn't process file" | show server message | review & retry |
| `server` (5xx) | Backend exception | "Server error" | "Something went wrong on our side. Please try again in a moment." | retry |
| `network` (0) | Network down / CORS | "Connection problem" | "We couldn't reach the server. Check your internet and try again." | retry |
| `unknown` | Anything else | "Upload failed" | show server message if any | retry |

## API Response Handling

The backend returns `{"data": "..."}` for success and (assumed) a similar shape or plain text for errors. Strategy:

1. Service stops forcing `responseType: 'text'`. It uses default JSON parsing — Angular's HttpClient will parse `{"data": "..."}` into `{data: "..."}`.
2. Auth interceptor already unwraps `.data` for object bodies (good). With this service change, the consumer receives the raw inner string in `event.body` on success.
3. Component:
   - On `HttpEventType.Response`: inspect `event.body`.
     - If string → use as the user-facing message; classify as success.
     - If object with `message` → use the `message` field; classify as error if a sibling `status`/`error` field is set, else success.
     - If `null`/`undefined` → fallback generic message.
   - On error: classify by `err.status` (see table) and pull message from `err.error?.message || err.error?.data || err.message`.

## Chunked Build Plan

### Chunk 1 — Service layer (simple)
**File**: `src/app/services/transaction.service.ts`
**Complexity**: simple

Replace the current `uploadTransactions` method so that:
- It no longer forces `responseType: 'text'`.
- It accepts `(email, file, quarter)` and posts the FormData with `quarter` as a query param.
- It still returns `Observable<HttpEvent<any>>` with `reportProgress: true` so the component can drive the progress bar.
- Add a new sibling method `classifyUploadError(err: any)` returning `{ category, title, message }` so the component doesn't reinvent classification logic.

**Acceptance**:
- TypeScript compiles clean.
- Method signature unchanged for callers (still returns `HttpEvent<any>` events stream).
- `classifyUploadError` is exported and pure.

### Chunk 2 — Component rewrite (simple)
**Files**:
- `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.ts`
- `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.html`

**Complexity**: simple (no concurrency, just state machine + http)

Rewrite the component with:

```ts
type Step = 'pick-quarter' | 'pick-file' | 'review' | 'uploading' | 'result';
type ResultKind = 'success' | 'error';

interface UploadResult {
  kind: ResultKind;
  title: string;
  message: string;       // exact server message OR friendly fallback
  category?: string;     // for error classification
  fileName?: string;
  quarter?: string;
}
```

State:
```ts
step: Step = 'pick-file';        // start with file pick (quarter banner always visible)
quarter: string = 'Q1';
file: File | null = null;
progress: number = 0;
result: UploadResult | null = null;
isUploading = false;
```

Public methods:
- `onQuarterChange(value)` — updates quarter and stays on current step (or moves back to pick-file if user explicitly clicks "Change quarter")
- `onFilePicked(file)` — validates extension + size, sets file, moves to `review`
- `removeFile()` — clears file, goes to `pick-file`
- `startUpload()` — kicks off the upload, moves to `uploading`
- `cancelUpload()` — unsubscribes, goes back to `review`
- `reset()` — clears everything, goes to `pick-file`
- `retry()` — only meaningful after an error result; goes back to `review`
- `backToFilePick()` — only meaningful after an error result; goes back to `pick-file`

Behaviour:
- Quarter banner is **always** visible at top of the card so the user always knows which quarter they're uploading to.
- The "Send File" button is disabled until a valid file is selected.
- During upload (`step === 'uploading'`), all buttons except `Cancel` are disabled.
- After a successful result, the card shows the exact server message verbatim ("All transactions uploaded successfully from: TRANSCATIONS-BUY-JUL 2023-SEP 2023.xlsx, quarter: Q1") in a green success block with a "Upload Another File" button.
- After an error result, the card shows the category title, the friendly message, and (if available) the raw server message in a small collapsible "Technical details" section. Buttons: "Try Again" (retry with same file) and "Choose Different File".

Error classification helper inside the component delegates to `TransactionService.classifyUploadError(err)` so all the HTTP-status logic stays in one place.

**HTML template** is restructured into five clear sections (one per step). The four old `hasUploadedFile` / `selectedFile` / `isUploading` branches collapse into a single `@switch (step)` block.

**Acceptance**:
- TypeScript compiles clean.
- The five UI states are mutually exclusive (no overlapping banners).
- The success result displays the exact server message in full.
- Every error category in the table above renders correctly.
- The cancel button during upload works (subscription is unsubscribed).
- After a successful upload, "Upload Another File" returns the UI to the file-pick state with quarter preserved.

### Chunk 3 — Inline tests (simple)
**File**: `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.spec.ts`

Add unit tests for the new behaviour:
- `startUpload()` is a no-op when `file` is null (result: no http call, step unchanged).
- `onFilePicked()` rejects files with `.csv` extension (file stays null, result populated with `bad-extension` error).
- `onFilePicked()` rejects files > 10 MB.
- `onFilePicked()` accepts a valid `.xlsx` file and moves to `review`.
- `startUpload()` with no email populates a `no-email` error result.
- Successful HTTP response with string body populates a success result with the body as the message.
- Error response with status 401 populates an `unauthorized` result.
- Error response with status 0 populates a `network` result.

**Acceptance**:
- `npx tsc --noEmit -p tsconfig.spec.json` passes.
- The new specs cover the matrix above.

### Chunk 4 — Lint / build verification (syntactic only)
Run:
- `npx tsc --noEmit -p tsconfig.app.json`
- `npx ng build --configuration=development`

Expected: clean build, no CSS budget overflow.

## Files Touched
| File | Action |
|---|---|
| `src/app/services/transaction.service.ts` | modify (drop `responseType: 'text'`, add `classifyUploadError`) |
| `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.ts` | rewrite (state machine, error classification) |
| `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.html` | rewrite (5-step linear flow) |
| `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.spec.ts` | extend (new behaviours) |

## Out of Scope
- Backend changes (the API contract is assumed).
- Adding a real toast component (existing `NotificationService` is used).
- New dependencies.
- Adding a "preview parsed rows" feature.

## Edge Cases Considered
- User picks Q4 then drags in a Q1 file — UI shows Q4 selected; mismatch is the user's call (current backend doesn't validate quarter-vs-content). Documented but not enforced.
- User's session expires mid-upload → 401 → friendly "Session expired" message + reset to file-pick state.
- User uploads the same file twice — backend will return its own message ("All transactions uploaded successfully from: ..., quarter: Q1" again). UI shows success verbatim and offers "Upload Another File".
- User drops multiple files — only the first is accepted (existing behaviour preserved); UI shows a small notice "Only one file at a time — we used `<name>`".
- User picks a file with weird capitalization `.XLSX` — accepted (extension check is case-insensitive).
- Network drops mid-upload — observable errors with status 0 → "Connection problem".
- Server returns HTML error page (e.g. behind a proxy) — `err.error` is a string; the component falls back to "Upload failed. Please try again."
