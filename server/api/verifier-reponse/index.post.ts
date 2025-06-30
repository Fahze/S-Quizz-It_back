import questionService from "~/websockets/question.service";

export default defineEventHandler(async (event) => {
    assertMethod(event, 'POST');

    const body = await readBody(event);

    questionService.checkAnswer(body)
    
});


// defineRouteMeta({
defineRouteMeta({
  openAPI: {
    tags: ["réponses"],
    summary: "Vérifie la réponse d’un joueur à une question",
    description: 
      "Permet de vérifier si une réponse envoyée par un joueur est correcte (QCM ou texte). " +
      "Propriétés attendues dans le body : " +
      "idQuestion (number, requis) : Identifiant de la question à vérifier. " +
      "idReponse (number, optionnel) : Identifiant de la réponse choisie (requis pour les QCM). " +
      "idJoueur (number, requis) : Identifiant du joueur qui répond. " +
      "tempsReponse (number, requis) : Temps mis pour répondre (en secondes). " +
      "type (string, requis) : Type de la question, soit 'qcm' (choix multiple) soit 'input' (réponse texte). " +
      "reponseJoueur (string, optionnel) : Réponse saisie par le joueur (requis pour les questions de type input). " +
      "Retourne le score, la validité, les fautes d'orthographe éventuelles et la bonne réponse.",
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
