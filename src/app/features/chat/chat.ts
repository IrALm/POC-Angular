import {
  AfterViewChecked, Component, ElementRef,
  OnDestroy, OnInit, ViewChild, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ChatMessage, ConversationDTO, MessageDTO, NotificationDTO } from '../../core/models/chat.models';

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.html',
  host: {
    class: 'block h-full -m-4 sm:-m-6',
  },
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly chatService = inject(ChatService);
  private readonly auth        = inject(AuthService);
  private readonly route       = inject(ActivatedRoute);
  private readonly toast       = inject(ToastService);

  @ViewChild('messagesEl') private messagesEl!: ElementRef<HTMLDivElement>;

  readonly wsStatus       = this.chatService.wsStatus;
  readonly conversations  = signal<ConversationDTO[]>([]);
  readonly selectedConv   = signal<ConversationDTO | null>(null);
  readonly messages       = signal<ChatMessage[]>([]);
  readonly notifications  = signal<NotificationDTO[]>([]);
  readonly notifCount     = signal(0);

  readonly loadingConvs   = signal(true);
  readonly loadingMsgs    = signal(false);
  readonly showNotifPanel = signal(false);
  readonly showSidebar    = signal(true);

  readonly currentPage    = signal(0);
  readonly totalPages     = signal(0);

  // Inline notification toast (for real-time incoming msg)
  readonly incomingNotif  = signal<{ from: string; text: string } | null>(null);
  private notifTimer: ReturnType<typeof setTimeout> | null = null;

  // Filter/sort state (template-driven)
  searchTerm = '';
  filterLu: '' | 'true' | 'false' = '';
  sortBy   = 'lastMessageAt';
  sortDir: 'ASC' | 'DESC' = 'DESC';
  messageInput = '';

  private readonly seenMsgIds   = new Set<number>();
  private readonly seenNotifKeys = new Set<string>();
  private subs: Subscription[]  = [];
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldScrollToBottom = false;
  private pendingContact: { bienId: number; destinataire: string; bienTitre: string | null } | null = null;

  readonly PAGE_SIZE = 12;
  readonly Math = Math;

  // ─── Computed helpers ────────────────────────────────────────────────────────

  get myEmail(): string { return this.auth.currentUser()?.mail ?? ''; }

  interlocutor(conv: ConversationDTO): string {
    return conv.emailExpediteur === this.myEmail ? conv.emailDestinataire : conv.emailExpediteur;
  }

  initials(email: string): string { return (email || '?')[0].toUpperCase(); }

  fmtTime(iso: string | null): string {
    if (!iso) return '';
    const d   = new Date(iso);
    const now  = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === new Date(Date.now() - 86_400_000).toDateString())
      return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  fmtTimeFull(iso: string | null): string {
    if (!iso) return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  private fmtDateLabel(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === new Date(Date.now() - 86_400_000).toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR');
  }

  get wsStatusLabel(): string {
    return ({ disconnected: 'Déconnecté', connecting: 'Connexion…', connected: 'Connecté' })[this.wsStatus()];
  }

  get wsStatusColor(): string {
    return ({
      disconnected: 'bg-red-500',
      connecting:   'bg-amber-400 animate-pulse',
      connected:    'bg-green-500',
    })[this.wsStatus()];
  }

  get aucuneConversation(): boolean { return !this.loadingConvs() && this.conversations().length === 0; }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit() {
    const bienId = Number(this.route.snapshot.queryParamMap.get('bienId'));
    const destinataire = this.route.snapshot.queryParamMap.get('destinataire');
    const bienTitre = this.route.snapshot.queryParamMap.get('bienTitre');
    if (bienId > 0 && destinataire) {
      this.pendingContact = { bienId, destinataire, bienTitre };
    }

    this.subs.push(
      this.chatService.messages$.subscribe(msg  => this.handleIncomingMessage(msg)),
      this.chatService.notifications$.subscribe(n => this.handleNotification(n)),
    );

    this.startMessaging();
  }

  private startMessaging() {
    const token = this.auth.token();

    const start = () => {
      const currentToken = this.auth.token();
      if (currentToken && this.myEmail) this.chatService.connect(currentToken, this.myEmail);
      this.loadConversations(0);
    };

    if (token && !this.auth.currentUser()) {
      this.subs.push(this.auth.loadCurrentUser().subscribe({
        next: start,
        error: start,
      }));
      return;
    }

    start();
  }

  ngOnDestroy() {
    // Don't disconnect WS — the layout manages the global connection
    this.subs.forEach(s => s.unsubscribe());
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.notifTimer) clearTimeout(this.notifTimer);
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom() {
    if (this.messagesEl?.nativeElement) {
      this.messagesEl.nativeElement.scrollTop = this.messagesEl.nativeElement.scrollHeight;
    }
  }

  // ─── Conversations ───────────────────────────────────────────────────────────

  loadConversations(page: number) {
    this.loadingConvs.set(true);
    this.currentPage.set(page);
    this.chatService.searchConversations({
      nomDuBien:     this.searchTerm.trim() || null,
      lu:            this.filterLu === '' ? null : this.filterLu === 'true',
      page,
      size:          this.PAGE_SIZE,
      sortBy:        this.sortBy,
      sortDirection: this.sortDir,
    }).subscribe({
      next: p => {
        this.conversations.set(p.contenu);
        this.totalPages.set(p.totalPages);
        this.loadingConvs.set(false);
        this.openPendingContact();
      },
      error: () => this.loadingConvs.set(false),
    });
  }

  private openPendingContact() {
    const pending = this.pendingContact;
    if (!pending) return;

    const existing = this.conversations().find(c =>
      c.bienId === pending.bienId &&
      (c.emailExpediteur === pending.destinataire || c.emailDestinataire === pending.destinataire)
    );

    if (existing) {
      this.pendingContact = null;
      this.openConversation(existing);
      return;
    }

    const conv: ConversationDTO = {
      id: 0,
      bienId: pending.bienId,
      bienTitre: pending.bienTitre ?? `Bien #${pending.bienId}`,
      emailExpediteur: this.myEmail,
      emailDestinataire: pending.destinataire,
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date().toISOString(),
      nonLuCount: 0,
    };

    this.pendingContact = null;
    this.selectedConv.set(conv);
    this.showSidebar.set(false);
    this.loadingMsgs.set(false);
    this.messages.set([{ type: 'separator', label: 'Aucun message — commencez à écrire !' }]);
    this.shouldScrollToBottom = true;
  }

  onSearchInput() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadConversations(0), 400);
  }

  toggleSortDir() {
    this.sortDir = this.sortDir === 'DESC' ? 'ASC' : 'DESC';
    this.loadConversations(0);
  }

  // ─── Open conversation ───────────────────────────────────────────────────────

  openConversation(conv: ConversationDTO) {
    this.selectedConv.set(conv);
    this.showSidebar.set(false);
    this.messages.set([]);
    this.loadingMsgs.set(true);

    // Reset unread badge locally
    this.conversations.update(list =>
      list.map(c => c.id === conv.id ? { ...c, nonLuCount: 0 } : c)
    );

    const other = this.interlocutor(conv);
    this.chatService.getHistorique(conv.bienId, other).subscribe({
      next: msgs => {
        const chatMsgs: ChatMessage[] = [];
        let lastDate = '';
        for (const m of msgs) {
          const dateLabel = this.fmtDateLabel(m.createdAt);
          if (dateLabel && dateLabel !== lastDate) {
            chatMsgs.push({ type: 'separator', label: dateLabel });
            lastDate = dateLabel;
          }
          chatMsgs.push({
            type:      'message',
            id:        m.id,
            contenu:   m.contenu,
            direction: m.expediteurEmail === this.myEmail ? 'outgoing' : 'incoming',
            time:      this.fmtTimeFull(m.createdAt),
            isNew:     false,
          });
        }
        if (msgs.length === 0) chatMsgs.push({ type: 'separator', label: 'Aucun message — commencez à écrire !' });
        chatMsgs.push({ type: 'separator', label: '— Temps réel —' });
        this.messages.set(chatMsgs);
        this.loadingMsgs.set(false);
        this.shouldScrollToBottom = true;
        this.chatService.marquerLus(other).subscribe(() => this.chatService.fetchUnreadCount());
      },
      error: () => this.loadingMsgs.set(false),
    });
  }

  backToList() {
    this.showSidebar.set(true);
    this.selectedConv.set(null);
  }

  // ─── Send message ────────────────────────────────────────────────────────────

  sendMessage() {
    const contenu = this.messageInput.trim();
    const conv    = this.selectedConv();
    if (!contenu || !conv) return;

    const other = this.interlocutor(conv);
    const sent = this.chatService.send(contenu, other, conv.bienId);
    if (!sent) {
      this.toast.error('WebSocket non connecté. Patientez quelques secondes puis réessayez.');
      return;
    }

    this.messages.update(list => [...list, {
      type:      'message',
      contenu,
      direction: 'outgoing',
      time:      new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isNew:     false,
    }]);

    // Update conversation preview
    this.conversations.update(list =>
      list.map(c => c.id === conv.id ? { ...c, lastMessage: contenu, lastMessageAt: new Date().toISOString() } : c)
    );

    this.messageInput = '';
    this.shouldScrollToBottom = true;

    // Reload conversations after a short delay to get server-confirmed state
    setTimeout(() => this.loadConversations(this.currentPage()), 600);
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  // ─── Real-time handlers ───────────────────────────────────────────────────────

  private handleIncomingMessage(msg: MessageDTO) {
    if (msg.id && this.seenMsgIds.has(msg.id)) return;
    if (msg.id) this.seenMsgIds.add(msg.id);
    if (msg.expediteurEmail === this.myEmail) return; // echo

    const conv = this.selectedConv();
    if (conv && msg.expediteurEmail === this.interlocutor(conv)) {
      this.messages.update(list => [...list, {
        type:      'message',
        id:        msg.id,
        contenu:   msg.contenu,
        direction: 'incoming',
        time:      this.fmtTimeFull(msg.createdAt),
        isNew:     true,
      }]);
      this.shouldScrollToBottom = true;
      this.chatService.marquerLus(msg.expediteurEmail).subscribe(() => this.chatService.fetchUnreadCount());
    } else {
      // Increment badge on matching conversation
      this.conversations.update(list =>
        list.map(c => {
          const other = c.emailExpediteur === this.myEmail ? c.emailDestinataire : c.emailExpediteur;
          return other === msg.expediteurEmail
            ? { ...c, nonLuCount: c.nonLuCount + 1, lastMessage: msg.contenu, lastMessageAt: msg.createdAt }
            : c;
        })
      );
      this.showIncomingNotif(msg.expediteurNom || msg.expediteurEmail, msg.contenu);
    }
  }

  private handleNotification(notif: NotificationDTO) {
    const key = `${notif.conversationId}_${notif.createdAt}`;
    if (this.seenNotifKeys.has(key)) return;
    this.seenNotifKeys.add(key);

    const conv = this.selectedConv();
    if (conv?.id === notif.conversationId) return;

    this.notifications.update(list => [notif, ...list]);
    this.notifCount.update(n => n + 1);
    this.showIncomingNotif(notif.expediteurNom || notif.expediteurEmail, notif.contenuPreview);
  }

  private showIncomingNotif(from: string, text: string) {
    this.incomingNotif.set({ from, text });
    if (this.notifTimer) clearTimeout(this.notifTimer);
    this.notifTimer = setTimeout(() => this.incomingNotif.set(null), 4500);
  }

  goToNotifConv(convId: number) {
    this.showNotifPanel.set(false);
    const conv = this.conversations().find(c => c.id === convId);
    if (conv) this.openConversation(conv);
  }

  clearNotifications() {
    this.notifications.set([]);
    this.notifCount.set(0);
  }
}
