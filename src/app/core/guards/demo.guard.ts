import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';

// The demo account can only view Tax Filing and Portfolio Analytics
export const blockDemoGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (!authService.isDemo()) {
    return true;
  }

  inject(NotificationService).addNotification(
    'Not available in demo',
    'Sign up to use this page with your own account.',
    'info',
    null
  );
  return inject(Router).createUrlTree(['/portfolio-analytics']);
};
