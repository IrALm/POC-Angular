import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return true;

  if (auth.isProprietaire()) router.navigate(['/proprietaire/biens']);
  else router.navigate(['/locataire/mon-bien']);
  return false;
};
