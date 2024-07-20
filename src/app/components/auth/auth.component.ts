import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthRequest } from '../../model/AuthRequest';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private static ROLE_USER: string = 'USER';
  loginForm: FormGroup;
  registrationForm: FormGroup;
  isLoginMode: boolean = true;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder,
  ) {
    // login form
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    // register form
    this.registrationForm = this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        confirmPassword: ['', Validators.required],
      },
      {
        asyncValidators: [confirmPasswordAsyncValidator()],
      },
    );
  }

  // Convenience getter for easy access to form fields
  get registrationFields() {
    return this.registrationForm.controls;
  }

  onLogin(): void {
    this.isLoading = true;
    if (this.loginForm.valid) {
      console.log(this.loginForm.value);

      const authRequest: AuthRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password,
        roles: [],
      };

      this.authService.login(authRequest).subscribe({
        next: (response) => {
          console.log('Authentication Successful:', response);
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
          // Handle successful login (e.g., navigate to home page)
        },
        error: (error) => {
          // Handle error (e.g., show error message)
          this.isLoading = false;

          console.error('Authentication Error:', error);
          this.hideSnackbar();
        },
      });
    }
  }

  onRegistration(): void {
    if (this.registrationForm.valid) {
      console.log(this.registrationForm.value);

      const authRequest: AuthRequest = {
        email: this.registrationForm.value.username,
        password: this.registrationForm.value.password,
        roles: [AuthComponent.ROLE_USER],
      };

      this.authService.register(authRequest).subscribe({
        next: (response) => {
          console.log('Authentication Successful:', response);
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
          // Handle successful login (e.g., navigate to home page)
        },
        error: (error) => {
          // Handle error (e.g., show error message)
          this.isLoading = false;

          console.error('Authentication Error:', error);
          this.hideSnackbar();
        },
      });
    }
  }

  onSwitchMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  hideSnackbar() {
    setTimeout(() => {
      this.errorMessage = null;
    }, 3000);
  }
}

export function confirmPasswordAsyncValidator(): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const passwordControl = control.root.get('password');
    const confirmPasswordControl = control.root.get('confirmPassword');

    if (!passwordControl || !confirmPasswordControl) {
      return of(null); // Safe-guarding
    }

    return of(
      passwordControl.value === confirmPasswordControl.value
        ? null
        : { passwordMismatch: true },
    );
  };
}
