export default defineEventHandler(async (event) => {
    assertMethod(event, 'POST');

    const body = await readBody(event);
    const { idQuestion, idReponse, idJoueur, tempsReponse, type, reponseJoueur } = body;

    if (!idQuestion || !idJoueur || isNaN(tempsReponse) || !type) {
        console.error('Champs requis manquants ou invalides', body);
        throw createError({
            statusCode: 400,
            statusMessage: 'Champs requis manquants ou invalides'
        });
    }

    const supabase = await useSupabase();
    let correcte = false;
    let fautesOrthographe = false;
    let distance = 0;
    let malus = 0;
    let bonneReponse: string | null = null;

    const normalize = (str: string) =>
        str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const levenshtein = (a: string, b: string) => {
        const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
            Array(b.length + 1).fill(0)
        );

        for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[a.length][b.length];
    };

    const { data: questionData, error: errorQuestion } = await supabase
        .from('question')
        .select('niveauDifficulte')
        .eq('id', idQuestion)
        .single();

    if (errorQuestion || !questionData) {
        console.error('Erreur récupération niveau difficulté', errorQuestion);
        throw createError({ statusCode: 500, statusMessage: 'Erreur récupération niveau difficulté' });
    }

    const niveauDifficulte = questionData.niveauDifficulte;

    if (type === 'qcm') {
        if (!idReponse) {
            console.error('idReponse requis pour QCM', body);
            throw createError({ statusCode: 400, statusMessage: 'idReponse requis pour QCM' });
        }

        const { data: reponseqcm, error } = await supabase
            .from('questionReponse')
            .select('value, reponse(label)')
            .eq('idQuestion', idQuestion)
            .eq('idReponse', idReponse)
            .single();

        if (error || !reponseqcm) {
            console.error('Erreur récupération réponse QCM', error);
            throw createError({ statusCode: 500, statusMessage: 'Erreur vérification QCM' });
        }

        correcte = reponseqcm?.value === true;
        bonneReponse = reponseqcm.reponse?.label || null;

    } else if (type === 'input') {
        if (!reponseJoueur || typeof reponseJoueur !== 'string') {
            console.error('reponseJoueur est requis pour input', body);
            throw createError({ statusCode: 400, statusMessage: 'reponseJoueur est requis pour input' });
        }

        const { data: repIdData, error: errId } = await supabase
            .from('questionReponse')
            .select('idReponse')
            .eq('idQuestion', idQuestion)
            .eq('value', true)
            .single();

        if (errId || !repIdData) {
            console.error('Erreur récupération réponse correcte', errId);
            throw createError({ statusCode: 500, statusMessage: 'Erreur récupération réponse correcte' });
        }

        const { data: reponseinput, error: errLabel } = await supabase
            .from('reponse')
            .select('label')
            .eq('id', repIdData.idReponse)
            .single();

        if (errLabel || !reponseinput) {
            console.error('Erreur récupération texte réponse', errLabel);
            throw createError({ statusCode: 500, statusMessage: 'Erreur récupération texte réponse' });
        }

        const bonne = normalize(reponseinput.label);
        const joueur = normalize(reponseJoueur);
        distance = levenshtein(bonne, joueur);
        bonneReponse = reponseinput.label;

        let tolerance = 0;
        if (niveauDifficulte === 1) tolerance = 3;
        else if (niveauDifficulte === 2) tolerance = 2;
        else if (niveauDifficulte === 3) tolerance = 0;

        correcte = distance <= tolerance;

        if (correcte && distance > 0) {
            fautesOrthographe = true;
            malus = Math.min(150, distance * 50);
        }
    } else {
        console.error('Type de question invalide', type);
        throw createError({ statusCode: 400, statusMessage: 'Type de question invalide' });
    }

    let malusParSeconde;
    switch (niveauDifficulte) {
        case 1: malusParSeconde = 10; break;
        case 2: malusParSeconde = 15; break;
        case 3: malusParSeconde = 20; break;
        default: malusParSeconde = 15; break;
    }

    let pointsGagnes = 0;
    if (correcte) {
        pointsGagnes = Math.max(100, 1000 - Math.floor(tempsReponse * malusParSeconde));
        pointsGagnes = Math.max(0, pointsGagnes - malus);
    }

    return {
        idJoueur,
        correcte,
        fautesOrthographe,
        distanceLevenshtein: distance,
        malus,
        tempsReponse,
        pointsGagnes,
        bonneReponse
    };
});


// defineRouteMeta({
defineRouteMeta({
  openAPI: {
    tags: ["réponses"],
    summary: "Vérifie la réponse d’un joueur à une question",
    description: "Permet de vérifier si une réponse envoyée par un joueur est correcte (QCM ou texte). Retourne le score, la validité, les fautes d'orthographe éventuelles et la bonne réponse.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["idQuestion", "idJoueur", "tempsReponse", "type"],
            properties: {
              idQuestion: { type: "number" },
              idReponse: { type: "number", nullable: true, description: "Requise pour les QCM" },
              idJoueur: { type: "number" },
              tempsReponse: { type: "number", description: "Temps en secondes" },
              type: { type: "string", enum: ["qcm", "input"] },
              reponseJoueur: { type: "string", nullable: true, description: "Requise pour les questions de type input" }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: "Résultat de la vérification",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                idJoueur: { type: "number" },
                correcte: { type: "boolean" },
                fautesOrthographe: { type: "boolean" },
                distanceLevenshtein: { type: "number" },
                malus: { type: "number" },
                tempsReponse: { type: "number" },
                pointsGagnes: { type: "number" },
                bonneReponse: { type: "string", nullable: true }
              }
            }
          }
        }
      },
      400: {
        description: "Requête invalide (champ manquant ou type invalide)",
      },
      500: {
        description: "Erreur interne lors de la vérification de la réponse",
      }
    }
  }
});
