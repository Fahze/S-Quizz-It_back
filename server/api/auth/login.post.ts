export default defineEventHandler(async (event) => {

    // On vérifie la méthode de la requête
    assertMethod(event, "POST");

    const body = await readBody(event);

    console.log("Tentative de connexion avec les données:", body.email);

    // On vérifie que le body contient les champs nécessaires
    if (!body.email || !body.password) {
        throw createError({
            statusCode: 400,
            statusMessage: "Email et mot de passe requis.",
        });
    }

    try {
        // On récupère le client Supabase
        const supabase = await useSupabase(event);

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

        // On renvoie les données de l'utilisateur connecté
        return {
            user: data.user,
            session: data.session,
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