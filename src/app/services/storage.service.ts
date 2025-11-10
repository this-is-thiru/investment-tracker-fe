// storage.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  getItem(key: string): string | null {
    return this.isBrowser() ? localStorage.getItem(key) : null;
  }

  setItem(key: string, value: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    if (this.isBrowser()) {
      localStorage.removeItem(key);
    }
  }

  clear(): void {
    if (this.isBrowser()) {
      localStorage.clear();
    }
  }

  isTokenValid(token: string): boolean {
    if (!token) return false;

    try {
      const [, payload] = token.split('.');
      if (!payload) return false;

      const decoded = JSON.parse(atob(payload));
      const expiration = decoded.exp;
      const currentTime = Math.floor(Date.now() / 1000);

      return expiration > currentTime;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  isUserAuthenticated(): boolean {
    const token = this.getItem('jwtToken');
    return !!token && this.isTokenValid(token);
  }

  getTokenExpiry(token: string): number | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;

      const decoded = JSON.parse(atob(payload));
      return decoded.exp ? decoded.exp * 1000 : null; // return in ms
    } catch {
      return null;
    }
  }

  getUserEmailFromToken(token: string): string | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;

      const decoded = JSON.parse(atob(payload));

      // Common JWT email fields
      return decoded.email || decoded.sub || null;
    } catch (error) {
      console.error('Error decoding token for email:', error);
      return null;
    }
  }


}
