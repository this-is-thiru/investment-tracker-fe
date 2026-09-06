import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabItem {
  label: string;
  value: string;
}

/**
 * Segmented tab/chip control. Replaces the ~6 duplicated active/inactive
 * ternary tab patterns (BUY/SELL filter chips, view-mode tabs) that each
 * hand-rolled their own [ngClass] active-state colors.
 *
 * Usage: <ui-tabs [items]="[{label:'All',value:'all'},{label:'Buy',value:'buy'}]" [value]="filter" (valueChange)="filter = $event" />
 */
@Component({
  selector: 'ui-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.css',
})
export class TabsComponent {
  @Input() items: TabItem[] = [];
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  select(item: TabItem): void {
    if (item.value === this.value) return;
    this.value = item.value;
    this.valueChange.emit(item.value);
  }
}
