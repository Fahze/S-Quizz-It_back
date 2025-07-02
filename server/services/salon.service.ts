import { getAllJoueursFromSalon, getOrCreateSalon, getSalonState, saveSalonState, leaveAllSalons } from '~/utils/websockets.utils';
import { CreateSalonParams, SalonData } from '~~/types/common.types';
import gameService from './game.service';
import { ExtendedPeer } from '~~/interfaces/ws.interface';

class SalonService {
  // Utility methods
  private genLabel(label: string): string {
    return label + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  private async validateSalonExists( salonId: number, peer?: ExtendedPeer): Promise<SalonData | null> {
    if (isNaN(salonId)) {
      peer.send({ user: 'server', type: 'error', message: 'ID invalide' });
      return null;
    }

    const supabase = await useSupabase();
    const { data: salon, error } = await supabase.from('salon').select('*').eq('id', salonId).single();

    if (error || !salon) {
      peer.send({ user: 'server', type: 'error', message: 'Salon introuvable' });
      return null;
    }

    return salon;
  }

  private validateSalonCapacity(peer: ExtendedPeer, salon: SalonData): boolean {
    if (salon.commence) {
      peer.send({ user: 'server', type: 'error', message: 'Le salon a déjà commencé une partie' });
      return false;
    }

    if (salon.j_actuelle >= salon.j_max) {
      peer.send({ user: 'server', type: 'error', message: 'Salon plein' });
      return false;
    }

    return true;
  }

  private async updatePlayerCount(salonId: number, increment: boolean): Promise<boolean> {
    const supabase = await useSupabase();
    const salon = await this.validateSalonExists(salonId);
    if (!salon) return false;

    const newCount = increment ? salon.j_actuelle + 1 : Math.max(salon.j_actuelle - 1, 0);

    const { error } = await supabase.from('salon').update({ j_actuelle: newCount }).eq('id', salonId);

    return !error;
  }

  private publishSalonUpdate(peer: ExtendedPeer, salonId: number, type: string, message: string) {
    const payload = {
      user: `salon-${salonId}`,
      type,
      salonId,
      players: getAllJoueursFromSalon(salonId),
      message,
    };

    peer.publish(`salon-${salonId}`, JSON.stringify(payload));
    peer.send(payload);
  }

  // Public methods
  async broadcastSalons(peer: ExtendedPeer, topic: string): Promise<void> {
    const supabase = await useSupabase();
    const { data: salons, error } = await supabase.from('salon').select('*').eq('type', 'normal');

    const payload = error ? { type: 'error', message: error.message } : { type: 'salons_init', salons };

    peer.send(JSON.stringify(payload));
    peer.publish(topic, JSON.stringify(payload));
  }

  async broadcastSalonInfo(peer: ExtendedPeer, salonId: number): Promise<void> {
    const salon = await this.validateSalonExists(salonId, peer);
    if (!salon) return;

    const salonMemoire = getSalonState(salonId);
    if (!salonMemoire) {
      peer.send({ user: 'server', type: 'error', message: 'Salon introuvable en mémoire' });
      return;
    }

    peer.send({ type: 'salon_info', salonId, players: getAllJoueursFromSalon(salonId), salon });
  }

  async createSalon(peer: ExtendedPeer, params: CreateSalonParams): Promise<any> {
    const supabase = await useSupabase();

    if (!peer || !params.label) {
      throw new Error('Peer and label are required to create a salon');
    }

    const newSalon = {
      label: params.label,
      difficulte: params.difficulte ?? 1,
      type: params.type ?? ('rapide' as const),
      j_max: params.j_max ?? 4,
    };

    const { error } = await supabase.from('salon').insert(newSalon);
    return error;
  }

  async createNormalSalon(peer: ExtendedPeer, params: CreateSalonParams): Promise<void> {
    if (!peer) {
      throw new Error('Peer is required to create a normal salon');
    }

    const insertError = await this.createSalon(peer, params);

    if (insertError) {
      peer.send({ type: 'error', message: insertError.message });
      return;
    }

    peer.send({ type: 'success', message: 'Salon normal créé avec succès' });

    // Get the created salon and join it
    const supabase = await useSupabase();
    const { data: salons } = await supabase.from('salon').select('*').eq('type', 'normal').order('id', { ascending: false }).limit(1);

    if (salons?.length > 0) {
      await this.playerJoinSalon(peer, salons[0].id, false);
    }
  }

  async createRapideSalon(peer: ExtendedPeer): Promise<void> {
    if (!peer) {
      throw new Error('Peer is required to create a rapid salon');
    }

    const supabase = await useSupabase();

    // Check if rapid salon already exists
    const { data: existingSalons, error } = await supabase.from('salon').select('*').eq('type', 'rapide').eq('commence', false).limit(1);

    if (error) {
      peer.send({ type: 'error', message: error.message });
      return;
    }

    if (existingSalons?.length > 0) {
      // Join existing rapid salon
      await this.playerJoinSalon(peer, existingSalons[0].id, true);
      // Check if salon is now full and start game if it is
      await this.checkAndStartRapidGame(peer, existingSalons[0].id);
      return;
    }

    // Create new rapid salon
    const insertError = await this.createSalon(peer, {
      label: this.genLabel('Rapide'),
      difficulte: 2,
      type: 'rapide' as const,
      j_max: 4,
    });

    if (insertError) {
      peer.send({ type: 'error', message: insertError.message });
      return;
    }

    peer.send({ type: 'success', message: 'Salon rapide créé avec succès' });

    // Get the created salon and join it
    const { data: salons } = await supabase.from('salon').select('*').eq('type', 'rapide').order('id', { ascending: false }).limit(1);

    if (salons?.length > 0) {
      await this.playerJoinSalon(peer, salons[0].id, true);
      // Check if salon is now full and start game if it is
      await this.checkAndStartRapidGame(peer, salons[0].id);
    }
  }

  private async checkAndStartRapidGame(peer: any, salonId: number): Promise<void> {
    const salon = await this.validateSalonExists(salonId, peer);
    if (!salon || salon.type !== 'rapide') return;

    // Check if salon is full
    if (salon.j_actuelle >= salon.j_max) {
      // Small delay to ensure all players are properly connected
      setTimeout(async () => {
        await gameService.startGame(peer, salonId);
      }, 1000);
    }
  }

  async deleteSalon(peer: ExtendedPeer, salonId: number): Promise<void> {
    const salon = await this.validateSalonExists(salonId, peer);
    if (!salon) return;

    const supabase = await useSupabase();
    const { error } = await supabase.from('salon').delete().eq('id', salonId);

    if (error) {
      peer.send({ type: 'error', message: error.message });
    } else {
      await this.broadcastSalons(peer, 'chat');
    }
  }

  async playerJoinSalon(peer: ExtendedPeer, salonId: number, isRapide: boolean): Promise<void> {
    const salon = await this.validateSalonExists(salonId, peer);
    if (!salon || !this.validateSalonCapacity(peer, salon)) {
      return;
    }

    // Update player count in database
    const success = await this.updatePlayerCount(salonId, true);
    if (!success) {
      peer.send({ user: 'server', type: 'error', message: 'Erreur lors de la mise à jour du salon' });
      return;
    }

    // Update in-memory state
    leaveAllSalons(peer);

    const salonMemoire = getOrCreateSalon(salonId);
    salonMemoire.joueurs.set(peer.id, {
      userId: peer.user.id,
      profile: {
        id: peer.profile.id,
        pseudo: peer.profile.pseudo,
        avatar: peer.profile.avatar,
        elo: peer.profile.elo,
      },
      score: 0,
      connected: true,
      isReady: isRapide,
      finished: false,
    });

    saveSalonState(salonId, salonMemoire);

    peer.subscribe(`salon-${salonId}`);
    peer.currentSalon = salonId;

    this.publishSalonUpdate(peer, salonId, 'join', `Vous avez rejoint le salon ${salon.label}`);
    // If this is a rapid salon and it's now full, start the game automatically
    if (isRapide && salon.type === 'rapide') {
      // Get updated salon info to check current player count
      const updatedSalon = await this.validateSalonExists(salonId, peer);
      if (updatedSalon && updatedSalon.j_actuelle >= updatedSalon.j_max) {
        // Small delay to ensure all players are properly connected and ready
        setTimeout(async () => {
          await gameService.startGame(peer, salonId);
        }, 1000);
      }
    }
  }

  async playerLeaveSalon(peer: ExtendedPeer, salonId: number): Promise<void> {
    const salon = await this.validateSalonExists(salonId, peer);
    if (!salon) return;

    // Update player count in database
    const success = await this.updatePlayerCount(salonId, false);
    if (!success) {
      peer.send({ user: 'server', type: 'error', message: 'Erreur lors de la mise à jour du salon' });
      return;
    }

    // Update in-memory state
    const salonMemoire = getSalonState(salonId);
    if (salonMemoire) {
      salonMemoire.joueurs.delete(peer.id);
      saveSalonState(salonId, salonMemoire);
    }

    peer.unsubscribe(`salon-${salonId}`);
    peer.currentSalon = null;
    peer.subscribe('salons');
    setTimeout(() => {
      this.broadcastSalons(peer, 'salons');
    }, 2000);

    this.publishSalonUpdate(peer, salonId, 'leave', `Vous avez quitté le salon ${salon.label}`);

    // Vérifier si le salon est vide et le supprimer si nécessaire
    if (salonMemoire && salonMemoire.joueurs.size === 0) {
      const supabase = await useSupabase();
      const { error } = await supabase.from('salon').delete().eq('id', salonId);

      // Timer pour éviter les problèmes de synchronisation
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // On re récupère le salon pour vérifier s'il est toujours vide
      const updatedSalon = await this.validateSalonExists(salonId, peer);
      
      if (!updatedSalon || updatedSalon.j_actuelle > 0) {
        return; // Le salon n'est plus vide, on ne le supprime pas
      }

      if (error) {
        peer.send({ user: 'server', type: 'error', message: 'Erreur lors de la suppression du salon' });
      } else {
        this.publishSalonUpdate(peer, salonId, 'delete', `Le salon ${salon.label} a été supprimé car il est vide`);
      }
      clearSalonState(salonId);
    } else {
      this.publishSalonUpdate(peer, salonId, 'update', `Le salon ${salon.label} a été mis à jour`);
    }
  }
}

export default new SalonService();
