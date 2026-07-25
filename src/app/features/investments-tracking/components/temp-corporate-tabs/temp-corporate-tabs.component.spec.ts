import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TempCorporateTabsComponent } from './temp-corporate-tabs.component';
import { TempTransactionsTableComponent } from '../temp-transactions-table/temp-transactions-table.component';
import { CorporateActionSimpleComponent } from '../corporate-action-simple/corporate-action-simple.component';
import { ExpansionPanelComponent } from '@shared/components/expansion-panel/expansion-panel.component';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

describe('TempCorporateTabsComponent', () => {
  let component: TempCorporateTabsComponent;
  let fixture: ComponentFixture<TempCorporateTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TempCorporateTabsComponent,
        TempTransactionsTableComponent,
        CorporateActionSimpleComponent,
        CommonModule,
        LucideIconsModule,
        ExpansionPanelComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TempCorporateTabsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to temporary tab', () => {
    expect(component.activeTab).toBe('temporary');
  });

  it('should emit dataChanged when action applied', () => {
    spyOn(component.dataChanged, 'emit');
    component.onActionApplied();
    expect(component.dataChanged.emit).toHaveBeenCalled();
  });
});
