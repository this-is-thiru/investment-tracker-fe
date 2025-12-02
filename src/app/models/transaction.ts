// Converted from CorporateActions.tsx and App.tsx type definitions

// export interface Transaction {
//   email: string;
//   stockCode: string;
//   stockName: string;
//   assetType: 'EQUITY' | 'DEBT' | 'ETF' | 'MF' | 'OTHER';
//   exchange: 'NSE' | 'BSE' | 'OTHER';
//   broker: string;
//   type: 'BUY' | 'SELL';
//   qty: number;
//   price: number;
//   total: number;
  // maturityDate?: string | null; // Optional for EQUITY
//   brokerCharges: number;
//   miscCharges: number;
//   date: string; // ISO date format (YYYY-MM-DD)
// }

export interface Transaction {
  id: string;
  stock: string;
  quantity: number;
  status: string;
  actionDate: string;
}


export type ToastType = "success" | "error" | "info" | "warn";

export interface Toast {
  message: string;
  type: ToastType;
}

export type Page = "home" | "investment-tracking" | "tax-filing" | "portfolio-analytics";