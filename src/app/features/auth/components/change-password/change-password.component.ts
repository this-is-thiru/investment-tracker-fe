import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '../../../../core/icons/lucide-icons.module';

@Component({
  standalone: true,
  selector: 'app-change-password',
  imports: [CommonModule, FormsModule, LucideIconsModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css'],
})
export class ChangePasswordComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  changePasswordForm!: FormGroup;
  isLoading = false;
  message: string | null = null;
  isError = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public router: Router,
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
    if (this.changePasswordForm.invalid || this.passwordMismatch) return;

    const { oldPassword, newPassword } = this.changePasswordForm.value;
    const email = this.authService.getUserEmail(); // get logged-in user's email

    if (!email) {
      this.isError = true;
      this.message = 'User email not found!';
      return;
    }

    this.isLoading = true;
    this.message = null;
    this.isError = false;

    this.authService.changePassword(email, oldPassword, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.isError = false;
        this.message = 'Password changed successfully!';
        this.changePasswordForm.reset();
      },
      error: (err) => {
        this.isLoading = false;
        this.isError = true;
        this.message = err?.error?.message || 'Failed to change password.';
      },
    });
  }
}
