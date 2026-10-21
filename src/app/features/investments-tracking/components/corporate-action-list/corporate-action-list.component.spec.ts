import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { CorporateActionListComponent } from './corporate-action-list.component';
import { CorporateActionService } from '../../services/corporate-action.service';
import { AuthService } from '@services/auth.service';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { PrimeNgModule } from '@core/prime-ng.module';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';

describe('CorporateActionListComponent', () => {
  let component: CorporateActionListComponent;
  let fixture: ComponentFixture<CorporateActionListComponent>;
  let mockCorporateActionService: jasmine.SpyObj<CorporateActionService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockConfirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    mockCorporateActionService = jasmine.createSpyObj<CorporateActionService>(
      'CorporateActionService',
      ['getAllCorporateActions', 'getCorporateActionById', 'deleteCorporateAction', 'updateCorporateActionPriority', 'performSingleCorporateAction'],
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
    mockCorporateActionService.deleteCorporateAction.and.returnValue(of('deleted'));
    mockCorporateActionService.updateCorporateActionPriority.and.returnValue(of('updated'));
    mockCorporateActionService.performSingleCorporateAction.and.returnValue(of('applied'));
    mockConfirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm'], { request: (() => null) as any });

    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserEmail',
      'getUserRole',
      'isAdmin',
      'isSuperUserRole',
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
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
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

  it('should load corporate action detail and display modal on viewDetails', () => {
    component.viewDetails(component.actions[0]);

    expect(component.showDetailModal).toBeTrue();
    expect(mockCorporateActionService.getCorporateActionById).toHaveBeenCalledWith('100');
    expect(component.selectedAction.description).toBe('Mock detail');
    expect(component.isDetailLoading).toBeFalse();
    expect(component.detailIsPartial).toBeFalse();
  });

  it('should fall back to the list row when the detail call fails', () => {
    mockCorporateActionService.getCorporateActionById.and.returnValue(throwError(() => new Error('boom')));

    component.viewDetails(component.actions[0]);

    expect(component.selectedAction.stockCode).toBe('DUMMY');
    expect(component.detailIsPartial).toBeTrue();
    expect(component.isDetailLoading).toBeFalse();
  });

  it('should delete by id once confirmed', async () => {
    mockAuthService.isSuperUserRole.and.returnValue(true);
    mockConfirmDialog.confirm.and.resolveTo(true);

    await component.deleteAction(component.actions[0]);

    expect(mockCorporateActionService.deleteCorporateAction).toHaveBeenCalledWith('100');
    expect(component.deletingId).toBeNull();
  });

  it('should not delete when the dialog is cancelled', async () => {
    mockAuthService.isSuperUserRole.and.returnValue(true);
    mockConfirmDialog.confirm.and.resolveTo(false);

    await component.deleteAction(component.actions[0]);

    expect(mockCorporateActionService.deleteCorporateAction).not.toHaveBeenCalled();
  });

  it('should not delete without the super user role', async () => {
    mockAuthService.isSuperUserRole.and.returnValue(false);

    await component.deleteAction(component.actions[0]);

    expect(mockConfirmDialog.confirm).not.toHaveBeenCalled();
    expect(mockCorporateActionService.deleteCorporateAction).not.toHaveBeenCalled();
  });

  it('should reject an out-of-range priority without calling the API', () => {
    component.startEditPriority(component.actions[0]);
    component.editPriorityValue = -1;

    component.savePriority(component.actions[0]);

    expect(mockCorporateActionService.updateCorporateActionPriority).not.toHaveBeenCalled();
  });

  it('should save a new priority', () => {
    component.startEditPriority(component.actions[0]);
    component.editPriorityValue = 3;

    component.savePriority(component.actions[0]);

    expect(mockCorporateActionService.updateCorporateActionPriority).toHaveBeenCalledWith('100', 3);
    expect(component.actions[0].priority).toBe(3);
    expect(component.editingPriorityId).toBeNull();
  });

  it('should emit actionExecuted after applying a symbol change', async () => {
    mockConfirmDialog.confirm.and.resolveTo(true);
    spyOn(component.actionExecuted, 'emit');

    await component.executeSingleAction({ id: '200', stockCode: 'OLD', toStockCode: 'NEW', type: 'NAME_OR_SYMBOL_CHANGE' });

    expect(mockCorporateActionService.performSingleCorporateAction).toHaveBeenCalled();
    expect(component.actionExecuted.emit).toHaveBeenCalled();
  });

  it('should filter by search text and type', () => {
    component.searchQuery = 'nothing-matches';
    component.applyFilters();
    expect(component.filteredActions.length).toBe(0);
    expect(component.hasFilters).toBeTrue();

    component.resetFilters();
    expect(component.filteredActions.length).toBe(1);
    expect(component.hasFilters).toBeFalse();
  });

  it('should step through actions with prev/next and the arrow keys', () => {
    mockCorporateActionService.getCorporateActionById.and.callFake((id: string) => of({ id }));
    component.actions = [
      { id: '1', stockCode: 'A', type: 'BONUS', ratio: '1:1' },
      { id: '2', stockCode: 'B', type: 'BONUS', ratio: '1:1' },
    ];
    component.applyFilters();

    component.viewDetails(component.filteredActions[0]);
    expect(component.selectedIndex).toBe(0);

    component.showAdjacent(1);
    expect(component.selectedAction.id).toBe('2');

    component.showAdjacent(1); // already at the end
    expect(component.selectedAction.id).toBe('2');

    component.onDetailKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(component.selectedAction.id).toBe('1');
  });

  it('should show the list row immediately and compute its effect', () => {
    component.viewDetails(component.actions[0]);
    expect(component.selectedEffect?.after[0].shares).toBe(200);
    expect(component.selectedTimeline.map((s) => s.label)).toEqual(['Ex-date', 'Record date']);
  });

  it('should clear detail state on close', () => {
    component.viewDetails(component.actions[0]);
    component.closeModal();
    expect(component.showDetailModal).toBeFalse();
    expect(component.selectedEffect).toBeNull();
  });
});
