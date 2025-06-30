import { createClient } from '@supabase/supabase-js';
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

// Extraire token Supabase du protocole WebSocket
export function extractToken(protocolHeader: string | null): string | null {
  if (!protocolHeader) return null;
  const parts = protocolHeader.split(',').map((p) => p.trim());
  if (parts[0] !== 'auth' || parts.length < 2) return null;
  return parts[1];
}

// Envoyer une erreur standard
export function sendError(peer: any, message: string) {
  peer.send({ user: 'server', type: 'error', message });
}

// Extraire un ID numérique depuis un message textuel de forme `${prefix}-${id}`
export function extractId(text: string, prefix: string): number | null {
  if (!text.startsWith(prefix + '-')) return null;
  const id = parseInt(text.split('-')[1], 10);
  return isNaN(id) ? null : id;
}

// Authentifier un peer via Supabase JWT
type Supabase = ReturnType<typeof createClient>;
export async function authenticatePeer(peer: any, supabase: any, token: string): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  peer.userId = user.id;
  return user.id;
}

// Nettoyer et quitter tous les salons d'un peer
type SalonServiceType = {
  playerLeaveSalon: (peer: any, salonId: number, salonsEnCours: Map<any, any>) => Promise<void>;
};
export function leaveAllSalons(peer: any, salonsEnCours: Map<any, any>, salonService: SalonServiceType) {
  peer.topics.forEach((topic: string) => {
    if (topic.startsWith('salon-')) {
      const idStr = topic.split('-')[1];
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) {
        salonService.playerLeaveSalon(peer, id, salonsEnCours);
      }
    }
    peer.unsubscribe(topic);
  });
}
