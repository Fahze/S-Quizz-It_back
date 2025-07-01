export default defineEventHandler(async (event) => {
  try {
    // Récupère l'utilisateur connecté
    const { profile } = await getUser(event);
    if (!profile) {
      throw createError({ statusCode: 401, statusMessage: 'Utilisateur non authentifié.' });
    }

    const supabase = await useSupabase();
    const body = await readBody(event);
    const { idAmi } = body;

    if (!idAmi) {
      throw createError({ statusCode: 400, statusMessage: 'idAmi requis.' });
    }

    // Supprime la relation d'amitié dans les deux sens
    const { error } = await supabase
      .from('amitie')
      .delete()
      .or(`and(idProfilDemandeur.eq.${profile.id},idProfileReceveur.eq.${idAmi}),and(idProfilDemandeur.eq.${idAmi},idProfileReceveur.eq.${profile.id})`);

    if (error) {
      throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la suppression de l\'ami.' });
    }

    return { success: true };
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
    summary: 'Supprimer un ami',
    description: 'Supprime la relation d’amitié entre l’utilisateur connecté et un autre utilisateur.',
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
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              idAmi: { type: 'string', description: 'ID du profil à supprimer des amis' }
            },
            required: ['idAmi']
          }
        }
      }
    },
    responses: {
      200: { description: 'Ami supprimé avec succès.' },
      400: { description: 'Requête invalide.' },
      401: { description: 'Non authentifié.' },
      500: { description: 'Erreur serveur.' }
    }
  }
});