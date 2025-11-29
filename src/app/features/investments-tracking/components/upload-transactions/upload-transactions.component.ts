import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import {
  LucideAngularModule,
  Upload,
  CheckCircle2,
  Download,
  X,
} from 'lucide-angular';

import { ToastType } from '../../../../models/transaction';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-upload-transactions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [MessageService],
  templateUrl: './upload-transactions.component.html',
})
export class UploadTransactionsComponent implements OnDestroy {
  @Output() onUploadComplete = new EventEmitter<string>();
  @Input() showToast!: (message: string, type: ToastType) => void;

  uploadStatus: 'success' | 'filtered' | 'uploading' | null = null;

  selectedFile: File | null = null;
  uploadedFileName: string = '';
  uploadProgress: number = 0;
  isUploading = false;
  hasUploadedFile = false;
  private uploadSub?: Subscription;

  readonly Upload = Upload;
  readonly Download = Download;
  readonly X = X;
  readonly CheckCircle2Icon = CheckCircle2;

  private readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  constructor(
    private transactionService: TransactionService,
    private authService: AuthService,
  ) {}

  // ========== File Selection ==========
  handleFileSelect(event: Event | File): void {
    const file =
      event instanceof File
        ? event
        : (event.target as HTMLInputElement).files?.[0];

    if (!file) return;

    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      this.showToast('Invalid file type. Please upload .xlsx or .xls', 'error');
      return;
    }

    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      this.showToast('File size exceeds 10MB limit', 'error');
      return;
    }

    this.selectedFile = file;
    this.uploadedFileName = file.name;
  }

  // ========== Upload Handler ==========
  handleSendFile(): void {
    if (!this.selectedFile) return;

    const email = this.authService.getUserEmail();
    if (!email) {
      this.showToast('Please log in before uploading', 'warn');
      return;
    }

    this.cancelUploadIfAny();
    this.isUploading = true;
    this.uploadProgress = 0;

    this.uploadSub = this.transactionService
      .uploadTransactions(email, this.selectedFile)
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
                this.uploadProgress = Math.round(
                  (100 * event.loaded) / event.total,
                );
              }
              break;

            case HttpEventType.Response:
              this.uploadProgress = 100;
              this.hasUploadedFile = true;
              this.selectedFile = null;

              let responseBody: any;
              try {
                // Try parsing as JSON
                responseBody = JSON.parse(event.body);
              } catch {
                // If plain text, assign directly
                responseBody = event.body;
              }

              // ✅ Case 1: JSON (normal success)
              if (typeof responseBody === 'object' && responseBody !== null) {
                this.showToast(
                  `${this.uploadedFileName} uploaded successfully!`,
                  'success',
                );
                this.uploadStatus = 'success';
                this.onUploadComplete.emit(this.uploadedFileName);
              }
              // ⚠️ Case 2: Plain text (filtered transactions)
              else if (typeof responseBody === 'string') {
                if (responseBody.toLowerCase().includes('filtered')) {
                  this.showToast(
                    'Some transactions were filtered out. Please review them.',
                    'warn',
                  );
                  this.uploadStatus = 'filtered';
                  this.onUploadComplete.emit('filtered');
                } else {
                  // fallback if plain text but not filtered info
                  this.showToast(
                    `${this.uploadedFileName} uploaded successfully!`,
                    'success',
                  );
                  this.uploadStatus = 'success';
                  this.onUploadComplete.emit(this.uploadedFileName);
                }
              }
              break;
          }
        },
        error: (err) => {
          console.error('❌ Upload error:', err);
          this.showToast(
            err?.error?.message || 'Upload failed. Please try again.',
            'error',
          );
          this.isUploading = false;
          this.uploadStatus = null;
        },
      });
  }

  // ========== Cancel Upload ==========
  private cancelUploadIfAny() {
    if (this.uploadSub) {
      this.uploadSub.unsubscribe();
      this.uploadSub = undefined;
      console.debug('🛑 Upload cancelled');
    }
  }

  handleCancelFile(): void {
    this.cancelUploadIfAny();
    this.selectedFile = null;
    this.uploadedFileName = '';
    this.uploadProgress = 0;
    this.showToast('File selection cancelled', 'info');
  }

  removeFile(): void {
    this.cancelUploadIfAny();
    this.hasUploadedFile = false;
    this.uploadedFileName = '';
    this.uploadProgress = 0;
    this.showToast('File removed', 'info');
  }

  // ========== Drag & Drop ==========
  handleDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  handleDrop(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer?.files.length) {
      this.handleFileSelect(e.dataTransfer.files[0]);
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
    this.cancelUploadIfAny();
  }
}
