import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { TransactionService } from '@services/transaction.service';
import { TransactionsResponse } from '@models/transactions-response.model';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import {
  PortfolioAnalyticsService,
  SummaryStats,
  HoldingRow,
  InsightItem,
} from '@core/services/portfolio-analytics.service';
import { NotificationService } from '@services/notification.service';

type ViewMode = 'split' | 'temp' | 'port';
type ActiveTab = 'transactions' | 'holdings' | 'insights';
type TypeFilter = 'ALL' | 'BUY' | 'SELL';
type DatePreset = 'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom';

interface FilterChip {
  kind: 'search' | 'type' | 'asset' | 'broker' | 'date';
  label: string;
  value?: string;
}

interface ColumnDef {
  key: 'stock' | 'type' | 'qty' | 'price' | 'total' | 'date' | 'broker' | 'exchange' | 'asset' | 'charges';
  label: string;
}

@Component({
    selector: 'app-transactions-table',
    standalone: true,
    imports: [
        CommonModule,
        DecimalPipe,
        FormsModule,
        LucideIconsModule,
        ExpansionPanelComponent,
        PrimeNgModule,
        TooltipDirective,
    ],
    templateUrl: './transactions-table.component.html',
    styleUrls: ['./transactions-table.component.css']
})
export class TransactionsTableComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private notificationService = inject(NotificationService);
  private analytics = inject(PortfolioAnalyticsService);
  private cdr = inject(ChangeDetectorRef);

  // ----- view / tab state -----
  viewMode: ViewMode = 'split';
  activeTab: ActiveTab = 'transactions';

  // ----- raw data -----
  temporaryTransactions: TransactionsResponse[] = [];
  portfolioTransactions: TransactionsResponse[] = [];

  // ----- derived / filtered -----
  filteredTemporary: TransactionsResponse[] = [];
  filteredPortfolio: TransactionsResponse[] = [];
  filteredAll: TransactionsResponse[] = [];

  // ----- expansion -----
  expandedTempRows: { [key: string]: boolean } = {};
  expandedPortfolioRows: { [key: string]: boolean } = {};

  // ----- pagination -----
  rowsTemp = 5;
  rowsPortfolio = 5;
  firstTemp = 0;
  firstPort = 0;

  get lastTemp(): number {
    if (this.filteredTemporary.length === 0) return 0;
    return Math.min(this.firstTemp + this.rowsTemp, this.filteredTemporary.length);
  }

  get lastPort(): number {
    if (this.filteredPortfolio.length === 0) return 0;
    return Math.min(this.firstPort + this.rowsPortfolio, this.filteredPortfolio.length);
  }

  get filteredOutTemp(): number {
    return Math.max(0, this.temporaryTransactions.length - this.filteredTemporary.length);
  }

  get filteredOutPort(): number {
    return Math.max(0, this.portfolioTransactions.length - this.filteredPortfolio.length);
  }

  onTempPage(event: { first: number; rows: number }): void {
    this.firstTemp = event.first;
    this.rowsTemp = event.rows;
  }

  onPortPage(event: { first: number; rows: number }): void {
    this.firstPort = event.first;
    this.rowsPortfolio = event.rows;
  }

  // ----- loading -----
  loadingTemp = false;
  loadingPortfolio = false;
  usingMockTemp = false;
  usingMockPort = false;
  userEmail = '';

  // ----- filter state -----
  searchQuery = '';
  filterType: TypeFilter = 'ALL';
  filterAssetType: string | null = null;
  filterBroker: string | null = null;
  filterDatePreset: DatePreset = 'all';
  filterDateFrom: string | null = null;
  filterDateTo: string | null = null;

  // ----- derived -----
  stats: SummaryStats = {
    count: 0,
    totalInvested: 0,
    totalSold: 0,
    netInvested: 0,
    totalCharges: 0,
    topStock: null,
  };
  holdings: HoldingRow[] = [];
  insights: InsightItem[] = [];
  activeFilterChips: FilterChip[] = [];

  availableAssetTypes: string[] = [];
  availableBrokers: string[] = [];

  // ----- column visibility -----
  visibleColumns: Record<ColumnDef['key'], boolean> = {
    stock: true, type: true, qty: true, price: true, total: true,
    date: true, broker: true, exchange: true, asset: true, charges: true,
  };
  readonly columnDefs: ColumnDef[] = [
    { key: 'stock', label: 'Stock' },
    { key: 'type', label: 'Type' },
    { key: 'qty', label: 'Qty' },
    { key: 'price', label: 'Price' },
    { key: 'total', label: 'Total' },
    { key: 'date', label: 'Date' },
    { key: 'broker', label: 'Broker' },
    { key: 'exchange', label: 'Exchange' },
    { key: 'asset', label: 'Asset' },
    { key: 'charges', label: 'Charges' },
  ];
  showColumnMenu = false;

  // ----- dropdown options -----
  readonly datePresetOptions = [
    { label: 'All time', value: 'all' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'This year', value: 'ytd' },
    { label: 'Custom range', value: 'custom' },
  ];

  ngOnInit(): void {
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.loadTemporaryTransactions();
    this.loadPortfolioTransactions();
    this.loadHoldingsFromApi();
  }

  refresh(): void {
    this.usingMockTemp = false;
    this.usingMockPort = false;
    this.loadTemporaryTransactions();
    this.loadPortfolioTransactions();
    this.loadHoldingsFromApi();
  }

  /** TEMPORARY */
  loadTemporaryTransactions(): void {
    this.loadingTemp = true;
    this.transactionService.getTemporaryTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.temporaryTransactions = data.map((t, i) => ({
          ...t,
          rowId: t.id || `temp-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`,
        }));
        this.loadingTemp = false;
        this.usingMockTemp = false;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingTemp = false;
        this.usingMockTemp = true;
        this.temporaryTransactions = Array.from({ length: 3 }, (_, i) => ({
          id: i + 100,
          rowId: `temp-${i}`,
          email: 'test@gmail.com',
          stockName: `Mock Temp Stock ${i + 1}`,
          stockCode: `MOCKT${i + 1}`,
          assetType: 'MUTUAL_FUND',
          exchangeName: 'NSE',
          brokerName: 'Groww',
          quantity: 5 * (i + 1),
          transactionType: 'BUY',
          price: 150 * (i + 1),
          totalValue: 150 * 5 * (i + 1) * (i + 1),
          transactionDate: '2023-09-10',
        }));
        this.notificationService.addNotification(
          'Error',
          'Failed to load temporary transactions',
          'error'
        );
        this.applyFilters();
        this.cdr.detectChanges();
      },
    });
  }

  /** CURRENT / PORTFOLIO */
  loadPortfolioTransactions(): void {
    this.loadingPortfolio = true;
    const apiFilters = this.buildApiFilters();
    this.transactionService.getCurrentTransactions(this.userEmail, apiFilters).subscribe({
      next: (data) => {
        this.portfolioTransactions = data.map((t, i) => ({
          ...t,
          rowId: t.id || `port-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`,
        }));
        this.loadingPortfolio = false;
        this.usingMockPort = false;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingPortfolio = false;
        this.usingMockPort = true;
        this.portfolioTransactions = Array.from({ length: 19 }, (_, i) => ({
          id: i,
          rowId: `port-${i}`,
          email: 'test@gmail.com',
          stockName: i % 2 === 0 ? 'QUANT SMALL CAP FUND - DIRECT' : 'SBI BLUECHIP FUND - DIRECT',
          stockCode: i % 2 === 0 ? 'QUANT_SMALL' : 'SBI_BLUE',
          assetType: 'MUTUAL_FUND',
          exchangeName: 'NSE',
          brokerName: 'Groww',
          quantity: 5 + i * 0.1,
          transactionType: 'BUY',
          price: 195.76,
          totalValue: 1000 + i * 100,
          transactionDate: '2023-09-01',
        }));
        this.notificationService.addNotification(
          'Error',
          'Failed to load current transactions',
          'error'
        );
        this.applyFilters();
        this.cdr.detectChanges();
      },
    });
  }

  /** HOLDINGS API */
  loadHoldingsFromApi(): void {
    this.transactionService.getAllHoldings(this.userEmail).subscribe({
      next: (res) => {
        console.log('Holdings API response:', res);
        const data = Array.isArray(res) ? res : (res?.data || res?.content || []);
        let totalAllInvested = 0;
        this.holdings = data.map((d: any) => {
          totalAllInvested += d.totalValue || 0;
          return {
            stockCode: d.stockCode,
            stockName: d.stockName,
            assetType: d.assetType,
            totalBought: d.totalQuantity || 0, // Using totalQuantity as bought assuming net is quantity
            totalSold: (d.totalQuantity || 0) - (d.quantity || 0),
            netHeld: d.quantity || 0,
            totalInvested: d.totalValue || 0,
            totalSoldValue: 0,
            netInvested: d.totalValue || 0,
            txnCount: (d.buyTransactionIds?.length || 0) + (d.sellTransactionIds?.length || 0) || Object.keys(d.transactionQuantities || {}).length,
            firstDate: '',
            lastDate: '',
            avgPrice: d.price || 0,
            totalCharges: (d.brokerCharges || 0) + (d.miscCharges || 0),
            sharePercent: 0
          };
        });
        
        if (totalAllInvested > 0) {
          this.holdings.forEach(h => {
            h.sharePercent = (h.totalInvested / totalAllInvested) * 100;
          });
        }
        
        this.holdings.sort((a, b) => b.totalInvested - a.totalInvested);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load holdings from API', err)
    });
  }

  // ============================================================
  // FILTERS
  // ============================================================
  private buildApiFilters(): any[] {
    const filters: any[] = [];

    // Removed searchQuery from API payload as requested (frontend-only search)

    if (this.filterType && this.filterType !== 'ALL') {
      filters.push({
        filterKey: 'transaction_type',
        operation: 'EQUALS',
        value: this.filterType,
        logicalOperation: 'AND',
        expressionLogicalOperation: 'AND',
        allowEmptyOrNull: false,
        caseSensitive: false,
        isDateField: false
      });
    }

    if (this.filterAssetType) {
      filters.push({
        filterKey: 'asset_type',
        operation: 'EQUALS',
        value: this.filterAssetType,
        logicalOperation: 'AND',
        expressionLogicalOperation: 'AND',
        allowEmptyOrNull: false,
        caseSensitive: false,
        isDateField: false
      });
    }

    if (this.filterBroker) {
      filters.push({
        filterKey: 'broker_name',
        operation: 'EQUALS',
        value: this.filterBroker,
        logicalOperation: 'AND',
        expressionLogicalOperation: 'AND',
        allowEmptyOrNull: false,
        caseSensitive: false,
        isDateField: false
      });
    }

    const { from, to } = this.getDateRange();
    if (from) {
      const fromStr = from.toISOString().split('T')[0];
      filters.push({
        filterKey: 'transaction_date',
        operation: 'GREATER_THAN',
        value: fromStr,
        logicalOperation: 'AND',
        expressionLogicalOperation: 'AND',
        allowEmptyOrNull: false,
        caseSensitive: false,
        isDateField: true
      });
    }
    if (to) {
      const toStr = to.toISOString().split('T')[0];
      filters.push({
        filterKey: 'transaction_date',
        operation: 'LESSER_THAN',
        value: toStr,
        logicalOperation: 'AND',
        expressionLogicalOperation: 'AND',
        allowEmptyOrNull: false,
        caseSensitive: false,
        isDateField: true
      });
    }

    return filters;
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();
    const { from, to } = this.getDateRange();

    const matches = (t: TransactionsResponse): boolean => {
      if (q) {
        const haystack = [
          t.stockName, t.stockCode, t.exchangeName, t.brokerName, t.assetType, t.transactionType,
        ].map((v) => (v || '').toLowerCase()).join(' ');
        if (!haystack.includes(q)) return false;
      }
      if (this.filterType && this.filterType !== 'ALL' && t.transactionType !== this.filterType) {
        return false;
      }
      if (this.filterAssetType && t.assetType !== this.filterAssetType) {
        return false;
      }
      if (this.filterBroker && t.brokerName !== this.filterBroker) {
        return false;
      }
      if (!this.inDateRange(t.transactionDate, from, to)) {
        return false;
      }
      return true;
    };

    this.filteredTemporary = this.temporaryTransactions.filter(matches);
    this.filteredPortfolio = this.portfolioTransactions.filter(matches);
    this.filteredAll = [...this.filteredTemporary, ...this.filteredPortfolio];

    this.stats = this.computeStats(this.filteredAll);
    this.insights = this.computeInsights(this.filteredAll, this.stats);

    this.availableAssetTypes = this.uniqueSorted([
      ...this.temporaryTransactions.map((t) => t.assetType),
      ...this.portfolioTransactions.map((t) => t.assetType),
    ]);
    this.availableBrokers = this.uniqueSorted([
      ...this.temporaryTransactions.map((t) => t.brokerName),
      ...this.portfolioTransactions.map((t) => t.brokerName),
    ]);

    this.activeFilterChips = [];
    if (this.searchQuery) {
      this.activeFilterChips.push({ kind: 'search', label: `Search: "${this.searchQuery}"` });
    }
    if (this.filterType !== 'ALL') {
      this.activeFilterChips.push({ kind: 'type', label: `Type: ${this.filterType}` });
    }
    if (this.filterAssetType) {
      this.activeFilterChips.push({ kind: 'asset', label: `Asset: ${this.filterAssetType}`, value: this.filterAssetType });
    }
    if (this.filterBroker) {
      this.activeFilterChips.push({ kind: 'broker', label: `Broker: ${this.filterBroker}`, value: this.filterBroker });
    }
    if (this.filterDatePreset !== 'all') {
      const opt = this.datePresetOptions.find((o) => o.value === this.filterDatePreset);
      const label = this.filterDatePreset === 'custom'
        ? `Date: ${this.filterDateFrom || '...'} → ${this.filterDateTo || '...'}`
        : `Date: ${opt?.label ?? this.filterDatePreset}`;
      this.activeFilterChips.push({ kind: 'date', label });
    }
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterType = 'ALL';
    this.filterAssetType = null;
    this.filterBroker = null;
    this.filterDatePreset = 'all';
    this.filterDateFrom = null;
    this.filterDateTo = null;
    this.refresh();
  }

  hasActiveFilters(): boolean {
    return this.activeFilterChips.length > 0;
  }

  removeFilterChip(chip: FilterChip): void {
    switch (chip.kind) {
      case 'search': 
        this.searchQuery = ''; 
        this.applyFilters();
        return;
      case 'type': this.filterType = 'ALL'; break;
      case 'asset': this.filterAssetType = null; break;
      case 'broker': this.filterBroker = null; break;
      case 'date':
        this.filterDatePreset = 'all';
        this.filterDateFrom = null;
        this.filterDateTo = null;
        break;
    }
    this.refresh();
  }

  setTypeFilter(t: TypeFilter): void { this.filterType = t; this.refresh(); }
  setAssetType(a: string | null): void { this.filterAssetType = a; this.refresh(); }
  setBroker(b: string | null): void { this.filterBroker = b; this.refresh(); }
  setDatePreset(p: DatePreset): void { this.filterDatePreset = p; this.refresh(); }
  onSearchChange(): void { this.applyFilters(); } // Search remains frontend-only
  onDateFromChange(): void { this.refresh(); }
  onDateToChange(): void { this.refresh(); }

  toggleColumn(col: ColumnDef['key']): void {
    this.visibleColumns[col] = !this.visibleColumns[col];
  }

  // ============================================================
  // PER-ROW QUICK ACTIONS
  // ============================================================
  filterByStock(stockCode: string): void {
    this.searchQuery = stockCode;
    this.applyFilters();
    this.notificationService.addNotification('Filter applied', `Filtered by stock ${stockCode}`, 'info');
  }

  filterByBroker(brokerName: string): void {
    this.filterBroker = brokerName;
    this.applyFilters();
    this.notificationService.addNotification('Filter applied', `Filtered by broker ${brokerName}`, 'info');
  }

  filterByDate(date: string): void {
    this.filterDatePreset = 'custom';
    this.filterDateFrom = date;
    this.filterDateTo = date;
    this.applyFilters();
    this.notificationService.addNotification('Filter applied', `Filtered to ${date}`, 'info');
  }

  copyTransaction(t: TransactionsResponse): void {
    const text = `${t.stockName} (${t.stockCode}) | ${t.transactionType} | qty ${t.quantity} | ₹${t.price} | ${t.transactionDate}`;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(
          () => this.notificationService.addNotification('Copied', 'Transaction details copied to clipboard', 'success'),
          () => this.notificationService.addNotification('Copied', text, 'info'),
        );
      } else {
        this.notificationService.addNotification('Copied', text, 'info');
      }
    } catch {
      this.notificationService.addNotification('Copied', text, 'info');
    }
  }

  // ============================================================
  // EXPORT
  // ============================================================
  exportCsv(): void {
    const csv = this.toCsv(this.filteredAll);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `transactions_${this.userEmail || 'user'}_${this.todayStr()}.csv`);
    this.notificationService.addNotification('Export', `Exported ${this.filteredAll.length} rows to CSV`, 'success');
  }

  exportExcel(): void {
    const rows = this.filteredAll.map((t) => ({
      Stock: t.stockName,
      Code: t.stockCode,
      Type: t.transactionType,
      Quantity: t.quantity,
      Price: t.price,
      Total: t.totalValue,
      Date: t.transactionDate,
      Broker: t.brokerName,
      Exchange: t.exchangeName,
      AssetType: t.assetType,
      BrokerCharges: t.brokerCharges || 0,
      MiscCharges: t.miscCharges || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `transactions_${this.userEmail || 'user'}_${this.todayStr()}.xlsx`);
    this.notificationService.addNotification('Export', `Exported ${rows.length} rows to Excel`, 'success');
  }

  // ============================================================
  // HELPERS (public for testability)
  // ============================================================
  toCsv(rows: TransactionsResponse[]): string {
    const headers = [
      'Stock', 'Code', 'Type', 'Quantity', 'Price', 'Total', 'Date',
      'Broker', 'Exchange', 'AssetType', 'BrokerCharges', 'MiscCharges',
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      const cells = [
        r.stockName, r.stockCode, r.transactionType, r.quantity, r.price, r.totalValue,
        r.transactionDate, r.brokerName, r.exchangeName, r.assetType,
        r.brokerCharges ?? 0, r.miscCharges ?? 0,
      ].map((v) => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      });
      lines.push(cells.join(','));
    }
    return lines.join('\n');
  }

  computeStats(rows: TransactionsResponse[]): SummaryStats {
    return this.analytics.computeStats(rows);
  }

  computeHoldings(rows: TransactionsResponse[]): HoldingRow[] {
    return this.analytics.computeHoldings(rows);
  }

  computeInsights(rows: TransactionsResponse[], stats: SummaryStats): InsightItem[] {
    return this.analytics.computeInsights(rows, stats);
  }

  inDateRange(date: string, from: Date | null, to: Date | null): boolean {
    if (!date) return !from && !to;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  uniqueSorted(values: string[]): string[] {
    return Array.from(new Set(values.filter((v) => v != null && v !== ''))).sort();
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

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
