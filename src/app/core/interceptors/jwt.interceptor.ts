import { HttpContext, HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Flags a request as a retry so the interceptor doesn't try to refresh again.
const IS_RETRY = new HttpContextToken<boolean>(() => false);

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const isPublicAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  const isPublicTokenEndpoint =
    req.url.includes('/contrats/signer/') ||
    req.url.includes('/etats-des-lieux/signer/');

  if (token && !isPublicAuthEndpoint && !isPublicTokenEndpoint) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError(err => {
      if (
        err.status === 401 &&
        !isPublicAuthEndpoint &&
        !isPublicTokenEndpoint &&
        !req.context.get(IS_RETRY)   // prevents double-refresh on a failing retry
      ) {
        return auth.refreshToken().pipe(
          switchMap(res => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` },
              context: new HttpContext().set(IS_RETRY, true),
            });
            return next(retryReq);
          }),
          catchError(refreshErr => {
            auth.clearSession();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
