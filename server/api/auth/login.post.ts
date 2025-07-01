export default defineEventHandler(async (event) => {

    // On vérifie la méthode de la requête
    assertMethod(event, "POST");

    const body = await readBody(event);

    // On vérifie que le body contient les champs nécessaires
    if (!body.email || !body.password) {
        throw createError({
            statusCode: 400,
            statusMessage: "Email et mot de passe requis.",
        });
    }

    try {
        // On récupère le client Supabase
        const supabase = await useSupabase();

        // On tente de connecter l'utilisateur
        const { data, error } = await supabase.auth.signInWithPassword({
            email: body.email,
            password: body.password,
        });

        if (error) {
            // On log l'erreur pour le debug
            console.error("Erreur lors de la connexion:", error);

            // On renvoie une erreur 401 si les identifiants sont incorrects
            throw createError({
                statusCode: 401,
                statusMessage: "Identifiants incorrects.",
            });
        }

        // On récupère le profil de l'utilisateur connecté
        const profile = await getProfile(data.user.id);

        // On renvoie les données de l'utilisateur connecté
        return {
            user: data.user,
            session: data.session,
            profile
        }
        
    } catch (error: any) {
        // On log l'erreur pour le debug
        console.error("Erreur lors de la connexion:", error);

        // En cas d'erreur, on renvoie une erreur 500
        throw createError({
            statusCode: 500,
            statusMessage: "Erreur lors de la connexion.",
        });
    }


});

defineRouteMeta({
    openAPI: {
        tags: ["auth"],
        summary: "Connexion d'un utilisateur",
        description: "Route pour la connexion des utilisateurs.",
        requestBody: {
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            email: {
                                type: "string",
                                format: "email",
                                description: "L'email de l'utilisateur.",
                            },
                            password: {
                                type: "string",
                                description: "Le mot de passe de l'utilisateur.",
                            },
                        },
                        required: ["email", "password"],
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Connexion réussie.",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                user: {
                                    type: "object",
                                    description: "Les informations de l'utilisateur connecté.",
                                },
                                session: {
                                    type: "object",
                                    description: "La session de l'utilisateur.",
                                },
                                profile: {
                                    type: "object",
                                    description: "Le profil de l'utilisateur.",
                                }
                            },
                        },
                    },
                },
            },
            400: {
                description: "Email et mot de passe requis.",
            },
            401: {
                description: "Identifiants incorrects.",
            },
            500: {
                description: "Erreur lors de la connexion.",
            },
        },
    },
});