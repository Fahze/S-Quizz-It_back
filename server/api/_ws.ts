import { supabase } from '../utils/useSupabase';

// Ensemble des clients connectés
const peers = new Set<any>();

// Utilitaire pour générer un label aléatoire
function genLabel(): string {
  return 'Salon-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Diffuse à tous les clients la liste actuelle des salons
async function broadcastSalons() {
  const { data: salons, error } = await supabase.from('salon').select('*');
  const payload = error ? { type: 'error', message: error.message } : { type: 'salons_init', salons };

  peers.forEach((peer) => {
    peer.send(JSON.stringify(payload));
  });
}

export default defineWebSocketHandler({
  async open(peer) {
    peers.add(peer);
    console.log('[ws] nouveau client connecté', peer.id);
    peer.send({ type: 'welcome', message: 'Bienvenue 👋' });
    // Et la liste initiale des salons
    await broadcastSalons();
  },

  async message(peer, message): Promise<any> {
    const text = message.text();
    console.log('[ws] reçu:', text);

    console.log(text);
    // Pong
    if (text === 'ping') {
      peer.send('pong');
      return;
    }

    // Création d'un salon
    if (text === 'create') {
      const newSalon = {
        label: genLabel(),
        difficulte: 1,
        type: 'Normal',
      };
      const { error: insertError } = await supabase.from('salon').insert(newSalon);

      if (insertError) {
        peer.send(JSON.stringify({ type: 'error', message: insertError.message }));
      } else {
        // Après création, on rediffuse la liste entière à tous
        await broadcastSalons();
      }
      return;
    }

    // Suppression d'un salon : "delete <id>"
    if (text.startsWith('delete ')) {
      const parts = text.split(' ');
      const id = parseInt(parts[1], 10);
      if (isNaN(id)) {
        return peer.send(JSON.stringify({ type: 'error', message: 'ID invalide pour deletion' }));
      }

      const { error: deleteError } = await supabase.from('salon').delete().eq('id', id);

      if (deleteError) {
        peer.send(JSON.stringify({ type: 'error', message: deleteError.message }));
      } else {
        // Après suppression, on rediffuse la liste entière à tous
        await broadcastSalons();
      }
      return;
    }

    if (text === 'fetch') {
      await broadcastSalons();
      return;
    }

    // Sinon, on peut renvoyer un écho
    peer.send(JSON.stringify({ type: 'echo', message: text }));
  },

  close(peer) {
    peers.delete(peer);
  },

  error(peer, err) {
    console.error('[ws] erreur', err);
  },
});
