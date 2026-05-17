import { Component, inject, computed } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profil',
  template: `
    <div class="max-w-2xl mx-auto space-y-6">

      <!-- Header card -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="h-24 bg-gradient-to-r from-blue-600 to-blue-800"></div>

        <div class="px-6 pb-6">
          <div class="flex items-end gap-4 -mt-10 mb-4">
            @if (user()?.urlProfile) {
              <img [src]="user()!.urlProfile!"
                   alt="Photo de profil"
                   class="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md shrink-0">
            } @else {
              <div class="w-20 h-20 rounded-2xl bg-blue-100 border-4 border-white shadow-md flex items-center justify-center shrink-0">
                <span class="text-blue-700 font-bold text-2xl">{{ initials() }}</span>
              </div>
            }
            <div class="pb-1">
              <h1 class="text-xl font-bold text-gray-900">
                {{ user()?.firstName }} {{ user()?.lastName }}
              </h1>
              <span class="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-1"
                    [class]="roleBadgeClass()">
                {{ roleLabel() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Informations -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Informations du compte
        </h2>

        <div class="space-y-4">
          <div class="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
            <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <span class="text-base">✉️</span>
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-400 mb-0.5">Adresse email</p>
              <p class="text-sm font-medium text-gray-900 truncate">{{ user()?.mail }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
            <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <span class="text-base">🪪</span>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-0.5">Rôle</p>
              <p class="text-sm font-medium text-gray-900">{{ roleLabel() }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
            <div class="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
              <span class="text-base">🔢</span>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-0.5">Identifiant</p>
              <p class="text-sm font-medium text-gray-900">#{{ user()?.id }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4 py-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                 [class]="user()?.hasCompleteProfil ? 'bg-green-50' : 'bg-amber-50'">
              <span class="text-base">{{ user()?.hasCompleteProfil ? '✅' : '⚠️' }}</span>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-0.5">Statut du profil</p>
              <p class="text-sm font-medium"
                 [class]="user()?.hasCompleteProfil ? 'text-green-600' : 'text-amber-600'">
                {{ user()?.hasCompleteProfil ? 'Profil complet' : 'Profil incomplet' }}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class ProfilComponent {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;

  readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase() : '?';
  });

  readonly roleLabel = computed(() => {
    switch (this.user()?.role) {
      case 'ROLE_PROPRIETAIRE': return 'Propriétaire';
      case 'ROLE_LOCATAIRE':    return 'Locataire';
      case 'ROLE_ADMIN':        return 'Administrateur';
      default:                  return '—';
    }
  });

  readonly roleBadgeClass = computed(() => {
    switch (this.user()?.role) {
      case 'ROLE_PROPRIETAIRE': return 'bg-blue-50 text-blue-700';
      case 'ROLE_LOCATAIRE':    return 'bg-emerald-50 text-emerald-700';
      case 'ROLE_ADMIN':        return 'bg-purple-50 text-purple-700';
      default:                  return 'bg-gray-100 text-gray-500';
    }
  });
}
