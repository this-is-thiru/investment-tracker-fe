import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // <-- 1. Import necessary modules
import { EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true, // <-- 2. Set the flag to true
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  imports: [ReactiveFormsModule, FormsModule, CommonModule, RouterModule],
})
export class ForgotPasswordComponent implements OnInit {
  // Event to close the modal
  @Output() close = new EventEmitter<void>();

  // Reactive Form
  forgotPasswordForm!: FormGroup;

  // State variables for UI feedback
  isLoading: boolean = false;
  message: string | null = null;
  isError: boolean = false;

  constructor(
    private fb: FormBuilder,
    public router: Router,
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onClose(): void {
    // Navigates away from the modal route, effectively closing it
    this.router.navigate([{ outlets: { modal: null } }]);
    this.close.emit();
  }

  onBackToLogin(): void {
    // Navigates back to the login modal
    this.router.navigate([{ outlets: { modal: ['login'] } }]);
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.message = null;
    this.isError = false;

    const { email } = this.forgotPasswordForm.value;

    // --- Start: Placeholder for API call ---
    // In a real application, you would call your authentication service here
    console.log('Sending password reset link to:', email);

    // Simulate an API delay
    setTimeout(() => {
      this.isLoading = false;

      // Simulate a successful response
      this.isError = false;
      this.message = 'Password reset link sent! Check your inbox.';

      // Optional: Clear the form after success
      this.forgotPasswordForm.reset();

      // Simulate an error response (Uncomment to test)
      /*
      this.isError = true;
      this.message = 'Error: Could not find an account with that email.';
      */
    }, 2000);
    // --- End: Placeholder for API call ---
  }
}
