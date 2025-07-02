export default defineEventHandler(async (event) => {
    const user = await getUser(event);
    
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Utilisateur non authentifié.',
        });
    }
    
    return user.profile;
  
});


defineRouteMeta({
    openAPI: {
        tags: ['Profil'],
        summary: 'Récupérer le profil de l’utilisateur connecté',
        description: 'Retourne les informations du profil de l’utilisateur actuellement authentifié.',
        responses: {
            200: {
                description: 'Profil de l’utilisateur authentifié.',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', description: 'ID du profil' },
                                pseudo: { type: 'string', description: 'Nom d’utilisateur' },
                                avatar: { type: 'string', description: 'URL de l’avatar' },
                                elo: { type: 'number', description: 'Elo de l’utilisateur' },
                            },
                        },
                    },
                },
            },
            401: {
                description: 'Utilisateur non authentifié.',
            },
        },
    },
});