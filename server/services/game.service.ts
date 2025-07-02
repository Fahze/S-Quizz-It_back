import { clearSalonState, getSalonState, saveSalonState } from '~/utils/websockets.utils';
import questionService from './question.service';
import { AnswerResult, JoueurClassement } from '~~/types/common.types';

class GameService {
  private validateGameState(peer: any, salonId: number, requireGameStarted = false) {
    const salonMemoire = getSalonState(salonId);

    if (!salonMemoire) {
      peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
      return null;
    }

    if (!salonMemoire.joueurs.has(peer.id)) {
      peer.send({ user: 'server', type: 'error', message: "Vous n'êtes pas dans ce salon" });
      return null;
    }

    if (requireGameStarted && !salonMemoire.partieCommencee) {
      peer.send({ user: 'server', type: 'error', message: "La partie n'a pas commencé" });
      return null;
    }

    return salonMemoire;
  }

  private publishToSalon(peer: any, salonId: number, type: string, message: string, additionalData = {}) {
    const payload = {
      user: `salon-${salonId}`,
      type,
      salonId,
      message,
      ...additionalData,
    };

    peer.publish(`salon-${salonId}`, JSON.stringify(payload));
    peer.send(payload);
  }

  private areAllPlayersReady(salonMemoire: any): boolean {
    return Array.from(salonMemoire.joueurs.values()).every((joueur: any) => joueur.isReady);
  }

  private haveAllPlayersAnswered(salonMemoire: any): boolean {
    return Array.from(salonMemoire.joueurs.values()).every((joueur: any) => (joueur.questionIndex || 0) === salonMemoire.currentQuestionIndex + 1);
  }

  private async startGameCountdown(peer: any, salonId: number, salonMemoire: any): Promise<void> {
    let timer = 3;

    const startTimer = setInterval(() => {
      this.publishToSalon(peer, salonId, 'game_countdown', `Le jeu commence dans ${timer} secondes !`);

      timer--;

      if (timer <= 0) {
        clearInterval(startTimer);

        salonMemoire.partieCommencee = true;
        saveSalonState(salonId, salonMemoire);

        peer.publish(
          `salon-${salonId}`,
          JSON.stringify({
            user: `salon-${salonId}`,
            type: 'game-start',
            salonId,
            message: salonMemoire,
          })
        );
      }
    }, 1000);
  }

  async handleReady(peer: any, salonId: number): Promise<void> {
    const salonMemoire = this.validateGameState(peer, salonId);
    if (!salonMemoire) return;

    const joueur = salonMemoire.joueurs.get(peer.id);
    joueur.isReady = !joueur.isReady;

    salonMemoire.joueurs.set(peer.id, joueur);
    saveSalonState(salonId, salonMemoire);

    const readyStatus = joueur.isReady ? 'prêt' : 'pas prêt';
    this.publishToSalon(peer, salonId, 'ready', `${peer.id} est ${readyStatus}`);
  }

  async startGame(peer: any, salonId: number): Promise<void> {
    const salonMemoire = this.validateGameState(peer, salonId);
    if (!salonMemoire) return;

    if (!this.areAllPlayersReady(salonMemoire)) {
      peer.send({
        user: 'server',
        type: 'error',
        message: 'Tous les joueurs doivent être prêts pour démarrer le jeu',
      });
      return;
    }

    const supabase = await useSupabase();
    const { data: salon, error } = await supabase.from('salon').select('*').eq('id', salonId).single();

    if (error || !salon) {
      peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
      return;
    }

    try {
      const questions = await questionService.getQuestions(salon.difficulte);

      if (questions.length === 0) {
        peer.send({
          user: 'server',
          type: 'error',
          message: 'Aucune question disponible pour ce niveau de difficulté',
        });
        return;
      }

      salonMemoire.questions = questions;
      await supabase.from('salon').update({ commence: true }).eq('id', salonId);
      await this.startGameCountdown(peer, salonId, salonMemoire);
    } catch (error: any) {
      console.error(`Erreur lors de la récupération des questions: ${error.message}`);
      peer.send({ user: 'server', type: 'error', message: 'Erreur interne du serveur' });
    }
  }

  async answerQuestion(peer: any, salonId: number, questionId: number, tempsReponse: number, answerId?: number, answerText?: string): Promise<void> {
    const salonMemoire = this.validateGameState(peer, salonId, true);
    if (!salonMemoire) return;

    const question = questionService.getQuestionById(salonMemoire.questions, questionId);
    if (!question) {
      peer.send({ user: 'server', type: 'error', message: 'Question introuvable' });
      return;
    }

    const answerResult: AnswerResult = await questionService.checkAnswer({
      idQuestion: questionId,
      idReponse: answerId,
      idJoueur: peer.profile.id,
      tempsReponse,
      type: question.type,
      reponseJoueur: answerText,
    });

    // Update player state
    const joueur = salonMemoire.joueurs.get(peer.id);
    joueur.score += answerResult.pointsGagnes;
    joueur.questionIndex = (joueur.questionIndex || 0) + 1;
    salonMemoire.joueurs.set(peer.id, joueur);

    // Check if all players have answered current question
    if (this.haveAllPlayersAnswered(salonMemoire)) {
      if (salonMemoire.currentQuestionIndex >= salonMemoire.questions.length - 1) {
        // Game finished
        this.markAllPlayersFinished(salonMemoire);
        saveSalonState(salonId, salonMemoire);
        await this.endGame(peer, salonId);
        return;
      }

      // Move to next question
      salonMemoire.currentQuestionIndex++;
      this.publishToSalon(peer, salonId, 'next_question', 'Question suivante', { questionIndex: salonMemoire.currentQuestionIndex });
    }

    saveSalonState(salonId, salonMemoire);

    peer.send({
      user: `salon-${salonId}`,
      type: 'answer_result',
      salonId,
      questionId,
      correct: answerResult.correcte,
      pointsGagnes: answerResult.pointsGagnes,
    });
  }

  private markAllPlayersFinished(salonMemoire: any): void {
    salonMemoire.joueurs.forEach((joueur: any, playerId: string) => {
      joueur.finished = true;
      salonMemoire.joueurs.set(playerId, joueur);
    });
  }

  async endGame(peer: any, salonId: number): Promise<void> {
    const salonMemoire = this.validateGameState(peer, salonId);
    if (!salonMemoire) return;

    const joueurs: JoueurClassement[] = Array.from(salonMemoire.joueurs.values()).map((joueur: any) => ({
      idJoueur: Number(joueur.profile.id),
      pseudo: joueur.profile.pseudo,
      totalPoints: joueur.score,
    }));

    const classement = questionService.getClassement(joueurs);

    this.publishToSalon(peer, salonId, 'game_end', 'Fin de partie', { classement });

    // Clean up after 1 minute
    setTimeout(async () => {
      clearSalonState(salonId);

      const supabase = await useSupabase();
      const { error } = await supabase.from('salon').delete().eq('id', salonId);

      if (error) {
        console.error(`Erreur lors de la suppression du salon ${salonId}: ${error.message}`);
      }
    }, 60000);
  }
}

export default new GameService();
