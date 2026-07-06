import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { UploadTransactionsComponent } from '../../components/upload-transactions/upload-transactions.component';
import { UploadPreviewTableComponent } from '../../components/upload-preview-table/upload-preview-table.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { TransactionsTableComponent } from "../../components/transactions-table/transactions-table.component";
import { AllTransactionsComponent } from '../../components/transaction-list/all-transactions.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';

@Component({
    selector: 'app-investments',
    standalone: true,
    imports: [UploadTransactionsComponent, UploadPreviewTableComponent, FooterComponent, TransactionsTableComponent, AllTransactionsComponent, LucideIconsModule],
    templateUrl: './investments.component.html',
    styleUrls: ['./investments.component.css'],
    providers: [MessageService]
})
export class InvestmentsComponent {
  selectedFile: File | null = null;
  selectedQuarter = 'Q1';

  onQuarterSelected(quarter: string): void {
    this.selectedQuarter = quarter;
  }

  onFileSelected(file: File): void {
    this.selectedFile = file;
  }

  onUploadComplete(): void {
    this.selectedFile = null;
    // Sections 3 and 4 will be refreshed here once implemented.
  }

  onFileCleared(): void {
    this.selectedFile = null;
  }
}
