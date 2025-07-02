import { Peer } from 'crossws';
import { User } from '@supabase/supabase-js';

export interface ExtendedPeer extends Peer {
    currentSalon?: number;
    profile?: {
        id: number;
        pseudo: string;
        avatar: {
            idAvatar: number;
            urlavatar: string;
        }
        elo: number;
    },
    user? : User;
}