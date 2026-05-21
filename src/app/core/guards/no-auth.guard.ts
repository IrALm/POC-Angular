import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const auth     = inject(AuthService);
  const router   = inject(Router);
  const injector = inject(Injector);

  const check = (): boolean => {
    if (!auth.isLoggedIn()) return true;
    if (auth.isProprietaire()) router.navigate(['/proprietaire/biens']);
    else router.navigate(['/locataire/mon-bien']);
    return false;
  };

  if (auth.sessionInitialized()) return check();

  return toObservable(auth.sessionInitialized, { injector }).pipe(
    filter(v => v),
    take(1),
    map(() => check())
  );
};
