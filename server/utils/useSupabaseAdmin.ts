import { createClient } from '@supabase/supabase-js';
import { Database } from '~~/types/database.types';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);
    const supabaseUrl = config.supabaseUrl;
    const supabaseAdminKey = config.supabaseAdminKey;
    
    if (!supabaseUrl || !supabaseAdminKey) {
        throw createError({
        statusCode: 500,
        statusMessage: 'Erreur de configuration dans le client supabase, champs requis non définis.',
        });
    }

    // Create and return the Supabase client
    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseAdminKey,
        {
            auth: {
                persistSession: false, // Persist session across page reloads
                autoRefreshToken: false, // Automatically refresh the token
            },
        }
    );

    return supabaseAdmin;
});
    