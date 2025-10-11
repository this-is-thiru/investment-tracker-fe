import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { LoginRequest } from '../../../../models/LoginRequest';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, RouterModule],
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
    public router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder,
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
      next: (res) => {
        console.log('Login success:', res);
        this.isLoading = false;
        // Close modal outlet and go to home
        this.router.navigate([{ outlets: { primary: ['home'], modal: null } }]);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.isLoading = false;
        this.errorMessage = 'Invalid credentials. Please try again.';
      },
    });
  }


  onClose(): void {
    // Close only the modal outlet, not the entire route
    this.router.navigate([{ outlets: { modal: null } }], { relativeTo: this.router.routerState.root });
  }

}
