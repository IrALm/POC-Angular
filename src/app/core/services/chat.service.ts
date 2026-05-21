import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import {
  ConversationDTO, ConversationPageDTO, ConversationSearchDTO,
  MessageDTO, NotificationDTO,
} from '../models/chat.models';
import { AppNotification } from '../models/notification.models';

export type WsStatus = 'disconnected' | 'connecting' | 'connected';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly API = environment.apiUrl;
  private client: Client | null = null;

  readonly wsStatus            = signal<WsStatus>('disconnected');
  readonly messages$           = new Subject<MessageDTO>();
  readonly notifications$      = new Subject<NotificationDTO>();
  readonly appNotifications$   = new Subject<AppNotification>();

  /** Global unread message count — updated from server and incremented on notifications */
  readonly unreadCount = signal(0);

  constructor(private http: HttpClient) {}

  // ─── WebSocket ──────────────────────────────────────────────────────────────

  connect(token: string, email: string) {
    if (this.client?.active) return;
    this.wsStatus.set('connecting');

    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      debug: () => {},

      onConnect: () => {
        this.wsStatus.set('connected');
        this.client!.subscribe(`/user/${email}/queue/messages`,           (f: IMessage) => this.messages$.next(JSON.parse(f.body)));
        this.client!.subscribe(`/user/queue/messages`,                    (f: IMessage) => this.messages$.next(JSON.parse(f.body)));
        this.client!.subscribe(`/user/${email}/queue/notifications`,       (f: IMessage) => this.notifications$.next(JSON.parse(f.body)));
        this.client!.subscribe(`/user/queue/notifications`,                (f: IMessage) => this.notifications$.next(JSON.parse(f.body)));
        this.client!.subscribe(`/user/${email}/queue/app-notifications`,   (f: IMessage) => this.appNotifications$.next(JSON.parse(f.body)));
      },

      onDisconnect:     () => this.wsStatus.set('disconnected'),
      onStompError:     () => this.wsStatus.set('disconnected'),
      onWebSocketError: () => this.wsStatus.set('disconnected'),
    });

    this.client.activate();
  }

  disconnect() {
    this.client?.deactivate();
    this.client = null;
    this.wsStatus.set('disconnected');
  }

  // ─── Messaging ──────────────────────────────────────────────────────────────

  send(contenu: string, emailDestinataire: string, bienId: number): boolean {
    if (this.wsStatus() !== 'connected' || !this.client) return false;
    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ contenu, emailDestinataire, bienId }),
    });
    return true;
  }

  // ─── REST API ───────────────────────────────────────────────────────────────

  searchConversations(dto: ConversationSearchDTO) {
    return this.http.post<ConversationPageDTO>(`${this.API}/conversations/search`, dto);
  }

  getHistorique(bienId: number, emailInterlocuteur: string) {
    return this.http.get<MessageDTO[]>(`${this.API}/historique`, {
      params: { bienId: String(bienId), emailInterlocuteur },
    });
  }

  marquerLus(emailExpediteur: string) {
    return this.http.post<void>(
      `${this.API}/messages/conversation/${encodeURIComponent(emailExpediteur)}/lire`,
      {}
    );
  }

  countNonLus() {
    return this.http.get<number>(`${this.API}/messages/non-lus`);
  }

  // ─── Global unread badge helpers ────────────────────────────────────────────

  /** Fetch unread count from server and update the signal */
  fetchUnreadCount() {
    this.countNonLus().subscribe({
      next: count => this.unreadCount.set(count),
      error: () => {},
    });
  }

  /** Locally increment unread (call on incoming notification) */
  incrementUnread() {
    this.unreadCount.update(n => n + 1);
  }

  // ─── Unread conversations list (for bell dropdown) ──────────────────────────

  readonly unreadConvos = signal<ConversationDTO[]>([]);

  fetchUnreadConvos() {
    this.searchConversations({ lu: false, size: 20, sortBy: 'lastMessageAt', sortDirection: 'DESC' }).subscribe({
      next: page => this.unreadConvos.set(page.contenu.filter(c => c.nonLuCount > 0)),
      error: () => {},
    });
  }

  addOrUpdateUnreadConvo(notif: NotificationDTO) {
    this.unreadConvos.update(list => {
      const idx = list.findIndex(c => c.id === notif.conversationId);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = {
          ...updated[idx],
          nonLuCount: updated[idx].nonLuCount + 1,
          lastMessage: notif.contenuPreview,
          lastMessageAt: notif.createdAt,
        };
        return updated;
      }
      return [{
        id: notif.conversationId,
        bienId: 0,
        bienTitre: null,
        emailExpediteur: notif.expediteurEmail,
        emailDestinataire: '',
        lastMessage: notif.contenuPreview,
        lastMessageAt: notif.createdAt,
        createdAt: notif.createdAt ?? new Date().toISOString(),
        nonLuCount: 1,
      }, ...list];
    });
  }
}
