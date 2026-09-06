import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ChangeDetectorRef, // added
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { LoginRequest } from '../../models/login-request.model';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators'; // added
import { LucideIconsModule } from '@core/icons/lucide-icons.module';
import { NotificationService } from '@services/notification.service';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { InputComponent } from '@shared/ui/input/input.component';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
    selector: 'app-sign-in',
    standalone: true,
    imports: [ReactiveFormsModule, FormsModule, CommonModule, RouterModule, LucideIconsModule, ModalComponent, InputComponent, ButtonComponent],
    templateUrl: './sign-in.component.html',
    styleUrls: ['./sign-in.component.css'], // fixed property name
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  hideLogin = true;
  hideLoginP = true;

  constructor(
    public router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private cd: ChangeDetectorRef, // added
    private notificationService: NotificationService,
  ) {
    this.loginForm = this.initLoginForm();
  }

  ngOnInit(): void { }

  private initLoginForm(): FormGroup {
    return this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]], // added email validator
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]]
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      // mark controls as touched to show validation messages
      Object.values(this.loginForm.controls).forEach(ctrl => ctrl.markAsTouched());
      return;
    }
    this.isLoading = true;
    this.cd.markForCheck();

    const loginRequest: LoginRequest = this.loginForm.value;

    this.authService.login(loginRequest)
      .pipe(finalize(() => { 
        this.isLoading = false; 
        this.cd.markForCheck();
      }))
      .subscribe({
        next: (res) => {
          console.log('Login success:', res);
          this.notificationService.addNotification('Login Success', 'Signed in successfully', 'success');
          this.router.navigate([{ outlets: { primary: ['home'], modal: null } }]);
        },
        error: (err) => {
          console.error('Login error:', err);
          
          // Provide user-friendly error messages based on error type
          let message = 'Something went wrong. Please try again later.';
          if (err.status === 401) {
            message = 'Invalid email or password. Please check your credentials and try again.';
          } else if (err.status === 404) {
            message = 'Account not found. Please check your email address.';
          } else if (err.status === 403) {
            message = 'Your account is locked. Please contact support.';
          } else if (err.status === 0) {
            message = 'Unable to connect to the server. Please check your internet connection.';
          }
          
          this.notificationService.addNotification('Login Failed', message, 'error');
          this.cd.markForCheck();
        },
      });
  }


  onClose(): void {
    // Close only the modal outlet, not the entire route
    this.router.navigate([{ outlets: { modal: null } }], { relativeTo: this.router.routerState.root });
  }

  onForgotPassword(): void {
    // Navigate to the forgot password modal
    this.router.navigate([{ outlets: { modal: ['forgot-password'] } }]);
  }

  // handleGoogleSignIn() {
  //   throw new Error('Method not implemented.');
  // }
}
