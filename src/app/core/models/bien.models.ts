import { UserDTO } from './user.models';

export type TypeBien = 'APPARTEMENT' | 'MAISON' | 'STUDIO' ;
export type ModeChauffage = 'ELECTRIQUE' | 'GAZ' | 'FIOUL' | 'BOIS' | 'POMPE_A_CHALEUR' | 'POELE' | 'COLLECTIF' | 'SANS_CHAUFFAGE';
export type ClasseEnergie = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type ClasseGes = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type PoiType = 'SCHOOL' | 'HOSPITAL' | 'PHARMACY' | 'KINDERGARTEN';

export interface BienDTO {
  id: number;
  titre: string;
  typeBien: TypeBien;
  description: string;
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
  latitude: number | null;
  longitude: number | null;
  surfaceHabitable: number;
  nombrePieces: number;
  nombreChambres: number;
  etage: number | null;
  ascenseur: boolean;
  anneeConstruction: number | null;
  modeChauffage: ModeChauffage;
  classeEnergie: ClasseEnergie;
  classeGes: ClasseGes;
  loyerMensuel: number;
  chargesMensuelles: number;
  depotGarantie: number;
  meuble: boolean;
  colocation: boolean;
  disponibleDe: string | null;
  proprietaire: UserDTO | null;
  locataire: UserDTO | null;
  images: string[];
  documents: string[];
  pois?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BienFormDTO {
  titre: string;
  typeBien: TypeBien;
  description: string;
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
  surfaceHabitable: number;
  nombrePieces: number;
  nombreChambres: number;
  etage?: number;
  ascenseur: boolean;
  anneeConstruction?: number;
  modeChauffage: ModeChauffage;
  classeEnergie: ClasseEnergie;
  classeGes: ClasseGes;
  loyerMensuel: number;
  chargesMensuelles: number;
  depotGarantie: number;
  meuble: boolean;
  colocation: boolean;
  disponibleDe?: string;
}

export interface BienSearchDTO {
  villes?: string[];
  typesBien?: TypeBien[];
  titre?: string;
  loyerMin?: number;
  loyerMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  piecesMin?: number;
  ascenseur?: boolean;
  meuble?: boolean;
  colocation?: boolean;
  disponibleAvant?: string;
  classesEnergie?: ClasseEnergie[];
  classesGes?: ClasseGes[];
  modesChauffage?: ModeChauffage[];
  poisRequis?: PoiType[];
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface BienUpdateDTO {
  titre?: string;
  typeBien?: TypeBien;
  description?: string | null;
  surfaceHabitable?: number;
  nombrePieces?: number;
  nombreChambres?: number;
  etage?: number;
  ascenseur?: boolean;
  anneeConstruction?: number;
  modeChauffage?: ModeChauffage;
  classeEnergie?: ClasseEnergie;
  classeGes?: ClasseGes;
  loyerMensuel?: number;
  chargesMensuelles?: number;
  depotGarantie?: number;
  meuble?: boolean;
  colocation?: boolean;
  disponibleDe?: string;
}

export interface BienPageDTO {
  contenu: BienDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
