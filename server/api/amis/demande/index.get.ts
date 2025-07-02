export default defineEventHandler(async (event) => {
  try {
    // Récupère l'utilisateur connecté
    const { profile } = await getUser(event);
    if (!profile) {
      throw createError({ statusCode: 401, statusMessage: 'Utilisateur non authentifié.' });
    }

    const supabase = await useSupabase();

    // Liste les demandes d'amis reçues (en attente)
    const { data: demandes, error } = await supabase
      .from('amitie')
      .select('idProfilDemandeur, status')
      .eq('idProfileReceveur', profile.id)
      .eq('status', 'en_attente');

    if (error) {
      throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des demandes.' });
    }

    // Récupère les profils des demandeurs
    if (demandes && demandes.length > 0) {
      const ids = demandes.map(d => d.idProfilDemandeur);
      const { data: profilsData, error: profilsError } = await supabase
        .from('profile')
        .select('*, avatar(*)')
        .in('id', ids);
      if (profilsError) {
        throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des profils.' });
      }
      
      const profils = profilsData.map(profil => ({
        id: profil.id,
        avatar: profil.avatar,
        pseudo: profil.pseudo,
        elo: profil.elo,
      }));

      return profils;
    }

    // Si aucune demande n'est trouvée, retourne un tableau vide
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
    summary: 'Lister les demandes d’amis reçues',
    description: 'Retourne la liste des profils ayant envoyé une demande d’amitié à l’utilisateur connecté (statut en attente).',
    tags: ['Amitié'],
    parameters: [
      {
        name: 'Authorization',
        in: 'header',
        required: true,
        description: 'Token JWT d’authentification (Bearer)',
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: { 
        description: 'Liste des profils demandeurs.',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'ID du profil' },
                  avatar: { type: 'object', description: 'Détails de l\'avatar' },
                  pseudo: { type: 'string', description: 'Pseudo du profil' },
                  elo: { type: 'number', description: 'Elo du profil' }
                }
              }
            }
          }
        }
       },
      401: { description: 'Non authentifié.' },
      500: { description: 'Erreur serveur.' }
    }
  }
});
