export type StatutQuittance = 'EN_ATTENTE' | 'PAYEE' | 'EN_RETARD' | 'IMPAYEE';

export interface QuittanceDTO {
  id: number;
  mois: string;
  annee: number;
  moisLabel: string;
  loyerMensuel: number;
  chargesMensuelles: number;
  montantTotal: number;
  dateEcheance: string;
  datePaiement: string | null;
  statut: StatutQuittance;
  urlPdf: string | null;
  nomProprietaire: string;
  emailProprietaire: string;
  nomLocataire: string;
  emailLocataire: string;
  adresseBien: string;
  typeBien: string;
  surfaceHabitable: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuittanceFormDTO {
  bienId: number;
  emailLocataire: string;
  contratId?: number | null;
  mois: string;
  annee: number;
  loyerMensuel?: number;
  chargesMensuelles?: number;
  dateEcheance: string;
}

export interface QuittanceSearchDTO {
  annee?: number;
  mois?: string;
  statut?: StatutQuittance;
  bienId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface QuittancePageDTO {
  contenu: QuittanceDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
