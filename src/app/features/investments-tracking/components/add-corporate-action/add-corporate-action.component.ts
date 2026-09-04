import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CorporateActionService } from '../../services/corporate-action.service';
import { NotificationService } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';

interface DemergerStock {
  stockCode: string;
  stockName: string;
}

@Component({
  selector: 'app-add-corporate-action',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
    TooltipDirective,
  ],
  templateUrl: './add-corporate-action.component.html',
})
export class AddCorporateActionComponent {
  @Output() actionAdded = new EventEmitter<void>();

  private corporateActionService = inject(CorporateActionService);
  private notificationService = inject(NotificationService);

  isLoading = false;

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
    { label: 'Merger', value: 'MERGER' },
    { label: 'Dividend', value: 'DIVIDEND' },
  ];

  assetTypes = [
    { label: 'Equity / Stock', value: 'EQUITY' },
    { label: 'Mutual Fund', value: 'MUTUAL_FUND' },
    { label: 'Bond', value: 'BOND' },
    { label: 'Other', value: 'OTHER' },
  ];

  onStockCodeChange(val: string): void {
    this.stockCode = val.toUpperCase();
    if (!this.mainStockCode || this.mainStockCode === val.substring(0, val.length - 1).toUpperCase()) {
      this.mainStockCode = this.stockCode;
    }
  }

  onStockNameChange(val: string): void {
    this.stockName = val;
    if (!this.mainStockName || this.mainStockName === val.substring(0, val.length - 1)) {
      this.mainStockName = val;
    }
  }

  onExDateChange(val: string): void {
    this.exDate = val;
    if (!this.recordDate) {
      this.recordDate = val;
    }
    if (!this.date) {
      this.date = val;
    }
  }

  addDemergerStock(): void {
    this.demergerStocks.push({ stockCode: '', stockName: '' });
  }

  removeDemergerStock(index: number): void {
    this.demergerStocks.splice(index, 1);
  }

  syncDates(): void {
    if (this.exDate) {
      this.recordDate = this.exDate;
      this.date = this.exDate;
      this.notificationService.addNotification(
        'Dates Synced',
        'Record Date and Execution Date set to Ex Date.',
        'info'
      );
    } else {
      this.notificationService.addNotification(
        'Sync Failed',
        'Please select an Ex Date first.',
        'warning'
      );
    }
  }

  submitForm(): void {
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

    const payload: any = {
      stockCode: this.stockCode.trim().toUpperCase(),
      stockName: this.stockName.trim(),
      type: this.type,
      assetType: this.assetType,
      description: this.description.trim(),
      priority: this.priority,
      exDate: this.exDate,
      recordDate: this.recordDate || this.exDate,
      date: this.date || this.exDate,
    };

    if (this.type === 'BONUS' || this.type === 'STOCK_SPLIT' || this.type === 'MERGER') {
      if (!this.ratio.trim()) {
        this.showValidationError('Ratio is required (e.g. 1:1).');
        return;
      }
      payload.ratio = this.ratio.trim();
    }

    if (this.type === 'DIVIDEND') {
      if (this.dividendAmount === null || this.dividendAmount <= 0) {
        this.showValidationError('Valid Dividend Amount is required.');
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
        this.showValidationError('Demerger Price Ratio is required (e.g. 98:2).');
        return;
      }

      // Check if demerger stocks is valid
      const validDemergerStocks = this.demergerStocks.map(s => ({
        stockCode: s.stockCode.trim().toUpperCase(),
        stockName: s.stockName.trim()
      })).filter(s => s.stockCode && s.stockName);

      if (validDemergerStocks.length === 0) {
        this.showValidationError('At least one demerger stock with Code and Name is required.');
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
    this.corporateActionService.addCorporateAction(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.addNotification(
          'Corporate Action Created',
          `Successfully created corporate action '${this.type}' for ${this.stockCode.toUpperCase()}.`,
          'success'
        );
        this.actionAdded.emit();
        this.resetForm();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to add corporate action', err);
        this.notificationService.addNotification(
          'Creation Failed',
          `Failed to create '${this.type}' corporate action for ${this.stockCode.toUpperCase()}.`,
          'error'
        );
      },
    });
  }

  private showValidationError(message: string): void {
    this.notificationService.addNotification('Validation Error', message, 'error');
  }

  resetForm(): void {
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
    this.demergerRatio = '';
    this.demergerPriceRatio = '';
    this.mainStockCode = '';
    this.mainStockName = '';
    this.demergerStocks = [];
  }
}

