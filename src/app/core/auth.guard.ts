import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(): boolean {
    // Only check localStorage on the browser
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwtToken');
      if (token) {
        return true;
      }
    }

    // Redirect to login if not authenticated or SSR
    this.router.navigate(['/sign-in']);
    return false;
  }
}
