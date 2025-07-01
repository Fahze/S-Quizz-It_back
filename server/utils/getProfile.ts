export default async function getProfile(userId: string) {
    // On récupère le client Supabase
    const supabase = await useSupabase();

    // On tente de récupérer le profil de l'utilisateur
    const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("idUser", userId)
        .single();

    if (error) {
        // On log l'erreur pour le debug
        console.error("Erreur lors de la récupération du profil:", error);

        // On renvoie une erreur 500 si la récupération échoue
        throw createError({
            statusCode: 500,
            statusMessage: "Erreur lors de la récupération du profil.",
        });
    }

    // On renvoie les données du profil
    return data;
}