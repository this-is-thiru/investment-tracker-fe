export interface AuditMetadata {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TransactionsResponse {
  id: any;
  rowId?: string;
  email: string;
  stockCode: string;
  stockName: string;
  assetType: string;
  exchangeName: string;
  brokerName: string;
  transactionType: string;
  quantity: number;
  price: number;
  totalValue: number;
  maturityDate?: string;
  brokerCharges?: number;
  miscCharges?: number;
  transactionDate: string;
  auditMetadata?: AuditMetadata;
}