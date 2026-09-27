import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { ButtonComponent } from '@shared/ui/button/button.component';

/**
 * Shown when a page falls back to example data because the API failed.
 * Financial pages must make it unmistakable that the numbers aren't the user's.
 *
 * Usage: <ui-sample-data-notice context="tax figures" (retry)="refresh()" />
 */
@Component({
  selector: 'ui-sample-data-notice',
  standalone: true,
  imports: [LucideIconsModule, ButtonComponent],
  template: `
    <div role="alert"
      class="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border-2 border-warning/60 bg-warning/10 px-5 py-4">
      <div class="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
        <lucide-icon name="AlertTriangle" class="w-5 h-5 text-warning"></lucide-icon>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-warning">You're looking at sample data, not your portfolio</p>
        <p class="text-sm text-text-secondary mt-0.5">
          We couldn't reach the server, so the {{ context }} below are examples.
          Don't use them for decisions or tax filing.
        </p>
      </div>
      <ui-button variant="secondary" size="sm" [loading]="retrying" (click)="retry.emit()">
        <lucide-icon name="RotateCw" class="w-3.5 h-3.5"></lucide-icon>
        Try again
      </ui-button>
    </div>
  `,
})
export class SampleDataNoticeComponent {
  /** What the example numbers are, e.g. "tax figures" */
  @Input() context = 'numbers';
  @Input() retrying = false;
  @Output() retry = new EventEmitter<void>();
}
