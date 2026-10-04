import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LoginRequest } from '../../features/auth/models/login-request.model';
import { LoginResponse } from '../../features/auth/models/login-response.model';
import { RegisterRequest } from '../../features/auth/models/register-request.model';
import { StorageService } from './storage.service';
import { BaseurlService } from './baseurl.service';
import { NotificationService } from './notification.service';
import { StorageKey, UserRole, AuthModalRoute } from '@core/enums';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  static readonly DEMO_EMAIL = 'demo@wealthlens.com';

  private http = inject(HttpClient);
  private router = inject(Router);
  private storageService = inject(StorageService);
  private BASE_URL = inject(BaseurlService);
  private notificationService = inject(NotificationService);

  private logoutTimer: any;
  private warningTimer: any;
  isLoggedIn = signal(this.isUserAuthenticated());
  userEmail = signal<string | null>(this.storageService.getItem(StorageKey.USER_EMAIL));
  userRoles = signal<string[]>(this.getInitialRoles());
  userRole = computed(() => this.userRoles()[0] || null);
  isDemo = computed(() => this.isLoggedIn() && this.userEmail() === AuthService.DEMO_EMAIL);
  isSuperUser = computed(() => this.hasRole(UserRole.SUPER_USER));
  isAdminUser = computed(() => this.hasRole(UserRole.ADMIN) || this.hasRole(UserRole.SUPER_USER));

  constructor() {
    const token = this.storageService.getItem(StorageKey.JWT_TOKEN);
    const savedEmail = this.storageService.getItem(StorageKey.USER_EMAIL);

    if (token && this.storageService.isTokenValid(token)) {
      const email =
        savedEmail || this.storageService.getUserEmailFromToken(token);
      if (email) this.userEmail.set(email);
      this.userRoles.set(this.storageService.getUserAuthoritiesFromToken(token));
      this.isLoggedIn.set(true);
      // Ensure auto-logout timer is active on page reload/refresh
      this.startAutoLogout(token);
    } else {
      this.isLoggedIn.set(false);
      this.userRoles.set([]);
    }
  }

  private getInitialRoles(): string[] {
    const token = this.storageService.getItem(StorageKey.JWT_TOKEN);
    if (token && this.storageService.isTokenValid(token)) {
      return this.storageService.getUserAuthoritiesFromToken(token);
    }
    return [];
  }

  login(user: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.BASE_URL.getBaseUrl()}/auth/login`, user)
      .pipe(
        map((res) => {
          this.storageService.setItem(StorageKey.JWT_TOKEN, res.access_token);

          // ✅ Extract email from backend or token
          const backendEmail =
            res.email ||
            this.storageService.getUserEmailFromToken(res.access_token);
          if (backendEmail) {
            this.storageService.setItem(StorageKey.USER_EMAIL, backendEmail);
            this.userEmail.set(backendEmail);
          }

          const authorities = this.storageService.getUserAuthoritiesFromToken(res.access_token);
          this.userRoles.set(authorities);

          this.startAutoLogout(res.access_token);
          this.isLoggedIn.set(true);

          return res;
        }),
        catchError((error) => {
          console.error('Login failed:', error);
          throw error;
        }),
      );
  }

  register(user: RegisterRequest): Observable<string> {
    return this.http
      .post<string>(`${this.BASE_URL.getBaseUrl()}/auth/register`, user)
      .pipe(
        map((res) => {
          return res;
        }),
        catchError((error) => {
          console.error('Registration failed:', error);
          throw error;
        }),
      );
  }

  logOut(redirect = true, returnUrl?: string): void {
    this.clearLogoutTimer();
    this.storageService.removeItem(StorageKey.JWT_TOKEN);
    this.storageService.removeItem(StorageKey.USER_EMAIL);
    this.userEmail.set(null);
    this.userRoles.set([]);
    this.isLoggedIn.set(false);
    if (redirect) {
      if (returnUrl) {
        this.router.navigate([{ outlets: { primary: ['home'], modal: [AuthModalRoute.SIGN_IN] } }], {
          queryParams: { returnUrl },
        });
      } else {
        this.router.navigate(['/home']);
      }
    }
  }

  loginAsDemo(): void {
    const payloadObj = {
      sub: 'demo@wealthlens.com',
      email: 'demo@wealthlens.com',
      exp: Math.floor(Date.now() / 1000) + 86400,
      authorities: [`ROLE_${UserRole.USER}`],
      role: UserRole.USER,
    };
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify(payloadObj)) + '.demoSignature';
    this.storageService.setItem(StorageKey.JWT_TOKEN, token);
    this.storageService.setItem(StorageKey.USER_EMAIL, 'demo@wealthlens.com');
    this.userEmail.set('demo@wealthlens.com');
    this.userRoles.set([UserRole.USER]);
    this.startAutoLogout(token);
    this.isLoggedIn.set(true);
    this.router.navigate(['/portfolio-analytics']);
  }

  isUserAuthenticated(): boolean {
    const token = this.storageService.getItem(StorageKey.JWT_TOKEN);
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
      // 1. Automatic logout at exact expiration
      this.logoutTimer = setTimeout(() => {
        this.logOut(true);
        this.notificationService.addNotification(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          'warning',
          null
        );
      }, timeout);

      // 2. Warning notification 2 minutes (120 seconds) prior to expiration
      const warningDelay = timeout - 120_000;
      if (warningDelay > 0) {
        this.warningTimer = setTimeout(() => {
          this.notificationService.addNotification(
            'Session Expiring Soon',
            'Your session will expire in 2 minutes. Please save your work.',
            'warning',
            null
          );
        }, warningDelay);
      }
    } else {
      this.logOut(false);
    }
  }

  private clearLogoutTimer() {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  changePassword(email: string, oldPassword: string, newPassword: string) {
    return this.http.put(
      `${this.BASE_URL.getBaseUrl()}/auth/user/${encodeURIComponent(email)}/change/password`,
      {
        email, // user's email
        password: oldPassword,
        newPassword, // new password
      },
    );
  }

  getUserRole(): string | null {
    return this.userRole();
  }

  getUserRoles(): string[] {
    return this.userRoles();
  }

  hasRole(role: string): boolean {
    const normalized = role.toUpperCase().replace(/^ROLE_/, '');
    return this.userRoles().includes(normalized);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN) || this.hasRole(UserRole.SUPER_USER);
  }

  isSuperUserRole(): boolean {
    return this.hasRole(UserRole.SUPER_USER);
  }
}
