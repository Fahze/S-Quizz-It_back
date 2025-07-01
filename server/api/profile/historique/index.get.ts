export default defineEventHandler(async (event) => {
  // Vérifie que c'est bien une requête GET
  assertMethod(event, 'GET');

  // Récupère les paramètres de la requête
  const query = getQuery(event);
  const idProfile = query.idProfile ? parseInt(query.idProfile as string) : null;

  if (!idProfile || isNaN(idProfile)) {
    console.error('ID de profil manquant ou invalide');
    throw createError({
      statusCode: 400,
      statusMessage: 'idProfile manquant ou invalide'
    });
  }

  const supabase = await useSupabase();

  const { data: historique, error } = await supabase
    .from('historiquePartie')
    .select('*')
    .eq('idProfile', idProfile)
    .order('datePartie', { ascending: false });

  if (error) {
    console.error('Erreur récupération historique:', error.message);
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des données'
    });
  }

  return historique;
});

// defineRouteMeta({
defineRouteMeta({
  openAPI: {
    tags: ["historique"],
    summary: "Récupère l’historique des parties d’un profil",
    description: "Retourne les scores et dates de toutes les parties jouées par un utilisateur donné.",
    parameters: [
      {
        name: "idProfile",
        in: "query",
        required: true,
        schema: { type: "integer" },
        description: "ID du profil concerné"
      }
    ],
    responses: {
      200: {
        description: "Liste des parties jouées",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  score: { type: "integer" },
                  idProfile: { type: "integer" },
                  datePartie: { type: "string", format: "date" }
                }
              }
            }
          }
        }
      },
      400: { description: "Requête invalide" },
      500: { description: "Erreur interne" }
    }
  }
});
