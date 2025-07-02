export default defineEventHandler(async (event) => {
    assertMethod(event, "POST");
  
    const body = await readBody(event);
    const newUsername : string = body.username;
    const selectedAvatar : number = body.idAvatar;


    if (!newUsername) {
        throw createError({
            statusCode: 400,
            statusMessage: "Nom d'utilisateur requis.",
        });
    }

    try {
        const user = await getUser(event);
        
        if (!user) {
            throw createError({
                statusCode: 401,
                statusMessage: "Utilisateur non authentifié.",
            });
        }

        const supabase = await useSupabase();

        // Mettre à jour le profil de l'utilisateur
        const { error } = await supabase
            .from('profile')
            .update({ pseudo: newUsername,
                avatar: selectedAvatar ?? user.profile.avatar.idAvatar  // Si un nouvel avatar est sélectionné, l'utiliser, sinon garder l'ancien
             })
            .eq('id', user.profile.id);

        if (error) {
            throw createError({
                statusCode: 500,
                statusMessage: "Erreur lors de la mise à jour du profil.",
            });
        }

        return { success: true, message: "Profil mis à jour avec succès." };
    } catch (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Erreur interne du serveur.",
        });
    }

});


defineRouteMeta({
    openAPI: {
        summary: 'Mettre à jour le profil utilisateur',
        description: 'Permet à l’utilisateur connecté de mettre à jour son nom d’utilisateur.',
        tags: ['Profil'],
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
                            username: { type: 'string', description: "Nouveau nom d'utilisateur" },
                            idAvatar: { type: 'number', description: 'ID de l\'avatar sélectionné (optionnel)' }
                        },
                        required: ['username']
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Profil mis à jour avec succès.'
            },
            400: {
                description: "Nom d'utilisateur requis."
            },
            401: {
                description: 'Utilisateur non authentifié.'
            },
            500: {
                description: 'Erreur interne du serveur.'
            }
        }
    }
});