import { createClient } from '@supabase/supabase-js';
import { Database } from '~~/types/database.types';

export default async function useSupabase() {
    const config = useRuntimeConfig();
    const supabaseUrl = config.supabaseUrl;
    const supabaseKey = config.supabaseKey;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Erreur de configuration: Supabase URL et clé requis.');
    }

    // Create and return the Supabase client
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    return supabase;
};
    