import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.models';

export const roleGuard = (requiredRole: Role): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    if (auth.currentUser()?.role === requiredRole) return true;

    const role = auth.currentUser()?.role;
    if (role === 'ROLE_PROPRIETAIRE') router.navigate(['/proprietaire/dashboard']);
    else if (role === 'ROLE_LOCATAIRE') router.navigate(['/locataire/dashboard']);
    else router.navigate(['/']);

    return false;
  };
};
