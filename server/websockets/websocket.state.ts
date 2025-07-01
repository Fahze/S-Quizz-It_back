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

export interface SalonState {
  joueurs: Map<string, { userId: string; score: number; connected: boolean; isReady: boolean }>;
  partieCommencee: boolean;
  questions: Question[];
}

export const salonsEnCours = new Map<number, SalonState>();
