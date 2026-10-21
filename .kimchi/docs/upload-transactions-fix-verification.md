# upload-transactions Fix Verification

## Issue Fixed
`onUploadComplete` was not emitted on the upload error path. Now emitted on both
success and error, so any parent subscribed to `(onUploadComplete)` receives the
classified friendly message either way.

## Diff Summary

### `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.ts`
In the `error:` handler of `startUpload()`, after `this.step = 'result';`,
added one line:

```ts
this.onUploadComplete.emit(this.result.message);
```

(inside the existing `error: (err) => { ... }` callback, immediately after
the `this.step = 'result';` line that already followed the `this.result = { ... }`
assignment).

### `src/app/features/investments-tracking/components/upload-transactions/upload-transactions.component.spec.ts`
Extended the two error-path tests (test 7 "401 -> unauthorized" and test 8
"status 0 -> network"):

- Each test now creates `let spy = jasmine.createSpy('complete');` and
  subscribes it to `component.onUploadComplete` before calling
  `component.startUpload()`.
- Test 7 now asserts `expect(spy).toHaveBeenCalledWith('Please sign in again to continue.');`
- Test 8 now asserts `expect(spy).toHaveBeenCalledWith("We couldn't reach the server. Check your internet and try again.");`

All other tests and code are unchanged.

## Test Output

```
$ npx tsc --noEmit -p tsconfig.app.json
(no output, exit 0)
```

```
$ npx tsc --noEmit -p tsconfig.spec.json
src/app/features/auth/components/change-password/change-password.component.spec.ts(3,10): error TS2305: Module '"./change-password.component"' has no exported member 'ForgotPasswordComponent'.
```

- `tsconfig.app.json` (production code): PASS (no errors, exit 0).
- `tsconfig.spec.json` (test code): The only error is the pre-existing
  `change-password.component.spec.ts(3,10): error TS2305: ... 'ForgotPasswordComponent'`.
  This file is explicitly out of scope per the task instructions and is not
  related to the upload-transactions feature. The upload-transactions spec
  file compiles cleanly.

## Lint Output
N/A — no linter is configured for this project.

## Verdict
ALL_PASS
