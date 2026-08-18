import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { tokenInterceptor } from './core/interceptors/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // The app already ran zoneless (zone.js is not a dependency and no
    // polyfill is configured); declaring it makes that a decision rather than
    // an accident, and stops a stray zone.js install from silently changing
    // change-detection behaviour.
    provideZonelessChangeDetection(),

    // Routes unreachable errors and uncaught rejections into ErrorHandler
    // instead of letting them die in the console.
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },

    provideRouter(
      routes,
      // Binds route params/data straight to component inputs, removing manual
      // paramMap reads in the components that take an :id.
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
    ),

    // Functional interceptor: the previous HTTP_INTERCEPTORS registration built
    // AuthService (which injects HttpClient) during HttpClient construction.
    provideHttpClient(withInterceptors([tokenInterceptor])),
  ],
};
