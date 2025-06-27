/* import { stripHtml } from 'string-strip-html';
 */
export default defineEventHandler(async (event) => {
    assertMethod(event, 'POST');
    
    const body = await readBody(event);
    const { idQuestion, idReponse, idJoueur, tempsReponse, type, reponseJoueur } = body;

    if (!idQuestion || !idJoueur || isNaN(tempsReponse) || !type) {
        console.error('Champs requis manquants ou invalides:', body);
        throw createError({
            statusCode: 400,
            statusMessage: 'Champs requis manquants ou invalides'
        });
    }

    const supabase = await useSupabase(event);
    let correcte = false;

    console.log(`Vérification de la réponse pour la question ${idQuestion}, type: ${type}, idReponse: ${idReponse}`);
    if (type === 'qcm') {
        // Vérification pour les questions de type QCM
        if (!idReponse) {
            console.error('idReponse requis pour QCM');
            throw createError({ statusCode: 400, statusMessage: 'idReponse requis pour QCM' });
        }

        const { data: reponseqcm, error } = await supabase
            .from('questionReponse')
            .select('value')
            .eq('idQuestion', idQuestion)
            .eq('idReponse', idReponse)
            .single();

        if (error) {
            console.error('Erreur lors de la vérification de la réponse QCM:', error.message);
            throw createError({ statusCode: 500, statusMessage: 'Erreur vérification QCM' });
        }


        correcte = reponseqcm.value === true;

    } else if (type === 'input') {
        // Vérification pour les questions de type input
        if (!reponseJoueur || typeof reponseJoueur !== 'string') {
            console.error('reponseJoueur est requis pour input');
            throw createError({ statusCode: 400, statusMessage: 'reponseJoueur est requis pour input' });
        }

        const { data:reponseinput, error } = await supabase
            .from('reponse')
            .select('label')
            .eq('id', (await supabase
                .from('questionReponse')
                .select('idReponse')
                .eq('idQuestion', idQuestion)
                .eq('value', true)
                .single()).data.idReponse)
            .single();

        if (error || !reponseinput) {
            console.error('Erreur lors de la récupération de la réponse input:', error?.message || 'Aucune donnée trouvée');
            throw createError({ statusCode: 500, statusMessage: 'Erreur vérification input' });
        }

        // Comparaison insensible à la casse et aux accents
        const normalize = (str: string) =>
            str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        correcte = normalize(reponseinput.label) === normalize(reponseJoueur);
    } else {
        console.error('Type de question invalide:', type);
        throw createError({ statusCode: 400, statusMessage: 'Type de question invalide' });
    }

    // Calcul score
    let pointsGagnes = 0;
    if (correcte) {
        pointsGagnes = Math.max(100, 1000 - Math.floor(tempsReponse * 10));
    }

    return {
        idJoueur,
        correcte,
        tempsReponse,
        pointsGagnes
    };
});
