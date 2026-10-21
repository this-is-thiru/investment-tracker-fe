import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'purple' | 'neutral';
export type BadgeStyleVariant = 'soft' | 'solid';

/**
 * Small status/type pill. Encodes the color logic that was already
 * consistent across the app (green=gain/BUY, red=loss/SELL,
 * yellow=short-term/warning, blue=info) but copy-pasted as raw Tailwind
 * classes on every page. tone="accent" covers brand highlight labels
 * ("Recommended"); tone="info" uses the blue accent.
 *
 * Usage: <ui-badge tone="success">BUY</ui-badge>
 */
@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.css',
})
export class BadgeComponent {
  @Input() tone: BadgeTone = 'neutral';
  @Input() styleVariant: BadgeStyleVariant = 'soft';
}
