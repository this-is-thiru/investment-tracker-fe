import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

export type AlertTone = 'success' | 'warning' | 'danger' | 'info';

const TONE_ICONS: Record<AlertTone, string> = {
  success: 'check-circle-2',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  info: 'info',
};

/**
 * Inline status banner for feedback that belongs next to the thing the user
 * just did (a validation summary, a request that failed, the result of a
 * batch job). Prefer it over a toast when the outcome is visible in place:
 * NotificationService toasts are also written to the notification history.
 *
 * Usage: <ui-alert tone="danger" title="Couldn't save" [dismissible]="true" (dismissed)="err = null">{{ err }}</ui-alert>
 */
@Component({
  selector: 'ui-alert',
  standalone: true,
  imports: [CommonModule, LucideIconsModule],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.css',
})
export class AlertComponent {
  @Input() tone: AlertTone = 'info';
  @Input() title = '';
  @Input() dismissible = false;
  @Output() dismissed = new EventEmitter<void>();

  get icon(): string {
    return TONE_ICONS[this.tone];
  }
}
