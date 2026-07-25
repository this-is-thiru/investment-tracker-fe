import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { TempTransactionsTableComponent } from './temp-transactions-table.component';
import { TransactionService } from '@services/transaction.service';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';

describe('TempTransactionsTableComponent', () => {
  let component: TempTransactionsTableComponent;
  let fixture: ComponentFixture<TempTransactionsTableComponent>;
  let mockTransactionService: jasmine.SpyObj<TransactionService>;

  beforeEach(async () => {
    mockTransactionService = jasmine.createSpyObj<TransactionService>(
      'TransactionService',
      ['getTemporaryTransactions'],
    );

    await TestBed.configureTestingModule({
      imports: [
        TempTransactionsTableComponent,
        CommonModule,
        FormsModule,
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

    fixture = TestBed.createComponent(TempTransactionsTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load temporary transactions on init', (done) => {
    const data = [
      {
        id: 1,
        stockName: 'AAPL',
        stockCode: 'AAPL',
        assetType: 'EQUITY',
        exchangeName: 'NSE',
        brokerName: 'Groww',
        quantity: 10,
        transactionType: 'BUY',
        price: 100,
        totalValue: 1000,
        transactionDate: '2024-01-01',
      },
    ];
    mockTransactionService.getTemporaryTransactions.and.returnValue(of(data as any));
    component.userEmail = 'user@example.com';

    component.ngOnInit();

    setTimeout(() => {
      expect(component.transactions.length).toBe(1);
      expect(component.filteredTransactions.length).toBe(1);
      expect(component.availableBrokers).toContain('Groww');
      done();
    }, 50);
  });

  it('should filter transactions by search query', () => {
    component.transactions = [
      { stockName: 'AAPL', stockCode: 'AAPL', transactionType: 'BUY', brokerName: 'Groww', assetType: 'EQUITY', exchangeName: 'NSE', transactionDate: '2024-01-01' } as any,
      { stockName: 'GOOGL', stockCode: 'GOOGL', transactionType: 'SELL', brokerName: 'Zerodha', assetType: 'EQUITY', exchangeName: 'NSE', transactionDate: '2024-01-02' } as any,
    ];
    component.searchQuery = 'AAPL';
    component.applyFilters();
    expect(component.filteredTransactions.length).toBe(1);
    expect(component.filteredTransactions[0].stockName).toBe('AAPL');
  });
});
