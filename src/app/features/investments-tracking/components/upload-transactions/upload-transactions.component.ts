import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import * as XLSX from 'xlsx';

import { FormsModule } from '@angular/forms';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

import { ToastType } from '../../../../models/transaction';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-upload-transactions',
  standalone: true,
  imports: [
    CommonModule,
    LucideIconsModule,
    ExpansionPanelComponent,
    FormsModule,
    PrimeNgModule,
  ],
  providers: [MessageService],
  templateUrl: './upload-transactions.component.html',
  styleUrls: ['./upload-transactions.component.css'],
})
export class UploadTransactionsComponent implements OnDestroy {
  @Output() uploadComplete = new EventEmitter<void>();
  @Input('showToast') showToastInput?: (message: string, type: ToastType) => void;

  showToast(message: string, type: ToastType): void {
    if (this.showToastInput) {
      this.showToastInput(message, type);
    } else {
      const title =
        type === 'error'
          ? 'Error'
          : type === 'success'
            ? 'Success'
            : type === 'warn'
              ? 'Warning'
              : 'Info';
      const notificationType = type === 'warn' ? 'warning' : type;
      this.notificationService.addNotification(title, message, notificationType);
    }
  }

  @Input() quarter: string = 'Q1';
  file: File | null = null;
  fileError: string | null = null;

  // File preview & uploading state
  headers: string[] = [];
  previewRows: any[] = [];
  filteredRows: any[] = [];
  searchQuery = '';
  isUploading = false;
  progress = 0;

  quarters = [
    { label: 'Q1 (Jan - Mar)', value: 'Q1' },
    { label: 'Q2 (Apr - Jun)', value: 'Q2' },
    { label: 'Q3 (Jul - Sep)', value: 'Q3' },
    { label: 'Q4 (Oct - Dec)', value: 'Q4' },
  ];

  private readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  constructor(
    private transactionService: TransactionService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ========== Quarter ==========
  onQuarterChange(value: string): void {
    this.quarter = value;
  }

  // ========== File Selection ==========
  onFilePicked(fileInput: File | Event): void {
    const file =
      fileInput instanceof File
        ? fileInput
        : (fileInput.target as HTMLInputElement).files?.[0];

    if (!file) return;

    const dotIndex = file.name.lastIndexOf('.');
    const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
    if (ext !== '.xlsx' && ext !== '.xls') {
      const errorMessage = `We accept .xlsx and .xls files. Your file is ${ext || 'unknown type'}.`;
      this.fileError = errorMessage;
      this.showToast(errorMessage, 'error');
      return;
    }

    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      const errorMessage = `Maximum size is 10 MB. Yours is ${this.formatFileSize(file.size)}. Try splitting the file by quarter.`;
      this.fileError = errorMessage;
      this.showToast(errorMessage, 'error');
      return;
    }

    this.fileError = null;
    this.file = file;
    this.parseFile(file);
  }

  dismissFileError(): void {
    this.fileError = null;
  }

  clearFile(): void {
    this.file = null;
    this.fileError = null;
    this.headers = [];
    this.previewRows = [];
    this.filteredRows = [];
    this.searchQuery = '';
    this.progress = 0;
    this.isUploading = false;
  }

  // ========== Drag & Drop ==========
  handleDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  handleDrop(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer?.files.length) {
      this.onFilePicked(e.dataTransfer.files[0]);
    }
  }

  // ========== File Utilities ==========
  formatFileSize(size: number): string {
    return size < 1024 * 1024
      ? `${(size / 1024).toFixed(2)} KB`
      : `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  // ========== Download Template ==========
  handleDownloadTemplate(): void {
    this.transactionService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        this.showToast('Template download started', 'success');
      },
      error: (err) => {
        console.error('Template download failed:', err);
        this.showToast('Failed to download template', 'error');
      },
    });
  }

  // ========== File Parsing & Helpers ==========
  private normalizeHeader(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private parseNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseDate(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';

    let date: Date | null = null;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      const utcDays = Math.floor(value - 25569);
      date = new Date(utcDays * 24 * 60 * 60 * 1000);
    } else {
      const str = String(value).trim();
      if (!str) return '';
      date = new Date(str);
    }

    if (!date || isNaN(date.getTime())) {
      return String(value);
    }

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isTypeColumn(col: string): boolean {
    const c = col.toLowerCase();
    return c === 'type' || c === 'transaction type' || c === 'action' || c === 'buy/sell' || c === 'side';
  }

  isBuy(val: any): boolean {
    if (!val) return false;
    const v = String(val).toLowerCase();
    return v === 'buy' || v === 'b';
  }

  isSell(val: any): boolean {
    if (!val) return false;
    const v = String(val).toLowerCase();
    return v === 'sell' || v === 's';
  }

  isPriceColumn(col: string): boolean {
    const c = col.toLowerCase();
    return c.includes('price') || c.includes('amount') || c.includes('total') || c.includes('value') || c.includes('charge') || c.includes('tax') || c.includes('brokerage') || c.includes('rate');
  }

  isQtyColumn(col: string): boolean {
    const c = col.toLowerCase();
    return c.includes('qty') || c.includes('quantity') || c.includes('volume') || c.includes('shares');
  }

  isDateColumn(col: string): boolean {
    const c = col.toLowerCase();
    return c.includes('date') || c.includes('time');
  }

  isNumber(val: any): boolean {
    return typeof val === 'number' && !isNaN(val);
  }

  parseFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const binaryString = e.target?.result as string;
      const workbook = XLSX.read(binaryString, {
        type: 'binary',
        cellDates: true,
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

      if (rawData.length > 1) {
        const rawHeaders = (rawData[0] as unknown[]) || [];
        const excludedColumns = ['email', 'stock code', 'maturity date'];
        
        const validHeaderIndices: number[] = [];
        this.headers = [];
        
        rawHeaders.forEach((h, i) => {
          let headerStr = String(h ?? '').trim();
          if (!headerStr) {
            headerStr = `Column ${i + 1}`;
          }
          if (!excludedColumns.includes(headerStr.toLowerCase())) {
            this.headers.push(headerStr);
            validHeaderIndices.push(i);
          }
        });

        this.previewRows = rawData.slice(1).map((row: any) => {
          const obj: any = {};
          this.headers.forEach((header, i) => {
            const index = validHeaderIndices[i];
            let val = row[index];
            if (val === undefined || val === null) {
              val = '';
            } else if (this.isDateColumn(header) || val instanceof Date) {
              val = this.parseDate(val);
            } else if (this.isPriceColumn(header) || this.isQtyColumn(header)) {
              val = this.parseNumber(val);
            }
            obj[header] = val;
          });
          return obj;
        });
      } else {
        this.headers = [];
        this.previewRows = [];
      }
      this.applyFilters();
      this.cdr.detectChanges();
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

  // ========== Start Upload Flow ==========
  startUpload(): void {
    if (!this.file || this.isUploading) return;

    const email = this.authService.getUserEmail();
    if (!email) {
      this.showToast('You need to be signed in to upload transactions.', 'error');
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
            this.showToast('Transactions uploaded successfully.', 'success');
            this.uploadComplete.emit();
            this.clearFile(); // Reset back to Step 1 on success
          }
        },
        error: (err) => {
          console.error('Upload error:', err);
          this.isUploading = false;
          const classified = this.transactionService.classifyUploadError(err);
          this.showToast(classified.message, 'error');
        },
      });
  }

  ngOnDestroy(): void {
    // No subscriptions to clean up
  }
}