export type AssetType = 'EQUITY' | 'MUTUAL_FUND' | 'GOLD' | 'BOND' | 'REAL_ESTATE';
export type TradeSegment = 'DELIVERY' | 'INTRADAY' | 'F_AND_O';
export type ExchangeName = 'NSE' | 'BSE';
export type ChargeEvent = 'BUY' | 'SELL' | 'AMC_CYCLE' | 'CORPORATE_ACTION';
export type AmcChargeFrequency = 'QUARTERLY' | 'YEARLY';

export interface LotSlice {
  quantity: number;
  date: string;
  price: number;
}

export interface ChargeSimulationRequest {
  brokerName: string;
  assetType: AssetType;
  segment?: TradeSegment;
  exchange?: ExchangeName;
  event: ChargeEvent;
  stockCode?: string;
  quantity: number;
  price: number;
  lotSize?: number;
  planCode?: string;
  lots?: LotSlice[];
}

export interface ChargeLine {
  code: string;
  displayName: string;
  category: string;
  amount: number;
  rate?: number;
  baseAmount?: number;
  taxable: boolean;
  notes?: string;
}

export interface ChargeBreakdownResponse {
  scheduleId?: string;
  scheduleCode?: string;
  instrumentId?: string;
  resolution: string;
  totalCharges: number;
  lines: ChargeLine[];
  deductibleCharges?: number;
  nonDeductibleCharges?: number;
  turnover?: number;
}

export interface ChargeCatalogueEntry {
  code: string;
  displayName: string;
  category: string;
  deductibleForCapitalGains: boolean;
  status: string;
  description: string;
  statutoryReference?: string;
}

export interface UserCharge {
  id: string;
  email: string;
  transactionId: string;
  orderId?: string;
  stockCode?: string;
  accountHolder?: string;
  brokerName: string;
  assetType: AssetType;
  event: ChargeEvent;
  transactionDate: string;
  totalCharges: number;
  scheduleCode: string;
  resolution: string;
  amountByCode: Record<string, number>;
  lines: ChargeLine[];
}

export interface ChargeReconciliationRow {
  transactionId: string;
  stockCode?: string;
  transactionDate: string;
  brokerName: string;
  assetType: AssetType;
  event: ChargeEvent;
  resolution: string;
  scheduleCode: string;
  computedTotal: number;
  enteredTotal?: number;
  delta?: number;
  comparable: boolean;
  note?: string;
}

export interface ChargeReconciliationResponse {
  rows: ChargeReconciliationRow[];
  totalComputed: number;
  totalEntered: number;
  netDelta: number;
  comparableCount: number;
  unresolvedCount: number;
  transactionsWithoutComputation: number;
}

export interface BillingEvent {
  transactionId: string;
  periodFrom: string;
  periodTo: string;
  billedOn: string;
  amount: number;
}

export interface ChargeAccount {
  id?: string;
  email: string;
  dematAccountId: string;
  brokerName: string;
  accountHolder: string;
  openedOn: string;
  amcFrequency: AmcChargeFrequency;
  planCode?: string;
  lastBilledThrough?: string;
  billingEvents?: BillingEvent[];
}

export interface ChargeSlab {
  fromAmount: number;
  toAmount?: number;
  rate?: number;
  flatAmount?: number;
}

export interface ChargeRule {
  code: string;
  displayName: string;
  category: string;
  basis: string;
  events: ChargeEvent[];
  rate?: number;
  flatAmount?: number;
  perUnitAmount?: number;
  slabs?: ChargeSlab[];
  minAmount?: number;
  maxAmount?: number;
  taxable: boolean;
  active: boolean;
  order: number;
  notes?: string;
}

export interface ChargeSchedule {
  id?: string;
  scheduleCode: string;
  brokerName: string;
  assetType?: AssetType;
  segment?: TradeSegment;
  exchange?: ExchangeName;
  planCode?: string;
  startDate: string;
  endDate?: string;
  verifiedOn?: string;
  sourceUrl?: string;
  rules: ChargeRule[];
}

export interface ChargeScheduleDrift {
  scheduleCode: string;
  field: string;
  fileValue: string;
  databaseValue: string;
}

export interface ChargeSeedReport {
  catalogueEntriesWritten: number;
  schedulesWritten: number;
  instrumentProfilesWritten: number;
  message?: string;
}
