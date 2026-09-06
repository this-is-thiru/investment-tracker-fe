import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '@services/transaction.service';
import { TransactionsResponse } from '@models/transactions-response.model';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { FooterComponent } from '@shared/components/footer/footer.component';
import {
  PortfolioAnalyticsService,
  MergedTransaction,
  HoldingRow,
  PerStockPnl,
} from '@core/services/portfolio-analytics.service';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

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
    TooltipDirective,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './portfolio-analytics.component.html',
  styleUrls: ['./portfolio-analytics.component.css'],
})
export class PortfolioAnalyticsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private analytics = inject(PortfolioAnalyticsService);
  private cdr = inject(ChangeDetectorRef);

  // ----- raw data -----
  portfolioTransactions: TransactionsResponse[] = [];
  apiHoldings: any[] = [];

  // ----- derived -----
  filteredRows: TransactionsResponse[] = [];
  holdings: HoldingRow[] = [];
  filteredHoldings: HoldingRow[] = [];
  availableAssetTypes: string[] = [];
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

  // ----- advanced states -----
  activeTab: 'overview' | 'tax' | 'holdings' = 'overview';

  // HHI diversification state
  hhiScore = 0;
  hhiCategory: 'low' | 'moderate' | 'high' = 'low';
  hhiLabel = 'Well Diversified';
  hhiColor = '#22C55E';
  hhiPercentWidth = 0;

  // Charges leakage
  chargesLeakage = 0;
  chargesImpactLabel = 'Low Impact';
  chargesImpactColor = '#22C55E';
  chargesLeakagePercent = 0;

  // Capital gains summaries
  taxGainsSummary: any = null;
  fifoGainsList: any[] = [];

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
  private tempLoaded = false;
  private portLoaded = false;
  private holdingsLoaded = false;
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

  // holdings tab filters
  searchQuery = '';
  filterAssetType: string | null = null;

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
    this.refresh();
  }

  refresh(): void {
    this.usingMock = false;
    this.portLoaded = false;
    this.holdingsLoaded = false;
    this.loading = true;
    this.loadPortfolioTransactions();
    this.loadApiHoldings();
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

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

  loadApiHoldings(): void {
    this.transactionService.getAllHoldings(this.userEmail).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : res?.data || res?.content || [];
        this.apiHoldings = data.map((d: any) => {
          const totalBought = d.totalQuantity || 0;
          const netHeld = d.quantity || 0;
          const totalSold = totalBought - netHeld;
          const totalInvested = d.totalValue || 0;
          return {
            stockCode: d.stockCode,
            stockName: d.stockName,
            assetType: d.assetType,
            totalBought,
            totalSold,
            netHeld,
            totalInvested,
            totalSoldValue: 0,
            netInvested: totalInvested,
            txnCount:
              (d.buyTransactionIds?.length || 0) +
              (d.sellTransactionIds?.length || 0) ||
              Object.keys(d.transactionQuantities || {}).length,
            avgPrice: d.price || 0,
            totalCharges: (d.brokerCharges || 0) + (d.miscCharges || 0),
            sharePercent: 0,
            firstDate: '',
            lastDate: '',
          };
        });
        this.holdingsLoaded = true;
        this.afterLoad();
      },
      error: () => {
        this.apiHoldings = this.mockApiHoldingsData();
        this.usingMock = true;
        this.holdingsLoaded = true;
        this.afterLoad();
      },
    });
  }

  private afterLoad(): void {
    if (!this.portLoaded || !this.holdingsLoaded) return;
    this.enrichApiHoldings();
    this.applyFilters();
    this.loading = false;
    this.cdr.detectChanges();
  }

  private enrichApiHoldings(): void {
    if (!this.apiHoldings.length || !this.portfolioTransactions.length) return;
    const txnMap = new Map<string, TransactionsResponse[]>();
    for (const t of this.portfolioTransactions) {
      const key = t.stockCode || t.stockName || 'unknown';
      if (!txnMap.has(key)) txnMap.set(key, []);
      txnMap.get(key)!.push(t);
    }
    let totalAllInvested = 0;
    for (const h of this.apiHoldings) {
      totalAllInvested += h.totalInvested || 0;
      const key = h.stockCode || h.stockName || 'unknown';
      const stockTxns = txnMap.get(key) || [];
      let firstDate = '';
      let lastDate = '';
      for (const t of stockTxns) {
        if (t.transactionDate) {
          if (!firstDate || t.transactionDate < firstDate) firstDate = t.transactionDate;
          if (!lastDate || t.transactionDate > lastDate) lastDate = t.transactionDate;
        }
      }
      h.firstDate = firstDate || 'N/A';
      h.lastDate = lastDate || 'N/A';
    }
    if (totalAllInvested > 0) {
      for (const h of this.apiHoldings) {
        h.sharePercent = (h.totalInvested / totalAllInvested) * 100;
      }
    }
    this.apiHoldings.sort((a, b) => b.totalInvested - a.totalInvested);
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
    this.filteredRows = this.portfolioTransactions.filter((r) => this.inDateRange(r.transactionDate, from, to));
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
    this.totalCharges = stats.totalCharges;

    // Capital gains & tax computation
    this.taxGainsSummary = this.analytics.computeCapitalGainsSummary(this.filteredRows);
    this.realizedPnl = this.taxGainsSummary.totalGain;
    this.fifoGainsList = this.analytics.computeFifoRealizedGains(this.filteredRows);

    // Holdings + biggest position
    this.holdings = [...this.apiHoldings];
    this.holdingsCount = this.holdings.length;
    this.biggestPosition =
      this.holdings.length > 0
        ? { name: this.holdings[0].stockName, pct: this.holdings[0].sharePercent }
        : null;

    // Diversification Metrics
    this.computeHHI(this.holdings);
    this.hhiPercentWidth = Math.min((this.hhiScore / 10000) * 100, 100);

    // Charges Impact Leakage
    this.computeChargesLeakage();
    this.chargesLeakagePercent = Math.min(this.chargesLeakage * 100, 100);

    // Top movers
    const movers = this.analytics.computeTopMovers(this.filteredRows, 5);
    this.winners = movers.winners;
    this.losers = movers.losers;

    // Sell count per stock (for top-movers #Sells column)
    this.sellCountByCode = new Map();
    for (const r of this.filteredRows) {
      if (r.transactionType === 'SELL') {
        const key = r.stockCode || r.stockName || 'unknown';
        this.sellCountByCode.set(key, (this.sellCountByCode.get(key) ?? 0) + 1);
      }
    }

    // Chart datasets
    this.buildAssetAllocChart();
    this.buildBrokerChart();
    this.buildActivityChart();
    this.buildExchangeChart();

    // Filter holdings tab
    this.availableAssetTypes = Array.from(
      new Set(this.holdings.map((h) => h.assetType).filter(Boolean))
    ).sort();
    this.applyHoldingsFilters();
  }

  // holdings tab filters
  applyHoldingsFilters(): void {
    const query = (this.searchQuery || '').toLowerCase().trim();
    this.filteredHoldings = this.holdings.filter((h) => {
      const matchesSearch =
        !query ||
        (h.stockName || '').toLowerCase().includes(query) ||
        (h.stockCode || '').toLowerCase().includes(query) ||
        (h.assetType || '').toLowerCase().includes(query);
      const matchesAsset =
        !this.filterAssetType || h.assetType === this.filterAssetType;
      return matchesSearch && matchesAsset;
    });
  }

  resetHoldingsFilters(): void {
    this.searchQuery = '';
    this.filterAssetType = null;
    this.applyHoldingsFilters();
  }

  // Advanced calculations
  computeHHI(holdingsList: HoldingRow[]): void {
    if (!holdingsList || holdingsList.length === 0) {
      this.hhiScore = 0;
      this.hhiCategory = 'low';
      this.hhiLabel = 'No holdings';
      this.hhiColor = '#B3B3B3';
      return;
    }
    let sumSquares = 0;
    for (const h of holdingsList) {
      sumSquares += h.sharePercent * h.sharePercent;
    }
    this.hhiScore = Math.round(sumSquares);
    if (this.hhiScore < 1500) {
      this.hhiCategory = 'low';
      this.hhiLabel = 'Well Diversified';
      this.hhiColor = '#22C55E';
    } else if (this.hhiScore <= 2500) {
      this.hhiCategory = 'moderate';
      this.hhiLabel = 'Moderately Concentrated';
      this.hhiColor = '#FACC15';
    } else {
      this.hhiCategory = 'high';
      this.hhiLabel = 'Highly Concentrated';
      this.hhiColor = '#EF4444';
    }
  }

  computeChargesLeakage(): void {
    if (this.totalInvested > 0) {
      this.chargesLeakage = (this.totalCharges / this.totalInvested) * 100;
      if (this.chargesLeakage < 0.2) {
        this.chargesImpactLabel = 'Negligible Impact';
        this.chargesImpactColor = '#22C55E';
      } else if (this.chargesLeakage <= 0.8) {
        this.chargesImpactLabel = 'Moderate Impact';
        this.chargesImpactColor = '#FACC15';
      } else {
        this.chargesImpactLabel = 'High Impact';
        this.chargesImpactColor = '#EF4444';
      }
    } else {
      this.chargesLeakage = 0;
      this.chargesImpactLabel = 'No investments';
      this.chargesImpactColor = '#B3B3B3';
    }
  }

  // Tax calculations
  get stcgTaxEstimate(): number {
    const stcg = this.taxGainsSummary?.stcg || 0;
    return stcg > 0 ? stcg * 0.20 : 0; // 20% flat STCG rate
  }

  get ltcgTaxEstimate(): number {
    const ltcg = this.taxGainsSummary?.ltcg || 0;
    // Exemption of 1.25 Lakhs (125,000)
    return ltcg > 125000 ? (ltcg - 125000) * 0.125 : 0; // 12.5% rate on excess
  }

  get totalTaxEstimate(): number {
    return this.stcgTaxEstimate + this.ltcgTaxEstimate;
  }

  // Toggles & tab actions
  setActiveTab(tab: 'overview' | 'tax' | 'holdings'): void {
    this.activeTab = tab;
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

  private mockApiHoldingsData(): any[] {
    return [
      {
        stockCode: 'QUANT_SMALL',
        stockName: 'QUANT SMALL CAP FUND - DIRECT',
        assetType: 'MUTUAL_FUND',
        totalQuantity: 100,
        quantity: 80,
        totalValue: 15000,
        price: 150,
        brokerCharges: 20,
        miscCharges: 10,
      },
      {
        stockCode: 'SBI_BLUE',
        stockName: 'SBI BLUECHIP FUND - DIRECT',
        assetType: 'MUTUAL_FUND',
        totalQuantity: 150,
        quantity: 120,
        totalValue: 24000,
        price: 160,
        brokerCharges: 25,
        miscCharges: 15,
      }
    ];
  }
}
