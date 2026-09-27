import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-corporate-action-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
    TooltipDirective,
    ButtonComponent,
    EmptyStateComponent,
    ModalComponent,
  ],
  templateUrl: './corporate-action-list.component.html',
})
export class CorporateActionListComponent implements OnInit {
  private corporateActionService = inject(CorporateActionService);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);
  public authService = inject(AuthService);

  actions: any[] = [];
  filteredActions: any[] = [];
  isLoading = false;

  // Detail modal state
  selectedAction: any = null;
  showDetailModal = false;
  isDetailLoading = false;
  /** True when the detail call failed and only the list summary is shown */
  detailIsPartial = false;

  searchQuery = '';
  filterType = 'ALL';
  typeOptions = [
    { label: 'All Types', value: 'ALL' },
    { label: 'Bonus Issue', value: 'BONUS' },
    { label: 'Stock Split', value: 'STOCK_SPLIT' },
    { label: 'Demerger', value: 'DEMERGER' },
    { label: 'Merger', value: 'MERGER' },
    { label: 'Dividend', value: 'DIVIDEND' },
  ];

  ngOnInit(): void {
    this.loadActions();
  }

  typeLabel(type: string): string {
    return this.typeOptions.find(o => o.value === type)?.label ?? (type || 'Corporate action');
  }

  // Dates arrive as strings from the API; show them readably but never throw on odd formats
  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? value
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();
    this.filteredActions = this.actions.filter((action) => {
      if (q) {
        const haystack = `${action.stockName} ${action.stockCode} ${action.type}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (this.filterType !== 'ALL' && action.type !== this.filterType) {
        return false;
      }
      return true;
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterType = 'ALL';
    this.applyFilters();
  }

  loadActions(): void {
    this.isLoading = true;
    this.corporateActionService.getAllCorporateActions().pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: (data) => {
        this.actions = data || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load corporate actions', err);
        this.isLoading = false;
        // Fallback mock data if API fails so the UI still shows data
        this.actions = [
          {
            id: '1',
            stockCode: 'HINDUSTAN_UNILEVER',
            stockName: 'Hindustan Unilever Ltd',
            type: 'DEMERGER',
            assetType: 'EQUITY',
            exDate: '2026-05-28',
            recordDate: '2026-05-28',
            date: '2026-05-28'
          },
          {
            id: '2',
            stockCode: 'HDFCBANK',
            stockName: 'HDFC Bank Ltd',
            type: 'BONUS',
            assetType: 'EQUITY',
            exDate: '2025-08-26',
            recordDate: '2025-08-26',
            date: '2025-08-26'
          },
          {
            id: '3',
            stockCode: 'RELIANCE',
            stockName: 'Reliance Industries Ltd',
            type: 'BONUS',
            assetType: 'EQUITY',
            exDate: '2024-10-28',
            recordDate: '2024-10-28',
            date: '2024-10-28'
          }
        ];
        this.applyFilters();
        this.notificationService.addNotification(
          'API Fallback Loaded',
          'Failed to load corporate actions from API. Loaded mock actions list.',
          'warning'
        );
      },
    });
  }

  viewDetails(id: string): void {
    if (!id) return;
    this.isDetailLoading = true;
    this.showDetailModal = true;
    this.selectedAction = null;

    this.detailIsPartial = false;

    this.corporateActionService.getCorporateActionById(id).pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: (data) => {
        this.selectedAction = data;
        this.isDetailLoading = false;
      },
      error: (err) => {
        console.error(`Failed to load corporate action with ID ${id}`, err);
        this.isDetailLoading = false;

        // Show what the list already knows; never invent ratios or companies
        const localAction = this.actions.find(a => a.id === id || a.stockCode === id);
        if (localAction) {
          this.selectedAction = { ...localAction };
          this.detailIsPartial = true;
        } else {
          this.showDetailModal = false;
          this.notificationService.addNotification(
            'Fetch Failed',
            'Failed to fetch corporate action details from server.',
            'error'
          );
        }
      },
    });
  }

  async deleteAction(action: any): Promise<void> {
    if (!action || (!action.id && !action.stockCode)) {
      this.notificationService.addNotification(
        'Error',
        'Action identifier is missing.',
        'error'
      );
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: 'Delete corporate action',
      message: `Delete the ${action.type || 'corporate'} action for ${action.stockName || action.stockCode}? This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) {
      return;
    }

    // Construct deletion payload matching body ex
    const payload = {
      stockCode: action.stockCode,
      stockName: action.stockName,
      type: action.type,
      description: action.description || '',
      ratio: action.ratio || '',
      exDate: action.exDate,
      recordDate: action.recordDate,
    };

    const actionId = action.id || action.stockCode;

    this.corporateActionService.deleteCorporateAction(actionId, payload).pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: () => {
        this.notificationService.addNotification(
          'Corporate Action Deleted',
          `Successfully deleted corporate action for ${action.stockName || action.stockCode}.`,
          'success'
        );
        this.loadActions();
      },
      error: (err) => {
        console.error('Failed to delete corporate action', err);
        this.notificationService.addNotification(
          'Deletion Failed',
          `Failed to delete corporate action for ${action.stockName || action.stockCode}.`,
          'error'
        );
      },
    });
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.selectedAction = null;
  }

  refresh(): void {
    this.loadActions();
  }
}
