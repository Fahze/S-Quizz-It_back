export default defineEventHandler(async (event) => {
  try {
    // Récupère l'utilisateur connecté
    const { profile } = await getUser(event);
    if (!profile) {
      throw createError({ statusCode: 401, statusMessage: 'Utilisateur non authentifié.' });
    }

    const supabase = await useSupabase();

    // Récupère les amitiés où l'utilisateur est demandeur ou receveur et status = 'amis'
    const { data: amities, error } = await supabase
      .from('amitie')
      .select('*')
      .or(`idProfilDemandeur.eq.${profile.id},idProfileReceveur.eq.${profile.id}`)
      .eq('status', 'amis');

    if (error) {
      throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des amis.' });
    }

    // Récupère les profils des amis
    const amisIds = amities
      ? amities.map((a) => (a.idProfilDemandeur === profile.id ? a.idProfileReceveur : a.idProfilDemandeur))
      : [];

    if (amisIds.length > 0) {
      const { data: profils, error: profilsError } = await supabase
        .from('profile')
        .select('*')
        .in('id', amisIds);
      if (profilsError) {
        throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des profils amis.' });
      }

      // Transforme les profils en array d'amis
      const amisProfils = profils.map((profil) => ({
        id: profil.id,
        avatar: profil.avatar,
        pseudo: profil.pseudo,
        elo: profil.elo,
      }));

      return amisProfils;
    }

    // Si aucun ami n'est trouvé, retourne un tableau vide
    return [];
  } catch (error) {
    if (error?.statusCode && error?.statusMessage) {
      throw error;
    } else {
      throw createError({ statusCode: 500, statusMessage: 'Erreur interne du serveur.' });
    }
  }
});


defineRouteMeta({
  openAPI: {
    summary: 'Récupérer la liste des amis',
    description:
      'Retourne la liste des profils amis de l’utilisateur connecté. Les amis sont ceux dont le statut de la relation est "amis".',
    tags: ['Amitié'],
    parameters: [
      {
        name: 'Authorization',
        in: 'header',
        required: true,
        description: 'Token JWT d’authentification (Bearer)',
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: { description: 'Liste des profils amis.' },
      401: { description: 'Non authentifié.' },
      500: { description: 'Erreur serveur.' },
    },
  },
});
