import {
  ChangeDetectionStrategy,
  Component,
  ChangeDetectorRef
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RegisterRequest } from '../../models/register-request.model';
import { NotificationService } from '@services/notification.service';
import { LucideIconsModule } from '@core/icons/lucide-icons.module'; // import LucideIconsModule for custom SVG icons
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { InputComponent } from '@shared/ui/input/input.component';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
    selector: 'app-sign-up',
    standalone: true,
    templateUrl: './sign-up.component.html',
    styleUrls: ['./sign-up.component.css'],
    imports: [ReactiveFormsModule, CommonModule, RouterModule, LucideIconsModule, ModalComponent, InputComponent, ButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignUpComponent {
  registrationForm: FormGroup;
  isLoading = false;
  hideRegistrationP = true;
  hideRegistrationCP = true;

  constructor(
    public router: Router, // Changed to public for template access
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private cd: ChangeDetectorRef,
    private notificationService: NotificationService
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
        this.notificationService.addNotification(
          'Registration Success',
          'Account created successfully! You can now sign in.',
          'success'
        );
        this.router.navigate([{ outlets: { modal: ['sign-in'] } }]);
      },
      error: (err) => {
        console.error('Registration error:', err);
        
        // User-friendly error messages
        let message = 'Registration failed. Please try again later.';
        if (err.status === 409) {
          message = 'This email is already registered. Please try signing in instead.';
        } else if (err.status === 400) {
          message = 'Please check your information and try again.';
        } else if (err.status === 0) {
          message = 'Unable to connect to the server. Please check your internet connection.';
        }
        
        this.notificationService.addNotification('Registration Failed', message, 'error');
        this.cd.markForCheck();
      }
    });
  }

  onClose(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }
}
