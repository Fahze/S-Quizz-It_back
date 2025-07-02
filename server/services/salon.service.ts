import { getOrCreateSalon, saveSalonState } from '~/utils/websockets.utils';

class SalonService {
  // Utilitaire pour générer un label aléatoire
  genLabel(label: string): string {
    return label + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  // Diffuse à tous les clients la liste actuelle des salons
  async broadcastSalons(peer, topic) {
    const supabase = await useSupabase();

    const { data: salons, error } = await supabase.from('salon').select('*').eq('type', 'normal');
    const payload = error ? { type: 'error', message: error.message } : { type: 'salons_init', salons };

    peer.send(JSON.stringify(payload));
    peer.publish(topic, JSON.stringify(payload));
  }

  async createSalon(peer, { label, difficulte, type, j_max }) {
    const supabase = await useSupabase();
    if (!peer || !label) {
      throw new Error('Peer and label are required to create a salon');
    }
    const newSalon = {
      label: label,
      difficulte: difficulte ?? 1,
      type: type ?? 'rapide',
      j_max: j_max ?? 4,
    };
    const { error: insertError } = await supabase.from('salon').insert(newSalon);
    return insertError;
  }

  async createNormalSalon(peer, { label, difficulte, type, j_max }) {
    const supabase = await useSupabase();
    if (!peer) {
      throw new Error('Peer is required to create a normal salon');
    }
    const insertError = await this.createSalon(peer, {
      label: label,
      difficulte: difficulte,
      type: type,
      j_max: j_max,
    });
    if (insertError) {
      peer.send({ type: 'error', message: insertError.message });
    } else {
      peer.send({ type: 'success', message: 'Salon rapide créé avec succès' });
      // Récupérer l'ID du salon créé
      const { data: salons } = await supabase.from('salon').select('*').eq('type', 'normal').order('id', { ascending: false }).limit(1);
      if (salons.length > 0) {
        const salonId = salons[0].id;
        await this.playerJoinSalon(peer, salonId);
      }
    }
  }

  async createRapideSalon(peer) {
    const supabase = await useSupabase();
    if (!peer) {
      throw new Error('Peer is required to create a rapid salon');
    }
    // Vérifier si le salon rapide existe déjà
    const { data: existingSalons, error } = await supabase.from('salon').select('*').eq('type', 'rapide').eq('commence', false).limit(1);
    if (error) {
      peer.send({ type: 'error', message: error.message });
      return;
    }
    if (existingSalons.length > 0) {
      // Si un salon rapide existe déjà, rejoindre ce salon
      const salonId = existingSalons[0].id;
      await this.playerJoinSalon(peer, salonId);
    } else {
      // Sinon, créer un nouveau salon rapide
      const insertError = await this.createSalon(peer, {
        label: this.genLabel('Rapide'),
        difficulte: 2,
        type: 'rapide',
        j_max: 4,
      });
      if (insertError) {
        peer.send({ type: 'error', message: insertError.message });
      } else {
        peer.send({ type: 'success', message: 'Salon rapide créé avec succès' });
        // Récupérer l'ID du salon créé
        const { data: salons } = await supabase.from('salon').select('*').eq('type', 'rapide').order('id', { ascending: false }).limit(1);
        if (salons.length > 0) {
          const salonId = salons[0].id;
          await this.playerJoinSalon(peer, salonId);
        }
      }
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

    // Prépare l'état en mémoire
    leaveAllSalons(peer);

    const salonMemoire = getOrCreateSalon(salonId);
    salonMemoire.joueurs.set(peer.id, {
      userId: peer.userId,
      profile: { id: peer.id, pseudo: peer.profile.pseudo, avatar: peer.profile.avatar, elo: peer.profile.elo },
      score: 0,
      connected: true,
      isReady: false,
      finished: false,
    });
    saveSalonState(salonId, salonMemoire);

    peer.subscribe(`salon-${salonId}`);
    peer.currentSalon = salonId;

    peer.publish(`salon-${salonId}`, JSON.stringify({ user: `salon-${salonId}`, type: 'join', salonId, message: `${peer.id} a rejoint le salon` }));
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

    const salonMemoire = getOrCreateSalon(salonId);
    salonMemoire.joueurs.delete(peer.id);
    saveSalonState(salonId, salonMemoire);

    peer.unsubscribe(`salon-${salonId}`);
    peer.currentSalon = null;

    peer.subscribe('salons');

    peer.publish(`salon-${salonId}`, JSON.stringify({ user: `salon-${salonId}`, type: 'leave', salonId, message: `${peer.id} a quitté le salon` }));
    peer.send({ user: 'server', type: 'success', message: `Vous avez quitté le salon ${salon.label}` });
  }
}

export default new SalonService();
