import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './public-layout.html',
})
export class PublicLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly menuOpen = signal(false);

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }

  logout() {
    this.auth.logout().subscribe({
      next: () => {
        this.toast.success('Déconnexion réussie');
        this.router.navigate(['/']);
      },
      error: () => this.auth.clearSession(),
    });
    this.closeMenu();
  }

  goToDashboard() {
    if (this.auth.isProprietaire()) this.router.navigate(['/proprietaire/dashboard']);
    else if (this.auth.isLocataire()) this.router.navigate(['/locataire/dashboard']);
  }
}
