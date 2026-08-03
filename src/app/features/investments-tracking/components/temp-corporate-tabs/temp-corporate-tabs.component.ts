import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TempTransactionsTableComponent } from '../temp-transactions-table/temp-transactions-table.component';
import { AddCorporateActionComponent } from '../add-corporate-action/add-corporate-action.component';
import { CorporateActionListComponent } from '../corporate-action-list/corporate-action-list.component';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

type Tab = 'temporary' | 'add-action' | 'list-actions';

@Component({
  selector: 'app-temp-corporate-tabs',
  standalone: true,
  imports: [
    CommonModule,
    TempTransactionsTableComponent,
    AddCorporateActionComponent,
    CorporateActionListComponent,
    ExpansionPanelComponent,
    LucideIconsModule,
  ],
  templateUrl: './temp-corporate-tabs.component.html',
})
export class TempCorporateTabsComponent {
  @Input() userEmail = '';
  @Output() dataChanged = new EventEmitter<void>();

  @ViewChild(TempTransactionsTableComponent)
  tempTable?: TempTransactionsTableComponent;

  @ViewChild(CorporateActionListComponent)
  listActionsComponent?: CorporateActionListComponent;

  activeTab: Tab = 'temporary';

  onActionApplied(): void {
    this.dataChanged.emit();
    this.tempTable?.refresh();
  }

  onActionAdded(): void {
    this.listActionsComponent?.refresh();
  }

  refresh(): void {
    this.tempTable?.refresh();
    this.listActionsComponent?.refresh();
  }
}
