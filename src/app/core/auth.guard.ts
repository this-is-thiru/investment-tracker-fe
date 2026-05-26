import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const storageService = inject(StorageService);

  const token = storageService.getItem('jwtToken');
  if (token && storageService.isTokenValid(token)) {
    return true;
  }

  // Expired or not found → redirect
  router.navigate([{ outlets: { modal: ['sign-in'] } }]);

  return false;
};
