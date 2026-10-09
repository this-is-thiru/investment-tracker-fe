import { describeEffect, parseRatio } from './corporate-action-effect';

describe('corporate action effect', () => {
  it('parses ratios and rejects malformed ones', () => {
    expect(parseRatio('1:10')).toEqual([1, 10]);
    expect(parseRatio(' 2 : 1 ')).toEqual([2, 1]);
    expect(parseRatio('0:1')).toBeNull();
    expect(parseRatio('1-1')).toBeNull();
    expect(parseRatio(undefined)).toBeNull();
  });

  it('doubles shares and halves cost for a 1:1 bonus', () => {
    const e = describeEffect({ type: 'BONUS', stockCode: 'INFY', ratio: '1:1' })!;
    expect(e.after[0].shares).toBe(200);
    expect(e.after[0].costPerShare).toBe(50);
  });

  it('multiplies shares by ten for a 1:10 split', () => {
    const e = describeEffect({ type: 'STOCK_SPLIT', stockCode: 'X', ratio: '1:10' })!;
    expect(e.after[0].shares).toBe(1000);
    expect(e.after[0].costPerShare).toBe(10);
  });

  it('divides cost between parent and child in a demerger', () => {
    const e = describeEffect({
      type: 'DEMERGER',
      stockCode: 'RELIANCE',
      demergerDetail: {
        demergerRatio: '1:1',
        demergerPriceRatio: '90:10',
        demergerStocks: [{ stockCode: 'JIOFIN', stockName: 'Jio Financial' }],
      },
    })!;
    const [parent, child] = e.after;
    expect(parent.shares).toBe(100);
    expect(parent.costPerShare).toBe(90);
    expect(child.label).toBe('JIOFIN');
    expect(child.shares).toBe(100);
    expect(child.costPerShare).toBe(10);
  });

  it('adds cash for a dividend without touching shares', () => {
    const e = describeEffect({ type: 'DIVIDEND', stockCode: 'ITC', dividendAmount: 8.5 })!;
    expect(e.after[0].shares).toBe(100);
    expect(e.after[0].caption).toContain('850');
  });

  it('carries the holding over on a symbol change', () => {
    const e = describeEffect({ type: 'NAME_OR_SYMBOL_CHANGE', stockCode: 'OLD', toStockCode: 'NEW' })!;
    expect(e.after[0].label).toBe('NEW');
    expect(e.after[0].shares).toBe(100);
  });

  it('returns null when terms are missing', () => {
    expect(describeEffect({ type: 'BONUS', stockCode: 'X' })).toBeNull();
    expect(describeEffect({ type: 'DIVIDEND', stockCode: 'X' })).toBeNull();
    expect(describeEffect(null)).toBeNull();
  });
});
