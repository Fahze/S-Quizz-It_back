import { createClient } from '@supabase/supabase-js';

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    return supabase;
});
    