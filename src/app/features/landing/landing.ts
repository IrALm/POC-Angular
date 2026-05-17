import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
})
export class LandingComponent {

  readonly features = [
    {
      icon: '🏡',
      title: 'Annonces en ligne',
      desc: 'Publiez et consultez des annonces de biens immobiliers avec photos, caractéristiques complètes et localisation.',
    },
    {
      icon: '📄',
      title: 'Gestion complète',
      desc: 'Gérez contrats de bail, états des lieux et quittances de loyer depuis un seul espace sécurisé.',
    },
    {
      icon: '💬',
      title: 'Communication directe',
      desc: 'Échangez en temps réel avec votre propriétaire ou locataire via la messagerie intégrée.',
    },
    {
      icon: '✍️',
      title: 'Signature électronique',
      desc: 'Signez vos documents directement en ligne. Contrats et états des lieux validés en quelques clics.',
    },
    {
      icon: '🔔',
      title: 'Notifications temps réel',
      desc: 'Recevez instantanément vos notifications de messages, rappels de loyer et mises à jour de contrats.',
    },
    {
      icon: '🔒',
      title: 'Données sécurisées',
      desc: 'Toutes vos données sont protégées par un chiffrement de bout en bout et une authentification robuste.',
    },
  ];

  readonly stats = [
    { value: '100%', label: 'Gratuit' },
    { value: '24/7', label: 'Accessible' },
    { value: '< 2min', label: 'Inscription' },
    { value: '∞', label: 'Biens gérés' },
  ];

  readonly testimonials = [
    {
      name: 'Aminata K.',
      role: 'Propriétaire — 3 biens',
      quote: 'Kupanga a transformé ma gestion locative. Je gagne un temps fou sur les quittances et les contrats.',
      initials: 'AK',
    },
    {
      name: 'Thomas R.',
      role: 'Locataire',
      quote: 'J\'ai trouvé mon appartement en 10 minutes et signé le contrat en ligne. Simple et efficace.',
      initials: 'TR',
    },
    {
      name: 'Sophie M.',
      role: 'Propriétaire — 8 biens',
      quote: 'La messagerie intégrée et les notifications m\'évitent de perdre des messages importants.',
      initials: 'SM',
    },
  ];
}
