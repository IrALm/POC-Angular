import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
})
export class ToastComponent {
  readonly toast = inject(ToastService);

  iconFor(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠',
    };
    return icons[type];
  }

  classFor(type: ToastType): string {
    const classes: Record<ToastType, string> = {
      success: 'bg-green-50 border-green-400 text-green-800',
      error:   'bg-red-50 border-red-400 text-red-800',
      info:    'bg-blue-50 border-blue-400 text-blue-800',
      warning: 'bg-amber-50 border-amber-400 text-amber-800',
    };
    return classes[type];
  }

  iconClassFor(type: ToastType): string {
    const classes: Record<ToastType, string> = {
      success: 'text-green-500',
      error:   'text-red-500',
      info:    'text-blue-500',
      warning: 'text-amber-500',
    };
    return classes[type];
  }
}
