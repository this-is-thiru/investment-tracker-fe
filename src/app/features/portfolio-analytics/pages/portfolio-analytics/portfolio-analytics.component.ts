import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../../../services/transaction.service';
import { TransactionsResponse } from '../../../../models/TranscationsResponse';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import {
  PortfolioAnalyticsService,
  MergedTransaction,
  HoldingRow,
  PerStockPnl,
} from '../../../../core/services/portfolio-analytics.service';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';

type DatePreset = 'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom';

interface FilterChip {
  kind: 'preset' | 'custom';
  label: string;
}

// Fixed on-theme palette cycled with modulo (per spec).
const PALETTE = [
  '#10A37F', // accent green
  '#3B82F6', // blue
  '#FACC15', // warning yellow
  '#EF4444', // danger red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
];

const TOOLTIP_STYLE = {
  backgroundColor: '#232323',
  titleColor: '#FFFFFF',
  bodyColor: '#FFFFFF',
  borderColor: '#3A3A3A',
  borderWidth: 1,
};

const LEGEND_LABEL_STYLE = { color: '#B3B3B3' };
const SCALES_AXIS_STYLE = {
  grid: { color: '#2A2A2A' },
  ticks: { color: '#B3B3B3' },
};

@Component({
  selector: 'app-portfolio-analytics',
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    LucideIconsModule,
    PrimeNgModule,
    FooterComponent,
    ExpansionPanelComponent,
  ],
  templateUrl: './portfolio-analytics.component.html',
  styleUrls: ['./portfolio-analytics.component.css'],
})
export class PortfolioAnalyticsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private analytics = inject(PortfolioAnalyticsService);
  private cdr = inject(ChangeDetectorRef);

  // ----- raw data -----
  temporaryTransactions: TransactionsResponse[] = [];
  portfolioTransactions: TransactionsResponse[] = [];
  rows: MergedTransaction[] = [];

  // ----- derived -----
  filteredRows: MergedTransaction[] = [];
  holdings: HoldingRow[] = [];
  winners: PerStockPnl[] = [];
  losers: PerStockPnl[] = [];
  /** SELL count per stockCode, for the top-movers tables. */
  sellCountByCode: Map<string, number> = new Map();

  // ----- summary cards -----
  totalInvested = 0;
  realizedPnl = 0;
  holdingsCount = 0;
  totalCharges = 0;
  biggestPosition: { name: string; pct: number } | null = null;

  // ----- chart data (class fields, reassigned by recompute) -----
  assetAllocData: any = { labels: [], datasets: [{ data: [] }] };
  brokerData: any = { labels: [], datasets: [] };
  activityData: any = { labels: [], datasets: [] };
  exchangeData: any = { labels: [], datasets: [{ data: [] }] };

  // ----- chart options (theme tokens) -----
  /** Single shared base options for all charts (responsive + theme). */
  readonly chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { ...LEGEND_LABEL_STYLE } },
      tooltip: { ...TOOLTIP_STYLE },
    },
  };
  /** Doughnut/pie: legend on right + cutout 60%. */
  readonly circularChartOptions: any = {
    ...this.chartOptions,
    cutout: '60%',
    plugins: {
      ...this.chartOptions.plugins,
      legend: {
        ...this.chartOptions.plugins.legend,
        position: 'right',
      },
    },
  };
  /** Bar/line: configure axes (Chart.js ignores `scales` for non-axis charts). */
  readonly axisChartOptions: any = {
    ...this.chartOptions,
    scales: {
      x: { ...SCALES_AXIS_STYLE },
      y: { ...SCALES_AXIS_STYLE },
    },
  };

  // ----- loading / error -----
  loading = true;
  usingMock = false;
  // BUG FIX NOTE: unlike the previous tax-filing version (which checked
  // `=== null` against `[]` arrays), this component already uses
  // `tempLoaded`/`portLoaded` flags. We only need to make sure `recompute()`
  // runs BEFORE `loading = false`, so chart data is populated by the time
  // `<p-chart>` mounts.
  private tempLoaded = false;
  private portLoaded = false;
  userEmail = '';

  // ----- filter state -----
  selectedPreset: DatePreset = 'all';
  from: string | null = null;
  to: string | null = null;
  activeChips: FilterChip[] = [];

  // ----- pagination / sort for holdings table -----
  rowsPerPage = 10;
  first = 0;
  sortField = 'totalInvested';
  sortOrder = -1;

  readonly datePresetOptions = [
    { label: 'All time', value: 'all' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'This year', value: 'ytd' },
    { label: 'Custom range', value: 'custom' },
  ];

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.loadTemporaryTransactions();
    this.loadPortfolioTransactions();
  }

  refresh(): void {
    this.usingMock = false;
    this.tempLoaded = false;
    this.portLoaded = false;
    this.loading = true;
    this.loadTemporaryTransactions();
    this.loadPortfolioTransactions();
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadTemporaryTransactions(): void {
    this.transactionService.getTemporaryTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.temporaryTransactions = data ?? [];
        this.tempLoaded = true;
        this.afterLoad();
      },
      error: () => {
        this.temporaryTransactions = this.mockTempData();
        this.usingMock = true;
        this.tempLoaded = true;
        this.afterLoad();
      },
    });
  }

  loadPortfolioTransactions(): void {
    this.transactionService.getCurrentTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.portfolioTransactions = data ?? [];
        this.portLoaded = true;
        this.afterLoad();
      },
      error: () => {
        this.portfolioTransactions = this.mockPortfolioData();
        this.usingMock = true;
        this.portLoaded = true;
        this.afterLoad();
      },
    });
  }

  private afterLoad(): void {
    if (!this.tempLoaded || !this.portLoaded) return;
    this.rows = this.analytics.mergeTransactions(
      this.temporaryTransactions,
      this.portfolioTransactions
    );
    // applyFilters() → recompute() populates chart datasets BEFORE `loading`
    // is cleared. This ensures <p-chart> mounts with complete data and does
    // not require the user to click again to refresh the visualization.
    this.applyFilters();
    this.loading = false;
    this.cdr.detectChanges();
  }

  // ============================================================
  // FILTERS
  // ============================================================

  setDatePreset(p: DatePreset): void {
    this.selectedPreset = p;
    this.applyFilters();
  }

  onDateFromChange(): void { this.applyFilters(); }
  onDateToChange(): void { this.applyFilters(); }

  resetFilters(): void {
    this.selectedPreset = 'all';
    this.from = null;
    this.to = null;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return this.selectedPreset !== 'all' || !!this.from || !!this.to;
  }

  removeFilterChip(chip: FilterChip): void {
    if (chip.kind === 'preset') {
      this.selectedPreset = 'all';
    } else if (chip.kind === 'custom') {
      this.selectedPreset = 'all';
      this.from = null;
      this.to = null;
    }
    this.applyFilters();
  }

  applyFilters(): void {
    const { from, to } = this.getDateRange();
    this.filteredRows = this.rows.filter((r) => this.inDateRange(r.transactionDate, from, to));
    this.recompute();
    this.first = 0; // reset pagination when filters change
    this.updateActiveChips();
  }

  // ============================================================
  // DERIVED DATA — called on init and on every filter change
  // ============================================================

  private recompute(): void {
    // Summary cards
    const stats = this.analytics.computeStats(this.filteredRows);
    this.totalInvested = stats.totalInvested;
    this.realizedPnl = this.analytics.computeCapitalGainsSummary(this.filteredRows).totalGain;
    this.totalCharges = stats.totalCharges;

    // Holdings + biggest position
    this.holdings = this.analytics.computeHoldings(this.filteredRows);
    this.holdingsCount = this.holdings.length;
    this.biggestPosition =
      this.holdings.length > 0
        ? { name: this.holdings[0].stockName, pct: this.holdings[0].sharePercent }
        : null;

    // Top movers
    const movers = this.analytics.computeTopMovers(this.filteredRows, 5);
    this.winners = movers.winners;
    this.losers = movers.losers;

    // Sell count per stock (for top-movers #Sells column)
    this.sellCountByCode = new Map();
    for (const r of this.filteredRows) {
      if (r.transactionType === 'SELL') {
        this.sellCountByCode.set(
          r.stockCode || r.stockName || 'unknown',
          (this.sellCountByCode.get(r.stockCode || r.stockName || 'unknown') ?? 0) + 1
        );
      }
    }

    // Chart datasets
    this.buildAssetAllocChart();
    this.buildBrokerChart();
    this.buildActivityChart();
    this.buildExchangeChart();
  }

  private buildAssetAllocChart(): void {
    const slices = this.analytics.computeAssetAllocation(this.filteredRows);
    this.assetAllocData = {
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#191919',
          borderWidth: 2,
        },
      ],
    };
  }

  private buildBrokerChart(): void {
    const brokers = this.analytics.computeBrokerBreakdown(this.filteredRows);
    this.brokerData = {
      labels: brokers.map((b) => b.broker),
      datasets: [
        { label: 'Buy Value', data: brokers.map((b) => b.buyValue), backgroundColor: '#22C55E' },
        { label: 'Sell Value', data: brokers.map((b) => b.sellValue), backgroundColor: '#3B82F6' },
      ],
    };
  }

  private buildActivityChart(): void {
    const months = this.analytics.computeMonthlyActivity(this.filteredRows);
    this.activityData = {
      labels: months.map((m) => m.month),
      datasets: [
        {
          label: 'Buy Value',
          data: months.map((m) => m.buyValue),
          borderColor: '#10A37F',
          backgroundColor: '#10A37F',
          tension: 0.3,
          fill: false,
        },
        {
          label: 'Sell Value',
          data: months.map((m) => m.sellValue),
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F6',
          tension: 0.3,
          fill: false,
        },
      ],
    };
  }

  private buildExchangeChart(): void {
    const exchanges = this.analytics.computeExchangeBreakdown(this.filteredRows);
    this.exchangeData = {
      labels: exchanges.map((e) => e.exchange),
      datasets: [
        {
          data: exchanges.map((e) => e.totalValue),
          backgroundColor: exchanges.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#191919',
          borderWidth: 2,
        },
      ],
    };
  }

  sellCountFor(stockCode: string): number {
    return this.sellCountByCode.get(stockCode) ?? 0;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /** Date-preset and custom-range filter, ported from transactions-table. */
  inDateRange(date: string, from: Date | null, to: Date | null): boolean {
    if (!date) return !from && !to;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  private getDateRange(): { from: Date | null; to: Date | null } {
    if (this.selectedPreset === 'all') return { from: null, to: null };
    const now = new Date();
    if (this.selectedPreset === '7d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 7);
      return { from, to: now };
    }
    if (this.selectedPreset === '30d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 30);
      return { from, to: now };
    }
    if (this.selectedPreset === '90d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 90);
      return { from, to: now };
    }
    if (this.selectedPreset === 'ytd') {
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    }
    if (this.selectedPreset === 'custom') {
      return {
        from: this.from ? new Date(this.from) : null,
        to: this.to ? new Date(`${this.to}T23:59:59`) : null,
      };
    }
    return { from: null, to: null };
  }

  private updateActiveChips(): void {
    this.activeChips = [];
    if (this.selectedPreset === 'custom') {
      this.activeChips.push({
        kind: 'custom',
        label: `Date: ${this.from || '...'} → ${this.to || '...'}`,
      });
    } else if (this.selectedPreset !== 'all') {
      const opt = this.datePresetOptions.find((o) => o.value === this.selectedPreset);
      if (opt) this.activeChips.push({ kind: 'preset', label: `Date: ${opt.label}` });
    }
  }

  // ============================================================
  // MOCK DATA (matches transactions-table fallback)
  // ============================================================

  private mockTempData(): TransactionsResponse[] {
    return Array.from({ length: 3 }, (_, i) => ({
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
  }

  private mockPortfolioData(): TransactionsResponse[] {
    return Array.from({ length: 19 }, (_, i) => ({
      id: i,
      rowId: `port-${i}`,
      email: 'test@gmail.com',
      stockName: i % 2 === 0 ? 'QUANT SMALL CAP FUND - DIRECT' : 'SBI BLUECHIP FUND - DIRECT',
      stockCode: i % 2 === 0 ? 'QUANT_SMALL' : 'SBI_BLUE',
      assetType: 'MUTUAL_FUND',
      exchangeName: i % 3 === 0 ? 'BSE' : 'NSE',
      brokerName: i % 2 === 0 ? 'Zerodha' : 'Groww',
      quantity: 5 + i * 0.1,
      transactionType: i % 4 === 0 ? 'SELL' : 'BUY',
      price: 195.76,
      totalValue: 1000 + i * 100,
      brokerCharges: 5,
      miscCharges: 2,
      transactionDate: `2023-${String(((i % 12) + 1)).padStart(2, '0')}-15`,
    }));
  }
}
