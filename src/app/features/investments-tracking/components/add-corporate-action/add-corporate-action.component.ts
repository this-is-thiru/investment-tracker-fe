import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CorporateActionService, describeHttpError } from '../../services/corporate-action.service';
import { NotificationService } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { BadgeComponent, BadgeTone } from '@shared/ui/badge/badge.component';
import { AlertComponent } from '@shared/ui/alert/alert.component';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';
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
    TooltipDirective,
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
  errorTitle = 'Check the form';

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
    const code = this.stockCode.trim().toUpperCase();
    const match = this.existingActions.find(
      (a) => a.stockCode?.toUpperCase() === code && a.recordDate === this.recordDate
    );
    return match
      ? `${code} already has a ${this.typeLabel(match.type)} (priority ${match.priority ?? 0}) on ${this.recordDate}. Use a different priority.`
      : null;
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
    // A demerger always needs its resulting company, so start with that row open
    if (val === 'DEMERGER' && this.demergerStocks.length === 0) {
      this.demergerStocks = [{ stockCode: '', stockName: '' }];
    }
  }

  // The demerger parent mirrors the stock fields until the user edits it separately
  onStockCodeChange(val: string): void {
    const previous = this.stockCode;
    this.stockCode = (val || '').toUpperCase();
    this.validationError = null;
    if (!this.mainStockCode || this.mainStockCode === previous) {
      this.mainStockCode = this.stockCode;
    }
  }

  onStockNameChange(val: string): void {
    const previous = this.stockName;
    this.stockName = val || '';
    this.validationError = null;
    if (!this.mainStockName || this.mainStockName === previous) {
      this.mainStockName = this.stockName;
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

  // The reconciliation engine allocates to a single resulting company per demerger
  addDemergerStock(): void {
    if (this.demergerStocks.length >= 1) return;
    this.demergerStocks = [...this.demergerStocks, { stockCode: '', stockName: '' }];
  }

  removeDemergerStock(index: number): void {
    this.demergerStocks = this.demergerStocks.filter((_, i) => i !== index);
  }

  syncDates(): void {
    if (!this.exDate) {
      this.showValidationError('Pick the ex-date first, then copy it to the other dates.');
      return;
    }
    this.recordDate = this.exDate;
    this.date = this.exDate;
    this.validationError = null;
  }

  private isRatio(value: string): boolean {
    return /^\d+(\.\d+)?\s*:\s*\d+(\.\d+)?$/.test(value.trim());
  }

  submitForm(): void {
    if (this.isLoading) return;
    this.validationError = null;
    this.successMessage = null;

    const stockCode = this.stockCode.trim().toUpperCase();
    if (!stockCode) {
      this.showValidationError('Enter the stock code.');
      return;
    }
    if (!this.stockName.trim()) {
      this.showValidationError('Enter the stock name.');
      return;
    }
    if (!this.exDate) {
      this.showValidationError('Pick the ex-date.');
      return;
    }

    const recDate = this.recordDate || this.exDate;
    if (recDate < this.exDate) {
      this.showValidationError('The record date can’t be before the ex-date.');
      return;
    }

    const targetPriority = Number(this.priority);
    if (!Number.isInteger(targetPriority) || targetPriority < 0 || targetPriority > 999) {
      this.showValidationError('Priority must be a whole number from 0 to 999.');
      return;
    }

    // Pre-flight duplicate check against known registry actions
    const existingSameStockAndDate = this.existingActions.filter(
      (a) => a.stockCode?.toUpperCase() === stockCode && a.recordDate === recDate
    );

    const duplicateType = existingSameStockAndDate.find((a) => a.type === this.type);
    if (duplicateType) {
      this.showValidationError(
        `A ${this.typeLabel(this.type)} for ${stockCode} on record date ${recDate} is already registered.`
      );
      return;
    }

    const duplicatePriority = existingSameStockAndDate.find(
      (a) => Number(a.priority ?? 0) === targetPriority
    );
    if (duplicatePriority) {
      this.showValidationError(
        `Priority ${targetPriority} is already used by the ${this.typeLabel(duplicatePriority.type)} for ${stockCode} on ${recDate}. Pick another priority.`
      );
      return;
    }

    const payload: any = {
      stockCode,
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
      if (!this.isRatio(this.ratio)) {
        this.showValidationError('Enter the ratio as two numbers, like 1:1 or 1:10.');
        return;
      }
      payload.ratio = this.ratio.replace(/\s/g, '');
    }

    if (['BUYBACK', 'RIGHTS_ISSUANCE'].includes(this.type) && this.actionPrice.trim()) {
      const price = Number(this.actionPrice.trim());
      if (!(price > 0)) {
        this.showValidationError('The offer price must be a positive number.');
        return;
      }
      payload.actionPrice = this.actionPrice.trim();
    }

    if (this.type === 'NAME_OR_SYMBOL_CHANGE') {
      const toStockCode = this.toStockCode.trim().toUpperCase();
      if (!toStockCode) {
        this.showValidationError('Enter the new stock code.');
        return;
      }
      if (toStockCode === stockCode && !this.toStockName.trim()) {
        this.showValidationError('The new stock code is the same as the current one. Change the code or enter a new name.');
        return;
      }
      payload.toStockCode = toStockCode;
      payload.toStockName = this.toStockName.trim() || payload.stockName;
    }

    if (this.type === 'DIVIDEND') {
      if (this.dividendAmount === null || !(Number(this.dividendAmount) > 0)) {
        this.showValidationError('Enter the dividend per share as a positive amount.');
        return;
      }
      payload.dividendAmount = Number(this.dividendAmount);
    }

    if (this.type === 'DEMERGER') {
      if (!this.isRatio(this.demergerRatio)) {
        this.showValidationError('Enter the demerger share ratio as two numbers, like 1:1.');
        return;
      }
      if (!this.isRatio(this.demergerPriceRatio)) {
        this.showValidationError('Enter the cost split as two numbers, like 90:10.');
        return;
      }

      const validDemergerStocks = this.demergerStocks
        .map((s) => ({
          stockCode: (s.stockCode || '').trim().toUpperCase(),
          stockName: (s.stockName || '').trim(),
        }))
        .filter((s) => s.stockCode && s.stockName);

      if (validDemergerStocks.length === 0) {
        this.showValidationError('Enter the code and name of the resulting company.');
        return;
      }

      payload.demergerDetail = {
        demergerRatio: this.demergerRatio.replace(/\s/g, ''),
        demergerPriceRatio: this.demergerPriceRatio.replace(/\s/g, ''),
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
        next: () => {
          this.successMessage = `${this.typeLabel(payload.type)} for ${payload.stockCode} (record date ${recDate}) is now in the registry.`;
          this.notificationService.addNotification('Corporate action added', this.successMessage, 'success');
          this.actionAdded.emit();
          this.loadExistingActions();
          this.resetForm(false);
        },
        error: (err) => {
          this.errorTitle = 'Corporate action not saved';
          this.validationError = describeHttpError(err, 'Check the details and make sure the type and priority are unique, then try again.');
        },
      });
  }

  private showValidationError(message: string): void {
    this.errorTitle = 'Check the form';
    this.validationError = message;
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
