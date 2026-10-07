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
import { finalize } from 'rxjs/operators';
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
import { AlertComponent, AlertTone } from '@shared/ui/alert/alert.component';
import { RedriveResult } from '@models/redrive-result.model';
import { BrokerName } from '@models/corporate-action.model';

type BrokerChoice = BrokerName | 'ALL';

const QUARTERS = [
  { label: 'Q1 · Jan – Mar', value: 'JANUARY', range: ['Jan', 'Mar'] },
  { label: 'Q2 · Apr – Jun', value: 'APRIL', range: ['Apr', 'Jun'] },
  { label: 'Q3 · Jul – Sep', value: 'JULY', range: ['Jul', 'Sep'] },
  { label: 'Q4 · Oct – Dec', value: 'OCTOBER', range: ['Oct', 'Dec'] },
];

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
    AlertComponent,
  ],
  templateUrl: './temp-transactions-table.component.html',
})
export class TempTransactionsTableComponent implements OnInit {
  @Input() userEmail = '';
  /** Holdings changed (corporate actions applied or transactions redriven) */
  @Output() actionApplied = new EventEmitter<void>();
  /** Number of temporary rows still waiting for review, emitted after each load */
  @Output() countChange = new EventEmitter<number>();
  /** User asked to see the corporate actions registry */
  @Output() viewActions = new EventEmitter<void>();

  private transactionService = inject(TransactionService);
  private corporateActionService = inject(CorporateActionService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  transactions: TransactionsResponse[] = [];
  loading = false;
  loadError: string | null = null;

  // Step 1: apply corporate actions for a quarter
  quarters = QUARTERS;
  performMonth = QUARTERS[Math.floor(new Date().getMonth() / 3)].value;
  performYear = new Date().getFullYear();
  performBroker: BrokerChoice = 'ALL';
  isPerforming = false;
  performOutcome: { tone: AlertTone; title: string; message: string } | null = null;

  // Step 2: redrive held transactions
  isRedriving = false;
  redriveResult: RedriveResult | null = null;
  redriveError: string | null = null;

  years = Array.from({ length: new Date().getFullYear() - 2014 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { label: String(year), value: year };
  });

  brokers: { label: string; value: BrokerChoice }[] = [
    { label: 'All brokers', value: 'ALL' },
    { label: 'Zerodha', value: 'ZERODHA' },
    { label: 'Upstox', value: 'UPSTOX' },
    { label: 'Fyers', value: 'FYERS' },
  ];

  ngOnInit(): void {
    this.loadTransactions();
  }

  refresh(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    if (!this.userEmail) return;
    this.loading = true;
    this.loadError = null;
    this.transactionService
      .getTemporaryTransactions(this.userEmail)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.transactions = (data || []).map((t, i) => ({
            ...t,
            rowId: t.rowId || `temp-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`,
          }));
          this.countChange.emit(this.transactions.length);
        },
        error: (err) => {
          this.loadError = this.errorMessage(err, 'Pending transactions could not be loaded.');
        },
      });
  }

  get quarterLabel(): string {
    const q = QUARTERS.find((x) => x.value === this.performMonth);
    return q ? `${q.range[0]} – ${q.range[1]} ${this.performYear}` : '';
  }

  get brokerLabel(): string {
    return this.brokers.find((b) => b.value === this.performBroker)?.label ?? '';
  }

  performActions(): void {
    const email = this.currentEmail();
    if (!email) return;

    const allBrokers = this.performBroker === 'ALL';
    const payload = {
      month: this.performMonth,
      year: Number(this.performYear),
      brokerName: allBrokers ? undefined : (this.performBroker as BrokerName),
    };
    const scope = `${this.quarterLabel} · ${this.brokerLabel}`;

    this.isPerforming = true;
    this.performOutcome = null;
    this.corporateActionService
      .performBatchCorporateActions(email, payload, allBrokers)
      .pipe(
        finalize(() => {
          this.isPerforming = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.performOutcome = {
            tone: 'success',
            title: 'Corporate actions applied',
            message: this.transactions.length
              ? `Holdings adjusted for ${scope}. Redrive the pending transactions next.`
              : `Holdings adjusted for ${scope}.`,
          };
          this.actionApplied.emit();
          this.loadTransactions();
        },
        error: (err) => {
          this.performOutcome = {
            tone: 'danger',
            title: 'Corporate actions were not applied',
            message: this.errorMessage(err, 'Check the quarter, year and broker, then try again.'),
          };
        },
      });
  }

  redriveTransactions(): void {
    const email = this.currentEmail();
    if (!email) return;

    this.isRedriving = true;
    this.redriveResult = null;
    this.redriveError = null;
    this.transactionService
      .redriveTemporaryTransactions(email)
      .pipe(
        finalize(() => {
          this.isRedriving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (result) => {
          this.redriveResult = result;
          if (result?.succeeded?.length) {
            this.actionApplied.emit();
          }
          this.loadTransactions();
        },
        error: (err) => {
          this.redriveError = this.errorMessage(err, 'Pending transactions could not be redriven. Please try again.');
        },
      });
  }

  // Redrive result helpers

  get failedEntries(): { id: string; reason: string }[] {
    return Object.entries(this.redriveResult?.failed ?? {}).map(([id, reason]) => ({ id, reason }));
  }

  get redriveTone(): AlertTone {
    const r = this.redriveResult;
    if (!r) return 'info';
    const succeeded = r.succeeded?.length ?? 0;
    if (this.failedEntries.length) return succeeded ? 'warning' : 'danger';
    if (r.stillFiltered?.length) return 'warning';
    return succeeded ? 'success' : 'info';
  }

  get redriveTitle(): string {
    const succeeded = this.redriveResult?.succeeded?.length ?? 0;
    if (succeeded) {
      return `${succeeded} transaction${succeeded === 1 ? '' : 's'} moved to your portfolio`;
    }
    return 'No transactions were moved to your portfolio';
  }

  dismissPerformOutcome(): void {
    this.performOutcome = null;
  }

  dismissRedrive(): void {
    this.redriveResult = null;
    this.redriveError = null;
  }

  private currentEmail(): string {
    const email = this.userEmail || this.authService.getUserEmail();
    if (!email) {
      this.performOutcome = {
        tone: 'danger',
        title: 'Sign in required',
        message: 'You need to be signed in to change your holdings.',
      };
    }
    return email || '';
  }

  private errorMessage(err: any, fallback: string): string {
    const msg = err?.error?.message || (typeof err?.error === 'string' ? err.error : '') || err?.message;
    return msg || fallback;
  }
}
