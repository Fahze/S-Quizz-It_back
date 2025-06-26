// import { createClient } from "@supabase/supabase-js";

// export default defineEventHandler(async () => {
//   const config = useRuntimeConfig(useEvent());
//   const supabaseUrl = config.supabaseUrl;
//   const supabaseKey = config.supabaseKey;

//   if (!supabaseUrl || !supabaseKey) {
//     throw createError({
//       statusCode: 500,
//       statusMessage:
//         "Erreur de configuration dans le client supabase, champs requis non définis.",
//     });
//   }

//   // Create and return the Supabase client
//   const supabase = createClient(supabaseUrl, supabaseKey);

//   return supabase;
// });

// server/utils/useSupabase.ts
import { createClient } from "@supabase/supabase-js";
const config = useRuntimeConfig();
export const supabase = createClient(config.supabaseUrl, config.supabaseKey);
