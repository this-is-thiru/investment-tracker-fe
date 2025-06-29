import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class authGuard implements CanActivate {
  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  canActivate(): boolean {
    // Check if running in the browser
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwtToken');
      if (token) {
        return true;
      }
    }

    // Not authenticated or running on the server
    this.router.navigate(['/auth']);
    return false;
  }
}
