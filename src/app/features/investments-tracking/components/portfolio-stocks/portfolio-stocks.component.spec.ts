import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { PortfolioStocksComponent, PortfolioStockRow } from './portfolio-stocks.component';
import { TransactionService } from '../../../../services/transaction.service';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

describe('PortfolioStocksComponent', () => {
  let component: PortfolioStocksComponent;
  let fixture: ComponentFixture<PortfolioStocksComponent>;
  let mockTransactionService: jasmine.SpyObj<TransactionService>;

  beforeEach(async () => {
    mockTransactionService = jasmine.createSpyObj<TransactionService>(
      'TransactionService',
      ['getAllHoldings', 'getTransactionsByStock'],
    );

    await TestBed.configureTestingModule({
      imports: [
        PortfolioStocksComponent,
        CommonModule,
        DecimalPipe,
        LucideIconsModule,
        ExpansionPanelComponent,
        PrimeNgModule,
      ],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioStocksComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load holdings on init', (done) => {
    const holdings = [
      {
        stockCode: 'AAPL',
        stockName: 'Apple Inc',
        assetType: 'EQUITY',
        totalQuantity: 10,
        quantity: 10,
        totalValue: 1000,
        price: 100,
        brokerCharges: 0,
        miscCharges: 0,
      },
    ];
    mockTransactionService.getAllHoldings.and.returnValue(of(holdings));
    component.userEmail = 'user@example.com';

    component.ngOnInit();

    setTimeout(() => {
      expect(component.holdings.length).toBe(1);
      expect(component.holdings[0].stockCode).toBe('AAPL');
      done();
    }, 50);
  });

  it('should fetch transactions when row expands', (done) => {
    const holding: PortfolioStockRow = {
      stockCode: 'AAPL',
      stockName: 'Apple Inc',
      assetType: 'EQUITY',
      totalBought: 10,
      totalSold: 0,
      netHeld: 10,
      totalInvested: 1000,
      totalSoldValue: 0,
      netInvested: 1000,
      txnCount: 1,
      avgPrice: 100,
      totalCharges: 0,
      sharePercent: 100,
    };
    component.userEmail = 'user@example.com';
    component.holdings = [holding];
    const txns = [
      { stockCode: 'AAPL', transactionType: 'BUY', quantity: 10, price: 100, totalValue: 1000, transactionDate: '2024-01-01', brokerName: 'Groww', brokerCharges: 0, miscCharges: 0 },
    ];
    mockTransactionService.getTransactionsByStock.and.returnValue(of(txns as any));

    component.onRowExpand({ data: holding });

    setTimeout(() => {
      expect(mockTransactionService.getTransactionsByStock).toHaveBeenCalledWith('user@example.com', 'AAPL');
      expect(component.stockTransactions['AAPL'].length).toBe(1);
      done();
    }, 50);
  });
});
