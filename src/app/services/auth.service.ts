import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse } from '../model/AuthResponse';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthRequest } from '../model/AuthRequest';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private BASE_URL?: string;

  constructor(private http: HttpClient) {
    this.BASE_URL = environment.apiUrl;
  }

  public login(user: AuthRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(this.BASE_URL + 'auth/login', user)
      .pipe(
        tap((authResponse: AuthResponse) => {
          localStorage.setItem('jwtToken', authResponse.token);
        }),
      );
  }

  public register(user: AuthRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.BASE_URL}/auth/register`, user)
      .pipe(
        tap((res: AuthResponse) => {
          if (res) {
            console.log(`User: {} registered successfully`, res.email);
          }
        }),
      );
  }
}
