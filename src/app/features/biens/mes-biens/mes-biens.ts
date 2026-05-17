import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BienService } from '../../../core/services/bien.service';
import { BienDTO, TypeBien } from '../../../core/models/bien.models';
import { UserDTO, LocataireSearchDTO } from '../../../core/models/user.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-mes-biens',
  imports: [RouterLink, FormsModule],
  templateUrl: './mes-biens.html',
})
export class MesBiensComponent implements OnInit {
  private readonly bienService = inject(BienService);
  private readonly toast       = inject(ToastService);
  private readonly router      = inject(Router);

  readonly loading = signal(true);
  readonly biens   = signal<BienDTO[]>([]);

  // ─── Recherche locataire ────────────────────────────────────────────────────
  readonly showDialog        = signal(false);
  readonly selectedBien      = signal<BienDTO | null>(null);
  readonly locataires        = signal<UserDTO[]>([]);
  readonly loadingLocataires = signal(false);
  readonly affectationEnCours = signal<number | null>(null);

  searchNom   = '';
  searchPrenom = '';
  searchEmail = '';

  readonly typeLabels: Record<TypeBien, string> = {
    APPARTEMENT: 'Appartement', MAISON: 'Maison', STUDIO: 'Studio',
  };

  ngOnInit() {
    this.bienService.getMesBiens().subscribe({
      next: list => { this.biens.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  firstImage(bien: BienDTO): string | null {
    return bien.images?.length ? bien.images[0] : null;
  }

  voir(bien: BienDTO) {
    this.router.navigate(['/biens', bien.id]);
  }

  get aucunBien(): boolean {
    return !this.loading() && this.biens().length === 0;
  }

  // ─── Dialog recherche locataire ──────────────────────────────────────────────

  ouvrirRechercheLocataire(bien: BienDTO) {
    this.selectedBien.set(bien);
    this.locataires.set([]);
    this.searchNom = '';
    this.searchPrenom = '';
    this.searchEmail = '';
    this.showDialog.set(true);
  }

  fermerDialog() {
    this.showDialog.set(false);
    this.selectedBien.set(null);
  }

  rechercherLocataires() {
    const bien = this.selectedBien();
    if (!bien) return;
    this.loadingLocataires.set(true);
    const dto: LocataireSearchDTO = {
      nom: this.searchNom.trim() || undefined,
      prenom: this.searchPrenom.trim() || undefined,
      email: this.searchEmail.trim() || undefined,
      page: 0,
      size: 10,
    };
    this.bienService.rechercheLocataire(bien.id, dto).subscribe({
      next: page => {
        this.locataires.set(page.contenu);
        this.loadingLocataires.set(false);
      },
      error: () => this.loadingLocataires.set(false),
    });
  }

  affecterLocataire(user: UserDTO) {
    const bien = this.selectedBien();
    if (!bien) return;
    this.affectationEnCours.set(user.id);
    this.bienService.assignLocataire(bien.id, user.id).subscribe({
      next: () => {
        this.toast.success(`${user.firstName} ${user.lastName} a été assigné au bien.`);
        this.affectationEnCours.set(null);
        this.fermerDialog();
        // Recharger la liste pour afficher le locataire assigné
        this.bienService.getMesBiens().subscribe({ next: list => this.biens.set(list) });
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de l\'affectation.');
        this.affectationEnCours.set(null);
      },
    });
  }
}
