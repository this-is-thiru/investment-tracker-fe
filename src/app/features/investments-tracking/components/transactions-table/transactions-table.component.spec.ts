import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TransactionsTableComponent } from './transactions-table.component';
import { TransactionService } from '../../../../services/transaction.service';
import { TransactionsResponse } from '../../../../models/TranscationsResponse';

describe('TransactionsTableComponent', () => {
  let component: TransactionsTableComponent;
  let fixture: ComponentFixture<TransactionsTableComponent>;
  let mockService: jasmine.SpyObj<TransactionService>;

  const MOCK_TEMP: TransactionsResponse[] = [
    {
      id: 1, rowId: 't1', email: 'test@example.com',
      stockCode: 'AAPL', stockName: 'Apple Inc', assetType: 'EQUITY',
      exchangeName: 'NASDAQ', brokerName: 'Zerodha',
      transactionType: 'BUY', quantity: 10, price: 150, totalValue: 1500,
      transactionDate: '2024-01-15',
      brokerCharges: 5, miscCharges: 2,
    },
    {
      id: 2, rowId: 't2', email: 'test@example.com',
      stockCode: 'GOOG', stockName: 'Google', assetType: 'EQUITY',
      exchangeName: 'NASDAQ', brokerName: 'Zerodha',
      transactionType: 'SELL', quantity: 5, price: 2800, totalValue: 14000,
      transactionDate: '2024-02-15',
      brokerCharges: 10, miscCharges: 5,
    },
  ];

  const MOCK_PORT: TransactionsResponse[] = [
    {
      id: 10, rowId: 'p1', email: 'test@example.com',
      stockCode: 'AAPL', stockName: 'Apple Inc', assetType: 'EQUITY',
      exchangeName: 'NASDAQ', brokerName: 'Groww',
      transactionType: 'BUY', quantity: 20, price: 145, totalValue: 2900,
      transactionDate: '2024-01-20',
      brokerCharges: 6, miscCharges: 3,
    },
    {
      id: 11, rowId: 'p2', email: 'test@example.com',
      stockCode: 'AAPL', stockName: 'Apple Inc', assetType: 'EQUITY',
      exchangeName: 'NASDAQ', brokerName: 'Groww',
      transactionType: 'BUY', quantity: 15, price: 148, totalValue: 2220,
      transactionDate: '2024-02-10',
      brokerCharges: 5, miscCharges: 2,
    },
    {
      id: 12, rowId: 'p3', email: 'test@example.com',
      stockCode: 'TSLA', stockName: 'Tesla', assetType: 'EQUITY',
      exchangeName: 'NASDAQ', brokerName: 'Zerodha',
      transactionType: 'SELL', quantity: 8, price: 250, totalValue: 2000,
      transactionDate: '2024-03-05',
      brokerCharges: 4, miscCharges: 1,
    },
  ];

  beforeEach(async () => {
    mockService = jasmine.createSpyObj<TransactionService>('TransactionService', [
      'getTemporaryTransactions',
      'getCurrentTransactions',
      'getAllHoldings',
    ]);
    mockService.getTemporaryTransactions.and.returnValue(of(MOCK_TEMP));
    mockService.getCurrentTransactions.and.returnValue(of(MOCK_PORT));
    mockService.getAllHoldings.and.returnValue(of([
      {
        stockCode: 'AAPL',
        stockName: 'Apple Inc',
        assetType: 'EQUITY',
        totalQuantity: 45,
        quantity: 45,
        totalValue: 6620,
        price: 147.11,
        buyTransactionIds: ['t1', 'p1', 'p2'],
        sellTransactionIds: [],
      },
      {
        stockCode: 'GOOG',
        stockName: 'Google',
        assetType: 'EQUITY',
        totalQuantity: 0,
        quantity: -5,
        totalValue: 0,
        price: 0,
        buyTransactionIds: [],
        sellTransactionIds: ['t2'],
      },
      {
        stockCode: 'TSLA',
        stockName: 'Tesla',
        assetType: 'EQUITY',
        totalQuantity: 0,
        quantity: -8,
        totalValue: 0,
        price: 0,
        buyTransactionIds: [],
        sellTransactionIds: ['p3'],
      },
    ]));

    spyOn(localStorage, 'getItem').and.returnValue('test@example.com');

    await TestBed.configureTestingModule({
      imports: [TransactionsTableComponent],
      providers: [
        { provide: TransactionService, useValue: mockService },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    (localStorage.getItem as jasmine.Spy).calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute stats from filtered rows', () => {
    // Total rows = 2 temp + 3 port = 5
    expect(component.filteredAll.length).toBe(5);
    // Total invested = 1500 + 2900 + 2220 = 6620
    expect(component.stats.totalInvested).toBeCloseTo(6620, 2);
    // Total sold = 14000 + 2000 = 16000
    expect(component.stats.totalSold).toBeCloseTo(16000, 2);
    // Net = invested - sold = -9380
    expect(component.stats.netInvested).toBeCloseTo(-9380, 2);
    // Charges = (5+2)+(10+5)+(6+3)+(5+2)+(4+1) = 7+15+9+7+5 = 43
    expect(component.stats.totalCharges).toBeCloseTo(43, 2);
    expect(component.stats.count).toBe(5);
    // Top stock by count = AAPL with 3 transactions
    expect(component.stats.topStock).toBeTruthy();
    expect(component.stats.topStock!.code).toBe('AAPL');
    expect(component.stats.topStock!.count).toBe(3);
  });

  it('should apply type filter', () => {
    component.setTypeFilter('BUY');
    expect(component.filteredAll.length).toBe(3); // 1 temp BUY + 2 port BUY
    expect(component.filteredAll.every((t) => t.transactionType === 'BUY')).toBeTrue();

    component.setTypeFilter('SELL');
    expect(component.filteredAll.length).toBe(2);
    expect(component.filteredAll.every((t) => t.transactionType === 'SELL')).toBeTrue();

    component.setTypeFilter('ALL');
    expect(component.filteredAll.length).toBe(5);
  });

  it('should reset filters', () => {
    component.setTypeFilter('SELL');
    component.searchQuery = 'AAPL';
    component.filterBroker = 'Groww';
    component.applyFilters();
    expect(component.filteredAll.length).toBeLessThan(MOCK_TEMP.length + MOCK_PORT.length);
    expect(component.activeFilterChips.length).toBeGreaterThan(0);

    component.resetFilters();
    expect(component.filterType).toBe('ALL');
    expect(component.searchQuery).toBe('');
    expect(component.filterAssetType).toBeNull();
    expect(component.filterBroker).toBeNull();
    expect(component.filterDatePreset).toBe('all');
    expect(component.activeFilterChips.length).toBe(0);
    expect(component.filteredAll.length).toBe(MOCK_TEMP.length + MOCK_PORT.length);
    expect(component.hasActiveFilters()).toBeFalse();
  });

  it('should compute holdings grouped by stockCode', () => {
    expect(component.holdings.length).toBe(3); // AAPL, GOOG, TSLA
    const aapl = component.holdings.find((h) => h.stockCode === 'AAPL');
    expect(aapl).toBeDefined();
    // AAPL: 10 (temp) + 20 + 15 (port) = 45 bought
    expect(aapl!.totalBought).toBe(45);
    expect(aapl!.totalSold).toBe(0);
    expect(aapl!.netHeld).toBe(45);
    expect(aapl!.txnCount).toBe(3);
    expect(aapl!.totalInvested).toBeCloseTo(1500 + 2900 + 2220, 2);

    const goog = component.holdings.find((h) => h.stockCode === 'GOOG');
    expect(goog).toBeDefined();
    expect(goog!.totalSold).toBe(5);
    expect(goog!.netHeld).toBe(-5);
  });

  it('should generate CSV with escaped commas and quotes', () => {
    const rows: TransactionsResponse[] = [
      {
        id: 1, rowId: 'r1', email: 'a@b.com',
        stockCode: 'X', stockName: 'Stock, with comma',
        assetType: 'EQ', exchangeName: 'NSE', brokerName: 'B',
        transactionType: 'BUY', quantity: 1, price: 10, totalValue: 10,
        transactionDate: '2024-01-01',
      },
      {
        id: 2, rowId: 'r2', email: 'a@b.com',
        stockCode: 'Y', stockName: 'Has "quotes" inside',
        assetType: 'EQ', exchangeName: 'NSE', brokerName: 'B',
        transactionType: 'SELL', quantity: 2, price: 20, totalValue: 40,
        transactionDate: '2024-01-02',
      },
    ];
    const csv = component.toCsv(rows);
    // Header + 2 rows
    const lines = csv.split('\n');
    expect(lines.length).toBe(3);
    // Comma-bearing cell wrapped in quotes
    expect(csv).toContain('"Stock, with comma"');
    // Quotes inside a quoted cell are doubled
    expect(csv).toContain('"Has ""quotes"" inside"');
    // Header has the expected columns
    expect(lines[0]).toContain('Stock,Code,Type,Quantity,Price,Total,Date');
  });

  it('should hide insight when no data', () => {
    // Simulate no transaction data and no holdings from the API
    component.temporaryTransactions = [];
    component.portfolioTransactions = [];
    component.holdings = [];
    component.applyFilters();
    expect(component.filteredAll.length).toBe(0);
    expect(component.stats.count).toBe(0);
    expect(component.holdings.length).toBe(0);
    expect(component.insights.length).toBe(0);
  });

  it('should toggle column visibility', () => {
    expect(component.visibleColumns.qty).toBeTrue();
    component.toggleColumn('qty');
    expect(component.visibleColumns.qty).toBeFalse();
    component.toggleColumn('qty');
    expect(component.visibleColumns.qty).toBeTrue();

    expect(component.visibleColumns.broker).toBeTrue();
    component.toggleColumn('broker');
    expect(component.visibleColumns.broker).toBeFalse();
  });
});
