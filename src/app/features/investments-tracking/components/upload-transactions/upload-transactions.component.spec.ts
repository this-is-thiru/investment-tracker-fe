import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadTransactionsComponent } from './upload-transactions.component';

describe('UploadTransactionsComponent', () => {
  let component: UploadTransactionsComponent;
  let fixture: ComponentFixture<UploadTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadTransactionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
