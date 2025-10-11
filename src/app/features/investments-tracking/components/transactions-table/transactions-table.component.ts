import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

interface Transaction {
  date: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
}

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [CommonModule, TableModule, InputTextModule, ButtonModule, PaginatorModule],
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.css']
})
export class TransactionsTableComponent implements OnInit {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  searchQuery = '';
  rowsPerPage = 10;
  first = 0;

  ngOnInit(): void {
    // Simulate large dataset
    for (let i = 0; i < 200; i++) {
      this.transactions.push({
        date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        symbol: `SYM${i}`,
        type: i % 2 === 0 ? 'Buy' : 'Sell',
        quantity: Math.floor(Math.random() * 200) + 10,
        price: Math.floor(Math.random() * 300) + 50,
        total: Math.floor(Math.random() * 10000) + 1000,
        status: 'Completed'
      });
    }

    this.filteredTransactions = [...this.transactions];
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredTransactions = this.transactions.filter(
      t =>
        t.symbol.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query)
    );
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rowsPerPage = event.rows;
  }
}
