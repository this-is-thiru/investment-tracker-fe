// import { Component, Input, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { MessageService } from 'primeng/api';
// import { TransactionService } from '../../../../services/transaction.service';
// import { TransactionsResponse } from '../../../../models/TranscationsResponse';
// import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
// import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
// import { Transaction } from '../../../../models/transaction';
// import { PrimeNgModule } from '../../../../core/prime-ng.module';

// @Component({
//   selector: 'app-transactions-table',
//   standalone: true,
//   imports: [
//     LucideIconsModule,
//     ExpansionPanelComponent,
//     CommonModule,
//     PrimeNgModule,
//   ],
//   templateUrl: './transactions-table.component.html',
//   styleUrls: ['./transactions-table.component.css'],
//   providers: [MessageService],
// })
// export class TransactionsTableComponent implements OnInit {
//   isExpanded: boolean = true; 
//   @Input() temporaryTransactions: Transaction[] = [];
//   @Input() portfolioTransactions: Transaction[] = [];

//   toggleExpansion(): void {
//     this.isExpanded = !this.isExpanded;
//   }

//   transactions: TransactionsResponse[] = [];
//   filteredTransactions: TransactionsResponse[] = [];
//   searchQuery = '';
//   rowsPerPage = 5;
//   first = 0;
//   loading = false;
//   activeTab: 'current' | 'temporary' = 'current';
//   userEmail = '';
//   constructor(
//     private transactionService: TransactionService,
//     private messageService: MessageService,
//   ) {}

//   ngOnInit(): void {
//     this.userEmail = localStorage.getItem('userEmail') || '';
//     console.log('User Email in TransactionsTableComponent:', this.userEmail);
//     this.fetchTransactions();
//   }

//   fetchTransactions(): void {
//     this.loading = true;
//     const fetch$ =
//       this.activeTab === 'current'
//         ? this.transactionService.getCurrentTransactions(this.userEmail)
//         : this.transactionService.getTemporaryTransactions(this.userEmail);

//     fetch$.subscribe({
//       next: (data) => {
//         this.transactions = data;
//         this.filteredTransactions = [...data];
//         this.loading = false;
//       },
//       error: (err) => {
//         this.loading = false;
//         this.messageService.add({
//           severity: 'error',
//           summary: 'Error',
//           detail: 'Failed to load transactions.',
//         });
//         console.error(err);
//       },
//     });
//   }

//   setTab(type: 'current' | 'temporary') {
//     if (this.activeTab !== type) {
//       this.activeTab = type;
//       this.fetchTransactions();
//     }
//   }

//   onSearch(event: Event): void {
//     const query = (event.target as HTMLInputElement).value.toLowerCase();
//     this.filteredTransactions = this.transactions.filter(
//       (t) =>
//         t.stockCode.toLowerCase().includes(query) ||
//         t.stockName.toLowerCase().includes(query) ||
//         t.transactionType.toLowerCase().includes(query),
//     );
//   }

//   onPageChange(event: any) {
//     this.first = event.first;
//     this.rowsPerPage = event.rows;
//   }
// }


import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MessageService } from 'primeng/api';
import { TransactionService } from '../../../../services/transaction.service';
import { TransactionsResponse } from '../../../../models/TranscationsResponse';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

@Component({
    selector: 'app-transactions-table',
    standalone: true,
    imports: [
        CommonModule,
        LucideIconsModule,
        ExpansionPanelComponent,
        DecimalPipe,
        PrimeNgModule,
    ],
    templateUrl: './transactions-table.component.html',
    styleUrls: ['./transactions-table.component.css'],
    providers: [MessageService]
})
export class TransactionsTableComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private messageService = inject(MessageService);

  isExpanded: boolean = true;
  viewMode: 'split' | 'temp' | 'port' = 'split';

  temporaryTransactions: TransactionsResponse[] = [];
  portfolioTransactions: TransactionsResponse[] = [];

  expandedTempRows: { [key: string]: boolean } = {};
  expandedPortfolioRows: { [key: string]: boolean } = {};

  rowsTemp = 5;
  rowsPortfolio = 5;

  loadingTemp = false;
  loadingPortfolio = false;
  userEmail = '';

  constructor() { }

  ngOnInit(): void {
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.loadTemporaryTransactions();
    this.loadPortfolioTransactions();
  }

  /** TEMPORARY */
  loadTemporaryTransactions(): void {
    this.loadingTemp = true;
    this.transactionService.getTemporaryTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.temporaryTransactions = data.map((t, i) => ({
          ...t,
          rowId: t.id || `temp-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`
        }));
        this.loadingTemp = false;
      },
      error: () => {
        this.loadingTemp = false;
        // Mock data fallback for sandbox/development
        this.temporaryTransactions = Array.from({length: 3}, (_, i) => ({
          id: i + 100,
          rowId: `temp-${i}`,
          email: 'test@gmail.com',
          stockName: `Mock Temp Stock ${i + 1}`,
          stockCode: `MOCKT${i + 1}`,
          assetType: 'MUTUAL_FUND',
          exchangeName: 'NSE',
          brokerName: 'Groww',
          quantity: 5 * (i + 1),
          transactionType: 'BUY',
          price: 150 * (i + 1),
          totalValue: 150 * 5 * (i + 1) * (i + 1),
          transactionDate: '2023-09-10'
        }));
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load temporary transactions',
        });
      },
    });
  }

  /** CURRENT / PORTFOLIO */
  loadPortfolioTransactions(): void {
    this.loadingPortfolio = true;
    this.transactionService.getCurrentTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.portfolioTransactions = data.map((t, i) => ({
          ...t,
          rowId: t.id || `port-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`
        }));
        this.loadingPortfolio = false;
      },
      error: () => {
        this.loadingPortfolio = false;
        // Mock data fallback for sandbox/development
        this.portfolioTransactions = Array.from({length: 19}, (_, i) => ({
          id: i,
          rowId: `port-${i}`,
          email: 'test@gmail.com',
          stockName: i % 2 === 0 ? 'QUANT SMALL CAP FUND - DIRECT' : 'SBI BLUECHIP FUND - DIRECT',
          stockCode: i % 2 === 0 ? 'QUANT_SMALL' : 'SBI_BLUE',
          assetType: 'MUTUAL_FUND',
          exchangeName: 'NSE',
          brokerName: 'Groww',
          quantity: 5 + i * 0.1,
          transactionType: 'BUY',
          price: 195.76,
          totalValue: 1000 + i * 100,
          transactionDate: '2023-09-01'
        }));
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load current transactions',
        });
      },
    });
  }
}
