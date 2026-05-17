import { Component, ElementRef, ViewChild, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EdlService } from '../../../core/services/edl.service';
import { EtatDesLieuxDTO, EtatElement, TypeEtat } from '../../../core/models/edl.models';

@Component({
  selector: 'app-signature-edl',
  imports: [RouterLink],
  templateUrl: './signature-edl.html',
})
export class SignatureEdlComponent implements OnInit {
  readonly token = input<string>();

  private readonly edlService = inject(EdlService);

  readonly loading  = signal(true);
  readonly expired  = signal(false);
  readonly notFound = signal(false);
  readonly success  = signal(false);
  readonly signing  = signal(false);
  readonly error    = signal<string | null>(null);
  readonly edl      = signal<EtatDesLieuxDTO | null>(null);

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  @ViewChild('sigCanvas') set canvasRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el) setTimeout(() => this.setupCanvas(el.nativeElement), 50);
  }

  readonly typeLabels: Record<TypeEtat, { label: string; icon: string }> = {
    ENTREE: { label: 'Entrée', icon: '🔑' },
    SORTIE: { label: 'Sortie', icon: '🚪' },
  };

  readonly etatColors: Record<EtatElement, string> = {
    BON:          'bg-green-100 text-green-800',
    USAGE_NORMAL: 'bg-yellow-100 text-yellow-800',
    MAUVAIS:      'bg-orange-100 text-orange-800',
    HORS_SERVICE: 'bg-red-100 text-red-800',
  };

  readonly etatLabels: Record<EtatElement, string> = {
    BON: 'Bon', USAGE_NORMAL: 'Usage normal', MAUVAIS: 'Mauvais', HORS_SERVICE: 'Hors service',
  };

  ngOnInit() {
    const t = this.token();
    if (!t) { this.notFound.set(true); this.loading.set(false); return; }

    this.edlService.getByToken(t).subscribe({
      next: e  => { this.edl.set(e); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        if (err.status === 401 || err.status === 410) this.expired.set(true);
        else this.notFound.set(true);
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

  private isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return false;
    }
    return true;
  }

  submitSignature(canvas: HTMLCanvasElement) {
    const t = this.token();
    if (!t || this.signing()) return;
    if (this.isCanvasEmpty(canvas)) {
      this.error.set('Veuillez signer avant de valider.');
      return;
    }
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    this.signing.set(true);
    this.error.set(null);
    this.edlService.signerParToken(t, { signatureBase64: base64 }).subscribe({
      next: () => { this.signing.set(false); this.success.set(true); },
      error: err => {
        this.signing.set(false);
        if (err.status === 401 || err.status === 410) this.expired.set(true);
        else this.error.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  sortedPieces(edl: EtatDesLieuxDTO) {
    return [...(edl.pieces ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
