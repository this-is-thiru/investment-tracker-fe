import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css'],
})
export class TestComponent implements OnInit {
  stockForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';

  // Hardcoded Basic Auth credentials (use environment variables in production)
  private username = 'prudvi@gmail.com';
  private password = 'password';

  constructor(private fb: FormBuilder, private transactionService: TransactionService) {
    this.stockForm = this.fb.group({
      stockCode: ['', Validators.required],
      stockName: ['', Validators.required],
      exchangeName: ['', Validators.required],
      brokerName: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [0, [Validators.required, Validators.min(1)]],
      actorName: ['', Validators.required],
      transactionType: ['BUY', Validators.required],
      transactionDate: ['', Validators.required],
      brokerCharges: [0, [Validators.required, Validators.min(0)]],
      assetType: ['EQUITY', Validators.required],
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.stockForm.valid) {
      const email = 'prudvi@gmail.com'; // Replace with dynamic email if needed
      const formData = this.stockForm.value;

      this.transactionService.addTransaction(email, formData).subscribe({
        next: (response) => {
          this.successMessage = 'Transaction submitted successfully!';
          this.errorMessage = '';
          console.log('Transaction response:', response);
          this.stockForm.reset(); // Optionally reset the form after success
        },
        error: (err) => {
          this.errorMessage = 'Failed to submit transaction. Please try again.';
          this.successMessage = '';
          console.error('Error submitting transaction:', err);
        },
      });
    } else {
      this.errorMessage = 'Please fill out all required fields correctly.';
      this.successMessage = '';
    }
  }
}
