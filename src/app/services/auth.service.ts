// auth.service.ts
import { Injectable } from '@angular/core';
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

  constructor(private http: HttpClient, private router: Router, private storageService: StorageService, private BASE_URL: BaseurlService) {}

  login(user: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.BASE_URL.getBaseUrl()}/auth/login`, user).pipe(
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
    return this.http.post<string>(`${this.BASE_URL.getBaseUrl()}/auth/register`, user).pipe(
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
