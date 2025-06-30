export default defineEventHandler(async (event) => {
  // On vérifie la méthode de la requête
  assertMethod(event, 'POST');

  // On récupère le refresh token
  const body = await readBody(event);

  const refreshToken: string = body.refresh_token;

  // On vérifie que le refresh token est présent
  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Refresh token requis.',
    });
  }

  try {
    // On récupère le client Supabase
    const supabase = await useSupabase();

    // On tente de rafraîchir la session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      // On log l'erreur pour le debug
      console.error('Erreur lors du rafraîchissement de la session:', error);

      // On renvoie une erreur 401 si la session ne peut pas être rafraîchie
      throw createError({
        statusCode: 401,
        statusMessage: 'Erreur lors du rafraîchissement de la session.',
      });
    }

    const { data: profile, error: profileFetchError } = await supabase.from('profile').select('*').eq('idUser', data.user.id).single();

    if (profileFetchError) {
      // On log l'erreur pour le debug
      console.error('Erreur lors de la récupération du profil utilisateur:', profileFetchError);
      // On renvoie une erreur 500 si la récupération du profil échoue
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération du profil utilisateur.',
      });
    }

    // On renvoie les données de la session rafraîchie
    return {
      user: data.user,
      session: data.session,
    };
  } catch (error: any) {
    // On log l'erreur pour le debug
    console.error('Erreur lors du rafraîchissement de la session:', error);

    // En cas d'erreur, on renvoie une erreur 500
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors du rafraîchissement de la session.',
    });
  }
});

defineRouteMeta({
  openAPI: {
    tags: ['auth'],
    summary: 'Rafraîchissement de session utilisateur',
    description: 'Permet de rafraîchir la session utilisateur via un refresh token.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              refresh_token: {
                type: 'string',
                description: "Le refresh token de l'utilisateur.",
              },
            },
            required: ['refresh_token'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Session rafraîchie avec succès.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  description: "Les informations de l'utilisateur connecté.",
                },
                session: {
                  type: 'object',
                  description: "La session rafraîchie de l'utilisateur.",
                },
              },
            },
          },
        },
      },
      400: {
        description: 'Refresh token requis.',
      },
      401: {
        description: 'Erreur lors du rafraîchissement de la session.',
      },
      500: {
        description: 'Erreur interne lors du rafraîchissement de la session.',
      },
    },
  },
});
