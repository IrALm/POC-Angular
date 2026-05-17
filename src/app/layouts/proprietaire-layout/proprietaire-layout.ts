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
  selector: 'app-proprietaire-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './proprietaire-layout.html',
})
export class ProprietaireLayoutComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly sidebarOpen = signal(false);
  private chatInitialized = false;
  private notifSub?: Subscription;

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
    return u ? `${u.firstName.charAt(0)}${u.lastName.charAt(0)}` : 'P';
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
    this.chatService.disconnect();
    this.chatInitialized = false;
  }
}
