class GameService {

    
  async startGame(peer, salonId) {
    const supabase = await useSupabase();

    if (isNaN(salonId)) {
      return peer.send({ user: 'server', type: 'error', message: 'ID invalide pour démarrer le jeu' });
    }

    // Vérifier si le salon existe
    const { data: salon, error: fetchError } = await supabase.from('salon').select('*').eq('id', salonId).single();
    if (fetchError || !salon) {
      return peer.send({user: "server", type: 'error', message: 'Salon introuvable' });
    }

    // Vérifier si le salon est plein
    if (salon.j_actuelle < salon.j_max) {
      return peer.send({user: "server", type: 'error', message: "Le salon n'est pas plein" });
    }

    // Logique pour démarrer le jeu
    // ...

    peer.publish(`salon-${salonId}`, { type: 'game_start', salonId});
    peer.send({user: "server", type: 'success', message: `Le jeu a commencé dans le salon ${salon.label}` });
  }
}

export default new GameService();
