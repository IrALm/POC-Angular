import { Component, effect, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { ToastService } from '../../core/services/toast.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-locataire-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './locataire-layout.html',
})
export class LocataireLayoutComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly sidebarOpen = signal(false);
  private chatInitialized = false;
  private notifSub?: Subscription;

  readonly navItems: NavItem[] = [
    { label: 'Tableau de bord', path: '/locataire/dashboard',        icon: '⊞' },
    { label: 'Mon logement',    path: '/locataire/mon-bien',         icon: '🏠' },
    { label: 'Annonces',        path: '/locataire/annonces',         icon: '🔍' },
    { label: 'Contrats',        path: '/locataire/contrats',         icon: '📄' },
    { label: 'États des lieux', path: '/locataire/etats-des-lieux',  icon: '📋' },
    { label: 'Quittances',      path: '/locataire/quittances',       icon: '🧾' },
    { label: 'Messages',        path: '/locataire/chat',             icon: '💬' },
    { label: 'Mon profil',      path: '/locataire/profil',           icon: '👤' },
  ];

  constructor() {
    // React to user becoming available → init global WebSocket + unread count
    effect(() => {
      const user = this.auth.currentUser();
      const token = this.auth.token();
      if (user && token && !this.chatInitialized) {
        this.chatInitialized = true;
        this.chatService.connect(token, user.mail);
        this.chatService.fetchUnreadCount();
        this.subscribeNotifications();
      }
    });
  }

  private subscribeNotifications() {
    this.notifSub = this.chatService.notifications$.subscribe(notif => {
      // Always increment the global badge
      this.chatService.incrementUnread();

      // Show toast only when NOT on the chat page (ChatComponent handles its own notifs)
      if (!this.router.url.includes('/chat')) {
        this.toast.info(
          `💬 ${notif.expediteurNom || notif.expediteurEmail}: ${notif.contenuPreview}`
        );
      }
    });
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar()  { this.sidebarOpen.set(false); }

  logout() {
    this.chatService.disconnect();
    this.chatInitialized = false;
    this.notifSub?.unsubscribe();
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
    return u ? `${u.firstName.charAt(0)}${u.lastName.charAt(0)}` : 'L';
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
    this.chatService.disconnect();
    this.chatInitialized = false;
  }
}
