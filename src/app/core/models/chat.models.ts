export interface ConversationDTO {
  id: number;
  bienId: number;
  bienTitre: string | null;
  emailExpediteur: string;
  emailDestinataire: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  nonLuCount: number;
}

export interface ConversationPageDTO {
  contenu: ConversationDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}

export interface ConversationSearchDTO {
  nomDuBien?: string | null;
  lu?: boolean | null;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface MessageDTO {
  id: number;
  contenu: string;
  lu: boolean;
  createdAt: string | null;
  expediteurId: number;
  expediteurNom: string;
  expediteurEmail: string;
  destinataireId: number;
  destinataireNom: string;
  destinataireEmail: string;
  bienId: number;
  bienAdresse: string;
  conversationId?: number;
}

export interface NotificationDTO {
  conversationId: number;
  expediteurEmail: string;
  expediteurNom: string;
  contenuPreview: string;
  createdAt: string | null;
}

export interface ChatMessage {
  type: 'message' | 'separator';
  id?: number;
  contenu?: string;
  direction?: 'outgoing' | 'incoming';
  time?: string;
  isNew?: boolean;
  label?: string;
}
