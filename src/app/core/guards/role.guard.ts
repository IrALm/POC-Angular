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

    const role = auth.currentUser()?.role;

    // currentUser not loaded (network error / timeout in constructor):
    // sending to '/' would loop via noAuthGuard → protected route → roleGuard → '/'.
    // /login has no guard and exits the loop safely.
    if (!role) {
      router.navigate(['/login']);
      return false;
    }

    if (role === requiredRole) return true;

    if (role === 'ROLE_PROPRIETAIRE') router.navigate(['/proprietaire/dashboard']);
    else if (role === 'ROLE_LOCATAIRE') router.navigate(['/locataire/dashboard']);
    else router.navigate(['/login']);

    return false;
  };
};
