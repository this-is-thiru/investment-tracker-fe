import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { TransactionService } from '../../../../services/transaction.service';

@Component({
  selector: 'app-all-transactions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    PaginatorModule
  ],
  templateUrl: './all-transactions.component.html',
  styleUrls: ['./all-transactions.component.css']
})
export class AllTransactionsComponent implements OnInit {
  transactionForm: FormGroup;
  transactions: any[] = [];
  filteredTransactions: any[] = [];
  displayedColumns: string[] = [];
  loading = false;

  // pagination
  rowsPerPage = 10;
  first = 0;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService
  ) {
    this.transactionForm = this.fb.group({
      email: ['']
    });
  }

  ngOnInit(): void {}

  /** 🔄 Fetch user transactions */
  fetchTransactions(): void {
    const email = this.transactionForm.value.email?.trim();
    if (!email) return;

    this.loading = true;
    this.transactionService.getUserTransactions(email).subscribe({
      next: (data) => {
        this.transactions = data || [];
        this.filteredTransactions = [...this.transactions];
        this.displayedColumns = this.transactions.length ? Object.keys(this.transactions[0]) : [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching transactions:', err);
        this.loading = false;
      }
    });
  }

  /** 🔍 Search functionality */
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredTransactions = this.transactions.filter((t) =>
      Object.values(t).some((val) =>
        String(val).toLowerCase().includes(query)
      )
    );
  }

  /** 📄 Handle pagination */
  onPageChange(event: any): void {
    this.first = event.first;
    this.rowsPerPage = event.rows;
  }
}
