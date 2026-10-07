import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';
import { BadgeComponent, BadgeTone } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { AlertComponent } from '@shared/ui/alert/alert.component';
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
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    ModalComponent,
    AlertComponent,
  ],
  templateUrl: './corporate-action-list.component.html',
})
export class CorporateActionListComponent implements OnInit {
  @Output() addAction = new EventEmitter<void>();

  private corporateActionService = inject(CorporateActionService);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);
  public authService = inject(AuthService);

  actions: any[] = [];
  filteredActions: any[] = [];
  isLoading = false;
  loadError: string | null = null;

  // Detail modal state
  selectedAction: any = null;
  showDetailModal = false;
  isDetailLoading = false;
  detailIsPartial = false;
  isExecutingAction = false;

  // Inline priority editing state
  editingPriorityId: string | null = null;
  editPriorityValue: number = 0;
  isSavingPriority = false;

  searchQuery = '';
  filterType = 'ALL';
  typeOptions = [
    { label: 'All Types', value: 'ALL' },
    { label: 'Bonus Issue', value: 'BONUS' },
    { label: 'Stock Split', value: 'STOCK_SPLIT' },
    { label: 'Demerger', value: 'DEMERGER' },
    { label: 'Dividend', value: 'DIVIDEND' },
    { label: 'Buyback', value: 'BUYBACK' },
    { label: 'Rights Issue', value: 'RIGHTS_ISSUANCE' },
    { label: 'Symbol / Name Change', value: 'NAME_OR_SYMBOL_CHANGE' },
  ];

  get bonusCount(): number {
    return this.actions.filter((a) => a.type === 'BONUS').length;
  }
  get splitCount(): number {
    return this.actions.filter((a) => a.type === 'STOCK_SPLIT' || a.type === 'SPLIT').length;
  }
  get demergerCount(): number {
    return this.actions.filter((a) => a.type === 'DEMERGER').length;
  }
  get dividendCount(): number {
    return this.actions.filter((a) => a.type === 'DIVIDEND').length;
  }
  onAddActionClick(): void {
    this.addAction.emit();
  }

  get otherCount(): number {
    return this.actions.length - (this.bonusCount + this.splitCount + this.demergerCount + this.dividendCount);
  }

  ngOnInit(): void {
    this.loadActions();
  }

  typeLabel(type: string): string {
    return this.typeOptions.find((o) => o.value === type)?.label ?? (type || 'Corporate action');
  }

  canExecuteDirectly(action: any): boolean {
    return action?.type === 'NAME_OR_SYMBOL_CHANGE';
  }

  getBadgeTone(type: string): BadgeTone {
    switch (type) {
      case 'BONUS':
        return 'accent';
      case 'STOCK_SPLIT':
      case 'SPLIT':
        return 'warning';
      case 'DEMERGER':
        return 'purple';
      case 'DIVIDEND':
        return 'success';
      case 'BUYBACK':
        return 'danger';
      case 'RIGHTS_ISSUANCE':
        return 'info';
      case 'NAME_OR_SYMBOL_CHANGE':
        return 'warning';
      default:
        return 'neutral';
    }
  }

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
        const stockName = action.stockName || '';
        const stockCode = action.stockCode || '';
        const actionType = action.type || '';
        const toStockCode = action.toStockCode || '';
        const haystack = (stockName + ' ' + stockCode + ' ' + actionType + ' ' + toStockCode).toLowerCase();
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
    this.loadError = null;
    this.corporateActionService
      .getAllCorporateActions()
      .pipe(finalize(() => this.cdr.markForCheck()))
      .subscribe({
        next: (data) => {
          this.actions = data || [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load corporate actions', err);
          this.isLoading = false;
          this.loadError = 'Failed to load corporate actions from server. Please try refreshing.';
          this.notificationService.addNotification(
            'Load Failed',
            'Failed to load corporate actions from server.',
            'error'
          );
        },
      });
  }

  startEditPriority(action: any): void {
    this.editingPriorityId = action.id || action.stockCode;
    this.editPriorityValue = action.priority ?? 0;
  }

  cancelEditPriority(): void {
    this.editingPriorityId = null;
  }

  savePriority(action: any): void {
    const actionId = action.id || action.stockCode;
    if (!actionId) return;

    this.isSavingPriority = true;
    this.corporateActionService
      .updateCorporateActionPriority(actionId, this.editPriorityValue)
      .pipe(
        finalize(() => {
          this.isSavingPriority = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (msg) => {
          action.priority = this.editPriorityValue;
          this.editingPriorityId = null;
          const name = action.stockName || action.stockCode;
          this.notificationService.addNotification(
            'Priority Updated',
            msg || ('Priority for ' + name + ' set to ' + this.editPriorityValue + '.'),
            'success'
          );
        },
        error: (err) => {
          console.error('Failed to update priority', err);
          const errMsg = err?.error?.message || err?.error || err?.message || 'Failed to update priority.';
          this.notificationService.addNotification(
            'Update Failed',
            errMsg,
            'error'
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

    this.corporateActionService
      .getCorporateActionById(id)
      .pipe(finalize(() => this.cdr.markForCheck()))
      .subscribe({
        next: (data) => {
          this.selectedAction = data;
          this.isDetailLoading = false;
        },
        error: (err) => {
          console.error('Failed to load corporate action with ID ' + id, err);
          this.isDetailLoading = false;

          const localAction = this.actions.find((a) => a.id === id || a.stockCode === id);
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

  async executeSingleAction(action: any): Promise<void> {
    if (!action) return;
    const stockDisplayName = action.stockName || action.stockCode;
    const ok = await this.confirmDialog.confirm({
      title: 'Execute Corporate Action',
      message: 'Apply ' + this.typeLabel(action.type) + ' for ' + stockDisplayName + ' system-wide across all matching assets and historical transactions?',
      tone: 'accent',
      confirmLabel: 'Execute Now',
    });
    if (!ok) {
      return;
    }

    this.isExecutingAction = true;
    this.corporateActionService
      .performSingleCorporateAction(action)
      .pipe(
        finalize(() => {
          this.isExecutingAction = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (msg) => {
          this.notificationService.addNotification(
            'Action Executed',
            msg || ('Successfully executed ' + action.type + ' for ' + stockDisplayName + '.'),
            'success'
          );
          this.closeModal();
          this.loadActions();
        },
        error: (err) => {
          console.error('Failed to execute single corporate action', err);
          const errMsg = err?.error?.message || err?.error || err?.message || 'Execution failed';
          this.notificationService.addNotification(
            'Execution Failed',
            'Failed to execute action: ' + errMsg,
            'error'
          );
        },
      });
  }

  async deleteAction(action: any): Promise<void> {
    if (!this.authService.isSuperUserRole()) {
      this.notificationService.addNotification(
        'Permission Denied',
        'Super User role is required to delete corporate actions.',
        'error'
      );
      return;
    }

    const actionId = action.id || action.stockCode;
    const stockDisplayName = action.stockName || action.stockCode;
    if (!action || !actionId) {
      this.notificationService.addNotification('Error', 'Action identifier is missing.', 'error');
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: 'Delete Corporate Action',
      message: 'Delete the ' + this.typeLabel(action.type) + ' action for ' + stockDisplayName + '? This cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) {
      return;
    }

    this.corporateActionService
      .deleteCorporateAction(actionId)
      .pipe(finalize(() => this.cdr.markForCheck()))
      .subscribe({
        next: () => {
          this.notificationService.addNotification(
            'Corporate Action Deleted',
            'Successfully deleted corporate action for ' + stockDisplayName + '.',
            'success'
          );
          this.loadActions();
        },
        error: (err) => {
          console.error('Failed to delete corporate action', err);
          const errMsg = err?.error?.message || err?.error || err?.message || 'Failed to delete corporate action';
          this.notificationService.addNotification(
            'Deletion Failed',
            errMsg,
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
