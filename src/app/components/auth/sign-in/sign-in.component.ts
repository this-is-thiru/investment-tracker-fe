import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LoginRequest } from '../../../model/LoginRequest';
import { RegisterRequest } from '../../../model/RegisterRequest';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class SignInComponent implements OnInit {

  loginForm: FormGroup;
  isLoading = false;
  hideLogin = true;
  hideLoginP = true;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.loginForm = this.initLoginForm();
  }

  ngOnInit(): void { }

  private initLoginForm(): FormGroup {
    return this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]]
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.isLoading = true;

    const loginRequest: LoginRequest = this.loginForm.value;
    this.authService.login(loginRequest).subscribe({
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
}
