export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const joueurs = await readBody(event);

  if (!Array.isArray(joueurs)) {
    throw createError({ statusCode: 400, statusMessage: 'Le body doit être un tableau de joueurs.' });
  }

  const supabase = await useSupabase();

  const { data: joueursExistants, error } = await supabase
    .from('profile')
    .select('id, pseudo, elo');

  if (error || !joueursExistants) {
    console.error('Erreur récupération des joueurs', error);
    throw createError({ statusCode: 500, statusMessage: 'Erreur récupération ELO joueurs' });
  }

  const classement = [...joueurs].sort((a, b) => b.totalPoints - a.totalPoints);

  const updates = [];

  for (let i = 0; i < classement.length; i++) {
    const joueur = classement[i];

    const joueurExistant = joueursExistants.find(j => j.id === joueur.idJoueur);
    if (!joueurExistant) {
      console.warn(`ID ${joueur.idJoueur} non trouvé dans la table profile`);
      continue;
    }

    const isFirst = i === 0;
    const gain = isFirst ? 30 : -10;
    const nouveauElo = Math.max(0, joueurExistant.elo + gain);

    const { error: updateError } = await supabase
      .from('profile')
      .update({ elo: nouveauElo })
      .eq('id', joueur.idJoueur);

    if (updateError) {
      console.error(`Erreur mise à jour ELO pour ${joueur.pseudo}`, updateError);
      continue;
    }

    // ✅ INSERT dans la table historiquePartie
    const { error: insertError } = await supabase
      .from('historiquePartie')
      .insert({
        score: joueur.totalPoints,
        idProfile: joueur.idJoueur,
        // datePartie sera automatique grâce à DEFAULT now()
      });

    if (insertError) {
      console.error(`Erreur insertion historiquePartie pour ${joueur.pseudo}`, insertError);
      continue;
    }

    updates.push({
      idJoueur: joueur.idJoueur,
      pseudo: joueur.pseudo,
      classement: i + 1,
      ancienElo: joueurExistant.elo,
      nouveauElo,
      gain
    });
  }

  return updates;
});


defineRouteMeta({
  openAPI: {
    tags: ["classement"],
    summary: "Met à jour le classement et l'ELO des joueurs",
    description:
      "Reçoit un tableau de joueurs avec leur score total, met à jour leur classement et leur ELO, et enregistre l'historique de la partie. Retourne la liste des mises à jour pour chaque joueur.",
    requestBody: {
      description: "Tableau de joueurs à classer. Chaque joueur doit contenir : idJoueur (number), pseudo (string), totalPoints (number).",
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              required: ["idJoueur", "pseudo", "totalPoints"],
              properties: {
                idJoueur: { type: "number", description: "Identifiant du joueur" },
                pseudo: { type: "string", description: "Pseudo du joueur" },
                totalPoints: { type: "number", description: "Score total du joueur" }
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: "Liste des mises à jour de classement et ELO pour chaque joueur.",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  idJoueur: { type: "number" },
                  pseudo: { type: "string" },
                  classement: { type: "number" },
                  ancienElo: { type: "number" },
                  nouveauElo: { type: "number" },
                  gain: { type: "number" }
                }
              }
            }
          }
        }
      },
      400: {
        description: "Le body doit être un tableau de joueurs.",
      },
      500: {
        description: "Erreur lors de la récupération ou la mise à jour des joueurs.",
      }
    }
  }
});