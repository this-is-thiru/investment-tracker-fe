/** One side of the before → after illustration */
export interface EffectHolding {
  /** Stock code, or a short label such as "Cash" */
  label: string;
  shares: number;
  /** Average cost per share; omitted when the action doesn't involve one */
  costPerShare?: number;
  /** Extra line under the figures, e.g. "+ ₹850 cash" */
  caption?: string;
  tone?: 'default' | 'success' | 'accent';
}

export interface ActionEffect {
  before: EffectHolding;
  after: EffectHolding[];
  /** One sentence describing the effect in words */
  summary: string;
}

/** Holding the illustration starts from: round numbers keep the arithmetic readable */
export const EXAMPLE_SHARES = 100;
export const EXAMPLE_COST = 100;

export function parseRatio(value: string | null | undefined): [number, number] | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(value || '');
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a > 0 && b > 0 ? [a, b] : null;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * How a corporate action changes an example holding of 100 shares bought at
 * ₹100. Returns null when the action's terms are missing or unparsable.
 * Ratio conventions follow the registration form: bonus and demerger are
 * new : held, split is old : new, cost split is parent : child.
 */
export function describeEffect(action: any): ActionEffect | null {
  if (!action) return null;
  const code = action.stockCode || 'Stock';
  const n = EXAMPLE_SHARES;
  const cost = EXAMPLE_COST;
  const before: EffectHolding = { label: code, shares: n, costPerShare: cost };
  const ratio = parseRatio(action.ratio);
  const price = Number(action.actionPrice);

  switch (action.type) {
    case 'BONUS': {
      if (!ratio) return null;
      const [bonus, held] = ratio;
      const shares = round(n + (n * bonus) / held);
      return {
        before,
        after: [{ label: code, shares, costPerShare: round((n * cost) / shares), tone: 'accent' }],
        summary: `${bonus} free share${bonus === 1 ? '' : 's'} for every ${held} held. Total cost stays the same, so the average cost falls.`,
      };
    }
    case 'STOCK_SPLIT':
    case 'SPLIT': {
      if (!ratio) return null;
      const [oldShares, newShares] = ratio;
      const shares = round((n * newShares) / oldShares);
      return {
        before,
        after: [{ label: code, shares, costPerShare: round((n * cost) / shares), tone: 'accent' }],
        summary: `Every ${oldShares} share${oldShares === 1 ? '' : 's'} become${oldShares === 1 ? 's' : ''} ${newShares}. Total value is unchanged.`,
      };
    }
    case 'DEMERGER': {
      const d = action.demergerDetail;
      const shareRatio = parseRatio(d?.demergerRatio);
      const costSplit = parseRatio(d?.demergerPriceRatio);
      if (!shareRatio || !costSplit) return null;
      const [newShares, held] = shareRatio;
      const parentPart = costSplit[0] / (costSplit[0] + costSplit[1]);
      const child = d?.demergerStocks?.[0];
      const childShares = round((n * newShares) / held);
      const total = n * cost;
      return {
        before,
        after: [
          { label: d?.mainStockCode || code, shares: n, costPerShare: round((total * parentPart) / n), caption: `${round(parentPart * 100)}% of cost` },
          {
            label: child?.stockCode || 'New company',
            shares: childShares,
            costPerShare: round((total * (1 - parentPart)) / childShares),
            caption: `${round((1 - parentPart) * 100)}% of cost`,
            tone: 'accent',
          },
        ],
        summary: `${newShares} share${newShares === 1 ? '' : 's'} of ${child?.stockName || 'the new company'} for every ${held} held. The original cost is divided ${d.demergerPriceRatio}.`,
      };
    }
    case 'DIVIDEND': {
      const amount = Number(action.dividendAmount);
      if (!(amount > 0)) return null;
      return {
        before,
        after: [{ label: code, shares: n, costPerShare: cost, caption: `+ ₹${round(amount * n).toLocaleString('en-IN')} cash`, tone: 'success' }],
        summary: `₹${amount} paid for every share held on the record date. Shares and cost are unchanged.`,
      };
    }
    case 'NAME_OR_SYMBOL_CHANGE': {
      if (!action.toStockCode) return null;
      return {
        before,
        after: [{ label: action.toStockCode, shares: n, costPerShare: cost, tone: 'accent' }],
        summary: `${code} is renamed${action.toStockName ? ' to ' + action.toStockName : ''}. Quantity and cost carry over unchanged.`,
      };
    }
    case 'RIGHTS_ISSUANCE': {
      if (!ratio) return null;
      const [offered, held] = ratio;
      const entitled = round((n * offered) / held);
      return {
        before,
        after: [
          { label: code, shares: n, costPerShare: cost },
          {
            label: 'Rights',
            shares: entitled,
            costPerShare: price > 0 ? price : undefined,
            caption: 'if you subscribe',
            tone: 'accent',
          },
        ],
        summary: `Right to buy ${offered} new share${offered === 1 ? '' : 's'} for every ${held} held${price > 0 ? ' at ₹' + price : ''}.`,
      };
    }
    case 'BUYBACK': {
      if (!ratio) return null;
      const [accepted, held] = ratio;
      const tendered = Math.min(n, round((n * accepted) / held));
      return {
        before,
        after: [
          { label: code, shares: round(n - tendered), costPerShare: cost },
          {
            label: 'Cash',
            shares: tendered,
            costPerShare: price > 0 ? price : undefined,
            caption: price > 0 ? `≈ ₹${round(tendered * price).toLocaleString('en-IN')} if accepted` : 'if accepted',
            tone: 'success',
          },
        ],
        summary: `Up to ${accepted} of every ${held} shares tendered are bought back${price > 0 ? ' at ₹' + price : ''}.`,
      };
    }
    default:
      return null;
  }
}
