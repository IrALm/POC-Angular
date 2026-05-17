import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth     = inject(AuthService);
  const router   = inject(Router);
  const injector = inject(Injector);

  const check = (): boolean => {
    if (auth.isLoggedIn()) return true;
    router.navigate(['/login'], { queryParams: { redirect: state.url } });
    return false;
  };

  // Session already resolved (most common case after first load)
  if (auth.sessionInitialized()) return check();

  // Wait for the initial /auth/me call to complete before activating the route.
  // This prevents the component from briefly rendering then jumping to /login.
  return toObservable(auth.sessionInitialized, { injector }).pipe(
    filter(v => v),
    take(1),
    map(() => check())
  );
};
