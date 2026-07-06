import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { CorporateActionSimpleComponent } from './corporate-action-simple.component';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '../../../../services/auth.service';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

describe('CorporateActionSimpleComponent', () => {
  let component: CorporateActionSimpleComponent;
  let fixture: ComponentFixture<CorporateActionSimpleComponent>;
  let mockCorporateActionService: jasmine.SpyObj<CorporateActionService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockCorporateActionService = jasmine.createSpyObj<CorporateActionService>(
      'CorporateActionService',
      ['apply'],
    );
    mockCorporateActionService.apply.and.returnValue(of({ message: 'ok' }));

    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserEmail',
    ]);
    mockAuthService.getUserEmail.and.returnValue('user@example.com');

    await TestBed.configureTestingModule({
      imports: [
        CorporateActionSimpleComponent,
        CommonModule,
        FormsModule,
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

    fixture = TestBed.createComponent(CorporateActionSimpleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply split action and emit actionApplied', (done) => {
    spyOn(component.actionApplied, 'emit');
    component.actionType = 'split';
    component.stockCode = 'AAPL';
    component.ratio = '2:1';

    component.applyAction();

    setTimeout(() => {
      expect(mockCorporateActionService.apply).toHaveBeenCalledWith('user@example.com', {
        actionType: 'split',
        stockCode: 'AAPL',
        ratio: '2:1',
      });
      expect(component.actionApplied.emit).toHaveBeenCalled();
      done();
    }, 50);
  });

  it('should not apply action without stock code', () => {
    component.stockCode = '';
    component.applyAction();
    expect(mockCorporateActionService.apply).not.toHaveBeenCalled();
  });
});
