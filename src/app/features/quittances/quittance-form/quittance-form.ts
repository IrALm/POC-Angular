import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BienService } from '../../../core/services/bien.service';
import { QuittanceService } from '../../../core/services/quittance.service';
import { ToastService } from '../../../core/services/toast.service';
import { BienDTO } from '../../../core/models/bien.models';

@Component({
  selector: 'app-quittance-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './quittance-form.html',
})
export class QuittanceFormComponent implements OnInit {
  private readonly fb               = inject(FormBuilder);
  private readonly bienService      = inject(BienService);
  private readonly quittanceService = inject(QuittanceService);
  private readonly toast            = inject(ToastService);
  private readonly router           = inject(Router);

  readonly biens        = signal<BienDTO[]>([]);
  readonly loadingBiens = signal(true);
  readonly submitting   = signal(false);

  readonly moisLabels = [
    { value: '1',  label: 'Janvier' },
    { value: '2',  label: 'Février' },
    { value: '3',  label: 'Mars' },
    { value: '4',  label: 'Avril' },
    { value: '5',  label: 'Mai' },
    { value: '6',  label: 'Juin' },
    { value: '7',  label: 'Juillet' },
    { value: '8',  label: 'Août' },
    { value: '9',  label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' },
  ];

  readonly annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1);

  readonly currentMonth = String(new Date().getMonth() + 1);
  readonly currentYear  = new Date().getFullYear();

  form = this.fb.group({
    bienId:            [null as number | null, Validators.required],
    emailLocataire:    ['', [Validators.required, Validators.email]],
    mois:              [this.currentMonth, Validators.required],
    annee:             [this.currentYear,  Validators.required],
    loyerMensuel:      [null as number | null, [Validators.required, Validators.min(0)]],
    chargesMensuelles: [null as number | null, [Validators.required, Validators.min(0)]],
    dateEcheance:      ['', Validators.required],
  });

  ngOnInit() {
    this.bienService.getMesBiens().subscribe({
      next: biens => {
        this.biens.set(biens);
        this.loadingBiens.set(false);
      },
      error: () => this.loadingBiens.set(false),
    });

    const today = new Date();
    const yyyy  = today.getFullYear();
    const mm    = String(today.getMonth() + 1).padStart(2, '0');
    const dd    = String(today.getDate()).padStart(2, '0');
    this.form.patchValue({ dateEcheance: `${yyyy}-${mm}-${dd}` });
  }

  onBienChange(event: Event) {
    const id = Number((event.target as HTMLSelectElement).value);
    const bien = this.biens().find(b => b.id === id);
    if (!bien) return;
    this.form.patchValue({
      emailLocataire:    bien.locataire?.mail ?? '',
      loyerMensuel:      bien.loyerMensuel,
      chargesMensuelles: bien.chargesMensuelles,
    });
  }

  get selectedBien(): BienDTO | null {
    const id = this.form.value.bienId;
    return id ? (this.biens().find(b => b.id === id) ?? null) : null;
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  submit() {
    if (this.form.invalid || this.submitting()) return;
    const v = this.form.value;
    this.submitting.set(true);
    this.quittanceService.create({
      bienId:            v.bienId!,
      emailLocataire:    v.emailLocataire!,
      mois:              v.mois!,
      annee:             v.annee!,
      loyerMensuel:      v.loyerMensuel ?? undefined,
      chargesMensuelles: v.chargesMensuelles ?? undefined,
      dateEcheance:      v.dateEcheance!,
    }).subscribe({
      next: () => {
        this.toast.success('Quittance créée avec succès.');
        this.router.navigate(['/proprietaire/quittances']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message ?? 'Erreur lors de la création.');
      },
    });
  }
}
