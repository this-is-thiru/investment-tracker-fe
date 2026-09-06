import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

export type EmptyStateSize = 'sm' | 'md' | 'lg';

/**
 * Standardized "no data" block: icon in a rounded tile + title + message.
 * Replaces the 10 hand-written empty-state blocks (transactions-table,
 * temp-transactions-table, corporate-action-list, portfolio-stocks,
 * tax-filing, portfolio-analytics, all-transactions) that each rebuilt the
 * same shape from scratch with slightly different icon/wording/sizing.
 *
 * Usage: <ui-empty-state icon="inbox" title="No Transactions" message="Nothing to show yet." />
 */
@Component({
  selector: 'ui-empty-state',
  standalone: true,
  imports: [CommonModule, LucideIconsModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) title!: string;
  @Input() message = '';
  @Input() size: EmptyStateSize = 'md';
}
