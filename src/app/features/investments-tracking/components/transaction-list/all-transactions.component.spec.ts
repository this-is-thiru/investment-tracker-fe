import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllTransactionsComponent } from './all-transactions.component';

describe('AllTranscationsComponent', () => {
  let component: AllTransactionsComponent;
  let fixture: ComponentFixture<AllTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AllTransactionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
