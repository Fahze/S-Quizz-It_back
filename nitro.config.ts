//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  runtimeConfig: {  // Configuration est overwritten par le fichier .env
    supabaseUrl: '', // URL de votre instance Supabase
    supabaseAdminKey: '', // Clé d'administration de votre instance Supabase
    supabaseKey: '',  // Clé API de votre instance Supabase
  },
  experimental: {
    openAPI: true, // Activer l'OpenAPI
  }
});
