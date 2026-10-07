import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { TempTransactionsTableComponent } from '../temp-transactions-table/temp-transactions-table.component';
import { AddCorporateActionComponent } from '../add-corporate-action/add-corporate-action.component';
import { CorporateActionListComponent } from '../corporate-action-list/corporate-action-list.component';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { TransactionService } from '@services/transaction.service';

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
    TabsComponent,
  ],
  templateUrl: './temp-corporate-tabs.component.html',
})
export class TempCorporateTabsComponent {
  @Input() userEmail = '';
  @Output() dataChanged = new EventEmitter<void>();

  @ViewChild(TabsComponent) uiTabs?: TabsComponent;

  @ViewChild(TempTransactionsTableComponent)
  tempTable?: TempTransactionsTableComponent;

  @ViewChild(CorporateActionListComponent)
  listActionsComponent?: CorporateActionListComponent;

  activeTab: Tab = 'temporary';

  private transactionService = inject(TransactionService);
  private cdr = inject(ChangeDetectorRef);

  /** Temporary rows waiting for review; null until first known */
  pendingCount: number | null = null;
  tabs: TabItem[] = this.buildTabs();

  private buildTabs(): TabItem[] {
    return [
      { label: 'Temporary', value: 'temporary', icon: 'database', badge: this.pendingCount || undefined },
      { label: 'All Actions', value: 'list-actions', icon: 'file-text' },
      { label: 'Add Action', value: 'add-action', icon: 'plus' },
    ];
  }

  onPendingCount(count: number): void {
    this.pendingCount = count;
    this.tabs = this.buildTabs();
    this.cdr.markForCheck();
  }

  // The table only exists while its tab is open; otherwise fetch the count directly
  loadPendingCount(): void {
    if (!this.userEmail) return;
    this.transactionService.getTemporaryTransactions(this.userEmail).pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: (rows) => this.onPendingCount(rows.length),
      error: () => {},
    });
  }

  onTabChange(tab: Tab): void {
    this.activeTab = tab;
    if (this.uiTabs) {
      this.uiTabs.value = tab;
    }
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    this.loadPendingCount();
  }

  onActionApplied(): void {
    // The table reloads itself and reports the new count
    this.dataChanged.emit();
  }

  onActionAdded(): void {
    this.listActionsComponent?.refresh();
  }

  refresh(): void {
    if (this.tempTable) {
      this.tempTable.refresh();
    } else {
      this.loadPendingCount();
    }
    this.listActionsComponent?.refresh();
  }
}
