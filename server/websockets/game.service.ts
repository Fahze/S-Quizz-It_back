import questionService from './question.service';

class GameService {
  async startGame(peer, salonId) {
    const supabase = await useSupabase();

    if (isNaN(salonId)) {
      return peer.send({ user: 'server', type: 'error', message: 'ID invalide pour démarrer le jeu' });
    }
    // Vérifier si le salon existe
    const { data: salon, error: fetchError } = await supabase.from('salon').select('*').eq('id', salonId).single();
    if (fetchError || !salon) {
      return peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
    }

    const salonMemoire = getOrCreateSalon(salonId);

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
      if (timer <= 0) {
        clearInterval(startTimer);
        peer.publish(`salon-${salonId}`, JSON.stringify({ user: `salon-${salonId}`, type: 'game-start', salonId, message: salonMemoire }));
        peer.send({ user: 'server', type: 'success', message: `Le jeu a commencé dans le salon ${salon.label}` });
        return;
      }
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
    }, 1000);
  }

  async answerQuestion(peer, salonId, questionId, answer) {
    const salonMemoire = getOrCreateSalon(salonId);
    //TODO: Implement logic to check the answer against the question
  }

  //TODO: Implement game logic methods like answerQuestion, endGame, etc.
}

export default new GameService();
