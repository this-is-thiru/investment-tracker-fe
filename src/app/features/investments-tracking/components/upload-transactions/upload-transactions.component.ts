import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';

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

  
  constructor(private http: HttpClient, private messageService: MessageService) {}
  

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

  // Simulate upload
  private startUpload(file: File) {
    this.uploadedFile = null; // reset previous file
    this.uploading = true;
    this.progress = 0;

    const interval = setInterval(() => {
      if (this.progress >= 100) {
        clearInterval(interval);
        this.uploading = false;
        this.uploadedFile = file; // show file details
      } else {
        this.progress += 10;
      }
    }, 300);
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
      .get('http://localhost:8080/helper/template', { responseType: 'blob' })
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
