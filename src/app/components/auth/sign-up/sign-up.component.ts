import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RegisterRequest } from '../../../model/RegisterRequest';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class SignUpComponent implements OnInit {
  private static readonly ROLE_USER = 'ROLE_USER';

  registrationForm: FormGroup;
  isLoading = false;
  hideRegistrationP = true;
  hideRegistrationCP = true;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.registrationForm = this.initRegistrationForm();
  }

  ngOnInit(): void { }

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


  onRegistration(): void {
    if (this.registrationForm.invalid) return;
    this.isLoading = true;

    const { email, password } = this.registrationForm.value;
    const registerRequest: RegisterRequest = { email, password, role: SignUpComponent.ROLE_USER };

    this.authService.register(registerRequest).subscribe({
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
  onClose(): void {
    this.router.navigate(['/home']);
  }
}
