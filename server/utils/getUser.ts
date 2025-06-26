export default defineEventHandler(async (event) => {
  // Ecris ton code
  const supabase = await useSupabase(event);

  // On récupère l'utilisateur authentifié
  const accessToken = getHeader(event, "authorization");

  if (!accessToken) {
    throw new Error("Authorization header is missing");
  }

  // On vérifie le token d'accès
  if (!accessToken.startsWith("Bearer ")) {
    throw new Error(
      'Invalid authorization header format. Expected "Bearer <token>"'
    );
  }

  // On extrait le token d'accès
  const token = accessToken.split(" ")[1];

  // On récupère l'utilisateur à partir du token d'accès
  if (!token) {
    throw new Error("Access token is missing");
  }
  
  const { data: userFetch, error } = await supabase.auth.getUser(token);

  if (!userFetch || error) {
    throw new Error(
      error.message || "Erreur lors de la récupération de l'utilisateur"
    );
  }

  return userFetch.user;
});
