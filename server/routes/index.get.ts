export default defineEventHandler(async (event) => {
  // Ecris ton code
  return 'Health check ok !';
  
});

defineRouteMeta({
    openAPI: {
        tags: ["divers"],
        summary: "Health check",
        description: "Vérifie que l’API fonctionne (Health check ok !).",
        responses: {
            200: {
                description: "API opérationnelle.",
                content: {
                    "text/plain": {
                        schema: {
                            type: "string",
                            example: "Health check ok !"
                        }
                    }
                }
            }
        },
    },
});