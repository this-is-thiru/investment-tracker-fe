import {
  ChangeDetectionStrategy,
  Component,
  ChangeDetectorRef
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RegisterRequest } from '../../../../models/RegisterRequest';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, LucideIconsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {
  registrationForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  hideRegistrationP = true;
  hideRegistrationCP = true;

  constructor(
    public router: Router, // Changed to public for template access
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private cd: ChangeDetectorRef
  ) {
    this.registrationForm = this.initForm();
  }

  private initForm(): FormGroup {
    return this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(12)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onRegistration(): void {
    if (this.registrationForm.invalid) {
      Object.values(this.registrationForm.controls).forEach(ctrl => ctrl.markAsTouched());
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cd.markForCheck();

    const signUpData: RegisterRequest = {
      email: this.registrationForm.get('email')?.value,
      password: this.registrationForm.get('password')?.value,
      role: 'USER' // Adding default role for new registrations
    };

    this.authService.register(signUpData).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cd.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        this.successMessage = 'Account created successfully! You can now sign in.';
        this.cd.markForCheck();
        
        // Wait for user to see success message, then redirect to sign-in
        setTimeout(() => {
          this.router.navigate([{ outlets: { modal: ['sign-in'] } }]);
        }, 2000);
      },
      error: (err) => {
        console.error('Registration error:', err);
        
        // User-friendly error messages
        if (err.status === 409) {
          this.errorMessage = 'This email is already registered. Please try signing in instead.';
        } else if (err.status === 400) {
          this.errorMessage = 'Please check your information and try again.';
        } else if (err.status === 0) {
          this.errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else {
          this.errorMessage = 'Registration failed. Please try again later.';
        }
        this.cd.markForCheck();
      }
    });
  }

  onClose(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }
}
