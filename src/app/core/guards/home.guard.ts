import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

// The marketing home page is for visitors; signed-in users land on their portfolio overview
export const redirectSignedInGuard: CanActivateFn = () => {
  if (!inject(AuthService).isUserAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/portfolio-analytics']);
};
