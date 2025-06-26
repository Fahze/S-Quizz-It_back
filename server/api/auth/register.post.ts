export default defineEventHandler(async (event) => {
  //  On vérifie la méthode de la requête
  assertMethod(event, "POST");

  const body = await readBody(event);
  const email: string = body.email;
  const password: string = body.password;
  const username: string = body.username;

  // On vérifie que le body contient les champs nécessaires
  if (!body.email || !body.password || !body.username) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email, mot de passe et nom d'utilisateur requis.",
    });
  }

  try {
    // On récupère le client Supabase
    const supabase = await useSupabase();

    // On tente de créer l'utilisateur
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      // On log l'erreur pour le debug
      console.error("Erreur lors de l'inscription:", error);

      // On renvoie une erreur 400 si les données sont incorrectes
      throw createError({
        statusCode: 400,
        statusMessage: "Erreur lors de l'inscription.",
      });
    }

    // On crée un profil utilisateur dans la table "profile"
    const { error: profileError } = await supabase.from("profile").insert({
      idProfile: data.user.id,
      pseudo: username,
    });

    if (profileError) {
      // On log l'erreur pour le debug
      console.error("Erreur lors de la création du profil utilisateur:", profileError);

      // On renvoie une erreur 500 si la création du profil échoue
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors de la création du profil utilisateur.",
      });
    }

    // On renvoie les données de l'utilisateur inscrit
    return {
      user: data.user,
      session: data.session,
    };
  } catch (error: any) {
    // On log l'erreur pour le debug
    console.error("Erreur lors de l'inscription:", error);

    // En cas d'erreur, on renvoie une erreur 500
    throw createError({
      statusCode: 500,
      statusMessage: "Erreur lors de l'inscription.",
    });
  }
});

defineRouteMeta({
    openAPI: {
        tags: ["auth"],
        summary: "Inscription d'un nouvel utilisateur",
        description: "Route pour l'inscription d'un nouvel utilisateur (email, mot de passe, pseudo).",
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
                            username: {
                                type: "string",
                                description: "Le pseudo de l'utilisateur.",
                            },
                        },
                        required: ["email", "password", "username"],
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Inscription réussie.",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                user: {
                                    type: "object",
                                    description: "Les informations de l'utilisateur inscrit.",
                                },
                                session: {
                                    type: "object",
                                    description: "La session de l'utilisateur.",
                                },
                            },
                        },
                    },
                },
            },
            400: {
                description: "Email, mot de passe et nom d'utilisateur requis ou erreur d'inscription.",
            },
            500: {
                description: "Erreur lors de la création du profil utilisateur ou de l'inscription.",
            },
        },
    },
});
