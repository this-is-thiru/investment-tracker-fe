import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';
import { TransactionService } from '../../../../services/transaction.service';
import { TransactionsResponse } from '../../../../models/TranscationsResponse';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

type ViewMode = 'split' | 'temp' | 'port';
type ActiveTab = 'transactions' | 'holdings' | 'insights';
type TypeFilter = 'ALL' | 'BUY' | 'SELL';
type DatePreset = 'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom';
type Tone = 'green' | 'red' | 'blue' | 'yellow' | 'purple';

interface SummaryStats {
  count: number;
  totalInvested: number;
  totalSold: number;
  netInvested: number;
  totalCharges: number;
  topStock: { name: string; code: string; count: number; totalValue: number } | null;
}

interface HoldingRow {
  stockCode: string;
  stockName: string;
  assetType: string;
  totalBought: number;
  totalSold: number;
  netHeld: number;
  totalInvested: number;
  totalSoldValue: number;
  netInvested: number;
  txnCount: number;
  firstDate: string;
  lastDate: string;
  avgPrice: number;
  totalCharges: number;
  sharePercent: number;
}

interface InsightItem {
  icon: string;
  title: string;
  detail: string;
  tone: Tone;
}

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
    ],
    templateUrl: './transactions-table.component.html',
    styleUrls: ['./transactions-table.component.css'],
    providers: [MessageService]
})
export class TransactionsTableComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private messageService = inject(MessageService);

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
  }

  refresh(): void {
    this.usingMockTemp = false;
    this.usingMockPort = false;
    this.loadTemporaryTransactions();
    this.loadPortfolioTransactions();
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
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load temporary transactions',
        });
        this.applyFilters();
      },
    });
  }

  /** CURRENT / PORTFOLIO */
  loadPortfolioTransactions(): void {
    this.loadingPortfolio = true;
    this.transactionService.getCurrentTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.portfolioTransactions = data.map((t, i) => ({
          ...t,
          rowId: t.id || `port-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`,
        }));
        this.loadingPortfolio = false;
        this.usingMockPort = false;
        this.applyFilters();
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
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load current transactions',
        });
        this.applyFilters();
      },
    });
  }

  // ============================================================
  // FILTERS
  // ============================================================
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
      if (this.filterType !== 'ALL' && t.transactionType !== this.filterType) return false;
      if (this.filterAssetType && t.assetType !== this.filterAssetType) return false;
      if (this.filterBroker && t.brokerName !== this.filterBroker) return false;
      if ((from || to) && !this.inDateRange(t.transactionDate, from, to)) return false;
      return true;
    };

    this.filteredTemporary = this.temporaryTransactions.filter(matches);
    this.filteredPortfolio = this.portfolioTransactions.filter(matches);
    this.filteredAll = [...this.filteredTemporary, ...this.filteredPortfolio];

    this.stats = this.computeStats(this.filteredAll);
    this.holdings = this.computeHoldings(this.filteredAll);
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
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return this.activeFilterChips.length > 0;
  }

  removeFilterChip(chip: FilterChip): void {
    switch (chip.kind) {
      case 'search': this.searchQuery = ''; break;
      case 'type': this.filterType = 'ALL'; break;
      case 'asset': this.filterAssetType = null; break;
      case 'broker': this.filterBroker = null; break;
      case 'date':
        this.filterDatePreset = 'all';
        this.filterDateFrom = null;
        this.filterDateTo = null;
        break;
    }
    this.applyFilters();
  }

  setTypeFilter(t: TypeFilter): void { this.filterType = t; this.applyFilters(); }
  setAssetType(a: string | null): void { this.filterAssetType = a; this.applyFilters(); }
  setBroker(b: string | null): void { this.filterBroker = b; this.applyFilters(); }
  setDatePreset(p: DatePreset): void { this.filterDatePreset = p; this.applyFilters(); }
  onSearchChange(): void { this.applyFilters(); }
  onDateFromChange(): void { this.applyFilters(); }
  onDateToChange(): void { this.applyFilters(); }

  toggleColumn(col: ColumnDef['key']): void {
    this.visibleColumns[col] = !this.visibleColumns[col];
  }

  // ============================================================
  // PER-ROW QUICK ACTIONS
  // ============================================================
  filterByStock(stockCode: string): void {
    this.searchQuery = stockCode;
    this.applyFilters();
    this.messageService.add({ severity: 'info', summary: 'Filter applied', detail: `Filtered by stock ${stockCode}` });
  }

  filterByBroker(brokerName: string): void {
    this.filterBroker = brokerName;
    this.applyFilters();
    this.messageService.add({ severity: 'info', summary: 'Filter applied', detail: `Filtered by broker ${brokerName}` });
  }

  filterByDate(date: string): void {
    this.filterDatePreset = 'custom';
    this.filterDateFrom = date;
    this.filterDateTo = date;
    this.applyFilters();
    this.messageService.add({ severity: 'info', summary: 'Filter applied', detail: `Filtered to ${date}` });
  }

  copyTransaction(t: TransactionsResponse): void {
    const text = `${t.stockName} (${t.stockCode}) | ${t.transactionType} | qty ${t.quantity} | ₹${t.price} | ${t.transactionDate}`;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(
          () => this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'Transaction details copied to clipboard' }),
          () => this.messageService.add({ severity: 'info', summary: 'Copied', detail: text }),
        );
      } else {
        this.messageService.add({ severity: 'info', summary: 'Copied', detail: text });
      }
    } catch {
      this.messageService.add({ severity: 'info', summary: 'Copied', detail: text });
    }
  }

  // ============================================================
  // EXPORT
  // ============================================================
  exportCsv(): void {
    const csv = this.toCsv(this.filteredAll);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `transactions_${this.userEmail || 'user'}_${this.todayStr()}.csv`);
    this.messageService.add({ severity: 'success', summary: 'Export', detail: `Exported ${this.filteredAll.length} rows to CSV` });
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
    this.messageService.add({ severity: 'success', summary: 'Export', detail: `Exported ${rows.length} rows to Excel` });
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
    const count = rows.length;
    let totalInvested = 0;
    let totalSold = 0;
    let totalCharges = 0;
    const stockCounts = new Map<string, { name: string; code: string; count: number; totalValue: number }>();
    for (const r of rows) {
      totalCharges += (r.brokerCharges || 0) + (r.miscCharges || 0);
      if (r.transactionType === 'BUY') totalInvested += r.totalValue || 0;
      else if (r.transactionType === 'SELL') totalSold += r.totalValue || 0;
      const key = r.stockCode || r.stockName || 'unknown';
      const existing = stockCounts.get(key);
      if (existing) {
        existing.count += 1;
        existing.totalValue += r.totalValue || 0;
      } else {
        stockCounts.set(key, { name: r.stockName, code: r.stockCode, count: 1, totalValue: r.totalValue || 0 });
      }
    }
    let topStock: SummaryStats['topStock'] = null;
    for (const v of stockCounts.values()) {
      if (!topStock || v.count > topStock.count) topStock = v;
    }
    return {
      count,
      totalInvested,
      totalSold,
      netInvested: totalInvested - totalSold,
      totalCharges,
      topStock,
    };
  }

  computeHoldings(rows: TransactionsResponse[]): HoldingRow[] {
    const map = new Map<string, HoldingRow>();
    let totalAllInvested = 0;
    for (const r of rows) {
      const key = r.stockCode || r.stockName || 'unknown';
      let h = map.get(key);
      if (!h) {
        h = {
          stockCode: r.stockCode,
          stockName: r.stockName,
          assetType: r.assetType,
          totalBought: 0,
          totalSold: 0,
          netHeld: 0,
          totalInvested: 0,
          totalSoldValue: 0,
          netInvested: 0,
          txnCount: 0,
          firstDate: r.transactionDate,
          lastDate: r.transactionDate,
          avgPrice: 0,
          totalCharges: 0,
          sharePercent: 0,
        };
        map.set(key, h);
      }
      h.txnCount += 1;
      const qty = r.quantity || 0;
      const value = r.totalValue || 0;
      if (r.transactionType === 'BUY') {
        h.totalBought += qty;
        h.totalInvested += value;
      } else if (r.transactionType === 'SELL') {
        h.totalSold += qty;
        h.totalSoldValue += value;
      }
      h.netHeld = h.totalBought - h.totalSold;
      h.netInvested = h.totalInvested - h.totalSoldValue;
      h.totalCharges += (r.brokerCharges || 0) + (r.miscCharges || 0);
      if (r.transactionDate) {
        if (!h.firstDate || r.transactionDate < h.firstDate) h.firstDate = r.transactionDate;
        if (!h.lastDate || r.transactionDate > h.lastDate) h.lastDate = r.transactionDate;
      }
      totalAllInvested += value;
    }
    for (const h of map.values()) {
      h.avgPrice = h.totalBought > 0 ? h.totalInvested / h.totalBought : 0;
      h.sharePercent = totalAllInvested > 0 ? (h.totalInvested / totalAllInvested) * 100 : 0;
    }
    return Array.from(map.values()).sort((a, b) => b.totalInvested - a.totalInvested);
  }

  computeInsights(rows: TransactionsResponse[], stats: SummaryStats): InsightItem[] {
    const out: InsightItem[] = [];
    if (rows.length === 0) return out;

    // Biggest broker by transaction count
    const brokerCounts = new Map<string, { count: number; totalValue: number }>();
    for (const r of rows) {
      const key = r.brokerName || 'Unknown';
      const existing = brokerCounts.get(key);
      if (existing) { existing.count += 1; existing.totalValue += r.totalValue || 0; }
      else brokerCounts.set(key, { count: 1, totalValue: r.totalValue || 0 });
    }
    let biggestBroker: { name: string; count: number; totalValue: number } | null = null;
    for (const [name, v] of brokerCounts.entries()) {
      if (!biggestBroker || v.count > biggestBroker.count) biggestBroker = { name, ...v };
    }
    if (biggestBroker) {
      out.push({
        icon: 'Briefcase',
        title: 'Biggest broker',
        detail: `Your biggest broker is ${biggestBroker.name} with ${biggestBroker.count} transactions worth ₹${biggestBroker.totalValue.toFixed(2)}.`,
        tone: 'blue',
      });
    }

    // This month vs last month
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    let thisCount = 0;
    let lastCount = 0;
    for (const r of rows) {
      if (!r.transactionDate) continue;
      const d = new Date(r.transactionDate);
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) thisCount++;
      else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) lastCount++;
    }
    if (thisCount > 0 || lastCount > 0) {
      const diff = lastCount === 0 ? 100 : Math.round(((thisCount - lastCount) / lastCount) * 100);
      const arrow = thisCount >= lastCount ? '▲' : '▼';
      const sign = diff >= 0 ? '+' : '';
      out.push({
        icon: 'Calendar',
        title: 'Monthly activity',
        detail: `You've made ${thisCount} transactions this month vs ${lastCount} last month (${arrow} ${sign}${diff}%).`,
        tone: thisCount >= lastCount ? 'green' : 'red',
      });
    }

    // Buy vs Sell mix
    const buyCount = rows.filter((r) => r.transactionType === 'BUY').length;
    const sellCount = rows.filter((r) => r.transactionType === 'SELL').length;
    const total = rows.length;
    if (buyCount > 0 || sellCount > 0) {
      const buyPct = total > 0 ? Math.round((buyCount / total) * 100) : 0;
      const sellPct = total > 0 ? 100 - buyPct : 0;
      out.push({
        icon: 'TrendingUp',
        title: 'Buy / Sell mix',
        detail: `${buyPct}% of your transactions are BUYs, ${sellPct}% are SELLs.`,
        tone: 'purple',
      });
    }

    // Top asset type by total value
    const assetCounts = new Map<string, { count: number; totalValue: number }>();
    for (const r of rows) {
      const key = r.assetType || 'Unknown';
      const existing = assetCounts.get(key);
      if (existing) { existing.count += 1; existing.totalValue += r.totalValue || 0; }
      else assetCounts.set(key, { count: 1, totalValue: r.totalValue || 0 });
    }
    const totalValue = rows.reduce((s, r) => s + (r.totalValue || 0), 0);
    let topAsset: { name: string; count: number; totalValue: number; pct: number } | null = null;
    for (const [name, v] of assetCounts.entries()) {
      const pct = totalValue > 0 ? (v.totalValue / totalValue) * 100 : 0;
      if (!topAsset || v.totalValue > topAsset.totalValue) topAsset = { name, ...v, pct };
    }
    if (topAsset) {
      out.push({
        icon: 'Database',
        title: 'Top asset type',
        detail: `Top asset type: ${topAsset.name} (${topAsset.pct.toFixed(1)}% of total value).`,
        tone: 'yellow',
      });
    }

    // Average transaction size
    if (total > 0) {
      const avg = totalValue / total;
      out.push({
        icon: 'BarChart3',
        title: 'Average size',
        detail: `Avg. transaction size: ₹${avg.toFixed(2)}.`,
        tone: 'blue',
      });
    }

    // Charges as % of volume
    if (totalValue > 0 && stats.totalCharges > 0) {
      const pct = (stats.totalCharges / totalValue) * 100;
      out.push({
        icon: 'CreditCard',
        title: 'Charges impact',
        detail: `You paid ₹${stats.totalCharges.toFixed(2)} in total charges — that's ${pct.toFixed(2)}% of total volume.`,
        tone: 'yellow',
      });
    }

    // Top stock (bonus)
    if (stats.topStock) {
      out.push({
        icon: 'Crown',
        title: 'Most traded stock',
        detail: `${stats.topStock.name} (${stats.topStock.code}) — ${stats.topStock.count} transactions worth ₹${stats.topStock.totalValue.toFixed(2)}.`,
        tone: 'purple',
      });
    }

    return out;
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
