import { Question } from "~~/types/common.types";

export interface SalonState {
  joueurs: Map<string, { userId: string; score: number; connected: boolean; isReady: boolean }>;
  partieCommencee: boolean;
  questions: Question[];
}

export const salonsEnCours = new Map<number, SalonState>();
