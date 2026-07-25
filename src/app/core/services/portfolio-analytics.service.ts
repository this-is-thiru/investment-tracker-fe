import { Injectable } from '@angular/core';
import { TransactionsResponse } from '@models/transactions-response.model';

// =============================================================================
// Public types — exported so spec, downstream pages, and other chunks can
// import them. The first three (`SummaryStats`, `HoldingRow`, `InsightItem`)
// are verbatim copies of the interfaces that previously lived inside
// `transactions-table.component.ts`; the rest are new.
// =============================================================================

/**
 * Row produced by `mergeTransactions`. Identical to `TransactionsResponse` but
 * tagged with the source bucket so callers can distinguish temp uploads from
 * committed portfolio entries without losing any of the original fields.
 */
export type MergedTransaction = TransactionsResponse & {
  _source: 'temp' | 'portfolio';
};

export type Tone = 'green' | 'red' | 'blue' | 'yellow' | 'purple';

export interface SummaryStats {
  count: number;
  totalInvested: number;
  totalSold: number;
  netInvested: number;
  totalCharges: number;
  topStock: { name: string; code: string; count: number; totalValue: number } | null;
}

export interface HoldingRow {
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

export interface InsightItem {
  icon: string;
  title: string;
  detail: string;
  tone: Tone;
}

export interface RealizedGain {
  stockCode: string;
  stockName: string;
  assetType: string;
  sellDate: string;
  sellQty: number;
  sellValue: number;
  /** ISO date of the matched BUY lot, or `null` for short-sell residual. */
  buyDate: string | null;
  buyQty: number;
  /** Cost basis of the matched BUY lot portion; 0 for short-sell residual. */
  buyValue: number;
  /** sellValue − buyValue; negative for short-sell residual. */
  gain: number;
  holdingPeriod: 'ST' | 'LT' | 'UNKNOWN';
  /** Indian FY of the SELL date. */
  financialYear: string;
}

export interface RealizedGainByFy {
  financialYear: string;
  sellValue: number;
  gain: number;
  stcg: number;
  ltcg: number;
  count: number;
}

export interface RealizedGainByAsset {
  assetType: string;
  sellValue: number;
  gain: number;
  stcg: number;
  ltcg: number;
  count: number;
}

export interface CapitalGainsSummary {
  totalGain: number;
  stcg: number;
  ltcg: number;
  totalSellValue: number;
  totalCharges: number;
  byFy: RealizedGainByFy[];
  byAssetType: RealizedGainByAsset[];
}

export interface AllocationSlice {
  label: string;
  value: number;
  /** Percent (0–100) of total BUY value, rounded to 1 decimal. */
  pct: number;
}

export interface BrokerSlice {
  broker: string;
  count: number;
  buyValue: number;
  sellValue: number;
  totalValue: number;
  pct: number;
}

export interface ExchangeSlice {
  exchange: string;
  count: number;
  buyValue: number;
  sellValue: number;
  totalValue: number;
  pct: number;
}

export interface MonthlyActivity {
  /** `YYYY-MM` bucket. */
  month: string;
  buyValue: number;
  sellValue: number;
  buyCount: number;
  sellCount: number;
}

export interface PerStockPnl {
  stockCode: string;
  stockName: string;
  assetType: string;
  /** Sum of realized gains across all SELLs of this stock. */
  gain: number;
  sellValue: number;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Pure, stateless analytics. All methods are referentially transparent — no
 * Angular DI, no constructor work, no input mutation, no side effects. Any
 * component (existing or future) can inject and call it.
 *
 * Numeric safety: every numeric read goes through `safeNum()`, which
 * substitutes 0 for `null` / `undefined` / `NaN` / `±Infinity`. This means
 * callers can pass partially-validated backend rows without guarding each
 * field themselves.
 */
@Injectable({ providedIn: 'root' })
export class PortfolioAnalyticsService {
  // ---------------------------------------------------------------------------
  // Numeric safety + rounding helpers (private)
  // ---------------------------------------------------------------------------

  /** Treats null / undefined / NaN / ±Infinity as 0. */
  private safeNum(v: number | null | undefined): number {
    if (v === null || v === undefined) return 0;
    return Number.isFinite(v) ? v : 0;
  }

  private round1(v: number): number {
    return Math.round(v * 10) / 10;
  }

  private round2(v: number): number {
    return Math.round(v * 100) / 100;
  }

  // ---------------------------------------------------------------------------
  // mergeTransactions
  // ---------------------------------------------------------------------------

  /**
   * Concatenates the two source arrays and tags each row with `_source`. Uses
   * shallow spread (`{ ...row, _source }`) so the original row objects are
   * never mutated — verified by the spec test.
   */
  mergeTransactions(
    temp: TransactionsResponse[],
    portfolio: TransactionsResponse[]
  ): MergedTransaction[] {
    const tagged: MergedTransaction[] = [];
    if (temp?.length) {
      for (const t of temp) tagged.push({ ...t, _source: 'temp' });
    }
    if (portfolio?.length) {
      for (const p of portfolio) tagged.push({ ...p, _source: 'portfolio' });
    }
    return tagged;
  }

  // ---------------------------------------------------------------------------
  // computeStats — verbatim from transactions-table.component.ts
  // ---------------------------------------------------------------------------

  computeStats(rows: TransactionsResponse[]): SummaryStats {
    const count = rows.length;
    let totalInvested = 0;
    let totalSold = 0;
    let totalCharges = 0;
    const stockCounts = new Map<string, { name: string; code: string; count: number; totalValue: number }>();
    for (const r of rows) {
      totalCharges += this.safeNum(r.brokerCharges) + this.safeNum(r.miscCharges);
      if (r.transactionType === 'BUY') totalInvested += this.safeNum(r.totalValue);
      else if (r.transactionType === 'SELL') totalSold += this.safeNum(r.totalValue);
      const key = r.stockCode || r.stockName || 'unknown';
      const existing = stockCounts.get(key);
      if (existing) {
        existing.count += 1;
        existing.totalValue += this.safeNum(r.totalValue);
      } else {
        stockCounts.set(key, {
          name: r.stockName,
          code: r.stockCode,
          count: 1,
          totalValue: this.safeNum(r.totalValue),
        });
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

  // ---------------------------------------------------------------------------
  // computeHoldings — verbatim from transactions-table.component.ts
  // ---------------------------------------------------------------------------

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
      const qty = this.safeNum(r.quantity);
      const value = this.safeNum(r.totalValue);
      if (r.transactionType === 'BUY') {
        h.totalBought += qty;
        h.totalInvested += value;
      } else if (r.transactionType === 'SELL') {
        h.totalSold += qty;
        h.totalSoldValue += value;
      }
      h.netHeld = h.totalBought - h.totalSold;
      h.netInvested = h.totalInvested - h.totalSoldValue;
      h.totalCharges += this.safeNum(r.brokerCharges) + this.safeNum(r.miscCharges);
      if (r.transactionDate) {
        if (!h.firstDate || r.transactionDate < h.firstDate) h.firstDate = r.transactionDate;
        if (!h.lastDate || r.transactionDate > h.lastDate) h.lastDate = r.transactionDate;
      }
      if (r.transactionType === 'BUY') {
        totalAllInvested += value;
      }
    }
    for (const h of map.values()) {
      h.avgPrice = h.totalBought > 0 ? h.totalInvested / h.totalBought : 0;
      h.sharePercent = totalAllInvested > 0 ? (h.totalInvested / totalAllInvested) * 100 : 0;
    }
    return Array.from(map.values()).sort((a, b) => b.totalInvested - a.totalInvested);
  }

  // ---------------------------------------------------------------------------
  // computeInsights — verbatim from transactions-table.component.ts
  // ---------------------------------------------------------------------------

  computeInsights(rows: TransactionsResponse[], stats: SummaryStats): InsightItem[] {
    const out: InsightItem[] = [];
    if (rows.length === 0) return out;

    // Biggest broker by transaction count
    const brokerCounts = new Map<string, { count: number; totalValue: number }>();
    for (const r of rows) {
      const key = r.brokerName || 'Unknown';
      const existing = brokerCounts.get(key);
      if (existing) {
        existing.count += 1;
        existing.totalValue += this.safeNum(r.totalValue);
      } else brokerCounts.set(key, { count: 1, totalValue: this.safeNum(r.totalValue) });
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
      if (existing) {
        existing.count += 1;
        existing.totalValue += this.safeNum(r.totalValue);
      } else assetCounts.set(key, { count: 1, totalValue: this.safeNum(r.totalValue) });
    }
    const totalValue = rows.reduce((s, r) => s + this.safeNum(r.totalValue), 0);
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

  // ---------------------------------------------------------------------------
  // Indian Financial Year helpers
  // ---------------------------------------------------------------------------

  /**
   * Indian financial year for an ISO `YYYY-MM-DD` date.
   *
   *   2024-03-31 → '2023-24'  (still in FY that started Apr 2023)
   *   2024-04-01 → '2024-25'  (first day of next FY)
   *   2023-04-01 → '2023-24'
   *   2025-01-15 → '2024-25'
   *
   * Returns `''` for missing / unparseable input.
   */
  getFinancialYearOf(isoDate: string): string {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
    if (!m) return '';
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return '';
    if (month >= 4) {
      return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
    }
    return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
  }

  /**
   * Distinct Indian financial years present in the rows, sorted ascending.
   * Returns `[]` for an empty input.
   */
  deriveFinancialYears(rows: TransactionsResponse[]): string[] {
    if (!rows || rows.length === 0) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const fy = this.getFinancialYearOf(r.transactionDate);
      if (fy) set.add(fy);
    }
    return Array.from(set).sort();
  }

  // ---------------------------------------------------------------------------
  // Holding-period classification
  // ---------------------------------------------------------------------------

  /**
   * ST vs LT per Indian tax convention:
   *   - Equity / MF / ETF / OTHER: < 12 calendar months → ST, ≥ 12 → LT
   *   - DEBT:                       < 36 calendar months → ST, ≥ 36 → LT
   *
   * Returns `'UNKNOWN'` if either date is missing / unparseable.
   *
   * Implementation note: uses calendar-month delta (sell.year*12+sell.month −
   * buy.year*12−buy.month, then −1 if sell.day < buy.day) so the boundary is
   * a complete calendar-month count rather than a days-count threshold.
   * This matches the spec test cases (364/365-day, 1000/1100-day for DEBT)
   * exactly.
   */
  classifyHoldingPeriod(
    buyDateIso: string,
    sellDateIso: string,
    assetType: string
  ): 'ST' | 'LT' | 'UNKNOWN' {
    if (!buyDateIso || !sellDateIso) return 'UNKNOWN';
    const buy = new Date(buyDateIso);
    const sell = new Date(sellDateIso);
    if (Number.isNaN(buy.getTime()) || Number.isNaN(sell.getTime())) return 'UNKNOWN';

    let months =
      (sell.getFullYear() - buy.getFullYear()) * 12 +
      (sell.getMonth() - buy.getMonth());
    if (sell.getDate() < buy.getDate()) months -= 1;

    const threshold = assetType === 'DEBT' ? 36 : 12;
    return months >= threshold ? 'LT' : 'ST';
  }

  // ---------------------------------------------------------------------------
  // FIFO realized gains
  // ---------------------------------------------------------------------------

  /**
   * Walk per-stock transaction history chronologically, matching each SELL
   * against the oldest BUY lots first (FIFO cost-basis matching).
   *
   * Output: one `RealizedGain` record per (SELL × BUY lot) pairing. A single
   * SELL that consumes multiple BUY lots therefore produces multiple records.
   * A SELL exceeding available inventory produces one extra record for the
   * residual with `buyDate: null`, `buyValue: 0`, `gain: -sellValue`,
   * `holdingPeriod: 'UNKNOWN'` (short-sell).
   */
  computeFifoRealizedGains(rows: TransactionsResponse[]): RealizedGain[] {
    const out: RealizedGain[] = [];
    if (!rows || rows.length === 0) return out;

    // Group by stockCode (fallback to stockName, then 'unknown')
    const byStock = new Map<string, TransactionsResponse[]>();
    for (const r of rows) {
      const key = r.stockCode || r.stockName || 'unknown';
      if (!byStock.has(key)) byStock.set(key, []);
      byStock.get(key)!.push(r);
    }

    for (const [stockCode, txns] of byStock) {
      // Stable sort by ISO date asc; ties keep input order.
      const sorted = [...txns].sort((a, b) => {
        const ad = a.transactionDate || '';
        const bd = b.transactionDate || '';
        if (ad < bd) return -1;
        if (ad > bd) return 1;
        return 0;
      });

      // FIFO queue of buy lots
      const lots: Array<{
        buyDate: string;
        qtyRemaining: number;
        costRemaining: number;
        assetType: string;
        stockName: string;
      }> = [];

      for (const t of sorted) {
        const qty = this.safeNum(t.quantity);
        const value = this.safeNum(t.totalValue);

        if (t.transactionType === 'BUY') {
          if (qty > 0 || value > 0) {
            lots.push({
              buyDate: t.transactionDate,
              qtyRemaining: qty,
              costRemaining: value,
              assetType: t.assetType,
              stockName: t.stockName,
            });
          }
        } else if (t.transactionType === 'SELL') {
          const unitSellPrice = qty > 0 ? value / qty : 0;
          let remaining = qty;
          const sellDate = t.transactionDate;
          const sellAssetType = t.assetType;
          const sellStockName = t.stockName;
          const fy = this.getFinancialYearOf(sellDate);

          while (remaining > 0 && lots.length > 0) {
            const lot = lots[0];
            const take = Math.min(lot.qtyRemaining, remaining);
            const unitCost =
              lot.qtyRemaining > 0 ? lot.costRemaining / lot.qtyRemaining : 0;
            const consumedCost = take * unitCost;
            const consumedSellValue = take * unitSellPrice;
            const gain = consumedSellValue - consumedCost;
            out.push({
              stockCode,
              stockName: lot.stockName,
              assetType: lot.assetType,
              sellDate,
              sellQty: take,
              sellValue: consumedSellValue,
              buyDate: lot.buyDate,
              buyQty: take,
              buyValue: consumedCost,
              gain,
              holdingPeriod: this.classifyHoldingPeriod(
                lot.buyDate,
                sellDate,
                lot.assetType
              ),
              financialYear: fy,
            });
            lot.qtyRemaining -= take;
            lot.costRemaining -= consumedCost;
            remaining -= take;
            if (lot.qtyRemaining <= 0) lots.shift();
          }

          // Residual short-sell
          if (remaining > 0) {
            const consumedSellValue = remaining * unitSellPrice;
            out.push({
              stockCode,
              stockName: sellStockName,
              assetType: sellAssetType,
              sellDate,
              sellQty: remaining,
              sellValue: consumedSellValue,
              buyDate: null,
              buyQty: 0,
              buyValue: 0,
              gain: -consumedSellValue,
              holdingPeriod: 'UNKNOWN',
              financialYear: fy,
            });
          }
        }
      }
    }

    return out;
  }

  // ---------------------------------------------------------------------------
  // Capital-gains summary
  // ---------------------------------------------------------------------------

  /**
   * Aggregates `computeFifoRealizedGains` into totals + by-FY + by-asset-type
   * breakdowns. If `fy` is given, only rows whose transactionDate falls in
   * that FY are considered.
   */
  computeCapitalGainsSummary(
    rows: TransactionsResponse[],
    fy?: string
  ): CapitalGainsSummary {
    let inScope: TransactionsResponse[];
    if (fy) {
      // For FY-filtered gains we need all BUYs for FIFO cost basis, plus
      // only SELLs that fall in the requested FY.
      const sellsInFy = rows.filter(
        (r) =>
          r.transactionType === 'SELL' &&
          this.getFinancialYearOf(r.transactionDate) === fy,
      );
      const allBuys = rows.filter((r) => r.transactionType === 'BUY');
      inScope = [...allBuys, ...sellsInFy];
    } else {
      inScope = rows;
    }

    const gains = this.computeFifoRealizedGains(inScope);

    let totalGain = 0;
    let stcg = 0;
    let ltcg = 0;
    let totalSellValue = 0;
    for (const g of gains) {
      totalGain += g.gain;
      totalSellValue += g.sellValue;
      if (g.holdingPeriod === 'ST') stcg += g.gain;
      else if (g.holdingPeriod === 'LT') ltcg += g.gain;
    }

    // Charges for every row in scope (BUYs + SELLs), matching how the rest of
    // the app reports charges per FY.
    let totalCharges = 0;
    for (const r of inScope) {
      totalCharges += this.safeNum(r.brokerCharges) + this.safeNum(r.miscCharges);
    }

    // byFy
    const byFyMap = new Map<string, RealizedGainByFy>();
    for (const g of gains) {
      let e = byFyMap.get(g.financialYear);
      if (!e) {
        e = { financialYear: g.financialYear, sellValue: 0, gain: 0, stcg: 0, ltcg: 0, count: 0 };
        byFyMap.set(g.financialYear, e);
      }
      e.sellValue += g.sellValue;
      e.gain += g.gain;
      e.count += 1;
      if (g.holdingPeriod === 'ST') e.stcg += g.gain;
      else if (g.holdingPeriod === 'LT') e.ltcg += g.gain;
    }
    const byFy = Array.from(byFyMap.values()).sort((a, b) =>
      a.financialYear < b.financialYear ? -1 : a.financialYear > b.financialYear ? 1 : 0
    );

    // byAssetType
    const byAssetMap = new Map<string, RealizedGainByAsset>();
    for (const g of gains) {
      let e = byAssetMap.get(g.assetType);
      if (!e) {
        e = { assetType: g.assetType, sellValue: 0, gain: 0, stcg: 0, ltcg: 0, count: 0 };
        byAssetMap.set(g.assetType, e);
      }
      e.sellValue += g.sellValue;
      e.gain += g.gain;
      e.count += 1;
      if (g.holdingPeriod === 'ST') e.stcg += g.gain;
      else if (g.holdingPeriod === 'LT') e.ltcg += g.gain;
    }
    const byAssetType = Array.from(byAssetMap.values()).sort(
      (a, b) => b.gain - a.gain
    );

    return { totalGain, stcg, ltcg, totalSellValue, totalCharges, byFy, byAssetType };
  }

  // ---------------------------------------------------------------------------
  // Asset / Broker / Exchange breakdowns
  // ---------------------------------------------------------------------------

  /**
   * Cost basis of money deployed, grouped by assetType. Only BUY
   * transactions contribute (a SELL is a recovery, not new deployment).
   *
   * Note on rounding: per-slice pct is rounded to 1 decimal, so the sum of
   * pcts may differ from 100 by up to a few tenths — that's expected.
   */
  computeAssetAllocation(rows: TransactionsResponse[]): AllocationSlice[] {
    if (!rows || rows.length === 0) return [];
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.transactionType === 'BUY') {
        const key = r.assetType || 'Unknown';
        map.set(key, (map.get(key) ?? 0) + this.safeNum(r.totalValue));
      }
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([label, value]) => ({
        label,
        value: this.round2(value),
        pct: total > 0 ? this.round1((value / total) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return a.label.localeCompare(b.label);
      });
  }

  /**
   * Per-broker aggregation. `pct` is this broker's share of grand-total
   * transaction value (BUY + SELL combined).
   */
  computeBrokerBreakdown(rows: TransactionsResponse[]): BrokerSlice[] {
    if (!rows || rows.length === 0) return [];
    const map = new Map<string, { count: number; buyValue: number; sellValue: number; totalValue: number }>();
    for (const r of rows) {
      const key = r.brokerName || 'Unknown';
      let e = map.get(key);
      if (!e) {
        e = { count: 0, buyValue: 0, sellValue: 0, totalValue: 0 };
        map.set(key, e);
      }
      const v = this.safeNum(r.totalValue);
      e.count += 1;
      e.totalValue += v;
      if (r.transactionType === 'BUY') e.buyValue += v;
      else if (r.transactionType === 'SELL') e.sellValue += v;
    }
    const grand = Array.from(map.values()).reduce((s, e) => s + e.totalValue, 0);
    return Array.from(map.entries())
      .map(([broker, e]) => ({
        broker,
        count: e.count,
        buyValue: this.round2(e.buyValue),
        sellValue: this.round2(e.sellValue),
        totalValue: this.round2(e.totalValue),
        pct: grand > 0 ? this.round1((e.totalValue / grand) * 100) : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }

  /** Same shape as `computeBrokerBreakdown`, grouped by `exchangeName`. */
  computeExchangeBreakdown(rows: TransactionsResponse[]): ExchangeSlice[] {
    if (!rows || rows.length === 0) return [];
    const map = new Map<string, { count: number; buyValue: number; sellValue: number; totalValue: number }>();
    for (const r of rows) {
      const key = r.exchangeName || 'Unknown';
      let e = map.get(key);
      if (!e) {
        e = { count: 0, buyValue: 0, sellValue: 0, totalValue: 0 };
        map.set(key, e);
      }
      const v = this.safeNum(r.totalValue);
      e.count += 1;
      e.totalValue += v;
      if (r.transactionType === 'BUY') e.buyValue += v;
      else if (r.transactionType === 'SELL') e.sellValue += v;
    }
    const grand = Array.from(map.values()).reduce((s, e) => s + e.totalValue, 0);
    return Array.from(map.entries())
      .map(([exchange, e]) => ({
        exchange,
        count: e.count,
        buyValue: this.round2(e.buyValue),
        sellValue: this.round2(e.sellValue),
        totalValue: this.round2(e.totalValue),
        pct: grand > 0 ? this.round1((e.totalValue / grand) * 100) : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }

  // ---------------------------------------------------------------------------
  // Monthly activity
  // ---------------------------------------------------------------------------

  /**
   * Buckets transactions by `'YYYY-MM'` of `transactionDate`. Empty months
   * between the first and last activity are NOT invented — only months with
   * at least one transaction appear in the output. Sorted ascending.
   */
  computeMonthlyActivity(rows: TransactionsResponse[]): MonthlyActivity[] {
    if (!rows || rows.length === 0) return [];
    const map = new Map<string, MonthlyActivity>();
    for (const r of rows) {
      if (!r.transactionDate) continue;
      const month = r.transactionDate.substring(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) continue;
      let m = map.get(month);
      if (!m) {
        m = { month, buyValue: 0, sellValue: 0, buyCount: 0, sellCount: 0 };
        map.set(month, m);
      }
      const v = this.safeNum(r.totalValue);
      if (r.transactionType === 'BUY') {
        m.buyValue += v;
        m.buyCount += 1;
      } else if (r.transactionType === 'SELL') {
        m.sellValue += v;
        m.sellCount += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.month < b.month ? -1 : a.month > b.month ? 1 : 0
    );
  }

  // ---------------------------------------------------------------------------
  // Top movers
  // ---------------------------------------------------------------------------

  /**
   * For each stock, sum realized gain across all SELLs. Winners = top-N
   * stocks by gain (descending). Losers = bottom-N stocks by gain
   * (ascending — most negative first). `limit` defaults to 5.
   */
  computeTopMovers(
    rows: TransactionsResponse[],
    limit = 5
  ): { winners: PerStockPnl[]; losers: PerStockPnl[] } {
    const gains = this.computeFifoRealizedGains(rows);
    const map = new Map<string, PerStockPnl>();
    for (const g of gains) {
      let p = map.get(g.stockCode);
      if (!p) {
        p = {
          stockCode: g.stockCode,
          stockName: g.stockName,
          assetType: g.assetType,
          gain: 0,
          sellValue: 0,
        };
        map.set(g.stockCode, p);
      }
      p.gain += g.gain;
      p.sellValue += g.sellValue;
    }
    const arr = Array.from(map.values()).sort((a, b) => b.gain - a.gain);
    const winners = arr.slice(0, limit);
    // Bottom-N in ascending order (most negative first).
    const losers = arr.slice(-limit).reverse();
    return { winners, losers };
  }
}
