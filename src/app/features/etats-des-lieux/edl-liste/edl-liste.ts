import { Component, ElementRef, ViewChild, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EdlService } from '../../../core/services/edl.service';
import { ToastService } from '../../../core/services/toast.service';
import { EtatDesLieuxDTO, EdlPageDTO, StatutEdl, TypeEtat } from '../../../core/models/edl.models';

@Component({
  selector: 'app-edl-liste',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './edl-liste.html',
})
export class EdlListeComponent implements OnInit {
  private readonly edlService = inject(EdlService);
  readonly auth               = inject(AuthService);
  private readonly toast      = inject(ToastService);
  private readonly fb         = inject(FormBuilder);

  readonly loading       = signal(true);
  readonly edls          = signal<EtatDesLieuxDTO[]>([]);
  readonly page          = signal<EdlPageDTO | null>(null);
  readonly currentPage   = signal(0);
  readonly showFilters   = signal(false);
  readonly showSignModal = signal(false);
  readonly signLoading   = signal(false);
  readonly selectedEdl   = signal<EtatDesLieuxDTO | null>(null);

  readonly PAGE_SIZE = 10;

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  @ViewChild('sigCanvas') set canvasRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el) setTimeout(() => this.setupCanvas(el.nativeElement), 50);
  }

  readonly filterForm = this.fb.group({
    type:          [null as TypeEtat | null],
    statut:        [null as StatutEdl | null],
    sortBy:        ['dateRealisation'],
    sortDirection: ['DESC'],
  });

  readonly typeOptions: { value: TypeEtat; label: string; icon: string }[] = [
    { value: 'ENTREE', label: 'Entrée', icon: '🔑' },
    { value: 'SORTIE', label: 'Sortie', icon: '🚪' },
  ];

  readonly statutOptions: { value: StatutEdl; label: string }[] = [
    { value: 'EN_ATTENTE_SIGNATURE_PROPRIO',   label: 'À signer (vous)' },
    { value: 'EN_ATTENTE_SIGNATURE_LOCATAIRE', label: 'En attente locataire' },
    { value: 'SIGNE',                          label: 'Signé' },
    { value: 'EXPIRE',                         label: 'Expiré' },
    { value: 'BROUILLON',                      label: 'Brouillon' },
  ];

  readonly sortOptions = [
    { value: 'dateRealisation', label: 'Date de réalisation' },
    { value: 'createdAt',       label: 'Date de création' },
    { value: 'statut',          label: 'Statut' },
    { value: 'type',            label: 'Type' },
  ];

  readonly statutLabels: Record<StatutEdl, string> = {
    BROUILLON:                        'Brouillon',
    EN_ATTENTE_SIGNATURE_PROPRIO:     'À signer (vous)',
    EN_ATTENTE_SIGNATURE_LOCATAIRE:   'En attente locataire',
    SIGNE:                            'Signé',
    EXPIRE:                           'Expiré',
  };

  readonly statutColors: Record<StatutEdl, string> = {
    BROUILLON:                        'bg-gray-100 text-gray-700',
    EN_ATTENTE_SIGNATURE_PROPRIO:     'bg-amber-100 text-amber-800',
    EN_ATTENTE_SIGNATURE_LOCATAIRE:   'bg-blue-100 text-blue-800',
    SIGNE:                            'bg-green-100 text-green-800',
    EXPIRE:                           'bg-red-100 text-red-700',
  };

  readonly typeLabels: Record<TypeEtat, { label: string; icon: string; color: string }> = {
    ENTREE: { label: 'Entrée', icon: '🔑', color: 'bg-emerald-100 text-emerald-800' },
    SORTIE: { label: 'Sortie', icon: '🚪', color: 'bg-orange-100 text-orange-800' },
  };

  ngOnInit() { this.search(0); }

  toggleFilters() { this.showFilters.update(v => !v); }

  search(pageIndex = 0) {
    this.loading.set(true);
    this.currentPage.set(pageIndex);
    const v = this.filterForm.value;

    this.edlService.search({
      type:          v.type ?? undefined,
      statut:        v.statut ?? undefined,
      sortBy:        v.sortBy ?? 'dateRealisation',
      sortDirection: (v.sortDirection as 'ASC' | 'DESC') ?? 'DESC',
      page:          pageIndex,
      size:          this.PAGE_SIZE,
    }).subscribe({
      next: p => {
        this.page.set(p);
        this.edls.set(p.contenu);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetFilters() {
    this.filterForm.reset({ sortBy: 'dateRealisation', sortDirection: 'DESC' });
    this.search(0);
  }

  goToPage(p: number) {
    const total = this.page()?.totalPages ?? 0;
    if (p < 0 || p >= total) return;
    this.search(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pagesArray(): number[] {
    const total = this.page()?.totalPages ?? 0;
    const cur   = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: number[] = [0];
    if (cur > 2) pages.push(-1);
    for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) pages.push(i);
    if (cur < total - 3) pages.push(-1);
    pages.push(total - 1);
    return pages;
  }

  // ── Signature modal ────────────────────────────────────────────────────────

  openSignModal(edl: EtatDesLieuxDTO) {
    this.selectedEdl.set(edl);
    this.showSignModal.set(true);
  }

  closeSignModal() {
    this.showSignModal.set(false);
    this.selectedEdl.set(null);
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
    const edl = this.selectedEdl();
    if (!edl || this.signLoading()) return;
    if (this.isCanvasEmpty(canvas)) {
      this.toast.error('Veuillez signer avant de valider.');
      return;
    }
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    this.signLoading.set(true);
    this.edlService.signerProprietaire(edl.id, { signatureBase64: base64 }).subscribe({
      next: () => {
        this.signLoading.set(false);
        this.toast.success('EDL signé. Le locataire va recevoir un email.');
        this.closeSignModal();
        this.search(this.currentPage());
      },
      error: (err) => {
        this.signLoading.set(false);
        this.toast.error(err.error?.message ?? 'Erreur lors de la signature.');
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  canSign(edl: EtatDesLieuxDTO): boolean {
    return this.auth.isProprietaire() && edl.statut === 'EN_ATTENTE_SIGNATURE_PROPRIO';
  }

  worstEtat(edl: EtatDesLieuxDTO): string | null {
    const all = edl.pieces?.flatMap(p => p.elements?.map(e => e.etatElement) ?? []) ?? [];
    if (all.includes('HORS_SERVICE')) return 'HORS_SERVICE';
    if (all.includes('MAUVAIS'))      return 'MAUVAIS';
    if (all.includes('USAGE_NORMAL')) return 'USAGE_NORMAL';
    if (all.includes('BON'))          return 'BON';
    return null;
  }

  etatColor(e: string | null): string {
    const m: Record<string, string> = {
      BON:          'bg-green-100 text-green-800',
      USAGE_NORMAL: 'bg-yellow-100 text-yellow-800',
      MAUVAIS:      'bg-orange-100 text-orange-800',
      HORS_SERVICE: 'bg-red-100 text-red-800',
    };
    return e ? (m[e] ?? 'bg-gray-100 text-gray-600') : '';
  }

  etatLabel(e: string | null): string {
    const m: Record<string, string> = {
      BON: 'Bon état', USAGE_NORMAL: 'Usage normal', MAUVAIS: 'Mauvais', HORS_SERVICE: 'Hors service',
    };
    return e ? (m[e] ?? e) : '';
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get aucunEdl(): boolean { return !this.loading() && this.edls().length === 0; }

  get hasActiveFilters(): boolean {
    const v = this.filterForm.value;
    return !!(v.type || v.statut);
  }
}
