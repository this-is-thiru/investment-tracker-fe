import {
  Component,
  Input,
  OnInit,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TransactionsResponse } from '../../../../models/TranscationsResponse';
import { TransactionService } from '../../../../services/transaction.service';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

type TypeFilter = 'ALL' | 'BUY' | 'SELL';
type DatePreset = 'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom';

@Component({
  selector: 'app-temp-transactions-table',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
  ],
  templateUrl: './temp-transactions-table.component.html',
  providers: [MessageService],
})
export class TempTransactionsTableComponent implements OnInit {
  @Input() userEmail = '';

  private transactionService = inject(TransactionService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  transactions: TransactionsResponse[] = [];
  filteredTransactions: TransactionsResponse[] = [];
  loading = false;

  searchQuery = '';
  filterType: TypeFilter = 'ALL';
  filterAssetType: string | null = null;
  filterBroker: string | null = null;
  filterDatePreset: DatePreset = 'all';
  filterDateFrom: string | null = null;
  filterDateTo: string | null = null;

  availableAssetTypes: string[] = [];
  availableBrokers: string[] = [];

  readonly datePresetOptions = [
    { label: 'All time', value: 'all' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'This year', value: 'ytd' },
    { label: 'Custom range', value: 'custom' },
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
    this.transactionService.getTemporaryTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.transactions = data.map((t, i) => ({
          ...t,
          rowId: t.rowId || `temp-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`,
        }));
        this.availableAssetTypes = this.uniqueSorted(
          this.transactions.map((t) => t.assetType),
        );
        this.availableBrokers = this.uniqueSorted(
          this.transactions.map((t) => t.brokerName),
        );
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load temporary transactions',
        });
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();
    const { from, to } = this.getDateRange();

    this.filteredTransactions = this.transactions.filter((t) => {
      if (q) {
        const haystack = [
          t.stockName,
          t.stockCode,
          t.exchangeName,
          t.brokerName,
          t.assetType,
          t.transactionType,
        ]
          .map((v) => (v || '').toLowerCase())
          .join(' ');
        if (!haystack.includes(q)) return false;
      }
      if (this.filterType !== 'ALL' && t.transactionType !== this.filterType) {
        return false;
      }
      if (this.filterAssetType && t.assetType !== this.filterAssetType) {
        return false;
      }
      if (this.filterBroker && t.brokerName !== this.filterBroker) {
        return false;
      }
      if (t.transactionDate && (from || to)) {
        const d = new Date(t.transactionDate);
        if (Number.isNaN(d.getTime())) return true;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterType = 'ALL';
    this.filterAssetType = null;
    this.filterBroker = null;
    this.filterDatePreset = 'all';
    this.filterDateFrom = null;
    this.filterDateTo = null;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchQuery ||
      this.filterType !== 'ALL' ||
      !!this.filterAssetType ||
      !!this.filterBroker ||
      this.filterDatePreset !== 'all'
    );
  }

  private getDateRange(): { from: Date | null; to: Date | null } {
    if (this.filterDatePreset === 'all') return { from: null, to: null };
    const now = new Date();
    if (this.filterDatePreset === '7d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 7);
      return { from, to: now };
    }
    if (this.filterDatePreset === '30d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 30);
      return { from, to: now };
    }
    if (this.filterDatePreset === '90d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 90);
      return { from, to: now };
    }
    if (this.filterDatePreset === 'ytd') {
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    }
    if (this.filterDatePreset === 'custom') {
      return {
        from: this.filterDateFrom ? new Date(this.filterDateFrom) : null,
        to: this.filterDateTo ? new Date(`${this.filterDateTo}T23:59:59`) : null,
      };
    }
    return { from: null, to: null };
  }

  private uniqueSorted(values: string[]): string[] {
    return Array.from(
      new Set(values.filter((v) => v != null && v !== '')),
    ).sort();
  }
}
