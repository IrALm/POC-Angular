import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BienService } from '../../../core/services/bien.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  BienDTO, BienUpdateDTO,
  ClasseEnergie, ClasseGes, ModeChauffage, TypeBien,
} from '../../../core/models/bien.models';

@Component({
  selector: 'app-bien-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './bien-edit.html',
})
export class BienEditComponent implements OnInit {
  private readonly bienService = inject(BienService);
  private readonly toast       = inject(ToastService);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  private readonly fb          = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving  = signal(false);
  readonly bienId  = signal<number | null>(null);
  readonly bien    = signal<BienDTO | null>(null);

  readonly form = this.fb.group({
    typeBien:          ['APPARTEMENT' as TypeBien, Validators.required],
    titre:             ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    description:       ['' as string | null],
    surfaceHabitable:  [null as number | null, [Validators.required, Validators.min(9), Validators.max(10000)]],
    nombrePieces:      [null as number | null, [Validators.required, Validators.min(1), Validators.max(50)]],
    nombreChambres:    [null as number | null, [Validators.min(0), Validators.max(20)]],
    etage:             [null as number | null, [Validators.min(0), Validators.max(200)]],
    ascenseur:         [false],
    anneeConstruction: [null as number | null, [Validators.min(1800), Validators.max(2100)]],
    modeChauffage:     ['ELECTRIQUE' as ModeChauffage, Validators.required],
    classeEnergie:     ['D' as ClasseEnergie, Validators.required],
    classeGes:         ['D' as ClasseGes, Validators.required],
    loyerMensuel:      [null as number | null, [Validators.required, Validators.min(1), Validators.max(100000)]],
    chargesMensuelles: [null as number | null, [Validators.min(0), Validators.max(10000)]],
    depotGarantie:     [null as number | null, [Validators.min(0), Validators.max(100000)]],
    meuble:            [false],
    colocation:        [false],
    disponibleDe:      [null as string | null],
  });

  readonly typeOptions: { value: TypeBien; label: string; icon: string }[] = [
    { value: 'APPARTEMENT', label: 'Appartement', icon: '🏢' },
    { value: 'MAISON',      label: 'Maison',      icon: '🏡' },
    { value: 'STUDIO',      label: 'Studio',      icon: '🛋️' },
  ];

  readonly chauffageOptions: { value: ModeChauffage; label: string }[] = [
    { value: 'ELECTRIQUE',      label: 'Électrique' },
    { value: 'GAZ',             label: 'Gaz' },
    { value: 'FIOUL',           label: 'Fioul' },
    { value: 'BOIS',            label: 'Bois' },
    { value: 'POMPE_A_CHALEUR', label: 'Pompe à chaleur' },
    { value: 'POELE',           label: 'Poêle' },
    { value: 'COLLECTIF',       label: 'Collectif' },
    { value: 'SANS_CHAUFFAGE',  label: 'Sans chauffage' },
  ];

  readonly energyOptions: ClasseEnergie[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  readonly energyColors: Record<ClasseEnergie, string> = {
    A: 'bg-green-700 text-white', B: 'bg-green-500 text-white',
    C: 'bg-lime-400 text-gray-900', D: 'bg-yellow-400 text-gray-900',
    E: 'bg-orange-400 text-white', F: 'bg-orange-600 text-white',
    G: 'bg-red-700 text-white',
  };

  get selectedType(): TypeBien   { return this.form.get('typeBien')?.value as TypeBien; }
  get selectedEnergie(): string  { return this.form.get('classeEnergie')?.value ?? 'D'; }
  get selectedGes(): string      { return this.form.get('classeGes')?.value ?? 'D'; }

  setType(type: TypeBien)        { this.form.patchValue({ typeBien: type }); }
  setChauffage(v: ModeChauffage) { this.form.patchValue({ modeChauffage: v }); }
  setEnergie(c: ClasseEnergie)   { this.form.patchValue({ classeEnergie: c }); }
  setGes(c: ClasseGes)           { this.form.patchValue({ classeGes: c }); }
  toggleAscenseur()              { this.form.patchValue({ ascenseur: !this.form.get('ascenseur')?.value }); }
  toggleMeuble()                 { this.form.patchValue({ meuble: !this.form.get('meuble')?.value }); }
  toggleColocation()             { this.form.patchValue({ colocation: !this.form.get('colocation')?.value }); }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bienId.set(id);

    this.bienService.getById(id).subscribe({
      next: (bien) => {
        this.bien.set(bien);
        this.form.patchValue({
          typeBien:          bien.typeBien,
          titre:             bien.titre,
          description:       bien.description ?? '',
          surfaceHabitable:  bien.surfaceHabitable,
          nombrePieces:      bien.nombrePieces,
          nombreChambres:    bien.nombreChambres,
          etage:             bien.etage,
          ascenseur:         bien.ascenseur,
          anneeConstruction: bien.anneeConstruction,
          modeChauffage:     bien.modeChauffage,
          classeEnergie:     bien.classeEnergie,
          classeGes:         bien.classeGes,
          loyerMensuel:      bien.loyerMensuel,
          chargesMensuelles: bien.chargesMensuelles,
          depotGarantie:     bien.depotGarantie,
          meuble:            bien.meuble,
          colocation:        bien.colocation,
          disponibleDe:      bien.disponibleDe ?? null,
        });
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Impossible de charger ce bien.');
        this.router.navigate(['/proprietaire/biens']);
      },
    });
  }

  fieldError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl?.invalid || !ctrl.touched) return null;
    if (ctrl.errors?.['required'])  return 'Champ obligatoire';
    if (ctrl.errors?.['min'])       return `Valeur minimale : ${ctrl.errors['min'].min}`;
    if (ctrl.errors?.['max'])       return `Valeur maximale : ${ctrl.errors['max'].max}`;
    if (ctrl.errors?.['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} caractères`;
    if (ctrl.errors?.['maxlength']) return `Maximum ${ctrl.errors['maxlength'].requiredLength} caractères`;
    return null;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const id = this.bienId();
    if (!id) return;

    this.saving.set(true);
    const v = this.form.value;

    const dto: BienUpdateDTO = {
      titre:        v.titre        ?? undefined,
      typeBien:     v.typeBien     ?? undefined,
      // "" = effacement explicite côté backend · null = inchangé
      description:  v.description  !== null ? v.description : undefined,
      surfaceHabitable:  v.surfaceHabitable  != null ? Number(v.surfaceHabitable)  : undefined,
      nombrePieces:      v.nombrePieces      != null ? Number(v.nombrePieces)      : undefined,
      nombreChambres:    v.nombreChambres    != null ? Number(v.nombreChambres)    : undefined,
      etage:             v.etage             != null ? Number(v.etage)             : undefined,
      ascenseur:         v.ascenseur         ?? undefined,
      anneeConstruction: v.anneeConstruction != null ? Number(v.anneeConstruction) : undefined,
      modeChauffage: v.modeChauffage ?? undefined,
      classeEnergie: v.classeEnergie ?? undefined,
      classeGes:     v.classeGes     ?? undefined,
      loyerMensuel:      v.loyerMensuel      != null ? Number(v.loyerMensuel)      : undefined,
      chargesMensuelles: v.chargesMensuelles != null ? Number(v.chargesMensuelles) : undefined,
      depotGarantie:     v.depotGarantie     != null ? Number(v.depotGarantie)     : undefined,
      meuble:    v.meuble    ?? undefined,
      colocation: v.colocation ?? undefined,
      disponibleDe: v.disponibleDe ?? undefined,
    };

    this.bienService.update(id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Bien mis à jour avec succès !');
        this.router.navigate(['/proprietaire/biens']);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Une erreur est survenue lors de la mise à jour.');
      },
    });
  }
}
