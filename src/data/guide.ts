/**
 * In-app guide, from A to Z (opened from the universal bar, Settings, and the
 * welcome card on first launch). Two tracks: first steps (families, new users)
 * and caregivers & professionals. Each chapter can offer a "Try it" action that
 * closes the guide and opens the place it talks about.
 *
 * Button names are quoted exactly as they appear in the interface (src/i18n/ui.ts):
 * keep both in sync when a label changes.
 */
import type { UiLang } from '../model/types';
import type { IconName } from '../ui/Icon';

export type GuideAction =
  | 'demo'
  | 'folder'
  | 'search'
  | 'lang'
  | 'help'
  | 'tla'
  | 'schedule'
  | 'timer'
  | 'apps'
  | 'keyboard'
  | 'caregiver'
  | 'settings'
  | 'newTla'
  | 'model'
  | 'print';

export type GuideTrack = 'start' | 'pro';

export interface GuideChapter {
  id: string;
  track: GuideTrack;
  icon: IconName;
  title: Record<UiLang, string>;
  steps: Record<UiLang, string[]>;
  tip?: Record<UiLang, string>;
  action?: GuideAction;
}

export const GUIDE_TRACK_INTRO: Record<GuideTrack, Record<UiLang, string>> = {
  start: {
    fr: 'Pour découvrir l’application : comment l’enfant fait une phrase, trouve un mot, demande de l’aide et suit sa journée. Chaque chapitre a un bouton « Essayer ».',
    en: 'To discover the app: how the child builds a sentence, finds a word, asks for help and follows the day. Each chapter has a “Try it” button.',
  },
  pro: {
    fr: 'Pour les parents qui préparent l’appareil et les professionnels : principes, personnalisation, TLA, plannings, modélisation, impression et données.',
    en: 'For parents who set up the device and for professionals: principles, customisation, activity boards, schedules, modelling, printing and data.',
  },
};

export const GUIDE: GuideChapter[] = [
  // ── First steps ─────────────────────────────────────────────
  {
    id: 'screen',
    track: 'start',
    icon: 'home',
    title: { fr: 'L’écran en un coup d’œil', en: 'The screen at a glance' },
    steps: {
      fr: [
        'À gauche, la barre universelle, toujours au même endroit : CAA (accueil), TLA, Planning, Minuteur, le gros bouton rouge Aide, puis les outils Chercher, Clavier, Modèle, Langue, Guide et Accompagnant.',
        'En haut, la bande de phrase : chaque mot touché s’y ajoute.',
        'Au centre, la grille de mots. Chaque mot garde toujours sa place : c’est ce qui permet à l’enfant d’apprendre les gestes par cœur.',
        'Les couleurs indiquent le type de mot : jaune = personnes, vert = actions, bleu = descriptions, orange = objets, violet = questions, rose = mots sociaux, rouge = négation, gris = petits mots.',
      ],
      en: [
        'On the left, the universal bar, always in the same place: AAC (home), Boards, Schedule, Timer, the big red Help button, then the tools Search, Keyboard, Model, Language, Guide and Caregiver.',
        'At the top, the sentence strip: every word you touch is added to it.',
        'In the middle, the word grid. Each word always keeps its place: that is how the child learns the movements by heart.',
        'Colours show the kind of word: yellow = people, green = actions, blue = describing, orange = things, purple = questions, pink = social words, red = negation, grey = little words.',
      ],
    },
  },
  {
    id: 'sentence',
    track: 'start',
    icon: 'volume',
    title: { fr: 'Faire une phrase', en: 'Building a sentence' },
    steps: {
      fr: [
        'Touchez « je », puis « vouloir », puis « jouer » : chaque mot est dit et s’ajoute à la bande.',
        'L’application accorde toute seule : après « je », « vouloir » se dit « veux ».',
        'Parler (bouton vert) lit toute la phrase. Toucher un mot de la bande le redit.',
        'Effacer enlève le dernier mot, Tout effacer vide la bande, Annuler revient en arrière.',
      ],
      en: [
        'Touch “I”, then “want”, then “play”: each word is said and added to the strip.',
        'The app handles grammar by itself (in French, “je” + “vouloir” is said “veux”).',
        'Speak (green button) reads the whole sentence. Touching a word in the strip says it again.',
        'Delete removes the last word, Clear all empties the strip, Undo goes back.',
      ],
    },
    tip: {
      fr: 'Le bouton « Voir l’exemple » montre la phrase avec une main animée.',
      en: 'The “Show me” button plays the sentence with an animated hand.',
    },
    action: 'demo',
  },
  {
    id: 'folders',
    track: 'start',
    icon: 'grid',
    title: { fr: 'Les dossiers', en: 'Folders' },
    steps: {
      fr: [
        'Les cases blanches avec un onglet sont des dossiers : personnes, nourriture, émotions, activités, applis…',
        'Touchez un dossier pour voir ses mots, puis un mot pour l’ajouter à la phrase.',
        'Retour revient en arrière ; Accueil ou CAA ramène au tableau principal.',
      ],
      en: [
        'White cards with a tab are folders: people, food, feelings, activities, apps…',
        'Touch a folder to see its words, then a word to add it to the sentence.',
        'Back goes back; Home or AAC returns to the main board.',
      ],
    },
    tip: {
      fr: '« Essayer » fait clignoter le chemin jusqu’au mot « ballon ».',
      en: '“Try it” lights up the way to the word “ball”.',
    },
    action: 'folder',
  },
  {
    id: 'search',
    track: 'start',
    icon: 'search',
    title: { fr: 'Trouver un mot', en: 'Finding a word' },
    steps: {
      fr: [
        'Chercher, puis au choix : tapez le mot (les fautes sont comprises : « pome » trouve « pomme »), touchez Dire le mot et dites-le, ou Dessiner : dessinez l’objet avec le doigt puis Trouver.',
        'Montre-moi où fait clignoter le chemin : d’abord le dossier, puis le mot. L’enfant apprend ainsi où il se trouve.',
        'Le bouton + ajoute le mot directement à la phrase ; le haut-parleur le dit.',
      ],
      en: [
        'Search, then either type the word (typos are fine: “aple” finds “apple”), touch Say the word and say it, or Draw: draw the thing with a finger, then Find.',
        'Show me where lights up the way: first the folder, then the word. This is how the child learns where it is.',
        'The + button adds the word straight to the sentence; the speaker button says it.',
      ],
    },
    tip: {
      fr: 'La reconnaissance des dessins utilise l’IA (seul le dessin est envoyé) ; elle se coupe dans les Réglages.',
      en: 'Drawing recognition uses AI (only the drawing is sent); it can be turned off in Settings.',
    },
    action: 'search',
  },
  {
    id: 'language',
    track: 'start',
    icon: 'globe',
    title: { fr: 'Changer de langue', en: 'Changing language' },
    steps: {
      fr: [
        'Langue : français, anglais ou arabe libanais. Les mots restent exactement à la même place.',
        'On peut mélanger les langues dans une même phrase : chaque mot est dit dans sa langue.',
      ],
      en: [
        'Language: French, English or Lebanese Arabic. Words stay exactly in the same place.',
        'Languages can be mixed in one sentence: each word is said in its own language.',
      ],
    },
    action: 'lang',
  },
  {
    id: 'help',
    track: 'start',
    icon: 'help',
    title: { fr: 'Le bouton Aide', en: 'The Help button' },
    steps: {
      fr: [
        'Un seul appui dit tout de suite « Aide-moi ! », sans menu avant.',
        'Puis des choix rapides : j’ai mal, j’ai peur, je ne comprends pas, je veux partir, j’ai besoin d’une pause, toilettes.',
        'Informations utiles : « comment je communique » et le contact d’urgence (à remplir en mode accompagnant).',
      ],
      en: [
        'One press says “Help me!” immediately, with no menu first.',
        'Then quick choices: it hurts, I’m scared, I don’t understand, I want to leave, I need a break, toilet.',
        'Useful information: “how I communicate” and the emergency contact (filled in caregiver mode).',
      ],
    },
    action: 'help',
  },
  {
    id: 'tla',
    track: 'start',
    icon: 'grid',
    title: { fr: 'Les TLA (tableaux d’activité)', en: 'Activity boards (TLA)' },
    steps: {
      fr: [
        'Un TLA est un tableau pour une activité précise : repas, parc, dentiste, école…',
        'TLA dans la barre, puis touchez l’onglet de l’activité.',
        'Les mots de base (je, vouloir, encore, stop, aide-moi…) restent toujours dans les deux colonnes de gauche.',
      ],
      en: [
        'An activity board is made for one situation: meal, park, dentist, school…',
        'Boards in the bar, then touch the activity’s tab.',
        'Core words (I, want, more, stop, help me…) always stay in the two left columns.',
      ],
    },
    action: 'tla',
  },
  {
    id: 'schedule',
    track: 'start',
    icon: 'calendar',
    title: { fr: 'Le planning', en: 'The schedule' },
    steps: {
      fr: [
        'Planning montre la journée en images : Maintenant, Ensuite, puis toutes les étapes.',
        'Fait passe à l’étape suivante. Certaines étapes ouvrent leur TLA ou lancent un minuteur.',
        'D’abord / Ensuite : seulement deux images (« d’abord les devoirs, ensuite le parc »).',
      ],
      en: [
        'Schedule shows the day in pictures: Now, Next, then all the steps.',
        'Done moves to the next step. Some steps open their activity board or start a timer.',
        'First / Then: just two pictures (“first homework, then the park”).',
      ],
    },
    action: 'schedule',
  },
  {
    id: 'timer',
    track: 'start',
    icon: 'timer',
    title: { fr: 'Le minuteur', en: 'The timer' },
    steps: {
      fr: [
        'Minuteur : choisissez une durée ; le temps qui reste se voit en cercle, en barre ou en chiffres.',
        'Il continue pendant qu’on communique. À la fin : un son, une vibration (sur téléphone) et « C’est fini ! ».',
      ],
      en: [
        'Timer: choose a duration; the time left shows as a circle, a bar or digits.',
        'It keeps running while you communicate. At the end: a sound, a vibration (on phones) and “Time is up!”.',
      ],
    },
    action: 'timer',
  },
  {
    id: 'apps',
    track: 'start',
    icon: 'external',
    title: { fr: 'Les applis', en: 'Apps' },
    steps: {
      fr: [
        'Dossier applis : YouTube, WhatsApp, Spotify, Anghami. Toucher une appli l’ouvre après 3 secondes (Annuler si c’est une erreur).',
        'Une phrase qui parle d’une appli l’ouvre aussi : « je veux écouter de la musique » puis Parler → Spotify.',
        'WhatsApp attend d’abord le numéro de la personne à appeler (voir « Relier une application »).',
      ],
      en: [
        'Apps folder: YouTube, WhatsApp, Spotify, Anghami. Touching an app opens it after 3 seconds (Cancel if it was a mistake).',
        'A sentence that mentions an app opens it too: “I want to listen to music”, then Speak → Spotify.',
        'WhatsApp first needs the number of the person to call (see “Linking an app”).',
      ],
    },
    action: 'apps',
  },
  {
    id: 'keyboard',
    track: 'start',
    icon: 'keyboard',
    title: { fr: 'Le clavier', en: 'The keyboard' },
    steps: {
      fr: ['Pour ceux qui savent écrire : Clavier, écrivez, puis Parler ou Ajouter à la phrase.'],
      en: ['For those who can write: Keyboard, type, then Speak or Add to sentence.'],
    },
    action: 'keyboard',
  },
  {
    id: 'caregiver',
    track: 'start',
    icon: 'lock',
    title: { fr: 'Le mode accompagnant', en: 'Caregiver mode' },
    steps: {
      fr: [
        'Accompagnant (cadenas), puis le code : 1234 au départ — changez-le dans Réglages → Sécurité.',
        'Le bandeau jaune indique qu’on peut modifier : toucher une case ouvre ses réglages ; pour un dossier, appui long.',
        'Réglages et Imprimer / PDF sont dans le bandeau. Terminer revient au mode enfant.',
        'Tout est gardé sur l’appareil, même après l’avoir éteint.',
      ],
      en: [
        'Caregiver (padlock), then the code: 1234 at first — change it in Settings → Security.',
        'The yellow banner means you can edit: touching a card opens its settings; for a folder, long press.',
        'Settings and Print / PDF are in the banner. Done goes back to child mode.',
        'Everything is kept on the device, even after switching it off.',
      ],
    },
    action: 'caregiver',
  },

  // ── Caregivers & professionals ──────────────────────────────
  {
    id: 'principles',
    track: 'pro',
    icon: 'star',
    title: { fr: 'Les principes (à lire d’abord)', en: 'Principles (read first)' },
    steps: {
      fr: [
        'Vocabulaire de base et plan moteur : les mots fréquents ne bougent jamais, dans aucune langue, pour que le geste devienne automatique. Ajoutez des mots, mais évitez d’en déplacer.',
        'Modélisez sans exiger : montrez vous-même les mots sur l’appareil quand vous parlez à l’enfant (voir « Modéliser »).',
        'L’appareil doit être toujours à portée de main — et une version papier aussi (voir « Imprimer »).',
        'Code couleur de Fitzgerald modifiée : il aide à construire la phrase (qui → action → quoi).',
      ],
      en: [
        'Core vocabulary and motor planning: frequent words never move, in any language, so the movement becomes automatic. Add words, but avoid moving them.',
        'Model without demanding: point to the words on the device yourself when you talk to the child (see “Modelling”).',
        'The device must always be within reach — and a paper version too (see “Printing”).',
        'Modified Fitzgerald colour key: it helps build the sentence (who → action → what).',
      ],
    },
  },
  {
    id: 'reveal',
    track: 'pro',
    icon: 'list',
    title: { fr: 'Révéler le vocabulaire petit à petit', en: 'Revealing vocabulary step by step' },
    steps: {
      fr: [
        'Réglages → Vocabulaire révélé : niveau 1 (premiers mots), 2, ou 3 (tout).',
        'Les mots masqués gardent leur place : on agrandit le vocabulaire sans rien déplacer.',
        'Le niveau de chaque mot se règle sur sa case (mode accompagnant, tableau principal : badge N1, N2, N3).',
      ],
      en: [
        'Settings → Revealed vocabulary: level 1 (first words), 2, or 3 (everything).',
        'Hidden words keep their place: vocabulary grows without moving anything.',
        'Each word’s level is set on its card (caregiver mode, main board: badge N1, N2, N3).',
      ],
    },
    action: 'settings',
  },
  {
    id: 'editWord',
    track: 'pro',
    icon: 'pencil',
    title: { fr: 'Modifier un mot', en: 'Editing a word' },
    steps: {
      fr: [
        'En mode accompagnant, touchez la case : libellés en français, anglais et libanais.',
        'Image : Pictogrammes (ARASAAC, hors ligne), Photo (galerie ou appareil photo), ou Internet (autres banques de pictogrammes, photos et dessins libres, Coller l’image, lien d’une image). L’auteur et la licence s’affichent.',
        'Voix enregistrée : enregistrez votre voix ou celle d’un proche, pour chaque langue — idéal pour le libanais.',
        'Catégorie (couleur) et Affichage de la case (image + texte, image seule, texte seul).',
        'Carte : taille, agrandir sur les cases vides voisines, intensité de la couleur pour attirer l’attention.',
      ],
      en: [
        'In caregiver mode, touch the card: labels in French, English and Lebanese Arabic.',
        'Picture: Pictograms (ARASAAC, offline), Photo (library or camera), or Internet (other pictogram sets, free photos and drawings, Paste picture, picture link). Author and licence are shown.',
        'Recorded voice: record your voice or a relative’s, for each language — ideal for Lebanese Arabic.',
        'Category (colour) and Cell display (picture + text, picture only, text only).',
        'Card: size, spread over empty neighbouring slots, colour strength to draw attention.',
      ],
    },
    action: 'caregiver',
  },
  {
    id: 'addWord',
    track: 'pro',
    icon: 'plus',
    title: { fr: 'Ajouter, remplacer, déplacer, retirer', en: 'Adding, replacing, moving, removing' },
    steps: {
      fr: [
        'Case vide → Créer un nouveau mot (le pictogramme est proposé tout seul, ou choisissez Photo / Internet) ou choisissez un mot existant.',
        'Sur une case : Remplacer par un autre mot, ou Retirer de ce tableau.',
        'Déplacer cette case, puis touchez la nouvelle place (une case vide, ou un mot pour les échanger). Pour les mots de base : à décider avec l’orthophoniste.',
        'Le dossier « mes mots » est prévu pour les mots de l’enfant : prénoms, jeux préférés, lieux familiers.',
      ],
      en: [
        'Empty card → Create a new word (the pictogram is suggested automatically, or choose Photo / Internet) or choose an existing word.',
        'On a card: Replace with another word, or Remove from this board.',
        'Move this card, then touch the new place (an empty slot, or a word to swap them). For core words: decide with the speech therapist.',
        'The “my words” folder is meant for the child’s own words: names, favourite games, familiar places.',
      ],
    },
    action: 'caregiver',
  },
  {
    id: 'newTla',
    track: 'pro',
    icon: 'grid',
    title: { fr: 'Créer un TLA', en: 'Creating an activity board' },
    steps: {
      fr: [
        'TLA → Nouveau TLA (mode accompagnant) → tapez le sujet (ex. « préparer un gâteau ») → Proposer des mots.',
        'L’application reconnaît environ 45 situations et propose les mots ET les étapes dans l’ordre. Sujet inconnu : Demander à l’IA (seul le sujet est envoyé).',
        'Touchez un mot ou une étape pour le retirer, ajoutez-en, puis Créer le TLA.',
        'Option « Créer aussi le planning de ces étapes » : le planning est relié au TLA, avec minuteurs (ex. four 30 min).',
      ],
      en: [
        'Boards → New board (caregiver mode) → type the topic (e.g. “baking a cake”) → Suggest words.',
        'The app recognises about 45 situations and suggests the words AND the steps in order. Unknown topic: Ask the AI (only the topic is sent).',
        'Touch a word or a step to remove it, add more, then Create board.',
        'Option “Also create a schedule of these steps”: the schedule is linked to the board, with timers (e.g. oven 30 min).',
      ],
    },
    action: 'newTla',
  },
  {
    id: 'editSchedule',
    track: 'pro',
    icon: 'calendar',
    title: { fr: 'Préparer un planning', en: 'Preparing a schedule' },
    steps: {
      fr: [
        'Planning → + (nouveau planning) ou Modifier le planning (mode accompagnant).',
        'Chaque étape : un pictogramme, un TLA lié et une durée de minuteur si besoin.',
        'D’abord / Ensuite : en mode accompagnant, touchez chaque case pour choisir l’image.',
      ],
      en: [
        'Schedule → + (new schedule) or Edit schedule (caregiver mode).',
        'Each step: a pictogram, a linked activity board and a timer duration if needed.',
        'First / Then: in caregiver mode, touch each card to choose the picture.',
      ],
    },
    action: 'schedule',
  },
  {
    id: 'model',
    track: 'pro',
    icon: 'pointer',
    title: { fr: 'Modéliser (Modèle)', en: 'Modelling (Model)' },
    steps: {
      fr: [
        'Dicter une phrase, ou l’écrire, puis Montrer sur la grille : une main animée appuie sur chaque mot, dossiers compris, et le bandeau dit où elle va. Puis la phrase est lue.',
        'Enregistrer une démonstration : touchez les mots comme l’enfant devrait le faire, puis Terminer et garder. Rejouer la montre autant de fois que nécessaire.',
        'Vitesse : lente, normale ou rapide.',
      ],
      en: [
        'Dictate a sentence, or type it, then Show on the board: an animated hand presses each word, folders included, and the banner says where it goes. Then the sentence is read.',
        'Record a demonstration: touch the words the way the child should, then Finish and keep. Replay shows it as often as needed.',
        'Speed: slow, normal or fast.',
      ],
    },
    action: 'model',
  },
  {
    id: 'settings',
    track: 'pro',
    icon: 'settings',
    title: { fr: 'Les réglages utiles', en: 'Useful settings' },
    steps: {
      fr: [
        'Communication : prononcer chaque mot, ajouter à la phrase, grammaire automatique (à couper pour travailler une forme), accords au féminin, zone rapide (oui, non, stop, attends…), faire vibrer les pictogrammes, ouvrir l’appli citée dans une phrase.',
        'Barre universelle : masquer TLA, Planning ou Minuteur si l’enfant n’en a pas besoin (CAA et Aide restent toujours).',
        'Voix : vitesse et voix par langue. Bouton Aide : le message dit en premier, les informations utiles.',
      ],
      en: [
        'Communication: say each word, add to sentence, automatic grammar (turn off to practise a form), feminine agreement, quick zone (yes, no, stop, wait…), wiggling pictograms, open the app mentioned in a sentence.',
        'Universal bar: hide Boards, Schedule or Timer if the child doesn’t need them (AAC and Help always stay).',
        'Voice: speed and voice per language. Help button: the first message said, the useful information.',
      ],
    },
    action: 'settings',
  },
  {
    id: 'linkApp',
    track: 'pro',
    icon: 'external',
    title: { fr: 'Relier une application', en: 'Linking an app' },
    steps: {
      fr: [
        'Mode accompagnant → dossier applis → touchez l’appli → section Application.',
        'Choisissez un modèle (YouTube Kids, Netflix…) ou collez un lien. WhatsApp : https://wa.me/ suivi du numéro avec l’indicatif (ex. https://wa.me/96170123456).',
        '« Mots qui l’ouvrent dans une phrase » : ajoutez ou retirez des mots (ex. « chanson » pour Anghami).',
        'N’importe quel mot peut devenir une appli. L’ouverture depuis une phrase se coupe dans les Réglages.',
      ],
      en: [
        'Caregiver mode → apps folder → touch the app → App section.',
        'Pick a preset (YouTube Kids, Netflix…) or paste a link. WhatsApp: https://wa.me/ followed by the number with country code (e.g. https://wa.me/96170123456).',
        '“Words that open it in a sentence”: add or remove words (e.g. “song” for Anghami).',
        'Any word can become an app. Opening from a sentence can be turned off in Settings.',
      ],
    },
    action: 'apps',
  },
  {
    id: 'print',
    track: 'pro',
    icon: 'printer',
    title: { fr: 'Imprimer une version papier', en: 'Printing a paper version' },
    steps: {
      fr: [
        'Imprimer / PDF (mode accompagnant) : tableau affiché, dossiers, TLA, plannings, D’abord / Ensuite.',
        'A4 ou A3, portrait ou paysage, noir et blanc, cartes à découper.',
        'Gardez toujours une version papier : batterie vide, piscine, plage…',
      ],
      en: [
        'Print / PDF (caregiver mode): current board, folders, activity boards, schedules, First / Then.',
        'A4 or A3, portrait or landscape, black and white, cut-out cards.',
        'Always keep a paper version: flat battery, swimming pool, beach…',
      ],
    },
    action: 'print',
  },
  {
    id: 'privacy',
    track: 'pro',
    icon: 'lock',
    title: { fr: 'Données et confidentialité', en: 'Data and privacy' },
    steps: {
      fr: [
        'Tout reste sur l’appareil. Les phrases de l’enfant ne sont jamais enregistrées ni envoyées.',
        'L’IA (propositions de TLA, dessins) ne reçoit que le sujet ou le dessin ; elle se coupe dans Réglages → Données.',
        'Exporter le profil (sauvegarde) avant de changer d’appareil ; Réinitialiser le profil repart de zéro.',
      ],
      en: [
        'Everything stays on the device. The child’s sentences are never stored or sent.',
        'The AI (board suggestions, drawings) only receives the topic or the drawing; it can be turned off in Settings → Data.',
        'Export profile (backup) before changing device; Reset profile starts from scratch.',
      ],
    },
    action: 'settings',
  },
];
