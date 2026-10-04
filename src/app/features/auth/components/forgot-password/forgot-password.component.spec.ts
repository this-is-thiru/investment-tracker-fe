import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthModalRoute } from '@core/enums';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to sign-in when goToSignIn is called', () => {
    component.goToSignIn();
    expect(mockRouter.navigate).toHaveBeenCalledWith([{ outlets: { modal: [AuthModalRoute.SIGN_IN] } }]);
  });

  it('should navigate to sign-up when goToSignUp is called', () => {
    component.goToSignUp();
    expect(mockRouter.navigate).toHaveBeenCalledWith([{ outlets: { modal: [AuthModalRoute.SIGN_UP] } }]);
  });

  it('should close modal when onClose is called', () => {
    component.onClose();
    expect(mockRouter.navigate).toHaveBeenCalledWith([{ outlets: { modal: null } }]);
  });
});
