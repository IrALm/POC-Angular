export type TypeEtat     = 'ENTREE' | 'SORTIE';
export type StatutEdl    = 'BROUILLON' | 'EN_ATTENTE_SIGNATURE_PROPRIO' | 'EN_ATTENTE_SIGNATURE_LOCATAIRE' | 'SIGNE' | 'EXPIRE';
export type TypeElement  = 'MUR' | 'PLAFOND' | 'SOL' | 'FENETRE' | 'PORTE' | 'VOLET' | 'PRISE' | 'LUMINAIRE' | 'RADIATEUR' | 'EQUIPEMENT' | 'AUTRE';
export type EtatElement  = 'BON' | 'USAGE_NORMAL' | 'MAUVAIS' | 'HORS_SERVICE';
export type TypeCompteur = 'EAU_FROIDE' | 'EAU_CHAUDE' | 'ELECTRICITE_HP' | 'ELECTRICITE_HC' | 'GAZ';

// ── Form DTOs ─────────────────────────────────────────────────────────────────

export interface ElementEdlFormDTO {
  typeElement: TypeElement;
  etatElement: EtatElement;
  description: string;
  observation?: string;
}

export interface PieceEdlFormDTO {
  nomPiece: string;
  ordre: number;
  observations?: string;
  elements: ElementEdlFormDTO[];
}

export interface CompteurReleveFormDTO {
  typeCompteur: TypeCompteur;
  numeroCompteur: string;
  index: number;
  unite: string;
}

export interface CleRemiseFormDTO {
  typeCle: string;
  quantite: number;
}

export interface EtatDesLieuxFormDTO {
  bienId: number;
  emailLocataire: string;
  type: TypeEtat;
  dateRealisation: string;
  heureRealisation?: string;
  observations?: string;
  compteurs: CompteurReleveFormDTO[];
  cles: CleRemiseFormDTO[];
  pieces: PieceEdlFormDTO[];
}

// ── Read DTOs ─────────────────────────────────────────────────────────────────

export interface ElementEdlDTO {
  id: number;
  typeElement: TypeElement;
  etatElement: EtatElement;
  description: string;
  observation: string | null;
}

export interface PieceEdlDTO {
  id: number;
  nomPiece: string;
  ordre: number;
  observations: string | null;
  elements: ElementEdlDTO[];
}

export interface CompteurReleveDTO {
  id: number;
  typeCompteur: TypeCompteur;
  numeroCompteur: string;
  index: number;
  unite: string;
}

export interface CleRemiseDTO {
  id: number;
  typeCle: string;
  quantite: number;
}

export interface EtatDesLieuxDTO {
  id: number;
  type: TypeEtat;
  statut: StatutEdl;
  dateRealisation: string;
  heureRealisation: string | null;
  observations: string | null;
  urlPdf: string | null;
  dateSignatureProprietaire: string | null;
  dateSignatureLocataire: string | null;
  nomProprietaire: string;
  emailProprietaire: string;
  nomLocataire: string;
  emailLocataire: string;
  adresseBien: string;
  typeBien: string;
  pieces: PieceEdlDTO[];
  compteurs: CompteurReleveDTO[];
  cles: CleRemiseDTO[];
}

export interface EdlSearchDTO {
  bienId?: number;
  type?: TypeEtat;
  statut?: StatutEdl;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface EdlPageDTO {
  contenu: EtatDesLieuxDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
