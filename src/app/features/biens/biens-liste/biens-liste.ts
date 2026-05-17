import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BienService } from '../../../core/services/bien.service';
import { BienDTO, BienPageDTO, PoiType, TypeBien } from '../../../core/models/bien.models';

@Component({
  selector: 'app-biens-liste',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './biens-liste.html',
})
export class BiensListeComponent implements OnInit {
  private readonly bienService = inject(BienService);
  readonly auth                = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly loading     = signal(false);
  readonly biens       = signal<BienDTO[]>([]);
  readonly page        = signal<BienPageDTO | null>(null);
  readonly currentPage = signal(0);
  readonly showFilters = signal(false);

  readonly PAGE_SIZE = 9;

  readonly filterForm = this.fb.group({
    titre:         [''],
    ville:         [''],
    loyerMax:      [null as number | null],
    surfaceMin:    [null as number | null],
    piecesMin:     [null as number | null],
    meuble:        [null as boolean | null],
    colocation:    [null as boolean | null],
    typeAPPARTEMENT: [false],
    typeMAISON:      [false],
    typeSTUDIO:      [false],
    poiSCHOOL:       [false],
    poiHOSPITAL:     [false],
    poiPHARMACY:     [false],
    poiKINDERGARTEN: [false],
    sortBy:        ['createdAt'],
    sortDirection: ['DESC'],
  });

  readonly poiOptions: { field: 'poiSCHOOL' | 'poiHOSPITAL' | 'poiPHARMACY' | 'poiKINDERGARTEN'; value: PoiType; icon: string; label: string }[] = [
    { field: 'poiSCHOOL',       value: 'SCHOOL',       icon: '🏫', label: 'École' },
    { field: 'poiHOSPITAL',     value: 'HOSPITAL',     icon: '🏥', label: 'Hôpital' },
    { field: 'poiPHARMACY',     value: 'PHARMACY',     icon: '💊', label: 'Pharmacie' },
    { field: 'poiKINDERGARTEN', value: 'KINDERGARTEN', icon: '👶', label: 'Garderie' },
  ];

  readonly typeLabels: Record<TypeBien, string> = {
    APPARTEMENT: 'Appartement',
    MAISON:      'Maison',
    STUDIO:      'Studio',
  };

  readonly typeIcons: Record<TypeBien, string> = {
    APPARTEMENT: '🏢',
    MAISON:      '🏡',
    STUDIO:      '🛋️',
  };

  ngOnInit() { this.search(0); }

  toggleFilters() { this.showFilters.update(v => !v); }

  toggleType(type: 'typeAPPARTEMENT' | 'typeMAISON' | 'typeSTUDIO') {
    const ctrl = this.filterForm.get(type);
    if (ctrl) ctrl.setValue(!ctrl.value);
  }

  toggleBoolean(field: 'meuble' | 'colocation') {
    const ctrl = this.filterForm.get(field);
    if (!ctrl) return;
    ctrl.setValue(ctrl.value === true ? null : true);
  }

  togglePoi(field: 'poiSCHOOL' | 'poiHOSPITAL' | 'poiPHARMACY' | 'poiKINDERGARTEN') {
    const ctrl = this.filterForm.get(field);
    if (ctrl) ctrl.setValue(!ctrl.value);
  }

  search(pageIndex = 0) {
    this.loading.set(true);
    this.currentPage.set(pageIndex);
    const v = this.filterForm.value;

    const typesBien: TypeBien[] = [];
    if (v.typeAPPARTEMENT) typesBien.push('APPARTEMENT');
    if (v.typeMAISON)      typesBien.push('MAISON');
    if (v.typeSTUDIO)      typesBien.push('STUDIO');

    const poisRequis: PoiType[] = [];
    if (v.poiSCHOOL)       poisRequis.push('SCHOOL');
    if (v.poiHOSPITAL)     poisRequis.push('HOSPITAL');
    if (v.poiPHARMACY)     poisRequis.push('PHARMACY');
    if (v.poiKINDERGARTEN) poisRequis.push('KINDERGARTEN');

    this.bienService.search({
      titre:      v.titre?.trim() || undefined,
      villes:     v.ville?.trim() ? [v.ville.trim()] : undefined,
      loyerMax:   v.loyerMax ?? undefined,
      surfaceMin: v.surfaceMin ?? undefined,
      piecesMin:  v.piecesMin ?? undefined,
      meuble:     v.meuble ?? undefined,
      colocation: v.colocation ?? undefined,
      typesBien:  typesBien.length  ? typesBien  : undefined,
      poisRequis: poisRequis.length ? poisRequis : undefined,
      sortBy:     v.sortBy ?? 'createdAt',
      sortDirection: (v.sortDirection as 'ASC' | 'DESC') ?? 'DESC',
      page: pageIndex,
      size: this.PAGE_SIZE,
    }).subscribe({
      next: p => {
        this.page.set(p);
        this.biens.set(p.contenu);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetFilters() {
    this.filterForm.reset({
      sortBy: 'createdAt',
      sortDirection: 'DESC',
    });
    this.search(0);
  }

  goToPage(p: number) {
    const total = this.page()?.totalPages ?? 0;
    if (p < 0 || p >= total) return;
    this.search(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  contacter(event: MouseEvent, bien: BienDTO) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: `/biens/${bien.id}` } });
      return;
    }
    if (this.auth.currentUser()?.mail === bien.proprietaire?.mail) return;

    const base = this.auth.isProprietaire() ? '/proprietaire/chat' : '/locataire/chat';
    this.router.navigate([base], {
      queryParams: { bienId: bien.id, destinataire: bien.proprietaire?.mail, bienTitre: bien.titre },
    });
  }

  isOwnBien(bien: BienDTO): boolean {
    return this.auth.currentUser()?.mail === bien.proprietaire?.mail;
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
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

  firstImage(bien: BienDTO): string | null {
    return bien.images?.length ? bien.images[0] : null;
  }

  proprietaireInitials(bien: BienDTO): string {
    const p = bien.proprietaire;
    if (!p) return 'P';
    return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
  }

  poiIcon(poi: string): string {
    const p = poi.toLowerCase();
    if (p.includes('école') || p.includes('ecole')) return '🏫';
    if (p.includes('hôpital') || p.includes('hopital')) return '🏥';
    if (p.includes('pharmacie')) return '💊';
    if (p.includes('garderie')) return '👶';
    return '📍';
  }

  poiColor(poi: string): string {
    const p = poi.toLowerCase();
    if (p.includes('école') || p.includes('ecole')) return 'bg-blue-50 text-blue-700 border-blue-100';
    if (p.includes('hôpital') || p.includes('hopital')) return 'bg-red-50 text-red-700 border-red-100';
    if (p.includes('pharmacie')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (p.includes('garderie')) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  }

  energyClass(c: string): string {
    const m: Record<string, string> = {
      A: 'bg-green-700 text-white',
      B: 'bg-green-500 text-white',
      C: 'bg-lime-400 text-gray-900',
      D: 'bg-yellow-400 text-gray-900',
      E: 'bg-orange-400 text-white',
      F: 'bg-orange-600 text-white',
      G: 'bg-red-700 text-white',
    };
    return m[c] ?? 'bg-gray-100 text-gray-600';
  }
}
