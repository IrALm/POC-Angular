import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string) { this.add(message, 'success'); }
  error(message: string) { this.add(message, 'error'); }
  info(message: string) { this.add(message, 'info'); }
  warning(message: string) { this.add(message, 'warning'); }

  remove(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private add(message: string, type: ToastType) {
    const id = ++this.counter;
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.remove(id), 4000);
  }
}
