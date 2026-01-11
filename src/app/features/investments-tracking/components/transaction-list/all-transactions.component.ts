import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subject, takeUntil } from 'rxjs';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';

// Interfaces
export interface Transaction {
  id: string;
  stock: string;
  quantity: number;
  status: string;
  actionDate: string;
}

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Component({
  selector: 'app-all-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule],
  templateUrl: './all-transactions.component.html',
  styleUrls: ['./all-transactions.component.css'],
})
export class AllTransactionsComponent implements OnInit, OnDestroy {
  // --- State Variables ---
  activeTab: 'upload' | 'process' = 'upload';
  selectedAction: string = 'bonus';
  portfolioTransactions: Transaction[] = [];
  temporaryTransactions: Transaction[] = [];
  isLoading: boolean = false;
  hasLoadedTransactions: boolean = false;
  currentStep: number = 1;
  hasUploadedFile: boolean = false;
  uploadedFileName: string = '';
  uploadProgress: number = 0;
  isUploading: boolean = false;
  activeTableTab: 'temporary' | 'portfolio' = 'temporary';
  toast: Toast | null = null;

  private destroy$ = new Subject<void>();

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
    // Initialization logic if needed
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Utility Functions ---

  /** Shows a toast notification for 3 seconds */
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast = { message, type };

    // Clear toast after 3 seconds
    interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.toast && this.toast.message === message) {
          this.toast = null;
        }
      });
  }

  // --- File Upload Logic ---

  handleFileSelect(event: Event | File): void {
    const file =
      event instanceof File
        ? event
        : (event.target as HTMLInputElement).files?.[0];

    if (!file) return;

    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name
      .toLowerCase()
      .slice(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      this.showToast(
        'Invalid file type. Please upload an Excel file (.xlsx or .xls)',
        'error',
      );
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.showToast('File size exceeds 10MB limit', 'error');
      return;
    }

    // Start upload simulation
    this.isUploading = true;
    this.uploadedFileName = file.name;
    this.uploadProgress = 0;

    interval(200)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.uploadProgress += 10;

        if (this.uploadProgress >= 100) {
          this.destroy$.next(); // Stop the interval
          setTimeout(() => {
            this.isUploading = false;
            this.hasUploadedFile = true;
            this.showToast(`${file.name} uploaded successfully!`, 'success');
          }, 500);
        }
      });
  }

  handleDrop(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  handleDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  removeFile(): void {
    this.hasUploadedFile = false;
    this.uploadedFileName = '';
    this.uploadProgress = 0;
    this.showToast('File removed', 'info');
  }

  // --- Corporate Action Handlers ---

  async handleLoadTransactions(): Promise<void> {
    this.isLoading = true;
    this.showToast('Loading transactions...', 'info');

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock Data
    const mockPortfolio: Transaction[] = [
      {
        id: 'PT001',
        stock: 'AAPL',
        quantity: 100,
        status: 'Completed',
        actionDate: '2025-10-15',
      },
      {
        id: 'PT002',
        stock: 'GOOGL',
        quantity: 50,
        status: 'Completed',
        actionDate: '2025-10-14',
      },
      {
        id: 'PT003',
        stock: 'MSFT',
        quantity: 75,
        status: 'Completed',
        actionDate: '2025-10-13',
      },
    ];
    const mockTemp: Transaction[] = [
      {
        id: 'TT001',
        stock: 'TSLA',
        quantity: 200,
        status: 'Pending',
        actionDate: '2025-10-20',
      },
      {
        id: 'TT002',
        stock: 'AMZN',
        quantity: 150,
        status: 'Pending',
        actionDate: '2025-10-19',
      },
      {
        id: 'TT003',
        stock: 'NVDA',
        quantity: 300,
        status: 'Pending',
        actionDate: '2025-10-18',
      },
      {
        id: 'TT004',
        stock: 'META',
        quantity: 120,
        status: 'Pending',
        actionDate: '2025-10-17',
      },
    ];

    this.portfolioTransactions = mockPortfolio;
    this.temporaryTransactions = mockTemp;
    this.hasLoadedTransactions = true;
    this.currentStep = 2;
    this.isLoading = false;
    this.showToast('Transactions loaded successfully', 'success');
  }

  async handleRedrive(): Promise<void> {
    if (!this.hasLoadedTransactions || this.temporaryTransactions.length === 0)
      return;

    this.isLoading = true;
    this.showToast('Re-driving transactions...', 'info');

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Mock redrive: removes some transactions
    const filtered = this.temporaryTransactions.slice(0, 2);
    this.temporaryTransactions = filtered;
    this.currentStep = 3;
    this.isLoading = false;
    this.showToast(
      `Re-drive completed. ${filtered.length} transactions require action.`,
      'success',
    );
  }

  async handlePerformCorporateAction(): Promise<void> {
    if (!this.hasLoadedTransactions || this.temporaryTransactions.length === 0)
      return;

    this.isLoading = true;
    this.showToast('Processing corporate action...', 'info');

    await new Promise((resolve) => setTimeout(resolve, 1800));

    // Move temporary transactions to portfolio and mark as completed
    const completed: Transaction[] = this.temporaryTransactions.map((t) => ({
      ...t,
      status: 'Completed',
    }));

    this.portfolioTransactions = [...this.portfolioTransactions, ...completed];
    this.temporaryTransactions = [];
    this.currentStep = 4;
    this.isLoading = false;
    this.showToast('Corporate action completed successfully!', 'success');
  }

  // --- Helper Getters for Template ---

  get actionButtonText(): string {
    return (
      this.selectedAction.charAt(0).toUpperCase() + this.selectedAction.slice(1)
    );
  }
}
