import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BienService } from '../../../core/services/bien.service';
import { AuthService } from '../../../core/services/auth.service';
import { BienDTO, TypeBien, ModeChauffage } from '../../../core/models/bien.models';

@Component({
  selector: 'app-mon-logement',
  templateUrl: './mon-logement.html',
})
export class MonLogementComponent implements OnInit {
  private readonly bienService = inject(BienService);
  readonly auth                = inject(AuthService);
  private readonly router      = inject(Router);

  readonly bien         = signal<BienDTO | null>(null);
  readonly loading      = signal(true);
  readonly notFound     = signal(false);
  readonly currentImage = signal(0);

  readonly typeLabels: Record<TypeBien, string> = {
    APPARTEMENT: 'Appartement', MAISON: 'Maison', STUDIO: 'Studio',
  };

  readonly chauffageLabels: Record<ModeChauffage, string> = {
    ELECTRIQUE: 'Électrique', GAZ: 'Gaz', FIOUL: 'Fioul', BOIS: 'Bois',
    POMPE_A_CHALEUR: 'Pompe à chaleur', POELE: 'Poêle',
    COLLECTIF: 'Collectif', SANS_CHAUFFAGE: 'Sans chauffage',
  };

  ngOnInit() {
    this.bienService.getMesBiens().subscribe({
      next: biens => {
        const bien = biens[0] ?? null;
        this.bien.set(bien);
        if (!bien) this.notFound.set(true);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.notFound.set(true); },
    });
  }

  prevImage() {
    const imgs = this.bien()?.images ?? [];
    this.currentImage.update(i => (i - 1 + imgs.length) % imgs.length);
  }

  nextImage() {
    const imgs = this.bien()?.images ?? [];
    this.currentImage.update(i => (i + 1) % imgs.length);
  }

  contacterProprietaire() {
    const b = this.bien();
    if (!b?.proprietaire) return;
    this.router.navigate(['/locataire/chat'], {
      queryParams: { bienId: b.id, destinataire: b.proprietaire.mail, bienTitre: b.titre },
    });
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  energyClass(c: string): string {
    const m: Record<string, string> = {
      A: 'bg-green-700 text-white', B: 'bg-green-500 text-white',
      C: 'bg-lime-400 text-gray-900', D: 'bg-yellow-400 text-gray-900',
      E: 'bg-orange-400 text-white', F: 'bg-orange-600 text-white',
      G: 'bg-red-700 text-white',
    };
    return m[c] ?? 'bg-gray-100 text-gray-600';
  }
}
