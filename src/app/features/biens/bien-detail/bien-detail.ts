import {
  AfterViewChecked, Component, ElementRef, ViewChild,
  inject, input, OnDestroy, OnInit, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BienService } from '../../../core/services/bien.service';
import { ChatService } from '../../../core/services/chat.service';
import { BienDTO, TypeBien, ModeChauffage } from '../../../core/models/bien.models';
import { ChatMessage, MessageDTO } from '../../../core/models/chat.models';

@Component({
  selector: 'app-bien-detail',
  imports: [RouterLink, FormsModule],
  templateUrl: './bien-detail.html',
})
export class BienDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly id = input<string>();

  private readonly bienService = inject(BienService);
  private readonly chatService = inject(ChatService);
  readonly auth                = inject(AuthService);
  private readonly router      = inject(Router);

  @ViewChild('chatScrollEl') private chatScrollEl?: ElementRef<HTMLDivElement>;

  readonly bien          = signal<BienDTO | null>(null);
  readonly loading       = signal(true);
  readonly currentImage  = signal(0);
  readonly notFound      = signal(false);

  // ── Chat panel ────────────────────────────────────────────────────────────
  readonly chatOpen     = signal(false);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly chatLoading  = signal(false);
  readonly chatError    = signal<string | null>(null);
  readonly wsStatus     = this.chatService.wsStatus;
  messageInput          = '';

  private subs: Subscription[]  = [];
  private wsConnectedByUs       = false;
  private msgSubscribed         = false;
  private shouldScroll          = false;
  private seenMsgIds            = new Set<number>();

  // ── Labels ────────────────────────────────────────────────────────────────

  readonly typeLabels: Record<TypeBien, string> = {
    APPARTEMENT: 'Appartement', MAISON: 'Maison', STUDIO: 'Studio',
  };

  readonly chauffageLabels: Record<ModeChauffage, string> = {
    ELECTRIQUE:     'Électrique',
    GAZ:            'Gaz',
    FIOUL:          'Fioul',
    BOIS:           'Bois',
    POMPE_A_CHALEUR:'Pompe à chaleur',
    POELE:          'Poêle',
    COLLECTIF:      'Collectif',
    SANS_CHAUFFAGE: 'Sans chauffage',
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit() {
    const bienId = Number(this.id());
    if (bienId > 0) {
      this.bienService.getById(bienId).subscribe({
        next: b  => { this.bien.set(b); this.loading.set(false); },
        error: () => { this.loading.set(false); this.notFound.set(true); },
      });
    } else {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    if (this.wsConnectedByUs) this.chatService.disconnect();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.chatScrollEl?.nativeElement) {
      this.chatScrollEl.nativeElement.scrollTop = this.chatScrollEl.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  // ── Gallery ───────────────────────────────────────────────────────────────

  prevImage() {
    const imgs = this.bien()?.images ?? [];
    this.currentImage.update(i => (i - 1 + imgs.length) % imgs.length);
  }

  nextImage() {
    const imgs = this.bien()?.images ?? [];
    this.currentImage.update(i => (i + 1) % imgs.length);
  }

  selectImage(index: number) { this.currentImage.set(index); }

  // ── Contact / Chat ────────────────────────────────────────────────────────

  contacter() {
    const b = this.bien();
    if (!b) return;

    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: `/biens/${b.id}` } });
      return;
    }
    if (this.auth.currentUser()?.mail === b.proprietaire?.mail) return;

    this.chatOpen.set(true);
    this.startChat();
  }

  closeChat() { this.chatOpen.set(false); }

  /**
   * Même pattern que chat.ts/startMessaging() :
   * si le user n'est pas chargé mais qu'un token existe, on le charge d'abord.
   */
  private startChat() {
    const token = this.auth.token();

    const doStart = () => {
      this.connectWs();
      this.subscribeToMessages();
      this.loadHistory();
    };

    if (token && !this.auth.currentUser()) {
      this.subs.push(
        this.auth.loadCurrentUser().subscribe({ next: doStart, error: doStart })
      );
      return;
    }

    doStart();
  }

  private connectWs() {
    const token = this.auth.token();
    const email = this.auth.currentUser()?.mail;
    if (token && email && this.chatService.wsStatus() === 'disconnected') {
      this.chatService.connect(token, email);
      this.wsConnectedByUs = true;
    }
  }

  private subscribeToMessages() {
    if (this.msgSubscribed) return;
    this.msgSubscribed = true;
    this.subs.push(
      this.chatService.messages$.subscribe(msg => this.handleIncoming(msg))
    );
  }

  private handleIncoming(msg: MessageDTO) {
    if (msg.id && this.seenMsgIds.has(msg.id)) return;
    if (msg.id) this.seenMsgIds.add(msg.id);

    const b = this.bien();
    const myEmail = this.auth.currentUser()?.mail ?? '';
    // Ignorer nos propres messages (echo) et ceux qui ne viennent pas du propriétaire
    if (!b || msg.expediteurEmail === myEmail) return;
    if (msg.expediteurEmail !== b.proprietaire?.mail) return;

    this.chatMessages.update(list => [...list, {
      type:      'message' as const,
      id:        msg.id,
      contenu:   msg.contenu,
      direction: 'incoming' as const,
      time:      this.fmtTime(msg.createdAt),
      isNew:     true,
    }]);
    this.shouldScroll = true;
  }

  private loadHistory() {
    const b = this.bien();
    const proprietaireEmail = b?.proprietaire?.mail;
    if (!b || !proprietaireEmail) return;

    this.chatLoading.set(true);
    this.chatError.set(null);
    this.chatMessages.set([]);

    this.chatService.getHistorique(b.id, proprietaireEmail).subscribe({
      next: msgs => {
        const myEmail = this.auth.currentUser()?.mail ?? '';
        const list: ChatMessage[] = msgs.map(m => ({
          type:      'message' as const,
          id:        m.id,
          contenu:   m.contenu,
          direction: (m.expediteurEmail === myEmail ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
          time:      this.fmtTime(m.createdAt),
          isNew:     false,
        }));

        if (list.length === 0) {
          list.push({ type: 'separator', label: 'Aucun message — commencez la conversation !' });
        }

        this.chatMessages.set(list);
        this.chatLoading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.chatLoading.set(false);
        this.chatError.set('Impossible de charger la conversation. Réessayez.');
      },
    });
  }

  sendChatMessage() {
    const contenu = this.messageInput.trim();
    const b = this.bien();
    if (!contenu || !b) return;

    const proprietaireEmail = b.proprietaire?.mail;
    if (!proprietaireEmail) return;

    const sent = this.chatService.send(contenu, proprietaireEmail, b.id);
    if (!sent) {
      // WS pas encore prêt — on affiche un retour visuel
      this.chatError.set('Connexion en cours, réessayez dans un instant.');
      setTimeout(() => this.chatError.set(null), 3000);
      return;
    }

    this.chatError.set(null);
    this.chatMessages.update(list => {
      // Retirer le séparateur "commencez la conversation" si présent
      const filtered = list.filter(m => m.type !== 'separator');
      return [...filtered, {
        type:      'message' as const,
        contenu,
        direction: 'outgoing' as const,
        time:      new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        isNew:     false,
      }];
    });
    this.messageInput = '';
    this.shouldScroll = true;
  }

  onChatKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatMessage(); }
  }

  retryHistory() {
    this.chatError.set(null);
    this.loadHistory();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get isOwnBien(): boolean {
    return this.auth.currentUser()?.mail === this.bien()?.proprietaire?.mail;
  }

  private fmtTime(iso: string | null): string {
    if (!iso) return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  energyClass(c: string): string {
    const m: Record<string, string> = {
      A: 'bg-green-700 text-white', B: 'bg-green-500 text-white',
      C: 'bg-lime-400 text-gray-900', D: 'bg-yellow-400 text-gray-900',
      E: 'bg-orange-400 text-white', F: 'bg-orange-600 text-white',
      G: 'bg-red-700 text-white',
    };
    return m[c] ?? 'bg-gray-100 text-gray-600';
  }

  proprietaireInitials(): string {
    const p = this.bien()?.proprietaire;
    if (!p) return 'P';
    return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
  }

  get wsStatusColor(): string {
    return ({
      disconnected: 'bg-red-400',
      connecting:   'bg-amber-400 animate-pulse',
      connected:    'bg-green-500',
    })[this.wsStatus()];
  }
}
