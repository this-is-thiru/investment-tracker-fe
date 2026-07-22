import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { UploadTransactionsComponent } from './upload-transactions.component';
import { TransactionService } from '../../../../services/transaction.service';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

describe('UploadTransactionsComponent', () => {
  let component: UploadTransactionsComponent;
  let fixture: ComponentFixture<UploadTransactionsComponent>;
  let mockTransactionService: jasmine.SpyObj<TransactionService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    mockTransactionService = jasmine.createSpyObj<TransactionService>(
      'TransactionService',
      ['downloadTemplate'],
    );
    mockTransactionService.downloadTemplate.and.returnValue(of(new Blob([''])));

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
