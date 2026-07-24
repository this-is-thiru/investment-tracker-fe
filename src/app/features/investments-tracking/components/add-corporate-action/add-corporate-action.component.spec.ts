import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { AddCorporateActionComponent } from './add-corporate-action.component';
import { CorporateActionService } from '../../services/corporate-action.service';
import { ExpansionPanelComponent } from '../../../../shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';
import { PrimeNgModule } from '../../../../core/prime-ng.module';

describe('AddCorporateActionComponent', () => {
  let component: AddCorporateActionComponent;
  let fixture: ComponentFixture<AddCorporateActionComponent>;
  let mockCorporateActionService: jasmine.SpyObj<CorporateActionService>;

  beforeEach(async () => {
    mockCorporateActionService = jasmine.createSpyObj<CorporateActionService>(
      'CorporateActionService',
      ['addCorporateAction'],
    );
    mockCorporateActionService.addCorporateAction.and.returnValue(of({ message: 'ok' }));

    await TestBed.configureTestingModule({
      imports: [
        AddCorporateActionComponent,
        CommonModule,
        FormsModule,
        LucideIconsModule,
        ExpansionPanelComponent,
        PrimeNgModule,
      ],
      providers: [
        { provide: CorporateActionService, useValue: mockCorporateActionService },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCorporateActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sync recordDate and executionDate when exDate changes', () => {
    component.onExDateChange('2026-05-28');
    expect(component.recordDate).toBe('2026-05-28');
    expect(component.date).toBe('2026-05-28');
  });

  it('should validate required fields before submitting', () => {
    component.stockCode = '';
    component.submitForm();
    expect(mockCorporateActionService.addCorporateAction).not.toHaveBeenCalled();
  });

  it('should call addCorporateAction API with correct payload on submit', (done) => {
    spyOn(component.actionAdded, 'emit');
    component.stockCode = 'RELIANCE';
    component.stockName = 'Reliance Industries Ltd';
    component.type = 'BONUS';
    component.ratio = '1:1';
    component.exDate = '2026-05-28';

    component.submitForm();

    setTimeout(() => {
      expect(mockCorporateActionService.addCorporateAction).toHaveBeenCalledWith({
        stockCode: 'RELIANCE',
        stockName: 'Reliance Industries Ltd',
        type: 'BONUS',
        assetType: 'EQUITY',
        description: '',
        priority: 0,
        exDate: '2026-05-28',
        recordDate: '2026-05-28',
        date: '2026-05-28',
        ratio: '1:1',
      });
      expect(component.actionAdded.emit).toHaveBeenCalled();
      done();
    }, 50);
  });
});
