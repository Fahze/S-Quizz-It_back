import salonService from '~/websockets/salon.service';

export async function connectToTopic(peer, topic: string) {
  if (!peer || !topic) {
    throw new Error('Peer and topic are required to connect');
  }

  try {
    peer.subscribe(topic);
    peer.publish(topic, { user: 'server', message: `${peer} joined!` });
    await salonService.broadcastSalons(peer, topic);
    console.log(`Subscribed ${peer} to topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to subscribe ${peer} to topic ${topic}:`, error);
    throw error;
  }
}
