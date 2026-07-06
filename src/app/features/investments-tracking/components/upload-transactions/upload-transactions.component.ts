import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';

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
})
export class UploadTransactionsComponent implements OnDestroy {
  @Output() fileSelected = new EventEmitter<File>();
  @Output() quarterSelected = new EventEmitter<string>();
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

  quarter: string = 'Q1';
  file: File | null = null;
  fileError: string | null = null;

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
  ) {}

  // ========== Quarter ==========
  onQuarterChange(value: string): void {
    this.quarter = value;
    this.quarterSelected.emit(value);
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
    this.fileSelected.emit(file);
  }

  dismissFileError(): void {
    this.fileError = null;
  }

  removeFile(): void {
    this.file = null;
    this.fileError = null;
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

  ngOnDestroy(): void {
    // No subscriptions to clean up
  }
}