import { Component, effect, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppNotification, NotificationType } from '../../core/models/notification.models';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-proprietaire-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './proprietaire-layout.html',
})
export class ProprietaireLayoutComponent implements OnDestroy {
  readonly auth            = inject(AuthService);
  readonly chatService     = inject(ChatService);
  readonly notifService    = inject(NotificationService);
  private readonly router  = inject(Router);
  private readonly toast   = inject(ToastService);

  readonly sidebarOpen         = signal(false);
  readonly showNotifDropdown   = signal(false);
  readonly showAppNotifDropdown = signal(false);

  private chatInitialized = false;
  private notifSub?: Subscription;
  private appNotifSub?: Subscription;

  readonly navItems: NavItem[] = [
    { label: 'Tableau de bord', path: '/proprietaire/dashboard', icon: '⊞' },
    { label: 'Mes biens',       path: '/proprietaire/biens',     icon: '🏠' },
    { label: 'Annonces',        path: '/proprietaire/annonces',  icon: '🔍' },
    { label: 'Contrats',        path: '/proprietaire/contrats',  icon: '📄' },
    { label: 'États des lieux', path: '/proprietaire/etats-des-lieux', icon: '📋' },
    { label: 'Quittances',      path: '/proprietaire/quittances', icon: '🧾' },
    { label: 'Messages',        path: '/proprietaire/chat',      icon: '💬' },
    { label: 'Mon profil',      path: '/proprietaire/profil',    icon: '👤' },
  ];

  constructor() {
    // Phase 1 : connexion WebSocket + abonnements aux flux temps réel
    effect(() => {
      const user  = this.auth.currentUser();
      const token = this.auth.token();
      if (user && token && !this.chatInitialized) {
        this.chatInitialized = true;
        this.chatService.connect(token, user.mail);
        this.subscribeChatNotifications();
        this.subscribeAppNotifications();
      }
    });

    // Phase 2 : rechargement des données manquées à chaque connexion/reconnexion WebSocket
    effect(() => {
      if (this.chatService.wsStatus() === 'connected' && this.auth.currentUser()) {
        this.chatService.fetchUnreadCount();
        this.chatService.fetchUnreadConvos();
        this.notifService.fetchNonLues();
      }
    });
  }

  private subscribeChatNotifications() {
    this.notifSub = this.chatService.notifications$.subscribe(notif => {
      this.chatService.incrementUnread();
      this.chatService.addOrUpdateUnreadConvo(notif);

      if (!this.router.url.includes('/chat')) {
        this.toast.info(
          `💬 ${notif.expediteurNom || notif.expediteurEmail}: ${notif.contenuPreview}`
        );
      }
    });
  }

  private subscribeAppNotifications() {
    this.appNotifSub = this.chatService.appNotifications$.subscribe(notif => {
      this.notifService.addNotification(notif);
      this.toast.info(`🔔 ${notif.titre}`);
    });
  }

  toggleSidebar()  { this.sidebarOpen.update(v => !v); }
  closeSidebar()   { this.sidebarOpen.set(false); }

  toggleNotifDropdown() {
    if (!this.showNotifDropdown()) {
      this.chatService.fetchUnreadConvos();
      this.showAppNotifDropdown.set(false);
    }
    this.showNotifDropdown.update(v => !v);
  }

  toggleAppNotifDropdown() {
    if (!this.showAppNotifDropdown()) {
      this.showNotifDropdown.set(false);
    }
    this.showAppNotifDropdown.update(v => !v);
  }

  handleNotifClick(notif: AppNotification) {
    this.showAppNotifDropdown.set(false);
    this.closeSidebar();

    if (!notif.lue) {
      this.notifService.marquerLue(notif.id).subscribe({
        next: () => this.notifService.markLocallyAsRead(notif.id),
        error: () => {},
      });
    }

    switch (notif.type) {
      case 'INVITATION_SIGNATURE_CONTRAT':
        if (notif.lien) this.router.navigate(['/contrats/signer', notif.lien]);
        break;
      case 'INVITATION_SIGNATURE_EDL':
        if (notif.lien) this.router.navigate(['/etats-des-lieux/signer', notif.lien]);
        break;
      case 'CONTRAT_SIGNE':
        this.router.navigate(['/proprietaire/contrats']);
        break;
      case 'EDL_SIGNE':
        this.router.navigate(['/proprietaire/etats-des-lieux']);
        break;
      case 'QUITTANCE_DISPONIBLE':
        this.router.navigate(['/proprietaire/quittances']);
        break;
      case 'BIEN_ASSIGNE':
      case 'BIEN_ASSIGNATION_CONFIRMEE':
        this.router.navigate(['/proprietaire/biens']);
        break;
    }
  }

  markAllAppNotifsRead() {
    this.notifService.marquerToutesLues().subscribe({
      next: () => this.notifService.markAllLocallyAsRead(),
      error: () => {},
    });
  }

  notifIcon(type: NotificationType): string {
    switch (type) {
      case 'INVITATION_SIGNATURE_CONTRAT':
      case 'INVITATION_SIGNATURE_EDL':    return '✍️';
      case 'CONTRAT_SIGNE':
      case 'EDL_SIGNE':                  return '✅';
      case 'QUITTANCE_DISPONIBLE':       return '🧾';
      case 'BIEN_ASSIGNE':
      case 'BIEN_ASSIGNATION_CONFIRMEE': return '🏠';
    }
  }

  formatNotifDate(dateStr: string): string {
    const date    = new Date(dateStr);
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1)  return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return `Il y a ${diffH}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  logout() {
    this.chatService.disconnect();
    this.chatInitialized = false;
    this.notifSub?.unsubscribe();
    this.appNotifSub?.unsubscribe();
    this.auth.logout().subscribe({
      next: () => {
        this.toast.success('Déconnexion réussie');
        this.router.navigate(['/']);
      },
      error: () => this.auth.clearSession(),
    });
  }

  get userInitials(): string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName.charAt(0)}${u.lastName.charAt(0)}` : 'P';
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
    this.appNotifSub?.unsubscribe();
    this.chatService.disconnect();
    this.chatInitialized = false;
  }
}
