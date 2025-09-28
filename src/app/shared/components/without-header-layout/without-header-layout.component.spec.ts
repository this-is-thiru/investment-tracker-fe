import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WithoutHeaderLayoutComponent } from './without-header-layout.component';

describe('WithoutHeaderLayoutComponent', () => {
  let component: WithoutHeaderLayoutComponent;
  let fixture: ComponentFixture<WithoutHeaderLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WithoutHeaderLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WithoutHeaderLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
