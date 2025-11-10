// upload-transactions.component.ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { HttpEvent, HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-upload-transactions',
  standalone: true,
  imports: [CommonModule],
  providers: [MessageService],
  templateUrl: './upload-transactions.component.html',
})
export class UploadTransactionsComponent implements OnDestroy {
  uploading = false;
  uploadedFile: File | null = null;
  progress = 0; // number (0-100)
  private uploadSub?: Subscription;

  private readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // optional: 10 MB max

  constructor(
    private transactionService: TransactionService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  browseFiles(input: HTMLInputElement) {
    input.click();
  }

  handleFile(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    const file = target.files[0];
    this.startUpload(file);
    // reset input so same file can be selected again if needed
    target.value = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      const file = event.dataTransfer.files[0];
      this.startUpload(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private validateFile(file: File): string | null {
    const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                     'application/vnd.ms-excel']; // sometimes excel mime
    if (!allowed.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return 'Unsupported file type. Please upload an .xlsx file.';
    }
    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      return `File is too large. Max allowed size is ${this.getFileSize(this.MAX_FILE_SIZE_BYTES)}.`;
    }
    return null;
  }

  private startUpload(file: File) {
    const email = this.authService.getUserEmail();
    if (!email) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Not Logged In',
        detail: 'Please log in before uploading.',
      });
      return;
    }

    const validationError = this.validateFile(file);
    if (validationError) {
      this.messageService.add({ severity: 'error', summary: 'Invalid file', detail: validationError });
      return;
    }

    // If there's an ongoing upload, cancel it first
    this.cancelUploadIfAny();

    this.uploading = true;
    this.progress = 0;
    this.uploadedFile = null; // will set when response arrives

    this.uploadSub = this.transactionService.uploadTransactions(email, file)
      .pipe(
        finalize(() => {
          // finalize runs whether success/error/cancel
          this.uploading = false;
          this.uploadSub = undefined;
        })
      )
      .subscribe({
        next: (event: HttpEvent<any>) => {
          switch (event.type) {
            case HttpEventType.Sent:
              break;
            case HttpEventType.UploadProgress:
              if (event.total) {
                this.progress = Math.round((100 * event.loaded) / event.total);
              } else {
                // unknown total — fallback to approx or keep previous
                this.progress = Math.min(99, this.progress + 5);
              }
              break;
            case HttpEventType.Response:
              // Upload finished with server response
              this.progress = 100;
              this.uploadedFile = file;
              this.messageService.add({
                severity: 'success',
                summary: 'Upload Complete',
                detail: `${file.name} uploaded successfully!`,
              });
              break;
            default:
              // other events
              break;
          }
        },
        error: (err) => {
          const detail = err?.error?.message || err?.message || 'Something went wrong.';
          this.messageService.add({
            severity: 'error',
            summary: 'Upload Failed',
            detail,
          });
        },
      });
  }

  removeFile() {
    // If uploading, cancel the request; otherwise just clear the UI state
    this.cancelUploadIfAny();
    this.uploadedFile = null;
    this.uploading = false;
    this.progress = 0;
    this.messageService.add({
      severity: 'info',
      summary: 'File Deselected',
      detail: 'Upload cancelled / file removed.',
    });
  }

  private cancelUploadIfAny() {
    if (this.uploadSub) {
      this.uploadSub.unsubscribe(); // cancels the HTTP request
      this.uploadSub = undefined;
      console.debug('🛑 [Component] Upload subscription unsubscribed (cancelled).');
    }
  }

  // Download template file from server
  downloadTemplate(): void {
    this.transactionService.downloadTemplate().subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      this.messageService.add({
        severity: 'success',
        summary: 'Download Started',
        detail: 'template.xlsx',
      });
    }, (err) => {
      console.error('❌ [Component] Template download failed:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Download Failed',
        detail: err?.message || 'Could not download template.',
      });
    });
  }

  getFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    else if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
    else return (size / (1024 * 1024)).toFixed(2) + ' MB';
  }

  ngOnDestroy(): void {
    this.cancelUploadIfAny();
  }
}
