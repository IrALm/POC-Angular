import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BienService } from '../../../core/services/bien.service';
import { ToastService } from '../../../core/services/toast.service';
import { TypeBien, ModeChauffage, ClasseEnergie, ClasseGes } from '../../../core/models/bien.models';

@Component({
  selector: 'app-bien-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './bien-form.html',
})
export class BienFormComponent {
  private readonly bienService = inject(BienService);
  private readonly toast       = inject(ToastService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly loading       = signal(false);
  readonly error         = signal<string | null>(null);
  readonly imagePreviews = signal<string[]>([]);
  private imageFiles: File[] = [];

  readonly form = this.fb.group({
    typeBien:          ['APPARTEMENT' as TypeBien, Validators.required],
    titre:             ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
    description:       ['', [Validators.required, Validators.minLength(20)]],
    adresse:           ['', Validators.required],
    ville:             ['', Validators.required],
    codePostal:        ['', Validators.required],
    pays:              ['France', Validators.required],
    surfaceHabitable:  [null as number | null, [Validators.required, Validators.min(5)]],
    nombrePieces:      [null as number | null, [Validators.required, Validators.min(1)]],
    nombreChambres:    [null as number | null, [Validators.required, Validators.min(0)]],
    etage:             [null as number | null],
    ascenseur:         [false],
    anneeConstruction: [null as number | null],
    modeChauffage:     ['ELECTRIQUE' as ModeChauffage, Validators.required],
    classeEnergie:     ['D' as ClasseEnergie, Validators.required],
    classeGes:         ['D' as ClasseGes, Validators.required],
    loyerMensuel:      [null as number | null, [Validators.required, Validators.min(1)]],
    chargesMensuelles: [null as number | null, [Validators.required, Validators.min(0)]],
    depotGarantie:     [null as number | null, [Validators.required, Validators.min(0)]],
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

  get selectedType(): TypeBien { return this.form.get('typeBien')?.value as TypeBien; }
  get selectedEnergie(): string { return this.form.get('classeEnergie')?.value ?? 'D'; }
  get selectedGes(): string     { return this.form.get('classeGes')?.value ?? 'D'; }

  setType(type: TypeBien)          { this.form.patchValue({ typeBien: type }); }
  setChauffage(v: ModeChauffage)   { this.form.patchValue({ modeChauffage: v }); }
  setEnergie(c: ClasseEnergie)     { this.form.patchValue({ classeEnergie: c }); }
  setGes(c: ClasseGes)             { this.form.patchValue({ classeGes: c }); }
  toggleAscenseur()                { this.form.patchValue({ ascenseur: !this.form.get('ascenseur')?.value }); }
  toggleMeuble()                   { this.form.patchValue({ meuble: !this.form.get('meuble')?.value }); }
  toggleColocation()               { this.form.patchValue({ colocation: !this.form.get('colocation')?.value }); }

  onImagesChange(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    files.forEach(file => {
      this.imageFiles.push(file);
      const reader = new FileReader();
      reader.onload = () => this.imagePreviews.update(p => [...p, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number) {
    this.imageFiles.splice(index, 1);
    this.imagePreviews.update(p => p.filter((_, i) => i !== index));
  }

  fieldError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl?.invalid || !ctrl.touched) return null;
    if (ctrl.errors?.['required'])   return 'Champ obligatoire';
    if (ctrl.errors?.['min'])        return `Valeur minimale : ${ctrl.errors['min'].min}`;
    if (ctrl.errors?.['minlength'])  return `Minimum ${ctrl.errors['minlength'].requiredLength} caractères`;
    if (ctrl.errors?.['maxlength'])  return `Maximum ${ctrl.errors['maxlength'].requiredLength} caractères`;
    return null;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const v = this.form.value;
    const dto = {
      typeBien:          v.typeBien,
      titre:             v.titre,
      description:       v.description,
      adresse:           v.adresse,
      ville:             v.ville,
      codePostal:        v.codePostal,
      pays:              v.pays,
      surfaceHabitable:  Number(v.surfaceHabitable),
      nombrePieces:      Number(v.nombrePieces),
      nombreChambres:    Number(v.nombreChambres),
      etage:             v.etage != null ? Number(v.etage) : null,
      ascenseur:         v.ascenseur,
      anneeConstruction: v.anneeConstruction != null ? Number(v.anneeConstruction) : null,
      modeChauffage:     v.modeChauffage,
      classeEnergie:     v.classeEnergie,
      classeGes:         v.classeGes,
      loyerMensuel:      Number(v.loyerMensuel),
      chargesMensuelles: Number(v.chargesMensuelles),
      depotGarantie:     Number(v.depotGarantie),
      meuble:            v.meuble,
      colocation:        v.colocation,
      disponibleDe:      v.disponibleDe || null,
    };

    const formData = new FormData();
    formData.append('bienFormDTO', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    this.imageFiles.forEach(f => formData.append('files', f));

    this.bienService.create(formData).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Bien créé avec succès !');
        this.router.navigate(['/proprietaire/biens']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Une erreur est survenue lors de la création.');
      },
    });
  }
}
