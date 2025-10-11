import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private storageService: StorageService
  ) { }

  canActivate(): boolean {
    const token = this.storageService.getItem('jwtToken');
    if (token && this.storageService.isTokenValid(token)) {
      return true;
    }

    // Expired or not found → redirect
    this.router.navigate([{ outlets: { modal: ['sign-in'] } }]);

    return false;
  }
}
