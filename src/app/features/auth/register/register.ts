import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

function passwordMatch(ctrl: AbstractControl): ValidationErrors | null {
  const p = ctrl.get('password')?.value;
  const c = ctrl.get('confirmPassword')?.value;
  return p && c && p !== c ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class RegisterComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastService);

  readonly loading             = signal(false);
  readonly error               = signal<string | null>(null);
  readonly showPassword        = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly avatarPreview       = signal<string | null>(null);
  private avatarFile: File | null = null;

  readonly form = this.fb.group({
    firstName:       ['', [Validators.required, Validators.minLength(2)]],
    lastName:        ['', [Validators.required, Validators.minLength(2)]],
    mail:            ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    role:            ['ROLE_PROPRIETAIRE', Validators.required],
  }, { validators: passwordMatch });

  get selectedRole() { return this.form.get('role')?.value ?? 'ROLE_PROPRIETAIRE'; }

  setRole(role: string) { this.form.patchValue({ role }); }
  togglePassword()        { this.showPassword.update(v => !v); }
  toggleConfirmPassword() { this.showConfirmPassword.update(v => !v); }

  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => this.avatarPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  fieldError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl?.invalid || !ctrl.touched) return null;
    if (ctrl.errors?.['required'])   return 'Champ obligatoire';
    if (ctrl.errors?.['email'])      return 'Adresse email invalide';
    if (ctrl.errors?.['minlength'])  return `Minimum ${ctrl.errors['minlength'].requiredLength} caractères`;
    return null;
  }

  get passwordMismatch(): boolean {
    return !!this.form.errors?.['passwordMismatch'] && !!this.form.get('confirmPassword')?.touched;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const v = this.form.value;
    const formData = new FormData();
    formData.append(
      'userFormDTO',
      new Blob([JSON.stringify({
        firstName: v.firstName,
        lastName:  v.lastName,
        mail:      v.mail,
        password:  v.password,
        role:      v.role,
      })], { type: 'application/json' })
    );
    if (this.avatarFile) formData.append('imageProfil', this.avatarFile);

    this.auth.register(formData).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Compte créé avec succès ! Bienvenue sur Kupanga 🎉');
        if (this.auth.isProprietaire()) this.router.navigate(['/proprietaire/dashboard']);
        else                            this.router.navigate(['/locataire/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 409) this.error.set('Un compte existe déjà avec cet email.');
        else                    this.error.set(err.error?.message ?? "Une erreur est survenue lors de l'inscription.");
      },
    });
  }
}
