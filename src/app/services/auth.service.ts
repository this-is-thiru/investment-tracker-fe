import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthRequest } from '../model/AuthRequest';
import { AuthResponse } from '../model/AuthResponse';
import { Router } from '@angular/router';  // Import the router for navigation


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isAuthenticated = false;
  private BASE_URL = 'https://freeapi.miniprojectideas.com/api/';

  constructor(private http: HttpClient, private router: Router) {
    // Step 1: Initialize isAuthenticated based on token presence
    const token = this.isLocalStorageAvailable() ? localStorage.getItem('jwtToken') : null;
    this.isAuthenticated = !!token && this.isTokenValid(token);  // Validate the token
  }


  login(user: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}User/Login`, user).pipe(
      tap(
        (res) => {
          if (this.isLocalStorageAvailable()) {
            // Step 1: Save token in localStorage and update isAuthenticated
            localStorage.setItem('jwtToken', res.token);
          }
          this.isAuthenticated = true;
        },
        (error) => console.error('Login failed:', error)
      )
    );
  }

  register(user: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}User/Register`, user).pipe(
      tap(
        (res) => console.log(`User: ${res.email} registered successfully`),
        (error) => console.error('Registration failed:', error)
      )
    );
  }


  // Step 2: Validate token expiration
  private isTokenValid(token: string): boolean {
    if (!token) return false;

    try {
      const [, payload] = token.split('.');
      if (!payload) return false;

      const decoded = JSON.parse(atob(payload)); // Decode the token payload
      const expiration = decoded.exp;  // Get the expiration timestamp
      const currentTime = Math.floor(Date.now() / 1000);  // Get current time in seconds

      return expiration > currentTime;  // Check if the token is still valid
    } catch (error) {
      console.error('Error validating token:', error);
      return false;  // Token is invalid if decoding fails
    }
  }

  // Step 2: Check if the user is authenticated by validating the token
  isUserAuthenticated(): boolean {
    const token = this.isLocalStorageAvailable() ? localStorage.getItem('jwtToken') : null;
    return !!token && this.isTokenValid(token); // Ensure token is valid
  }

  // Step 1: Clear token and update isAuthenticated on logout
  logout(): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem('jwtToken');
    }
    this.isAuthenticated = false;
    this.router.navigate(['/login']);
  }

  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.localStorage;
    } catch (error) {
      console.warn('localStorage is not available:', error);
      return false;
    }
  }
}









