import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import { TransactionService } from '../../../../services/transaction.service';
import { TransactionsResponse } from '../../../../models/TranscationsResponse';

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    PaginatorModule,
    DropdownModule
  ],
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.css'],
  providers: [MessageService]
})
export class TransactionsTableComponent implements OnInit {
  transactions: TransactionsResponse[] = [];
  filteredTransactions: TransactionsResponse[] = [];
  searchQuery = '';
  rowsPerPage = 5;
  first = 0;
  loading = false;
  activeTab: 'current' | 'temporary' = 'current';
  userEmail = ''; // Replace or inject dynamically later

  constructor(
    private transactionService: TransactionService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.userEmail = localStorage.getItem('userEmail') || '';
    console.log('User Email in TransactionsTableComponent:', this.userEmail);
    this.fetchTransactions();
  }

  /** Load transactions based on selected tab */
  fetchTransactions(): void {
    this.loading = true;
    const fetch$ =
      this.activeTab === 'current'
        ? this.transactionService.getCurrentTransactions(this.userEmail)
        : this.transactionService.getTemporaryTransactions(this.userEmail);

    fetch$.subscribe({
      next: (data) => {
        this.transactions = data;
        this.filteredTransactions = [...data];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load transactions.'
        });
        console.error(err);
      }
    });
  }

  /** Switch between Current / Temporary */
  setTab(type: 'current' | 'temporary') {
    if (this.activeTab !== type) {
      this.activeTab = type;
      this.fetchTransactions();
    }
  }

  /** Local search filtering */
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredTransactions = this.transactions.filter(
      (t) =>
        t.stockCode.toLowerCase().includes(query) ||
        t.stockName.toLowerCase().includes(query) ||
        t.transactionType.toLowerCase().includes(query)
    );
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rowsPerPage = event.rows;
  }
}
