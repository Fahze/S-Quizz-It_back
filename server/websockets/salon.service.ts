class SalonService {
  // Utilitaire pour générer un label aléatoire
  genLabel(label: string): string {
    return label + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  // Diffuse à tous les clients la liste actuelle des salons
  async broadcastSalons(peer, topic) {
    const supabase = await useSupabase();

    const { data: salons, error } = await supabase.from('salon').select('*');
    const payload = error ? { type: 'error', message: error.message } : { type: 'salons_init', salons };

    peer.publish(topic, JSON.stringify(payload));
  }

  async createSalon(peer, { label, difficulte, type, j_max }) {
    const supabase = await useSupabase();
    if (!peer || !label) {
      throw new Error('Peer and label are required to create a salon');
    }
    const newSalon = {
      label: this.genLabel(label),
      difficulte: difficulte ?? 1,
      type: type ?? 'rapide',
      j_max: j_max ?? 4,
    };
    const { error: insertError } = await supabase.from('salon').insert(newSalon);

    if (insertError) {
      peer.send({ type: 'error', message: insertError.message });
    } else {
      await this.broadcastSalons(peer, 'chat');
    }
  }

  async deleteSalon(peer, salonId: number) {
    const supabase = await useSupabase();

    if (isNaN(salonId)) {
      return peer.send({ type: 'error', message: 'ID invalide pour deletion' });
    }

    const { error: deleteError } = await supabase.from('salon').delete().eq('id', salonId);

    if (deleteError) {
      peer.send({ type: 'error', message: deleteError.message });
    } else {
      await this.broadcastSalons(peer, 'chat');
    }
  }

  async playerJoinSalon(peer, salonId: number) {
    const supabase = await useSupabase();
    if (isNaN(salonId)) {
      return peer.send({ type: 'error', message: 'ID invalide pour rejoindre le salon' });
    }

    // Vérifier si le salon existe
    const { data: salon, error: fetchError, status, statusText } = await supabase.from('salon').select('*').eq('id', salonId).single();
    if (fetchError || !salon) {
      return peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
    }
    // Vérifier si le salon à commencé une partie
    if (salon.commence) {
      return peer.send({ user: 'server', type: 'error', message: 'Le salon a déjà commencé une partie' });
    }
    // Vérifier si le salon est plein
    if (salon.j_actuelle == salon.j_max) {
      return peer.send({ user: 'server', type: 'error', message: 'Salon plein' });
    }
    peer.send({ user: 'system', message: status + ' ' + statusText });

    // Incrémenter le nombre de joueurs actuels
    const { error: updateError } = await supabase
      .from('salon')
      .update({ j_actuelle: salon.j_actuelle + 1 })
      .eq('id', salonId);

    if (updateError) {
      return peer.send({ user: 'server', type: 'error', message: updateError.message });
    }

    // Envoyer un message de succès

    peer.subscribe(`salon-${salonId}`);
    peer.unsubscribe('salons');

    peer.publish(`salon-${salonId}`, { type: 'join', salonId, user: peer.id });
    peer.publish(`salon-${salonId}`, { user: `salon-${salonId}`, message: `${peer.id} a rejoint le salon` });
    peer.send({ user: 'server', type: 'success', message: `Vous avez rejoint le salon ${salon.label}` });
  }

  async playerLeaveSalon(peer, salonId: number) {
    const supabase = await useSupabase();
    if (isNaN(salonId)) {
      return peer.send({ user: 'server', type: 'error', message: 'ID invalide pour quitter le salon' });
    }

    // Vérifier si le salon existe
    const { data: salon, error: fetchError } = await supabase.from('salon').select('*').eq('id', salonId).single();
    if (fetchError || !salon) {
      return peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
    }

    // Décrémenter le nombre de joueurs actuels
    const { error: updateError } = await supabase
      .from('salon')
      .update({ j_actuelle: Math.max(salon.j_actuelle - 1, 0) })
      .eq('id', salonId);

    if (updateError) {
      return peer.send({ user: 'server', type: 'error', message: updateError.message });
    }

    // Envoyer un message de succès
    peer.unsubscribe(`salon-${salonId}`);
    peer.subscribe('salons');

    peer.publish(`salon-${salonId}`, JSON.stringify({ type: 'leave', salonId, user: peer.id }));
    peer.publish(`salon-${salonId}`, { user: `salon-${salonId}`, message: `${peer.id} a quitté le salon` });
    peer.send({ user: 'server', type: 'success', message: `Vous avez quitté le salon ${salon.label}` });
  }
}

export default new SalonService();
