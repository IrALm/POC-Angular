import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

function passwordMatch(ctrl: AbstractControl): ValidationErrors | null {
  const p = ctrl.get('password')?.value;
  const c = ctrl.get('confirmPassword')?.value;
  return p && c && p !== c ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly toast  = inject(ToastService);

  readonly loading             = signal(false);
  readonly error               = signal<string | null>(null);
  readonly success             = signal(false);
  readonly showPassword        = signal(false);
  readonly showConfirmPassword = signal(false);
  token = '';

  readonly form = this.fb.group({
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatch });

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'] ?? '';
    if (!this.token) this.error.set('Lien invalide ou expiré. Faites une nouvelle demande de réinitialisation.');
  }

  togglePassword()        { this.showPassword.update(v => !v); }
  toggleConfirmPassword() { this.showConfirmPassword.update(v => !v); }

  get passwordMismatch(): boolean {
    return !!this.form.errors?.['passwordMismatch'] && !!this.form.get('confirmPassword')?.touched;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.token || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.resetPassword(this.token, this.form.value.password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.toast.success('Mot de passe mis à jour ! Redirection en cours...');
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 400) this.error.set('Lien expiré ou invalide. Faites une nouvelle demande.');
        else                    this.error.set('Une erreur est survenue. Réessayez.');
      },
    });
  }
}
