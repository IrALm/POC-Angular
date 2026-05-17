import { Component, ElementRef, ViewChild, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { QuittanceService } from '../../../core/services/quittance.service';
import { ToastService } from '../../../core/services/toast.service';
import { QuittanceDTO, StatutQuittance } from '../../../core/models/quittance.models';

@Component({
  selector: 'app-quittances-liste',
  imports: [RouterLink],
  templateUrl: './quittances-liste.html',
})
export class QuittancesListeComponent implements OnInit {
  private readonly quittanceService = inject(QuittanceService);
  readonly auth                     = inject(AuthService);
  private readonly toast            = inject(ToastService);

  readonly loading        = signal(true);
  readonly quittances     = signal<QuittanceDTO[]>([]);
  readonly currentPage    = signal(0);
  readonly totalPages     = signal(0);
  readonly filterStatut   = signal<StatutQuittance | null>(null);
  readonly filterAnnee    = signal<number>(new Date().getFullYear());

  readonly showPayModal   = signal(false);
  readonly payLoading     = signal(false);
  readonly selectedQ      = signal<QuittanceDTO | null>(null);

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  @ViewChild('sigCanvas') set canvasRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el) setTimeout(() => this.setupCanvas(el.nativeElement), 50);
  }

  readonly PAGE_SIZE = 20;

  readonly statutLabels: Record<StatutQuittance, string> = {
    EN_ATTENTE: 'En attente',
    PAYEE:      'Payée',
    EN_RETARD:  'En retard',
    IMPAYEE:    'Impayée',
  };

  readonly statutFilters: [StatutQuittance, string][] = [
    ['EN_ATTENTE', 'En attente'],
    ['PAYEE', 'Payées'],
    ['EN_RETARD', 'En retard'],
    ['IMPAYEE', 'Impayées'],
  ];

  readonly statutColors: Record<StatutQuittance, string> = {
    EN_ATTENTE: 'bg-blue-100 text-blue-800',
    PAYEE:      'bg-green-100 text-green-800',
    EN_RETARD:  'bg-orange-100 text-orange-800',
    IMPAYEE:    'bg-red-100 text-red-800',
  };

  readonly moisLabels = [
    '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  readonly annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  ngOnInit() { this.load(0); }

  load(page: number) {
    this.loading.set(true);
    this.currentPage.set(page);
    this.quittanceService.search({
      statut:   this.filterStatut() ?? undefined,
      annee:    this.filterAnnee() || undefined,
      page,
      size:     this.PAGE_SIZE,
      sortBy:   'annee',
      sortDirection: 'DESC',
    }).subscribe({
      next: p => {
        this.quittances.set(p.contenu);
        this.totalPages.set(p.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setStatutFilter(s: StatutQuittance | null) {
    this.filterStatut.set(s);
    this.load(0);
  }

  setAnneeFilter(annee: number) {
    this.filterAnnee.set(annee);
    this.load(0);
  }

  openPayModal(q: QuittanceDTO) {
    this.selectedQ.set(q);
    this.showPayModal.set(true);
  }

  closePayModal() {
    this.showPayModal.set(false);
    this.selectedQ.set(null);
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
    const r = canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  }

  onMouseMove(e: MouseEvent, canvas: HTMLCanvasElement) {
    if (!this.isDrawing || !this.ctx) return;
    const r = canvas.getBoundingClientRect();
    this.ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    this.ctx.stroke();
  }

  onMouseUp() { this.isDrawing = false; }

  onTouchStart(e: TouchEvent, canvas: HTMLCanvasElement) {
    e.preventDefault();
    this.isDrawing = true;
    const t = e.touches[0]; const r = canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(t.clientX - r.left, t.clientY - r.top);
  }

  onTouchMove(e: TouchEvent, canvas: HTMLCanvasElement) {
    e.preventDefault();
    if (!this.isDrawing || !this.ctx) return;
    const t = e.touches[0]; const r = canvas.getBoundingClientRect();
    this.ctx.lineTo(t.clientX - r.left, t.clientY - r.top);
    this.ctx.stroke();
  }

  clearSignature(canvas: HTMLCanvasElement) {
    if (this.ctx) this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  submitPayment(canvas: HTMLCanvasElement) {
    const q = this.selectedQ();
    if (!q || this.payLoading()) return;
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    this.payLoading.set(true);
    this.quittanceService.marquerPayee(q.id, { signatureBase64: base64 }).subscribe({
      next: () => {
        this.payLoading.set(false);
        this.toast.success('Quittance signée et envoyée au locataire.');
        this.closePayModal();
        this.load(this.currentPage());
      },
      error: (err) => {
        this.payLoading.set(false);
        this.toast.error(err.error?.message ?? 'Erreur lors de la signature.');
      },
    });
  }

  canMarkPayee(q: QuittanceDTO): boolean {
    return this.auth.isProprietaire() && (q.statut === 'EN_ATTENTE' || q.statut === 'EN_RETARD');
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  isLate(q: QuittanceDTO): boolean {
    return q.statut === 'EN_ATTENTE' && q.dateEcheance != null && new Date(q.dateEcheance) < new Date();
  }

  get aucuneQuittance(): boolean { return !this.loading() && this.quittances().length === 0; }
}
