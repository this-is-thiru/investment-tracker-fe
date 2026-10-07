export type CorporateActionType =
  | 'DIVIDEND'
  | 'BONUS'
  | 'STOCK_SPLIT'
  | 'BUYBACK'
  | 'RIGHTS_ISSUANCE'
  | 'DEMERGER'
  | 'NAME_OR_SYMBOL_CHANGE';

export type BrokerName = 'UPSTOX' | 'FYERS' | 'ZERODHA';

export interface DemergerStock {
  stockCode: string;
  stockName: string;
}

export interface DemergerDetail {
  demergerRatio: string;
  demergerPriceRatio: string;
  mainStockCode: string;
  mainStockName: string;
  demergerStocks: DemergerStock[];
}

export interface CorporateActionDto {
  id?: string;
  stockCode: string;
  stockName?: string;
  toStockCode?: string;
  toStockName?: string;
  type: CorporateActionType;
  assetType?: string;
  description?: string;
  actionPrice?: string;
  ratio?: string;
  priority?: number;
  demergerDetail?: DemergerDetail;
  exDate: string;
  recordDate: string;
  date?: string;
}

export interface CorporateActionPerformDto {
  month: string;
  year: number;
  brokerName?: BrokerName;
}
