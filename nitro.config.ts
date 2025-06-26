//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  runtimeConfig: {  // Configuration est overwritten par le fichier .env
    supabaseUrl: '', // URL de votre instance Supabase
    supabaseKey: '',  // Clé API de votre instance Supabase
  },
  experimental: {
    websocket: true
  }
});
