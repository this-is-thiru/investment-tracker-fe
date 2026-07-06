import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';

import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';

export interface PreviewRow {
  stock: string;
  type: string;
  qty: number;
  price: number;
  total: number;
  date: string;
  broker: string;
  exchange: string;
  asset: string;
  charges: number;
}

@Component({
  selector: 'app-upload-preview-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    ExpansionPanelComponent,
    PrimeNgModule,
  ],
  providers: [MessageService],
  templateUrl: './upload-preview-table.component.html',
})
export class UploadPreviewTableComponent implements OnChanges {
  @Input() file: File | null = null;
  @Input() quarter = 'Q1';
  @Output() uploadComplete = new EventEmitter<void>();
  @Output() fileCleared = new EventEmitter<void>();

  private transactionService = inject(TransactionService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  previewRows: PreviewRow[] = [];
  filteredRows: PreviewRow[] = [];
  searchQuery = '';
  isUploading = false;
  progress = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['file'] && this.file) {
      this.parseFile(this.file);
    }
  }

  parseFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const binaryString = e.target?.result as string;
      const workbook = XLSX.read(binaryString, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      if (rawData.length > 1) {
        const headers = rawData[0] as string[];
        const getIndex = (key: string) => headers.findIndex((h) => h?.toLowerCase() === key.toLowerCase());

        this.previewRows = rawData.slice(1).map((row) => ({
          stock: String(row[getIndex('Stock')] ?? ''),
          type: String(row[getIndex('Type')] ?? ''),
          qty: Number(row[getIndex('Qty')] ?? 0),
          price: Number(row[getIndex('Price')] ?? 0),
          total: Number(row[getIndex('Total')] ?? 0),
          date: String(row[getIndex('Date')] ?? ''),
          broker: String(row[getIndex('Broker')] ?? ''),
          exchange: String(row[getIndex('Exchange')] ?? ''),
          asset: String(row[getIndex('Asset')] ?? ''),
          charges: Number(row[getIndex('Charges')] ?? 0),
        }));
      } else {
        this.previewRows = [];
      }
      this.applyFilters();
    };
    reader.readAsBinaryString(file);
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();
    if (!q) {
      this.filteredRows = [...this.previewRows];
      return;
    }
    this.filteredRows = this.previewRows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(q),
      ),
    );
  }

  startUpload(): void {
    if (!this.file || this.isUploading) return;

    const email = this.authService.getUserEmail();
    if (!email) {
      this.messageService.add({
        severity: 'error',
        summary: 'Please sign in',
        detail: 'You need to be signed in to upload transactions.',
      });
      return;
    }

    this.isUploading = true;
    this.progress = 0;

    this.transactionService
      .uploadTransactions(email, this.file, this.quarter)
      .subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress = Math.round((100 * event.loaded) / event.total);
          } else if (event.type === HttpEventType.Response) {
            this.progress = 100;
            this.isUploading = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Upload Successful',
              detail: 'Transactions uploaded successfully.',
            });
            this.uploadComplete.emit();
          }
        },
        error: (err) => {
          console.error('Upload error:', err);
          this.isUploading = false;
          const classified = this.transactionService.classifyUploadError(err);
          this.messageService.add({
            severity: 'error',
            summary: classified.title,
            detail: classified.message,
          });
        },
      });
  }

  clearFile(): void {
    this.file = null;
    this.previewRows = [];
    this.filteredRows = [];
    this.searchQuery = '';
    this.progress = 0;
    this.isUploading = false;
    this.fileCleared.emit();
  }
}
