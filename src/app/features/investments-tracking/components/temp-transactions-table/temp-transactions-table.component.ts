import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '@services/notification.service';
import { TransactionsResponse } from '@models/transactions-response.model';
import { TransactionService } from '@services/transaction.service';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '@services/auth.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-temp-transactions-table',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
    TooltipDirective,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
  ],
  templateUrl: './temp-transactions-table.component.html',
})
export class TempTransactionsTableComponent implements OnInit {
  @Input() userEmail = '';
  @Output() actionApplied = new EventEmitter<void>();

  private transactionService = inject(TransactionService);
  private corporateActionService = inject(CorporateActionService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  transactions: TransactionsResponse[] = [];
  loading = false;

  // Batch Perform Action fields
  actionType = 'bonus';
  performMonth = 'OCTOBER';
  performYear = 2025;
  performBroker = 'ZERODHA';
  isPerforming = false;

  actionOptions = [
    { label: 'Bonus Issue', value: 'bonus' },
    { label: 'Stock Split', value: 'split' },
    { label: 'Dividend Payment', value: 'dividend' },
    { label: 'Merger/Acquisition', value: 'merger' },
  ];

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

  // Dynamic UI Helpers
  getDynamicIcon(type: string): string {
    switch (type) {
      case 'bonus': return 'gift';
      case 'split': return 'scissors';
      case 'dividend': return 'coins';
      case 'merger': return 'git-merge';
      default: return 'zap';
    }
  }

  getDynamicIconColor(type: string): string {
    switch (type) {
      case 'bonus': return 'text-yellow-500';
      case 'split': return 'text-cyan-400';
      case 'dividend': return 'text-green-500';
      case 'merger': return 'text-orange-500';
      default: return 'text-[#EAB308]';
    }
  }

  getDynamicDescription(type: string): string {
    switch (type) {
      case 'bonus': return 'Trigger automated processing of bonus issues for a specific month, year, and broker.';
      case 'split': return 'Trigger automated processing of stock splits for a specific month, year, and broker.';
      case 'dividend': return 'Trigger automated processing of dividend payments for a specific month, year, and broker.';
      case 'merger': return 'Trigger automated processing of mergers & acquisitions for a specific month, year, and broker.';
      default: return 'Trigger automated processing of corporate actions for a specific month, year, and broker.';
    }
  }

  getDynamicButtonText(type: string): string {
    switch (type) {
      case 'bonus': return 'Perform Bonus Actions';
      case 'split': return 'Perform Split Actions';
      case 'dividend': return 'Perform Dividend Actions';
      case 'merger': return 'Perform Merger Actions';
      default: return 'Perform Batch Actions';
    }
  }

  getDynamicButtonClass(type: string): string {
    switch (type) {
      case 'bonus': return 'bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-black hover:brightness-110';
      case 'split': return 'bg-gradient-to-r from-[#22D3EE] to-[#06B6D4] text-black hover:brightness-110';
      case 'dividend': return 'bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black hover:brightness-110';
      case 'merger': return 'bg-gradient-to-r from-[#FB923C] to-[#F97316] text-white hover:brightness-110';
      default: return 'bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-black hover:brightness-110';
    }
  }

  ngOnInit(): void {
    this.loadTransactions();
  }

  refresh(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    if (!this.userEmail) return;
    this.loading = true;
    this.transactionService.getTemporaryTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.transactions = data.map((t, i) => ({
          ...t,
          rowId: t.rowId || `temp-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`,
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.notificationService.addNotification(
          'Error',
          'Failed to load temporary transactions',
          'error'
        );
        this.cdr.detectChanges();
      },
    });
  }

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

    // Map UI actionType value to API types if backend requires uppercase
    const mappedActionType = this.actionType === 'split' ? 'STOCK_SPLIT' : this.actionType.toUpperCase();

    const payload = {
      actionType: mappedActionType,
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
          `Corporate actions (${this.actionType.toUpperCase()}) batch performed successfully for ${this.performMonth} ${this.performYear} (Broker: ${this.performBroker.toUpperCase()}).`,
          'success'
        );
        this.actionApplied.emit();
        this.loadTransactions();
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
}
