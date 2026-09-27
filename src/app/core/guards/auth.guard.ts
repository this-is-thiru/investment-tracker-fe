import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '@services/storage.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const storageService = inject(StorageService);

  const token = storageService.getItem('jwtToken');
  if (token && storageService.isTokenValid(token)) {
    return true;
  }

  // Expired or not found → show home with the sign-in modal, remembering where the user was headed.
  // Drop the modal outlet from the target, otherwise the sign-in modal reopens after login.
  const target = router.parseUrl(state.url);
  delete target.root.children['modal'];

  return router.createUrlTree(
    [{ outlets: { primary: ['home'], modal: ['sign-in'] } }],
    { queryParams: { returnUrl: router.serializeUrl(target) } }
  );
};
