import questionService from '~/services/question.service';

export default defineEventHandler(async (event) => {
  // On verifie la méthode de la requête`
  assertMethod(event, 'GET');

  // On récupère les paramètres de la requête
  const query = getQuery(event);
  const niveauDifficulte = query.niveauDifficulte ? parseInt(query.niveauDifficulte as string) : null;

  questionService.getQuestions(niveauDifficulte);
});

defineRouteMeta({
  openAPI: {
    tags: ['questions'],
    summary: 'Récupération de questions aléatoires',
    description: 'Retourne 20 questions aléatoires selon le niveau de difficulté (paramètre niveauDifficulte).',
    parameters: [
      {
        name: 'niveauDifficulte',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
        description: 'Niveau de difficulté des questions (optionnel).',
      },
    ],
    responses: {
      200: {
        description: 'Liste de questions formatées.',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  label: { type: 'string' },
                  niveauDifficulte: { type: 'number' },
                  type: { type: 'string' },
                  reponses: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        label: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: 'Niveau de difficulté invalide.',
      },
      500: {
        description: 'Erreur lors de la récupération des questions.',
      },
    },
  },
});
