import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerTone = 'accent' | 'muted' | 'white';

/**
 * Themed loading spinner. Replaces the old shared/pipes/loader component
 * (light-grey/blue, didn't match the dark theme) and the many inline
 * `lucide-icon` + `animate-spin` one-offs across the app.
 *
 * Usage: <ui-spinner size="sm" tone="white" />
 */
@Component({
  selector: 'ui-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.css',
})
export class SpinnerComponent {
  @Input() size: SpinnerSize = 'md';
  @Input() tone: SpinnerTone = 'accent';
}
