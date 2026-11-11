/**
 * Situation library for TLA creation (spec §14.1, §21 "packs contextuels").
 *
 * Each situation lists what a child needs to take part in it: the objects, the
 * actions and a few comments — and, for activities, the steps in order (they
 * can become a schedule linked to the TLA). Words are French keywords of the pictogram library;
 * « mot#bibliothèque/nom » pins the pictogram (its key in the library) when the keyword alone
 * picks another meaning (« moule » is also the mussel, « dé » also "of");
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
      'moule#mulberry/cake_tin', 'balance', 'four', 'mélanger', 'verser', 'casser#mulberry/break_egg_,_to', 'peser', 'goûter#mulberry/taste_,_to',
    ],
    steps: [
      'se laver les mains', 'tablier', 'peser', 'casser#mulberry/break_egg_,_to', 'verser', 'mélanger', 'moule#mulberry/cake_tin',
      { w: 'four', timer: 30 }, 'attendre', 'goûter#mulberry/taste_,_to',
    ],
  },
  {
    id: 'crepes',
    triggers: [['crepe']],
    words: [
      'farine', 'œuf', 'lait', 'sucre', 'beurre', 'saladier', 'fouet', 'louche', 'poêle', 'mélanger', 'verser',
      'retourner', 'chaud', 'confiture', 'chocolat', 'manger', 'délicieux', 'assiette',
    ],
    steps: ['se laver les mains', 'casser#mulberry/break_egg_,_to', 'verser', 'mélanger', 'poêle', 'retourner', 'assiette', 'manger'],
  },
  {
    id: 'pizza',
    triggers: [['pizza', 'prepar'], ['pizza', 'faire'], ['pizza', 'fais'], ['pizza', 'cuisin']],
    words: [
      'pâte', 'farine', 'tomate', 'fromage', 'jambon', 'champignon', 'olive', 'rouleau à pâtisserie', 'étaler',
      'couper#mulberry/cut_,_to', 'mettre', 'four', 'chaud', 'pizza', 'manger', 'délicieux',
    ],
    steps: ['se laver les mains', 'étaler', 'tomate', 'fromage', 'mettre', { w: 'four', timer: 15 }, 'couper#mulberry/cut_,_to', 'manger'],
  },
  {
    id: 'cuisiner',
    triggers: [['cuisin'], ['recette'], ['cook']],
    words: [
      'tablier', 'saladier', 'cuillère', 'couteau', 'planche à découper', 'casserole', 'poêle', 'four', 'couper#mulberry/cut_,_to',
      'mélanger', 'verser', 'éplucher', 'chaud', 'froid', 'délicieux', 'laver', 'aider',
    ],
    steps: ['se laver les mains', 'tablier', 'couper#mulberry/cut_,_to', 'mélanger', 'cuire', 'goûter#mulberry/taste_,_to', 'laver'],
  },
  {
    id: 'sandwich',
    triggers: [['sandwich'], ['tartine']],
    words: ['pain', 'beurre', 'fromage', 'jambon', 'salade', 'tomate', 'couteau', 'étaler', 'couper#mulberry/cut_,_to', 'assiette', 'manger', 'délicieux'],
    steps: ['se laver les mains', 'pain', 'étaler', 'fromage', 'couper#mulberry/cut_,_to', 'manger'],
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
    words: ['robinet', 'eau', 'savon', 'mousse#mulberry/bubble_bath', 'frotter', 'rincer', 'serviette', 'sécher', 'propre', 'sale', 'chaud', 'froid'],
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
      'baignoire', 'douche', 'eau', 'savon', 'shampoing', 'éponge', 'serviette', 'jouet', 'mousse#mulberry/bubble_bath', 'laver',
      'rincer', 'sécher', 'chaud', 'froid', 'yeux', 'sortir',
    ],
    steps: ['se déshabiller', 'baignoire', 'savon', 'shampoing', 'rincer', 'sortir', 'sécher', 'pyjama'],
  },
  {
    id: 'toilettes',
    triggers: [['toilett'], ['pipi'], ['wc'], ['propret']],
    words: ['toilettes', 'faire pipi', 'caca', 'papier toilette', 'tirer la chasse d\'eau', 'baisser', 'remonter', 'se laver les mains', 'savon', 'aide', 'fini', 'attendre'],
    steps: ['baisser', 'toilettes', 'papier toilette', 'tirer la chasse d\'eau', 'remonter', 'se laver les mains'],
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
      'lit', 'pyjama', 'dormir', 'histoire#mulberry/read_book_,_to', 'livre', 'peluche', 'oreiller', 'couverture', 'lumière', 'éteindre#mulberry/turn_off_,_to',
      'noir#mulberry/black', 'peur', 'câlin', 'bisou', 'bonne nuit', 'fatigué',
    ],
    steps: ['pyjama', 'se brosser les dents', 'toilettes', 'histoire#mulberry/read_book_,_to', 'câlin', 'éteindre#mulberry/turn_off_,_to', 'dormir'],
  },
  {
    id: 'matin',
    triggers: [['matin'], ['reveil'], ['morning']],
    words: ['se réveiller', 'se lever#mulberry/get_up_,_to', 'toilettes', 's\'habiller', 'petit-déjeuner', 'lait', 'pain', 'jus', 'se brosser les dents', 'se coiffer', 'chaussures', 'sac à dos'],
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
    words: ['mariée', 'mariés#openmoji/1F492', 'robe', 'costume', 'fleurs', 'gâteau de mariage', 'musique', 'danser', 'applaudir', 'bruyant', 'famille', 'photo', 'manger', 'beau'],
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
      'mer', 'sable', 'vague', 'seau#mulberry/bucket', 'pelle', 'château de sable', 'maillot de bain', 'serviette', 'parasol',
      'crème solaire', 'nager', 'se baigner', 'coquillages', 'soleil', 'glace', 'lunettes de soleil',
    ],
  },
  {
    id: 'parc',
    triggers: [['parc'], ['aire', 'jeu'], ['jardin', 'public'], ['playground'], ['park']],
    words: [
      'balançoire', 'toboggan', 'bac à sable', 'ballon', 'vélo', 'trottinette', 'courir', 'sauter', 'grimper',
      'glisser', 'pousser', 'mon tour', 'ami', 'jouer', 'en haut#mulberry/up', 'en bas',
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
    words: ['film', 'écran', 'fauteuil', 'billet', 'pop-corn', 'boisson', 'noir#mulberry/black', 'bruyant', 'regarder', 'rire', 'peur', 'drôle', 'silence', 'toilettes', 'acheter', 'assis'],
  },
  {
    id: 'restaurant',
    triggers: [['restaurant']],
    words: ['menu', 'serveur', 'table', 'chaise', 'assiette', 'verre', 'couteau', 'fourchette', 'cuillère', 'eau', 'pain', 'dessert', 'commander', 'addition', 'délicieux', 'toilettes'],
  },
  {
    id: 'courses',
    triggers: [['course'], ['supermarche'], ['magasin'], ['shopping'], ['market']],
    words: ['caddie', 'panier', 'acheter', 'payer', 'argent', 'caisse', 'fruits', 'légumes', 'pain', 'lait', 'viande', 'bonbon', 'biscuit', 'jus', 'sac#mulberry/sack', 'liste'],
    steps: ['liste', 'caddie', 'fruits', 'légumes', 'lait', 'caisse', 'payer', 'sac#mulberry/sack'],
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
      'piqûre#mulberry/syringe', 'médicament', 'peur', 'attendre', 'salle d\'attente', 'pansement',
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
    words: ['hôpital', 'infirmière', 'médecin', 'lit', 'piqûre#mulberry/syringe', 'pansement', 'bras', 'douleur', 'peur', 'attendre', 'courageux', 'récompense', 'maman', 'papa', 'fini'],
    steps: ['salle d\'attente', 'attendre', 'infirmière', 'bras', 'piqûre#mulberry/syringe', 'pansement', 'récompense'],
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
    words: ['livre', 'histoire#mulberry/read_book_,_to', 'lire', 'regarder', 'choisir', 'silence', 'chaise', 'table', 'bibliothécaire', 'rendre'],
  },
  {
    id: 'voiture',
    triggers: [['voiture'], ['trajet'], ['car']],
    words: ['voiture', 'ceinture de sécurité', 'siège auto', 'conduire', 'route', 'feu tricolore', 'arrêter', 'vite', 'lentement', 'musique', 'fenêtre', 'chaud', 'froid', 'loin', 'arriver', 'station-service'],
  },
  {
    id: 'bus',
    triggers: [['bus'], ['autobus']],
    words: ['bus', 'arrêt de bus', 'ticket', 'chauffeur', 'monter#mulberry/climb_up_,_to', 'descendre#mulberry/climb_down_,_to', 's\'asseoir#mulberry/sit_,_to', 'être debout', 'fenêtre', 'attendre', 'bouton', 'arriver'],
    steps: ['arrêt de bus', 'attendre', 'monter#mulberry/climb_up_,_to', 'ticket', 's\'asseoir#mulberry/sit_,_to', 'bouton', 'descendre#mulberry/climb_down_,_to'],
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
    words: ['pâte à modeler', 'rouler', 'aplatir', 'couper#mulberry/cut_,_to', 'emporte-pièces', 'boule', 'serpent', 'rouge', 'bleu', 'jaune', 'mou', 'dur', 'mon tour', 'ranger'],
  },
  {
    id: 'construction',
    triggers: [['lego'], ['construction'], ['cube'], ['block']],
    words: ['jeu de construction', 'blocs', 'cubes#mulberry/bricks', 'construire', 'tour', 'maison', 'en haut#mulberry/up', 'tomber#mulberry/fall_over_,_to', 'encore', 'mettre', 'enlever', 'rouge', 'bleu', 'aide', 'mon tour', 'ranger', 'bravo'],
  },
  {
    id: 'jeu_societe',
    triggers: [['jeu', 'societe'], ['board', 'game']],
    words: ['jeux de société', 'dé#openmoji/1F3B2', 'lancer#openmoji/1F3B2', 'pion', 'cartes#mulberry/playing_cards', 'mon tour', 'gagner', 'perdre', 'attendre', 'avancer', 'reculer', 'tricher', 'encore', 'bravo', 'fini'],
  },
  {
    id: 'histoire#mulberry/read_book_,_to',
    triggers: [['histoire'], ['lire', 'livre'], ['story']],
    words: ['livre', 'histoire#mulberry/read_book_,_to', 'lire', 'page', 'tourner la page', 'dessin', 'regarder', 'qui', 'quoi', 'où#mulberry/where', 'encore', 'fini', 'drôle', 'peur', 'triste', 'content'],
  },
  {
    id: 'musique',
    triggers: [['musique'], ['chant'], ['music']],
    words: ['musique', 'chanter', 'danser', 'tambour', 'guitare', 'piano', 'xylophone', 'maracas', 'fort#mulberry/loud', 'doucement#mulberry/quiet', 'écouter', 'applaudir', 'encore', 'stop'],
  },
  {
    id: 'jardinage',
    triggers: [['jardin'], ['plant'], ['fleur'], ['garden']],
    words: ['jardin', 'graine', 'terre', 'pot#mulberry/plant', 'pelle', 'arrosoir', 'eau', 'fleur', 'plante', 'planter', 'arroser', 'pousser#mulberry/push_,_to', 'soleil', 'sale', 'gants', 'ver de terre'],
    steps: ['gants', 'pot#mulberry/plant', 'terre', 'graine', 'planter', 'arroser', 'soleil'],
  },
  {
    id: 'neige',
    triggers: [['neige'], ['ski'], ['snow']],
    words: ['neige', 'froid', 'bonnet', 'gants', 'écharpe', 'manteau', 'bottes', 'bonhomme de neige', 'boule de neige', 'luge', 'glisser', 'tomber#mulberry/fall_over_,_to', 'jouer', 'chocolat chaud'],
  },
  {
    id: 'pique_nique',
    triggers: [['pique', 'nique'], ['picnic']],
    words: ['pique-nique', 'nappe', 'panier', 'sandwich', 'fruits', 'eau', 'jus', 'herbe', 'arbre', 'soleil', 'manger', 'boire', 'fourmi', 'jouer', 'ballon', 'ranger'],
  },
];
