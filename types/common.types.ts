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
