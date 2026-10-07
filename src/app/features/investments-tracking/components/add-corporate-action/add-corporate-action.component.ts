import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CorporateActionService } from '../../services/corporate-action.service';
import { NotificationService } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { BadgeComponent, BadgeTone } from '@shared/ui/badge/badge.component';
import { AlertComponent } from '@shared/ui/alert/alert.component';
import { DemergerStock } from '@models/corporate-action.model';

@Component({
  selector: 'app-add-corporate-action',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
  ],
  templateUrl: './add-corporate-action.component.html',
})
export class AddCorporateActionComponent implements OnInit {
  @Output() actionAdded = new EventEmitter<void>();
  @Output() viewActions = new EventEmitter<void>();

  private corporateActionService = inject(CorporateActionService);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);

  isLoading = false;
  existingActions: any[] = [];
  successMessage: string | null = null;
  validationError: string | null = null;

  // Form Fields
  stockCode = '';
  stockName = '';
  type = 'BONUS';
  assetType = 'EQUITY';
  description = '';
  priority = 0;
  exDate = '';
  recordDate = '';
  date = '';

  // Conditional Fields
  ratio = '';
  dividendAmount: number | null = null;
  actionPrice = '';

  // Name or Symbol Change fields
  toStockCode = '';
  toStockName = '';

  // Demerger fields
  demergerRatio = '';
  demergerPriceRatio = '';
  mainStockCode = '';
  mainStockName = '';
  demergerStocks: DemergerStock[] = [];

  // Dropdown lists
  actionTypes = [
    { label: 'Bonus Issue', value: 'BONUS' },
    { label: 'Stock Split', value: 'STOCK_SPLIT' },
    { label: 'Demerger', value: 'DEMERGER' },
    { label: 'Dividend', value: 'DIVIDEND' },
    { label: 'Buyback', value: 'BUYBACK' },
    { label: 'Rights Issue', value: 'RIGHTS_ISSUANCE' },
    { label: 'Name / Symbol Change', value: 'NAME_OR_SYMBOL_CHANGE' },
  ];

  assetTypes = [
    { label: 'Equity / Stock', value: 'EQUITY' },
    { label: 'Mutual Fund', value: 'MUTUAL_FUND' },
    { label: 'Bond', value: 'BOND' },
    { label: 'Other', value: 'OTHER' },
  ];

  onViewActionsClick(): void {
    this.viewActions.emit();
  }

  get conflictWarning(): string | null {
    if (!this.stockCode || !this.recordDate) return null;
    const match = this.existingActions.find(
      (a) => a.stockCode?.toUpperCase() === this.stockCode.trim().toUpperCase() && a.recordDate === this.recordDate
    );
    if (match) {
      return 'Conflict: ' + match.type + ' already registered for ' + this.stockCode.toUpperCase() + ' on ' + this.recordDate;
    }
    return null;
  }

  get ratioHelpText(): string {
    if (this.type === 'STOCK_SPLIT') {
      return this.ratio
        ? 'Split ratio ' + this.ratio + ': Each share divides into ' + (this.ratio.split(':')[1] || '?') + ' new shares.'
        : 'Old shares : New shares (e.g. 1:10 means 1 ₹10 FV share splits into 10 ₹1 FV shares).';
    }
    if (this.type === 'BONUS') {
      return this.ratio
        ? 'Bonus ratio ' + this.ratio + ': ' + (this.ratio.split(':')[0] || '?') + ' bonus shares for every ' + (this.ratio.split(':')[1] || '?') + ' held.'
        : 'Bonus shares : Existing shares held (e.g. 1:1 for 1 bonus per 1 held).';
    }
    return 'Ratio of new shares to existing shares held.';
  }

  ngOnInit(): void {
    this.loadExistingActions();
  }

  typeLabel(type: string): string {
    return this.actionTypes.find((o) => o.value === type)?.label ?? (type || 'Corporate action');
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

  loadExistingActions(): void {
    this.corporateActionService.getAllCorporateActions().subscribe({
      next: (data) => {
        this.existingActions = data || [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Could not prefetch existing actions for conflict checking', err);
      },
    });
  }

  onTypeChange(val: string): void {
    this.type = val;
    this.validationError = null;
  }

  onStockCodeChange(val: string): void {
    this.stockCode = (val || '').toUpperCase();
    this.validationError = null;
    if (!this.mainStockCode || this.mainStockCode === val.substring(0, val.length - 1).toUpperCase()) {
      this.mainStockCode = this.stockCode;
    }
  }

  onStockNameChange(val: string): void {
    this.stockName = val;
    this.validationError = null;
    if (!this.mainStockName || this.mainStockName === val.substring(0, val.length - 1)) {
      this.mainStockName = val;
    }
  }

  onExDateChange(val: string): void {
    this.exDate = val;
    this.validationError = null;
    if (!this.recordDate) {
      this.recordDate = val;
    }
    if (!this.date) {
      this.date = val;
    }
  }

  addDemergerStock(): void {
    if (this.demergerStocks.length >= 1) {
      this.notificationService.addNotification(
        'Single Child Stock Limit',
        'The reconciliation engine supports 1 resulting child company per demerger event.',
        'warning'
      );
      return;
    }
    this.demergerStocks.push({ stockCode: '', stockName: '' });
  }

  removeDemergerStock(index: number): void {
    this.demergerStocks.splice(index, 1);
  }

  syncDates(): void {
    if (this.exDate) {
      this.recordDate = this.exDate;
      this.date = this.exDate;
      this.validationError = null;
      this.notificationService.addNotification(
        'Dates Synced',
        'Record Date and Execution Date set to Ex Date.',
        'info'
      );
    } else {
      this.showValidationError('Please select an Ex Date first before syncing.');
    }
  }

  submitForm(): void {
    this.validationError = null;
    this.successMessage = null;

    if (!this.stockCode.trim()) {
      this.showValidationError('Stock Code is required.');
      return;
    }
    if (!this.stockName.trim()) {
      this.showValidationError('Stock Name is required.');
      return;
    }
    if (!this.exDate) {
      this.showValidationError('Ex Date is required.');
      return;
    }

    const recDate = this.recordDate || this.exDate;

    // Pre-flight duplicate check against known registry actions
    const existingSameStockAndDate = this.existingActions.filter(
      (a) =>
        a.stockCode?.toUpperCase() === this.stockCode.trim().toUpperCase() &&
        a.recordDate === recDate
    );

    const duplicateType = existingSameStockAndDate.find((a) => a.type === this.type);
    if (duplicateType) {
      this.showValidationError(
        `A corporate action of type '${this.type}' already exists for ${this.stockCode.toUpperCase()} on record date ${recDate}.`
      );
      return;
    }

    const targetPriority = Number(this.priority) || 0;
    const duplicatePriority = existingSameStockAndDate.find(
      (a) => Number(a.priority ?? 0) === targetPriority
    );
    if (duplicatePriority) {
      this.showValidationError(
        `Priority ${targetPriority} is already used by action '${duplicatePriority.type}' for this stock on ${recDate}. Please assign a unique priority.`
      );
      return;
    }

    const payload: any = {
      stockCode: this.stockCode.trim().toUpperCase(),
      stockName: this.stockName.trim(),
      type: this.type,
      assetType: this.assetType,
      description: this.description.trim(),
      priority: targetPriority,
      exDate: this.exDate,
      recordDate: recDate,
      date: this.date || this.exDate,
    };

    if (['BONUS', 'STOCK_SPLIT', 'BUYBACK', 'RIGHTS_ISSUANCE'].includes(this.type)) {
      if (!this.ratio.trim()) {
        this.showValidationError('Ratio is required (e.g. 1:1, 1:10).');
        return;
      }
      payload.ratio = this.ratio.trim();
    }

    if (['BUYBACK', 'RIGHTS_ISSUANCE'].includes(this.type) && this.actionPrice.trim()) {
      payload.actionPrice = this.actionPrice.trim();
    }

    if (this.type === 'NAME_OR_SYMBOL_CHANGE') {
      if (!this.toStockCode.trim()) {
        this.showValidationError('New (To) Stock Code is required for symbol changes.');
        return;
      }
      payload.toStockCode = this.toStockCode.trim().toUpperCase();
      payload.toStockName = this.toStockName.trim() || payload.stockName;
    }

    if (this.type === 'DIVIDEND') {
      if (this.dividendAmount === null || this.dividendAmount <= 0) {
        this.showValidationError('Valid positive Dividend Amount is required.');
        return;
      }
      payload.dividendAmount = this.dividendAmount;
    }

    if (this.type === 'DEMERGER') {
      if (!this.demergerRatio.trim()) {
        this.showValidationError('Demerger Ratio is required (e.g. 1:1).');
        return;
      }
      if (!this.demergerPriceRatio.trim()) {
        this.showValidationError('Demerger Price Ratio is required (e.g. 90:10).');
        return;
      }

      const validDemergerStocks = this.demergerStocks
        .map((s) => ({
          stockCode: s.stockCode.trim().toUpperCase(),
          stockName: s.stockName.trim(),
        }))
        .filter((s) => s.stockCode && s.stockName);

      if (validDemergerStocks.length === 0) {
        this.showValidationError('At least one demerger child stock with Code and Name is required.');
        return;
      }

      payload.demergerDetail = {
        demergerRatio: this.demergerRatio.trim(),
        demergerPriceRatio: this.demergerPriceRatio.trim(),
        mainStockCode: this.mainStockCode.trim().toUpperCase() || payload.stockCode,
        mainStockName: this.mainStockName.trim() || payload.stockName,
        demergerStocks: validDemergerStocks,
      };
    }

    this.isLoading = true;
    this.corporateActionService
      .addCorporateAction(payload)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (resp) => {
          const registeredCode = this.stockCode.toUpperCase();
          const registeredType = this.type;
          this.successMessage =
            typeof resp === 'string' && resp.length > 0
              ? resp
              : `Successfully created '${registeredType}' for ${registeredCode} (Record Date: ${recDate}).`;
          this.notificationService.addNotification(
            'Corporate Action Created',
            this.successMessage,
            'success'
          );
          this.actionAdded.emit();
          this.loadExistingActions();
          this.resetForm(false);
        },
        error: (err) => {
          console.error('Failed to add corporate action', err);
          const errMsg = err?.error?.message || err?.error || err?.message || 'Check fields and ensure priority/type is unique.';
          this.validationError = `Failed to create corporate action: ${errMsg}`;
          this.notificationService.addNotification(
            'Creation Failed',
            this.validationError,
            'error'
          );
        },
      });
  }

  private showValidationError(message: string): void {
    this.validationError = message;
    this.notificationService.addNotification('Validation Error', message, 'error');
  }

  resetForm(clearSuccess: boolean = true): void {
    this.stockCode = '';
    this.stockName = '';
    this.type = 'BONUS';
    this.assetType = 'EQUITY';
    this.description = '';
    this.priority = 0;
    this.exDate = '';
    this.recordDate = '';
    this.date = '';
    this.ratio = '';
    this.dividendAmount = null;
    this.actionPrice = '';
    this.toStockCode = '';
    this.toStockName = '';
    this.demergerRatio = '';
    this.demergerPriceRatio = '';
    this.mainStockCode = '';
    this.mainStockName = '';
    this.demergerStocks = [];
    this.validationError = null;
    if (clearSuccess) {
      this.successMessage = null;
    }
  }
}
