import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly API = environment.apiUrl;

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount   = signal(0);

  constructor(private http: HttpClient) {}

  fetchNonLues() {
    this.http.get<AppNotification[]>(`${this.API}/notifications`).subscribe({
      next: notifs => {
        this.notifications.set(notifs);
        this.unreadCount.set(notifs.filter(n => !n.lue).length);
      },
      error: () => {},
    });
  }

  addNotification(notif: AppNotification) {
    this.notifications.update(list => [notif, ...list]);
    if (!notif.lue) this.unreadCount.update(n => n + 1);
  }

  marquerLue(id: number) {
    return this.http.patch<void>(`${this.API}/notifications/${id}/lire`, {});
  }

  marquerToutesLues() {
    return this.http.patch<void>(`${this.API}/notifications/lire-toutes`, {});
  }

  markLocallyAsRead(id: number) {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, lue: true } : n)
    );
    this.unreadCount.update(n => Math.max(0, n - 1));
  }

  markAllLocallyAsRead() {
    this.notifications.update(list => list.map(n => ({ ...n, lue: true })));
    this.unreadCount.set(0);
  }
}
