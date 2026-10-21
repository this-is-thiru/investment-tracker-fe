import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
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
 */
@Component({
  selector: 'ui-tabs',
  standalone: true,
  imports: [LucideIconsModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.css',
})
export class TabsComponent implements OnChanges {
  private host = inject(ElementRef<HTMLElement>);
  private cdr = inject(ChangeDetectorRef);

  @Input() items: TabItem[] = [];

  private _value = '';
  @Input()
  get value(): string {
    return this._value;
  }
  set value(val: string) {
    if (this._value !== val) {
      this._value = val;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }

  @Input() variant: TabsVariant = 'segmented';
  /** Accessible name for the tab list */
  @Input() ariaLabel: string | null = null;
  @Output() valueChange = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this._value = changes['value'].currentValue;
    }
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  select(item: TabItem): void {
    if (item.value === this._value) return;
    this._value = item.value;
    this.valueChange.emit(item.value);
    this.cdr.markForCheck();
    this.cdr.detectChanges();
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
