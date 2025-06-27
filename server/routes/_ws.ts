import { connectToTopic } from '~/utils/websockets.utils';
import salonService from '../websockets/salon.service';

export default defineWebSocketHandler({
  async open(peer) {
    connectToTopic(peer, 'salons');
  },

  async message(peer, message): Promise<any> {
    const text = message.text();

    if (text === 'fetch') {
      await salonService.broadcastSalons(peer, 'salons');
      return;
    }

    if (text.startsWith('connect-')) {
      if (!peer.topics.has(`salon-${text.split('-')[1]}`)) {
        await salonService.playerJoinSalon(peer, parseInt(text.split('-')[1], 10));
      } else {
        peer.send({
          user: 'server',
          message: 'Vous êtes déjà dans ce salon',
        });
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
    peer.send({ user: 'server', message: text });
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
