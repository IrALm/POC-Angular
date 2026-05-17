import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly toast  = inject(ToastService);

  readonly loading      = signal(false);
  readonly error        = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly features = [
    'Signature électronique des documents',
    'Messagerie en temps réel',
    'Gestion complète en ligne',
    'Accès 24h/24 depuis n\'importe où',
  ];

  togglePassword() { this.showPassword.update(v => !v); }

  fieldError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl?.invalid || !ctrl.touched) return null;
    if (ctrl.errors?.['required']) return 'Champ obligatoire';
    if (ctrl.errors?.['email'])    return 'Adresse email invalide';
    return null;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Connexion réussie !');
        const redirect = this.route.snapshot.queryParams['redirect'];
        if (redirect)                        this.router.navigateByUrl(redirect);
        else if (this.auth.isProprietaire()) this.router.navigate(['/proprietaire/biens']);
        else                                 this.router.navigate(['/locataire/mon-bien']);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err.status;
        if (status === 404)      this.error.set('Aucun compte trouvé avec cet email.');
        else if (status === 401) this.error.set('Mot de passe incorrect.');
        else                     this.error.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }
}
