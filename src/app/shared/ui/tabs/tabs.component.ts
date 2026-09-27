import { Component, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

export interface TabItem {
  label: string;
  value: string;
  /** Optional Lucide icon name shown before the label */
  icon?: string;
  /** Optional count shown after the label, e.g. items waiting for review */
  badge?: number;
}

export type TabsVariant = 'segmented' | 'underline';

/**
 * Tab control used for every tab set in the app.
 *  - `segmented`: pill group, for switching views inside a panel
 *  - `underline`: page-level tabs sitting on a divider line
 *
 * Usage: <ui-tabs [items]="[{label:'All',value:'all',icon:'list'}]" [value]="tab" (valueChange)="tab = $event" />
 */
@Component({
  selector: 'ui-tabs',
  standalone: true,
  imports: [LucideIconsModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.css',
})
export class TabsComponent {
  private host = inject(ElementRef<HTMLElement>);

  @Input() items: TabItem[] = [];
  @Input() value = '';
  @Input() variant: TabsVariant = 'segmented';
  /** Accessible name for the tab list */
  @Input() ariaLabel: string | null = null;
  @Output() valueChange = new EventEmitter<string>();

  select(item: TabItem): void {
    if (item.value === this.value) return;
    this.value = item.value;
    this.valueChange.emit(item.value);
  }

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern
  onKeydown(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step || !this.items.length) return;
    event.preventDefault();
    const next = (index + step + this.items.length) % this.items.length;
    this.select(this.items[next]);
    const buttons = this.host.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    buttons[next]?.focus();
  }
}
