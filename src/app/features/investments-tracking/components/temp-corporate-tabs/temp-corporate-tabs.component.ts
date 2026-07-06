import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TempTransactionsTableComponent } from '../temp-transactions-table/temp-transactions-table.component';
import { CorporateActionSimpleComponent } from '../corporate-action-simple/corporate-action-simple.component';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';

type Tab = 'temporary' | 'corporate';

@Component({
  selector: 'app-temp-corporate-tabs',
  standalone: true,
  imports: [
    CommonModule,
    TempTransactionsTableComponent,
    CorporateActionSimpleComponent,
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

  activeTab: Tab = 'temporary';

  onActionApplied(): void {
    this.dataChanged.emit();
    this.tempTable?.refresh();
  }

  refresh(): void {
    this.tempTable?.refresh();
  }
}
