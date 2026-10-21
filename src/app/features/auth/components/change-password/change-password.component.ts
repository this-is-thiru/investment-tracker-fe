import { Component, OnInit, EventEmitter, Output, ChangeDetectorRef, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
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
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { InputComponent } from '@shared/ui/input/input.component';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule, ReactiveFormsModule, ModalComponent, InputComponent, ButtonComponent],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  changePasswordForm!: FormGroup;
  isLoading = false;
  hideOldPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public router: Router,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.changePasswordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  get passwordMismatch(): boolean {
    const newPwd = this.changePasswordForm.get('newPassword')?.value;
    const confirmPwd = this.changePasswordForm.get('confirmPassword')?.value;
    return !!confirmPwd && newPwd !== confirmPwd;
  }

  get sameAsOldPassword(): boolean {
    const oldPwd = this.changePasswordForm.get('oldPassword')?.value;
    const newPwd = this.changePasswordForm.get('newPassword')?.value;
    return !!oldPwd && !!newPwd && oldPwd === newPwd;
  }

  onClose(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
    this.close.emit();
  }

  onSubmit(): void {
    if (this.isLoading) return;
    if (this.changePasswordForm.invalid || this.passwordMismatch || this.sameAsOldPassword) {
      Object.values(this.changePasswordForm.controls).forEach(ctrl => ctrl.markAsTouched());
      return;
    }

    const { oldPassword, newPassword } = this.changePasswordForm.value;
    const email = this.authService.getUserEmail();

    if (!email) {
      this.notificationService.addNotification('Authentication Required', 'Please sign in to change your password.', 'error');
      this.onClose();
      return;
    }

    this.isLoading = true;

    this.authService.changePassword(email, oldPassword, newPassword)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.notificationService.addNotification('Password Updated', 'Your password was changed successfully!', 'success');
          this.changePasswordForm.reset();
          this.onClose();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || (typeof err?.error === 'string' ? err.error : null) || 'Failed to change password. Please check your current password.';
          this.notificationService.addNotification('Password Update Failed', errorMsg, 'error');
        },
      });
  }
}
