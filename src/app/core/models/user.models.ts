export type Role = 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE' | 'ROLE_ADMIN';

export interface UserDTO {
  id: number;
  firstName: string;
  lastName: string;
  mail: string;
  role: Role;
  urlProfile: string | null;
  hasCompleteProfil: boolean;
}

export interface UserFormDTO {
  firstName: string;
  lastName: string;
  mail: string;
  password: string;
  role: Role;
}

export interface LocataireSearchDTO {
  nom?: string;
  prenom?: string;
  email?: string;
  page?: number;
  size?: number;
}

export interface LocatairePageDTO {
  contenu: UserDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
