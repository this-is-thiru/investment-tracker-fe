import { Injectable, signal } from '@angular/core';

export type ConfirmTone = 'danger' | 'accent';

export interface ConfirmOptions {
  title: string;
  message: string;
  tone?: ConfirmTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface ConfirmRequest extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void;
}

/**
 * Promise-based confirm dialog, replacing the 2 duplicated
 * destructive-confirm modal blocks in settings.component.html (Reset Data /
 * Delete Account) — copy-paste of the same icon+title+message+Cancel/Confirm
 * shell with only wording differences.
 *
 * Usage:
 *   const ok = await this.confirmDialog.confirm({
 *     title: 'Delete account?',
 *     message: 'This cannot be undone.',
 *     tone: 'danger',
 *     confirmLabel: 'Delete',
 *   });
 *   if (ok) { ... }
 *
 * Rendered globally by <ui-confirm-dialog> in app.component.ts, mirroring
 * the existing <app-toast-container> pattern.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly request = signal<ConfirmRequest | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.request.set({
        title: options.title,
        message: options.message,
        tone: options.tone ?? 'danger',
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        resolve,
      });
    });
  }

  respond(value: boolean): void {
    this.request()?.resolve(value);
    this.request.set(null);
  }
}
