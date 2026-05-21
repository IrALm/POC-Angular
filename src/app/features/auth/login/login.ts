import { Component, AfterViewInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent implements AfterViewInit {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly toast  = inject(ToastService);

  readonly loading       = signal(false);
  readonly googleLoading = signal(false);
  readonly error         = signal<string | null>(null);
  readonly showPassword  = signal(false);

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

  ngAfterViewInit() {
    this.initGoogleButton();
  }

  private initGoogleButton() {
    const g = (window as any)['google'];
    if (!g?.accounts?.id) {
      setTimeout(() => this.initGoogleButton(), 300);
      return;
    }
    g.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential: string }) => this.onGoogleCredential(response.credential),
    });
    const el = document.getElementById('google-btn');
    if (el) {
      g.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'large',
        width: el.offsetWidth || 400,
        text: 'signin_with',
        locale: 'fr',
      });
    }
  }

  private onGoogleCredential(credential: string) {
    this.googleLoading.set(true);
    this.error.set(null);
    this.auth.loginWithGoogle(credential).subscribe({
      next: (res) => {
        this.googleLoading.set(false);
        if (res.requiresRoleSelection) {
          this.router.navigate(['/google-role-selection']);
        } else {
          this.toast.success('Connexion réussie !');
          this.redirectAfterLogin();
        }
      },
      error: (err) => {
        this.googleLoading.set(false);
        if (err.status === 401) this.error.set('Token Google invalide ou expiré. Réessayez.');
        else                    this.error.set('Erreur lors de la connexion Google.');
      },
    });
  }

  private redirectAfterLogin() {
    const redirect = this.route.snapshot.queryParams['redirect'];
    if (redirect)                        this.router.navigateByUrl(redirect);
    else if (this.auth.isProprietaire()) this.router.navigate(['/proprietaire/biens']);
    else                                 this.router.navigate(['/locataire/mon-bien']);
  }

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
        this.redirectAfterLogin();
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
