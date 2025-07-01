export default defineEventHandler(async (event) => {
  try {
    // Récupère l'utilisateur connecté
    const { profile } = await getUser(event);
    if (!profile) {
      throw createError({ statusCode: 401, statusMessage: 'Utilisateur non authentifié.' });
    }

    const supabase = await useSupabase();
    const body = await readBody(event);
    const { idDemandeur, action } = body;

    if (!idDemandeur || !action || !['accepter', 'refuser'].includes(action)) {
      throw createError({ statusCode: 400, statusMessage: 'idDemandeur et action (accepter/refuser) requis.' });
    }

    // Vérifie que la demande existe et que l'utilisateur est bien le receveur
    const { data: demande, error: demandeError } = await supabase
      .from('amitie')
      .select('*')
      .eq('idProfilDemandeur', idDemandeur)
      .eq('idProfileReceveur', profile.id)
      .eq('status', 'en_attente')
      .single();
    if (demandeError || !demande) {
      throw createError({ statusCode: 404, statusMessage: 'Demande non trouvée.' });
    }

    if (action === 'accepter') {
      // Met à jour le status à 'amis'
      const { error: updateError } = await supabase
        .from('amitie')
        .update({ status: 'amis' })
        .eq('idProfilDemandeur', idDemandeur)
        .eq('idProfileReceveur', profile.id);
      if (updateError) {
        throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'acceptation.' });
      }
      return { success: true, action: 'accepter' };
    } else if (action === 'refuser') {
      // Supprime la demande
      const { error: deleteError } = await supabase
        .from('amitie')
        .delete()
        .eq('idProfilDemandeur', idDemandeur)
        .eq('idProfileReceveur', profile.id);
      if (deleteError) {
        throw createError({ statusCode: 500, statusMessage: 'Erreur lors du refus.' });
      }
      return { success: true, action: 'refuser' };
    }
  } catch (error) {
    // Gestion des erreurs
    if (error?.statusCode && error?.statusMessage) {
      throw error;
    } else {
      throw createError({ statusCode: 500, statusMessage: 'Erreur interne du serveur.' });
    }
  }
});


defineRouteMeta({
  openAPI: {
    summary: 'Accepter ou refuser une demande d’amitié',
    description: 'Permet à l’utilisateur connecté d’accepter ou de refuser une demande d’amitié reçue.',
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
              idDemandeur: { type: 'string', description: 'ID du profil demandeur' },
              action: { type: 'string', enum: ['accepter', 'refuser'], description: 'Action à effectuer' }
            },
            required: ['idDemandeur', 'action']
          }
        }
      }
    },
    responses: {
      200: { description: 'Action réalisée avec succès.' },
      400: { description: 'Requête invalide.' },
      401: { description: 'Non authentifié.' },
      404: { description: 'Demande non trouvée.' },
      500: { description: 'Erreur serveur.' }
    }
  }
});
