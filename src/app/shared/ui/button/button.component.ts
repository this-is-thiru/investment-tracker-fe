import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../spinner/spinner.component';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Themed button covering every variant found across the app (gradient CTA,
 * neutral chip, destructive, outline, icon-only). Native click events on
 * the inner <button> bubble up through the host element, so existing
 * `(click)="handler()"` bindings on the tag keep working unchanged.
 *
 * Usage: <ui-button variant="primary" size="md" [loading]="saving" (click)="save()">Save</ui-button>
 */
@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;

  // The inner <button>'s `width: 100%` resolves against this host's own
  // box, so the host must become block-level (not its default
  // inline-block) whenever fullWidth is set, or the percentage has
  // nothing meaningful to fill and silently no-ops.
  @HostBinding('class.ui-button-host--full')
  get hostFull(): boolean {
    return this.fullWidth;
  }

  get spinnerTone(): 'accent' | 'white' {
    return this.variant === 'secondary' || this.variant === 'ghost' ? 'accent' : 'white';
  }
}
