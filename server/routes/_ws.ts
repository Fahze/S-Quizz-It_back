import { connectToTopic } from '~/utils/websockets.utils';
import salonService from '../websockets/salon.service';

export default defineWebSocketHandler({
  async open(peer) {
    console.log(peer.websocket.protocol);
    if (peer.websocket.protocol.startsWith('auth ')) {
      const token = peer.websocket.protocol.split(' ')[1];
      if (!token) {
        peer.send({ user: 'server', message: 'Veuillez completer le protocol comme "auth <token>"' });
        peer.close();
        return;
      } else {
        const supabase = await useSupabase();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);
        if (error || !user) {
          peer.send({ user: 'server', type: 'error', message: 'Authentification invalide' });
          peer.close();
          return;
        }
        peer.userId = user.id;
        console.log(`[ws] ${peer.userId} authentifié avec succès`);
        connectToTopic(peer, 'salons');
      }
      peer.send({ user: 'server', message: `Bienvenue sur le serveur de S-Quizz It !` });
    } else {
      peer.send({ user: 'server', type: 'error', message: 'Veuillez vous connecter avec un token valide' });
      peer.close();
    }
  },

  async message(peer, message): Promise<any> {
    const text = message.text();
    if (text === 'fetch') {
      await salonService.broadcastSalons(peer, 'salons');
      return;
    }

    if (text.startsWith('connect-')) {
      if (peer.topics.has(`salon-${text.split('-')[1]}`)) {
        peer.send({
          user: 'server',
          message: 'Vous êtes déjà dans ce salon',
        });
      } else {
        await salonService.playerJoinSalon(peer, parseInt(text.split('-')[1], 10));
      }
      return;
    }
    if (text.startsWith('leave-')) {
      if (peer.topics.has(`salon-${text.split('-')[1]}`)) {
        await salonService.playerLeaveSalon(peer, parseInt(text.split('-')[1], 10));
      } else {
        peer.send({
          user: 'server',
          message: 'Vous ne pouvez pas quitter un salon dont vous ne faites pas partie',
        });
      }
      return;
    }
    peer.send({ user: peer.id, message: text });
  },

  close(peer) {
    console.log(`[ws] ${peer.id} déconnecté`);
    peer.topics.forEach((topic) => {
      if (topic.startsWith('salon-')) {
        console.log(`[ws] ${peer.id} quitte le salon ${topic}`);
        salonService.playerLeaveSalon(peer, parseInt(topic.split('-')[1], 10));
      }
      peer.unsubscribe(topic);
    });
  },

  error(peer, err) {
    console.error('[ws] erreur', err);
  },
});
