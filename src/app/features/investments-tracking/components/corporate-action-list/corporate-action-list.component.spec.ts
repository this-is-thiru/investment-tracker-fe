import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { CorporateActionListComponent } from './corporate-action-list.component';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '../../../../services/auth.service';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

describe('CorporateActionListComponent', () => {
  let component: CorporateActionListComponent;
  let fixture: ComponentFixture<CorporateActionListComponent>;
  let mockCorporateActionService: jasmine.SpyObj<CorporateActionService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockCorporateActionService = jasmine.createSpyObj<CorporateActionService>(
      'CorporateActionService',
      ['getAllCorporateActions', 'getCorporateActionById', 'deleteCorporateAction'],
    );
    mockCorporateActionService.getAllCorporateActions.and.returnValue(
      of([
        {
          id: '100',
          stockCode: 'DUMMY',
          stockName: 'Dummy stock',
          type: 'STOCK_SPLIT',
          ratio: '1:2',
          exDate: '2024-10-27',
          recordDate: '2024-10-27',
        },
      ]),
    );
    mockCorporateActionService.getCorporateActionById.and.returnValue(
      of({
        id: '100',
        stockCode: 'DUMMY',
        stockName: 'Dummy stock',
        type: 'STOCK_SPLIT',
        ratio: '1:2',
        exDate: '2024-10-27',
        recordDate: '2024-10-27',
        description: 'Mock detail',
      }),
    );
    mockCorporateActionService.deleteCorporateAction.and.returnValue(of({ message: 'deleted' }));

    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserEmail',
      'getUserRole',
      'isAdmin',
    ]);
    mockAuthService.getUserEmail.and.returnValue('user@example.com');
    mockAuthService.isAdmin.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [
        CorporateActionListComponent,
        CommonModule,
        LucideIconsModule,
        ExpansionPanelComponent,
        PrimeNgModule,
      ],
      providers: [
        { provide: CorporateActionService, useValue: mockCorporateActionService },
        { provide: AuthService, useValue: mockAuthService },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CorporateActionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load actions on init', () => {
    expect(component).toBeTruthy();
    expect(mockCorporateActionService.getAllCorporateActions).toHaveBeenCalled();
    expect(component.actions.length).toBe(1);
    expect(component.actions[0].stockCode).toBe('DUMMY');
  });

  it('should load corporate action detail and display modal on viewDetails', (done) => {
    component.viewDetails('100');
    expect(component.showDetailModal).toBeTrue();
    expect(component.isDetailLoading).toBeFalse();

    setTimeout(() => {
      expect(mockCorporateActionService.getCorporateActionById).toHaveBeenCalledWith('100');
      expect(component.selectedAction).toBeTruthy();
      expect(component.selectedAction.description).toBe('Mock detail');
      expect(component.isDetailLoading).toBeFalse();
      done();
    }, 50);
  });

  it('should call deleteCorporateAction on deleteAction if confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const dummyAction = {
      id: '100',
      stockCode: 'DUMMY',
      stockName: 'Dummy stock',
      type: 'STOCK_SPLIT',
      ratio: '1:2',
      exDate: '2024-10-27',
      recordDate: '2024-10-27',
      description: 'Test description',
    };

    component.deleteAction(dummyAction);

    expect(mockCorporateActionService.deleteCorporateAction).toHaveBeenCalledWith('100', {
      stockCode: 'DUMMY',
      stockName: 'Dummy stock',
      type: 'STOCK_SPLIT',
      description: 'Test description',
      ratio: '1:2',
      exDate: '2024-10-27',
      recordDate: '2024-10-27',
    });
  });
});
