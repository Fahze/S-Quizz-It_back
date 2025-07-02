export interface Question {
  id: number;
  label: string;
  niveauDifficulte: number;
  type: string;
  reponses: { id: number; label: string }[];
}

export interface AnswerResult {
  idJoueur: number;
  correcte: boolean;
  fautesOrthographe: boolean;
  distanceLevenshtein: number;
  malus: number;
  tempsReponse: number;
  pointsGagnes: number;
  bonneReponse: string | null;
}

export interface JoueurClassement {
  idJoueur: number;
  pseudo: string;
  totalPoints: number;
}

export type SalonType = 'normal' | 'rapide' | 'solo';

export interface CreateSalonParams {
  label: string;
  difficulte: number;
  type: SalonType;
  j_max: number;
}

export interface SalonData {
  id: number;
  label: string;
  difficulte: number;
  type: SalonType;
  j_max: number;
  j_actuelle: number;
  commence: boolean;
  created_at?: string;
}
