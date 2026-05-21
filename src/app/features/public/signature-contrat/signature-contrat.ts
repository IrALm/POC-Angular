import { Component, ElementRef, ViewChild, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContratService } from '../../../core/services/contrat.service';
import { ContratDTO } from '../../../core/models/contrat.models';

@Component({
  selector: 'app-signature-contrat',
  imports: [RouterLink],
  templateUrl: './signature-contrat.html',
})
export class SignatureContratComponent implements OnInit {
  readonly token = input<string>();

  private readonly contratService = inject(ContratService);

  readonly loading  = signal(true);
  readonly expired  = signal(false);
  readonly notFound = signal(false);
  readonly success  = signal(false);
  readonly signing  = signal(false);
  readonly error    = signal<string | null>(null);
  readonly contrat  = signal<ContratDTO | null>(null);

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  @ViewChild('sigCanvas') set canvasRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el) {
      setTimeout(() => this.setupCanvas(el.nativeElement), 50);
    }
  }

  ngOnInit() {
    const t = this.token();
    if (!t) { this.notFound.set(true); this.loading.set(false); return; }

    this.contratService.getByToken(t).subscribe({
      next: c  => { this.contrat.set(c); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        if (err.status === 410) this.expired.set(true);
        else                    this.notFound.set(true);
      },
    });
  }

  private setupCanvas(canvas: HTMLCanvasElement) {
    if (!canvas) return;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  onMouseDown(e: MouseEvent, canvas: HTMLCanvasElement) {
    this.isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  onMouseMove(e: MouseEvent, canvas: HTMLCanvasElement) {
    if (!this.isDrawing || !this.ctx) return;
    const rect = canvas.getBoundingClientRect();
    this.ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    this.ctx.stroke();
  }

  onMouseUp() { this.isDrawing = false; }

  onTouchStart(e: TouchEvent, canvas: HTMLCanvasElement) {
    e.preventDefault();
    this.isDrawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  onTouchMove(e: TouchEvent, canvas: HTMLCanvasElement) {
    e.preventDefault();
    if (!this.isDrawing || !this.ctx) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    this.ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.ctx.stroke();
  }

  clearSignature(canvas: HTMLCanvasElement) {
    if (this.ctx) this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  submitSignature(canvas: HTMLCanvasElement) {
    const t = this.token();
    if (!t || this.signing()) return;
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    this.signing.set(true);
    this.error.set(null);
    this.contratService.signerParToken(t, { signatureBase64: base64 }).subscribe({
      next: () => { this.signing.set(false); this.success.set(true); },
      error: err => {
        this.signing.set(false);
        if (err.status === 410) { this.expired.set(true); }
        else this.error.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
