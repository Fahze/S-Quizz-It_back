export default defineEventHandler(async (event) => {
    // Vérifie que c’est une requête POST
    assertMethod(event, 'POST');

     // On récupère les paramètres de la requête

    const query = getQuery(event);
        
    const idQuestion = query.idQuestion ? parseInt(query.idQuestion as string) : null;
    const idReponse = query.idReponse ? parseInt(query.idReponse as string) : null;

    // Validation des données
    if (!idQuestion || !idReponse) {
        console.error('idQuestion et idReponse sont requis');
        throw createError({
            statusCode: 400,
            statusMessage: 'idQuestion et idReponse sont requis'
        });
    }

    // On récupère les questions depuis la base de données
    const supabase = await useSupabase(event);

    // On vérifie si la réponse est correcte dans la table questionReponse
    const { data: verifie, error } = await supabase
        .from('questionReponse')
        .select('value')
        .eq('idQuestion', idQuestion)
        .eq('idReponse', idReponse)
        .single();

    if (error) {
        console.error('Erreur lors de la vérification de la réponse:', error.message);
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur interne du serveur'
        });
    }

    return {
        correcte: verifie?.value === true
    };
});
