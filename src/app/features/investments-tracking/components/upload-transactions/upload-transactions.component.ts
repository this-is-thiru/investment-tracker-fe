import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import * as XLSX from 'xlsx';

import { FormsModule } from '@angular/forms';
import { PrimeNgModule } from '@core/prime-ng.module';
import { TooltipDirective } from '@shared/directives/tooltip/tooltip.directive';

import { ToastType } from '@models/toast.model';
import { TransactionService } from '@services/transaction.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { AlertComponent, AlertTone } from '@shared/ui/alert/alert.component';

interface ParsedSheet {
  headers: string[];
  rows: any[];
  textDateRows: number;
  rowIssues: string[];
  blankRows: number[];
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
    TooltipDirective,
    ButtonComponent,
    BadgeComponent,
    EmptyStateComponent,
    AlertComponent,
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
  @Input() expanded = true;
  file: File | null = null;
  fileError: string | null = null;

  // File preview & uploading state
  headers: string[] = [];
  previewRows: any[] = [];
  filteredRows: any[] = [];
  searchQuery = '';
  isUploading = false;
  progress = 0;

  private workbook: XLSX.WorkBook | null = null;
  private sheetCache = new Map<string, ParsedSheet>();
  sheetNames: string[] = [];
  selectedSheet: string = '';

  /**
   * The backend reads the sheet at the quarter's position (Q1 → 1st sheet, Q2 → 2nd, ...)
   * and ignores sheet names, so a quarter is only uploadable when that sheet exists.
   */
  private readonly baseQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  private readonly quarterMonths = ['Jan – Mar', 'Apr – Jun', 'Jul – Sep', 'Oct – Dec'];

  quarters: { label: string; value: string; sheet: string; hint: string; disabled: boolean }[] =
    this.baseQuarters.map((q) => ({ label: q, value: q, sheet: '', hint: '', disabled: false }));

  /** Sheet whose name points at another quarter than its position, e.g. "Q3" sitting first. */
  sheetNameMismatch: string | null = null;
  /** Number of sheets past the 4th, which the backend can never read. */
  ignoredSheetCount = 0;
  /** Rows whose date cells are text; the backend only accepts real Excel dates. */
  textDateRows = 0;
  /** Rows whose BROKER NAME / ASSET TYPE / TRANSACTION TYPE the backend cannot convert. */
  rowIssues: string[] = [];
  /** Excel row numbers of blank rows inside the used range; the backend reads these too. */
  blankRows: number[] = [];

  /** Temporary transactions the backend requires to be redriven before any upload. */
  pendingTempCount = 0;

  uploadResult: { tone: 'success' | 'warn' | 'error'; title: string; message: string; details: string[] } | null = null;

  get uploadResultTone(): AlertTone {
    const tone = this.uploadResult?.tone;
    return tone === 'error' ? 'danger' : tone === 'warn' ? 'warning' : 'success';
  }

  /** [5, 6, 7, 12] → "5–7, 12" */
  formatRowList(rows: number[]): string {
    const parts: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const start = rows[i];
      while (i + 1 < rows.length && rows[i + 1] === rows[i] + 1) i++;
      parts.push(start === rows[i] ? `${start}` : `${start}–${rows[i]}`);
    }
    return parts.join(', ');
  }

  dismissUploadResult(): void {
    this.uploadResult = null;
  }

  private readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  // Backend columns parsed as LOCAL_DATE; text values make the whole upload fail.
  private readonly backendDateColumns = new Set(['transaction date', 'maturity date']);
  // Backend enums (BrokerName, AssetType, TransactionType); values must match exactly.
  private readonly backendEnumColumns: Record<string, readonly string[]> = {
    'broker name': ['ZERODHA', 'UPSTOX', 'FYERS'],
    'asset type': ['EQUITY', 'MUTUAL_FUND', 'BOND', 'GOLD_BOND', 'FD', 'INSURANCE'],
    'transaction type': ['BUY', 'SELL'],
  };

  constructor(
    private transactionService: TransactionService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ========== Quarter ==========
  onQuarterChange(value: string): void {
    this.quarter = value;
    this.uploadResult = null;
    const sheet = this.quarters.find((q) => q.value === value)?.sheet;
    if (this.workbook && sheet && sheet !== this.selectedSheet) {
      this.selectedSheet = sheet;
      this.loadSheetData(sheet);
    }
    this.updateSheetNameMismatch();
  }

  /**
   * Detects the quarter a sheet name refers to: "Q1", "FY26-Q2", "Quarter 3",
   * "Qtr_4", or a month range like "Jan-Mar". Returns null when ambiguous.
   */
  private detectQuarter(sheetName: string): string | null {
    const name = sheetName.toLowerCase();
    const q = name.match(/(?<![a-z])q(?:uarter|tr)?[\s_.-]*([1-4])(?!\d)/);
    if (q) return `Q${q[1]}`;

    const range = name.match(/\b(jan|apr|jul|oct)[a-z]*[\s_.-]*(?:to|-|–)?[\s_.-]*(mar|jun|sep|dec)/);
    if (range) {
      const starts = ['jan', 'apr', 'jul', 'oct'];
      const ends = ['mar', 'jun', 'sep', 'dec'];
      const i = starts.indexOf(range[1]);
      if (i === ends.indexOf(range[2])) return `Q${i + 1}`;
    }
    return null;
  }

  /** Maps quarter N to sheet N, matching the backend; quarters without that sheet are disabled. */
  private buildQuarterOptions(): void {
    this.quarters = this.baseQuarters.map((q, i) => {
      const sheet = this.sheetNames[i] ?? '';
      return {
        value: q,
        label: q,
        sheet,
        disabled: !sheet,
        hint: `${q} (${this.quarterMonths[i]}) · ${sheet ? `uploads sheet ${i + 1}: ${sheet}` : `this file has no sheet ${i + 1}`}`,
      };
    });
    this.ignoredSheetCount = Math.max(0, this.sheetNames.length - this.baseQuarters.length);
  }

  private updateSheetNameMismatch(): void {
    const named = this.selectedSheet ? this.detectQuarter(this.selectedSheet) : null;
    this.sheetNameMismatch = named && named !== this.quarter ? named : null;
  }

  private resetQuarterOptions(): void {
    this.quarters = this.baseQuarters.map((q) => ({ label: q, value: q, sheet: '', hint: '', disabled: false }));
    this.sheetNameMismatch = null;
    this.ignoredSheetCount = 0;
  }

  // ========== Pending temporary transactions ==========
  /** The backend rejects uploads while temporary transactions exist, so check up front. */
  checkPendingTemporary(): void {
    const email = this.authService.getUserEmail();
    if (!email) return;
    this.transactionService.getTemporaryTransactions(email).subscribe({
      next: (rows) => {
        this.pendingTempCount = rows?.length ?? 0;
        this.cdr.markForCheck();
      },
      // Unknown state: let the upload go through and rely on the server's answer.
      error: () => {
        this.pendingTempCount = 0;
        this.cdr.markForCheck();
      },
    });
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
    // The backend reads workbooks with Apache POI's XSSF, which only understands .xlsx.
    if (ext !== '.xlsx') {
      const errorMessage =
        ext === '.xls'
          ? 'Old .xls files are not supported. Open it in Excel and save as .xlsx.'
          : `We accept .xlsx files only. Your file is ${ext || 'unknown type'}.`;
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
    this.uploadResult = null;
    this.file = file;
    this.parseFile(file);
    this.checkPendingTemporary();
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
    this.workbook = null;
    this.sheetCache.clear();
    this.sheetNames = [];
    this.selectedSheet = '';
    this.rowIssues = [];
    this.blankRows = [];
    this.textDateRows = 0;
    this.uploadResult = null;
    this.resetQuarterOptions();
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

  private parseNumber(value: unknown): number | string {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return value;
    // Accept "1,234.50", "₹ 1,234", "(250)" style values from broker exports.
    let str = String(value).trim().replace(/[,\s₹$]/g, '');
    const negative = /^\(.*\)$/.test(str);
    if (negative) str = str.slice(1, -1);
    const parsed = Number(str);
    if (!str || !Number.isFinite(parsed)) return String(value);
    return negative ? -parsed : parsed;
  }

  private formatYmd(y: number, m: number, d: number): string {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  /** Normalises Excel serials and common text formats to YYYY-MM-DD without timezone drift. */
  private parseDate(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';

    if (typeof value === 'number') {
      // Excel serial day (1900 date system); computed in UTC so local offsets can't shift the day.
      const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400) * 1000);
      return this.formatYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }

    const str = String(value).trim();
    if (!str) return '';

    const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) return this.formatYmd(+ymd[1], +ymd[2], +ymd[3]);

    // Numeric day-first dates (DD-MM-YYYY), as used in Indian broker statements.
    const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmy) return this.formatYmd(+dmy[3], +dmy[2], +dmy[1]);

    // Text dates like "15-Jan-2026" or "Jan 15, 2026": read local fields, not UTC.
    const date = new Date(str.replace(/-/g, ' '));
    if (isNaN(date.getTime())) return str;
    return this.formatYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
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
      try {
        this.workbook = XLSX.read(e.target?.result as ArrayBuffer, { type: 'array' });
      } catch (err) {
        console.error('Failed to parse workbook:', err);
        this.clearFile();
        this.fileError = 'This file could not be read. Make sure it is a valid Excel workbook.';
        this.showToast(this.fileError, 'error');
        this.cdr.markForCheck();
        return;
      }
      this.sheetCache.clear();
      this.sheetNames = this.workbook.SheetNames || [];
      this.buildQuarterOptions();

      // Keep the current quarter if it has a sheet, otherwise jump to the first quarter that does.
      const current = this.quarters.find((q) => q.value === this.quarter && !q.disabled);
      const target = current ?? this.quarters.find((q) => !q.disabled);
      this.quarter = target?.value ?? this.quarter;
      this.selectedSheet = target?.sheet ?? '';
      this.updateSheetNameMismatch();

      if (this.selectedSheet) {
        this.loadSheetData(this.selectedSheet);
      } else {
        this.headers = [];
        this.previewRows = [];
        this.textDateRows = 0;
        this.rowIssues = [];
        this.blankRows = [];
        this.applyFilters();
        this.cdr.detectChanges();
      }
    };
    reader.readAsArrayBuffer(file);
  }

  loadSheetData(sheetName: string): void {
    if (!this.workbook || !sheetName) return;

    let parsed = this.sheetCache.get(sheetName);
    if (!parsed) {
      parsed = this.parseSheet(this.workbook.Sheets[sheetName]);
      this.sheetCache.set(sheetName, parsed);
    }
    this.headers = parsed.headers;
    this.previewRows = parsed.rows;
    this.textDateRows = parsed.textDateRows;
    this.rowIssues = parsed.rowIssues;
    this.blankRows = parsed.blankRows;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  private parseSheet(sheet: XLSX.WorkSheet | undefined): ParsedSheet {
    if (!sheet) return { headers: [], rows: [], textDateRows: 0, rowIssues: [], blankRows: [] };

    // Keep blank rows so row numbers match Excel and blank rows inside the data can be reported.
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: true,
      defval: '',
    });
    const empty = { headers: [], rows: [], textDateRows: 0, rowIssues: [], blankRows: [] };
    if (rawData.length < 2) return empty;
    const firstExcelRow = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r + 1 : 1;

    const excludedColumns = new Set(['email', 'stock code', 'maturity date']);
    const columns: { header: string; index: number; kind: 'date' | 'number' | 'text' }[] = [];
    const strictDateIndexes: number[] = [];
    const enumColumns: { header: string; index: number; allowed: readonly string[] }[] = [];

    // Classify each column once instead of per cell.
    (rawData[0] || []).forEach((h, index) => {
      const header = String(h ?? '').trim() || `Column ${index + 1}`;
      if (this.backendDateColumns.has(header.toLowerCase())) strictDateIndexes.push(index);
      const allowed = this.backendEnumColumns[header.toLowerCase()];
      if (allowed) enumColumns.push({ header, index, allowed });
      if (excludedColumns.has(header.toLowerCase())) return;
      const kind = this.isDateColumn(header)
        ? 'date'
        : this.isPriceColumn(header) || this.isQtyColumn(header)
          ? 'number'
          : 'text';
      columns.push({ header, index, kind });
    });

    const isFilled = (v: unknown) => v !== '' && v != null;
    const rows: any[] = [];
    const rowIssues: string[] = [];
    let textDateRows = 0;
    const blankRows: number[] = [];
    for (let r = 1; r < rawData.length; r++) {
      const row = rawData[r] || [];
      const excelRow = firstExcelRow + r;
      // Blank rows inside the sheet's used range (often left behind by formatting) are still
      // rows to the backend, which reads them as transactions with empty fields.
      if (!row.some(isFilled)) {
        blankRows.push(excelRow);
        continue;
      }

      // The backend calls Enum.valueOf on these cells, so a blank or misspelled value
      // (e.g. "Zerodha") fails the whole upload with "No enum constant ...".
      for (const { header, index, allowed } of enumColumns) {
        const val = row[index];
        if (!isFilled(val)) {
          rowIssues.push(`Row ${excelRow}: ${header} is empty`);
        } else if (typeof val !== 'string' || !allowed.includes(val)) {
          rowIssues.push(`Row ${excelRow}: ${header} "${val}" must be one of ${allowed.join(', ')}`);
        }
      }

      // Skip rows that are empty in every visible column (e.g. only email/stock code filled).
      if (!columns.some((c) => isFilled(row[c.index]))) continue;

      // Real Excel dates arrive as serial numbers; anything else is typed-in text.
      if (strictDateIndexes.some((i) => row[i] !== '' && row[i] != null && typeof row[i] !== 'number')) {
        textDateRows++;
      }

      const obj: any = {};
      for (const { header, index, kind } of columns) {
        const val = row[index];
        obj[header] =
          val === undefined || val === null || val === ''
            ? ''
            : kind === 'date'
              ? this.parseDate(val)
              : kind === 'number'
                ? this.parseNumber(val)
                : val;
      }
      rows.push(obj);
    }

    return { headers: columns.map((c) => c.header), rows, textDateRows, rowIssues, blankRows };
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
    if (!this.file || this.isUploading || this.pendingTempCount > 0) return;

    const email = this.authService.getUserEmail();
    if (!email) {
      this.showToast('You need to be signed in to upload transactions.', 'error');
      return;
    }

    this.isUploading = true;
    this.progress = 0;
    this.uploadResult = null;

    this.transactionService
      .uploadTransactions(email, this.file, this.quarter)
      .subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress = Math.round((100 * event.loaded) / event.total);
          } else if (event.type === HttpEventType.Response) {
            this.progress = 100;
            this.isUploading = false;
            const result = this.transactionService.interpretUploadResponse(event.body);
            this.uploadResult = result;
            this.showToast(result.message, result.tone);
            // Rows were saved (fully, or with some held as temporary): refresh the page.
            if (result.tone !== 'error') {
              this.uploadComplete.emit();
              this.checkPendingTemporary();
            }
            // Reset progress back to 0 after 1.5 seconds, but don't clear the file
            setTimeout(() => {
              this.progress = 0;
              this.cdr.markForCheck();
            }, 1500);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Upload error:', err);
          this.isUploading = false;
          this.cdr.markForCheck();
          const classified = this.transactionService.classifyUploadError(err);
          this.uploadResult = { tone: 'error', title: classified.title, message: classified.message, details: [] };
          this.showToast(classified.message, 'error');
          // The server may have refused because temporary transactions appeared meanwhile.
          this.checkPendingTemporary();
        },
      });
  }

  ngOnDestroy(): void {
    // No subscriptions to clean up
  }
}