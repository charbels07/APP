/**
 * Starter word lists for common situations (spec §14.1), used when a family
 * creates a TLA on one of these topics. Words are French ARASAAC keywords; any
 * topic not listed here falls back to suggestions from ARASAAC categories.
 * PLACEHOLDER content — to be reviewed by the speech-language therapist.
 */
export const TLA_SEEDS: Record<string, string[]> = {
  anniversaire: [
    "gâteau d'anniversaire", 'bougie', 'souffler', 'cadeau', 'ouvrir', 'ballon', 'chapeau de fête', 'chanter',
    'fête', 'ami', 'jouer', 'danser', 'bonbon', 'applaudir', 'Joyeux Anniversaire !', 'photo',
  ],
  dentiste: [
    'fauteuil de dentiste', 'dents', 'bouche', 'ouvrir', 'brosse à dents', 'rincer', 'cracher', 'douleur',
    'peur', 'lumière', 'miroir', 'attendre', 'gants', 'masque', 'récompense', 'dentiste',
  ],
  medecin: [
    'médecin', 'stéthoscope', 'thermomètre', 'fièvre', 'douleur', 'toux', 'ventre', 'tête', 'gorge', 'oreille',
    'piqûre', 'médicament', 'peur', 'attendre', 'salle d’attente', 'pansement',
  ],
  plage: [
    'mer', 'sable', 'vague', 'seau', 'pelle', 'château de sable', 'maillot de bain', 'serviette', 'parasol',
    'crème solaire', 'nager', 'se baigner', 'coquillage', 'soleil', 'glace', 'lunettes de soleil',
  ],
  piscine: [
    'maillot de bain', 'bonnet de bain', 'lunettes de natation', 'brassards', 'bouée', 'frite', 'nager', 'sauter',
    'plonger', 'eau', 'froid', 'chaud', 'douche', 'serviette', 'vestiaire', 'sortir de l\'eau',
  ],
  zoo: [
    'lion', 'éléphant', 'girafe', 'singe', 'tigre', 'ours', 'zèbre', 'crocodile', 'serpent', 'pingouin',
    'animal', 'regarder', 'nourrir', 'grand', 'petit', 'peur',
  ],
  parc: [
    'balançoire', 'toboggan', 'bac à sable', 'ballon', 'vélo', 'trottinette', 'courir', 'sauter', 'grimper',
    'glisser', 'pousser', 'mon tour', 'ami', 'jouer', 'haut', 'bas',
  ],
  restaurant: [
    'menu', 'serveur', 'table', 'chaise', 'assiette', 'verre', 'couteau', 'fourchette', 'cuillère', 'eau',
    'pain', 'dessert', 'commander', 'addition', 'délicieux', 'toilettes',
  ],
  supermarche: [
    'caddie', 'panier', 'acheter', 'payer', 'argent', 'caisse', 'fruits', 'légumes', 'pain', 'lait', 'viande',
    'bonbon', 'biscuit', 'jus', 'sac', 'liste',
  ],
  ecole: [
    'maîtresse', 'ami', 'classe', 'livre', 'cahier', 'crayon', 'ciseaux', 'colle', 'lire', 'écrire', 'dessiner',
    'récréation', 'manger', 'sac à dos', 'toilettes', 'lever la main',
  ],
  cinema: [
    'film', 'écran', 'fauteuil', 'billet', 'pop-corn', 'boisson', 'noir', 'bruit', 'regarder', 'rire', 'peur',
    'drôle', 'silence', 'toilettes', 'acheter', 'assis',
  ],
  coiffeur: [
    'coiffeur', 'coiffer', 'couper les cheveux', 'laver les cheveux', 'ciseaux', 'peigne', 'sèche-cheveux',
    'miroir', 'tondeuse à cheveux', 'eau', 'froid', 'chaud', 'court', 'long', 'bruit', 'fini',
  ],
  avion: [
    'avion', 'aéroport', 'valise', 'passeport', 'billet', 'ceinture de sécurité', 'fenêtre', 'pilote',
    'hôtesse de l’air', 'décoller', 'atterrir', 'oreille', 'bruit', 'attendre', 'peur', 'toilettes',
  ],
  voiture: [
    'voiture', 'ceinture de sécurité', 'siège auto', 'conduire', 'route', 'feu tricolore', 'arrêter',
    'vite', 'lentement', 'musique', 'fenêtre', 'chaud', 'froid', 'loin', 'arriver', 'station-service',
  ],
  bain: [
    'baignoire', 'eau', 'savon', 'shampoing', 'éponge', 'serviette', 'jouet', 'mousse', 'laver',
    'rincer', 'sécher', 'chaud', 'froid', 'yeux', 'laver les cheveux', 'sortir',
  ],
  coucher: [
    'lit', 'pyjama', 'dormir', 'histoire', 'livre', 'peluche', 'oreiller', 'couverture', 'lumière', 'éteindre',
    'noir', 'peur', 'câlin', 'bisou', 'bonne nuit', 'fatigué',
  ],
  repas: [
    'manger', 'boire', 'assiette', 'verre', 'cuillère', 'fourchette', 'couteau', 'serviette', 'eau', 'pain',
    'chaud', 'froid', 'délicieux', 'faim', 'soif', 'dessert',
  ],
  ferme: [
    'vache', 'cochon', 'poule', 'mouton', 'cheval', 'chèvre', 'lapin', 'canard', 'tracteur', 'fermier', 'œuf',
    'lait', 'grange', 'nourrir', 'caresser', 'ferme',
  ],
  habillage: [
    "s'habiller", 'pantalon', 'tee-shirt', 'pull', 'chaussettes', 'chaussures', 'veste', 'bonnet', 'robe',
    'jupe', 'mettre', 'enlever', 'boutonner', 'fermeture éclair', 'aide', 'fini',
  ],
};

/** Other ways a family might name these situations. */
export const TLA_SEED_ALIASES: Record<string, string> = {
  anniv: 'anniversaire',
  fete: 'anniversaire',
  birthday: 'anniversaire',
  dentist: 'dentiste',
  docteur: 'medecin',
  doctor: 'medecin',
  beach: 'plage',
  mer: 'plage',
  pool: 'piscine',
  park: 'parc',
  courses: 'supermarche',
  magasin: 'supermarche',
  shop: 'supermarche',
  school: 'ecole',
  classe: 'ecole',
  coiffure: 'coiffeur',
  hairdresser: 'coiffeur',
  aeroport: 'avion',
  voyage: 'avion',
  plane: 'avion',
  car: 'voiture',
  douche: 'bain',
  bath: 'bain',
  dodo: 'coucher',
  dormir: 'coucher',
  bedtime: 'coucher',
  manger: 'repas',
  dejeuner: 'repas',
  diner: 'repas',
  meal: 'repas',
  vetements: 'habillage',
  farm: 'ferme',
  dressing: 'habillage',
};
