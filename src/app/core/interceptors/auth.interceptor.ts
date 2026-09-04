import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { StorageService } from '@services/storage.service';
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
  const token = storageService.getItem('jwtToken');

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
    })
  );
};

