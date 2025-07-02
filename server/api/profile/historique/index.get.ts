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

  // Récupère l'historique du joueur
  const { data: historique, error: errorHistorique } = await supabase
    .from('historiquePartie')
    .select('*')
    .eq('idProfile', idProfile)
    .order('datePartie', { ascending: false });

  if (errorHistorique) {
    console.error('Erreur récupération historique:', errorHistorique.message);
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des données'
    });
  }

  // Récupération des relations d’amitié avec statut "amie"
  const { data: amisA, error: errorA } = await supabase
    .from('amitie')
    .select('idProfileReceveur')
    .eq('idProfilDemandeur', idProfile)
    .eq('status', 'amis');

  const { data: amisB, error: errorB } = await supabase
    .from('amitie')
    .select('idProfilDemandeur')
    .eq('idProfileReceveur', idProfile)
    .eq('status', 'amis');

  if (errorA || errorB) {
    console.error('Erreur récupération amitiés:', errorA || errorB);
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur récupération des relations amicales'
    });
  }

  const amisIds = [
    ...amisA.map(a => a.idProfileReceveur),
    ...amisB.map(b => b.idProfilDemandeur)
  ];

  let historiqueAmie = [];

  if (amisIds.length > 0) {
    const { data: historiqueAmisData, error: errorAmisHist } = await supabase
      .from('historiquePartie')
      .select('*')
      .in('idProfile', amisIds)
      .order('datePartie', { ascending: false });

    if (errorAmisHist) {
      console.error('Erreur récupération historique amis:', errorAmisHist.message);
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur récupération historique des amis'
      });
    }

    historiqueAmie = historiqueAmisData;
  }

  return {
    historique,
    historiqueAmie
  };
});


// defineRouteMeta({
defineRouteMeta({
  openAPI: {
    tags: ["historique"],
    summary: "Récupère l’historique des parties d’un profil et de ses amis",
    description: "Retourne l'historique des parties jouées par un utilisateur donné, ainsi que celles de ses amis dont l'amitié est validée (statut = 'amie').",
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
        description: "Historique personnel et historique des amis",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                historique: {
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
                },
                historiqueAmie: {
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
          }
        }
      },
      400: { description: "Requête invalide (idProfile manquant ou invalide)" },
      500: { description: "Erreur interne (problème de base de données)" }
    }
  }
});
