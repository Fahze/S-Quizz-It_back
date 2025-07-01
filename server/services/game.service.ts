import { getSalonState, saveSalonState } from '~/utils/websockets.utils';
import questionService from './question.service';
import { AnswerResult } from '~~/types/common.types';

class GameService {
  async handleReady(peer, salonId) {
    const salonMemoire = getSalonState(salonId);
    if (!salonMemoire) {
      return peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
    }
    if (!salonMemoire.joueurs.has(peer.id)) {
      return peer.send({ user: 'server', type: 'error', message: "Vous n'êtes pas dans ce salon" });
    }

    const joueur = salonMemoire.joueurs.get(peer.id);
    joueur.isReady = !joueur.isReady; // Inverse l'état de readiness
    salonMemoire.joueurs.set(peer.id, joueur);
    saveSalonState(salonId, salonMemoire);
    peer.publish(
      `salon-${salonId}`,
      JSON.stringify({ user: `salon-${salonId}`, type: 'ready', salonId, message: `${peer.id} est ${joueur.isReady ? 'prêt' : 'pas prêt'}` })
    );
    peer.send({ user: `salon-${salonId}`, type: 'ready', salonId, message: `${peer.id} est ${joueur.isReady ? 'prêt' : 'pas prêt'}` });
  }

  async startGame(peer, salonId) {
    const supabase = await useSupabase();
    const salonMemoire = getSalonState(salonId);

    if (isNaN(salonId) || !salonMemoire) {
      return peer.send({ user: 'server', type: 'error', message: 'ID invalide pour démarrer le jeu' });
    }
    if (!Array.from(salonMemoire.joueurs.values()).every((j) => j.isReady)) {
      return peer.send({ user: 'server', type: 'error', message: 'Tous les joueurs doivent être prêts pour démarrer le jeu' });
    }
    // Vérifier si le salon existe
    const { data: salon, error: fetchError } = await supabase.from('salon').select('*').eq('id', salonId).single();
    if (fetchError || !salon) {
      return peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
    }

    await questionService
      .getQuestions(salon.difficulte)
      .then((questions) => {
        if (questions.length === 0) {
          return peer.send({ user: 'server', type: 'error', message: 'Aucune question disponible pour ce niveau de difficulté' });
        }
        salonMemoire.questions = questions;
      })
      .catch((error) => {
        console.error(`Erreur lors de la récupération des questions: ${error.message}`);
        return peer.send({ user: 'server', type: 'error', message: `Erreur interne du serveur` });
      });
    await supabase.from('salon').update({ commence: true }).eq('id', salonId);

    let timer = 3; // Démarre le compte à rebours à 3 secondes
    const startTimer = setInterval(() => {
      peer.publish(
        `salon-${salonId}`,
        JSON.stringify({
          user: `salon-${salonId}`,
          type: 'game_countdown',
          message: `Le jeu commence dans ${timer} secondes !`,
          salonId: salonId,
        })
      );
      timer--;

      if (timer <= 0) {
        clearInterval(startTimer);
        peer.publish(`salon-${salonId}`, JSON.stringify({ user: `salon-${salonId}`, type: 'game-start', salonId, message: salonMemoire }));
        peer.send({ user: 'server', type: 'success', message: `Le jeu a commencé dans le salon ${salon.label}` });
        salonMemoire.partieCommencee = true;
        saveSalonState(salonId, salonMemoire);
      }
    }, 1000);
  }

  async answerQuestion(peer, salonId, questionId, tempsReponse, answerId, answerText) {
    const salonMemoire = getSalonState(salonId);

    console.log(salonId, questionId, tempsReponse, answerId, answerText);
    if (!salonMemoire) {
      return peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
    }
    if (!salonMemoire.partieCommencee) {
      return peer.send({ user: 'server', type: 'error', message: "La partie n'a pas commencé" });
    }
    if (!salonMemoire.joueurs.has(peer.id)) {
      return peer.send({ user: 'server', type: 'error', message: "Vous n'êtes pas dans ce salon" });
    }
    const joueur = salonMemoire.joueurs.get(peer.id);

    const question = questionService.getQuestionById(salonMemoire.questions, questionId);
    if (!question) {
      return peer.send({ user: 'server', type: 'error', message: 'Question introuvable' });
    }

    const answerResult: AnswerResult = await questionService.checkAnswer({
      idQuestion: questionId,
      idReponse: answerId,
      idJoueur: peer.profile.id,
      tempsReponse: tempsReponse,
      type: question.type,
      reponseJoueur: answerText,
    });

    joueur.score += answerResult.pointsGagnes;
    joueur.questionIndex = (joueur.questionIndex || 0) + 1; // Incrémente l'index de question

    salonMemoire.joueurs.set(peer.id, joueur);

    if (Array.from(salonMemoire.joueurs.values()).every((j) => j.questionIndex === salonMemoire.currentQuestionIndex)) {
      if (salonMemoire.currentQuestionIndex >= salonMemoire.questions.length - 1) {
        // Si toutes les questions ont été posées, on initie la fin du jeu
        salonMemoire.joueurs.forEach((joueur) => {
          joueur.finished = true; // Marque le joueur comme ayant terminé
          salonMemoire.joueurs.set(joueur.userId, joueur);
        });
        saveSalonState(salonId, salonMemoire);

        this.endGame(peer, salonId);
        return;
      }
      salonMemoire.currentQuestionIndex++;

      peer.publish(
        `salon-${salonId}`,
        JSON.stringify({ user: `salon-${salonId}`, type: 'next_question', salonId, questionIndex: salonMemoire.currentQuestionIndex })
      );
      peer.send({
        user: `salon-${salonId}`,
        type: 'next_question',
        salonId,
        questionIndex: salonMemoire.currentQuestionIndex,
      });
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

  async endGame(peer, salonId) {
    const salonMemoire = getSalonState(salonId);
    if (!salonMemoire) {
      return peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
    }

    const joueurs = Array.from(salonMemoire.joueurs.values()).map((joueur) => {
      return {
        idJoueur: Number(joueur.profile.id),
        pseudo: peer.profile.pseudo, // Assuming peer.profile contains the player's profile
        totalPoints: joueur.score,
      };
    });

    const classement = questionService.getClassement(joueurs);

    peer.publish(`salon-${salonId}`, JSON.stringify({ user: `salon-${salonId}`, type: 'game_end', salonId, classement }));
    peer.send({ user: `salon-${salonId}`, type: 'game_end', salonId, classement });
  }
}

export default new GameService();
