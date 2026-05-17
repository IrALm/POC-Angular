import { UserDTO } from './user.models';

export type StatutContrat =
  | 'BROUILLON'
  | 'EN_ATTENTE_SIGNATURE_PROPRIO'
  | 'EN_ATTENTE_SIGNATURE_LOCATAIRE'
  | 'SIGNE'
  | 'EXPIRE'
  | 'ANNULE';

export interface ContratDTO {
  id: number;
  bienId: number;
  adresseBien: string;
  proprietaire: UserDTO;
  locataire: UserDTO;
  loyerMensuel: number;
  chargesMensuelles: number;
  depotGarantie: number;
  dateDebut: string;
  dateFin: string | null;
  dureeBailMois: number;
  proprietaireASigné: boolean | null;
  locataireASigné: boolean | null;
  urlPdf: string | null;
  statut: StatutContrat;
  dateSignatureProprietaire: string | null;
  dateSignatureLocataire: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContratFormDTO {
  bienId: number;
  emailLocataire: string;
  dateDebut: string;
  dateFin?: string | null;
  dureeBailMois: number;
  loyerMensuel: number;
  chargesMensuelles: number;
  depotGarantie: number;
}

export interface SignatureDTO {
  signatureBase64: string;
}

export interface ContratSearchDTO {
  bienId?: number;
  statut?: StatutContrat;
  loyerMin?: number;
  loyerMax?: number;
  dateDebutApres?: string;
  dateDebutAvant?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface ContratPageDTO {
  contenu: ContratDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
