import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'alt' | 'elevated';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Themed surface container. Replaces the ~69 hand-rolled
 * `bg-[#232323] border border-[#3A3A3A] rounded-xl` (and similar) card
 * containers scattered across the app, plus the rarely-used `.premium-card`.
 *
 * The styled box IS the host element (classes applied via per-class host
 * bindings, not an inner wrapper div) — so a caller's own classes on
 * `<ui-card class="hover:border-accent ...">` land on the same element the
 * border/background is painted on, and hover/conditional styling works
 * exactly like it would on a plain styled `<div>`.
 *
 * variant:
 *  - default: standard panel surface (--color-surface)
 *  - alt: deeper nested panel / modal body surface (--color-surface-alt)
 *  - elevated: gradient + blur "premium" card (landing page feature cards)
 *
 * Usage: <ui-card variant="default" padding="md"><ng-content/></ui-card>
 */
@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule],
  template: '<ng-content></ng-content>',
  styleUrl: './card.component.css',
  host: {
    class: 'ui-card',
  },
})
export class CardComponent {
  @Input() variant: CardVariant = 'default';
  @Input() padding: CardPadding = 'md';

  @HostBinding('class.ui-card--default') get isDefault() { return this.variant === 'default'; }
  @HostBinding('class.ui-card--alt') get isAlt() { return this.variant === 'alt'; }
  @HostBinding('class.ui-card--elevated') get isElevated() { return this.variant === 'elevated'; }

  @HostBinding('class.ui-card--pad-none') get isPadNone() { return this.padding === 'none'; }
  @HostBinding('class.ui-card--pad-sm') get isPadSm() { return this.padding === 'sm'; }
  @HostBinding('class.ui-card--pad-md') get isPadMd() { return this.padding === 'md'; }
  @HostBinding('class.ui-card--pad-lg') get isPadLg() { return this.padding === 'lg'; }
}
