import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BienService } from '../../../core/services/bien.service';
import { ContratService } from '../../../core/services/contrat.service';
import { QuittanceService } from '../../../core/services/quittance.service';
import { EdlService } from '../../../core/services/edl.service';
import { BienDTO } from '../../../core/models/bien.models';
import { ContratDTO, StatutContrat } from '../../../core/models/contrat.models';
import { QuittanceDTO, StatutQuittance } from '../../../core/models/quittance.models';
import { EtatDesLieuxDTO } from '../../../core/models/edl.models';

@Component({
  selector: 'app-locataire-dashboard',
  imports: [RouterLink],
  templateUrl: './locataire-dashboard.html',
})
export class LocataireDashboardComponent implements OnInit {
  private readonly bienService      = inject(BienService);
  private readonly contratService   = inject(ContratService);
  private readonly quittanceService = inject(QuittanceService);
  private readonly edlService       = inject(EdlService);

  readonly loading         = signal(true);
  readonly monBien         = signal<BienDTO | null>(null);
  readonly contrats        = signal<ContratDTO[]>([]);
  readonly quittances      = signal<QuittanceDTO[]>([]);
  readonly edls            = signal<EtatDesLieuxDTO[]>([]);
  readonly totalContrats   = signal(0);
  readonly totalQuittances = signal(0);
  readonly totalEdls       = signal(0);

  ngOnInit() {
    forkJoin({
      biens:      this.bienService.getMesBiens(),
      contrats:   this.contratService.search({ page: 0, size: 5, sortDirection: 'DESC' }),
      quittances: this.quittanceService.search({ page: 0, size: 5, sortDirection: 'DESC' }),
      edls:       this.edlService.search({ page: 0, size: 5, sortDirection: 'DESC' }),
    }).subscribe({
      next: ({ biens, contrats, quittances, edls }) => {
        this.monBien.set(biens[0] ?? null);
        this.contrats.set(contrats.contenu);
        this.totalContrats.set(contrats.totalElements);
        this.quittances.set(quittances.contenu);
        this.totalQuittances.set(quittances.totalElements);
        this.edls.set(edls.contenu);
        this.totalEdls.set(edls.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statutContratLabel(s: StatutContrat): string {
    const m: Record<StatutContrat, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE_SIGNATURE_PROPRIO: 'En attente propriétaire',
      EN_ATTENTE_SIGNATURE_LOCATAIRE: 'En attente (vous)',
      SIGNE: 'Signé', EXPIRE: 'Expiré', ANNULE: 'Annulé',
    };
    return m[s] ?? s;
  }

  statutContratColor(s: StatutContrat): string {
    if (s === 'SIGNE') return 'bg-green-100 text-green-700';
    if (s === 'EXPIRE' || s === 'ANNULE') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  statutQuittanceLabel(s: StatutQuittance): string {
    const m: Record<StatutQuittance, string> = {
      EN_ATTENTE: 'En attente', PAYEE: 'Payée',
      EN_RETARD: 'En retard',  IMPAYEE: 'Impayée',
    };
    return m[s] ?? s;
  }

  statutQuittanceColor(s: StatutQuittance): string {
    if (s === 'PAYEE') return 'bg-green-100 text-green-700';
    if (s === 'EN_RETARD' || s === 'IMPAYEE') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  statutEdlLabel(s: string): string {
    const m: Record<string, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE_SIGNATURE_PROPRIO: 'En attente propriétaire',
      EN_ATTENTE_SIGNATURE_LOCATAIRE: 'En attente (vous)',
      SIGNE: 'Signé', EXPIRE: 'Expiré',
    };
    return m[s] ?? s;
  }

  statutEdlColor(s: string): string {
    if (s === 'SIGNE') return 'bg-green-100 text-green-700';
    if (s === 'EXPIRE') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  get dateAujourdhui(): string {
    return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
