import {
  Component,
  Input,
  OnInit,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MessageService } from 'primeng/api';
import { TransactionsResponse } from '../../../../models/TranscationsResponse';
import { TransactionService } from '../../../../services/transaction.service';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

@Component({
  selector: 'app-temp-transactions-table',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    LucideIconsModule,
    PrimeNgModule,
  ],
  templateUrl: './temp-transactions-table.component.html',
  providers: [MessageService],
})
export class TempTransactionsTableComponent implements OnInit {
  @Input() userEmail = '';

  private transactionService = inject(TransactionService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  transactions: TransactionsResponse[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadTransactions();
  }

  refresh(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    if (!this.userEmail) return;
    this.loading = true;
    this.transactionService.getTemporaryTransactions(this.userEmail).subscribe({
      next: (data) => {
        this.transactions = data.map((t, i) => ({
          ...t,
          rowId: t.rowId || `temp-${i}-${t.stockCode || 'unknown'}-${t.transactionDate || ''}`,
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load temporary transactions',
        });
        this.cdr.detectChanges();
      },
    });
  }
}
