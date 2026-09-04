import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

import { TransactionService } from '@services/transaction.service';
import { LivePriceService } from '@services/live-price.service';
import { TransactionsResponse } from '@models/transactions-response.model';
import {
  PortfolioAnalyticsService,
  MergedTransaction,
  CapitalGainsSummary,
  AccrualSummaryRow,
} from '@core/services/portfolio-analytics.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { NotificationService } from '@services/notification.service';

interface FilterChip {
  kind: 'fy' | 'asset';
  label: string;
  value: string;
}

interface PerStockTaxRow {
  stockCode: string;
  stockName: string;
  assetType: string;
  sellQty: number;
  costBasis: number;
  sellValue: number;
  gain: number;
  period: 'ST' | 'LT' | 'Mixed';
  percentOfTotalGain: number;
}

interface TaxLossHarvestingOpportunity {
  stockCode: string;
  stockName: string;
  assetType: string;
  netHeld: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedLoss: number;
  holdingPeriod: 'ST' | 'LT';
  potentialSavings: number;
}

const ALL_OPTION = 'ALL';
const EQUITY_LIKE = new Set(['EQUITY', 'MUTUAL_FUND', 'ETF']);

// Best-effort Indian tax-rate table (FY 2024-25 reference).
// NOT configurable in v1 — see tooltip on the card.
const TAX_RATES = {
  STCG_EQUITY_LIKE: 0.15,
  STCG_DEBT: 0.30, // treated as slab rate; user income dependent
  LTCG_EQUITY_LIKE: 0.10, // applied to LTCG above 1,00,000 exemption
  LTCG_DEBT: 0.20, // with indexation
} as const;
const LTCG_EQUITY_EXEMPTION = 100000;

@Component({
  selector: 'app-tax-filing',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    LucideIconsModule,
    PrimeNgModule,
    FooterComponent,
    ExpansionPanelComponent,
  ],
  templateUrl: './tax-filing.component.html',
  styleUrls: ['./tax-filing.component.css'],
})
export class TaxFilingComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private livePriceService = inject(LivePriceService);
  private analytics = inject(PortfolioAnalyticsService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  private livePrices = new Map<string, number>();
  livePriceStatus: 'not_configured' | 'success' | 'failed' = 'not_configured';
  loadedSymbolsCount = 0;

  // ----- raw -----
  temporaryTransactions: TransactionsResponse[] = [];
  portfolioTransactions: TransactionsResponse[] = [];

  // ----- merged rows (everything we render against) -----
  rows: MergedTransaction[] = [];

  // ----- loading / mock -----
  loading = true;
  usingMockTemp = false;
  usingMockPort = false;
  userEmail = '';
  // BUG FIX: was previously checked as `=== null` against array fields, which
  // never matched — onDataReady() ran on the FIRST subscription's resolution
  // and rendered with one source still empty, then again with full data. This
  // caused `<p-chart>` to mount with half-baked data and required the user to
  // click a filter for the charts to refresh. Now we wait for BOTH to settle.
  private tempLoaded = false;
  private portLoaded = false;

  // ----- filter state -----
  selectedFy: string = ALL_OPTION;
  selectedAssetType: string = ALL_OPTION;
  exportMenuOpen = false;

  availableFys: { label: string; value: string }[] = [];
  readonly assetTypeOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Equity', value: 'EQUITY' },
    { label: 'Mutual Fund', value: 'MUTUAL_FUND' },
    { label: 'ETF', value: 'ETF' },
    { label: 'Debt', value: 'DEBT' },
    { label: 'Other', value: 'OTHER' },
  ];

  // ----- derived -----
  capitalGains: CapitalGainsSummary = {
    totalGain: 0,
    stcg: 0,
    ltcg: 0,
    totalSellValue: 0,
    totalCharges: 0,
    byFy: [],
    byAssetType: [],
  };
  estimatedTax = 0;
  perStockRows: PerStockTaxRow[] = [];
  activeFilterChips: FilterChip[] = [];
  totalGainsForPct = 0; // absolute sum used as denominator for % of total gain
  hasRows = false;

  // ----- accrual / Table F -----
  accrualRows: AccrualSummaryRow[] = [];
  accrualTargetFy = '';
  accrualRowTotals: number[] = [0, 0, 0, 0, 0];
  accrualGrandTotal = 0;

  // ----- tax-loss harvesting -----
  harvestOpportunities: TaxLossHarvestingOpportunity[] = [];
  totalHarvestableLoss = 0;
  potentialTaxSavings = 0;

  // expose for template
  readonly ALL = ALL_OPTION;
  readonly taxTooltip =
    'Estimate — actual tax depends on your slab, set-off rules, and indexation. Not financial advice.';

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.loadLivePrices();
  }

  refresh(): void {
    this.usingMockTemp = false;
    this.usingMockPort = false;
    this.tempLoaded = false;
    this.portLoaded = false;
    this.loading = true;
    this.loadLivePrices();
  }

  private loadLivePrices(): void {
    this.livePriceService.fetchPrices().subscribe({
      next: (prices) => {
        this.livePrices = prices;
        this.loadedSymbolsCount = prices.size;
        
        const url = this.livePriceService.getGoogleSheetUrl();
        if (!url) {
          this.livePriceStatus = 'not_configured';
        } else if (prices.size > 0) {
          this.livePriceStatus = 'success';
        } else {
          this.livePriceStatus = 'failed';
        }
        
        this.loadTemporary();
        this.loadPortfolio();
      },
      error: () => {
        this.livePrices = new Map<string, number>();
        this.loadedSymbolsCount = 0;
        this.livePriceStatus = 'failed';
        this.loadTemporary();
        this.loadPortfolio();
      }
    });
  }

  onNavigateSettings(): void {
    this.router.navigate(['/settings']);
  }

  // ============================================================
  // DATA LOAD
  // ============================================================

  private loadTemporary(): void {
    this.transactionService.getTemporaryTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.temporaryTransactions = data;
        this.usingMockTemp = false;
        this.tempLoaded = true;
        this.onDataReady();
      },
      error: () => {
        this.temporaryTransactions = [];
        this.tempLoaded = true;
        this.onDataReady();
      },
    });
  }

  private loadPortfolio(): void {
    this.transactionService.getCurrentTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.portfolioTransactions = data;
        this.usingMockPort = false;
        this.portLoaded = true;
        this.onDataReady();
      },
      error: () => {
        this.usingMockPort = true;
        this.portfolioTransactions = [
          {
            id: 1, rowId: 'port-1', email: 'test@gmail.com',
            stockName: 'QUANT HEALTHCARE FUND - DIRECT', stockCode: 'QUANT_HC',
            assetType: 'MUTUAL_FUND', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 1394.12, transactionType: 'BUY', price: 14.35,
            totalValue: 1394.12 * 14.35, transactionDate: '2024-04-15'
          },
          {
            id: 2, rowId: 'port-2', email: 'test@gmail.com',
            stockName: 'QUANT TAX PLAN-DIRECT GROWTH P', stockCode: 'QUANT_TAX',
            assetType: 'MUTUAL_FUND', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 24.79, transactionType: 'BUY', price: 443.74,
            totalValue: 24.79 * 443.74, transactionDate: '2024-04-15'
          },
          {
            id: 3, rowId: 'port-3', email: 'test@gmail.com',
            stockName: 'QUANT SMALL CAP FUND DIRECT PLAN - GROWTH', stockCode: 'QUANT_SMALL',
            assetType: 'MUTUAL_FUND', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 24.72, transactionType: 'BUY', price: 283.16,
            totalValue: 24.72 * 283.16, transactionDate: '2024-04-15'
          },
          {
            id: 4, rowId: 'port-4', email: 'test@gmail.com',
            stockName: 'ICICI PRUDENTIAL NIFTY 50 INDEX FUND - DIRECT PLAN GROWTH', stockCode: 'ICICI_NIFTY50',
            assetType: 'MUTUAL_FUND', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 17.312, transactionType: 'BUY', price: 259.94,
            totalValue: 17.312 * 259.94, transactionDate: '2024-04-15'
          },
          {
            id: 5, rowId: 'port-5', email: 'test@gmail.com',
            stockName: 'NIFTYBEES', stockCode: 'NIFTYBEES',
            assetType: 'EQUITY', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 23, transactionType: 'BUY', price: 266.62,
            totalValue: 23 * 266.62, transactionDate: '2024-04-15'
          },
          {
            id: 6, rowId: 'port-6', email: 'test@gmail.com',
            stockName: 'MID150BEES', stockCode: 'MID150BEES',
            assetType: 'EQUITY', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 15, transactionType: 'BUY', price: 218.94,
            totalValue: 15 * 218.94, transactionDate: '2024-04-15'
          },
          {
            id: 7, rowId: 'port-7', email: 'test@gmail.com',
            stockName: 'ICICI PRUDENTIAL NIFTY IT INDE', stockCode: 'ICICI_IT',
            assetType: 'MUTUAL_FUND', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 260.01, transactionType: 'BUY', price: 11.54,
            totalValue: 260.01 * 11.54, transactionDate: '2024-04-15'
          },
          {
            id: 8, rowId: 'port-8', email: 'test@gmail.com',
            stockName: 'ICICI Prudential Nifty Index F', stockCode: 'ICICI_NIFTY_IDX',
            assetType: 'MUTUAL_FUND', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 15.87, transactionType: 'BUY', price: 201.62,
            totalValue: 15.87 * 201.62, transactionDate: '2024-04-15'
          },
          {
            id: 9, rowId: 'port-9', email: 'test@gmail.com',
            stockName: 'ICICI PRUDENTIAL NIFTY BANK IN', stockCode: 'ICICI_BANK',
            assetType: 'MUTUAL_FUND', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 153.46, transactionType: 'BUY', price: 13.04,
            totalValue: 153.46 * 13.04, transactionDate: '2024-04-15'
          },
          {
            id: 10, rowId: 'port-10', email: 'test@gmail.com',
            stockName: 'DAMCAPITAL', stockCode: 'DAMCAPITAL',
            assetType: 'EQUITY', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 7, transactionType: 'BUY', price: 273.44,
            totalValue: 7 * 273.44, transactionDate: '2024-04-15'
          },
          {
            id: 11, rowId: 'port-11', email: 'test@gmail.com',
            stockName: 'ITBEES', stockCode: 'ITBEES',
            assetType: 'EQUITY', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 37, transactionType: 'BUY', price: 39.38,
            totalValue: 37 * 39.38, transactionDate: '2026-05-15'
          },
          {
            id: 12, rowId: 'port-12', email: 'test@gmail.com',
            stockName: 'ALOKINDS', stockCode: 'ALOKINDS',
            assetType: 'EQUITY', exchangeName: 'NSE', brokerName: 'Groww',
            quantity: 2, transactionType: 'BUY', price: 26.99,
            totalValue: 2 * 26.99, transactionDate: '2024-04-15'
          }
        ];
        this.portLoaded = true;
        this.onDataReady();
      },
    });
  }

  /** Recompute everything derived from `rows` once BOTH endpoints have settled. */
  private onDataReady(): void {
    // BUG FIX: previously guarded with `=== null` against array fields that are
    // initialized to `[]`, so the guard never matched and we rendered with
    // half-loaded data. Now we wait for BOTH subscriptions to settle (success
    // OR mock fallback) before merging, so `<p-chart>` and tables mount with
    // complete data and don't require the user to click again.
    if (!this.tempLoaded || !this.portLoaded) return;

    this.rows = this.analytics.mergeTransactions(
      this.temporaryTransactions,
      this.portfolioTransactions,
    );
    this.hasRows = this.rows.length > 0;

    const fys = this.analytics.deriveFinancialYears(this.rows);
    this.availableFys = [
      { label: 'All Financial Years', value: ALL_OPTION },
      ...fys.map((fy) => ({ label: fy, value: fy })),
    ];

    // Compute derived data BEFORE clearing `loading` so charts mount with
    // complete data instead of an empty initial snapshot.
    this.recompute();
    this.loading = false;
    this.cdr.detectChanges();
  }

  // ============================================================
  // FILTERING + DERIVATION
  // ============================================================

  setFy(fy: string): void {
    this.selectedFy = fy;
    this.recompute();
  }

  setAssetType(at: string): void {
    this.selectedAssetType = at;
    this.recompute();
  }

  resetFilters(): void {
    this.selectedFy = ALL_OPTION;
    this.selectedAssetType = ALL_OPTION;
    this.recompute();
  }

  hasActiveFilters(): boolean {
    return this.activeFilterChips.length > 0;
  }

  removeFilterChip(chip: FilterChip): void {
    if (chip.kind === 'fy') this.selectedFy = ALL_OPTION;
    else if (chip.kind === 'asset') this.selectedAssetType = ALL_OPTION;
    this.recompute();
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  closeExportMenu(): void {
    this.exportMenuOpen = false;
  }

  private recompute(): void {
    // Filter rows by asset type up-front so capital-gains math runs over the
    // narrowed set (FY filter is passed to the service as it has FY metadata).
    const filteredRows = this.selectedAssetType === ALL_OPTION
      ? this.rows
      : this.rows.filter((r) => r.assetType === this.selectedAssetType);

    // Strip _source before passing into analytics — service signature wants
    // TransactionsResponse[] and _source is added by mergeTransactions itself.
    const baseRows: TransactionsResponse[] = filteredRows.map((r) => {
      const { _source, ...rest } = r;
      return rest as TransactionsResponse;
    });

    this.capitalGains = this.analytics.computeCapitalGainsSummary(
      baseRows,
      this.selectedFy === ALL_OPTION ? undefined : this.selectedFy,
    );
    this.estimatedTax = this.computeEstimatedTax(this.capitalGains);

    // Per-stock table — computed off the same filtered rows.
    this.perStockRows = this.buildPerStockRows(baseRows);

    // Accrual / Table F calculation
    let targetFy = this.selectedFy;
    if (targetFy === ALL_OPTION) {
      const nonAllFys = this.availableFys.filter((f) => f.value !== ALL_OPTION);
      if (nonAllFys.length > 0) {
        targetFy = nonAllFys[nonAllFys.length - 1].value;
      } else {
        targetFy = '';
      }
    }
    this.accrualTargetFy = targetFy;

    if (this.accrualTargetFy) {
      this.accrualRows = this.analytics.computeAccrualSummary(baseRows, this.accrualTargetFy);

      const colTotals = [0, 0, 0, 0, 0];
      let grandTotal = 0;
      for (const r of this.accrualRows) {
        grandTotal += r.total;
        for (let i = 0; i < 5; i++) {
          colTotals[i] += r.periods[i];
        }
      }
      this.accrualRowTotals = colTotals.map((t) => Math.round(t * 100) / 100);
      this.accrualGrandTotal = Math.round(grandTotal * 100) / 100;
    } else {
      this.accrualRows = [];
      this.accrualRowTotals = [0, 0, 0, 0, 0];
      this.accrualGrandTotal = 0;
    }

    // Filter chips
    this.activeFilterChips = [];
    if (this.selectedFy !== ALL_OPTION) {
      this.activeFilterChips.push({
        kind: 'fy',
        label: `FY: ${this.selectedFy}`,
        value: this.selectedFy,
      });
    }
    if (this.selectedAssetType !== ALL_OPTION) {
      this.activeFilterChips.push({
        kind: 'asset',
        label: `Asset: ${this.selectedAssetType}`,
        value: this.selectedAssetType,
      });
    }

    this.computeTaxLossHarvesting();
  }

  /**
   * Estimate tax using the inline rate table. The rates are deliberately
   * simple — see the tooltip on the card. Returns an absolute number ≥ 0.
   */
  private computeEstimatedTax(summary: CapitalGainsSummary): number {
    // Per-asset breakdown is needed to apply EQUITY/MF/ETF vs DEBT rates.
    const map = new Map<string, { stcg: number; ltcg: number }>();
    for (const row of summary.byAssetType) {
      map.set(row.assetType, { stcg: row.stcg, ltcg: row.ltcg });
    }

    let equityStcg = 0;
    let equityLtcg = 0;
    let debtStcg = 0;
    let debtLtcg = 0;

    for (const [asset, v] of map.entries()) {
      const isEquityLike = EQUITY_LIKE.has(asset);
      if (isEquityLike) {
        equityStcg += Math.max(0, v.stcg);
        equityLtcg += Math.max(0, v.ltcg);
      } else {
        debtStcg += Math.max(0, v.stcg);
        debtLtcg += Math.max(0, v.ltcg);
      }
    }

    const equityTax =
      equityStcg * TAX_RATES.STCG_EQUITY_LIKE +
      Math.max(0, equityLtcg - LTCG_EQUITY_EXEMPTION) * TAX_RATES.LTCG_EQUITY_LIKE;
    const debtTax = debtStcg * TAX_RATES.STCG_DEBT + debtLtcg * TAX_RATES.LTCG_DEBT;

    return Math.max(0, equityTax + debtTax);
  }

  private buildPerStockRows(rows: TransactionsResponse[]): PerStockTaxRow[] {
    const gains = this.analytics.computeFifoRealizedGains(rows);

    const gainByStock = new Map<
      string,
      {
        stockName: string;
        assetType: string;
        sellQty: number;
        costBasis: number;
        sellValue: number;
        gain: number;
        periods: Set<'ST' | 'LT'>;
      }
    >();

    for (const g of gains) {
      if (g.holdingPeriod === 'UNKNOWN') continue; // skip short-sell residuals from per-stock table
      const key = g.stockCode || 'unknown';
      let agg = gainByStock.get(key);
      if (!agg) {
        agg = {
          stockName: g.stockName || key,
          assetType: g.assetType || 'OTHER',
          sellQty: 0,
          costBasis: 0,
          sellValue: 0,
          gain: 0,
          periods: new Set<'ST' | 'LT'>(),
        };
        gainByStock.set(key, agg);
      }
      agg.sellQty += g.sellQty;
      agg.costBasis += g.buyValue; // buyValue is the cost basis of the matched lot portion
      agg.sellValue += g.sellValue;
      agg.gain += g.gain;
      if (g.holdingPeriod === 'ST' || g.holdingPeriod === 'LT') {
        agg.periods.add(g.holdingPeriod);
      }
    }

    // Denominator = sum of |gain| so a stock's "% of total gain" is meaningful
    const stocks = Array.from(gainByStock.keys());
    let denom = 0;
    for (const s of stocks) denom += Math.abs(gainByStock.get(s)!.gain);
    this.totalGainsForPct = denom;

    const out: PerStockTaxRow[] = [];
    for (const key of stocks) {
      const agg = gainByStock.get(key)!;
      let period: PerStockTaxRow['period'] = 'Mixed';
      if (agg.periods.size === 1) period = Array.from(agg.periods)[0];
      else if (agg.periods.size === 0) period = 'ST';

      out.push({
        stockCode: key,
        stockName: agg.stockName,
        assetType: agg.assetType,
        sellQty: agg.sellQty,
        costBasis: agg.costBasis,
        sellValue: agg.sellValue,
        gain: agg.gain,
        period,
        percentOfTotalGain: denom > 0 ? (agg.gain / denom) * 100 : 0,
      });
    }

    // Default sort: highest realized gain first.
    out.sort((a, b) => b.gain - a.gain);
    return out;
  }

  // ============================================================
  // TOTALS for table footers
  // ============================================================

  get perStockTotals(): { sellQty: number; costBasis: number; sellValue: number; gain: number } {
    return this.perStockRows.reduce(
      (acc, r) => ({
        sellQty: acc.sellQty + r.sellQty,
        costBasis: acc.costBasis + r.costBasis,
        sellValue: acc.sellValue + r.sellValue,
        gain: acc.gain + r.gain,
      }),
      { sellQty: 0, costBasis: 0, sellValue: 0, gain: 0 },
    );
  }

  // ============================================================
  // EXPORT (CSV + Excel)
  // ============================================================

  exportCsv(): void {
    this.closeExportMenu();
    try {
      const csv = this.toCsv(this.perStockRows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, `tax-report_${this.userEmail || 'user'}_${this.todayStr()}.csv`);
      this.notificationService.addNotification('Export', `Exported ${this.perStockRows.length} rows to CSV`, 'success');
    } catch {
      this.notificationService.addNotification('Export failed', 'Could not generate CSV file', 'error');
    }
  }

  exportExcel(): void {
    this.closeExportMenu();
    try {
      const rows = this.perStockRows.map((r) => ({
        Stock: r.stockName,
        Code: r.stockCode,
        AssetType: r.assetType,
        SellQty: r.sellQty,
        CostBasis: r.costBasis,
        SellValue: r.sellValue,
        RealizedGain: r.gain,
        Period: r.period,
        PercentOfTotalGain: Number(r.percentOfTotalGain.toFixed(2)),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TaxReport');
      XLSX.writeFile(wb, `tax-report_${this.userEmail || 'user'}_${this.todayStr()}.xlsx`);
      this.notificationService.addNotification('Export', `Exported ${rows.length} rows to Excel`, 'success');
    } catch {
      this.notificationService.addNotification('Export failed', 'Could not generate Excel file', 'error');
    }
  }

  /** CSV builder for the per-stock table. */
  toCsv(rows: PerStockTaxRow[]): string {
    const headers = [
      'Stock', 'Code', 'AssetType', 'SellQty', 'CostBasis',
      'SellValue', 'RealizedGain', 'Period', 'PercentOfTotalGain',
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      const cells = [
        r.stockName, r.stockCode, r.assetType,
        r.sellQty, r.costBasis,
        r.sellValue, r.gain,
        r.period, r.percentOfTotalGain.toFixed(2),
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

  // ============================================================
  // HELPERS
  // ============================================================

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

  // Expose enum-like flag for template
  isAllAsset(): boolean { return this.selectedAssetType === ALL_OPTION; }
  isAllFy(): boolean { return this.selectedFy === ALL_OPTION; }

  private computeTaxLossHarvesting(): void {
    if (!this.portfolioTransactions.length) {
      this.harvestOpportunities = [];
      this.totalHarvestableLoss = 0;
      this.potentialTaxSavings = 0;
      return;
    }

    // Compute current holdings from all portfolio transactions
    const holdings = this.analytics.computeHoldings(this.portfolioTransactions);
    const opportunities: TaxLossHarvestingOpportunity[] = [];
    let totalLoss = 0;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    for (const h of holdings) {
      if (h.netHeld <= 0) continue;

      const codeKey = (h.stockCode || '').toUpperCase();
      const nameKey = (h.stockName || '').toUpperCase();
      let livePrice = this.livePrices.get(codeKey);
      if (livePrice === undefined) {
        livePrice = this.livePrices.get(nameKey);
      }
      const mockCmp = (livePrice !== undefined && !isNaN(livePrice))
        ? livePrice
        : this.getMockCurrentPrice(h.stockCode || h.stockName, h.avgPrice);

      const costBasis = h.netHeld * h.avgPrice;
      const currentValue = h.netHeld * mockCmp;
      const unrealizedPnl = currentValue - costBasis;

      if (unrealizedPnl < -1) { // Filter holdings with significant losses
        const holdingPeriod = new Date(h.firstDate) < oneYearAgo ? 'LT' : 'ST';

        // Calculate tax savings rate based on asset type and period
        // STCG Equity/MF/ETF: 20%, Debt/Other: 30%
        // LTCG Equity/MF/ETF: 12.5%, Debt: 20%
        const isEquityLike = EQUITY_LIKE.has(h.assetType);
        let taxRate = 0;
        if (holdingPeriod === 'ST') {
          taxRate = isEquityLike ? 0.20 : 0.30;
        } else {
          taxRate = isEquityLike ? 0.125 : 0.20;
        }

        const potentialSavings = Math.abs(unrealizedPnl) * taxRate;
        totalLoss += Math.abs(unrealizedPnl);

        opportunities.push({
          stockCode: h.stockCode || 'unknown',
          stockName: h.stockName,
          assetType: h.assetType,
          netHeld: h.netHeld,
          avgPrice: h.avgPrice,
          currentPrice: mockCmp,
          unrealizedLoss: unrealizedPnl,
          holdingPeriod,
          potentialSavings,
        });
      }
    }

    this.harvestOpportunities = opportunities.sort((a, b) => a.unrealizedLoss - b.unrealizedLoss);
    this.totalHarvestableLoss = totalLoss;

    // Potential savings depends on offset capacity against current year's realized gains
    // STCL can offset STCG and LTCG. LTCL can only offset LTCG.
    let stcl = 0;
    let ltcl = 0;
    for (const op of opportunities) {
      if (op.holdingPeriod === 'ST') stcl += Math.abs(op.unrealizedLoss);
      else ltcl += Math.abs(op.unrealizedLoss);
    }

    const currentStcg = Math.max(0, this.capitalGains.stcg);
    const currentLtcg = Math.max(0, this.capitalGains.ltcg);

    // 1. Offset LTCL against LTCG first
    const ltcgOffsetByLtcl = Math.min(currentLtcg, ltcl);
    const remainingLtcg = currentLtcg - ltcgOffsetByLtcl;

    // 2. Offset STCL against STCG and remaining LTCG
    const stcgOffsetByStcl = Math.min(currentStcg, stcl);
    const remainingStcl = stcl - stcgOffsetByStcl;
    const ltcgOffsetByStcl = Math.min(remainingLtcg, remainingStcl);

    // Calculate tax saved based on what we actually offset
    const isEquity = this.selectedAssetType === ALL_OPTION || EQUITY_LIKE.has(this.selectedAssetType);
    const stcgRate = isEquity ? 0.20 : 0.30;
    const ltcgRate = isEquity ? 0.125 : 0.20;

    const stcgTaxSaved = stcgOffsetByStcl * stcgRate;
    const ltcgTaxSaved = (ltcgOffsetByLtcl + ltcgOffsetByStcl) * ltcgRate;

    this.potentialTaxSavings = stcgTaxSaved + ltcgTaxSaved;
  }

  private getMockCurrentPrice(stockCode: string, avgPrice: number): number {
    const code = stockCode || 'unknown';
    const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Let some stocks be down by 10% to 25% to serve as tax-loss harvesting candidates
    if (hash % 3 === 0) {
      return avgPrice * 0.82; // Down 18%
    } else if (hash % 5 === 0) {
      return avgPrice * 0.75; // Down 25%
    } else {
      return avgPrice * 1.15; // Up 15%
    }
  }
}
