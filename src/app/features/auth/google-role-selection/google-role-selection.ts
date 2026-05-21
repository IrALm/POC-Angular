import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-google-role-selection',
  imports: [RouterLink],
  templateUrl: './google-role-selection.html',
})
export class GoogleRoleSelectionComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastService);

  readonly loading       = signal(false);
  readonly selectedRole  = signal<'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE' | null>(null);
  readonly error         = signal<string | null>(null);

  constructor() {
    if (!this.auth.pendingRoleSelection()) {
      this.router.navigate(['/login']);
    }
  }

  select(role: 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE') {
    this.selectedRole.set(role);
  }

  confirm() {
    const role = this.selectedRole();
    if (!role || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.completeGoogleProfile(role).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Bienvenue sur Kupanga !');
        if (role === 'ROLE_PROPRIETAIRE') {
          this.router.navigate(['/proprietaire/biens']);
        } else {
          this.router.navigate(['/locataire/mon-bien']);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Une erreur est survenue. Veuillez réessayer.');
      },
    });
  }
}
