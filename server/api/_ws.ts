import { supabase } from '../utils/useSupabase';

const peers: Set<any> = new Set();

const salon_changes = supabase.channel('salon_changes');
salon_changes
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'salon' }, (payload) => handleOnPostgresChanges(payload))
  .on('presence', { event: 'sync' }, () => handleOnPresenceSync())
  .on('presence', { event: 'join' }, ({ key, newPresences }) => handleOnPresenceJoin({ key, newPresences }))
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => handleOnPresenceLeave({ key, leftPresences }))
  .subscribe();

export default defineWebSocketHandler({
  async open(peer) {
    peers.add(peer);
    peer.send({ type: 'welcome', message: 'Bienvenue 👋' });

    const { data: salons, error } = await supabase.from('salon').select('*');
    if (error) {
      peer.send({ type: 'error', message: error.message });
    } else {
      peer.send({ type: 'salons_init', message: salons });
    }
  },

  message(peer, message) {
    const text = message.text();
    peer.send({ user: peer.toString(), message: message.toString() });

    if (text.includes('ping')) {
      peer.send('pong');
    } else if (text.includes('fetch')) {
      supabase
        .from('salon')
        .select('*')
        .then(({ data, error }) => {
          if (error) {
            peer.send({ type: 'error', message: error.message });
          } else {
            peer.send({ type: 'salons_init', message: data });
          }
        });
    }

    // ici gérer la logique "room", subscribe/publish, ou d'autres commandes métier
  },

  close(peer) {
    peers.delete(peer);
  },

  error(peer, err) {
    console.error('[ws] error', err);
  },
});

const handleOnPostgresChanges = (payload) => {
  console.log('Change received:', payload);
  peers.forEach((peer) => {
    peer.send({ type: 'salon_new', salon: payload.new });
    peer.send({
      type: 'salon_new',
      salon: payload.new,
      message: 'Salon updated',
    });
  });
};

const handleOnPresenceSync = () => {
  const newState = salon_changes.presenceState();
  console.log('sync', newState);
  peers.forEach((peer) => {
    peer.send({ type: 'presence_sync', message: newState });
  });
};

const handleOnPresenceJoin = ({ key, newPresences }) => {
  console.log('join', key, newPresences);
  peers.forEach((peer) => {
    peer.send({ type: 'presence_join', key, newPresences, message: peer.toString() + ' joined' });
  });
};

const handleOnPresenceLeave = ({ key, leftPresences }) => {
  console.log('leave', key, leftPresences);
  peers.forEach((peer) => {
    peer.send({ type: 'presence_leave', key, leftPresences, message: peer.toString() + ' left' });
  });
};
