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
