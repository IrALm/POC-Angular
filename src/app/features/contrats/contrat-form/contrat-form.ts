import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ContratService } from '../../../core/services/contrat.service';
import { BienService } from '../../../core/services/bien.service';
import { ToastService } from '../../../core/services/toast.service';
import { BienDTO } from '../../../core/models/bien.models';

@Component({
  selector: 'app-contrat-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contrat-form.html',
})
export class ContratFormComponent implements OnInit {
  private readonly contratService = inject(ContratService);
  private readonly bienService    = inject(BienService);
  private readonly toast          = inject(ToastService);
  private readonly router         = inject(Router);
  private readonly fb             = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);
  readonly biens   = signal<BienDTO[]>([]);
  readonly biensLoading = signal(true);

  readonly form = this.fb.group({
    bienId:            [null as number | null, Validators.required],
    emailLocataire:    ['', [Validators.required, Validators.email]],
    dateDebut:         ['', Validators.required],
    dateFin:           [null as string | null],
    dureeBailMois:     [12, [Validators.required, Validators.min(1), Validators.max(120)]],
    loyerMensuel:      [null as number | null, [Validators.required, Validators.min(1)]],
    chargesMensuelles: [null as number | null, [Validators.required, Validators.min(0)]],
    depotGarantie:     [null as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    this.bienService.getMesBiens().subscribe({
      next: list => { this.biens.set(list); this.biensLoading.set(false); },
      error: () => this.biensLoading.set(false),
    });
  }

  onBienChange(event: Event) {
    const id = Number((event.target as HTMLSelectElement).value);
    const bien = this.biens().find(b => b.id === id);
    if (!bien) return;
    this.form.patchValue({
      bienId:            bien.id,
      emailLocataire:    bien.locataire?.mail ?? '',
      loyerMensuel:      bien.loyerMensuel,
      chargesMensuelles: bien.chargesMensuelles,
      depotGarantie:     bien.depotGarantie,
    });
  }

  fieldError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl?.invalid || !ctrl.touched) return null;
    if (ctrl.errors?.['required']) return 'Champ obligatoire';
    if (ctrl.errors?.['email'])    return 'Adresse email invalide';
    if (ctrl.errors?.['min'])      return `Valeur minimale : ${ctrl.errors['min'].min}`;
    if (ctrl.errors?.['max'])      return `Valeur maximale : ${ctrl.errors['max'].max}`;
    return null;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const v = this.form.value;
    this.contratService.create({
      bienId:            Number(v.bienId),
      emailLocataire:    v.emailLocataire!,
      dateDebut:         v.dateDebut!,
      dateFin:           v.dateFin || null,
      dureeBailMois:     Number(v.dureeBailMois),
      loyerMensuel:      Number(v.loyerMensuel),
      chargesMensuelles: Number(v.chargesMensuelles),
      depotGarantie:     Number(v.depotGarantie),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Contrat créé ! Vous pouvez maintenant le signer.');
        this.router.navigate(['/proprietaire/contrats']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }
}
