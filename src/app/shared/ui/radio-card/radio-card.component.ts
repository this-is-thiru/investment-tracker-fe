import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Selectable card with a radio-dot indicator, used for exclusive-choice
 * lists (e.g. account type / currency selection in Settings). Purely
 * presentational — the parent owns the selection state and passes
 * `selected`; clicking anywhere on the card bubbles a native click, so
 * existing `(click)="select(option)"` bindings keep working unchanged.
 *
 * Usage: <ui-radio-card [selected]="value === 'usd'" (click)="value = 'usd'">USD</ui-radio-card>
 */
@Component({
  selector: 'ui-radio-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radio-card.component.html',
  styleUrl: './radio-card.component.css',
})
export class RadioCardComponent {
  @Input() selected = false;
  @Input() disabled = false;
}
