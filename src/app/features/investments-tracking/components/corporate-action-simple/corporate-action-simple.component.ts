import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';

@Component({
  selector: 'app-corporate-action-simple',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
  ],
  templateUrl: './corporate-action-simple.component.html',
})
export class CorporateActionSimpleComponent {
  @Input() userEmail = '';
  @Output() actionApplied = new EventEmitter<void>();

  private corporateActionService = inject(CorporateActionService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  actionType = 'bonus';
  stockCode = '';
  ratio = '';
  dividendAmount: number | null = null;
  isLoading = false;

  actionOptions = [
    { label: 'Bonus Issue', value: 'bonus' },
    { label: 'Dividend Payment', value: 'dividend' },
    { label: 'Stock Split', value: 'split' },
    { label: 'Merger/Acquisition', value: 'merger' },
  ];

  applyAction(): void {
    const email = this.userEmail || this.authService.getUserEmail();
    if (!email) {
      this.notificationService.addNotification(
        'Authentication Required',
        'You need to be signed in to apply corporate actions.',
        'error'
      );
      return;
    }

    if (!this.stockCode.trim()) {
      this.notificationService.addNotification(
        'Validation Error',
        'Please enter a stock code.',
        'error'
      );
      return;
    }

    const payload: any = {
      actionType: this.actionType,
      stockCode: this.stockCode.trim(),
    };

    if (this.actionType === 'split' || this.actionType === 'bonus') {
      if (!this.ratio.trim()) {
        this.notificationService.addNotification(
          'Validation Error',
          'Please enter a ratio.',
          'error'
        );
         return;
      }
      payload.ratio = this.ratio.trim();
    }

    if (this.actionType === 'dividend') {
      if (this.dividendAmount == null || this.dividendAmount <= 0) {
        this.notificationService.addNotification(
          'Validation Error',
          'Please enter a valid dividend amount.',
          'error'
        );
        return;
      }
      payload.dividendAmount = this.dividendAmount;
    }

    this.isLoading = true;
    this.corporateActionService.apply(email, payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.addNotification(
          'Corporate Action Applied',
          `Corporate action '${this.actionType.toUpperCase()}' applied successfully for ${this.stockCode.toUpperCase()}.`,
          'success'
        );
        this.actionApplied.emit();
        this.resetForm();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Corporate action error:', err);
        this.notificationService.addNotification(
          'Application Failed',
          `Failed to apply '${this.actionType.toUpperCase()}' action for stock ${this.stockCode.toUpperCase()}.`,
          'error'
        );
      },
    });
  }

  // Batch Perform Action fields
  performMonth = 'OCTOBER';
  performYear = 2025;
  performBroker = 'ZERODHA';
  isPerforming = false;

  months = [
    { label: 'January', value: 'JANUARY' },
    { label: 'February', value: 'FEBRUARY' },
    { label: 'March', value: 'MARCH' },
    { label: 'April', value: 'APRIL' },
    { label: 'May', value: 'MAY' },
    { label: 'June', value: 'JUNE' },
    { label: 'July', value: 'JULY' },
    { label: 'August', value: 'AUGUST' },
    { label: 'September', value: 'SEPTEMBER' },
    { label: 'October', value: 'OCTOBER' },
    { label: 'November', value: 'NOVEMBER' },
    { label: 'December', value: 'DECEMBER' }
  ];

  brokers = [
    { label: 'Zerodha', value: 'ZERODHA' },
    { label: 'Groww', value: 'GROWW' },
    { label: 'Upstox', value: 'UPSTOX' },
    { label: 'Angel One', value: 'ANGEL_ONE' }
  ];

  performActions(): void {
    const email = this.userEmail || this.authService.getUserEmail();
    if (!email) {
      this.notificationService.addNotification(
        'Authentication Required',
        'You need to be signed in to perform corporate actions.',
        'error'
      );
      return;
    }

    if (!this.performMonth) {
      this.notificationService.addNotification(
        'Validation Error',
        'Please select a month.',
        'error'
      );
      return;
    }

    if (!this.performYear || this.performYear < 2000 || this.performYear > 2100) {
      this.notificationService.addNotification(
        'Validation Error',
        'Please enter a valid year.',
        'error'
      );
      return;
    }

    if (!this.performBroker.trim()) {
      this.notificationService.addNotification(
        'Validation Error',
        'Please select or enter a broker name.',
        'error'
      );
      return;
    }

    const payload = {
      month: this.performMonth,
      year: Number(this.performYear),
      brokerName: this.performBroker.trim().toUpperCase(),
    };

    this.isPerforming = true;
    this.corporateActionService.performCorporateAction(email, payload).subscribe({
      next: () => {
        this.isPerforming = false;
        this.notificationService.addNotification(
          'Batch Actions Performed',
          `Corporate actions batch performed successfully for ${this.performMonth} ${this.performYear} (Broker: ${this.performBroker.toUpperCase()}).`,
          'success'
        );
        this.actionApplied.emit();
      },
      error: (err) => {
        this.isPerforming = false;
        console.error('Batch perform corporate actions failed:', err);
        this.notificationService.addNotification(
          'Batch Actions Failed',
          `Failed to perform corporate actions batch for ${this.performMonth} ${this.performYear}.`,
          'error'
        );
      },
    });
  }

  resetForm(): void {
    this.stockCode = '';
    this.ratio = '';
    this.dividendAmount = null;
  }
}
