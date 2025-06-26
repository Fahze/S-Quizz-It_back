export default defineEventHandler(async (event) => {
  
    assertMethod(event, "GET");

    try {
        // On récupère l'utilisateur via l'util
        const user = await getUser(event);

        return user;
    }
    catch (error: any) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error.message);

        throw createError({
            statusCode: 401,
            message: "Utilisateur non authentifié.",
        });
    }
  
});

defineRouteMeta({
    openAPI: {
        tags: ["auth"],
        summary: "Récupération de l'utilisateur authentifié",
        description: "Retourne l'utilisateur actuellement authentifié (via le header Authorization).",
        responses: {
            200: {
                description: "Utilisateur authentifié.",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            description: "L'utilisateur authentifié.",
                        },
                    },
                },
            },
            401: {
                description: "Utilisateur non authentifié.",
            },
        },
    },
});