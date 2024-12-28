import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthRequest } from '../../model/AuthRequest';


@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent implements OnInit {
  private static readonly ROLE_USER = 'USER';

  loginForm: FormGroup;
  registrationForm: FormGroup;
  isLoading = false;
  hideLogin = true;
  hideRegistrationP = true;
  hideRegistrationCP = true;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.loginForm = this.initLoginForm();
    this.registrationForm = this.initRegistrationForm();
  }

  ngOnInit(): void {}

  private initLoginForm(): FormGroup {
    return this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]]
    });
  }

  private initRegistrationForm(): FormGroup {
    return this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.isLoading = true;

    const authRequest: AuthRequest = this.loginForm.value;
    this.authService.login(authRequest).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login Error:', err);
      },
    });
  }

  onRegistration(): void {
    if (this.registrationForm.invalid) return;
    this.isLoading = true;

    const { email, password } = this.registrationForm.value;
    const authRequest: AuthRequest = { email, password, roles: [AuthComponent.ROLE_USER] };

    this.authService.register(authRequest).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Registration Error:', err);
      },
    });
  }
}
