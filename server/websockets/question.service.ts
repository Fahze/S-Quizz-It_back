import { AnswerResult, Question } from './websocket.state';

class QuestionService {
  async getQuestions(niveauDifficulte): Promise<Question[]> {
    if (niveauDifficulte !== null && (niveauDifficulte <= 1 || niveauDifficulte >= 3)) {
      console.error(`Niveau de difficulté invalide: ${niveauDifficulte}`);
      throw createError({
        statusCode: 400,
        statusMessage: 'Niveau de difficulté invalide',
      });
    }

    // On récupère les questions depuis la base de données
    const supabase = await useSupabase();

    const { data: questions, error } = await supabase.from('question').select('*, reponse(id, label)').eq('niveauDifficulte', niveauDifficulte);

    if (error) {
      console.error(`Erreur lors de la récupération des questions: ${error.message}`);
      throw createError({
        statusCode: 500,
        statusMessage: `Erreur interne du serveur`,
      });
    }

    // Mélange et sélectionne 20 questions aléatoires et choisit le type de question
    const randomQuestions = questions
      .toSorted(() => Math.random() - 0.5)
      .slice(0, 20)
      .map((question) => ({
        id: question.id,
        label: question.label,
        niveauDifficulte: question.niveauDifficulte,
        type: Math.random() < 0.5 ? 'qcm' : 'input',
        reponses: question.reponse.map((reponse) => ({
          id: reponse.id,
          label: reponse.label,
        })),
      }));

    return randomQuestions;
  }

  async checkAnswer(body): Promise<AnswerResult> {
    const { idQuestion, idReponse, idJoueur, tempsReponse, type, reponseJoueur } = body;

    this.validateCheckAnswerInput(idQuestion, idJoueur, tempsReponse, type, body);

    const supabase = await useSupabase();
    const niveauDifficulte = await this.getNiveauDifficulte(supabase, idQuestion);

    let result: {
      correcte: boolean;
      fautesOrthographe: boolean;
      distance: number;
      malus: number;
      bonneReponse: string | null;
    };

    if (type === 'qcm') {
      result = await this.handleQcmType(supabase, idQuestion, idReponse, body);
    } else if (type === 'input') {
      result = await this.handleInputType(supabase, idQuestion, reponseJoueur, niveauDifficulte, body);
    } else {
      console.error('Type de question invalide', type);
      throw createError({ statusCode: 400, statusMessage: 'Type de question invalide' });
    }

    const malusParSeconde = this.getMalusParSeconde(niveauDifficulte);
    let pointsGagnes = 0;
    if (result.correcte) {
      pointsGagnes = Math.max(100, 1000 - Math.floor(tempsReponse * malusParSeconde));
      pointsGagnes = Math.max(0, pointsGagnes - result.malus);
    }

    return {
      idJoueur,
      correcte: result.correcte,
      fautesOrthographe: result.fautesOrthographe,
      distanceLevenshtein: result.distance,
      malus: result.malus,
      tempsReponse,
      pointsGagnes,
      bonneReponse: result.bonneReponse,
    };
  }

  private validateCheckAnswerInput(idQuestion: any, idJoueur: any, tempsReponse: any, type: any, body: any) {
    if (!idQuestion || !idJoueur || isNaN(tempsReponse) || !type) {
      console.error('Champs requis manquants ou invalides', body);
      throw createError({
        statusCode: 400,
        statusMessage: 'Champs requis manquants ou invalides',
      });
    }
  }

  private async getNiveauDifficulte(supabase: any, idQuestion: any): Promise<number> {
    const { data: questionData, error: errorQuestion } = await supabase.from('question').select('niveauDifficulte').eq('id', idQuestion).single();
    if (errorQuestion || !questionData) {
      console.error('Erreur récupération niveau difficulté', errorQuestion);
      throw createError({ statusCode: 500, statusMessage: 'Erreur récupération niveau difficulté' });
    }
    return questionData.niveauDifficulte;
  }

  private async handleQcmType(supabase: any, idQuestion: any, idReponse: any, body: any) {
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

    return {
      correcte: reponseqcm?.value === true,
      fautesOrthographe: false,
      distance: 0,
      malus: 0,
      bonneReponse: reponseqcm.reponse?.label || null,
    };
  }

  private async handleInputType(supabase: any, idQuestion: any, reponseJoueur: any, niveauDifficulte: number, body: any) {
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

    const { data: reponseinput, error: errLabel } = await supabase.from('reponse').select('label').eq('id', repIdData.idReponse).single();

    if (errLabel || !reponseinput) {
      console.error('Erreur récupération texte réponse', errLabel);
      throw createError({ statusCode: 500, statusMessage: 'Erreur récupération texte réponse' });
    }

    const bonne = this.normalize(reponseinput.label);
    const joueur = this.normalize(reponseJoueur);
    const distance = this.levenshtein(bonne, joueur);
    const bonneReponse = reponseinput.label;

    let tolerance = 0;
    if (niveauDifficulte === 1) tolerance = 3;
    else if (niveauDifficulte === 2) tolerance = 2;
    else if (niveauDifficulte === 3) tolerance = 0;

    const correcte = distance <= tolerance;
    let fautesOrthographe = false;
    let malus = 0;
    if (correcte && distance > 0) {
      fautesOrthographe = true;
      malus = Math.min(150, distance * 50);
    }

    return {
      correcte,
      fautesOrthographe,
      distance,
      malus,
      bonneReponse,
    };
  }

  private normalize(str: string) {
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private levenshtein(a: string, b: string) {
    const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[a.length][b.length];
  }

  private getMalusParSeconde(niveauDifficulte: number) {
    switch (niveauDifficulte) {
      case 1:
        return 10;
      case 2:
        return 15;
      case 3:
        return 20;
      default:
        return 15;
    }
  }
}

export default new QuestionService();
