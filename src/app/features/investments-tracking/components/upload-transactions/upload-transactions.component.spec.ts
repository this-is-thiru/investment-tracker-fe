import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import { MessageService } from 'primeng/api';

import { UploadTransactionsComponent } from './upload-transactions.component';
import { TransactionService } from '@services/transaction.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';

describe('UploadTransactionsComponent', () => {
  let component: UploadTransactionsComponent;
  let fixture: ComponentFixture<UploadTransactionsComponent>;
  let mockTransactionService: jasmine.SpyObj<TransactionService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    mockTransactionService = jasmine.createSpyObj<TransactionService>(
      'TransactionService',
      ['downloadTemplate', 'getTemporaryTransactions', 'uploadTransactions'],
    );
    mockTransactionService.downloadTemplate.and.returnValue(of(new Blob([''])));
    mockTransactionService.getTemporaryTransactions.and.returnValue(of([]));

    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserEmail',
    ]);

    mockNotificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['addNotification'],
    );

    await TestBed.configureTestingModule({
      imports: [
        UploadTransactionsComponent,
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

    fixture = TestBed.createComponent(UploadTransactionsComponent);
    component = fixture.componentInstance;
  });

  function makeFile(name: string, sizeBytes: number): File {
    const blob = new Blob([new ArrayBuffer(sizeBytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new File([blob], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default quarter to Q1', () => {
    expect(component.quarter).toBe('Q1');
  });

  it('should update quarter when quarter changes', () => {
    component.onQuarterChange('Q3');
    expect(component.quarter).toBe('Q3');
  });

  it('should map quarter N to sheet N, as the backend does', () => {
    const c = component as any;
    c.sheetNames = ['Jan-Mar', 'Apr-Jun', 'Notes'];
    c.buildQuarterOptions();

    expect(component.quarters.map((q) => q.sheet)).toEqual(['Jan-Mar', 'Apr-Jun', 'Notes', '']);
    expect(component.quarters.map((q) => q.disabled)).toEqual([false, false, false, true]);
    expect(component.quarters[1].hint).toBe('Q2 (Apr – Jun) · uploads sheet 2: Apr-Jun');
    expect(component.quarters[3].hint).toBe('Q4 (Oct – Dec) · this file has no sheet 4');
  });

  it('should only allow Q1 for a single-sheet workbook', () => {
    const c = component as any;
    c.sheetNames = ['TRANSACTIONS'];
    c.buildQuarterOptions();

    expect(component.quarters.filter((q) => !q.disabled).map((q) => q.value)).toEqual(['Q1']);
  });

  it('should count sheets past the 4th as ignored', () => {
    const c = component as any;
    c.sheetNames = ['a', 'b', 'c', 'd', 'e', 'f'];
    c.buildQuarterOptions();

    expect(component.ignoredSheetCount).toBe(2);
  });

  it('should flag a sheet whose name points at another quarter than its position', () => {
    const c = component as any;
    c.sheetNames = ['Q3', 'Q1'];
    c.buildQuarterOptions();
    c.selectedSheet = 'Q3';
    component.quarter = 'Q1';
    c.updateSheetNameMismatch();
    expect(component.sheetNameMismatch).toBe('Q3');

    c.selectedSheet = 'Q1';
    c.updateSheetNameMismatch();
    expect(component.sheetNameMismatch).toBeNull();
  });

  it('should count rows whose backend date columns hold text', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['STOCK NAME', 'TRANSACTION DATE', 'MATURITY DATE'],
      ['Infosys', 46037, ''],
      ['TCS', '15-01-2026', ''],
      ['SGB', 46037, 'next year'],
    ]);
    const parsed = (component as any).parseSheet(sheet);

    expect(parsed.rows.length).toBe(3);
    expect(parsed.textDateRows).toBe(2);
  });

  it('should normalise dates and numbers without timezone drift', () => {
    const c = component as any;
    expect(c.parseDate(46037)).toBe('2026-01-15');
    expect(c.parseDate('15-01-2026')).toBe('2026-01-15');
    expect(c.parseDate('2026-01-15')).toBe('2026-01-15');
    expect(c.parseNumber('1,234.50')).toBe(1234.5);
    expect(c.parseNumber('(250)')).toBe(-250);
  });

  it('should parse file when a valid file is picked', () => {
    spyOn(component, 'parseFile');
    const file = makeFile('data.xlsx', 1024);

    component.onFilePicked(file);

    expect(component.file).toBe(file);
    expect(component.fileError).toBeNull();
    expect(component.parseFile).toHaveBeenCalledWith(file);
  });

  it('should reject .csv files and not set file', () => {
    spyOn(component, 'parseFile');
    const file = makeFile('data.csv', 1024);

    component.onFilePicked(file);

    expect(component.file).toBeNull();
    expect(component.fileError).toBeTruthy();
    expect(component.fileError!).toContain('.xlsx');
    expect(component.parseFile).not.toHaveBeenCalled();
  });

  it('should report blank or misspelled enum cells with Excel row numbers', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['STOCK NAME', 'BROKER NAME', 'ASSET TYPE', 'TRANSACTION TYPE'],
      ['Infosys', 'ZERODHA', 'EQUITY', 'BUY'],
      ['TCS', '', 'EQUITY', 'SELL'],
      ['HDFC', 'Zerodha', 'EQUITY', 'BUY'],
    ]);
    const parsed = (component as any).parseSheet(sheet);

    expect(parsed.rowIssues).toEqual([
      'Row 3: BROKER NAME is empty',
      'Row 4: BROKER NAME "Zerodha" must be one of ZERODHA, UPSTOX, FYERS',
    ]);
  });

  it('should list blank rows inside the sheet range, including trailing ones', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['STOCK NAME', 'BROKER NAME'],
      ['Infosys', 'ZERODHA'],
      [],
      ['TCS', 'ZERODHA'],
    ]);
    sheet['!ref'] = 'A1:B7'; // used range left behind by formatting
    const parsed = (component as any).parseSheet(sheet);

    expect(parsed.rows.length).toBe(2);
    expect(parsed.blankRows).toEqual([3, 5, 6, 7]);
    expect(component.formatRowList(parsed.blankRows)).toBe('3, 5–7');
  });

  it('should reject .xls files with a save-as hint', () => {
    spyOn(component, 'parseFile');
    component.onFilePicked(makeFile('old.xls', 1024));

    expect(component.file).toBeNull();
    expect(component.fileError!).toContain('.xlsx');
    expect(component.parseFile).not.toHaveBeenCalled();
  });

  it('should block upload while temporary transactions are pending', () => {
    mockAuthService.getUserEmail.and.returnValue('user@example.com');
    mockTransactionService.getTemporaryTransactions.and.returnValue(of([{} as any, {} as any]));
    spyOn(component, 'parseFile');

    component.onFilePicked(makeFile('data.xlsx', 1024));
    expect(component.pendingTempCount).toBe(2);

    component.startUpload();
    expect(mockTransactionService.uploadTransactions).not.toHaveBeenCalled();
  });

  it('should reject files larger than 10 MB and not set file', () => {
    spyOn(component, 'parseFile');
    const oversize = 11 * 1024 * 1024;
    const file = makeFile('big.xlsx', oversize);

    component.onFilePicked(file);

    expect(component.file).toBeNull();
    expect(component.fileError).toBeTruthy();
    expect(component.fileError!).toContain('10');
    expect(component.parseFile).not.toHaveBeenCalled();
  });

  it('should clear file and reset states on clearFile', () => {
    spyOn(component, 'parseFile');
    component.onFilePicked(makeFile('data.xlsx', 1024));

    component.clearFile();

    expect(component.file).toBeNull();
    expect(component.fileError).toBeNull();
    expect(component.headers.length).toBe(0);
    expect(component.previewRows.length).toBe(0);
  });

  it('should clear fileError on dismissFileError', () => {
    spyOn(component, 'parseFile');
    component.onFilePicked(makeFile('data.csv', 1024));
    expect(component.fileError).toBeTruthy();

    component.dismissFileError();

    expect(component.fileError).toBeNull();
  });

  it('should handle drag and drop', () => {
    spyOn(component, 'parseFile');
    const file = makeFile('drop.xlsx', 1024);
    const event = new DragEvent('drop', {
      dataTransfer: new DataTransfer(),
    });
    event.dataTransfer!.items.add(file);

    component.handleDrop(event);

    expect(component.file).toBe(file);
    expect(component.parseFile).toHaveBeenCalledWith(file);
  });
});

describe('TransactionService.interpretUploadResponse', () => {
  const interpret = (body: unknown) => TransactionService.prototype.interpretUploadResponse.call(null, body);

  it('treats row errors as nothing uploaded, even though the server answers 200', () => {
    const r = interpret('No transaction uploaded. Errors: [Invalid number of columns in row: 2, headers count: 14, actual count: 12]');
    expect(r.tone).toBe('error');
    expect(r.details.length).toBeGreaterThan(0);
  });

  it('reports rows held as temporary', () => {
    const r = interpret('Filtered out transactions: [a1, b2, c3]');
    expect(r.tone).toBe('warn');
    expect(r.message).toContain('3 transactions');
  });

  it('treats any other message as full success', () => {
    expect(interpret('All transactions uploaded successfully from: x.xlsx, quarter: Q1').tone).toBe('success');
  });
});

describe('TransactionService.classifyUploadError', () => {
  const service = Object.create(TransactionService.prototype) as TransactionService;
  const wrapped = (message: string) => ({ status: 400, error: { data: { status: 400, message } } });

  it('reads the message from the { data } wrapper and explains an empty enum cell', () => {
    const r = service.classifyUploadError(wrapped('No enum constant com.thiru.wealthlens.portfolio.dto.enums.BrokerName.'));
    expect(r.message).toContain('empty BROKER NAME');
  });

  it('explains a misspelled enum value', () => {
    const r = service.classifyUploadError(wrapped('No enum constant com.thiru.wealthlens.portfolio.dto.enums.AssetType.Equity'));
    expect(r.message).toContain('ASSET TYPE "Equity"');
  });

  it('passes other server messages through', () => {
    expect(service.classifyUploadError(wrapped('Invalid quarter: Q5')).message).toBe('Invalid quarter: Q5');
  });
});
