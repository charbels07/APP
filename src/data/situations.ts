/**
 * Situation library for TLA creation (spec §14.1, §21 "packs contextuels").
 *
 * Each situation lists what a child needs to take part in it: the objects, the
 * actions and a few comments — and, for activities, the steps in order (they
 * can become a schedule linked to the TLA). Words are French ARASAAC keywords;
 * « mot#id » pins the pictogram when the keyword alone picks another meaning
 * (« moule » is also the mussel, « dé » also "of", « marié » also the Virgin Mary);
 * `scripts/check-situations` style tests make sure each one has a pictogram.
 *
 * `triggers`: words that must ALL appear in the topic the family types. Stems of 5+
 * letters match the start of a word ("prepar" matches « préparer », « prépare »);
 * shorter ones must match a whole word ("mer" is not « merci »).
 * The most specific trigger wins, so « gâteau d'anniversaire à préparer » is baking.
 *
 * PLACEHOLDER content — to be reviewed by the speech-language therapist.
 */
export interface Situation {
  id: string;
  triggers: string[][];
  words: string[];
  steps?: (string | { w: string; timer: number })[];
}

export const SITUATIONS: Situation[] = [
  // ── Cooking ──────────────────────────────────────────────
  {
    id: 'gateau',
    triggers: [['gateau', 'prepar'], ['gateau', 'faire'], ['gateau', 'fais'], ['gateau', 'fait'], ['gateau', 'cuisin'], ['gateau', 'recette'], ['patisserie'], ['bake'], ['cake', 'make']],
    words: [
      'farine', 'œuf', 'sucre', 'beurre', 'lait', 'chocolat', 'levure', 'saladier', 'fouet', 'cuillère en bois',
      'moule#15459', 'balance', 'four', 'mélanger', 'verser', 'casser#8984', 'peser', 'goûter#32340',
    ],
    steps: [
      'se laver les mains', 'tablier', 'peser', 'casser#8984', 'verser', 'mélanger', 'moule#15459',
      { w: 'four', timer: 30 }, 'attendre', 'goûter#32340',
    ],
  },
  {
    id: 'crepes',
    triggers: [['crepe']],
    words: [
      'farine', 'œuf', 'lait', 'sucre', 'beurre', 'saladier', 'fouet', 'louche', 'poêle', 'mélanger', 'verser',
      'retourner', 'chaud', 'confiture', 'chocolat', 'manger', 'délicieux', 'assiette',
    ],
    steps: ['se laver les mains', 'casser#8984', 'verser', 'mélanger', 'poêle', 'retourner', 'assiette', 'manger'],
  },
  {
    id: 'pizza',
    triggers: [['pizza', 'prepar'], ['pizza', 'faire'], ['pizza', 'fais'], ['pizza', 'cuisin']],
    words: [
      'pâte', 'farine', 'tomate', 'fromage', 'jambon', 'champignon', 'olive', 'rouleau à pâtisserie', 'étaler',
      'couper#39429', 'mettre', 'four', 'chaud', 'pizza', 'manger', 'délicieux',
    ],
    steps: ['se laver les mains', 'étaler', 'tomate', 'fromage', 'mettre', { w: 'four', timer: 15 }, 'couper#39429', 'manger'],
  },
  {
    id: 'cuisiner',
    triggers: [['cuisin'], ['recette'], ['cook']],
    words: [
      'tablier', 'saladier', 'cuillère', 'couteau', 'planche à découper', 'casserole', 'poêle', 'four', 'couper#5975',
      'mélanger', 'verser', 'éplucher', 'chaud', 'froid', 'délicieux', 'laver', 'aider',
    ],
    steps: ['se laver les mains', 'tablier', 'couper#5975', 'mélanger', 'cuire', 'goûter#32340', 'laver'],
  },
  {
    id: 'sandwich',
    triggers: [['sandwich'], ['tartine']],
    words: ['pain', 'beurre', 'fromage', 'jambon', 'salade', 'tomate', 'couteau', 'étaler', 'couper#5975', 'assiette', 'manger', 'délicieux'],
    steps: ['se laver les mains', 'pain', 'étaler', 'fromage', 'couper#5975', 'manger'],
  },
  {
    id: 'repas',
    triggers: [['repa'], ['manger'], ['dejeuner'], ['diner'], ['meal'], ['table', 'mettr']],
    words: [
      'manger', 'boire', 'assiette', 'verre', 'cuillère', 'fourchette', 'couteau', 'serviette', 'eau', 'pain',
      'chaud', 'froid', 'délicieux', 'faim', 'soif', 'dessert', 'encore', 'fini',
    ],
  },

  // ── Daily routines ───────────────────────────────────────
  {
    id: 'mains',
    triggers: [['main', 'laver'], ['main', 'lave'], ['hand', 'wash']],
    words: ['robinet', 'eau', 'savon', 'mousse#36910', 'frotter', 'rincer', 'serviette', 'sécher', 'propre', 'sale', 'chaud', 'froid'],
    steps: ['ouvrir le robinet', 'savon', 'frotter', 'rincer', 'fermer le robinet', 'sécher'],
  },
  {
    id: 'dents',
    triggers: [['dent', 'bross'], ['tooth', 'brush'], ['teeth']],
    words: ['brosse à dents', 'dentifrice', 'dents', 'bouche', 'eau', 'verre', 'cracher', 'rincer', 'brosser', 'propre', 'lavabo', 'miroir'],
    steps: ['brosse à dents', 'dentifrice', { w: 'se brosser les dents', timer: 2 }, 'cracher', 'rincer', 'ranger'],
  },
  {
    id: 'bain',
    triggers: [['bain'], ['douche'], ['bath'], ['shower']],
    words: [
      'baignoire', 'douche', 'eau', 'savon', 'shampoing', 'éponge', 'serviette', 'jouet', 'mousse#36910', 'laver',
      'rincer', 'sécher', 'chaud', 'froid', 'yeux', 'sortir',
    ],
    steps: ['se déshabiller', 'baignoire', 'savon', 'shampoing', 'rincer', 'sortir', 'sécher', 'pyjama'],
  },
  {
    id: 'toilettes',
    triggers: [['toilett'], ['pipi'], ['wc'], ['propret']],
    words: ['toilettes', 'faire pipi', 'caca', 'papier toilette', 'tirer la chasse d\'eau', 'baisser#10142', 'remonter#10181', 'se laver les mains', 'savon', 'aide', 'fini', 'attendre'],
    steps: ['baisser#10142', 'toilettes', 'papier toilette', 'tirer la chasse d\'eau', 'remonter#10181', 'se laver les mains'],
  },
  {
    id: 'habillage',
    triggers: [['habill'], ['vetement'], ['dress'], ['cloth']],
    words: [
      'slip', 'chaussettes', 'pantalon', 'tee-shirt', 'pull', 'robe', 'jupe', 'veste', 'chaussures', 'bonnet',
      'mettre', 'enlever', 'boutonner', 'fermeture éclair', 'aide', 'fini',
    ],
    steps: ['slip', 'chaussettes', 'pantalon', 'tee-shirt', 'pull', 'chaussures', 'veste'],
  },
  {
    id: 'coucher',
    triggers: [['couch'], ['dodo'], ['dormir'], ['nuit'], ['bedtime'], ['sleep']],
    words: [
      'lit', 'pyjama', 'dormir', 'histoire#2364', 'livre', 'peluche', 'oreiller', 'couverture', 'lumière', 'éteindre#8027',
      'noir#8643', 'peur', 'câlin', 'bisou', 'bonne nuit', 'fatigué',
    ],
    steps: ['pyjama', 'se brosser les dents', 'toilettes', 'histoire#2364', 'câlin', 'éteindre#8027', 'dormir'],
  },
  {
    id: 'matin',
    triggers: [['matin'], ['reveil'], ['morning']],
    words: ['se réveiller', 'se lever#34525', 'toilettes', 's\'habiller', 'petit-déjeuner', 'lait', 'pain', 'jus', 'se brosser les dents', 'se coiffer', 'chaussures', 'sac à dos'],
    steps: ['se réveiller', 'toilettes', 's\'habiller', 'petit-déjeuner', 'se brosser les dents', 'chaussures', 'sac à dos'],
  },

  // ── Celebrations ─────────────────────────────────────────
  {
    id: 'anniversaire',
    triggers: [['anniversaire'], ['anniv'], ['birthday']],
    words: [
      'gâteau d\'anniversaire', 'bougie', 'souffler', 'cadeau', 'ouvrir', 'ballon', 'chapeau de fête', 'chanter',
      'fête', 'ami', 'jouer', 'danser', 'bonbon', 'applaudir', 'Joyeux Anniversaire !', 'photo',
    ],
    steps: ['arriver', 'jouer', 'gâteau d\'anniversaire', 'chanter', 'souffler', 'cadeau', 'au revoir'],
  },
  {
    id: 'noel',
    triggers: [['noel'], ['christmas']],
    words: ['sapin de Noël', 'Père Noël', 'cadeau', 'boule de Noël', 'étoile', 'guirlande', 'neige', 'décorer', 'ouvrir', 'famille', 'chanter', 'manger', 'content', 'merci'],
  },
  {
    id: 'ramadan',
    triggers: [['ramadan'], ['iftar'], ['ftour']],
    words: ['ramadan', 'lune', 'dattes', 'eau', 'soupe', 'famille', 'manger', 'attendre', 'nuit', 'mosquée', 'prier'],
  },
  {
    id: 'aid',
    triggers: [['aid'], ['eid']],
    words: ['fête', 'famille', 'cadeau', 'vêtements', 'gâteau', 'bonbon', 'argent', 'visiter', 'embrasser', 'content', 'merci', 'manger'],
  },
  {
    id: 'mariage',
    triggers: [['mariage'], ['noce'], ['wedding']],
    words: ['mariée', 'mariés#8256', 'robe', 'costume', 'fleurs', 'gâteau de mariage', 'musique', 'danser', 'applaudir', 'bruyant', 'famille', 'photo', 'manger', 'beau'],
  },

  // ── Outings ──────────────────────────────────────────────
  {
    id: 'piscine',
    triggers: [['piscine'], ['nager'], ['natation'], ['pool'], ['swim'], ['swimming']],
    words: [
      'maillot de bain', 'bonnet de bain', 'lunettes de natation', 'brassards', 'bouée', 'frite', 'nager', 'sauter',
      'plonger', 'eau', 'froid', 'chaud', 'douche', 'serviette', 'vestiaire', 'sortir de l\'eau',
    ],
    steps: ['vestiaire', 'maillot de bain', 'douche', 'brassards', 'nager', 'sortir de l\'eau', 'douche', 'serviette'],
  },
  {
    id: 'plage',
    triggers: [['plage'], ['mer'], ['beach'], ['sea']],
    words: [
      'mer', 'sable', 'vague', 'seau#2725', 'pelle', 'château de sable', 'maillot de bain', 'serviette', 'parasol',
      'crème solaire', 'nager', 'se baigner', 'coquillages', 'soleil', 'glace', 'lunettes de soleil',
    ],
  },
  {
    id: 'parc',
    triggers: [['parc'], ['aire', 'jeu'], ['jardin', 'public'], ['playground'], ['park']],
    words: [
      'balançoire', 'toboggan', 'bac à sable', 'ballon', 'vélo', 'trottinette', 'courir', 'sauter', 'grimper',
      'glisser', 'pousser', 'mon tour', 'ami', 'jouer', 'en haut#5451', 'en bas',
    ],
  },
  {
    id: 'zoo',
    triggers: [['zoo']],
    words: [
      'lion', 'éléphant', 'girafe', 'singe', 'tigre', 'ours', 'zèbre', 'crocodile', 'serpent', 'pingouin',
      'animal', 'regarder', 'nourrir', 'grand', 'petit', 'peur',
    ],
  },
  {
    id: 'ferme',
    triggers: [['ferme', 'animau'], ['ferme', 'visit'], ['farm']],
    words: [
      'vache', 'cochon', 'poule', 'mouton', 'cheval', 'chèvre', 'lapin', 'canard', 'tracteur', 'fermier', 'œuf',
      'lait', 'grange', 'nourrir', 'caresser', 'ferme',
    ],
  },
  {
    id: 'cirque',
    triggers: [['cirque'], ['circus']],
    words: ['chapiteau', 'clown', 'jongleur', 'acrobate', 'trapéziste', 'magicien', 'lion', 'applaudir', 'rire', 'drôle', 'peur', 'musique'],
  },
  {
    id: 'cinema',
    triggers: [['cinema'], ['film'], ['movie']],
    words: ['film', 'écran', 'fauteuil', 'billet', 'pop-corn', 'boisson', 'noir#8643', 'bruyant', 'regarder', 'rire', 'peur', 'drôle', 'silence', 'toilettes', 'acheter', 'assis'],
  },
  {
    id: 'restaurant',
    triggers: [['restaurant']],
    words: ['menu', 'serveur', 'table', 'chaise', 'assiette', 'verre', 'couteau', 'fourchette', 'cuillère', 'eau', 'pain', 'dessert', 'commander', 'addition', 'délicieux', 'toilettes'],
  },
  {
    id: 'courses',
    triggers: [['course'], ['supermarche'], ['magasin'], ['shopping'], ['market']],
    words: ['caddie', 'panier', 'acheter', 'payer', 'argent', 'caisse', 'fruits', 'légumes', 'pain', 'lait', 'viande', 'bonbon', 'biscuit', 'jus', 'sac#27616', 'liste'],
    steps: ['liste', 'caddie', 'fruits', 'légumes', 'lait', 'caisse', 'payer', 'sac#27616'],
  },
  {
    id: 'coiffeur',
    triggers: [['coiff'], ['cheveu', 'coupe'], ['hairdresser'], ['haircut']],
    words: [
      'coiffeur', 'coiffer', 'couper les cheveux', 'laver les cheveux', 'ciseaux', 'peigne', 'sèche-cheveux',
      'miroir', 'tondeuse à cheveux', 'eau', 'froid', 'chaud', 'court', 'long', 'bruyant', 'fini',
    ],
    steps: ['attendre', 'fauteuil', 'laver les cheveux', 'couper les cheveux', 'sèche-cheveux', 'miroir', 'payer'],
  },
  {
    id: 'medecin',
    triggers: [['medecin'], ['docteur'], ['pediatre'], ['doctor']],
    words: [
      'médecin', 'stéthoscope', 'thermomètre', 'fièvre', 'douleur', 'toux', 'ventre', 'tête', 'gorge', 'oreille',
      'piqûre#5601', 'médicament', 'peur', 'attendre', 'salle d\'attente', 'pansement',
    ],
    steps: ['salle d\'attente', 'attendre', 'médecin', 'stéthoscope', 'thermomètre', 'médicament', 'au revoir'],
  },
  {
    id: 'dentiste',
    triggers: [['dentist']],
    words: [
      'fauteuil de dentiste', 'dents', 'bouche', 'ouvrir', 'brosse à dents', 'rincer', 'cracher', 'douleur',
      'peur', 'lumière', 'miroir', 'attendre', 'gants', 'masque', 'récompense', 'dentiste',
    ],
    steps: ['salle d\'attente', 'fauteuil de dentiste', 'ouvrir', 'miroir', 'rincer', 'cracher', 'récompense'],
  },
  {
    id: 'hopital',
    triggers: [['hopital'], ['prise', 'sang'], ['vaccin'], ['hospital']],
    words: ['hôpital', 'infirmière', 'médecin', 'lit', 'piqûre#5601', 'pansement', 'bras', 'douleur', 'peur', 'attendre', 'courageux', 'récompense', 'maman', 'papa', 'fini'],
    steps: ['salle d\'attente', 'attendre', 'infirmière', 'bras', 'piqûre#5601', 'pansement', 'récompense'],
  },
  {
    id: 'ecole',
    triggers: [['ecole'], ['classe'], ['school']],
    words: [
      'maîtresse', 'ami', 'classe', 'livre', 'cahier', 'crayon', 'ciseaux', 'colle', 'lire', 'écrire', 'dessiner',
      'récréation', 'manger', 'sac à dos', 'toilettes', 'lever la main',
    ],
  },
  {
    id: 'bibliotheque',
    triggers: [['bibliotheque'], ['library']],
    words: ['livre', 'histoire#2364', 'lire', 'regarder', 'choisir', 'silence', 'chaise', 'table', 'bibliothécaire', 'rendre'],
  },
  {
    id: 'voiture',
    triggers: [['voiture'], ['trajet'], ['car']],
    words: ['voiture', 'ceinture de sécurité', 'siège auto', 'conduire', 'route', 'feu tricolore', 'arrêter', 'vite', 'lentement', 'musique', 'fenêtre', 'chaud', 'froid', 'loin', 'arriver', 'station-service'],
  },
  {
    id: 'bus',
    triggers: [['bus'], ['autobus']],
    words: ['bus', 'arrêt de bus', 'ticket', 'chauffeur', 'monter#36595', 'descendre#36842', 's\'asseoir#2801', 'être debout', 'fenêtre', 'attendre', 'bouton', 'arriver'],
    steps: ['arrêt de bus', 'attendre', 'monter#36595', 'ticket', 's\'asseoir#2801', 'bouton', 'descendre#36842'],
  },
  {
    id: 'avion',
    triggers: [['avion'], ['aeroport'], ['voyage'], ['plane'], ['airport']],
    words: [
      'avion', 'aéroport', 'valise', 'passeport', 'billet', 'ceinture de sécurité', 'fenêtre', 'pilote',
      'hôtesse de l’air', 'décoller', 'atterrir', 'oreille', 'bruyant', 'attendre', 'peur', 'toilettes',
    ],
    steps: ['valise', 'aéroport', 'passeport', 'attendre', 'avion', 'ceinture de sécurité', 'décoller', 'atterrir'],
  },

  // ── Play and crafts ──────────────────────────────────────
  {
    id: 'peinture',
    triggers: [['peintur'], ['peindr'], ['paint']],
    words: ['peinture', 'pinceau', 'papier', 'tablier', 'eau', 'rouge', 'bleu', 'jaune', 'vert', 'mélanger', 'peindre', 'sale', 'laver', 'beau', 'sécher', 'montrer'],
    steps: ['tablier', 'papier', 'pinceau', 'peindre', 'sécher', 'laver', 'montrer'],
  },
  {
    id: 'pate_a_modeler',
    triggers: [['pate', 'modeler'], ['playdough'], ['plasticine']],
    words: ['pâte à modeler', 'rouler', 'aplatir', 'couper#5975', 'emporte-pièces', 'boule#4603', 'serpent', 'rouge', 'bleu', 'jaune', 'mou', 'dur', 'mon tour', 'ranger'],
  },
  {
    id: 'construction',
    triggers: [['lego'], ['construction'], ['cube'], ['block']],
    words: ['jeu de construction', 'blocs', 'cubes#9115', 'construire', 'tour', 'maison', 'en haut#5451', 'tomber#4582', 'encore', 'mettre', 'enlever', 'rouge', 'bleu', 'aide', 'mon tour', 'ranger', 'bravo'],
  },
  {
    id: 'jeu_societe',
    triggers: [['jeu', 'societe'], ['board', 'game']],
    words: ['jeux de société', 'dé#2731', 'lancer#6542', 'pion', 'cartes#3181', 'mon tour', 'gagner', 'perdre', 'attendre', 'avancer', 'reculer', 'tricher', 'encore', 'bravo', 'fini'],
  },
  {
    id: 'histoire#2364',
    triggers: [['histoire'], ['lire', 'livre'], ['story']],
    words: ['livre', 'histoire#2364', 'lire', 'page', 'tourner la page', 'dessin', 'regarder', 'qui', 'quoi', 'où#7764', 'encore', 'fini', 'drôle', 'peur', 'triste', 'content'],
  },
  {
    id: 'musique',
    triggers: [['musique'], ['chant'], ['music']],
    words: ['musique', 'chanter', 'danser', 'tambour', 'guitare', 'piano', 'xylophone', 'maracas', 'fort#36047', 'doucement#38050', 'écouter', 'applaudir', 'encore', 'stop'],
  },
  {
    id: 'jardinage',
    triggers: [['jardin'], ['plant'], ['fleur'], ['garden']],
    words: ['jardin', 'graine', 'terre', 'pot#3126', 'pelle', 'arrosoir', 'eau', 'fleur', 'plante', 'planter', 'arroser', 'pousser#7002', 'soleil', 'sale', 'gants', 'ver de terre'],
    steps: ['gants', 'pot#3126', 'terre', 'graine', 'planter', 'arroser', 'soleil'],
  },
  {
    id: 'neige',
    triggers: [['neige'], ['ski'], ['snow']],
    words: ['neige', 'froid', 'bonnet', 'gants', 'écharpe', 'manteau', 'bottes', 'bonhomme de neige', 'boule de neige', 'luge', 'glisser', 'tomber#4582', 'jouer', 'chocolat chaud'],
  },
  {
    id: 'pique_nique',
    triggers: [['pique', 'nique'], ['picnic']],
    words: ['pique-nique', 'nappe', 'panier', 'sandwich', 'fruits', 'eau', 'jus', 'herbe', 'arbre', 'soleil', 'manger', 'boire', 'fourmi', 'jouer', 'ballon', 'ranger'],
  },
];
