import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TransactionService } from '../../../../services/transaction.service';

@Component({
  selector: 'app-all-transactions',
  standalone: true,
  imports: [],
  templateUrl: './all-transactions.component.html',
  styleUrl: './all-transactions.component.css'
})
export class AllTransactionsComponent implements OnInit {
  transactionForm: FormGroup;
  columns: string[] = [];
  transactions: any[] = [];
  displayedColumns: string[] = [];

  username: string = 'prudvi@gmail.com';  // Assuming you would use this value
  password: string = 'password';  // Assuming you would use this value

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService
  ) {
    this.transactionForm = this.fb.group({
      email: [''],
    });
  }

  ngOnInit(): void {}

  fetchTransactions(): void {
    const email = this.transactionForm.value.email;
    if (email && this.username && this.password) {
      console.log("email:", email);
      this.transactionService.getUserTransactions(email).subscribe(
        (data) => {
          console.log("Data", data);
          if (data.length > 0) {
            this.transactions = data;
            this.columns = Object.keys(data[0]);
            this.displayedColumns = [...this.columns];
          } else {
            this.transactions = [];
          }
        },
        (error) => {
          console.error('Error fetching transactions:', error);
        }
      );
    } else {
      console.error('Email, username, and password are required.');
    }
  }
}
