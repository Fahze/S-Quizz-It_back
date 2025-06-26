export default defineEventHandler(async (event) => {

    // On verifie la méthode de la requête`
    assertMethod(event, 'GET');

    // On récupère les paramètres de la requête
    
    const query = getQuery(event);

    const niveauDifficulte = query.niveauDifficulte ? parseInt(query.niveauDifficulte as string) : null;

    // On vérifie que le niveau de difficulté est valide

    if (niveauDifficulte !== null && (niveauDifficulte <= 1 || niveauDifficulte >= 3)) {
        console.error(`Niveau de difficulté invalide: ${niveauDifficulte}`);
        throw createError({
            statusCode: 400,
            statusMessage: 'Niveau de difficulté invalide'
        });
    }

    // On récupère les questions depuis la base de données
    const supabase = await useSupabase();

    const { data: questions, error } = await supabase
        .from('question')
        .select(`
            *,
                reponse (
                    id,
                    label
                )
        `)
        .eq('niveauDifficulte', niveauDifficulte);

    if (error) {
        console.error(`Erreur lors de la récupération des questions: ${error.message}`);
        throw createError({
            statusCode: 500,
            statusMessage: `Erreur interne du serveur`
        });
    }

    // Mélange et sélectionne 20 questions aléatoires et choisit le type de question
    const randomQuestions = questions
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map(question => ({
            id: question.id,
            label: question.label,
            niveauDifficulte: question.niveauDifficulte,
            type: Math.random() < 0.5 ? 'qcm' : 'input',
            reponses: question.reponse.map(reponse => ({
                id: reponse.id,
                label: reponse.label
            }))
        }));

    return randomQuestions;
});

defineRouteMeta({
    openAPI: {
        tags: ["questions"],
        summary: "Récupération de questions aléatoires",
        description: "Retourne 20 questions aléatoires selon le niveau de difficulté (paramètre niveauDifficulte).",
        parameters: [
            {
                name: "niveauDifficulte",
                in: "query",
                required: false,
                schema: { type: "integer" },
                description: "Niveau de difficulté des questions (optionnel)."
            }
        ],
        responses: {
            200: {
                description: "Liste de questions formatées.",
                content: {
                    "application/json": {
                        schema: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "number" },
                                    label: { type: "string" },
                                    niveauDifficulte: { type: "number" },
                                    type: { type: "string" },
                                    reponses: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "number" },
                                                label: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            400: {
                description: "Niveau de difficulté invalide.",
            },
            500: {
                description: "Erreur lors de la récupération des questions.",
            },
        },
    },
});
