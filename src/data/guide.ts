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

/** A chapter as written: French and English (Arabic is merged in below). */
type BaseChapter = Omit<GuideChapter, 'title' | 'steps' | 'tip'> & {
  title: Record<'fr' | 'en', string>;
  steps: Record<'fr' | 'en', string[]>;
  tip?: Record<'fr' | 'en', string>;
};

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
    ar: 'لاكتشاف التطبيق: كيف يكوّن الطفل جملة، ويجد كلمة، ويطلب المساعدة، ويتابع يومه. في كل فصل زر «جرّب».',
  },
  pro: {
    fr: 'Pour les parents qui préparent l’appareil et les professionnels : principes, personnalisation, TLA, plannings, modélisation, impression et données.',
    en: 'For parents who set up the device and for professionals: principles, customisation, activity boards, schedules, modelling, printing and data.',
    ar: 'للأهل الذين يجهّزون الجهاز وللمختصين: المبادئ، التخصيص، اللوحات، الجداول، النمذجة، الطباعة والبيانات.',
  },
};

const BASE: BaseChapter[] = [
  // ── First steps ─────────────────────────────────────────────
  {
    id: 'screen',
    track: 'start',
    icon: 'home',
    title: { fr: 'L’écran en un coup d’œil', en: 'The screen at a glance' },
    steps: {
      fr: [
        'À gauche, la barre universelle, toujours au même endroit : CAA (accueil), TLA, Planning, Minuteur, le gros bouton rouge Aide, puis les outils Chercher (la loupe), Guide et Accompagnant. La loupe ouvre trois onglets : Chercher (trouver un mot), Clavier (écrire) et Modèle (montrer une phrase sur le tableau).',
        'En haut, la bande de phrase : chaque mot touché s’y ajoute.',
        'Au centre, la grille de mots. Chaque mot garde toujours sa place : c’est ce qui permet à l’enfant d’apprendre les gestes par cœur.',
        'Les couleurs indiquent le type de mot : jaune = personnes, vert = actions, bleu = descriptions, orange = objets, violet = questions, rose = mots sociaux, rouge = négation, gris = petits mots.',
      ],
      en: [
        'On the left, the universal bar, always in the same place: AAC (home), Boards, Schedule, Timer, the big red Help button, then the tools Search (the magnifying glass), Guide and Caregiver. The magnifying glass opens three tabs: Search (find a word), Keyboard (write) and Model (show a sentence on the board).',
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
        'Chercher (la loupe), premier onglet, puis au choix : tapez le mot (les fautes sont comprises : « pome » trouve « pomme »), touchez Dire le mot et dites-le, ou Dessiner : dessinez l’objet avec le doigt puis Trouver.',
        'Montre-moi où fait clignoter le chemin : d’abord le dossier, puis le mot. L’enfant apprend ainsi où il se trouve.',
        'Le bouton + ajoute le mot directement à la phrase ; le haut-parleur le dit.',
      ],
      en: [
        'Search (the magnifying glass), first tab, then either type the word (typos are fine: “aple” finds “apple”), touch Say the word and say it, or Draw: draw the thing with a finger, then Find.',
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
    title: { fr: 'Choisir les langues', en: 'Choosing languages' },
    steps: {
      fr: [
        'Les langues se choisissent dans les Réglages (mode accompagnant), avec deux choix séparés : Langue de communication (ce que dit l’appareil et ce qui est écrit sur les cases) et Langue de navigation (menus, boutons, guide).',
        'Par exemple : naviguer en français et parler en arabe, ou l’inverse. Les mots restent exactement à la même place dans toutes les langues.',
        'L’arabe de l’application se choisit à l’installation et se change ici (Arabe de l’application) : libanais, syrien, jordanien / palestinien, égyptien, saoudien, du Golfe, irakien, arabe standard — ou Aucun, qui retire l’arabe des langues de l’enfant. Les mots arabes du tableau et les propositions suivent ce choix. Ce choix change les mots, pas la voix : l’appareil lit l’arabe avec sa voix arabe standard, quel que soit le dialecte. Si un mot ne sonne pas bien, enregistrez-le avec votre propre voix (voir « Modifier un mot »).',
        'On peut mélanger les langues dans une même phrase : chaque mot est dit dans sa langue.',
      ],
      en: [
        'Languages are chosen in Settings (caregiver mode), with two separate choices: Communication language (what the device says and what is written on the cards) and Navigation language (menus, buttons, guide).',
        'For example: navigate in English and speak in Arabic, or the other way round. Words stay exactly in the same place in every language.',
        'The Arabic of the app is chosen at set-up and changed here (Arabic used in the app): Lebanese, Syrian, Jordanian / Palestinian, Egyptian, Saudi, Gulf, Iraqi, Modern Standard Arabic — or None, which removes Arabic from the child’s languages. The Arabic words of the board and the suggestions follow that choice. That choice changes the words, not the voice: the device reads Arabic with its standard Arabic voice, whatever the dialect. If a word does not sound right, record it with your own voice (see “Editing a word”).',
        'Languages can be mixed in one sentence: each word is said in its own language.',
      ],
    },
    action: 'settings',
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
        'Semaine et Mois (si activés dans Réglages → Tableau → Barre universelle, sous Planning) : les activités de chaque jour, et un calendrier des événements. Toucher un jour dit son nom.',
      ],
      en: [
        'Schedule shows the day in pictures: Now, Next, then all the steps.',
        'Done moves to the next step. Some steps open their activity board or start a timer.',
        'First / Then: just two pictures (“first homework, then the park”).',
        'Week and Month (if turned on in Settings → Board → Universal bar, under Schedule): each day’s activities, and a calendar of events. Touching a day says its name.',
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
        'Il se place au-dessus du tableau sans cacher de picto. À côté, le picto de ce que l’enfant attend (la piscine, le parc…) : il est dit à la fin.',
      ],
      en: [
        'Timer: choose a duration; the time left shows as a circle, a bar or digits.',
        'It keeps running while you communicate. At the end: a sound, a vibration (on phones) and “Time is up!”.',
        'It sits above the board without hiding any picture. Next to it, the picture of what the child is waiting for (the pool, the park…): it is said at the end.',
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
        'Dossier applis : YouTube, WhatsApp, Spotify, Anghami. Toucher une appli l’ouvre après 3 secondes (Annuler si c’est une erreur). Dans un navigateur (démo en ligne), touchez Ouvrir : les navigateurs interdisent l’ouverture automatique.',
        'Une phrase qui parle d’une appli l’ouvre aussi : « je veux écouter de la musique » puis Parler → Spotify.',
        'WhatsApp attend d’abord le numéro de la personne à appeler (voir « Relier une application »).',
      ],
      en: [
        'Apps folder: YouTube, WhatsApp, Spotify, Anghami. Touching an app opens it after 3 seconds (Cancel if it was a mistake). In a browser (online demo), tap Open: browsers forbid opening it automatically.',
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
      fr: ['Pour ceux qui savent écrire : Chercher (la loupe), onglet Clavier, écrivez, puis Parler ou Ajouter à la phrase. Chaque mot écrit arrive dans la phrase avec son pictogramme (celui du tableau, sinon celui de la bibliothèque) et il est dit tel qu’il est écrit.'],
      en: ['For those who can write: Search (the magnifying glass), Keyboard tab, type, then Speak or Add to sentence. Each typed word goes into the sentence with its pictogram (the one of the board, else one from the library) and is said exactly as written.'],
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
        'Accompagnant (cadenas). La première fois, vous choisissez votre code (4 chiffres, tapés deux fois) ; ensuite vous le tapez à chaque fois. Après 5 codes faux, il faut attendre un peu. Vous pouvez le changer dans Réglages → Sécurité.',
        'Le bandeau jaune indique qu’on peut modifier : toucher une case ouvre ses réglages ; pour un dossier, appui long.',
        'Réglages et Imprimer / PDF sont dans le bandeau. Terminer revient au mode enfant.',
        'Tout est gardé sur l’appareil, même après l’avoir éteint ; avec un compte, c’est aussi sauvegardé en ligne et les autres appareils de la famille se mettent à jour.',
        'Réglages → Tableau → Mode verrouillé : l’enfant ne peut plus ouvrir d’autres applis ni revenir en arrière ; pour l’empêcher de quitter l’application, activez aussi l’Accès guidé (iPad) ou l’épinglage d’écran (Android).',
      ],
      en: [
        'Caregiver (padlock). The first time, you choose your code (4 digits, typed twice); after that you type it each time. After 5 wrong codes you have to wait a little. You can change it in Settings → Security.',
        'The yellow banner means you can edit: touching a card opens its settings; for a folder, long press.',
        'Settings and Print / PDF are in the banner. Done goes back to child mode.',
        'Everything is kept on the device, even after switching it off; with an account it is also saved online and the family’s other devices update themselves.',
        'Settings → Board → Child lock: the child can no longer open other apps or go back; to stop them leaving the app, also turn on Guided Access (iPad) or screen pinning (Android).',
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
        'En mode accompagnant, touchez la case : libellés en français, en anglais et dans l’arabe choisi.',
        'Image : Pictogrammes (bibliothèque hors ligne d’environ 24 000 images ; cherchez en français, en anglais ou en arabe, et touchez le nom d’une banque — Mulberry, OpenMoji… — pour ne voir que la sienne), Photo (galerie ou appareil photo), ou Internet (pictogrammes Mulberry et OpenMoji en ligne, photos et dessins libres, Coller l’image, lien d’une image). La source et la licence sont gardées avec le mot.',
        'Voix enregistrée : enregistrez votre voix ou celle d’un proche pour ce mot, une fois par langue (français, anglais, arabe ; une coche montre les langues déjà enregistrées). L’enregistrement remplace alors la voix de l’appareil chaque fois que le mot est touché ou dit dans une phrase ; quand la grammaire change le mot (« vouloir » dit « veux »), c’est la voix de l’appareil qui le dit. Idéal pour les prénoms et pour l’arabe parlé à la maison. L’enregistrement reste sur l’appareil où il a été fait.',
        'Catégorie (couleur) et Affichage de la case (image + texte, image seule, texte seul).',
        'Carte : taille, agrandir sur les cases vides voisines, intensité de la couleur pour attirer l’attention.',
      ],
      en: [
        'In caregiver mode, touch the card: labels in French, English and the Arabic you chose.',
        'Picture: Pictograms (offline library of about 24,000 pictures; search in French, English or Arabic, and touch a library’s name — Mulberry, OpenMoji… — to see only its pictures), Photo (library or camera), or Internet (Mulberry and OpenMoji pictograms online, free photos and drawings, Paste picture, picture link). The source and licence are kept with the word.',
        'Recorded voice: record your voice or a relative’s for this word, once per language (French, English, Arabic; a tick shows the languages already recorded). The recording then replaces the device’s voice every time the word is touched or said in a sentence; when grammar changes the word (“want” said “wants”), the device’s voice says it. Ideal for names and for the Arabic spoken at home. The recording stays on the device where it was made.',
        'Category (colour) and Cell display (picture + text, picture only, text only).',
        'Card: size, spread over empty neighbouring slots, colour strength to draw attention.',
      ],
    },
    action: 'caregiver',
  },
  {
    id: 'pictos',
    track: 'pro',
    icon: 'shield',
    title: { fr: 'D’où viennent les pictogrammes', en: 'Where the pictograms come from' },
    steps: {
      fr: [
        'Les pictogrammes viennent de dix banques libres, utilisables sans frais : Mulberry (symboles de CAA) et OpenMoji d’abord, puis Fluent Emoji, Noto Emoji, Twemoji, Health Icons, Material Symbols, Phosphor, Lucide et Tabler. Environ 24 000 images, toutes dans l’application : pas besoin d’Internet.',
        'Un même mot a souvent plusieurs dessins : choisissez celui que l’enfant comprend le mieux, et gardez-le.',
        'Un astérisque (*) à côté d’un mot signale une « Traduction automatique : à vérifier » : regardez bien l’image avant de la choisir.',
        'Réglages → À propos → Crédits et licences des pictogrammes : les auteurs, les licences et leurs textes. La liste se met à jour toute seule ; le même bouton est sur la page d’accueil.',
        'Les logos de marques ne font pas partie de la bibliothèque ; les images d’alcool, de tabac ou d’armes ne sont jamais proposées automatiquement.',
      ],
      en: [
        'The pictograms come from ten open libraries that are free to use: Mulberry (AAC symbols) and OpenMoji first, then Fluent Emoji, Noto Emoji, Twemoji, Health Icons, Material Symbols, Phosphor, Lucide and Tabler. About 24,000 pictures, all inside the app: no internet needed.',
        'One word often has several drawings: choose the one the child understands best, and keep it.',
        'An asterisk (*) next to a word means “Automatic translation: to check”: look at the picture carefully before choosing it.',
        'Settings → About → Pictogram credits & licences: the authors, the licences and their texts. The list updates by itself; the same button is on the welcome page.',
        'Brand logos are not part of the library; pictures of alcohol, tobacco or weapons are never suggested automatically.',
      ],
    },
    action: 'settings',
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
        'TLA → Nouveau TLA (le code accompagnant est demandé si besoin) → tapez le sujet (ex. « préparer un gâteau ») → Proposer des mots.',
        'L’application reconnaît environ 45 situations et propose les mots ET les étapes dans l’ordre. Sujet inconnu : Demander à l’IA (seul le sujet est envoyé).',
        'Touchez un mot ou une étape pour le retirer, ajoutez-en ; pour changer l’ordre des étapes, appui long sur une étape puis glisser (ou les petites flèches). Puis Créer le TLA.',
        'Option « Créer aussi la séquence de ces étapes » : la séquence est reliée au TLA, avec minuteurs (ex. four 30 min). Elle apparaît dans Planning.',
        'Autres façons : Créer un TLA vide (vous choisissez chaque mot) ; Créer à partir d’une photo (un menu, une boîte de jeu, des ingrédients : vérifiez les mots proposés avant de créer) ; Importer un fichier ou Partagés avec moi (un TLA qu’on vous a envoyé).',
      ],
      en: [
        'Boards → New board (the caregiver code is asked if needed) → type the topic (e.g. “baking a cake”) → Suggest words.',
        'The app recognises about 45 situations and suggests the words AND the steps in order. Unknown topic: Ask the AI (only the topic is sent).',
        'Touch a word or a step to remove it, add more; to change the order of the steps, hold a step then slide it (or use the small arrows). Then Create board.',
        'Option “Also create a sequence of these steps”: the sequence is linked to the board, with timers (e.g. oven 30 min). It appears in Schedule.',
        'Other ways: Create an empty board (you choose every word); Create from a photo (a menu, a game box, ingredients: check the suggested words before creating); Import a file or Shared with me (a board someone sent you).',
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
        'Planning → Nouvelle séquence (mode accompagnant) : écrivez le sujet (ex. « se brosser les dents »), Proposer des étapes, changez l’ordre (appui long puis glisser), puis Créer la séquence. Modifier la séquence change son nom et ses étapes.',
        'Chaque étape : un pictogramme, un TLA lié et une durée de minuteur si besoin.',
        'D’abord / Ensuite : en mode accompagnant, touchez chaque case pour choisir l’image.',
        'Semaine et Mois (à activer dans Réglages → Tableau → Barre universelle, sous Planning) : en mode accompagnant, + ajoute un pictogramme à un jour, toucher un pictogramme le retire.',
      ],
      en: [
        'Schedule → New sequence (caregiver mode): type the topic (e.g. “brushing teeth”), Suggest steps, change the order (hold then slide), then Create the sequence. Edit sequence changes its name and its steps.',
        'Each step: a pictogram, a linked activity board and a timer duration if needed.',
        'First / Then: in caregiver mode, touch each card to choose the picture.',
        'Week and Month (turn them on in Settings → Board → Universal bar, under Schedule): in caregiver mode, + adds a picture to a day, touching a picture removes it.',
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
        'Chercher (la loupe), onglet Modèle. Dicter une phrase, ou l’écrire, puis Montrer sur la grille : une main animée appuie sur chaque mot, dossiers compris, et le bandeau dit où elle va. Puis la phrase est lue.',
        'Enregistrer une démonstration : touchez les mots comme l’enfant devrait le faire, puis Terminer et garder. Rejouer la montre autant de fois que nécessaire.',
        'Vitesse : lente, normale ou rapide.',
      ],
      en: [
        'Search (the magnifying glass), Model tab. Dictate a sentence, or type it, then Show on the board: an animated hand presses each word, folders included, and the banner says where it goes. Then the sentence is read.',
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
        'Les Réglages ont plusieurs pages : Tableau (les réglages de l’enfant, décrits ici), Équipe, Suivi (si la famille l’a choisi) et Compte. Sans compte, Équipe, Suivi et Compte expliquent seulement ce qu’ils contiendront.',
        'Langues : Langue de communication (ce que dit l’appareil, ce qui est écrit sur les cases) et Langue de navigation (menus, boutons, guide).',
        'Communication : prononcer chaque mot, ajouter à la phrase, grammaire automatique (à couper pour travailler une forme), accords au féminin, zone rapide (oui, non, stop, attends…), délai entre deux appuis sur le même pictogramme (2 s : fini les « pas pas pas »), faire vibrer les pictogrammes, ouvrir l’appli citée dans une phrase.',
        'Images : Bibliothèque de symboles (Pictogrammes ou Emoji) et Afficher le texte sous les images. Présentation et accès : boutons et texte plus grands ou contraste élevé, taille des images, façon de sélectionner (toucher puis lever le doigt, dès que le doigt touche, ou garder le doigt appuyé avec une durée d’appui), moins d’animations, petite vibration au toucher.',
        'Barre universelle : masquer TLA, Planning ou Minuteur si l’enfant n’en a pas besoin (CAA et Aide restent toujours). Sous Planning : le planning de la semaine et celui du mois. Rien ne change tant que vous n’avez pas touché Enregistrer, en bas de la page ; Annuler les modifications revient en arrière.',
        'Voix : féminine ou masculine, adulte ou enfant (Type de voix, Âge de la voix), vitesse, ou une voix précise par langue. Voix utilisée montre la voix de chaque langue : elle vient de l’appareil, et « voix approchée » signifie qu’il n’a pas de voix de ce type pour cette langue (on peut en installer dans les réglages de l’appareil). Bouton Aide : le message dit en premier, les informations utiles.',
        'Aussi : Hauteur de la voix (plus grave ou plus aiguë, à régler à l’oreille), Mode verrouillé (enfant), Sécurité (le code accompagnant), Données (propositions par IA, Exporter le profil, Réinitialiser le profil) et À propos (crédits et licences des pictogrammes).',
      ],
      en: [
        'Settings has several pages: Board (the child’s settings, described here), Team, Progress (if the family chose it) and Account. Without an account, Team, Progress and Account only explain what they will hold.',
        'Languages: Communication language (what the device says, what is written on the cards) and Navigation language (menus, buttons, guide).',
        'Communication: say each word, add to sentence, automatic grammar (turn off to practise a form), feminine agreement, quick zone (yes, no, stop, wait…), delay between two presses on the same pictogram (2 s: no more “no no no”), wiggling pictograms, open the app mentioned in a sentence.',
        'Pictures: Symbol library (Pictograms or Emoji) and Show text under images. Presentation and access: larger buttons and text or high contrast, picture size, access method (touch then lift the finger, as soon as the finger touches, or keep the finger pressed with a hold time), fewer animations, small vibration on touch.',
        'Universal bar: hide Boards, Schedule or Timer if the child doesn’t need them (AAC and Help always stay). Under Schedule: the week schedule and the month schedule. Nothing changes until you touch Save, at the bottom of the page; Cancel changes goes back.',
        'Voice: female or male, adult or child (Voice type, Voice age), speed, or a specific voice per language. Voice used shows the voice of each language: it comes from the device, and “approximate voice” means the device has no voice of that type for that language (more can be installed in the device’s own settings). Help button: the first message said, the useful information.',
        'Also: Voice height (deeper or sharper, tuned by ear), Child lock, Security (the caregiver code), Data (AI suggestions, Export profile, Reset profile) and About (pictogram credits and licences).',
      ],
    },
    action: 'settings',
  },
  {
    id: 'team',
    track: 'pro',
    icon: 'users',
    title: { fr: 'L’équipe de l’enfant', en: 'The child’s team' },
    steps: {
      fr: [
        'Réglages (mode accompagnant) → Équipe : les personnes qui ont accès, leur rôle et ce qu’elles peuvent faire.',
        'Inviter quelqu’un : nom, rôle, niveau (Utiliser, Contribuer, Modifier directement) et droits, puis donnez le code. Un professionnel peut aussi demander à rejoindre avec le code pour les professionnels : vous choisissez ses droits avant d’accepter.',
        'Propositions : chaque changement proposé s’affiche avant / après ; approuvez, demandez une modification ou refusez. Changer la place d’un mot de base demande une confirmation.',
        'Historique : qui a changé quoi et quand (jamais ce que l’enfant a dit), avec Annuler.',
        'Sur une personne de l’équipe : Fin de l’accès (1 semaine, 1 mois, 3 mois ou sans fin) et Retirer l’accès, qui s’applique tout de suite. Nouveautés rassemble ce qui s’est passé (invitation acceptée, demande, proposition reçue) ; Changer le code remplace le code pour les professionnels.',
      ],
      en: [
        'Settings (caregiver mode) → Team: the people who have access, their role and what they can do.',
        'Invite someone: name, role, level (Use, Contribute, Edit directly) and rights, then give the code. A professional can also ask to join with the code for professionals: you choose their rights before accepting.',
        'Proposals: each suggested change shows before / after; approve, ask for a change or decline. Moving a core word asks for confirmation.',
        'History: who changed what and when (never what the child said), with Undo.',
        'On a person of the team: Access ends (1 week, 1 month, 3 months or no end) and Remove access, which applies at once. What’s new gathers what happened (invitation accepted, request, proposal received); Change the code replaces the code for professionals.',
      ],
    },
    action: 'settings',
  },
  {
    id: 'account',
    track: 'pro',
    icon: 'user',
    title: { fr: 'Votre compte, vos enfants, vos appareils', en: 'Your account, children and devices' },
    steps: {
      fr: [
        'Réglages (mode accompagnant) → Compte → Mon compte : votre nom, Changer le mot de passe, Se déconnecter. En vous déconnectant, les tableaux des enfants quittent l’appareil (ils restent dans votre compte) ; sur un ordinateur partagé, cochez aussi l’effacement des photos et des enregistrements.',
        'Enfants : un seul compte pour plusieurs enfants. Ajouter un enfant crée son profil ; touchez un enfant de la liste pour ouvrir son tableau.',
        'Appareils et synchronisation : les appareils reliés, la dernière synchronisation, Synchroniser maintenant, et retirer un appareil perdu. Relier un appareil donne un code à 8 caractères (lettres et chiffres) à saisir sur l’autre appareil (« Relier cette tablette avec un code », sur la première page) : Accès complet (tablette de l’enfant) ou Utiliser seulement (école, nounou…). Sur une tablette reliée : Délier cette tablette.',
        'Vie privée et données : Exporter le profil (fichier), supprimer le profil de l’enfant ou Supprimer mon compte. Une suppression est définitive : il faut l’écrire pour confirmer.',
        'Préférences : Langue des menus et Notifications dans l’application. Écrire à l’équipe : une idée ou un problème à nous signaler (n’écrivez jamais le nom d’un enfant). Ouvrir le guide ramène ici.',
      ],
      en: [
        'Settings (caregiver mode) → Account → My account: your name, Change password, Sign out. When you sign out, the children’s boards leave the device (they stay in your account); on a shared computer, also tick erasing the photos and recordings.',
        'Children: one account for several children. Add a child creates their profile; touch a child in the list to open their board.',
        'Devices and sync: the linked devices, the last sync, Sync now, and removing a lost device. Link a device gives an 8-character code (letters and digits) to type on the other device (“Link this tablet with a code”, on the first page): Full access (the child’s tablet) or Use only (school, nanny…). On a linked tablet: Unlink this tablet.',
        'Privacy and data: Export the profile (file), delete the child’s profile or Delete my account. Deleting is for good: you have to type it to confirm.',
        'Preferences: Menu language and In-app notifications. Write to the team: an idea or a problem to tell us about (never write a child’s name). Open the guide brings you back here.',
      ],
    },
    action: 'settings',
  },
  {
    id: 'workspace',
    track: 'pro',
    icon: 'shield',
    title: { fr: 'Professionnels : votre espace', en: 'Professionals: your workspace' },
    steps: {
      fr: [
        'Vérification professionnelle (à la création du compte, puis dans Compte et licence) : votre pratique, un diplôme ou une autorisation d’exercer, puis une pièce d’identité, supprimée dès que la vérification est terminée. Envoyer pour vérification : notre équipe accepte, demande un complément ou refuse, et vous êtes prévenu dans l’application. En attendant, vous pouvez explorer votre espace et préparer des supports, mais pas encore rejoindre l’équipe d’un enfant.',
        'Accueil : vos utilisateurs connectés, les propositions en attente, les invitations, et des raccourcis.',
        'Mes utilisateurs → Connecter un utilisateur : le Code de la famille (donné par les parents), votre rôle, les Droits demandés et un message, puis Envoyer la demande. La famille accepte avec les droits qu’elle choisit. Une invitation reçue d’une famille s’accepte au même endroit.',
        'Mes utilisateurs → Créer le profil d’un enfant (une fois votre certificat accepté) : pour un enfant dont la famille n’a pas encore de compte. Vous répondez aux mêmes questions qu’un parent et vous préparez le tableau. Sur la page de l’enfant, Relier les parents → Créer le code des parents : les parents créent leur compte, choisissent J’ai un code d’invitation sur le premier écran (Votre enfant) et tapent le code. Le profil devient le leur : ils choisissent leur code accompagnant et ce qui est enregistré ; vous restez dans l’équipe.',
        'Ma bibliothèque : sous Créer un support, touchez ce que vous voulez préparer (TLA, planning, D’abord / Ensuite, cartes à imprimer, ou à partir d’une photo) ; le support prend le nom de ce qu’il contient. Rechercher par nom retrouve un support. Les listes : Éléments créés, Partagés avec moi et Supports des utilisateurs. Touchez un support pour le personnaliser pour un enfant (Personnaliser pour…), le proposer à une famille (Proposer au profil de…) ou le partager Avec un collègue (e-mail) ou l’équipe d’un enfant.',
        'Collaborations : Mes connexions, Demandes envoyées, Ressources partagées et Activité récente.',
      ],
      en: [
        'Professional verification (when the account is created, then in Account & licence): your practice, a diploma or a licence to practise, then an identity document, deleted as soon as the check is finished. Submit for verification: our team accepts, asks for something more or refuses, and you are told in the app. Meanwhile you can explore your workspace and prepare materials, but not yet join a child’s team.',
        'Dashboard: your connected users, the pending proposals, the invitations, and shortcuts.',
        'My AAC users → Connect a user: the Family code (given by the parents), your role, the Rights requested and a message, then Send the request. The family accepts with the rights it chooses. An invitation received from a family is accepted in the same place.',
        'My AAC users → Create a child’s profile (once your certificate is accepted): for a child whose family has no account yet. You answer the same questions as a parent and prepare the board. On the child’s page, Connect the parents → Create the parents’ code: the parents create their account, choose I have an invitation code on the first screen (Your child) and type the code. The profile becomes theirs: they choose their caregiver code and what is recorded; you stay in the team.',
        'My library: under Create a material, tap what you want to prepare (activity board, schedule, First / Then, picture cards, or from a photo); the material is named after what it contains. Search by name finds a material again. The lists: Created items, Shared with me and AAC user materials. Tap a material to personalise it for a child (Personalise for…), propose it to a family (Propose to the profile of…) or share it With a colleague (email) or a child’s team.',
        'Collaborations: My connections, Sent requests, Shared resources and Recent activity.',
      ],
    },
  },
  {
    id: 'proposals',
    track: 'pro',
    icon: 'briefcase',
    title: { fr: 'Professionnels : proposer des changements', en: 'Professionals: proposing changes' },
    steps: {
      fr: [
        'Depuis votre espace, Mes utilisateurs ouvre le tableau d’un enfant. Vos droits sont choisis par la famille : Utiliser, Contribuer ou Modifier directement.',
        'Contribuer : vos changements vont dans un brouillon. Un bandeau indique combien sont prêts ; rien ne change pour l’enfant avant l’accord de la famille.',
        'Envoyer pour approbation : donnez un titre à la proposition et, si vous voulez, la raison. La famille voit l’avant / après et approuve, demande une modification ou refuse.',
        'Modifier directement : vos changements s’appliquent tout de suite et apparaissent dans l’historique. Utiliser : vous pouvez utiliser le tableau et modéliser, sans rien changer.',
        'Sur votre propre appareil, le code accompagnant de la famille ne vous est pas demandé pour préparer des changements. Ma bibliothèque garde vos supports (TLA, plannings, D’abord / Ensuite, cartes) pour les proposer ensuite à une famille. Centre d’apprentissage : un tableau de démonstration pour s’exercer, où rien n’est enregistré.',
      ],
      en: [
        'From your workspace, My AAC users opens a child’s board. Your rights are chosen by the family: Use, Contribute or Edit directly.',
        'Contribute: your changes go into a draft. A banner says how many are ready; nothing changes for the child before the family agrees.',
        'Send for approval: give the proposal a title and, if you like, the reason. The family sees before / after and approves, asks for a change or declines.',
        'Edit directly: your changes apply at once and appear in the history. Use: you can use the board and model, without changing anything.',
        'On your own device, the family’s caregiver code is not asked when you prepare changes. My library keeps your materials (activity boards, schedules, First / Then, cards) so you can propose them to a family later. Learning center: a demonstration board to practise, where nothing is saved.',
      ],
    },
  },
  {
    id: 'linkApp',
    track: 'pro',
    icon: 'external',
    title: { fr: 'Relier une application', en: 'Linking an app' },
    steps: {
      fr: [
        'Mode accompagnant → dossier applis → touchez l’appli → section Application.',
        'Choisissez un modèle (YouTube Kids, Netflix…) ou collez un lien. WhatsApp : https://wa.me/ suivi du numéro avec l’indicatif (ex. https://wa.me/96170123456). Seuls les liens de pages web (https) et d’applications connues sont acceptés, et un lien ne voyage pas avec un tableau partagé : chaque famille ajoute les siens.',
        '« Mots qui l’ouvrent dans une phrase » : ajoutez ou retirez des mots (ex. « chanson » pour Anghami).',
        'N’importe quel mot peut devenir une appli. L’ouverture depuis une phrase se coupe dans les Réglages.',
      ],
      en: [
        'Caregiver mode → apps folder → touch the app → App section.',
        'Pick a preset (YouTube Kids, Netflix…) or paste a link. WhatsApp: https://wa.me/ followed by the number with country code (e.g. https://wa.me/96170123456). Only links to web pages (https) and known apps are accepted, and a link does not travel with a shared board: each family adds its own.',
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
        'A4 ou A3, portrait ou paysage, noir et blanc, cartes à découper. Chaque page porte en bas la ligne de crédit des pictogrammes.',
        'Gardez toujours une version papier : batterie vide, piscine, plage…',
      ],
      en: [
        'Print / PDF (caregiver mode): current board, folders, activity boards, schedules, First / Then.',
        'A4 or A3, portrait or landscape, black and white, cut-out cards. Each page carries the pictogram credit line at the bottom.',
        'Always keep a paper version: flat battery, swimming pool, beach…',
      ],
    },
    action: 'print',
  },
  {
    id: 'quickActions',
    track: 'pro',
    icon: 'check',
    title: { fr: 'Gestes rapides du mode accompagnant', en: 'Quick gestures in caregiver mode' },
    steps: {
      fr: [
        'Touchez deux fois une carte : Modifier, Remplacer l’image, Enregistrer la prononciation, Ajouter aux favoris (« mes mots »), Dupliquer, Supprimer.',
        'Appui long sur une carte, puis glissez-la : elle prend la place où vous la lâchez (deux cartes s’échangent). « Annuler » apparaît quelques secondes. Sans glisser, l’appui long ouvre la carte (pratique pour un dossier).',
        'Touchez deux fois l’onglet d’un TLA : modifier son titre, Dupliquer, Partager (envoyer à quelqu’un qui a un compte, ou enregistrer un fichier), Imprimer.',
        'Sélectionner : touchez plusieurs cartes (Tout sélectionner, Tout désélectionner), puis Copier / Coller, changer la Taille, les envoyer Vers un tableau d’activité, les Imprimer en cartes, ou les retirer avec la corbeille (sur le tableau principal, elle demande de confirmer). Une case + ajoute toujours un mot. Depuis le tableau principal, les cartes envoyées sont copiées : leur place ne change pas.',
        'Nouveau TLA → Créer à partir d’une photo : photographiez un menu ou une boîte de jeu ; vérifiez et corrigez les mots proposés avant de créer.',
        'En mode utilisation, un appui long sur un dossier montre ses mots les plus demandés sans l’ouvrir.',
      ],
      en: [
        'Tap a card twice: Edit, Replace the picture, Record the pronunciation, Add to favourites (“my words”), Duplicate, Delete.',
        'Long press a card, then slide it: it takes the place where you let go (two cards swap). “Undo” shows for a few seconds. Without sliding, the long press opens the card (handy for a folder).',
        'Tap an activity board tab twice: edit its title, Duplicate, Share (send to someone with an account, or save a file), Print.',
        'Select: tap several cards (Select all, Deselect all), then Copy / Paste, change the Size, send them To an activity board, Print them as cards, or remove them with the bin (on the main board it asks to confirm). A + case always adds a word. From the main board, cards that are sent are copied: their place does not change.',
        'New activity board → Create from a photo: photograph a menu or a game box; check and correct the suggested words before creating.',
        'In use mode, a long press on a folder shows its most asked-for words without opening it.',
      ],
    },
    action: 'caregiver',
  },
  {
    id: 'progress',
    track: 'pro',
    icon: 'list',
    title: { fr: 'Suivi de la communication', en: 'Communication progress' },
    steps: {
      fr: [
        'Réglages → Suivi. Rien n’est enregistré tant que la famille n’a pas choisi : l’utilisation, + les mots, + les phrases. Arrêter efface ce que l’appareil gardait ; « Effacer les données enregistrées » efface tout.',
        'Utilisation : jours, sessions, durée, moments de la journée, pages, TLA, appareils, pauses. Vocabulaire : mots les plus utilisés, nouveaux, réutilisés, base / spécifique, catégories, recherches.',
        'Langage (niveau « phrases ») : longueur des messages, combinaisons, relations, pronoms, verbes, négation, questions, connecteurs, récit. Fonctions : demander, refuser, commenter… reconnues dans les phrases et notées par les adultes.',
        'Observations : notez ce que l’enfant a dit ou fait, la fonction, le contexte, avec qui, l’autonomie et le résultat. Sélectionnez-en plusieurs pour les exporter (CSV) ou leur donner un contexte commun.',
        'Les professionnels voient le suivi seulement si la famille coche « Voir le suivi » dans Équipe.',
      ],
      en: [
        'Settings → Progress. Nothing is recorded until the family chooses: use, + words, + sentences. Stopping erases what the device kept; “Erase the recorded data” erases everything.',
        'Use: days, sessions, length, times of day, pages, activity boards, devices, breaks. Vocabulary: most used words, new, used again, core / specific, categories, searches.',
        'Language (“sentences” level): message length, combinations, relations, pronouns, verbs, negation, questions, connectors, telling. Functions: asking, refusing, commenting… recognised in sentences and noted by adults.',
        'Observations: note what the child said or did, the function, the context, with whom, autonomy and result. Select several to export them (CSV) or give them a common context.',
        'Professionals see the progress data only if the family ticks “See the progress data” in Team.',
      ],
    },
    action: 'settings',
  },
  {
    id: 'privacy',
    track: 'pro',
    icon: 'lock',
    title: { fr: 'Données et confidentialité', en: 'Data and privacy' },
    steps: {
      fr: [
        'Le profil de l’enfant (mots, tableaux, réglages) est gardé sur l’appareil et, avec un compte, sur le serveur en Europe, pour l’équipe que vous choisissez. Ce que l’enfant fait n’est enregistré que si la famille l’a choisi (Réglages → Suivi). Les photos restent sur l’appareil qui les a prises.',
        'L’IA (propositions de TLA, photo → TLA, dessins) ne reçoit que le sujet, la photo ou le dessin, jamais le nom ni les phrases de l’enfant ; elle se coupe dans Réglages → Données.',
        'Exporter le profil (sauvegarde) avant de changer d’appareil ; Réinitialiser le profil repart de zéro.',
        'Réglages → Suivi → Aider à améliorer l’application (désactivé par défaut) : des statistiques anonymes, des nombres seulement (âge, durées, nombre de touches, longueur des phrases, réglages choisis comme la langue). Jamais le nom, les mots ni les phrases.',
      ],
      en: [
        'The child’s profile (words, boards, settings) is kept on the device and, with an account, on the server in Europe, for the team you choose. What the child does is recorded only if the family chose it (Settings → Progress). Photos stay on the device that took them.',
        'The AI (board suggestions, photo → board, drawings) only receives the topic, the photo or the drawing, never the child’s name or sentences; it can be turned off in Settings → Data.',
        'Export profile (backup) before changing device; Reset profile starts from scratch.',
        'Settings → Progress → Help improve the app (off by default): anonymous statistics, numbers only (age, durations, number of touches, sentence length, settings chosen such as the language). Never the name, the words or the sentences.',
      ],
    },
    action: 'settings',
  },
];

/**
 * Arabic navigation: the same chapters in simple Modern Standard Arabic (board words quoted in
 * Lebanese, the app's first dialect). PLACEHOLDER translation — to be reviewed by a native speaker.
 */
const AR: Record<string, { title: string; steps: string[]; tip?: string }> = {
  screen: {
    title: 'الشاشة بلمحة',
    steps: [
      'على اليسار، الشريط الدائم، دائماً في المكان نفسه: التواصل (الرئيسية)، اللوحات، الجدول، المؤقت، زر «مساعدة» الأحمر الكبير، ثم الأدوات: «بحث» (العدسة المكبّرة)، الدليل، المرافق. تفتح العدسة ثلاثة تبويبات: «بحث» (إيجاد كلمة)، «لوحة المفاتيح» (الكتابة) و«نموذج» (إظهار جملة على اللوحة).',
      'في الأعلى، شريط الجملة: تُضاف إليه كل كلمة تلمسها.',
      'في الوسط، شبكة الكلمات. تبقى كل كلمة دائماً في مكانها: هكذا يتعلّم الطفل الحركات عن ظهر قلب.',
      'تدلّ الألوان على نوع الكلمة: الأصفر = الأشخاص، الأخضر = الأفعال، الأزرق = الصفات، البرتقالي = الأشياء، البنفسجي = الأسئلة، الوردي = الكلمات الاجتماعية، الأحمر = النفي، الرمادي = الكلمات الصغيرة.',
    ],
  },
  sentence: {
    title: 'تكوين جملة',
    steps: [
      'المس «أنا»، ثم «بدّي»، ثم «إلعب»: تُقال كل كلمة وتُضاف إلى الشريط.',
      'بالفرنسية، يصرّف التطبيق الأفعال تلقائياً: بعد «je» تُقال «vouloir» على شكل «veux».',
      'زر «تكلّم» (الأخضر) يقرأ الجملة كلها. لمس كلمة في الشريط يعيد قولها.',
      '«حذف» يزيل الكلمة الأخيرة، «مسح الكل» يفرغ الشريط، «تراجع» يعود خطوة إلى الوراء.',
    ],
    tip: 'زر «أرني المثال» يعرض الجملة بيد متحركة.',
  },
  folders: {
    title: 'المجلدات',
    steps: [
      'البطاقات البيضاء ذات اللسان هي مجلدات: الأشخاص، الأكل، المشاعر، النشاطات، التطبيقات…',
      'المس مجلداً لترى كلماته، ثم كلمة لإضافتها إلى الجملة.',
      '«رجوع» يعود خطوة؛ «الرئيسية» أو «التواصل» يعيدان إلى اللوحة الرئيسية.',
    ],
    tip: 'زر «جرّب» يضيء الطريق إلى كلمة «طابة».',
  },
  search: {
    title: 'البحث عن كلمة',
    steps: [
      '«بحث» (العدسة المكبّرة)، التبويب الأول، ثم اختر: اكتب الكلمة (الأخطاء الإملائية مقبولة)، أو المس «قل الكلمة» وقلها، أو «ارسم»: ارسم الشيء بإصبعك ثم «ابحث».',
      '«أرني المكان» يضيء الطريق: المجلد أولاً، ثم الكلمة. هكذا يتعلّم الطفل مكانها.',
      'زر + يضيف الكلمة مباشرة إلى الجملة، وزر مكبّر الصوت يقولها.',
    ],
    tip: 'التعرّف على الرسومات يستخدم الذكاء الاصطناعي (يُرسل الرسم فقط)، ويمكن إيقافه في الإعدادات.',
  },
  language: {
    title: 'اختيار اللغات',
    steps: [
      'تُختار اللغات في الإعدادات (وضع المرافق)، بخيارين منفصلين: «لغة التواصل» (ما يقوله الجهاز وما يُكتب على البطاقات) و«لغة التنقل» (القوائم والأزرار والدليل).',
      'مثلاً: التنقل بالعربية والكلمات بالفرنسية، أو التنقل بالفرنسية والكلمات بالعربية. تبقى الكلمات في المكان نفسه في كل اللغات.',
      'تُختار عربية التطبيق عند الإعداد وتُغيَّر من هنا («العربية المستعملة في التطبيق»): اللبنانية، السورية، الأردنية / الفلسطينية، المصرية، السعودية، الخليجية، العراقية، العربية الفصحى — أو «لا شيء» الذي يزيل العربية من لغات الطفل. كلمات اللوحة العربية والاقتراحات تتبع هذا الاختيار. هذا الاختيار يغيّر الكلمات لا الصوت: يقرأ الجهاز العربية بصوته العربي الفصيح مهما كانت اللهجة. إذا لم تُلفظ كلمة جيداً، سجّلها بصوتك (انظر «تعديل كلمة»).',
      'يمكن خلط اللغات في جملة واحدة: تُقال كل كلمة بلغتها.',
    ],
  },
  help: {
    title: 'زر المساعدة',
    steps: [
      'لمسة واحدة تقول «ساعدني!» فوراً، دون أي قائمة قبلها.',
      'ثم خيارات سريعة: أتألّم، أنا خائف، لا أفهم، أريد المغادرة، أحتاج إلى استراحة، الحمّام.',
      '«معلومات مفيدة»: «كيف أتواصل» وجهة الاتصال للطوارئ (تُملأ في وضع المرافق).',
    ],
  },
  tla: {
    title: 'اللوحات (لوحات النشاط)',
    steps: [
      'اللوحة مخصّصة لنشاط محدد: الأكل، الحديقة، طبيب الأسنان، المدرسة…',
      '«اللوحات» في الشريط، ثم المس لسان النشاط.',
      'تبقى الكلمات الأساسية («أنا»، «بدّي»، «كمان»، «خلص!»، «ساعدني»…) دائماً في العمودين على اليسار.',
    ],
  },
  schedule: {
    title: 'الجدول',
    steps: [
      '«الجدول» يعرض اليوم بالصور: «الآن»، «بعد ذلك»، ثم كل الخطوات.',
      '«تمّ» ينتقل إلى الخطوة التالية. بعض الخطوات تفتح لوحتها أو تشغّل مؤقتاً.',
      '«أولاً / ثم»: صورتان فقط («أولاً الفروض، ثم الحديقة»).',
      '«الأسبوع» و«الشهر» (إذا فُعّلا في الإعدادات ← اللوحة ← الشريط الدائم، تحت «الجدول»): نشاطات كل يوم، ورزنامة المناسبات. لمس يوم يقول اسمه.',
    ],
  },
  timer: {
    title: 'المؤقت',
    steps: [
      '«المؤقت»: اختر مدة؛ يظهر الوقت المتبقي على شكل دائرة أو شريط أو أرقام.',
      'يستمر أثناء التواصل. في النهاية: صوت، واهتزاز (على الهاتف)، و«خلص الوقت!».',
      'يظهر فوق اللوحة من دون أن يخفي أي صورة. بجانبه صورة ما ينتظره الطفل (المسبح، الحديقة…): تُقال في النهاية.',
    ],
  },
  apps: {
    title: 'التطبيقات',
    steps: [
      'مجلد «تطبيقات»: يوتيوب، واتساب، سبوتيفاي، أنغامي. لمس تطبيق يفتحه بعد 3 ثوانٍ («إلغاء» إذا كان خطأ). في المتصفح (العرض التجريبي)، المس «افتح»: المتصفحات تمنع الفتح التلقائي.',
      'الجملة التي تذكر تطبيقاً تفتحه أيضاً: «بدّي إسمع موسيقى» ثم «تكلّم» ← سبوتيفاي.',
      'يحتاج واتساب أولاً إلى رقم الشخص الذي نتصل به (انظر «ربط تطبيق»).',
    ],
  },
  keyboard: {
    title: 'لوحة المفاتيح',
    steps: ['لمن يعرف الكتابة: «بحث» (العدسة المكبّرة)، تبويب «لوحة المفاتيح»، اكتب، ثم «تكلّم» أو «أضف إلى الجملة». تدخل كل كلمة مكتوبة إلى الجملة مع رمزها (رمز اللوحة، وإلا رمز من المكتبة) وتُقال كما كُتبت.'],
  },
  caregiver: {
    title: 'وضع المرافق',
    steps: [
      '«المرافق» (القفل). في المرة الأولى تختار رمزك (4 أرقام، تُكتب مرتين)؛ بعدها تكتبه في كل مرة. بعد 5 رموز خاطئة يجب الانتظار قليلاً. يمكنك تغييره في الإعدادات ← الأمان.',
      'الشريط الأصفر يعني أنك تستطيع التعديل: لمس بطاقة يفتح إعداداتها؛ وللمجلد، ضغطة طويلة.',
      '«الإعدادات» و«طباعة / PDF» في الشريط الأصفر. «إنهاء» يعيد إلى وضع الطفل.',
      'يُحفظ كل شيء على الجهاز، حتى بعد إطفائه؛ ومع حساب يُحفظ أيضاً على الإنترنت وتتحدّث أجهزة العائلة الأخرى تلقائياً.',
      'الإعدادات ← اللوحة ← وضع القفل: لا يستطيع الطفل فتح تطبيقات أخرى ولا الرجوع؛ ولمنعه من الخروج من التطبيق، فعّل أيضاً «الوصول الموجَّه» (آيباد) أو «تثبيت الشاشة» (أندرويد).',
    ],
  },
  principles: {
    title: 'المبادئ (اقرأها أولاً)',
    steps: [
      'المفردات الأساسية والتخطيط الحركي: الكلمات المتكررة لا تتحرك أبداً، في أي لغة، كي تصبح الحركة تلقائية. أضف كلمات، لكن تجنّب نقلها.',
      'قدّم النموذج دون أن تطلب: أشِر بنفسك إلى الكلمات على الجهاز عندما تتكلم مع الطفل (انظر «النمذجة»).',
      'يجب أن يكون الجهاز دائماً في متناول اليد — ونسخة ورقية أيضاً (انظر «طباعة نسخة ورقية»).',
      'رمز ألوان فيتزجيرالد المعدّل: يساعد على بناء الجملة (من ← فعل ← ماذا).',
    ],
  },
  reveal: {
    title: 'إظهار المفردات تدريجياً',
    steps: [
      'الإعدادات ← «المفردات الظاهرة»: المستوى 1 (الكلمات الأولى)، 2، أو 3 (الكل).',
      'تحتفظ الكلمات المخفية بمكانها: تكبر المفردات دون نقل أي شيء.',
      'يُضبط مستوى كل كلمة على بطاقتها (وضع المرافق، اللوحة الرئيسية: الشارة N1، N2، N3).',
    ],
  },
  editWord: {
    title: 'تعديل كلمة',
    steps: [
      'في وضع المرافق، المس البطاقة: التسميات بالفرنسية والإنجليزية وبالعربية التي اخترتها.',
      'الصورة: «رموز» (مكتبة دون إنترنت فيها نحو 24 ألف صورة؛ ابحث بالفرنسية أو الإنجليزية أو العربية، والمس اسم مكتبة — Mulberry أو OpenMoji… — لترى صورها فقط)، «صورة» (المعرض أو الكاميرا)، أو «الإنترنت» (رموز Mulberry و OpenMoji على الإنترنت، صور ورسومات حرة، «لصق الصورة»، رابط صورة). يُحفظ المصدر والترخيص مع الكلمة.',
      '«صوت مسجّل»: سجّل صوتك أو صوت أحد الأقارب لهذه الكلمة، مرة لكل لغة (الفرنسية، الإنجليزية، العربية؛ علامة ✓ تبيّن اللغات المسجّلة). يحلّ التسجيل عندها محلّ صوت الجهاز كلما لُمست الكلمة أو قيلت في جملة؛ وعندما تغيّر القواعد شكل الكلمة يقولها صوت الجهاز. مثالي للأسماء وللعربية المحكية في البيت. يبقى التسجيل على الجهاز الذي سُجّل عليه.',
      '«الفئة (اللون)» و«عرض الخانة» (صورة + نص، صورة فقط، نص فقط).',
      'البطاقة: الحجم، التوسّع على الخانات الفارغة المجاورة، شدّة اللون لجذب الانتباه.',
    ],
  },
  pictos: {
    title: 'من أين تأتي الرموز',
    steps: [
      'تأتي الرموز من عشر مكتبات مفتوحة يمكن استعمالها مجاناً: Mulberry (رموز للتواصل البديل) و OpenMoji أولاً، ثم Fluent Emoji و Noto Emoji و Twemoji و Health Icons و Material Symbols و Phosphor و Lucide و Tabler. نحو 24 ألف صورة، كلها داخل التطبيق: لا حاجة إلى الإنترنت.',
      'للكلمة الواحدة غالباً عدة رسومات: اختر ما يفهمه الطفل أكثر، واحتفظ به.',
      'النجمة (*) بجانب كلمة تعني «ترجمة آلية: للتحقق»: انظر إلى الصورة جيداً قبل اختيارها.',
      'الإعدادات ← حول التطبيق ← «حقوق وتراخيص الرموز»: المؤلفون والتراخيص ونصوصها. تتحدّث القائمة تلقائياً؛ والزر نفسه موجود في صفحة الترحيب.',
      'شعارات الشركات ليست ضمن المكتبة؛ وصور الكحول أو التبغ أو الأسلحة لا تُقترح تلقائياً أبداً.',
    ],
  },
  addWord: {
    title: 'إضافة، استبدال، نقل، إزالة',
    steps: [
      'خانة فارغة ← «إنشاء كلمة جديدة» (يُقترح الرمز تلقائياً، أو اختر «صورة» / «الإنترنت») أو اختر كلمة موجودة.',
      'على البطاقة: «استبدال بكلمة أخرى» أو «إزالة من هذه اللوحة».',
      '«نقل هذه البطاقة»، ثم المس المكان الجديد (خانة فارغة، أو كلمة لتبديل مكانيهما). بالنسبة للكلمات الأساسية: يُقرَّر ذلك مع أخصائية النطق.',
      'مجلد «كلماتي» مخصّص لكلمات الطفل الخاصة: الأسماء، الألعاب المفضلة، الأماكن المألوفة.',
    ],
  },
  newTla: {
    title: 'إنشاء لوحة',
    steps: [
      '«اللوحات» ← «لوحة جديدة» (يُطلب رمز المرافق عند الحاجة) ← اكتب الموضوع (مثلاً «préparer un gâteau») ← «اقترح كلمات».',
      'يتعرّف التطبيق على نحو 45 موقفاً مكتوباً بالفرنسية أو الإنجليزية، ويقترح الكلمات والخطوات بالترتيب. موضوع غير معروف: «اسأل الذكاء الاصطناعي» (يُرسل الموضوع فقط).',
      'المس كلمة أو خطوة لإزالتها، أضف غيرها؛ لتغيير ترتيب الخطوات اضغط مطولاً على خطوة ثم اسحبها (أو استعمل الأسهم الصغيرة). ثم «إنشاء اللوحة».',
      'خيار «إنشاء تسلسل لهذه الخطوات أيضاً»: يرتبط التسلسل باللوحة، مع مؤقتات (مثلاً الفرن 30 دقيقة). يظهر في «الجدول».',
      'طرق أخرى: «إنشاء لوحة فارغة» (تختار كل كلمة بنفسك)؛ «الإنشاء من صورة» (قائمة طعام، علبة لعبة، مكوّنات: تحقّق من الكلمات المقترحة قبل الإنشاء)؛ «استيراد ملف» أو «مُشارَكة معي» (لوحة أرسلها لك شخص).',
    ],
  },
  editSchedule: {
    title: 'تحضير جدول',
    steps: [
      '«الجدول» ← «تسلسل جديد» (وضع المرافق): اكتب الموضوع (مثلاً «تنظيف الأسنان»)، «اقترح خطوات»، غيّر الترتيب (ضغطة طويلة ثم سحب)، ثم «إنشاء التسلسل». «تعديل التسلسل» يغيّر اسمه وخطواته.',
      'كل خطوة: رمز، ولوحة مرتبطة، ومدة للمؤقت عند الحاجة.',
      '«أولاً / ثم»: في وضع المرافق، المس كل خانة لاختيار الصورة.',
      'الأسبوع والشهر (فعّلهما من الإعدادات ← اللوحة ← الشريط الدائم، تحت «الجدول»): في وضع المرافق، + يضيف صورة إلى يوم، ولمس صورة يزيلها.',
    ],
  },
  model: {
    title: 'النمذجة («نموذج»)',
    steps: [
      '«بحث» (العدسة المكبّرة)، تبويب «نموذج». «إملاء جملة» أو كتابتها، ثم «أظهر على اللوحة»: يد متحركة تضغط على كل كلمة، بما في ذلك المجلدات، ويقول الشريط إلى أين تذهب. ثم تُقرأ الجملة.',
      '«تسجيل عرض»: المس الكلمات كما يجب أن يفعل الطفل، ثم «إنهاء وحفظ». «إعادة العرض» يُظهره كلما احتجت.',
      'السرعة: بطيئة، عادية أو سريعة.',
    ],
  },
  settings: {
    title: 'الإعدادات المفيدة',
    steps: [
      'للإعدادات عدة صفحات: «اللوحة» (إعدادات الطفل، وهي المشروحة هنا)، «الفريق»، «المتابعة» (إذا اختارتها العائلة) و«الحساب». دون حساب، تشرح صفحات «الفريق» و«المتابعة» و«الحساب» ما ستحتويه فقط.',
      'اللغات: «لغة التواصل» (ما يقوله الجهاز وما يُكتب على البطاقات) و«لغة التنقل» (القوائم والأزرار والدليل).',
      'التواصل: نطق كل كلمة، إضافة الكلمات إلى الجملة، القواعد التلقائية (أوقفها للتدرّب على صيغة)، التأنيث، المنطقة السريعة (نعم، لا، توقف، انتظر…)، المهلة بين ضغطتين على الرمز نفسه (ثانيتان)، اهتزاز الرموز، فتح التطبيق المذكور في جملة.',
      'الصور: «مكتبة الرموز» (رموز أو إيموجي) و«إظهار النص تحت الصور». «العرض وطريقة الاختيار»: أزرار ونص أكبر أو تباين عالٍ، حجم الصور، طريقة الاختيار (المس ثم ارفع الإصبع، بمجرد أن يلمس الإصبع، أو إبقاء الإصبع مضغوطاً مع مدة الضغط)، حركة أقل، اهتزاز خفيف عند اللمس.',
      'الشريط الدائم: إخفاء «اللوحات» أو «الجدول» أو «المؤقت» إذا لم يحتجها الطفل («التواصل» و«مساعدة» يبقيان دائماً). تحت «الجدول»: جدول الأسبوع وجدول الشهر. لا يتغيّر شيء قبل لمس «حفظ» أسفل الصفحة؛ «إلغاء التغييرات» يعيد كل شيء كما كان.',
      'الصوت: أنثوي أو ذكوري، بالغ أو طفل («نوع الصوت»، «عمر الصوت»)، السرعة، أو صوت محدد لكل لغة. «الصوت المستخدم» يبيّن صوت كل لغة: يأتي من الجهاز، و«صوت تقريبي» يعني أن الجهاز لا يملك صوتاً من هذا النوع لهذه اللغة (يمكن تثبيت أصوات أخرى من إعدادات الجهاز). زر المساعدة: الرسالة الأولى التي تُقال، والمعلومات المفيدة.',
      'أيضاً: «طبقة الصوت» (أغلظ أو أحدّ، تُضبط بالسمع)، «وضع القفل (للطفل)»، «الأمان» (رمز المرافق)، «البيانات» (اقتراحات الذكاء الاصطناعي، تصدير الملف الشخصي، إعادة ضبط الملف الشخصي) و«حول التطبيق» (حقوق وتراخيص الرموز).',
    ],
  },
  team: {
    title: 'فريق الطفل',
    steps: [
      'الإعدادات (وضع المرافق) ← الفريق: الأشخاص الذين لديهم صلاحية، دورهم وما يمكنهم فعله.',
      'دعوة شخص: الاسم، الدور، المستوى (استعمال، مساهمة، تعديل مباشر) والصلاحيات، ثم أعطِ الرمز. يمكن لمختصّ أيضاً أن يطلب الانضمام برمز المختصّين: تختار صلاحياته قبل القبول.',
      'الاقتراحات: يظهر كل تغيير مقترح قبل / بعد؛ وافق، أو اطلب تعديلاً، أو ارفض. تغيير مكان كلمة أساسية يحتاج إلى تأكيد.',
      'السجل: من غيّر ماذا ومتى (أبداً ما قاله الطفل)، مع «تراجع».',
      'على شخص من الفريق: «انتهاء الصلاحية» (أسبوع، شهر، 3 أشهر أو بلا نهاية) و«سحب الصلاحية» الذي يُطبَّق فوراً. «الجديد» يجمع ما حدث (دعوة قُبلت، طلب، اقتراح وارد)؛ «تغيير الرمز» يستبدل رمز المختصّين.',
    ],
  },
  account: {
    title: 'حسابك وأطفالك وأجهزتك',
    steps: [
      'الإعدادات (وضع المرافق) ← الحساب ← «حسابي»: اسمك، «تغيير كلمة المرور»، «تسجيل الخروج». عند تسجيل الخروج تغادر لوحات الأطفال الجهاز (وتبقى في حسابكم)؛ على حاسوب مشترك، اختر أيضاً مسح الصور والتسجيلات.',
      '«الأطفال»: حساب واحد لعدة أطفال. «إضافة طفل» ينشئ ملفه؛ المس طفلاً في القائمة لفتح لوحته.',
      '«الأجهزة والمزامنة»: الأجهزة المربوطة، آخر مزامنة، «مزامنة الآن»، وسحب جهاز مفقود. «ربط جهاز» يعطي رمزاً من 8 أحرف وأرقام يُكتب على الجهاز الآخر («ربط هذا الجهاز اللوحي برمز» في الصفحة الأولى): «صلاحية كاملة (جهاز الطفل)» أو «استعمال فقط (المدرسة، المربية…)». على جهاز مربوط: «فكّ ربط هذا الجهاز».',
      '«الخصوصية والبيانات»: «تصدير الملف (ملف)»، حذف ملف الطفل أو «حذف حسابي». الحذف نهائي: يجب كتابته للتأكيد.',
      '«التفضيلات»: «لغة القوائم» و«الإشعارات داخل التطبيق». «الكتابة إلى الفريق»: فكرة أو مشكلة تريد إبلاغنا بها (لا تكتب اسم طفل أبداً). «فتح الدليل» يعيدك إلى هنا.',
    ],
  },
  workspace: {
    title: 'للمختصين: مساحتك',
    steps: [
      '«التحقق المهني» (عند إنشاء الحساب، ثم في «الحساب والترخيص»): ممارستك، شهادة أو ترخيص مهني، ثم وثيقة هوية تُحذف فور انتهاء التحقق. «إرسال للتحقق»: فريقنا يقبل أو يطلب معلومات إضافية أو يرفض، ونخبرك داخل التطبيق. في الانتظار يمكنك استكشاف مساحتك وتحضير المواد، لكن لا يمكنك بعد الانضمام إلى فريق طفل.',
      '«الرئيسية»: مستخدموك المرتبطون، الاقتراحات قيد الانتظار، الدعوات، واختصارات.',
      '«المستخدمون» ← «ربط مستخدم»: «رمز العائلة» (يعطيه الأهل)، دورك، «الصلاحيات المطلوبة» ورسالة، ثم «إرسال الطلب». تقبل العائلة بالصلاحيات التي تختارها. الدعوة الواردة من عائلة تُقبل في المكان نفسه.',
      '«المستخدمون» ← «إنشاء ملف طفل» (بعد قبول شهادتك): لطفل ليس لعائلته حساب بعد. تجيب عن الأسئلة نفسها التي يجيب عنها الأهل وتحضّر اللوحة. في صفحة الطفل، «ربط الأهل» ← «إنشاء رمز الأهل»: ينشئ الأهل حسابهم، ويختارون «لديّ رمز دعوة» في الشاشة الأولى («طفلك») ويكتبون الرمز. يصبح الملف ملفهم: يختارون رمز المرافق وما يُسجَّل؛ وتبقى أنت ضمن الفريق.',
      '«مكتبتي»: تحت «إنشاء مادة»، اضغط على ما تريد تحضيره (لوحة نشاط، جدول، «أولاً / ثم»، بطاقات للطباعة، أو من صورة)؛ تأخذ المادة اسم ما تحتويه. «البحث بالاسم» يجد مادة من جديد. القوائم: «العناصر المُنشأة»، «مشترك معي» و«مواد المستخدمين». اضغط على مادة لتخصيصها لطفل («تخصيص لـ…»)، أو اقتراحها على عائلة («اقتراح على ملف…»)، أو مشاركتها «مع زميل (بريد إلكتروني) أو فريق طفل».',
      '«التعاون»: «اتصالاتي»، «الطلبات المرسلة»، «الموارد المشتركة» و«النشاط الأخير».',
    ],
  },
  proposals: {
    title: 'للمختصين: اقتراح تغييرات',
    steps: [
      'من مساحتك، «المستخدمون» يفتح لوحة طفل. العائلة هي التي تختار صلاحياتك: «استعمال»، «مساهمة» أو «تعديل مباشر».',
      '«مساهمة»: تذهب تغييراتك إلى مسودة. شريط يبيّن عدد التغييرات الجاهزة؛ لا يتغيّر شيء للطفل قبل موافقة العائلة.',
      '«إرسال للموافقة»: أعطِ الاقتراح عنواناً، واذكر السبب إن شئت. ترى العائلة ما قبل وما بعد، فتوافق أو تطلب تعديلاً أو ترفض.',
      '«تعديل مباشر»: تُطبَّق تغييراتك فوراً وتظهر في السجلّ. «استعمال»: يمكنك استعمال اللوحة والنمذجة دون تغيير أي شيء.',
      'على جهازك أنت، لا يُطلب منك رمز المرافق الخاص بالعائلة لتحضير التغييرات. «مكتبتي» تحفظ موادك (لوحات نشاط، جداول، «أولاً / ثم»، بطاقات) لتقترحها لاحقاً على عائلة. «مركز التعلّم»: لوحة تجريبية للتدرّب، لا يُحفظ فيها شيء.',
    ],
  },
  linkApp: {
    title: 'ربط تطبيق',
    steps: [
      'وضع المرافق ← مجلد «تطبيقات» ← المس التطبيق ← قسم «التطبيق».',
      'اختر نموذجاً (YouTube Kids، Netflix…) أو الصق رابطاً. واتساب: https://wa.me/ متبوعاً بالرقم مع رمز البلد (مثلاً https://wa.me/96170123456). تُقبل فقط روابط صفحات الويب (https) والتطبيقات المعروفة، ولا ينتقل الرابط مع لوحة مشتركة: كل عائلة تضيف روابطها.',
      '«كلمات تفتحه في جملة»: أضف كلمات أو أزلها (مثلاً «غنية» لأنغامي).',
      'يمكن لأي كلمة أن تصبح تطبيقاً. ويمكن إيقاف الفتح من جملة في الإعدادات.',
    ],
  },
  print: {
    title: 'طباعة نسخة ورقية',
    steps: [
      '«طباعة / PDF» (وضع المرافق): اللوحة المعروضة، المجلدات، اللوحات، الجداول، «أولاً / ثم».',
      'A4 أو A3، عمودي أو أفقي، أبيض وأسود، بطاقات للقص. في أسفل كل صفحة سطر حقوق الرموز.',
      'احتفظ دائماً بنسخة ورقية: بطارية فارغة، مسبح، شاطئ…',
    ],
  },
  quickActions: {
    title: 'الحركات السريعة في وضع المرافق',
    steps: [
      'المس البطاقة مرتين: تعديل، تغيير الصورة، تسجيل اللفظ، إضافة إلى المفضّلة («كلماتي»)، نسخ، حذف.',
      'اضغط مطوّلاً على بطاقة ثم اسحبها: تأخذ المكان الذي تتركها فيه (تتبادل البطاقتان). يظهر «تراجع» لبضع ثوانٍ. من دون سحب، الضغطة الطويلة تفتح البطاقة (مفيدة للمجلد).',
      'المس تبويب لوحة النشاط مرتين: تعديل العنوان، نسخ، مشاركة (إرسال إلى شخص لديه حساب، أو حفظ ملف)، طباعة.',
      'تحديد: المس عدة بطاقات («تحديد الكل»، «إلغاء تحديد الكل») ثم نسخ / لصق، تغيير الحجم، إرسالها إلى لوحة نشاط، طباعتها كبطاقات، أو إزالتها بسلة المهملات (على اللوح الرئيسي تطلب تأكيداً). خانة + تضيف كلمة دائماً. من اللوح الرئيسي تُنسخ البطاقات المُرسلة ولا يتغيّر مكانها.',
      'لوحة نشاط جديدة ← الإنشاء من صورة: صوّر قائمة طعام أو علبة لعبة، وتحقّق من الكلمات المقترحة وصحّحها قبل الإنشاء.',
      'في وضع الاستعمال، الضغطة الطويلة على مجلد تُظهر كلماته الأكثر طلباً من دون فتحه.',
    ],
  },
  progress: {
    title: 'متابعة التواصل',
    steps: [
      'الإعدادات ← المتابعة. لا يُسجَّل شيء قبل أن تختار العائلة: الاستعمال، + الكلمات، + الجمل. الإيقاف يمحو ما احتفظ به الجهاز؛ و«محو البيانات المسجّلة» يمحو كل شيء.',
      'الاستعمال: الأيام، الجلسات، المدة، أوقات النهار، الصفحات، لوحات النشاط، الأجهزة، الانقطاعات. المفردات: الكلمات الأكثر استعمالاً، الجديدة، المُعاد استعمالها، الأساسية / الخاصة، الفئات، البحث.',
      'اللغة (مستوى «الجمل»): طول الرسائل، التراكيب، العلاقات، الضمائر، الأفعال، النفي، الأسئلة، أدوات الربط، السرد. الوظائف: الطلب، الرفض، التعليق… يتعرّف عليها التطبيق ويدوّنها البالغون.',
      'الملاحظات: دوّن ما قاله الطفل أو فعله، الوظيفة، السياق، مع مَن، الاستقلالية والنتيجة. حدّد عدة ملاحظات لتصديرها (CSV) أو لإعطائها سياقاً مشتركاً.',
      'لا يرى المختصون المتابعة إلا إذا فعّلت العائلة «رؤية المتابعة» في الفريق.',
    ],
  },
  privacy: {
    title: 'البيانات والخصوصية',
    steps: [
      'يُحفظ ملف الطفل (الكلمات، اللوحات، الإعدادات) على الجهاز، ومع الحساب على الخادم في أوروبا، للفريق الذي تختاره. لا يُسجَّل ما يفعله الطفل إلا إذا اختارت العائلة ذلك (الإعدادات ← المتابعة). تبقى الصور على الجهاز الذي التقطها.',
      'الذكاء الاصطناعي (اقتراحات اللوحات، من صورة إلى لوحة، الرسومات) لا يتلقى إلا الموضوع أو الصورة أو الرسم، لا اسم الطفل ولا جمله أبداً، ويمكن إيقافه في الإعدادات ← البيانات.',
      '«تصدير الملف الشخصي (نسخة احتياطية)» قبل تغيير الجهاز؛ «إعادة ضبط الملف الشخصي» يبدأ من الصفر.',
      'الإعدادات ← المتابعة ← «المساعدة في تحسين التطبيق» (متوقّف افتراضياً): إحصاءات مجهولة الهوية، أرقام فقط (العمر، المدد، عدد اللمسات، طول الجمل، والإعدادات المختارة مثل اللغة). لا الاسم ولا الكلمات ولا الجمل أبداً.',
    ],
  },
};

/** All chapters, with the Arabic merged in (a missing translation falls back to French). */
export const GUIDE: GuideChapter[] = BASE.map((c) => {
  const ar = AR[c.id];
  return {
    ...c,
    title: { ...c.title, ar: ar?.title ?? c.title.fr },
    steps: { ...c.steps, ar: ar?.steps ?? c.steps.fr },
    tip: c.tip ? { ...c.tip, ar: ar?.tip ?? c.tip.fr } : undefined,
  };
});
