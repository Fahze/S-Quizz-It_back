export default async function getUserWithToken(access_token: string) {
  // Ecris ton code
  const supabase = await useSupabase();

  // On récupère l'utilisateur authentifié
  const accessToken = access_token;

  // On vérifie le token d'accès
  if (!accessToken.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header format. Expected "Bearer <token>"');
  }

  // On extrait le token d'accès
  const token = accessToken.split(' ')[1];

  // On récupère l'utilisateur à partir du token d'accès
  if (!token) {
    throw new Error('Access token is missing');
  }

  const { data: userFetch, error } = await supabase.auth.getUser(token);

  if (!userFetch || error) {
    throw new Error(error.message || "Erreur lors de la récupération de l'utilisateur");
  }

  // On récupère le profil utilisateur
  const { data: profile, error: profileFetchError } = await supabase.from('profile').select('*').eq('idUser', userFetch.user.id).single();

  if (profileFetchError) {
    throw new Error(profileFetchError.message || 'Erreur lors de la récupération du profil utilisateur');
  }

  return {
    user: userFetch.user,
    profile: profile,
  };
}
