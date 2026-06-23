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
import { finalize } from 'rxjs/operators';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';

import { FormsModule } from '@angular/forms';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

import { ToastType } from '../../../../models/transaction';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';

type Step = 'pick-file' | 'review' | 'uploading' | 'result';
type ResultKind = 'success' | 'error';

interface UploadResult {
  kind: ResultKind;
  title: string;
  message: string;
  category?: string;
  fileName?: string;
  quarter?: string;
  rawServerMessage?: string;
}

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
  @Output() onUploadComplete = new EventEmitter<string>();
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

  // ===== State machine =====
  step: Step = 'pick-file';
  quarter: string = 'Q1';
  file: File | null = null;
  progress: number = 0;
  result: UploadResult | null = null;
  isUploading = false;
  fileError: string | null = null;

  quarters = [
    { label: 'Q1 (Jan - Mar)', value: 'Q1' },
    { label: 'Q2 (Apr - Jun)', value: 'Q2' },
    { label: 'Q3 (Jul - Sep)', value: 'Q3' },
    { label: 'Q4 (Oct - Dec)', value: 'Q4' },
  ];

  private uploadSub?: Subscription;
  private readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  constructor(
    private transactionService: TransactionService,
    private authService: AuthService,
    private notificationService: NotificationService,
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
    this.step = 'review';
  }

  dismissFileError(): void {
    this.fileError = null;
  }

  removeFile(): void {
    this.file = null;
    this.fileError = null;
    this.progress = 0;
    this.step = 'pick-file';
  }

  // ========== Upload ==========
  startUpload(): void {
    if (!this.file || this.isUploading) return;

    const email = this.authService.getUserEmail();
    if (!email) {
      const classified = this.transactionService.classifyUploadError({
        category: 'no-email',
      });
      this.result = {
        kind: 'error',
        title: classified.title,
        message: classified.message,
        category: classified.category,
        fileName: this.file.name,
        quarter: this.quarter,
      };
      this.step = 'result';
      return;
    }

    this.progress = 0;
    this.isUploading = true;
    this.step = 'uploading';

    this.uploadSub = this.transactionService
      .uploadTransactions(email, this.file, this.quarter)
      .pipe(
        finalize(() => {
          this.isUploading = false;
          this.uploadSub = undefined;
        }),
      )
      .subscribe({
        next: (event: HttpEvent<any>) => {
          switch (event.type) {
            case HttpEventType.UploadProgress:
              if (event.total) {
                this.progress = Math.round(
                  (100 * event.loaded) / event.total,
                );
              }
              break;
            case HttpEventType.Response:
              this.progress = 100;
              const body = event.body;
              let resultMessage: string;
              let kind: ResultKind = 'success';
              let category: string | undefined;
              let rawServerMessage: string | undefined;

              if (typeof body === 'string') {
                resultMessage = body;
              } else if (body && typeof body === 'object') {
                resultMessage =
                  (body as any).message ||
                  (body as any).data ||
                  'Upload completed.';
                if ((body as any).status || (body as any).error) {
                  kind = 'error';
                  category = 'bad-request';
                  rawServerMessage = resultMessage;
                }
              } else {
                resultMessage = 'Upload completed.';
              }

              this.result = {
                kind,
                title:
                  kind === 'success'
                    ? 'Upload Successful'
                    : "Couldn't process file",
                message: resultMessage,
                fileName: this.file?.name,
                quarter: this.quarter,
                category,
                rawServerMessage,
              };
              this.onUploadComplete.emit(resultMessage);
              this.step = 'result';
              break;
          }
        },
        error: (err) => {
          console.error('Upload error:', err);
          const classified = this.transactionService.classifyUploadError(err);
          const rawServerMessage =
            (typeof err?.error === 'string' ? err.error : undefined) ||
            err?.error?.message ||
            err?.error?.data ||
            (typeof err?.message === 'string' &&
            !err.message.startsWith('Http failure')
              ? err.message
              : undefined);
          this.result = {
            kind: 'error',
            title: classified.title,
            message: classified.message,
            category: classified.category,
            fileName: this.file?.name,
            quarter: this.quarter,
            rawServerMessage,
          };
          this.step = 'result';
          this.onUploadComplete.emit(this.result.message);
        },
      });
  }

  cancelUpload(): void {
    if (this.uploadSub) {
      this.uploadSub.unsubscribe();
      this.uploadSub = undefined;
    }
    this.isUploading = false;
    this.progress = 0;
    this.step = 'review';
  }

  retry(): void {
    if (this.result?.kind === 'error' && this.file) {
      this.result = null;
      this.progress = 0;
      this.step = 'review';
    } else {
      this.reset();
    }
  }

  backToFilePick(): void {
    this.file = null;
    this.fileError = null;
    this.result = null;
    this.progress = 0;
    this.step = 'pick-file';
  }

  reset(): void {
    this.file = null;
    this.fileError = null;
    this.result = null;
    this.progress = 0;
    this.isUploading = false;
    this.step = 'pick-file';
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
    if (this.uploadSub) {
      this.uploadSub.unsubscribe();
    }
  }
}
