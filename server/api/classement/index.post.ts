import questionService from '~/services/question.service';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const joueurs = await readBody(event);

  return questionService.getClassement(joueurs);
});

defineRouteMeta({
  openAPI: {
    tags: ['classement'],
    summary: "Met à jour le classement et l'ELO des joueurs",
    description:
      "Reçoit un tableau de joueurs avec leur score total, met à jour leur classement et leur ELO, et enregistre l'historique de la partie. Retourne la liste des mises à jour pour chaque joueur.",
    requestBody: {
      description: 'Tableau de joueurs à classer. Chaque joueur doit contenir : idJoueur (number), pseudo (string), totalPoints (number).',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              required: ['idJoueur', 'pseudo', 'totalPoints'],
              properties: {
                idJoueur: { type: 'number', description: 'Identifiant du joueur' },
                pseudo: { type: 'string', description: 'Pseudo du joueur' },
                totalPoints: { type: 'number', description: 'Score total du joueur' },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Liste des mises à jour de classement et ELO pour chaque joueur.',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  idJoueur: { type: 'number' },
                  pseudo: { type: 'string' },
                  classement: { type: 'number' },
                  ancienElo: { type: 'number' },
                  nouveauElo: { type: 'number' },
                  gain: { type: 'number' },
                },
              },
            },
          },
        },
      },
      400: {
        description: 'Le body doit être un tableau de joueurs.',
      },
      500: {
        description: 'Erreur lors de la récupération ou la mise à jour des joueurs.',
      },
    },
  },
});
