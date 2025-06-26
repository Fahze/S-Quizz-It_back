// Utilitaire pour générer un label aléatoire
function genLabel(): string {
  return 'Salon-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Diffuse à tous les clients la liste actuelle des salons
async function broadcastSalons(peer) {
  const supabase = await useSupabase();

  const { data: salons, error } = await supabase.from('salon').select('*');
  const payload = error ? { type: 'error', message: error.message } : { type: 'salons_init', salons };

  peer.publish('chat', JSON.stringify(payload));
}

export default defineWebSocketHandler({
  async open(peer) {
    peer.subscribe('chat');
    peer.publish('chat', { user: 'server', message: `${peer} joined!` });
    // Et la liste initiale des salons
    await broadcastSalons(peer);
  },

  async message(peer, message): Promise<any> {
    const supabase = await useSupabase();

    const text = message.text();
    // Pong
    if (text === 'ping') {
      peer.publish('chat', 'pong');
      return;
    }

    // Création d'un salon
    if (text === 'create') {
      const newSalon = {
        label: genLabel(),
        difficulte: 1,
        type: 'normal' as const,
      };
      const { error: insertError } = await supabase.from('salon').insert(newSalon);

      if (insertError) {
        peer.send({ type: 'error', message: insertError.message });
      } else {
        // Après création, on rediffuse la liste entière à tous
        await broadcastSalons(peer);
      }
      return;
    }

    // Suppression d'un salon : "delete <id>"
    if (text.startsWith('delete ')) {
      const parts = text.split(' ');
      const id = parseInt(parts[1], 10);
      if (isNaN(id)) {
        return peer.send({ type: 'error', message: 'ID invalide pour deletion' });
      }

      const { error: deleteError } = await supabase.from('salon').delete().eq('id', id);

      if (deleteError) {
        peer.send({ type: 'error', message: deleteError.message });
      } else {
        // Après suppression, on rediffuse la liste entière à tous
        await broadcastSalons(peer);
      }
      return;
    }

    if (text === 'fetch') {
      await broadcastSalons(peer);
      return;
    }

    // Sinon, on peut renvoyer un écho
    peer.send({ type: 'echo', message: text });
  },

  close(peer) {
    peer.publish('chat', peer.id + ' left');
  },

  error(peer, err) {
    console.error('[ws] erreur', err);
  },
});
