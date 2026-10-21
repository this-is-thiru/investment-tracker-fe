import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { StorageService } from '@services/storage.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { StorageKey, AuthModalRoute } from '@core/enums';
import { environment } from '@env/environment';

// Only attach our JWT (and unwrap our API's { data } envelope) for requests
// going to our own backend. Third-party requests (e.g. the Google Sheets CSV
// used for live prices) must never receive our Authorization header - besides
// leaking the token cross-origin, a custom header on a cross-origin request
// forces a CORS preflight that most static/public endpoints (like Google's
// published-CSV URLs) don't support, which silently breaks the request.
function isOwnApiRequest(url: string): boolean {
  return !/^https?:\/\//i.test(url) || url.startsWith(environment.apiUrl);
}

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isOwnApiRequest(req.url)) {
    return next(req);
  }

  const storageService = inject(StorageService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);
  const token = storageService.getItem(StorageKey.JWT_TOKEN);

  const cloned = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    : req;

  return next(cloned).pipe(
    map((event) => {
      if (event instanceof HttpResponse) {
        if (event.body && typeof event.body === 'object' && 'data' in event.body) {
          return event.clone({ body: (event.body as any).data });
        }
      }
      return event;
    }),
    catchError((error: HttpErrorResponse) => {
      // 401 Unauthorized handling: session expired or token invalidated
      // Avoid intercepting /auth/login so that bad credentials can be reported by the form
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        const authService = injector.get(AuthService);

        // In demo mode, bypass auto-logout and let feature services fallback to mock data
        if (authService.isDemo()) {
          return throwError(() => error);
        }

        const currentUrl = router.url;
        authService.logOut(false);
        notificationService.addNotification(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          'warning',
          null
        );

        // Redirect to sign-in modal remembering returnUrl
        router.navigate([{ outlets: { primary: ['home'], modal: [AuthModalRoute.SIGN_IN] } }], {
          queryParams: { returnUrl: currentUrl },
        });
      } else if (error.status === 403) {
        notificationService.addNotification(
          'Access Denied',
          'You do not have permission to perform this action.',
          'error',
          null
        );
      }

      return throwError(() => error);
    })
  );
};

