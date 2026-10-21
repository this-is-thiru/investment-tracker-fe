import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
import { WealthLensPreset } from '@core/theme/wealthlens-preset';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([AuthInterceptor])),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: WealthLensPreset,
        options: {
          darkModeSelector: '.dark',
        },
      },
    }),
  ],
}).catch((err) => console.error(err));
