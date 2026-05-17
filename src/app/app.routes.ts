import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ─── Public routes ──────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout').then(m => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/landing/landing').then(m => m.LandingComponent),
      },
      {
        path: 'biens',
        loadComponent: () =>
          import('./features/biens/biens-liste/biens-liste').then(m => m.BiensListeComponent),
      },
      {
        path: 'biens/:id',
        loadComponent: () =>
          import('./features/biens/bien-detail/bien-detail').then(m => m.BienDetailComponent),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then(m => m.RegisterComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password').then(m => m.ResetPasswordComponent),
      },
    ],
  },

  // ─── Public token-based signature pages ────────────────────
  {
    path: 'contrats/signer/:token',
    loadComponent: () =>
      import('./features/public/signature-contrat/signature-contrat').then(m => m.SignatureContratComponent),
  },
  {
    path: 'edl/signer/:token',
    loadComponent: () =>
      import('./features/public/signature-edl/signature-edl').then(m => m.SignatureEdlComponent),
  },

  // ─── Espace Propriétaire ────────────────────────────────────
  {
    path: 'proprietaire',
    canActivate: [authGuard, roleGuard('ROLE_PROPRIETAIRE')],
    loadComponent: () =>
      import('./layouts/proprietaire-layout/proprietaire-layout').then(m => m.ProprietaireLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/proprietaire-dashboard/proprietaire-dashboard').then(m => m.ProprietaireDashboardComponent),
      },
      {
        path: 'biens/nouveau',
        loadComponent: () =>
          import('./features/biens/bien-form/bien-form').then(m => m.BienFormComponent),
      },
      {
        path: 'biens',
        loadComponent: () =>
          import('./features/biens/mes-biens/mes-biens').then(m => m.MesBiensComponent),
      },
      {
        path: 'annonces',
        loadComponent: () =>
          import('./features/biens/biens-liste/biens-liste').then(m => m.BiensListeComponent),
      },
      {
        path: 'contrats/nouveau',
        loadComponent: () =>
          import('./features/contrats/contrat-form/contrat-form').then(m => m.ContratFormComponent),
      },
      {
        path: 'contrats',
        loadComponent: () =>
          import('./features/contrats/contrats-liste/contrats-liste').then(m => m.ContratsListeComponent),
      },
      {
        path: 'etats-des-lieux/nouveau',
        loadComponent: () =>
          import('./features/etats-des-lieux/edl-form/edl-form').then(m => m.EdlFormComponent),
      },
      {
        path: 'etats-des-lieux',
        loadComponent: () =>
          import('./features/etats-des-lieux/edl-liste/edl-liste').then(m => m.EdlListeComponent),
      },
      {
        path: 'quittances/nouveau',
        loadComponent: () =>
          import('./features/quittances/quittance-form/quittance-form').then(m => m.QuittanceFormComponent),
      },
      {
        path: 'quittances',
        loadComponent: () =>
          import('./features/quittances/quittances-liste/quittances-liste').then(m => m.QuittancesListeComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat').then(m => m.ChatComponent),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profil/profil').then(m => m.ProfilComponent),
      },
    ],
  },

  // ─── Espace Locataire ───────────────────────────────────────
  {
    path: 'locataire',
    canActivate: [authGuard, roleGuard('ROLE_LOCATAIRE')],
    loadComponent: () =>
      import('./layouts/locataire-layout/locataire-layout').then(m => m.LocataireLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/locataire-dashboard/locataire-dashboard').then(m => m.LocataireDashboardComponent),
      },
      {
        path: 'mon-bien',
        loadComponent: () =>
          import('./features/biens/mon-logement/mon-logement').then(m => m.MonLogementComponent),
      },
      {
        path: 'annonces',
        loadComponent: () =>
          import('./features/biens/biens-liste/biens-liste').then(m => m.BiensListeComponent),
      },
      {
        path: 'contrats',
        loadComponent: () =>
          import('./features/contrats/contrats-liste/contrats-liste').then(m => m.ContratsListeComponent),
      },
      {
        path: 'etats-des-lieux',
        loadComponent: () =>
          import('./features/etats-des-lieux/edl-liste/edl-liste').then(m => m.EdlListeComponent),
      },
      {
        path: 'quittances',
        loadComponent: () =>
          import('./features/quittances/quittances-liste/quittances-liste').then(m => m.QuittancesListeComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat').then(m => m.ChatComponent),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profil/profil').then(m => m.ProfilComponent),
      },
    ],
  },

  // ─── Fallback ───────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
