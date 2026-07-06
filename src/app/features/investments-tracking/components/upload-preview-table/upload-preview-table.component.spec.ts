import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { MessageService } from 'primeng/api';

import * as XLSX from 'xlsx';

import { UploadPreviewTableComponent } from './upload-preview-table.component';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

describe('UploadPreviewTableComponent', () => {
  let component: UploadPreviewTableComponent;
  let fixture: ComponentFixture<UploadPreviewTableComponent>;
  let mockTransactionService: jasmine.SpyObj<TransactionService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    mockTransactionService = jasmine.createSpyObj<TransactionService>(
      'TransactionService',
      ['uploadTransactions'],
    );

    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserEmail',
    ]);
    mockAuthService.getUserEmail.and.returnValue('user@example.com');

    mockNotificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['addNotification'],
    );

    await TestBed.configureTestingModule({
      imports: [
        UploadPreviewTableComponent,
        CommonModule,
        FormsModule,
        LucideIconsModule,
        ExpansionPanelComponent,
        PrimeNgModule,
      ],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadPreviewTableComponent);
    component = fixture.componentInstance;
  });

  function makeExcelFile(
    rows: (string | number)[][] = [],
    name = 'test.xlsx',
  ): File {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const arrayBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new File([blob], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse Excel file into preview rows when file input changes', (done) => {
    const file = makeExcelFile([
      ['Stock', 'Type', 'Qty', 'Price', 'Total', 'Date', 'Broker', 'Exchange', 'Asset', 'Charges'],
      ['AAPL', 'BUY', 10, 100, 1000, '2024-01-01', 'Groww', 'NSE', 'EQUITY', 10],
    ]);
    component.file = file;
    component.quarter = 'Q1';

    component.ngOnChanges({
      file: { currentValue: file, previousValue: null, firstChange: true, isFirstChange: () => true },
    });

    setTimeout(() => {
      expect(component.previewRows.length).toBe(1);
      expect(component.previewRows[0].stock).toBe('AAPL');
      expect(component.previewRows[0].type).toBe('BUY');
      expect(component.previewRows[0].qty).toBe(10);
      expect(component.previewRows[0].price).toBe(100);
      expect(component.previewRows[0].total).toBe(1000);
      expect(component.previewRows[0].date).toBe('2024-01-01');
      expect(component.previewRows[0].broker).toBe('Groww');
      expect(component.previewRows[0].exchange).toBe('NSE');
      expect(component.previewRows[0].asset).toBe('EQUITY');
      expect(component.previewRows[0].charges).toBe(10);
      done();
    }, 100);
  });

  it('should not parse when file is null', () => {
    component.file = null as any;
    component.previewRows = [];

    component.ngOnChanges({
      file: { currentValue: null, previousValue: null, firstChange: true, isFirstChange: () => true },
    });

    expect(component.previewRows.length).toBe(0);
  });

  it('should set isUploading during upload and emit uploadComplete on success', (done) => {
    const file = makeExcelFile([
      ['Stock', 'Type', 'Qty', 'Price', 'Total', 'Date', 'Broker', 'Exchange', 'Asset', 'Charges'],
      ['AAPL', 'BUY', 10, 100, 1000, '2024-01-01', 'Groww', 'NSE', 'EQUITY', 10],
    ]);
    component.file = file;
    component.quarter = 'Q1';
    spyOn(component.uploadComplete, 'emit');

    const event$ = new Subject<HttpEvent<any>>();
    mockTransactionService.uploadTransactions.and.returnValue(event$.asObservable());

    component.startUpload();

    expect(component.isUploading).toBeTrue();

    event$.next({ type: HttpEventType.Response, body: 'Upload successful' } as HttpEvent<any>);
    event$.complete();

    setTimeout(() => {
      expect(component.isUploading).toBeFalse();
      expect(component.progress).toBe(100);
      expect(component.uploadComplete.emit).toHaveBeenCalled();
      done();
    }, 50);
  });

  it('should clear file and emit fileCleared', () => {
    spyOn(component.fileCleared, 'emit');

    component.clearFile();

    expect(component.file).toBeNull();
    expect(component.previewRows.length).toBe(0);
    expect(component.fileCleared.emit).toHaveBeenCalled();
  });

  it('should filter preview rows by search query', (done) => {
    const file = makeExcelFile([
      ['Stock', 'Type', 'Qty', 'Price', 'Total', 'Date', 'Broker', 'Exchange', 'Asset', 'Charges'],
      ['AAPL', 'BUY', 10, 100, 1000, '2024-01-01', 'Groww', 'NSE', 'EQUITY', 10],
      ['GOOGL', 'SELL', 5, 200, 1000, '2024-01-02', 'Zerodha', 'NSE', 'EQUITY', 5],
    ]);
    component.file = file;
    component.ngOnChanges({
      file: { currentValue: file, previousValue: null, firstChange: true, isFirstChange: () => true },
    });

    setTimeout(() => {
      component.searchQuery = 'AAPL';
      component.applyFilters();
      expect(component.filteredRows.length).toBe(1);
      expect(component.filteredRows[0].stock).toBe('AAPL');
      done();
    }, 100);
  });
});
