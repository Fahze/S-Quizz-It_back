export interface SalonState {
  joueurs: Map<string, { userId: string; score: number; connected: boolean }>;
  partieCommencee: boolean;
  absents: string[];
}
