import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationToastComponent } from './notification-toast.component';

describe('NotificationToastComponent', () => {
  let component: NotificationToastComponent;
  let fixture: ComponentFixture<NotificationToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationToastComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationToastComponent);
    component = fixture.componentInstance;
    component.notification = { type: 'info', title: 'Test', message: 'Test message' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
