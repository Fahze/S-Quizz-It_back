import { Question } from '~~/types/common.types';

export interface SalonState {
  joueurs: Map<
    string,
    {
      userId: string;
      profile: { 
        id: number; 
        pseudo: string; 
        avatar: {
          idAvatar: number; 
          urlavatar: string;
        }; 
        elo: number 
      };
      score: number;
      connected: boolean;
      isReady: boolean;
      finished: boolean;
      questionIndex?: number;
    }
  >;
  partieCommencee: boolean;
  questions: Question[];
  currentQuestionIndex: number;
}

export const salonsEnCours = new Map<number, SalonState>();
