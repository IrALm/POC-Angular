import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EdlService } from '../../../core/services/edl.service';
import { BienService } from '../../../core/services/bien.service';
import { ToastService } from '../../../core/services/toast.service';
import { BienDTO } from '../../../core/models/bien.models';
import { EtatElement, TypeCompteur, TypeElement } from '../../../core/models/edl.models';

@Component({
  selector: 'app-edl-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edl-form.html',
})
export class EdlFormComponent implements OnInit {
  private readonly edlService  = inject(EdlService);
  private readonly bienService = inject(BienService);
  private readonly toast       = inject(ToastService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);

  readonly loading      = signal(false);
  readonly error        = signal<string | null>(null);
  readonly biens        = signal<BienDTO[]>([]);
  readonly biensLoading = signal(true);
  readonly openPieces   = signal<Set<number>>(new Set([0]));

  readonly form = this.fb.group({
    bienId:           [null as number | null, Validators.required],
    emailLocataire:   ['', [Validators.required, Validators.email]],
    type:             ['ENTREE', Validators.required],
    dateRealisation:  ['', Validators.required],
    heureRealisation: [''],
    observations:     [''],
    pieces:           this.fb.array([this.createPiece('Salon', 0)]),
    compteurs:        this.fb.array([]),
    cles:             this.fb.array([this.createCle("Porte d'entrée")]),
  });

  // ── Enum options ───────────────────────────────────────────────────────────

  readonly typeElementOptions: { value: TypeElement; label: string }[] = [
    { value: 'SOL',       label: 'Sol' },
    { value: 'MUR',       label: 'Mur' },
    { value: 'PLAFOND',   label: 'Plafond' },
    { value: 'PORTE',     label: 'Porte' },
    { value: 'FENETRE',   label: 'Fenêtre' },
    { value: 'VOLET',     label: 'Volet' },
    { value: 'RADIATEUR', label: 'Radiateur' },
    { value: 'PRISE',     label: 'Prise élec.' },
    { value: 'LUMINAIRE', label: 'Luminaire' },
    { value: 'EQUIPEMENT',label: 'Équipement' },
    { value: 'AUTRE',     label: 'Autre' },
  ];

  readonly etatOptions: { value: EtatElement; label: string; color: string }[] = [
    { value: 'BON',          label: 'Bon',          color: 'bg-green-500 text-white' },
    { value: 'USAGE_NORMAL', label: 'Usage normal', color: 'bg-yellow-400 text-gray-900' },
    { value: 'MAUVAIS',      label: 'Mauvais',      color: 'bg-orange-500 text-white' },
    { value: 'HORS_SERVICE', label: 'Hors service', color: 'bg-red-600 text-white' },
  ];

  readonly compteurOptions: { value: TypeCompteur; label: string; unite: string }[] = [
    { value: 'ELECTRICITE_HP', label: 'Électricité HP', unite: 'kWh' },
    { value: 'ELECTRICITE_HC', label: 'Électricité HC', unite: 'kWh' },
    { value: 'EAU_FROIDE',     label: 'Eau froide',     unite: 'm³'  },
    { value: 'EAU_CHAUDE',     label: 'Eau chaude',     unite: 'm³'  },
    { value: 'GAZ',            label: 'Gaz',            unite: 'm³'  },
  ];

  readonly roomTemplates: { name: string; elements: { type: TypeElement; desc: string }[] }[] = [
    { name: 'Entrée',         elements: [
      { type: 'SOL', desc: '' }, { type: 'MUR', desc: '' }, { type: 'PLAFOND', desc: '' },
      { type: 'PORTE', desc: 'Porte d\'entrée' }, { type: 'LUMINAIRE', desc: '' }]},
    { name: 'Salon',          elements: [
      { type: 'SOL', desc: '' }, { type: 'MUR', desc: '' }, { type: 'PLAFOND', desc: '' },
      { type: 'FENETRE', desc: '' }, { type: 'VOLET', desc: '' },
      { type: 'RADIATEUR', desc: '' }, { type: 'PRISE', desc: '' }, { type: 'LUMINAIRE', desc: '' }]},
    { name: 'Chambre',        elements: [
      { type: 'SOL', desc: '' }, { type: 'MUR', desc: '' }, { type: 'PLAFOND', desc: '' },
      { type: 'FENETRE', desc: '' }, { type: 'VOLET', desc: '' },
      { type: 'RADIATEUR', desc: '' }, { type: 'PRISE', desc: '' }, { type: 'LUMINAIRE', desc: '' }]},
    { name: 'Cuisine',        elements: [
      { type: 'SOL', desc: '' }, { type: 'MUR', desc: '' }, { type: 'PLAFOND', desc: '' },
      { type: 'FENETRE', desc: '' }, { type: 'EQUIPEMENT', desc: '' }, { type: 'LUMINAIRE', desc: '' }]},
    { name: 'Salle de bain',  elements: [
      { type: 'SOL', desc: '' }, { type: 'MUR', desc: '' }, { type: 'PLAFOND', desc: '' },
      { type: 'FENETRE', desc: '' }, { type: 'EQUIPEMENT', desc: '' }, { type: 'LUMINAIRE', desc: '' }]},
    { name: 'WC',             elements: [
      { type: 'SOL', desc: '' }, { type: 'MUR', desc: '' }, { type: 'PLAFOND', desc: '' },
      { type: 'EQUIPEMENT', desc: 'WC' }, { type: 'LUMINAIRE', desc: '' }]},
    { name: 'Couloir',        elements: [
      { type: 'SOL', desc: '' }, { type: 'MUR', desc: '' }, { type: 'PLAFOND', desc: '' }, { type: 'LUMINAIRE', desc: '' }]},
  ];

  // ── FormArray accessors ────────────────────────────────────────────────────

  get piecesArray(): FormArray  { return this.form.get('pieces') as FormArray; }
  get compteursArray(): FormArray { return this.form.get('compteurs') as FormArray; }
  get clesArray(): FormArray    { return this.form.get('cles') as FormArray; }

  getElementsArray(i: number): FormArray {
    return this.piecesArray.at(i).get('elements') as FormArray;
  }

  // ── Factory methods ────────────────────────────────────────────────────────

  private createPiece(name = '', ordre = 0): FormGroup {
    return this.fb.group({
      nomPiece:     [name, Validators.required],
      ordre:        [ordre],
      observations: [''],
      elements:     this.fb.array([this.createElement()]),
    });
  }

  private createElement(type: TypeElement = 'SOL'): FormGroup {
    return this.fb.group({
      typeElement:  [type, Validators.required],
      etatElement:  ['BON', Validators.required],
      description:  [''],
      observation:  [''],
    });
  }

  private createCompteur(type: TypeCompteur = 'ELECTRICITE_HP', unite = 'kWh'): FormGroup {
    return this.fb.group({
      typeCompteur:   [type, Validators.required],
      numeroCompteur: [''],
      index:          [null as number | null, Validators.required],
      unite:          [unite],
    });
  }

  private createCle(typeCle = ''): FormGroup {
    return this.fb.group({
      typeCle:  [typeCle, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
    });
  }

  // ── Piece management ───────────────────────────────────────────────────────

  addPieceFromTemplate(tpl: { name: string; elements: { type: TypeElement; desc: string }[] }) {
    const pieceGroup = this.fb.group({
      nomPiece:     [tpl.name, Validators.required],
      ordre:        [this.piecesArray.length + 1],
      observations: [''],
      elements:     this.fb.array(tpl.elements.map(e => this.createElement(e.type))),
    });
    this.piecesArray.push(pieceGroup);
    this.openPieces.update(s => new Set([...s, this.piecesArray.length - 1]));
  }

  addCustomPiece() {
    this.piecesArray.push(this.createPiece('', this.piecesArray.length));
    const newIdx = this.piecesArray.length - 1;
    this.openPieces.update(s => new Set([...s, newIdx]));
  }

  removePiece(i: number) {
    this.piecesArray.removeAt(i);
    this.openPieces.update(s => { const n = new Set(s); n.delete(i); return n; });
  }

  togglePiece(i: number) {
    this.openPieces.update(s => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }

  isPieceOpen(i: number): boolean { return this.openPieces().has(i); }

  // ── Element management ─────────────────────────────────────────────────────

  addElement(pieceIdx: number) {
    this.getElementsArray(pieceIdx).push(this.createElement());
  }

  removeElement(pieceIdx: number, elIdx: number) {
    this.getElementsArray(pieceIdx).removeAt(elIdx);
  }

  setEtatElement(pieceIdx: number, elIdx: number, etat: EtatElement) {
    this.getElementsArray(pieceIdx).at(elIdx).patchValue({ etatElement: etat });
  }

  // ── Compteur management ────────────────────────────────────────────────────

  addCompteur() {
    this.compteursArray.push(this.createCompteur());
  }

  removeCompteur(i: number) { this.compteursArray.removeAt(i); }

  onCompteurTypeChange(i: number, event: Event) {
    const type = (event.target as HTMLSelectElement).value as TypeCompteur;
    const unite = this.compteurOptions.find(o => o.value === type)?.unite ?? '';
    this.compteursArray.at(i).patchValue({ typeCompteur: type, unite });
  }

  // ── Cle management ─────────────────────────────────────────────────────────

  addCle() { this.clesArray.push(this.createCle()); }
  removeCle(i: number) { this.clesArray.removeAt(i); }

  // ── Bien select ────────────────────────────────────────────────────────────

  ngOnInit() {
    this.bienService.getMesBiens().subscribe({
      next: list => { this.biens.set(list); this.biensLoading.set(false); },
      error: () => this.biensLoading.set(false),
    });
  }

  onBienChange(event: Event) {
    const id = Number((event.target as HTMLSelectElement).value);
    const bien = this.biens().find(b => b.id === id);
    if (bien) {
      this.form.patchValue({
        bienId: bien.id,
        emailLocataire: bien.locataire?.mail ?? '',
      });
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const v = this.form.value;

    this.edlService.create({
      bienId:           Number(v.bienId),
      emailLocataire:   v.emailLocataire!,
      type:             v.type as any,
      dateRealisation:  v.dateRealisation!,
      heureRealisation: v.heureRealisation || undefined,
      observations:     v.observations || undefined,
      pieces: (v.pieces ?? []).map((p: any, idx: number) => ({
        nomPiece:     p.nomPiece,
        ordre:        idx + 1,
        observations: p.observations || undefined,
        elements: (p.elements ?? []).map((e: any) => ({
          typeElement:  e.typeElement,
          etatElement:  e.etatElement,
          description:  e.description || '',
          observation:  e.observation || undefined,
        })),
      })),
      compteurs: (v.compteurs ?? []).map((c: any) => ({
        typeCompteur:   c.typeCompteur,
        numeroCompteur: c.numeroCompteur || '',
        index:          Number(c.index),
        unite:          c.unite || '',
      })),
      cles: (v.cles ?? []).map((cl: any) => ({
        typeCle:  cl.typeCle,
        quantite: Number(cl.quantite),
      })),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('État des lieux créé ! Signez-le depuis la liste.');
        this.router.navigate(['/proprietaire/etats-des-lieux']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  fieldError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl?.invalid || !ctrl.touched) return null;
    if (ctrl.errors?.['required']) return 'Champ obligatoire';
    if (ctrl.errors?.['email'])    return 'Email invalide';
    return null;
  }
}
