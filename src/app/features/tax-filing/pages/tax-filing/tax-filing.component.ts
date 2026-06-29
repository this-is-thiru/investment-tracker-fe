import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';

import { TransactionService } from '../../../../services/transaction.service';
import { TransactionsResponse } from '../../../../models/TranscationsResponse';
import {
  PortfolioAnalyticsService,
  MergedTransaction,
  CapitalGainsSummary,
} from '../../../../core/services/portfolio-analytics.service';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';

interface FilterChip {
  kind: 'fy' | 'asset';
  label: string;
  value: string;
}

interface FyGainsRow {
  financialYear: string;
  assetType: string; // 'ALL' or specific asset
  buyValue: number;
  sellValue: number;
  gain: number;
  stcg: number;
  ltcg: number;
  count: number;
}

interface PerStockTaxRow {
  stockCode: string;
  stockName: string;
  assetType: string;
  buyQty: number;
  buyValue: number;
  sellQty: number;
  sellValue: number;
  netQty: number;
  gain: number;
  period: 'ST' | 'LT' | 'Mixed';
  percentOfTotalGain: number;
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
  providers: [MessageService],
})
export class TaxFilingComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private analytics = inject(PortfolioAnalyticsService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

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
  fyRows: FyGainsRow[] = [];
  perStockRows: PerStockTaxRow[] = [];
  activeFilterChips: FilterChip[] = [];
  totalGainsForPct = 0; // absolute sum used as denominator for % of total gain
  hasRows = false;

  // expose for template
  readonly ALL = ALL_OPTION;
  readonly taxTooltip =
    'Estimate — actual tax depends on your slab, set-off rules, and indexation. Not financial advice.';

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.loadTemporary();
    this.loadPortfolio();
  }

  refresh(): void {
    this.usingMockTemp = false;
    this.usingMockPort = false;
    this.tempLoaded = false;
    this.portLoaded = false;
    this.loading = true;
    this.loadTemporary();
    this.loadPortfolio();
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

    // FY-wise table: one row per FY (simpler cross-tab fallback).
    // Rationale: computeCapitalGainsSummary already gives a byFy aggregate;
    // producing a full (FY × AssetType) cross-tab would mostly duplicate the
    // byAssetType breakdown and inflate row count without much extra signal.
    this.fyRows = this.capitalGains.byFy.map((r) => ({
      financialYear: r.financialYear,
      assetType: 'ALL',
      buyValue: 0, // not tracked by byFy; left as 0
      sellValue: r.sellValue,
      gain: r.gain,
      stcg: r.stcg,
      ltcg: r.ltcg,
      count: r.count,
    }));

    // Per-stock table — computed off the same filtered rows.
    this.perStockRows = this.buildPerStockRows(baseRows);

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

    // Group gains by stock + accumulate buy info from rows.
    const buyMap = new Map<string, { qty: number; value: number }>();
    const sellMap = new Map<string, { qty: number; value: number }>();
    const meta = new Map<string, { name: string; assetType: string }>();
    const periodByStock = new Map<string, Set<'ST' | 'LT'>>();

    for (const r of rows) {
      const key = r.stockCode || r.stockName || 'unknown';
      if (!meta.has(key)) {
        meta.set(key, { name: r.stockName, assetType: r.assetType });
      }
      let buy = buyMap.get(key);
      let sell = sellMap.get(key);
      if (r.transactionType === 'BUY') {
        buy = buy ? { qty: buy.qty + (r.quantity || 0), value: buy.value + (r.totalValue || 0) } : { qty: r.quantity || 0, value: r.totalValue || 0 };
        buyMap.set(key, buy);
      } else if (r.transactionType === 'SELL') {
        sell = sell ? { qty: sell.qty + (r.quantity || 0), value: sell.value + (r.totalValue || 0) } : { qty: r.quantity || 0, value: r.totalValue || 0 };
        sellMap.set(key, sell);
      }
    }

    const gainByStock = new Map<string, { gain: number; sellValue: number; periods: Set<'ST' | 'LT'> }>();
    for (const g of gains) {
      if (g.holdingPeriod === 'UNKNOWN') continue; // skip short-sell residuals from per-stock table
      let agg = gainByStock.get(g.stockCode);
      if (!agg) {
        agg = { gain: 0, sellValue: 0, periods: new Set() };
        gainByStock.set(g.stockCode, agg);
      }
      agg.gain += g.gain;
      agg.sellValue += g.sellValue;
      if (g.holdingPeriod === 'ST' || g.holdingPeriod === 'LT') {
        agg.periods.add(g.holdingPeriod);
      }
    }

    // Denominator = sum of |gain| so a stock's "% of total gain" is meaningful
    // even when some gains are negative.
    const stocks = Array.from(gainByStock.keys());
    let denom = 0;
    for (const s of stocks) denom += Math.abs(gainByStock.get(s)!.gain);
    this.totalGainsForPct = denom;

    const out: PerStockTaxRow[] = [];
    for (const key of stocks) {
      const m = meta.get(key);
      const buy = buyMap.get(key) ?? { qty: 0, value: 0 };
      const sell = sellMap.get(key) ?? { qty: 0, value: 0 };
      const agg = gainByStock.get(key)!;
      let period: PerStockTaxRow['period'] = 'Mixed';
      if (agg.periods.size === 1) period = Array.from(agg.periods)[0];
      else if (agg.periods.size === 0) period = 'ST';

      out.push({
        stockCode: key,
        stockName: m?.name ?? key,
        assetType: m?.assetType ?? '',
        buyQty: buy.qty,
        buyValue: buy.value,
        sellQty: sell.qty,
        sellValue: sell.value,
        netQty: buy.qty - sell.qty,
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

  get fyRowTotals(): FyGainsRow {
    return this.fyRows.reduce(
      (acc, r) => ({
        financialYear: 'Total',
        assetType: '',
        buyValue: acc.buyValue + r.buyValue,
        sellValue: acc.sellValue + r.sellValue,
        gain: acc.gain + r.gain,
        stcg: acc.stcg + r.stcg,
        ltcg: acc.ltcg + r.ltcg,
        count: acc.count + r.count,
      }),
      {
        financialYear: 'Total',
        assetType: '',
        buyValue: 0,
        sellValue: 0,
        gain: 0,
        stcg: 0,
        ltcg: 0,
        count: 0,
      },
    );
  }

  get perStockTotals(): { buyQty: number; buyValue: number; sellQty: number; sellValue: number; netQty: number; gain: number } {
    return this.perStockRows.reduce(
      (acc, r) => ({
        buyQty: acc.buyQty + r.buyQty,
        buyValue: acc.buyValue + r.buyValue,
        sellQty: acc.sellQty + r.sellQty,
        sellValue: acc.sellValue + r.sellValue,
        netQty: acc.netQty + r.netQty,
        gain: acc.gain + r.gain,
      }),
      { buyQty: 0, buyValue: 0, sellQty: 0, sellValue: 0, netQty: 0, gain: 0 },
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
      this.messageService.add({
        severity: 'success',
        summary: 'Export',
        detail: `Exported ${this.perStockRows.length} rows to CSV`,
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Export failed',
        detail: 'Could not generate CSV file',
      });
    }
  }

  exportExcel(): void {
    this.closeExportMenu();
    try {
      const rows = this.perStockRows.map((r) => ({
        Stock: r.stockName,
        Code: r.stockCode,
        AssetType: r.assetType,
        BuyQty: r.buyQty,
        BuyValue: r.buyValue,
        SellQty: r.sellQty,
        SellValue: r.sellValue,
        NetQty: r.netQty,
        RealizedGain: r.gain,
        Period: r.period,
        PercentOfTotalGain: Number(r.percentOfTotalGain.toFixed(2)),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TaxReport');
      XLSX.writeFile(wb, `tax-report_${this.userEmail || 'user'}_${this.todayStr()}.xlsx`);
      this.messageService.add({
        severity: 'success',
        summary: 'Export',
        detail: `Exported ${rows.length} rows to Excel`,
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Export failed',
        detail: 'Could not generate Excel file',
      });
    }
  }

  /** CSV builder for the per-stock table. Mirrors transactions-table's toCsv. */
  toCsv(rows: PerStockTaxRow[]): string {
    const headers = [
      'Stock', 'Code', 'AssetType', 'BuyQty', 'BuyValue',
      'SellQty', 'SellValue', 'NetQty', 'RealizedGain', 'Period', 'PercentOfTotalGain',
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      const cells = [
        r.stockName, r.stockCode, r.assetType,
        r.buyQty, r.buyValue,
        r.sellQty, r.sellValue, r.netQty, r.gain,
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
}
