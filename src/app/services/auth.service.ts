// auth.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LoginRequest } from '../model/LoginRequest';
import { LoginResponse } from '../model/LoginResponse';
import { RegisterRequest } from '../model/RegisterRequest';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private BASE_URL = 'http://localhost:8080';

  constructor(private http: HttpClient, private router: Router, private storageService: StorageService) {}

  login(user: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.BASE_URL}/auth/login`, user).pipe(
      map((res) => {
        this.storageService.setItem('jwtToken', res.access_token);
        return res;
      }),
      catchError((error) => {
        console.error('Login failed:', error);
        throw error;
      })
    );
  }

  register(user: RegisterRequest): Observable<string> {
    return this.http.post<string>(`${this.BASE_URL}/auth/register`, user).pipe(
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
    this.storageService.removeItem('jwtToken');
    this.router.navigate(['/login']);
  }

  isUserAuthenticated(): boolean {
    return this.storageService.isUserAuthenticated();
  }
}
