import { PortfolioAnalyticsService } from './portfolio-analytics.service';
import { TransactionsResponse } from '@models/transactions-response.model';

// =============================================================================
// Fixtures
// =============================================================================

/** Small helper to build a TransactionsResponse with sensible defaults. */
function txn(over: Partial<TransactionsResponse> & {
  stockCode: string;
  transactionType: 'BUY' | 'SELL';
  quantity: number;
  totalValue: number;
  transactionDate: string;
}): TransactionsResponse {
  return {
    id: over.id ?? Math.floor(Math.random() * 1000000),
    email: over.email ?? 'test@example.com',
    stockName: over.stockName ?? over.stockCode,
    assetType: over.assetType ?? 'EQUITY',
    exchangeName: over.exchangeName ?? 'NSE',
    brokerName: over.brokerName ?? 'Zerodha',
    price: over.price ?? (over.quantity > 0 ? over.totalValue / over.quantity : 0),
    ...over,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PortfolioAnalyticsService', () => {
  let svc: PortfolioAnalyticsService;

  beforeEach(() => {
    svc = new PortfolioAnalyticsService();
  });

  // ---------------------------------------------------------------------------
  // getFinancialYearOf
  // ---------------------------------------------------------------------------
  describe('getFinancialYearOf (Indian FY, Apr–Mar)', () => {
    const cases: Array<[string, string]> = [
      ['2024-03-31', '2023-24'], // last day of FY 2023-24
      ['2024-04-01', '2024-25'], // first day of FY 2024-25
      ['2023-04-01', '2023-24'],
      ['2025-01-15', '2024-25'],
      ['2023-12-31', '2023-24'],
      ['2026-01-01', '2025-26'],
    ];
    for (const [iso, expected] of cases) {
      it(`${iso} → '${expected}'`, () => {
        expect(svc.getFinancialYearOf(iso)).toBe(expected);
      });
    }

    it('returns "" for missing input', () => {
      expect(svc.getFinancialYearOf('')).toBe('');
      expect(svc.getFinancialYearOf(undefined as unknown as string)).toBe('');
    });

    it('returns "" for unparseable input', () => {
      expect(svc.getFinancialYearOf('not-a-date')).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // deriveFinancialYears
  // ---------------------------------------------------------------------------
  describe('deriveFinancialYears', () => {
    it('returns [] for empty input', () => {
      expect(svc.deriveFinancialYears([])).toEqual([]);
    });

    it('returns distinct FYs sorted ascending', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'A', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2023-06-15' }),
        txn({ stockCode: 'B', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2024-05-15' }),
        txn({ stockCode: 'C', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2022-12-15' }),
        // Duplicate year — should not appear twice.
        txn({ stockCode: 'D', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2023-08-15' }),
      ];
      expect(svc.deriveFinancialYears(rows)).toEqual(['2022-23', '2023-24', '2024-25']);
    });
  });

  // ---------------------------------------------------------------------------
  // classifyHoldingPeriod
  // ---------------------------------------------------------------------------
  describe('classifyHoldingPeriod', () => {
    const cases: Array<{ label: string; buy: string; sell: string; asset: string; expected: 'ST' | 'LT' | 'UNKNOWN' }> = [
      { label: '364 days, EQUITY → ST', buy: '2023-01-15', sell: '2024-01-13', asset: 'EQUITY', expected: 'ST' },
      { label: '365 days, EQUITY → LT', buy: '2023-01-15', sell: '2024-01-15', asset: 'EQUITY', expected: 'LT' },
      { label: '730 days, EQUITY → LT', buy: '2023-01-15', sell: '2025-01-15', asset: 'EQUITY', expected: 'LT' },
      { label: '1000 days, DEBT → ST',  buy: '2023-01-15', sell: '2025-10-15', asset: 'DEBT',   expected: 'ST' },
      { label: '1100 days, DEBT → LT',  buy: '2023-01-15', sell: '2026-01-15', asset: 'DEBT',   expected: 'LT' },
      { label: 'same day → ST',          buy: '2024-06-15', sell: '2024-06-15', asset: 'EQUITY', expected: 'ST' },
    ];
    for (const c of cases) {
      it(c.label, () => {
        expect(svc.classifyHoldingPeriod(c.buy, c.sell, c.asset)).toBe(c.expected);
      });
    }

    it('returns UNKNOWN when buyDate is missing', () => {
      expect(svc.classifyHoldingPeriod('', '2024-01-01', 'EQUITY')).toBe('UNKNOWN');
    });

    it('returns UNKNOWN when sellDate is missing', () => {
      expect(svc.classifyHoldingPeriod('2023-01-01', '', 'EQUITY')).toBe('UNKNOWN');
    });

    it('returns UNKNOWN when dates are invalid', () => {
      expect(svc.classifyHoldingPeriod('not-a-date', '2024-01-01', 'EQUITY')).toBe('UNKNOWN');
    });
  });

  // ---------------------------------------------------------------------------
  // computeFifoRealizedGains
  // ---------------------------------------------------------------------------
  describe('computeFifoRealizedGains', () => {
    it('single BUY → single SELL, matched 1:1', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'AAPL', transactionType: 'BUY',  quantity: 100, totalValue: 10000, transactionDate: '2023-01-01' }),
        txn({ stockCode: 'AAPL', transactionType: 'SELL', quantity: 100, totalValue: 15000, transactionDate: '2024-01-01' }),
      ];
      const gains = svc.computeFifoRealizedGains(rows);
      expect(gains.length).toBe(1);
      expect(gains[0].buyDate).toBe('2023-01-01');
      expect(gains[0].sellQty).toBe(100);
      expect(gains[0].buyQty).toBe(100);
      expect(gains[0].sellValue).toBe(15000);
      expect(gains[0].buyValue).toBe(10000);
      expect(gains[0].gain).toBe(5000);
      // 365-day EQUITY → LT
      expect(gains[0].holdingPeriod).toBe('LT');
      expect(gains[0].financialYear).toBe('2023-24'); // sell 2024-01-01 is in FY 2023-24
    });

    it('partial SELL consumes oldest lots first (FIFO)', () => {
      const rows: TransactionsResponse[] = [
        // Day 1:  BUY 50 @ 100
        txn({ stockCode: 'AAPL', transactionType: 'BUY',  quantity: 50, totalValue: 5000, transactionDate: '2023-01-01' }),
        // Day 30: BUY 50 @ 200
        txn({ stockCode: 'AAPL', transactionType: 'BUY',  quantity: 50, totalValue: 10000, transactionDate: '2023-01-30' }),
        // Day 60: SELL 60 @ 250 — consumes all 50 from day 1 + 10 from day 30
        txn({ stockCode: 'AAPL', transactionType: 'SELL', quantity: 60, totalValue: 15000, transactionDate: '2023-03-01' }),
      ];
      const gains = svc.computeFifoRealizedGains(rows);
      expect(gains.length).toBe(2);

      // Record 1 — fully consumes the day-1 lot.
      expect(gains[0].buyDate).toBe('2023-01-01');
      expect(gains[0].buyQty).toBe(50);
      expect(gains[0].sellQty).toBe(50);
      expect(gains[0].buyValue).toBe(5000);
      expect(gains[0].sellValue).toBe(12500);
      expect(gains[0].gain).toBe(7500);

      // Record 2 — consumes 10 from the day-30 lot.
      expect(gains[1].buyDate).toBe('2023-01-30');
      expect(gains[1].buyQty).toBe(10);
      expect(gains[1].sellQty).toBe(10);
      expect(gains[1].buyValue).toBe(2000);
      expect(gains[1].sellValue).toBe(2500);
      expect(gains[1].gain).toBe(500);
    });

    it('SELL before any BUY produces a short-sell record', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'TSLA', transactionType: 'SELL', quantity: 10, totalValue: 2000, transactionDate: '2024-01-01' }),
      ];
      const gains = svc.computeFifoRealizedGains(rows);
      expect(gains.length).toBe(1);
      expect(gains[0].buyDate).toBeNull();
      expect(gains[0].buyValue).toBe(0);
      expect(gains[0].sellValue).toBe(2000);
      expect(gains[0].gain).toBe(-2000);
      expect(gains[0].holdingPeriod).toBe('UNKNOWN');
    });

    it('SELL exceeding available BUY lot quantity → consumed + short-sell residual', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'AAPL', transactionType: 'BUY',  quantity: 30, totalValue: 3000, transactionDate: '2023-01-01' }),
        // Sell 50 when only 30 available.
        txn({ stockCode: 'AAPL', transactionType: 'SELL', quantity: 50, totalValue: 10000, transactionDate: '2023-06-01' }),
      ];
      const gains = svc.computeFifoRealizedGains(rows);
      expect(gains.length).toBe(2);

      // Consumed portion — full 30 from the BUY lot.
      expect(gains[0].buyDate).toBe('2023-01-01');
      expect(gains[0].buyQty).toBe(30);
      expect(gains[0].sellQty).toBe(30);
      // Proportional sell value: 30/50 * 10000 = 6000
      expect(gains[0].sellValue).toBe(6000);
      expect(gains[0].buyValue).toBe(3000);
      expect(gains[0].gain).toBe(3000);

      // Residual short-sell — 20 units, no matching BUY lot.
      expect(gains[1].buyDate).toBeNull();
      expect(gains[1].buyQty).toBe(0);
      expect(gains[1].sellQty).toBe(20);
      expect(gains[1].sellValue).toBe(4000);
      expect(gains[1].buyValue).toBe(0);
      expect(gains[1].gain).toBe(-4000);
      expect(gains[1].holdingPeriod).toBe('UNKNOWN');
    });

    it('FIFO processes stocks independently', () => {
      const rows: TransactionsResponse[] = [
        // Stock A
        txn({ stockCode: 'AAA', transactionType: 'BUY',  quantity: 10, totalValue: 1000, transactionDate: '2023-01-01' }),
        txn({ stockCode: 'AAA', transactionType: 'SELL', quantity: 10, totalValue: 2000, transactionDate: '2023-06-01' }),
        // Stock B
        txn({ stockCode: 'BBB', transactionType: 'BUY',  quantity: 5,  totalValue: 500,  transactionDate: '2023-02-01' }),
        txn({ stockCode: 'BBB', transactionType: 'SELL', quantity: 5,  totalValue: 1500, transactionDate: '2023-07-01' }),
      ];
      const gains = svc.computeFifoRealizedGains(rows);
      expect(gains.length).toBe(2);
      const codes = gains.map((g) => g.stockCode).sort();
      expect(codes).toEqual(['AAA', 'BBB']);
      const a = gains.find((g) => g.stockCode === 'AAA')!;
      const b = gains.find((g) => g.stockCode === 'BBB')!;
      expect(a.gain).toBe(1000); // 2000 - 1000
      expect(b.gain).toBe(1000); // 1500 - 500
    });

    it('returns [] for empty input', () => {
      expect(svc.computeFifoRealizedGains([])).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // computeCapitalGainsSummary
  // ---------------------------------------------------------------------------
  describe('computeCapitalGainsSummary', () => {
    it('empty input → zeros and empty breakdowns', () => {
      const s = svc.computeCapitalGainsSummary([]);
      expect(s.totalGain).toBe(0);
      expect(s.stcg).toBe(0);
      expect(s.ltcg).toBe(0);
      expect(s.totalSellValue).toBe(0);
      expect(s.totalCharges).toBe(0);
      expect(s.byFy).toEqual([]);
      expect(s.byAssetType).toEqual([]);
    });

    it('single BUY+SELL pair: totalGain = sellValue − buyValue', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'AAPL', transactionType: 'BUY',  quantity: 100, totalValue: 10000, transactionDate: '2023-01-01',
              brokerCharges: 10, miscCharges: 5 }),
        txn({ stockCode: 'AAPL', transactionType: 'SELL', quantity: 100, totalValue: 15000, transactionDate: '2024-01-01',
              brokerCharges: 8,  miscCharges: 2 }),
      ];
      const s = svc.computeCapitalGainsSummary(rows);
      expect(s.totalGain).toBe(5000);
      expect(s.ltcg).toBe(5000);   // 12 months exactly → LT
      expect(s.stcg).toBe(0);
      expect(s.totalSellValue).toBe(15000);
      expect(s.totalCharges).toBe(25); // 10+5 + 8+2
    });

    it('multi-stock mix: byFy and byAssetType group correctly', () => {
      const rows: TransactionsResponse[] = [
        // Stock A: EQUITY, FY 2023-24 (sell 2024-01-01 is in FY 2023-24)
        txn({ stockCode: 'AAA', assetType: 'EQUITY', transactionType: 'BUY',  quantity: 10, totalValue: 1000, transactionDate: '2023-01-01' }),
        txn({ stockCode: 'AAA', assetType: 'EQUITY', transactionType: 'SELL', quantity: 10, totalValue: 2000, transactionDate: '2024-01-01' }),
        // Stock B: MUTUAL_FUND, FY 2024-25 (sell 2024-08-01)
        txn({ stockCode: 'BBB', assetType: 'MUTUAL_FUND', transactionType: 'BUY',  quantity: 5, totalValue: 500, transactionDate: '2024-02-01' }),
        txn({ stockCode: 'BBB', assetType: 'MUTUAL_FUND', transactionType: 'SELL', quantity: 5, totalValue: 1500, transactionDate: '2024-08-01' }),
      ];
      const s = svc.computeCapitalGainsSummary(rows);
      expect(s.totalGain).toBe(1000 + 1000);
      expect(s.byFy.length).toBe(2);
      const fyNames = s.byFy.map((x) => x.financialYear).sort();
      expect(fyNames).toEqual(['2023-24', '2024-25']);
      expect(s.byAssetType.length).toBe(2);
      const assetNames = s.byAssetType.map((x) => x.assetType).sort();
      expect(assetNames).toEqual(['EQUITY', 'MUTUAL_FUND']);
    });

    it('with fy filter: only that FY contributes', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'AAA', transactionType: 'BUY',  quantity: 10, totalValue: 1000, transactionDate: '2023-01-01' }),
        txn({ stockCode: 'AAA', transactionType: 'SELL', quantity: 10, totalValue: 2000, transactionDate: '2024-01-01' }), // FY 2023-24
        txn({ stockCode: 'BBB', transactionType: 'BUY',  quantity: 5,  totalValue: 500,  transactionDate: '2024-02-01' }),
        txn({ stockCode: 'BBB', transactionType: 'SELL', quantity: 5,  totalValue: 1500, transactionDate: '2024-08-01' }), // FY 2024-25
      ];
      const only23 = svc.computeCapitalGainsSummary(rows, '2023-24');
      expect(only23.totalGain).toBe(1000);
      expect(only23.byFy.length).toBe(1);
      expect(only23.byFy[0].financialYear).toBe('2023-24');

      const only24 = svc.computeCapitalGainsSummary(rows, '2024-25');
      expect(only24.totalGain).toBe(1000);
      expect(only24.byFy.length).toBe(1);
      expect(only24.byFy[0].financialYear).toBe('2024-25');
    });
  });

  // ---------------------------------------------------------------------------
  // computeAssetAllocation
  // ---------------------------------------------------------------------------
  describe('computeAssetAllocation', () => {
    it('empty input → []', () => {
      expect(svc.computeAssetAllocation([])).toEqual([]);
    });

    it('3 BUYs across 2 asset types → 2 slices, percentages ≈ 100', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'A', assetType: 'EQUITY', transactionType: 'BUY', quantity: 1, totalValue: 10000, transactionDate: '2023-01-01' }),
        txn({ stockCode: 'B', assetType: 'EQUITY', transactionType: 'BUY', quantity: 1, totalValue: 5000,  transactionDate: '2023-02-01' }),
        txn({ stockCode: 'C', assetType: 'DEBT',   transactionType: 'BUY', quantity: 1, totalValue: 15000, transactionDate: '2023-03-01' }),
      ];
      const slices = svc.computeAssetAllocation(rows);
      expect(slices.length).toBe(2);
      // Sorted desc by value.
      expect(slices[0].label).toBe('DEBT');
      expect(slices[0].value).toBe(15000);
      expect(slices[0].pct).toBe(50);
      expect(slices[1].label).toBe('EQUITY');
      expect(slices[1].value).toBe(15000);
      expect(slices[1].pct).toBe(50);
      const totalPct = slices[0].pct + slices[1].pct;
      expect(Math.abs(totalPct - 100)).toBeLessThan(0.1);
    });

    it('SELL transactions do not contribute to allocation', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'A', assetType: 'EQUITY', transactionType: 'BUY',  quantity: 1, totalValue: 1000, transactionDate: '2023-01-01' }),
        txn({ stockCode: 'A', assetType: 'EQUITY', transactionType: 'SELL', quantity: 1, totalValue: 5000, transactionDate: '2023-02-01' }),
      ];
      const slices = svc.computeAssetAllocation(rows);
      expect(slices.length).toBe(1);
      expect(slices[0].value).toBe(1000);
    });
  });

  // ---------------------------------------------------------------------------
  // computeMonthlyActivity
  // ---------------------------------------------------------------------------
  describe('computeMonthlyActivity', () => {
    it('empty → []', () => {
      expect(svc.computeMonthlyActivity([])).toEqual([]);
    });

    it('3 months of activity → 3 entries sorted ascending', () => {
      const rows: TransactionsResponse[] = [
        // March — listed first intentionally to test sorting.
        txn({ stockCode: 'A', transactionType: 'BUY',  quantity: 1, totalValue: 500, transactionDate: '2023-03-15' }),
        txn({ stockCode: 'B', transactionType: 'BUY',  quantity: 1, totalValue: 1000, transactionDate: '2023-01-15' }),
        txn({ stockCode: 'C', transactionType: 'SELL', quantity: 1, totalValue: 2000, transactionDate: '2023-02-15' }),
      ];
      const m = svc.computeMonthlyActivity(rows);
      expect(m.length).toBe(3);
      expect(m.map((x) => x.month)).toEqual(['2023-01', '2023-02', '2023-03']);
      expect(m[0].buyValue).toBe(1000);
      expect(m[0].buyCount).toBe(1);
      expect(m[1].sellValue).toBe(2000);
      expect(m[1].sellCount).toBe(1);
      expect(m[2].buyValue).toBe(500);
      expect(m[2].buyCount).toBe(1);
    });

    it('multiple transactions in same month are bucketed together', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'A', transactionType: 'BUY',  quantity: 1, totalValue: 1000, transactionDate: '2023-02-15' }),
        txn({ stockCode: 'B', transactionType: 'SELL', quantity: 1, totalValue: 2000, transactionDate: '2023-02-20' }),
        txn({ stockCode: 'C', transactionType: 'BUY',  quantity: 1, totalValue: 500,  transactionDate: '2023-02-25' }),
      ];
      const m = svc.computeMonthlyActivity(rows);
      expect(m.length).toBe(1);
      expect(m[0].month).toBe('2023-02');
      expect(m[0].buyCount).toBe(2);
      expect(m[0].sellCount).toBe(1);
      expect(m[0].buyValue).toBe(1500);
      expect(m[0].sellValue).toBe(2000);
    });
  });

  // ---------------------------------------------------------------------------
  // mergeTransactions
  // ---------------------------------------------------------------------------
  describe('mergeTransactions', () => {
    it('empty inputs → []', () => {
      expect(svc.mergeTransactions([], [])).toEqual([]);
    });

    it('tags every row with _source correctly', () => {
      const temp: TransactionsResponse[] = [
        txn({ stockCode: 'TEMP1', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2023-01-01' }),
      ];
      const portfolio: TransactionsResponse[] = [
        txn({ stockCode: 'PORT1', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2023-02-01' }),
        txn({ stockCode: 'PORT2', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2023-03-01' }),
      ];
      const merged = svc.mergeTransactions(temp, portfolio);
      expect(merged.length).toBe(3);
      expect(merged[0]._source).toBe('temp');
      expect(merged[0].stockCode).toBe('TEMP1');
      expect(merged[1]._source).toBe('portfolio');
      expect(merged[1].stockCode).toBe('PORT1');
      expect(merged[2]._source).toBe('portfolio');
      expect(merged[2].stockCode).toBe('PORT2');
    });

    it('does NOT mutate the input arrays', () => {
      const tempRow = txn({ stockCode: 'TEMP1', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2023-01-01' });
      const portRow = txn({ stockCode: 'PORT1', transactionType: 'BUY', quantity: 1, totalValue: 1, transactionDate: '2023-02-01' });
      const temp = [tempRow];
      const portfolio = [portRow];
      svc.mergeTransactions(temp, portfolio);
      // Originals must be untouched.
      expect((tempRow as any)._source).toBeUndefined();
      expect((portRow as any)._source).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // computeStats / computeHoldings / computeInsights (smoke tests)
  // ---------------------------------------------------------------------------
  describe('computeStats (smoke)', () => {
    it('empty input → zeroed summary, no topStock', () => {
      const s = svc.computeStats([]);
      expect(s.count).toBe(0);
      expect(s.totalInvested).toBe(0);
      expect(s.totalSold).toBe(0);
      expect(s.netInvested).toBe(0);
      expect(s.totalCharges).toBe(0);
      expect(s.topStock).toBeNull();
    });

    it('non-empty input: counts BUYs, SELLs, charges, topStock', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'AAPL', stockName: 'Apple', transactionType: 'BUY',  quantity: 10, totalValue: 1000, transactionDate: '2023-01-01', brokerCharges: 5, miscCharges: 2 }),
        txn({ stockCode: 'AAPL', stockName: 'Apple', transactionType: 'BUY',  quantity: 5,  totalValue: 800,  transactionDate: '2023-01-15', brokerCharges: 3, miscCharges: 0 }),
        txn({ stockCode: 'AAPL', stockName: 'Apple', transactionType: 'SELL', quantity: 5,  totalValue: 1000, transactionDate: '2023-02-01', brokerCharges: 4, miscCharges: 1 }),
      ];
      const s = svc.computeStats(rows);
      expect(s.count).toBe(3);
      expect(s.totalInvested).toBe(1800);
      expect(s.totalSold).toBe(1000);
      expect(s.netInvested).toBe(800);
      expect(s.totalCharges).toBe(15);
      expect(s.topStock).not.toBeNull();
      expect(s.topStock!.code).toBe('AAPL');
      expect(s.topStock!.count).toBe(3);
    });
  });

  describe('computeHoldings (smoke)', () => {
    it('empty input → []', () => {
      expect(svc.computeHoldings([])).toEqual([]);
    });

    it('non-empty input: netHeld, avgPrice, sharePercent computed', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'AAPL', transactionType: 'BUY',  quantity: 10, totalValue: 1000, transactionDate: '2023-01-01' }),
        txn({ stockCode: 'AAPL', transactionType: 'SELL', quantity: 3,  totalValue: 600,  transactionDate: '2023-02-01' }),
      ];
      const h = svc.computeHoldings(rows);
      expect(h.length).toBe(1);
      expect(h[0].stockCode).toBe('AAPL');
      expect(h[0].totalBought).toBe(10);
      expect(h[0].totalSold).toBe(3);
      expect(h[0].netHeld).toBe(7);
      expect(h[0].totalInvested).toBe(1000);
      expect(h[0].totalSoldValue).toBe(600);
      expect(h[0].netInvested).toBe(400);
      expect(h[0].avgPrice).toBe(100); // 1000 / 10
      expect(h[0].sharePercent).toBe(100);
    });
  });

  describe('computeInsights (smoke)', () => {
    it('empty input → []', () => {
      const s = svc.computeStats([]);
      expect(svc.computeInsights([], s)).toEqual([]);
    });

    it('non-empty input: returns several insights with tones', () => {
      const rows: TransactionsResponse[] = [
        txn({ stockCode: 'AAPL', brokerName: 'Zerodha', assetType: 'EQUITY', transactionType: 'BUY', quantity: 10, totalValue: 1000, transactionDate: '2023-01-01' }),
        txn({ stockCode: 'GOOG',  brokerName: 'Zerodha', assetType: 'EQUITY', transactionType: 'BUY', quantity: 5,  totalValue: 500,  transactionDate: '2023-01-15' }),
        txn({ stockCode: 'AAPL', brokerName: 'Zerodha', assetType: 'EQUITY', transactionType: 'SELL', quantity: 3, totalValue: 600, transactionDate: '2023-02-01' }),
      ];
      const s = svc.computeStats(rows);
      const insights = svc.computeInsights(rows, s);
      expect(insights.length).toBeGreaterThan(0);
      for (const i of insights) {
        expect(i.icon).toBeTruthy();
        expect(i.title).toBeTruthy();
        expect(i.detail).toBeTruthy();
        expect(['green', 'red', 'blue', 'yellow', 'purple']).toContain(i.tone);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Bonus: numeric safety (NaN / Infinity / undefined fields)
  // ---------------------------------------------------------------------------
  describe('numeric safety', () => {
    it('treats NaN / Infinity numeric fields as 0 without throwing', () => {
      const dirty: any = {
        id: 1,
        email: 'x@y.com',
        stockCode: 'A',
        stockName: 'A',
        assetType: 'EQUITY',
        exchangeName: 'NSE',
        brokerName: 'Z',
        transactionType: 'BUY',
        quantity: NaN,
        price: Infinity,
        totalValue: NaN,
        brokerCharges: undefined,
        miscCharges: null,
        transactionDate: '2023-01-01',
      };
      expect(() => svc.computeStats([dirty])).not.toThrow();
      expect(() => svc.computeHoldings([dirty])).not.toThrow();
      const stats = svc.computeStats([dirty]);
      expect(stats.totalInvested).toBe(0);
      expect(stats.totalCharges).toBe(0);
    });
  });
});
