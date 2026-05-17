import { Component, ElementRef, ViewChild, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ContratService } from '../../../core/services/contrat.service';
import { ToastService } from '../../../core/services/toast.service';
import { ContratDTO, ContratPageDTO, StatutContrat } from '../../../core/models/contrat.models';

@Component({
  selector: 'app-contrats-liste',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './contrats-liste.html',
})
export class ContratsListeComponent implements OnInit {
  private readonly contratService = inject(ContratService);
  readonly auth                   = inject(AuthService);
  private readonly toast          = inject(ToastService);
  private readonly fb             = inject(FormBuilder);

  readonly loading         = signal(true);
  readonly contrats        = signal<ContratDTO[]>([]);
  readonly page            = signal<ContratPageDTO | null>(null);
  readonly currentPage     = signal(0);
  readonly showFilters     = signal(false);
  readonly showSignModal   = signal(false);
  readonly signLoading     = signal(false);
  readonly selectedContrat = signal<ContratDTO | null>(null);

  readonly PAGE_SIZE = 10;

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  @ViewChild('sigCanvas') set canvasRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el) setTimeout(() => this.setupCanvas(el.nativeElement), 50);
  }

  readonly filterForm = this.fb.group({
    statut:         [null as StatutContrat | null],
    loyerMin:       [null as number | null],
    loyerMax:       [null as number | null],
    dateDebutApres: [''],
    dateDebutAvant: [''],
    sortBy:         ['dateDebut'],
    sortDirection:  ['DESC'],
  });

  readonly statutOptions: { value: StatutContrat; label: string }[] = [
    { value: 'EN_ATTENTE_SIGNATURE_PROPRIO',   label: 'À signer (vous)' },
    { value: 'EN_ATTENTE_SIGNATURE_LOCATAIRE', label: 'En attente locataire' },
    { value: 'SIGNE',                          label: 'Signé' },
    { value: 'EXPIRE',                         label: 'Expiré' },
    { value: 'ANNULE',                         label: 'Annulé' },
    { value: 'BROUILLON',                      label: 'Brouillon' },
  ];

  readonly sortOptions = [
    { value: 'dateDebut',   label: 'Date de début' },
    { value: 'createdAt',   label: 'Date de création' },
    { value: 'loyerMensuel', label: 'Loyer' },
    { value: 'statut',      label: 'Statut' },
  ];

  readonly statutLabels: Record<StatutContrat, string> = {
    BROUILLON:                        'Brouillon',
    EN_ATTENTE_SIGNATURE_PROPRIO:     'À signer (vous)',
    EN_ATTENTE_SIGNATURE_LOCATAIRE:   'En attente locataire',
    SIGNE:                            'Signé',
    EXPIRE:                           'Expiré',
    ANNULE:                           'Annulé',
  };

  readonly statutColors: Record<StatutContrat, string> = {
    BROUILLON:                        'bg-gray-100 text-gray-700',
    EN_ATTENTE_SIGNATURE_PROPRIO:     'bg-amber-100 text-amber-800',
    EN_ATTENTE_SIGNATURE_LOCATAIRE:   'bg-blue-100 text-blue-800',
    SIGNE:                            'bg-green-100 text-green-800',
    EXPIRE:                           'bg-red-100 text-red-700',
    ANNULE:                           'bg-red-100 text-red-700',
  };

  ngOnInit() { this.search(0); }

  toggleFilters() { this.showFilters.update(v => !v); }

  search(pageIndex = 0) {
    this.loading.set(true);
    this.currentPage.set(pageIndex);
    const v = this.filterForm.value;

    this.contratService.search({
      statut:         v.statut ?? undefined,
      loyerMin:       v.loyerMin ?? undefined,
      loyerMax:       v.loyerMax ?? undefined,
      dateDebutApres: v.dateDebutApres?.trim() || undefined,
      dateDebutAvant: v.dateDebutAvant?.trim() || undefined,
      sortBy:         v.sortBy ?? 'dateDebut',
      sortDirection:  (v.sortDirection as 'ASC' | 'DESC') ?? 'DESC',
      page:           pageIndex,
      size:           this.PAGE_SIZE,
    }).subscribe({
      next: p => {
        this.page.set(p);
        this.contrats.set(p.contenu);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetFilters() {
    this.filterForm.reset({ sortBy: 'dateDebut', sortDirection: 'DESC' });
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

  openSignModal(contrat: ContratDTO) {
    this.selectedContrat.set(contrat);
    this.showSignModal.set(true);
  }

  closeSignModal() {
    this.showSignModal.set(false);
    this.selectedContrat.set(null);
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
    const contrat = this.selectedContrat();
    if (!contrat || this.signLoading()) return;
    if (this.isCanvasEmpty(canvas)) {
      this.toast.error('Veuillez signer avant de valider.');
      return;
    }
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    this.signLoading.set(true);
    this.contratService.signerProprietaire(contrat.id, { signatureBase64: base64 }).subscribe({
      next: () => {
        this.signLoading.set(false);
        this.toast.success('Contrat signé. Le locataire va recevoir un email.');
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

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  canSign(c: ContratDTO): boolean {
    return this.auth.isProprietaire() && c.statut === 'EN_ATTENTE_SIGNATURE_PROPRIO';
  }

  get aucunContrat(): boolean {
    return !this.loading() && this.contrats().length === 0;
  }

  get hasActiveFilters(): boolean {
    const v = this.filterForm.value;
    return !!(v.statut || v.loyerMin || v.loyerMax || v.dateDebutApres || v.dateDebutAvant);
  }
}
