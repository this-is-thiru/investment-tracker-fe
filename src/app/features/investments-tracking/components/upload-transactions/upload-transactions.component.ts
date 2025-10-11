import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { BaseurlService } from '../../../../services/baseurl.service';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';
import { finalize } from 'rxjs';


@Component({
  selector: 'app-upload-transactions',
  standalone: true,
  imports: [CommonModule],
  providers: [MessageService],
  templateUrl: './upload-transactions.component.html',
})
export class UploadTransactionsComponent {
  uploading = false;
  progress = 0;
  uploadedFile: File | null = null;


  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private BASE_URL: BaseurlService,
    private transactionService: TransactionService,
    private authService: AuthService,
  ) { }


  // Trigger file input
  browseFiles(input: HTMLInputElement) {
    input.click();
  }

  // Handle file selection
  handleFile(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    this.startUpload(target.files[0]);
  }

  // Drag & drop
  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      this.startUpload(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  
    // ✅ Main change: upload using FormData without manual Content-Type
  private startUpload(file: File) {
    this.uploadedFile = null;
    this.uploading = true;
    this.progress = 0;

    const email = this.authService.getUserEmail();
    if (!email) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Not Logged In',
        detail: 'Please log in before uploading transactions.',
      });
      this.uploading = false;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Let browser handle Content-Type for FormData
    this.http
      .post(`${this.BASE_URL.getBaseUrl()}/portfolio/user/${email}/upload-transactions`, formData, {
        reportProgress: true,
        observe: 'events', // allows progress tracking
      })
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: (event: any) => {
          // Track progress
          if (event.type === 1 && event.total) {
            this.progress = Math.round((100 * event.loaded) / event.total);
          }
          // Handle success
          if (event.type === 4) {
            this.uploadedFile = file;
            this.messageService.add({
              severity: 'success',
              summary: 'Upload Complete',
              detail: `${file.name} uploaded successfully!`,
            });
          }
        },
        error: (err) => {
          console.error('Upload failed:', err);
          this.progress = 0;
          this.messageService.add({
            severity: 'error',
            summary: 'Upload Failed',
            detail: 'Something went wrong while uploading. Please try again.',
          });
        },
      });
  }


  // Format file size nicely
  getFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  removeFile() {
    this.uploadedFile = null;
    this.progress = 0;
    this.uploading = false;
  }

  // Download template file from server
  downloadTemplate(): void {
    this.http
      .get(`${this.BASE_URL.getBaseUrl()}/helper/template`, { responseType: 'blob' })
      .subscribe((response: Blob) => {
        const url = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Download Started', detail: 'Template.xlsx' });
      });
  }
}
