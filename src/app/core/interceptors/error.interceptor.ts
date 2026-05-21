import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError(err => {
      const message = err.error?.message ?? err.message ?? 'Une erreur est survenue';

      if (err.status === 0) {
        toast.error('Impossible de joindre le serveur. Vérifiez votre connexion.');
      } else if (err.status >= 500) {
        toast.error('Erreur serveur. Réessayez dans quelques instants.');
      }

      return throwError(() => ({ ...err, userMessage: message }));
    })
  );
};
