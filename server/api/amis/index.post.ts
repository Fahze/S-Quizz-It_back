export default defineEventHandler(async (event) => {
  try {
    // Récupère l'utilisateur connecté
    const { profile } = await getUser(event);
    if (!profile) {
      throw createError({ statusCode: 401, statusMessage: 'Utilisateur non authentifié.' });
    }

    const supabase = await useSupabase();
    const body = await readBody(event);

    const pseudoProfileReceveur : string = body.pseudoProfileReceveur;

    if (!pseudoProfileReceveur) {
      throw createError({ statusCode: 400, statusMessage: 'pseudoProfileReceveur requis.' });
    }
    if (pseudoProfileReceveur === profile.pseudo) {
      throw createError({ statusCode: 400, statusMessage: 'Impossible de s\'ajouter soi-même.' });
    }

    // Récupère l'ID du profil receveur à partir de son pseudo
    const { data: receveurProfile, error: receveurError } = await supabase
      .from('profile')
      .select('*')
      .eq('pseudo', pseudoProfileReceveur)
      .single();
      

    if (receveurError || !receveurProfile) {
      throw createError({ statusCode: 404, statusMessage: 'Profil receveur non trouvé.' });
    }

    const idProfileReceveur = receveurProfile.id;

    // Vérifie si une demande existe déjà
    const { data: existing, error: existingError } = await supabase
      .from('amitie')
      .select('*')
      .or(`idProfilDemandeur.eq.${profile.id},idProfileReceveur.eq.${profile.id}`)
      .or(`idProfilDemandeur.eq.${idProfileReceveur},idProfileReceveur.eq.${idProfileReceveur}`)
      .limit(1);
      
    if (existingError) {
      throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la vérification.' });
    }
    if (existing && existing.length > 0) {
      throw createError({ statusCode: 409, statusMessage: 'Une demande ou amitié existe déjà.' });
    }

    // Crée la demande d'amitié
    const { error } = await supabase.from('amitie').insert({
      idProfilDemandeur: profile.id,
      idProfileReceveur,
      status: 'en_attente',
    });
    if (error) {
      throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la création de la demande.' });
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
        summary: 'Envoyer une demande d’amitié',
        description: 'Permet à l’utilisateur connecté d’envoyer une demande d’amitié à un autre utilisateur.',
        tags: ['Amitié'],
        requestBody: {
            content: {
            'application/json': {
                schema: {
                type: 'object',
                properties: {
                    pseudoProfileReceveur: { type: 'string', description: 'Pseudo du profil à qui envoyer la demande' }
                },
                required: ['pseudoProfileReceveur']
                }
            }
            }
        },
        responses: {
            200: { description: 'Demande envoyée avec succès.' },
            400: { description: 'Requête invalide.' },
            401: { description: 'Non authentifié.' },
            409: { description: 'Une demande ou amitié existe déjà.' },
            500: { description: 'Erreur serveur.' }
        }
    }
});