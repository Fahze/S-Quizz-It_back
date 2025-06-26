import { createClient } from '@supabase/supabase-js';
import { Database } from '~~/types/database.types';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);
    const supabaseUrl = config.supabaseUrl;
    const supabaseKey = config.supabaseKey;
    
    if (!supabaseUrl || !supabaseKey) {
        throw createError({
        statusCode: 500,
        statusMessage: 'Erreur de configuration dans le client supabase, champs requis non définis.',
        });
    }

    // Create and return the Supabase client
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    return supabase;
});
    