import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class AuthComponent implements OnInit {
  private static ROLE_USER: string = 'USER';
  loginForm: FormGroup;
  registrationForm: FormGroup;
  isLoginMode: boolean = true;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  emailErrorMessage = signal('');
  passwordErrorMessage = signal('');
  confirmPasswordErrorMessage = signal('');



  constructor(
    private router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder,
  ) {
    // login form
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]],
    });

    // register form
    this.registrationForm = this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]],
      },
      {
        asyncValidators: [confirmPasswordAsyncValidator()],
      },
    );
  }

  ngOnInit(): void {
    // Subscribes to value and status changes of the 'email' control
    this.loginForm.get('email')?.valueChanges.subscribe(() => this.updateEmailErrorMessage('Login'));
    this.loginForm.get('email')?.statusChanges.subscribe(() => this.updateEmailErrorMessage('Login'));

    this.loginForm.get('password')?.valueChanges.subscribe(() => this.updatePasswordErrorMessage('Login'));
    this.loginForm.get('password')?.statusChanges.subscribe(() => this.updatePasswordErrorMessage('Login'));

    this.registrationForm.get('email')?.valueChanges.subscribe(() => this.updateEmailErrorMessage('Registration'));
    this.registrationForm.get('email')?.statusChanges.subscribe(() => this.updateEmailErrorMessage('Registration'));

    this.registrationForm.get('password')?.valueChanges.subscribe(() => this.updatePasswordErrorMessage('Registration'));
    this.registrationForm.get('password')?.statusChanges.subscribe(() => this.updatePasswordErrorMessage('Registration'));

    this.registrationForm.get('confirmPassword')?.valueChanges.subscribe(() => this.updateConfirmPasswordErrorMessage());
    this.registrationForm.get('confirmPassword')?.statusChanges.subscribe(() => this.updateConfirmPasswordErrorMessage());
  }

  updateEmailErrorMessage(LR: any) {
    // Updates the error message based on the validation status of the 'email' control
    if (LR == 'Login') {
      if (this.loginForm.get('email')?.hasError('required')) {
        this.emailErrorMessage.set('You must enter a value');
      } else if (this.loginForm.get('email')?.hasError('email')) {
        this.emailErrorMessage.set('Not a valid email');
      } else {
        this.emailErrorMessage.set('');
      }
    }
    else {
      if (this.registrationForm.get('email')?.hasError('required')) {
        this.emailErrorMessage.set('You must enter a value');
      } else if (this.registrationForm.get('email')?.hasError('email')) {
        this.emailErrorMessage.set('Not a valid email');
      } else {
        this.emailErrorMessage.set('');
      }
    }
  }

  updatePasswordErrorMessage(LR: any) {
    // Updates the error message based on the validation status of the 'password' control
    if (LR == 'Login') {
      if (this.loginForm.get('password')?.hasError('required')) {
        this.passwordErrorMessage.set('You must enter a value');
      } else if (this.loginForm.get('password')?.hasError('minlength') || this.loginForm.get('password')?.hasError('maxlength')) {
        this.passwordErrorMessage.set('Not a valid password');
      } else {
        this.passwordErrorMessage.set('');
      }
    }
    else {
      if (this.registrationForm.get('password')?.hasError('required')) {
        this.passwordErrorMessage.set('You must enter a value');
      } else if (this.registrationForm.get('password')?.hasError('minlength') || this.registrationForm.get('password')?.hasError('maxlength')) {
        this.passwordErrorMessage.set('Not a valid password');
      } else {
        this.passwordErrorMessage.set('');
      }
    }
  }

  updateConfirmPasswordErrorMessage() {
    // Updates the error message based on the validation status of the 'confirm password' control
    if (this.registrationForm.get('confirmPassword')?.hasError('required')) {
      this.confirmPasswordErrorMessage.set('You must enter a value');
    } else if (this.registrationForm.get('confirmPassword')?.hasError('minlength') || this.registrationForm.get('confirmPassword')?.hasError('maxlength')) {
      this.confirmPasswordErrorMessage.set('Not a valid confirm Password');
    } else {
      this.confirmPasswordErrorMessage.set('');
    }
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

  //click event to toggle blw hide and view the input value
  hideLogin = signal(true);
  hideRegistrationP = signal(true);
  hideRegistrationCP = signal(true);

  clickEventLogin(event: MouseEvent) {
    this.hideLogin.set(!this.hideLogin());
    event.stopPropagation();
  }
  clickEventRegistrationP(event: MouseEvent) {
    this.hideRegistrationP.set(!this.hideRegistrationP());
    event.stopPropagation();
  }

  clickEventRegistrationCP(event: MouseEvent) {
    this.hideRegistrationCP.set(!this.hideRegistrationCP());
    event.stopPropagation();
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
