import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Subscription } from 'rxjs';

import {
  Client,
  IMessage,
} from '@stomp/stompjs';

import SockJS from 'sockjs-client';

import { AuthService } from '../../../core/services/auth.service';
import { BienService } from '../../../core/services/bien.service';
import { ChatService } from '../../../core/services/chat.service';

import { environment } from '../../../../environments/environment';

import {
  BienDTO,
  ModeChauffage,
  TypeBien,
} from '../../../core/models/bien.models';

import {
  ChatMessage,
  MessageDTO,
} from '../../../core/models/chat.models';

@Component({
  selector: 'app-bien-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './bien-detail.html',
})
export class BienDetailComponent
  implements OnInit, OnDestroy, AfterViewChecked {

  readonly id = input<string>();

  private readonly bienService = inject(BienService);
  private readonly chatService = inject(ChatService);

  readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  @ViewChild('chatScrollEl')
  private chatScrollEl?: ElementRef<HTMLDivElement>;

  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────

  readonly bien = signal<BienDTO | null>(null);

  readonly loading = signal(true);

  readonly currentImage = signal(0);

  readonly notFound = signal(false);

  // CHAT

  readonly chatOpen = signal(false);

  readonly chatMessages = signal<ChatMessage[]>([]);

  readonly chatLoading = signal(false);

  readonly chatError = signal<string | null>(null);

  readonly wsStatus = signal<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');

  messageInput = '';

  private stompClient: Client | null = null;

  private readonly seenMsgIds = new Set<number>();

  private readonly subs: Subscription[] = [];

  private shouldScroll = false;

  // ─────────────────────────────────────────────
  // LABELS
  // ─────────────────────────────────────────────

  readonly typeLabels: Record<TypeBien, string> = {
    APPARTEMENT: 'Appartement',
    MAISON: 'Maison',
    STUDIO: 'Studio',
  };

  readonly chauffageLabels: Record<ModeChauffage, string> = {
    ELECTRIQUE: 'Électrique',
    GAZ: 'Gaz',
    FIOUL: 'Fioul',
    BOIS: 'Bois',
    POMPE_A_CHALEUR: 'Pompe à chaleur',
    POELE: 'Poêle',
    COLLECTIF: 'Collectif',
    SANS_CHAUFFAGE: 'Sans chauffage',
  };

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  ngOnInit(): void {

    const bienId = Number(this.id());

    if (bienId <= 0) {
      this.loading.set(false);
      return;
    }

    this.bienService.getById(bienId).subscribe({

      next: (b) => {
        this.bien.set(b);
        this.loading.set(false);
      },

      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  ngOnDestroy(): void {

    this.subs.forEach(s => s.unsubscribe());

    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
  }

  ngAfterViewChecked(): void {

    if (
      this.shouldScroll &&
      this.chatScrollEl?.nativeElement
    ) {

      this.chatScrollEl.nativeElement.scrollTop =
        this.chatScrollEl.nativeElement.scrollHeight;

      this.shouldScroll = false;
    }
  }

  // ─────────────────────────────────────────────
  // GALLERY
  // ─────────────────────────────────────────────

  prevImage(): void {

    const imgs = this.bien()?.images ?? [];

    if (imgs.length === 0) {
      return;
    }

    this.currentImage.update(i =>
      (i - 1 + imgs.length) % imgs.length,
    );
  }

  nextImage(): void {

    const imgs = this.bien()?.images ?? [];

    if (imgs.length === 0) {
      return;
    }

    this.currentImage.update(i =>
      (i + 1) % imgs.length,
    );
  }

  selectImage(index: number): void {
    this.currentImage.set(index);
  }

  // ─────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────

  contacter(): void {

    const b = this.bien();

    if (!b) {
      return;
    }

    if (!this.auth.isLoggedIn()) {

      this.router.navigate(
        ['/login'],
        {
          queryParams: {
            redirect: `/biens/${b.id}`,
          },
        },
      );

      return;
    }

    // Empêcher message à soi-même
    if (
      this.auth.currentUser()?.mail ===
      b.proprietaire?.mail
    ) {
      return;
    }

    this.chatOpen.set(true);

    this.openChat();
  }

  closeChat(): void {
    this.chatOpen.set(false);
  }

  // ─────────────────────────────────────────────
  // OPEN CHAT
  // ─────────────────────────────────────────────

  private openChat(): void {

    const doOpen = () => {

      const token = this.auth.token();

      const email =
        this.auth.currentUser()?.mail;

      if (!token || !email) {

        this.chatError.set(
          'Utilisateur non authentifié.',
        );

        return;
      }

      // Déjà connecté
      if (this.stompClient?.connected) {

        console.log('STOMP ALREADY CONNECTED');

        this.loadHistory();

        return;
      }

      // Nettoyage ancien client
      if (this.stompClient?.active) {
        this.stompClient.deactivate();
      }

      this.wsStatus.set('connecting');

      this.chatError.set(null);

      this.stompClient = new Client({

        webSocketFactory: () =>
          new SockJS(environment.wsUrl),

        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },

        reconnectDelay: 5000,

        heartbeatIncoming: 10000,

        heartbeatOutgoing: 10000,

        debug: (msg: string) => {
          console.log('[STOMP]', msg);
        },

        onConnect: () => {

          console.log('STOMP CONNECTED');

          this.wsStatus.set('connected');

          this.chatError.set(null);

          // subscription user spécifique
          this.stompClient?.subscribe(
            `/user/${email}/queue/messages`,
            (frame: IMessage) => {
              this.handleFrame(frame);
            },
          );

          // subscription spring shortcut
          this.stompClient?.subscribe(
            '/user/queue/messages',
            (frame: IMessage) => {
              this.handleFrame(frame);
            },
          );

          this.loadHistory();
        },

        onDisconnect: () => {

          console.log('STOMP DISCONNECTED');

          this.wsStatus.set('disconnected');
        },

        onStompError: (frame) => {

          console.error(
            'STOMP ERROR',
            frame,
          );

          this.wsStatus.set('disconnected');

          this.chatError.set(
            'Erreur STOMP.',
          );
        },

        onWebSocketError: (err) => {

          console.error(
            'WS ERROR',
            err,
          );

          this.wsStatus.set('disconnected');

          this.chatError.set(
            'Erreur WebSocket.',
          );
        },
      });

      this.stompClient.activate();
    };

    // utilisateur pas encore chargé
    if (!this.auth.currentUser()) {

      this.subs.push(
        this.auth.loadCurrentUser().subscribe({
          next: () => doOpen(),
          error: () => doOpen(),
        }),
      );

      return;
    }

    doOpen();
  }

  // ─────────────────────────────────────────────
  // RECEIVE MESSAGE
  // ─────────────────────────────────────────────

  private handleFrame(
    frame: IMessage,
  ): void {

    try {

      const msg: MessageDTO =
        JSON.parse(frame.body);

      const myEmail =
        this.auth.currentUser()?.mail ?? '';

      // Ignorer notre propre echo
      if (
        msg.expediteurEmail === myEmail
      ) {
        return;
      }

      const b = this.bien();

      // Sécurité
      if (
        !b ||
        msg.expediteurEmail !==
          b.proprietaire?.mail
      ) {
        return;
      }

      // Déduplication
      if (
        msg.id &&
        this.seenMsgIds.has(msg.id)
      ) {
        return;
      }

      if (msg.id) {
        this.seenMsgIds.add(msg.id);
      }

      this.chatMessages.update(list => {

        const filtered =
          list.filter(
            m => m.type !== 'separator',
          );

        return [
          ...filtered,
          {
            type: 'message',
            id: msg.id,
            contenu: msg.contenu,
            direction: 'incoming',
            time: this.fmtTime(
              msg.createdAt,
            ),
            isNew: true,
          },
        ];
      });

      this.shouldScroll = true;

    } catch (e) {

      console.error(
        '[BienDetail WS] parse error',
        e,
      );
    }
  }

  // ─────────────────────────────────────────────
  // HISTORY
  // ─────────────────────────────────────────────

  private loadHistory(): void {

    const b = this.bien();

    const proprietaireEmail =
      b?.proprietaire?.mail;

    if (!b || !proprietaireEmail) {
      return;
    }

    this.chatLoading.set(true);

    this.chatError.set(null);

    this.chatService
      .getHistorique(
        b.id,
        proprietaireEmail,
      )
      .subscribe({

        next: (msgs) => {

          const myEmail =
            this.auth.currentUser()?.mail ?? '';

          const list: ChatMessage[] =
            msgs.map(m => ({
              type: 'message',
              id: m.id,
              contenu: m.contenu,
              direction:
                m.expediteurEmail === myEmail
                  ? 'outgoing'
                  : 'incoming',
              time: this.fmtTime(
                m.createdAt,
              ),
              isNew: false,
            }));

          if (list.length === 0) {

            list.push({
              type: 'separator',
              label:
                'Aucun message — commencez la conversation !',
            });
          }

          this.chatMessages.set(list);

          this.chatLoading.set(false);

          this.shouldScroll = true;
        },

        error: () => {

          this.chatLoading.set(false);

          this.chatError.set(
            'Impossible de charger la conversation.',
          );
        },
      });
  }

  // ─────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────

  sendChatMessage(): void {

    const contenu =
      this.messageInput.trim();

    const b = this.bien();

    if (!contenu || !b) {
      return;
    }

    const proprietaireEmail =
      b.proprietaire?.mail;

    // Vérification réelle STOMP
    if (
      !proprietaireEmail ||
      !this.stompClient ||
      !this.stompClient.connected
    ) {

      console.log(
        'STOMP NOT READY',
        {
          proprietaireEmail,
          stompClient:
            !!this.stompClient,
          connected:
            this.stompClient?.connected,
        },
      );

      this.chatError.set(
        'Connexion en cours, réessayez dans un instant.',
      );

      setTimeout(() => {
        this.chatError.set(null);
      }, 3000);

      return;
    }

    console.log('SEND MESSAGE');

    this.stompClient.publish({

      destination: '/app/chat.send',

      body: JSON.stringify({
        contenu,
        emailDestinataire:
          proprietaireEmail,
        bienId: b.id,
      }),
    });

    // affichage local immédiat
    this.chatMessages.update(list => {

      const filtered =
        list.filter(
          m => m.type !== 'separator',
        );

      return [
        ...filtered,
        {
          type: 'message',
          contenu,
          direction: 'outgoing',
          time: new Date()
            .toLocaleTimeString(
              'fr-FR',
              {
                hour: '2-digit',
                minute: '2-digit',
              },
            ),
          isNew: false,
        },
      ];
    });

    this.messageInput = '';

    this.shouldScroll = true;
  }

  // ─────────────────────────────────────────────
  // KEYBOARD
  // ─────────────────────────────────────────────

  onChatKeyDown(
    e: KeyboardEvent,
  ): void {

    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {

      e.preventDefault();

      this.sendChatMessage();
    }
  }

  retryHistory(): void {

    this.chatError.set(null);

    this.loadHistory();
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  get isOwnBien(): boolean {

    return (
      this.auth.currentUser()?.mail ===
      this.bien()?.proprietaire?.mail
    );
  }

  private fmtTime(
    iso: string | null,
  ): string {

    if (!iso) {

      return new Date()
        .toLocaleTimeString(
          'fr-FR',
          {
            hour: '2-digit',
            minute: '2-digit',
          },
        );
    }

    return new Date(iso)
      .toLocaleTimeString(
        'fr-FR',
        {
          hour: '2-digit',
          minute: '2-digit',
        },
      );
  }

  formatPrice(n: number): string {

    return new Intl.NumberFormat(
      'fr-FR',
    ).format(n);
  }

  energyClass(c: string): string {

    const m: Record<string, string> = {

      A: 'bg-green-700 text-white',

      B: 'bg-green-500 text-white',

      C: 'bg-lime-400 text-gray-900',

      D: 'bg-yellow-400 text-gray-900',

      E: 'bg-orange-400 text-white',

      F: 'bg-orange-600 text-white',

      G: 'bg-red-700 text-white',
    };

    return (
      m[c] ??
      'bg-gray-100 text-gray-600'
    );
  }

  proprietaireInitials(): string {

    const p =
      this.bien()?.proprietaire;

    if (!p) {
      return 'P';
    }

    return (
      `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`
    ).toUpperCase();
  }

  get wsStatusColor(): string {

    return ({
      disconnected:
        'bg-red-400',

      connecting:
        'bg-amber-400 animate-pulse',

      connected:
        'bg-green-500',
    })[this.wsStatus()];
  }
}