import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WithHeaderLayoutComponent } from './with-header-layout.component';

describe('WithHeaderLayoutComponent', () => {
  let component: WithHeaderLayoutComponent;
  let fixture: ComponentFixture<WithHeaderLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WithHeaderLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WithHeaderLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
