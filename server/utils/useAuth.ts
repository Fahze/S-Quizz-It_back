export default defineEventHandler(async (event) => {
  // Ecris ton code
  const supabase = await useSupabase(event);

  // On récupère l'utilisateur authentifié
  const accessToken = getHeader(event, 'authorization');

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  // On vérifie le token d'accès
  if (!accessToken.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token format',
    });
  }

  // On extrait le token d'accès
  const token = accessToken.split(' ')[1];

  // On récupère l'utilisateur à partir du token d'accès
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const { data: userFetch, error } = await supabase.auth.getUser(accessToken);

  if (!userFetch || error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  return userFetch.user;
  
});