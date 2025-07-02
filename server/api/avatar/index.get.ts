export default defineEventHandler(async (event) => {
  
    try {
  
        // On récupère le client Supabase
        const supabase = await useSupabase();
  
        // On tente de récupérer la liste des avatars
        const { data, error } = await supabase
            .from('avatar')
            .select('*')
  
        if (error || !data) {
            throw createError({ statusCode: 404, statusMessage: 'Avatar non trouvé.' });
        }
  
        // On renvoie les données de l'avatar
        return data;

    }catch (error) {
        console.error('Erreur lors de la récupération de l\'avatar:', error);
        throw createError({ statusCode: 500, statusMessage: 'Erreur interne du serveur.' });
    }
  
});


defineRouteMeta({
    openAPI: {
        summary: 'Récupère la liste des avatars',
        tags: ['Avatar'],
        responses: {
            200: {
                description: 'Liste des avatars récupérée avec succès',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    idAvatar: { type: 'integer' },
                                    urlavatar: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            },
            404: {
                description: 'Aucun avatar trouvé'
            },
            500: {
                description: 'Erreur interne du serveur'
            }
        }
    }
})