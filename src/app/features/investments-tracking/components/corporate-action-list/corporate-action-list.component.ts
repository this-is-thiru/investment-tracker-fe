import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef, HostListener, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CorporateActionService, describeHttpError } from '../../services/corporate-action.service';
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
import { ActionEffect, EXAMPLE_COST, EXAMPLE_SHARES, describeEffect } from './corporate-action-effect';

export interface TimelineStep {
  label: string;
  date: string;
  /** On or before today */
  reached: boolean;
}

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
  /** A registered action was applied to holdings from the detail modal */
  @Output() actionExecuted = new EventEmitter<void>();

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
  selectedEffect: ActionEffect | null = null;
  selectedTimeline: TimelineStep[] = [];
  showDetailModal = false;
  isDetailLoading = false;
  detailIsPartial = false;
  isExecutingAction = false;
  readonly exampleShares = EXAMPLE_SHARES;
  readonly exampleCost = EXAMPLE_COST;
  private detailRequest?: Subscription;

  // Inline priority editing state
  editingPriorityId: string | null = null;
  editPriorityValue: number = 0;
  isSavingPriority = false;

  deletingId: string | null = null;

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
  get otherCount(): number {
    return this.actions.length - (this.bonusCount + this.splitCount + this.demergerCount + this.dividendCount);
  }

  get hasFilters(): boolean {
    return !!this.searchQuery.trim() || this.filterType !== 'ALL';
  }

  onAddActionClick(): void {
    this.addAction.emit();
  }

  actionKey(action: any): string {
    return action?.id || action?.stockCode || '';
  }

  ngOnInit(): void {
    this.loadActions();
  }

  typeLabel(type: string): string {
    return this.typeOptions.find((o) => o.value === type)?.label ?? (type || 'Corporate action');
  }

  assetTypeLabel(assetType: string | null | undefined): string {
    switch (assetType) {
      case 'MUTUAL_FUND':
        return 'Mutual fund';
      case 'BOND':
        return 'Bond';
      case 'OTHER':
        return 'Other';
      default:
        return 'Equity';
    }
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
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.actions = data || [];
          this.applyFilters();
        },
        error: (err) => {
          this.loadError = describeHttpError(err, 'Corporate actions could not be loaded. Please try again.');
        },
      });
  }

  startEditPriority(action: any): void {
    this.editingPriorityId = this.actionKey(action);
    this.editPriorityValue = action.priority ?? 0;
  }

  cancelEditPriority(): void {
    this.editingPriorityId = null;
  }

  savePriority(action: any): void {
    const actionId = this.actionKey(action);
    if (!actionId || this.isSavingPriority) return;

    const priority = Number(this.editPriorityValue);
    if (!Number.isInteger(priority) || priority < 0 || priority > 999) {
      this.notificationService.addNotification('Invalid priority', 'Priority must be a whole number from 0 to 999.', 'error');
      return;
    }
    if (priority === (action.priority ?? 0)) {
      this.editingPriorityId = null;
      return;
    }

    this.isSavingPriority = true;
    this.corporateActionService
      .updateCorporateActionPriority(actionId, priority)
      .pipe(
        finalize(() => {
          this.isSavingPriority = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          action.priority = priority;
          this.editingPriorityId = null;
          this.notificationService.addNotification(
            'Priority updated',
            `${action.stockName || action.stockCode} will now run at priority ${priority}.`,
            'success'
          );
        },
        error: (err) => {
          this.notificationService.addNotification(
            'Priority not updated',
            describeHttpError(err, 'The priority could not be saved. Please try again.'),
            'error'
          );
        },
      });
  }

  // The list row is shown straight away; the detail call then fills in anything the list omits
  viewDetails(action: any): void {
    const id = this.actionKey(action);
    if (!id) return;
    this.showDetailModal = true;
    this.detailIsPartial = false;
    this.setSelected({ ...action });

    this.detailRequest?.unsubscribe();
    this.isDetailLoading = true;
    this.detailRequest = this.corporateActionService
      .getCorporateActionById(id)
      .pipe(
        finalize(() => {
          this.isDetailLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          if (data) {
            this.setSelected({ ...action, ...data });
          } else {
            this.detailIsPartial = true;
          }
        },
        error: () => (this.detailIsPartial = true),
      });
  }

  /** Position of the open action within the current (filtered, sorted) list */
  get selectedIndex(): number {
    const key = this.actionKey(this.selectedAction);
    return key ? this.filteredActions.findIndex((a) => this.actionKey(a) === key) : -1;
  }

  showAdjacent(step: 1 | -1): void {
    const next = this.filteredActions[this.selectedIndex + step];
    if (next && this.selectedIndex >= 0) {
      this.viewDetails(next);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDetailKeydown(event: KeyboardEvent): void {
    if (!this.showDetailModal || this.confirmDialog.request()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    if (event.key === 'ArrowRight') this.showAdjacent(1);
    if (event.key === 'ArrowLeft') this.showAdjacent(-1);
  }

  get isUpcoming(): boolean {
    const record = this.selectedAction?.recordDate;
    return !!record && record > this.todayIso();
  }

  private setSelected(action: any): void {
    this.selectedAction = action;
    this.selectedEffect = describeEffect(action);
    const today = this.todayIso();
    this.selectedTimeline = [
      { label: 'Ex-date', date: action.exDate },
      { label: 'Record date', date: action.recordDate },
      { label: 'Effective', date: action.date },
    ]
      .filter((s) => !!s.date)
      .map((s) => ({ ...s, reached: s.date <= today }));
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async executeSingleAction(action: any): Promise<void> {
    if (!action || this.isExecutingAction) return;
    const stockDisplayName = action.stockName || action.stockCode;
    const ok = await this.confirmDialog.confirm({
      title: 'Apply corporate action?',
      message: `Apply the ${this.typeLabel(action.type)} for ${stockDisplayName}${
        action.toStockCode ? ' → ' + action.toStockCode : ''
      } to every matching holding and past transaction?`,
      tone: 'accent',
      confirmLabel: 'Apply now',
    });
    if (!ok) return;

    this.isExecutingAction = true;
    this.cdr.markForCheck();
    this.corporateActionService
      .performSingleCorporateAction(action)
      .pipe(
        finalize(() => {
          this.isExecutingAction = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.notificationService.addNotification(
            'Corporate action applied',
            `${this.typeLabel(action.type)} applied for ${stockDisplayName}.`,
            'success'
          );
          this.closeModal();
          this.actionExecuted.emit();
          this.loadActions();
        },
        error: (err) => {
          this.notificationService.addNotification(
            'Corporate action not applied',
            describeHttpError(err, 'The action could not be applied. Please try again.'),
            'error'
          );
        },
      });
  }

  async deleteAction(action: any): Promise<void> {
    if (!this.authService.isSuperUserRole()) {
      this.notificationService.addNotification(
        'Permission denied',
        'Only super users can delete corporate actions.',
        'error'
      );
      return;
    }

    const actionId = this.actionKey(action);
    if (!actionId || this.deletingId) return;
    const stockDisplayName = action.stockName || action.stockCode;

    const ok = await this.confirmDialog.confirm({
      title: 'Delete corporate action?',
      message: `Delete the ${this.typeLabel(action.type)} for ${stockDisplayName}? This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    this.deletingId = actionId;
    this.cdr.markForCheck();
    this.corporateActionService
      .deleteCorporateAction(actionId)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.notificationService.addNotification(
            'Corporate action deleted',
            `The ${this.typeLabel(action.type)} for ${stockDisplayName} was removed.`,
            'success'
          );
          if (this.showDetailModal && this.actionKey(this.selectedAction) === actionId) {
            this.closeModal();
          }
          this.loadActions();
        },
        error: (err) => {
          this.notificationService.addNotification(
            'Corporate action not deleted',
            describeHttpError(err, 'The action could not be deleted. Please try again.'),
            'error'
          );
        },
      });
  }

  closeModal(): void {
    this.detailRequest?.unsubscribe();
    this.showDetailModal = false;
    this.isDetailLoading = false;
    this.selectedAction = null;
    this.selectedEffect = null;
    this.selectedTimeline = [];
    this.detailIsPartial = false;
  }

  refresh(): void {
    this.loadActions();
  }
}
