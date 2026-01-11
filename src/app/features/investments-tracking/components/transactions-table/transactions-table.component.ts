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


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    LucideIconsModule,
    ExpansionPanelComponent,
    CommonModule,
    PrimeNgModule,
  ],
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.css'],
  providers: [MessageService],
})
export class TransactionsTableComponent implements OnInit {
  isExpanded: boolean = true;

  temporaryTransactions: TransactionsResponse[] = [];
  portfolioTransactions: TransactionsResponse[] = [];

  loadingTemp = false;
  loadingPortfolio = false;
  userEmail = '';

  constructor(
    private transactionService: TransactionService,
    private messageService: MessageService
  ) {}

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
        this.temporaryTransactions = data;
        this.loadingTemp = false;
      },
      error: () => {
        this.loadingTemp = false;
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
        this.portfolioTransactions = data;
        this.loadingPortfolio = false;
      },
      error: () => {
        this.loadingPortfolio = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load current transactions',
        });
      },
    });
  }
}
