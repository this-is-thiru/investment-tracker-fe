// auth.service.ts
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LoginRequest } from '../models/LoginRequest';
import { LoginResponse } from '../models/LoginResponse';
import { RegisterRequest } from '../models/RegisterRequest';
import { StorageService } from './storage.service';
import { BaseurlService } from './baseurl.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private logoutTimer: any;
  isLoggedIn = signal(this.isUserAuthenticated());
  userEmail = signal<string | null>(this.storageService.getItem('userEmail')); // ✅ add signal for email

  constructor(
    private http: HttpClient,
    private router: Router,
    private storageService: StorageService,
    private BASE_URL: BaseurlService
  ) {
    const token = this.storageService.getItem('jwtToken');
    const savedEmail = this.storageService.getItem('userEmail');

    if (token && this.storageService.isTokenValid(token)) {
      const email = savedEmail || this.storageService.getUserEmailFromToken(token);
      console.log(token, email);
      if (email) this.userEmail.set(email);
      this.isLoggedIn.set(true);
    } else {
      this.isLoggedIn.set(false);
    }
  }

  login(user: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.BASE_URL.getBaseUrl()}/auth/login`, user)
      .pipe(
        map((res) => {
          this.storageService.setItem('jwtToken', res.access_token);

          // ✅ Extract email from backend or token
          const backendEmail = res.email || this.storageService.getUserEmailFromToken(res.access_token);
          if (backendEmail) {
            this.storageService.setItem('userEmail', backendEmail);
            this.userEmail.set(backendEmail);
          }

          this.startAutoLogout(res.access_token);
          this.isLoggedIn.set(true);

          return res;
        }),
        catchError((error) => {
          console.error('Login failed:', error);
          throw error;
        })
      );
  }


  register(user: RegisterRequest): Observable<string> {
    return this.http
      .post<string>(`${this.BASE_URL.getBaseUrl()}/auth/register`, user)
      .pipe(
        map((res) => {
          console.log('Registered successfully');
          return res;
        }),
        catchError((error) => {
          console.error('Registration failed:', error);
          throw error;
        })
      );
  }

  logout(): void {
    this.clearLogoutTimer();
    this.storageService.removeItem('jwtToken');
    this.storageService.removeItem('userEmail');
    this.userEmail.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/home']);
  }

  isUserAuthenticated(): boolean {
    const token = this.storageService.getItem('jwtToken');
    return !!token && this.storageService.isTokenValid(token);
  }

  getUserEmail(): string | null {
    return this.userEmail();
  }


  private startAutoLogout(token: string) {
    this.clearLogoutTimer();
    const expiry = this.storageService.getTokenExpiry(token);
    if (!expiry) return;

    const timeout = expiry - Date.now();
    if (timeout > 0) {
      this.logoutTimer = setTimeout(() => this.logout(), timeout);
    } else {
      this.logout();
    }
  }

  private clearLogoutTimer() {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }
}
