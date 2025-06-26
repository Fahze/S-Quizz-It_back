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