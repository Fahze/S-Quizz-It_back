import { authenticatePeer, connectToTopic, extractId, extractToken, leaveAllSalons, sendError } from '~/utils/websockets.utils';
import salonService from '../websockets/salon.service';
import { salonsEnCours } from '~/websockets/websocket.state';
import gameService from '~/websockets/game.service';

export default defineWebSocketHandler({
  async open(peer) {
    // 1) Récupération et vérification du token
    const protocolHeader = peer.request.headers.get('sec-websocket-protocol');
    const token = extractToken(protocolHeader);
    if (!token) {
      sendError(peer, 'Veuillez compléter le protocole comme "auth,<token>"');
      return peer.close();
    }

    // 2) Authentification via Supabase
    const supabase = await useSupabase();
    const userId = await authenticatePeer(peer, supabase, token);
    if (!userId) {
      sendError(peer, 'Authentification invalide');
      return peer.close();
    }

    // 3) Abonnement au topic général
    connectToTopic(peer, 'salons');
    peer.send({ user: 'server', message: `Bienvenue ! userId: ${userId}` });
  },

  async message(peer: any, message): Promise<any> {
    const text = message.text();
    if (text === 'fetch') {
      await salonService.broadcastSalons(peer, 'salons');
    }

    if (text === 'rapide') {
      await salonService.createRapideSalon(peer);
    }

    const joinId = extractId(text, 'connect');
    if (joinId !== null) {
      if (peer.currentSalon == joinId) {
        peer.send({
          user: 'server',
          type: 'error',
          message: 'Vous êtes déjà dans ce salon',
        });
      } else {
        await salonService.playerJoinSalon(peer, joinId);
      }
      return;
    }

    const leaveId = extractId(text, 'leave');
    if (leaveId) {
      if (peer.currentSalon === leaveId) {
        await salonService.playerLeaveSalon(peer, leaveId);
      } else {
        peer.send({
          user: 'server',
          type: 'error',
          message: 'Vous ne pouvez pas quitter un salon dont vous ne faites pas partie',
        });
      }
      return;
    }

    const startId = extractId(text, 'start');
    if (startId) {
      if (peer.currentSalon === startId) {
        await gameService.startGame(peer, startId);
      }
    }

    peer.send({ user: peer.id, message: text });
  },

  close(peer) {
    console.log(`[ws] ${peer.id} déconnecté`);
    leaveAllSalons(peer);
  },

  error(peer, err) {
    console.error('[ws] erreur', err);
  },
});
