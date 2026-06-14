import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { StorageService } from '../services/storage.service';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
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

