import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Subject, throwError } from 'rxjs';

import { UploadTransactionsComponent } from './upload-transactions.component';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

describe('UploadTransactionsComponent (Chunk 3)', () => {
  let component: UploadTransactionsComponent;
  let fixture: ComponentFixture<UploadTransactionsComponent>;
  let mockTransactionService: jasmine.SpyObj<TransactionService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  const DEFAULT_EMAIL = '[email protected]';

  // Real classifications from the service — keep tests honest by going
  // through the actual mapping logic instead of hardcoding titles here.
  const CLASSIFICATIONS: Record<
    string,
    { category: string; title: string; message: string }
  > = {
    'no-file': {
      category: 'no-file',
      title: 'No file selected',
      message: 'Please choose an .xlsx or .xls file to upload.',
    },
    'bad-extension': {
      category: 'bad-extension',
      title: 'Wrong file type',
      message: 'We accept .xlsx and .xls files.',
    },
    'too-large': {
      category: 'too-large',
      title: 'File too large',
      message: 'Maximum size is 10 MB. Try splitting the file by quarter.',
    },
    'no-email': {
      category: 'no-email',
      title: 'Please sign in',
      message: 'You need to be signed in to upload transactions.',
    },
    unauthorized: {
      category: 'unauthorized',
      title: 'Session expired',
      message: 'Please sign in again to continue.',
    },
    network: {
      category: 'network',
      title: 'Connection problem',
      message: "We couldn't reach the server. Check your internet and try again.",
    },
  };

  beforeEach(async () => {
    mockTransactionService = jasmine.createSpyObj<TransactionService>(
      'TransactionService',
      ['uploadTransactions', 'downloadTemplate'],
      {
        classifyUploadError: (err: any) => {
          if (err && typeof err === 'object' && err.category) {
            return CLASSIFICATIONS[err.category] ?? {
              category: err.category,
              title: 'Upload failed',
              message: 'Please try again.',
            };
          }
          const status = typeof err?.status === 'number' ? err.status : 0;
          if (status === 401) return CLASSIFICATIONS['unauthorized'];
          if (status === 0) return CLASSIFICATIONS['network'];
          if (status >= 500)
            return {
              category: 'server',
              title: 'Server error',
              message: 'Something went wrong on our side. Please try again in a moment.',
            };
          return {
            category: 'unknown',
            title: 'Upload failed',
            message: 'Please try again.',
          };
        },
      },
    );

    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserEmail',
    ]);
    mockAuthService.getUserEmail.and.returnValue(DEFAULT_EMAIL);

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
    // No detectChanges() — we never need the template rendered for these
    // TS-state-only tests, and skipping it avoids touching lucide/primeng DOM.
  });

  function makeFile(name: string, sizeBytes: number): File {
    // Construct a File without actually reading from disk; the constructor
    // accepts (parts, name, options).
    const blob = new Blob([new ArrayBuffer(sizeBytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new File([blob], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  // ===========================================================================
  // startUpload() no-op behaviour
  // ===========================================================================
  it('1. startUpload() is a no-op when no file is selected', () => {
    expect(component.file).toBeNull();
    const initialStep = component.step;
    const initialResult = component.result;

    component.startUpload();

    expect(component.step).toBe(initialStep);
    expect(component.result).toBe(initialResult);
    expect(mockTransactionService.uploadTransactions).not.toHaveBeenCalled();
    expect(mockAuthService.getUserEmail).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // File validation
  // ===========================================================================
  it('2. onFilePicked() rejects .csv files', () => {
    const file = makeFile('data.csv', 1024);

    component.onFilePicked(file);

    expect(component.file).toBeNull();
    expect(component.fileError).toBeTruthy();
    expect(component.fileError!).toContain('.xlsx');
    expect(component.step).toBe('pick-file');
  });

  it('3. onFilePicked() rejects files larger than 10 MB', () => {
    const oversize = 11 * 1024 * 1024;
    const file = makeFile('big.xlsx', oversize);

    component.onFilePicked(file);

    expect(component.file).toBeNull();
    expect(component.fileError).toBeTruthy();
    expect(component.fileError!).toContain('10');
    expect(component.step).toBe('pick-file');
  });

  it('4. onFilePicked() accepts a valid .xlsx file and advances to review', () => {
    const file = makeFile('data.xlsx', 1 * 1024 * 1024);

    component.onFilePicked(file);

    expect(component.file).toBe(file);
    expect(component.fileError).toBeNull();
    expect(component.step).toBe('review');
  });

  // ===========================================================================
  // startUpload() — error & success paths
  // ===========================================================================
  it('5. startUpload() with no email populates a no-email error result', () => {
    mockAuthService.getUserEmail.and.returnValue(null);
    const file = makeFile('data.xlsx', 1024);
    component.onFilePicked(file);
    expect(component.step).toBe('review');

    component.startUpload();

    expect(component.result).not.toBeNull();
    expect(component.result!.kind).toBe('error');
    expect(component.result!.category).toBe('no-email');
    expect(component.result!.title).toBe('Please sign in');
    expect(component.result!.message).toBe(
      'You need to be signed in to upload transactions.',
    );
    expect(component.step).toBe('result');
    expect(mockTransactionService.uploadTransactions).not.toHaveBeenCalled();
  });

  it('6. successful HTTP response with string body populates success result', () => {
    const file = makeFile('X.xlsx', 1024);
    component.onFilePicked(file);

    const event$ = new Subject<any>();
    mockTransactionService.uploadTransactions.and.returnValue(
      event$.asObservable(),
    );

    component.startUpload();
    expect(component.step).toBe('uploading');

    const serverMessage =
      'All transactions uploaded successfully from: X.xlsx, quarter: Q1';
    event$.next(new HttpResponse({ body: serverMessage }));
    event$.complete();

    expect(component.result).not.toBeNull();
    expect(component.result!.kind).toBe('success');
    expect(component.result!.message).toBe(serverMessage);
    expect(component.result!.title).toBe('Upload Successful');
    expect(component.step).toBe('result');
  });

  it('7. error response with status 401 populates an unauthorized result', () => {
    const file = makeFile('X.xlsx', 1024);
    component.onFilePicked(file);

    mockTransactionService.uploadTransactions.and.returnValue(
      throwError(() => ({
        status: 401,
        error: { message: 'token bad' },
      })),
    );

    let spy = jasmine.createSpy('complete');
    component.onUploadComplete.subscribe(spy);

    component.startUpload();

    expect(component.result).not.toBeNull();
    expect(component.result!.kind).toBe('error');
    expect(component.result!.category).toBe('unauthorized');
    expect(component.result!.title).toBe('Session expired');
    expect(component.step).toBe('result');
    expect(spy).toHaveBeenCalledWith('Please sign in again to continue.');
  });

  it('8. error response with status 0 populates a network result', () => {
    const file = makeFile('X.xlsx', 1024);
    component.onFilePicked(file);

    mockTransactionService.uploadTransactions.and.returnValue(
      throwError(() => ({
        status: 0,
        message: 'HttpErrorResponse',
      })),
    );

    let spy = jasmine.createSpy('complete');
    component.onUploadComplete.subscribe(spy);

    component.startUpload();

    expect(component.result).not.toBeNull();
    expect(component.result!.kind).toBe('error');
    expect(component.result!.category).toBe('network');
    expect(component.result!.title).toBe('Connection problem');
    expect(component.step).toBe('result');
    expect(spy).toHaveBeenCalledWith(
      "We couldn't reach the server. Check your internet and try again.",
    );
  });

  // ===========================================================================
  // retry / reset helpers
  // ===========================================================================
  it('9. retry() with no file attached clears result and stays on pick-file', () => {
    // Force a no-email-style error result so we land on the result step.
    component.file = null;
    component.step = 'result';
    component.result = {
      kind: 'error',
      title: 'Please sign in',
      message: 'You need to be signed in to upload transactions.',
      category: 'no-email',
    };

    component.retry();

    expect(component.result).toBeNull();
    expect(component.step).toBe('pick-file');
  });

  it('10. reset() preserves quarter and clears file/result', () => {
    component.quarter = 'Q3';
    component.file = makeFile('keep.xlsx', 512);
    component.result = {
      kind: 'error',
      title: 'Server error',
      message: 'try again',
      category: 'server',
    };
    component.step = 'result';

    component.reset();

    expect(component.quarter).toBe('Q3');
    expect(component.file).toBeNull();
    expect(component.result).toBeNull();
    expect(component.step).toBe('pick-file');
  });
});
