import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '@services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '@core/icons/lucide-icons.module';

import { NotificationService } from '@services/notification.service';

@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideIconsModule, ReactiveFormsModule],
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  changePasswordForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public router: Router,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.changePasswordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    });
  }

  get passwordMismatch(): boolean {
    return (
      this.changePasswordForm.value.newPassword !==
        this.changePasswordForm.value.confirmPassword &&
      this.changePasswordForm.value.confirmPassword.length > 0
    );
  }

  onClose(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
    this.close.emit();
  }

  onSubmit(): void {
    if (this.isLoading) return;
    if (this.changePasswordForm.invalid || this.passwordMismatch) return;

    const { oldPassword, newPassword } = this.changePasswordForm.value;
    const email = this.authService.getUserEmail(); // get logged-in user's email

    if (!email) {
      this.notificationService.addNotification('Error', 'User email not found!', 'error');
      return;
    }

    this.isLoading = true;

    this.authService.changePassword(email, oldPassword, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.addNotification('Password Updated', 'Password changed successfully!', 'success');
        this.changePasswordForm.reset();
      },
      error: (err) => {
        this.isLoading = false;
        const errorMsg = err?.error?.message || (typeof err?.error === 'string' ? err.error : null) || 'Failed to change password.';
        this.notificationService.addNotification('Password Update Failed', errorMsg, 'error');
      },
    });
  }
}
