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
        'À gauche, la barre universelle, toujours au même endroit : CAA (accueil), TLA, Planning, Minuteur, le gros bouton rouge Aide, puis les outils Chercher (la loupe), Guide, Réglages, Verrou et Accompagnant. La loupe ouvre trois onglets : Trouver dans le tableau (chercher un mot), Un nouveau mot (l’écrire au clavier) et Écrire pour modéliser (montrer une phrase sur le tableau).',
        'En haut, la bande de phrase : chaque mot touché s’y ajoute.',
        'Au centre, la grille de mots. Chaque mot garde toujours sa place : c’est ce qui permet à l’enfant d’apprendre les gestes par cœur.',
        'Les couleurs indiquent le type de mot : jaune = personnes, vert = actions, bleu = descriptions, orange = objets, violet = questions, rose = mots sociaux, rouge = négation, gris = petits mots.',
      ],
      en: [
        'On the left, the universal bar, always in the same place: AAC (home), Boards, Schedule, Timer, the big red Help button, then the tools Search (the magnifying glass), Guide, Settings, Lock and Caregiver. The magnifying glass opens three tabs: Find on the board (look for a word), A new word (type it) and Write to model (show a sentence on the board).',
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
        'Touchez un dossier pour voir ses mots, puis un mot pour l’ajouter à la phrase. Le nom du dossier (« corps », « nourriture »…) n’est jamais dit ni ajouté à la phrase : ce n’est pas un mot, c’est la porte vers ses mots.',
        'Retour revient en arrière ; Accueil ou CAA ramène au tableau principal.',
      ],
      en: [
        'White cards with a tab are folders: people, food, feelings, activities, apps…',
        'Touch a folder to see its words, then a word to add it to the sentence. The folder’s name (“body”, “food”…) is never said nor added to the sentence: it is not a word, it is the way in to its words.',
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
        'Chercher (la loupe), premier onglet (Trouver dans le tableau), puis au choix : tapez le mot (les fautes sont comprises : « pome » trouve « pomme »), ou touchez Dire le mot et dites-le. Quand l’aide par IA est disponible, un bouton Dessiner s’ajoute : dessinez l’objet avec le doigt puis Trouver.',
        'Montre-moi où fait clignoter le chemin : d’abord le dossier, puis le mot. L’enfant apprend ainsi où il se trouve.',
        'Le bouton + ajoute le mot directement à la phrase ; le haut-parleur le dit. Un dossier trouvé n’a que Montre-moi où : son nom n’est pas un mot à dire.',
        'La même recherche est partout où l’on cherche un mot ou une image : Choisir un mot (pour une case ou une étape de séquence), la bibliothèque de pictogrammes, les supports d’un professionnel. Partout : écrivez, ou touchez Dire le mot.',
      ],
      en: [
        'Search (the magnifying glass), first tab (Find on the board), then either type the word (typos are fine: “aple” finds “apple”), or touch Say the word and say it. When the AI helper is available, a Draw button is added: draw the thing with a finger, then Find.',
        'Show me where lights up the way: first the folder, then the word. This is how the child learns where it is.',
        'The + button adds the word straight to the sentence; the speaker button says it. A folder that is found only has Show me where: its name is not a word to say.',
        'The same search is everywhere a word or a picture is looked for: Choose a word (for a card or a step of a sequence), the pictogram library, a professional’s materials. Everywhere: type, or touch Say the word.',
      ],
    },
    tip: {
      fr: 'Le bouton Dessiner n’apparaît que si l’aide par IA est disponible : la reconnaissance des dessins l’utilise (seul le dessin est envoyé) ; elle se coupe dans les Réglages.',
      en: 'The Draw button only shows while the AI helper is available: drawing recognition uses it (only the drawing is sent); it can be turned off in Settings.',
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
        'L’arabe de l’application est demandé à l’installation quand l’arabe fait partie des langues de l’enfant, et se change ici (Arabe) : libanais, syrien, jordanien / palestinien, égyptien, saoudien, du Golfe, irakien, arabe standard. Ce choix n’apparaît que si l’arabe est coché dans Langues de l’enfant ; décocher l’arabe le retire de toute l’application. Les mots arabes du tableau et les propositions suivent ce choix. Ce choix change les mots, pas la voix : l’appareil lit l’arabe avec sa voix arabe standard, quel que soit le dialecte. Si un mot ne sonne pas bien, enregistrez-le avec votre propre voix (voir « Modifier un mot »).',
        'On peut mélanger les langues dans une même phrase : chaque mot est dit dans sa langue.',
      ],
      en: [
        'Languages are chosen in Settings (caregiver mode), with two separate choices: Communication language (what the device says and what is written on the cards) and Navigation language (menus, buttons, guide).',
        'For example: navigate in English and speak in Arabic, or the other way round. Words stay exactly in the same place in every language.',
        'The Arabic of the app is asked at set-up when Arabic is one of the child’s languages, and changed here (Arabic): Lebanese, Syrian, Jordanian / Palestinian, Egyptian, Saudi, Gulf, Iraqi, Modern Standard Arabic. That choice only shows when Arabic is ticked in Child’s languages; unticking Arabic removes it from the whole app. The Arabic words of the board and the suggestions follow that choice. That choice changes the words, not the voice: the device reads Arabic with its standard Arabic voice, whatever the dialect. If a word does not sound right, record it with your own voice (see “Editing a word”).',
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
        'Les mots de base (je, vouloir, encore, stop, aide-moi…) sont toujours là, en haut de leur colonne : comme sur le tableau principal, chaque sorte de mot a sa colonne (personnes, actions, petits mots…).',
      ],
      en: [
        'An activity board is made for one situation: meal, park, dentist, school…',
        'Boards in the bar, then touch the activity’s tab.',
        'Core words (I, want, more, stop, help me…) are always there, at the top of their column: as on the main board, each kind of word has its own column (people, actions, little words…).',
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
        'Il continue pendant qu’on communique. À la fin : un son et « C’est fini ! ».',
        'Il se place au-dessus du tableau sans cacher de picto. À côté, le picto de ce que l’enfant attend (la piscine, le parc…) : il est dit à la fin. L’enfant peut choisir un mot existant ; Créer un nouveau mot (photo, enregistrement) demande le code accompagnant.',
      ],
      en: [
        'Timer: choose a duration; the time left shows as a circle, a bar or digits.',
        'It keeps running while you communicate. At the end: a sound and “Time is up!”.',
        'It sits above the board without hiding any picture. Next to it, the picture of what the child is waiting for (the pool, the park…): it is said at the end. The child can choose an existing word; Create a new word (photo, recording) asks for the caregiver code.',
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
        'Dossier applis : YouTube, WhatsApp, Spotify, Anghami. Sur la tablette, toucher une appli demande d’abord le code accompagnant (« Le tableau va ouvrir une autre application ») : l’enfant ne quitte pas l’application seul. En mode accompagnant, l’appli s’ouvre après 3 secondes (Annuler si c’est une erreur). Dans un navigateur (démo en ligne), touchez Ouvrir : les navigateurs interdisent l’ouverture automatique.',
        'Une phrase qui parle d’une appli l’ouvre aussi : « je veux écouter de la musique » puis Parler → Spotify.',
        'WhatsApp attend d’abord le numéro de la personne à appeler (voir « Relier une application »).',
      ],
      en: [
        'Apps folder: YouTube, WhatsApp, Spotify, Anghami. On the tablet, touching an app first asks for the caregiver code (“The board is about to open another app”): the child does not leave the app alone. In caregiver mode, the app opens after 3 seconds (Cancel if it was a mistake). In a browser (online demo), tap Open: browsers forbid opening it automatically.',
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
      fr: ['Pour ceux qui savent écrire : Chercher (la loupe), onglet Un nouveau mot, écrivez (ou touchez Dire le mot et dites-le), puis Parler ou Ajouter à la phrase. Chaque mot écrit arrive dans la phrase avec son pictogramme (celui du tableau, sinon celui de la bibliothèque) et il est dit tel qu’il est écrit.'],
      en: ['For those who can write: Search (the magnifying glass), A new word tab, type (or touch Say the word and say it), then Speak or Add to sentence. Each typed word goes into the sentence with its pictogram (the one of the board, else one from the library) and is said exactly as written.'],
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
        'Accompagnant (cadenas). Vous choisissez votre code (4 chiffres, tapés deux fois) à la première ouverture du tableau, avant ce guide : ce premier clavier ne se ferme pas, le code doit exister avant d’utiliser le tableau (la barre et le bouton Aide restent utilisables). Ensuite vous le tapez à chaque fois ; tant qu’il n’est pas choisi, aucun code n’ouvre rien. Sur un tableau déjà utilisé qui n’a pas encore de code, Accompagnant demande d’abord le mot de passe de votre compte (ou un code reçu par e-mail), puis vous choisissez le code ; une tablette reliée par un code ne le choisit jamais. Après 5 codes faux, il faut attendre un peu. Vous pouvez le changer dans Réglages → Code et données. Code oublié ? (sous le clavier) : un parent connecté tape le mot de passe de son compte, ou reçoit un code par e-mail ou SMS et le tape, puis choisit un nouveau code ; sur une tablette reliée, faites-le depuis le téléphone ou l’ordinateur d’un parent.',
        'Le bandeau jaune indique qu’on peut modifier : toucher une case ouvre ses réglages ; pour un dossier, appui long.',
        'Réglages et Imprimer / PDF sont dans le bandeau. Terminer revient au mode enfant. Le mode accompagnant se ferme aussi tout seul après 5 minutes sans toucher l’écran, et quand vous quittez l’application (ou changez d’onglet) : l’enfant retrouve son tableau. Des réglages modifiés et pas encore enregistrés ne sont pas perdus : vous les retrouvez en rouvrant Réglages.',
        'Tout est gardé sur l’appareil, même après l’avoir éteint ; avec un compte, c’est aussi sauvegardé en ligne et les autres appareils de la famille se mettent à jour.',
        'Dans la barre, deux boutons pour les parents, chacun protégé par le code accompagnant : Réglages (ouvre les réglages sans passer en mode accompagnant) et Verrou. Verrou ouvre le Mode verrouillé (enfant) : l’enfant ne peut plus ouvrir d’autres applis ni revenir en arrière ; pour l’empêcher de quitter l’application, activez aussi l’Accès guidé (iPad) ou l’épinglage d’écran (Android). Dans un navigateur, la page ne se recharge plus quand on la tire vers le bas, et le plein écran revient au toucher suivant. Pour le retirer : Verrou → code.',
      ],
      en: [
        'Caregiver (padlock). You choose your code (4 digits, typed twice) the first time the board opens, before this guide: this first keypad cannot be closed, the code must exist before the board is used (the bar and the Help button stay usable). After that you type it each time; until it is chosen, no code opens anything. On a board already in use that has no code yet, Caregiver first asks for your account’s password (or a code received by e-mail), then you choose the code; a tablet linked with a code never chooses it. After 5 wrong codes you have to wait a little. You can change it in Settings → Code and data. Forgot the code? (under the keypad): a signed-in parent types their account’s password, or receives a code by e-mail or text message and types it, then chooses a new code; on a linked tablet, do it from a parent’s phone or computer.',
        'The yellow banner means you can edit: touching a card opens its settings; for a folder, long press.',
        'Settings and Print / PDF are in the banner. Done goes back to child mode. Caregiver mode also closes by itself after 5 minutes without a touch, and when you leave the app (or change tab): the child finds their board again. Settings you changed and did not save yet are not lost: you find them again when you open Settings.',
        'Everything is kept on the device, even after switching it off; with an account it is also saved online and the family’s other devices update themselves.',
        'In the bar, two buttons for the parents, each protected by the caregiver code: Settings (opens the settings without switching to caregiver mode) and Lock. Lock opens the Child lock: the child can no longer open other apps or go back; to stop them leaving the app, also turn on Guided Access (iPad) or screen pinning (Android). In a browser, the page no longer reloads when it is pulled down, and full screen comes back at the next touch. To take it off: Lock → code.',
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
        'Place des mots affichés → « Sans trous » : les mots se rangent en haut de leur colonne (certains descendront quand vous en afficherez plus). « Places définitives » : chaque mot est déjà à sa place du tableau complet, rien ne bougera.',
        'Le niveau de chaque mot se règle sur sa case (mode accompagnant, tableau principal : badge N1, N2, N3).',
      ],
      en: [
        'Settings → Revealed vocabulary: level 1 (first words), 2, or 3 (everything).',
        'Place of the words shown → “No gaps”: the words line up at the top of their column (some move down when you show more). “Final places”: each word is already where it is on the complete board, nothing will move.',
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
        'Image, deux choix : Bibliothèque de l’application (environ 24 000 pictogrammes hors ligne ; cherchez en français, en anglais ou en arabe, et touchez le nom d’une banque — Mulberry, OpenMoji… — pour ne voir que la sienne) ou Votre bibliothèque (Choisir une image enregistrée sur l’appareil, ou Prendre une photo). Sur une tablette, le système demande la première fois quelles photos l’application peut voir (celles que vous choisissez, toutes, ou aucune) ; dans un navigateur, seule l’image que vous choisissez est transmise. La source et la licence d’un pictogramme sont gardées avec le mot.',
        'Voix enregistrée : enregistrez votre voix ou celle d’un proche pour ce mot, une fois par langue (français, anglais, arabe ; une coche montre les langues déjà enregistrées). L’enregistrement remplace alors la voix de l’appareil chaque fois que le mot est touché ou dit dans une phrase ; quand la grammaire change le mot (« vouloir » dit « veux »), c’est la voix de l’appareil qui le dit. Idéal pour les prénoms et pour l’arabe parlé à la maison. Le silence avant et après le mot est retiré tout seul : pas besoin de vous dépêcher entre le bouton et le mot. Si un appareil ne peut pas lire un enregistrement, sa propre voix dit le mot : l’enfant n’est jamais sans voix. L’enregistrement reste sur l’appareil où il a été fait.',
        'Catégorie (couleur) et Affichage de la case (image + texte, image seule, texte seul).',
        'Carte : taille, agrandir sur les cases vides voisines, intensité de la couleur pour attirer l’attention.',
      ],
      en: [
        'In caregiver mode, touch the card: labels in French, English and the Arabic you chose.',
        'Picture, two choices: App’s library (about 24,000 offline pictograms; search in French, English or Arabic, and touch a library’s name — Mulberry, OpenMoji… — to see only its pictures) or Your library (Choose a picture saved on the device, or Take a photo). On a tablet, the system asks the first time which photos the app may see (the ones you select, all, or none); in a browser, only the picture you choose is passed on. A pictogram’s source and licence are kept with the word.',
        'Recorded voice: record your voice or a relative’s for this word, once per language (French, English, Arabic; a tick shows the languages already recorded). The recording then replaces the device’s voice every time the word is touched or said in a sentence; when grammar changes the word (“want” said “wants”), the device’s voice says it. Ideal for names and for the Arabic spoken at home. The silence before and after the word is removed by itself: no need to hurry between the button and the word. If a device cannot play a recording, its own voice says the word: the child is never left without a voice. The recording stays on the device where it was made.',
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
        'Case vide → Créer un nouveau mot (écrivez-le ou touchez Dire le mot ; le pictogramme est proposé tout seul, ou choisissez Votre bibliothèque pour une image à vous ; quand la voix est Fille ou Garçon, « Enregistrez ce mot » est obligatoire : le mot nouveau sera dit avec votre voix, et Enregistrer ne s’active qu’après l’enregistrement) ou choisissez un mot existant (écrivez ou dites-le pour le trouver). Retour, en haut de l’écran, revient à l’écran d’avant ; la croix ferme tout.',
        'Sur une case : Remplacer par un autre mot, ou Retirer de ce tableau.',
        'Déplacer cette case, puis touchez la nouvelle place (une case vide, ou un mot pour les échanger). Pour les mots de base : à décider avec l’orthophoniste.',
        'Le dossier « mes mots » est prévu pour les mots de l’enfant : prénoms, jeux préférés, lieux familiers.',
      ],
      en: [
        'Empty card → Create a new word (type it or touch Say the word; the pictogram is suggested automatically, or choose Your library for a picture of your own; when the voice is Girl or Boy, “Record this word” is required: the new word will be said with your own voice, and Save only becomes active once it is recorded) or choose an existing word (type or say it to find it). Back, at the top of the screen, returns to the screen before; the cross closes everything.',
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
        'Touchez un mot ou une étape pour le retirer, ajoutez-en : sur le tableau créé, chaque type de mot a sa colonne comme sur le tableau principal (personnes, actions, petits mots, descriptions, questions, mots sociaux, choses), et un mot ajouté va dans la sienne. Pour changer l’ordre des étapes, appui long sur une étape puis glisser (ou les petites flèches). Puis Créer le TLA.',
        'Option « Créer aussi la séquence de ces étapes » : la séquence est reliée au TLA, avec minuteurs (ex. four 30 min). Elle apparaît dans Planning.',
        'Autres façons : Créer un TLA vide (vous choisissez chaque mot) ; Créer à partir d’une photo (un menu, une boîte de jeu, des ingrédients : vérifiez les mots proposés avant de créer) ; Importer un fichier ou Partagés avec moi (un TLA qu’on vous a envoyé).',
      ],
      en: [
        'Boards → New board (the caregiver code is asked if needed) → type the topic (e.g. “baking a cake”) → Suggest words.',
        'The app recognises about 45 situations and suggests the words AND the steps in order. Unknown topic: Ask the AI (only the topic is sent).',
        'Touch a word or a step to remove it, add more: on the board that is created, each kind of word has its own column like the main board (people, actions, little words, describing words, questions, social words, things), and a word you add goes to its column. To change the order of the steps, hold a step then slide it (or use the small arrows). Then Create board.',
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
        'Chaque étape : un pictogramme, un TLA lié et une durée de minuteur si besoin. Ajouter une étape ouvre Choisir un mot : choisissez le mot, ou Retour pour revenir à la séquence sans rien ajouter (la croix, elle, ferme tout).',
        'D’abord / Ensuite : en mode accompagnant, touchez chaque case pour choisir l’image.',
        'Semaine et Mois (à activer dans Réglages → Tableau → Barre universelle, sous Planning) : en mode accompagnant, + ajoute un pictogramme à un jour, toucher un pictogramme le retire.',
      ],
      en: [
        'Schedule → New sequence (caregiver mode): type the topic (e.g. “brushing teeth”), Suggest steps, change the order (hold then slide), then Create the sequence. Edit sequence changes its name and its steps.',
        'Each step: a pictogram, a linked activity board and a timer duration if needed. Add a step opens Choose a word: choose the word, or Back to return to the sequence without adding anything (the cross closes everything).',
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
    title: { fr: 'Modéliser (Écrire pour modéliser)', en: 'Modelling (Write to model)' },
    steps: {
      fr: [
        'Chercher (la loupe), onglet Écrire pour modéliser. Dicter une phrase, ou l’écrire, puis Montrer sur la grille : une main animée appuie sur chaque mot, en ouvrant les dossiers sur le chemin (leur nom est écrit dans le bandeau, jamais dit), et le bandeau montre où elle va. Puis la phrase est lue.',
        'Enregistrer une démonstration (hors du mode accompagnant, le code est demandé d’abord) : touchez les mots comme l’enfant devrait le faire, puis Terminer et garder. Rejouer la montre autant de fois que nécessaire ; la supprimer demande aussi le code.',
        'Vitesse : lente, normale ou rapide.',
      ],
      en: [
        'Search (the magnifying glass), Write to model tab. Dictate a sentence, or type it, then Show on the board: an animated hand presses each word, opening the folders on the way (their name is written in the banner, never said), and the banner shows where it goes. Then the sentence is read.',
        'Record a demonstration (outside caregiver mode, the code is asked first): touch the words the way the child should, then Finish and keep. Replay shows it as often as needed; deleting it asks for the code too.',
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
        'Les Réglages ont plusieurs pages : Tableau (les réglages de l’enfant, décrits ici), Équipe, Suivi (si la famille l’a choisi) et Compte. Sans compte, Équipe, Suivi et Compte expliquent seulement ce qu’ils contiendront. En haut, le champ « Rechercher un réglage (voix, code, langue…) » trouve un réglage par son nom. La page Tableau est rangée en groupes : touchez un nom pour l’ouvrir.',
        'Langues : Langues de l’enfant, Langue de communication (ce que dit l’appareil, ce qui est écrit sur les cases), Arabe (le dialecte, quand l’arabe est coché) et Langue de navigation (menus, boutons, guide).',
        'Phrase : prononcer chaque mot, ajouter à la phrase, grammaire automatique (à couper pour travailler une forme), accords au féminin (seulement avec le français ou l’arabe parmi les langues de l’enfant : l’anglais n’a pas d’accords), zone rapide (oui, non, stop, attends…), ouvrir l’application citée dans la phrase. Toucher : la façon de sélectionner (toucher puis lever le doigt, dès que le doigt touche, ou garder le doigt appuyé avec une durée d’appui), la pause avant de retoucher la même image (2 s : fini les « pas pas pas »).',
        'Mots et images : les mots affichés (niveau), Bibliothèque de symboles (Pictogrammes ou Emoji), Afficher le texte sous les images, taille des images, et Mots et tableaux supprimés (un mot ou un tableau d’activité supprimé est gardé 30 jours : Remettre le replace à sa place). Affichage : boutons et texte plus grands ou contraste élevé, moins d’animations (ce choix arrête le mouvement des images), les images qui bougent quand on les touche (le bouton Essayer montre le mouvement).',
        'Barre universelle : masquer TLA, Planning ou Minuteur si l’enfant n’en a pas besoin (CAA et Aide restent toujours). Sous Planning : le planning de la semaine et celui du mois. Rien ne change tant que vous n’avez pas touché Enregistrer, en bas de la page ; Annuler les modifications revient en arrière.',
        'Voix : la vitesse, et Type de voix : Femme, Homme, Fille ou Garçon (Fille et Garçon sont des voix de l’appareil rendues plus aiguës ; les appareils n’ont pas de vraies voix d’enfant). Voix utilisée montre la voix de chaque langue : elle vient de l’appareil, et « voix approchée » signifie qu’il n’a pas de voix de ce type pour cette langue (on peut en installer dans les réglages de l’appareil). Si l’appareil n’a aucune voix pour une langue de l’enfant, un message le dit et explique où en installer une (iPad : Réglages → Accessibilité → Contenu énoncé → Voix ; Android : Paramètres → Système → Langues → Synthèse vocale). Le tableau le dit aussi, en une ligne au-dessus des mots, quand l’appareil n’a pas de voix pour la langue du tableau. Bouton Aide : le message dit en premier, les informations utiles.',
        'Aussi : Bouton Aide (ci-dessus), Code et données (le code accompagnant, propositions par IA, Réinitialiser le profil ; la sauvegarde du profil est dans la page Compte ; sans compte, Exporter pour une autre appli de CAA (.obz) y est aussi) et À propos (crédits et licences des pictogrammes). Le Mode verrouillé (enfant) et le Guide s’ouvrent depuis la barre.',
      ],
      en: [
        'Settings has several pages: Board (the child’s settings, described here), Team, Progress (if the family chose it) and Account. Without an account, Team, Progress and Account only explain what they will hold. At the top, the field “Search a setting (voice, code, language…)” finds a setting by its name. The Board page is sorted into groups: touch a name to open it.',
        'Languages: Child’s languages, Communication language (what the device says, what is written on the cards), Arabic (the dialect, when Arabic is ticked) and Navigation language (menus, buttons, guide).',
        'Sentence: say each word, add to sentence, automatic grammar (turn off to practise a form), feminine agreement (only with French or Arabic among the child’s languages: English has no agreement), quick zone (yes, no, stop, wait…), open the app named in the sentence. Touch: the access method (touch then lift the finger, as soon as the finger touches, or keep the finger pressed with a hold time), the pause before touching the same picture again (2 s: no more “no no no”).',
        'Words and pictures: the words shown (level), Symbol library (Pictograms or Emoji), Show text under images, picture size, and Deleted words and boards (a deleted word or activity board is kept 30 days: Put back returns it to its place). Display: larger buttons and text or high contrast, fewer animations (this choice stops the wiggling), pictures that wiggle when touched (the Try it button shows the movement).',
        'Universal bar: hide Boards, Schedule or Timer if the child doesn’t need them (AAC and Help always stay). Under Schedule: the week schedule and the month schedule. Nothing changes until you touch Save, at the bottom of the page; Cancel changes goes back.',
        'Voice: the speed, and Voice type: Woman, Man, Girl or Boy (Girl and Boy are voices of the device made higher; devices have no real children’s voices). Voice used shows the voice of each language: it comes from the device, and “approximate voice” means the device has no voice of that type for that language (more can be installed in the device’s own settings). If the device has no voice at all for one of the child’s languages, a message says so and tells where to install one (iPad: Settings → Accessibility → Spoken Content → Voices; Android: Settings → System → Languages → Text-to-speech). The board says it too, in one line above the words, when the device has no voice for the board’s language. Help button: the first message said, the useful information.',
        'Also: Help button (above), Code and data (the caregiver code, AI suggestions, Reset profile; the backup of the profile is on the Account page; without an account, Export for another AAC app (.obz) is there too) and About (pictogram credits and licences). The Child lock and the Guide open from the bar.',
      ],
    },
    action: 'settings',
  },
  {
    id: 'access',
    track: 'pro',
    icon: 'pointer',
    title: { fr: 'Contacteurs, regard, main qui tremble', en: 'Switches, eye gaze, a hand that shakes' },
    steps: {
      fr: [
        'Réglages → Toucher (derrière le code accompagnant). Tout est sur Non au départ : le tableau fonctionne comme avant tant que vous ne choisissez rien et ne touchez pas Enregistrer.',
        'Toucher qui compte : Où le doigt se lève est le toucher habituel ; Où il se pose d’abord choisit la case où le doigt s’est posé, même s’il glisse sur une autre case avant de se lever (avec Garder le doigt appuyé, le doigt doit rester la durée d’appui, où qu’il glisse). Zone de toucher agrandie : un toucher entre deux cases compte pour la case la plus proche ; les cases gardent leur place et leur taille.',
        'Choisir en gardant le pointeur dessus (0,5 à 3 s) : avec une souris, un pointeur de tête ou un pointeur commandé par le regard qui déplace le curseur, la case se remplit tant que le pointeur reste dessus, puis elle est choisie. Rien d’autre n’y est choisi avant que le pointeur ne la quitte. Parler, Effacer, Retour et les boutons de la barre fonctionnent de la même façon. Sur iPad, le suivi du regard et AssistiveTouch de l’iPad font déjà les touchers : laissez Non.',
        'Balayage (contacteur) : Automatique (l’éclairage avance tout seul, un contacteur choisit) ou Pas à pas (un contacteur avance, un second choisit). Parcours : Ligne puis case (une ligne s’éclaire, le contacteur y entre, puis ses cases s’éclairent une à une) ou Case par case (petits tableaux). Temps sur chaque étape et Tours avant l’arrêt : après ces tours le balayage attend, et l’appui suivant le relance. Dire tout bas le mot éclairé : le mot éclairé est dit doucement avant d’être choisi (le nom d’un dossier n’est jamais dit).',
        'Le contacteur : Espace ou Entrée sur un clavier ou un boîtier de contacteurs (Pas à pas : Espace avance, Entrée choisit), ou Tout l’écran sert de contacteur (un toucher n’importe où sur le tableau choisit ; Pas à pas : moitié gauche avancer, moitié droite choisir). Effacer et Parler (dès qu’il y a une phrase) et Retour (dans un dossier) passent en premier ; après chaque choix le balayage repart du haut, dans le dossier quand un dossier a été ouvert. Le bouton Aide passe en dernier, après la dernière ligne du tableau : c’est le seul bouton de la barre dans le balayage. La barre n’est jamais couverte : Réglages et Accompagnant restent accessibles avec le code. Sur ordinateur, Échap arrête le balayage ; Reprendre le balayage le relance.',
      ],
      en: [
        'Settings → Touch (behind the caregiver code). Everything here is Off at first: the board works as before until you choose something and touch Save.',
        'Touch that counts: Where the finger lifts is the usual touch; Where it first lands chooses the card the finger landed on, even if it slips onto another card before lifting (with Keep the finger pressed, the finger must stay down the hold time, wherever it slides). Bigger touch area: a touch in the gap between two cards counts for the nearest card; the cards keep their place and size.',
        'Choose by resting the pointer (0.5 to 3 s): with a mouse, a head pointer or an eye-gaze pointer that moves the cursor, the card fills up while the pointer rests on it, then it is chosen. Nothing more is chosen there until the pointer leaves. Speak, Delete, Back and the buttons of the bar work the same way. On an iPad, its own Eye Tracking and AssistiveTouch already make the touches: leave this Off there.',
        'Switch scanning: Automatic (the highlight moves by itself, one switch chooses) or Step by step (one switch moves, a second chooses). How it goes: Row, then card (a row lights up, the switch enters it, then its cards light one by one) or Card by card (small boards). Time on each step and Turns before it stops: after those turns the scan waits, and the next press starts it again. Say the lit word quietly: the lit word is said softly before it is chosen (a folder’s name is never said).',
        'The switch: Space or Enter on a keyboard or a switch interface (Step by step: Space moves, Enter chooses), or The whole screen is the switch (a touch anywhere on the board chooses; Step by step: left half next, right half choose). Delete and Speak (once there is a sentence) and Back (in a folder) come first; after each choice the scan starts again from the top, inside the folder when one was opened. The Help button comes last, after the last row of the board: it is the only button of the bar in the scan. The bar is never covered: Settings and Caregiver stay reachable with the code. On a computer, Escape stops the scan; Start scanning again brings it back.',
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
        'Inviter quelqu’un : nom, rôle, niveau (Utiliser, Contribuer, Modifier directement) et droits, puis envoyez le code avec Envoyer par e-mail (choisissez votre messagerie : Gmail, Outlook, Yahoo ou celle de l’appareil ; un message déjà écrit s’y ouvre), Partager ou Copier : l’application n’envoie pas d’e-mail toute seule. Un professionnel peut aussi demander à rejoindre avec le code pour les professionnels : vous choisissez ses droits avant d’accepter. Un thérapeute ou un enseignant de l’équipe ne reçoit jamais votre code accompagnant : sur son propre appareil, il choisit le sien.',
        'Propositions : chaque changement proposé s’affiche avant / après ; approuvez, demandez une modification ou refusez. Changer la place d’un mot de base demande une confirmation.',
        'Historique : qui a changé quoi et quand (jamais ce que l’enfant a dit), avec Annuler.',
        'Sur une personne de l’équipe : Fin de l’accès (1 semaine, 1 mois, 3 mois ou sans fin) et Retirer l’accès, qui s’applique tout de suite. Nouveautés rassemble ce qui s’est passé (invitation acceptée, demande, proposition reçue) ; Changer le code remplace le code pour les professionnels.',
        'Un deuxième parent : invitez-le (rôle Famille), puis touchez son nom et activez « Agit comme parent » : il a alors tous les droits de la famille, le code accompagnant compris. Seul le parent responsable du profil peut le faire, après avoir confirmé que c’est lui. Sur ce parent, « Confier … à … » lui propose de devenir le parent responsable : il accepte depuis Compte → Enfants, avec son accord ; vous restez dans l’équipe comme parent. Les thérapeutes et les enseignants ouvrent le tableau avec un compte professionnel vérifié par notre équipe : en attendant, la liste affiche « En attente d’un compte professionnel vérifié ». « Gérer les tablettes de l’enfant » permet de voir les appareils, de retirer une tablette de l’enfant et de créer un code « Utiliser seulement ». Une personne de l’équipe peut partir avec « Quitter l’équipe », en bas de cette page.',
      ],
      en: [
        'Settings (caregiver mode) → Team: the people who have access, their role and what they can do.',
        'Invite someone: name, role, level (Use, Contribute, Edit directly) and rights, then send the code with Send by email (choose your mail: Gmail, Outlook, Yahoo or the device’s own; a message already written opens there), Share or Copy: the app does not send emails by itself. A professional can also ask to join with the code for professionals: you choose their rights before accepting. A therapist or a teacher on the team never receives your caregiver code: on their own device they choose their own.',
        'Proposals: each suggested change shows before / after; approve, ask for a change or decline. Moving a core word asks for confirmation.',
        'History: who changed what and when (never what the child said), with Undo.',
        'On a person of the team: Access ends (1 week, 1 month, 3 months or no end) and Remove access, which applies at once. What’s new gathers what happened (invitation accepted, request, proposal received); Change the code replaces the code for professionals.',
        'A second parent: invite them (role Family), then touch their name and turn on “Acts as a parent”: they then have every right of the family, the caregiver code included. Only the parent in charge of the profile can do it, after confirming it is them. On that parent, “Hand … to …” asks them to become the parent in charge: they accept from Account → Children, with their consent; you stay on the team as a parent. Therapists and teachers open the board with a professional account checked by our team: meanwhile the list shows “Waiting for a checked professional account”. “Manage the child’s tablets” lets someone see the devices, remove one of the child’s tablets and create a “Use only” code. A person on the team can go with “Leave the team”, at the bottom of this page.',
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
        'Réglages (mode accompagnant) → Compte → Mon compte : votre nom, Changer le mot de passe, Se déconnecter. En vous déconnectant, les tableaux des enfants quittent l’appareil (ils restent dans votre compte) ; sur un ordinateur partagé, cochez aussi l’effacement des photos et des enregistrements. À la connexion, Rester connecté ouvre l’application la fois suivante sans redemander le mot de passe : décochez-le sur un appareil qui n’est pas le vôtre. Connexion en deux étapes : Activer, puis une application d’authentification (Google Authenticator, Microsoft Authenticator, 1Password…) donne un code à 6 chiffres demandé à chaque connexion ; tant qu’il n’est pas tapé, rien des enfants n’est montré. Obligatoire pour l’équipe de l’application. Avec la connexion en deux étapes, Changer le mot de passe demande le code de l’application d’authentification au lieu du mot de passe actuel.',
        'Enfants : un seul compte pour plusieurs enfants. Ajouter un enfant crée son profil (à côté de chaque question, un « ? » explique à quoi sert le choix) ; touchez un enfant de la liste pour ouvrir son tableau. Le parent responsable change le prénom et l’âge d’un enfant avec « Prénom et âge ». Quand l’autre parent vous confie un enfant, sa proposition s’affiche ici : cochez l’accord, puis Accepter.',
        'Appareils et synchronisation : les appareils reliés, la dernière synchronisation, Synchroniser maintenant, et retirer un appareil perdu. Relier un appareil donne un code à 8 caractères (lettres et chiffres) à saisir sur l’autre appareil (« Relier cette tablette avec un code », sur la première page) : Accès complet (tablette de l’enfant) ou Utiliser seulement (école, nounou…). Pour un accès complet, confirmez d’abord que c’est vous (mot de passe, code reçu par e-mail, ou code de l’application d’authentification). Sur une tablette reliée : Délier cette tablette. Photos et enregistrements : « copiés dans le compte », ou combien sont « en attente d’envoi » (sans internet, ils partent plus tard) ou « encore à recevoir » ; une tablette « Utiliser seulement » reçoit les photos et les voix mais n’en envoie pas. Chaque appareil garde pour lui le dernier tableau d’activité ouvert, les étapes cochées et l’avancement du guide : ils ne voyagent pas. Sans internet, ou si le serveur ne répond pas, le tableau s’ouvre depuis l’appareil ; les changements partent au retour de la connexion. Versions précédentes du tableau : une copie est gardée chaque semaine et avant un grand changement ; Remettre rend le tableau comme il était (le tableau actuel est gardé d’abord) ; Garder une copie maintenant avant un gros essai. Si un tableau ne peut pas s’afficher, l’application propose Réessayer et, aux parents, ces versions précédentes.',
        'Vie privée et données : Exporter le profil (fichier), Exporter pour une autre appli de CAA (.obz) (les tableaux avec leurs images, pour une autre application de CAA), Télécharger toutes mes données (un fichier avec tout ce que le serveur garde), supprimer le profil de l’enfant ou Supprimer mon compte. Le profil supprimé va dans Profils supprimés : Remettre pendant 30 jours, puis il est effacé. Le compte, lui, est supprimé définitivement. Avant de supprimer ou de tout télécharger, on vous demande de confirmer que c’est vous. Avant de supprimer votre compte, la liste nomme les enfants dont vous êtes propriétaire et qui perdra leur tableau : confiez-les d’abord à l’autre parent (« Le confier d’abord à … ») ou cochez « Effacer le tableau de … » ; les autres personnes de l’équipe sont prévenues.',
        'Préférences : Langue des menus et Notifications dans l’application. Dans un navigateur, Notifications sur cet appareil envoie aussi, hors de l’application, un Rappel à 12 h si le tableau n’a pas été ouvert (parents) et les Nouvelles idées à voter ; la question est posée une fois après la connexion. Sur iPhone et iPad, ajoutez d’abord Empower à l’écran d’accueil. Jamais le nom ni les mots de l’enfant dans une notification. Aidez-nous à améliorer Empower : choisissez un sujet (Proposer une nouvelle fonction, Demander du vocabulaire manquant, Demander un pictogramme, Demander une langue ou un dialecte, Signaler une difficulté d’accessibilité, Signaler un problème technique), écrivez, puis Envoyer ; ou Voter pour les prochaines fonctions. N’écrivez jamais le nom d’un enfant ni d’informations médicales. Ouvrir le guide ramène ici.',
      ],
      en: [
        'Settings (caregiver mode) → Account → My account: your name, Change password, Sign out. When you sign out, the children’s boards leave the device (they stay in your account); on a shared computer, also tick erasing the photos and recordings. When you log in, Keep me logged in opens the app next time without asking for the password: untick it on a device that is not yours. Two-step sign-in: Turn on, then an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) gives a 6-digit code asked at each sign-in; until it is typed, nothing about the children is shown. Required for the app’s team. With two-step sign-in, Change password asks for the authenticator code instead of the current password.',
        'Children: one account for several children. Add a child creates their profile (beside each question, a “?” explains what the choice does); touch a child in the list to open their board. The parent in charge changes a child’s first name and age with “Name and age”. When the other parent hands you a child, the offer shows here: tick the consent, then Accept.',
        'Devices and sync: the linked devices, the last sync, Sync now, and removing a lost device. Link a device gives an 8-character code (letters and digits) to type on the other device (“Link this tablet with a code”, on the first page): Full access (the child’s tablet) or Use only (school, nanny…). For full access, first confirm it is you (password, a code sent by e-mail, or the authenticator code). On a linked tablet: Unlink this tablet. Photos and recordings: “copied to the account”, or how many are “waiting to be sent” (without internet they go later) or “still to arrive”; a “Use only” tablet receives photos and voices but does not send any. Each device keeps to itself the activity board opened last, the ticked steps and the progress in the guide: they do not travel. Without internet, or when the server does not answer, the board opens from the device; changes go when the connection is back. Earlier versions of the board: a copy is kept every week and before a big change; Put back returns the board as it was (the current board is kept first); Keep a copy now before a big try. If a board cannot be shown, the app offers Try again and, to the parents, these earlier versions.',
        'Privacy and data: Export the profile (file), Export for another AAC app (.obz) (the boards with their pictures, for another AAC app), Download all my data (one file with everything the server keeps), delete the child’s profile or Delete my account. A deleted profile goes to Deleted profiles: Put back for 30 days, then it is erased. The account itself is deleted for good. Before deleting or downloading everything, you are asked to confirm it is you. Before your account is deleted, the list names the children whose profile you own and who loses their board: hand them to the other parent first (“Hand it to … first”) or tick “Erase …’s board”; the others on the team are told.',
        'Preferences: Menu language and In-app notifications. In a browser, Notifications on this device also sends, outside the app, a Reminder at 12:00 if the board was not opened (parents) and New ideas to vote on; the question is asked once after signing in. On iPhone and iPad, first add Empower to the Home Screen. Never the child’s name or words in a notification. Help us improve Empower: choose a subject (Suggest a new feature, Request missing vocabulary, Request a pictogram, Request a language or dialect, Report an accessibility difficulty, Report a technical problem), write, then Send; or Vote for upcoming features. Never write a child’s name or medical information. Open the guide brings you back here.',
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
        'Vérification professionnelle (à la création du compte, puis dans Compte et licence) : votre pratique, un diplôme ou une autorisation d’exercer, puis une pièce d’identité, supprimée dès que la vérification est terminée. Envoyer pour vérification : notre équipe accepte, demande un complément ou refuse, et vous êtes prévenu dans l’application. En attendant, vous pouvez explorer votre espace et préparer des supports, mais pas encore rejoindre l’équipe d’un enfant. Pour être thérapeute ou enseignant dans l’équipe d’un enfant, un compte professionnel vérifié est nécessaire, même quand la famille vous invite.',
        'Accueil : vos utilisateurs connectés, les propositions en attente, les invitations, et des raccourcis.',
        'Mes utilisateurs → Connecter un utilisateur : tapez dans « Code de la famille ou d’une invitation » le code donné par les parents. Avec le code d’une invitation, vous rejoignez l’équipe tout de suite ; avec le code de la famille, indiquez votre rôle, les Droits demandés et un message, puis Envoyer la demande : la famille accepte avec les droits qu’elle choisit. Une invitation envoyée à votre adresse e-mail s’accepte au même endroit. Si la famille a refusé votre demande, « Redemander » la renvoie, une semaine plus tard au plus tôt. Sur la page d’un enfant, « Quitter l’équipe » vous retire de son équipe.',
        'Mes utilisateurs → Créer le profil d’un enfant (une fois votre certificat accepté) : pour un enfant dont la famille n’a pas encore de compte. Vous répondez aux mêmes questions qu’un parent et vous préparez le tableau. Sur la page de l’enfant, Relier les parents → Créer le code des parents (Envoyer par e-mail ouvre votre messagerie avec le message déjà écrit) : les parents créent leur compte, choisissent J’ai un code d’invitation sur le premier écran (Votre enfant) et tapent le code. Le profil devient le leur : ils choisissent leur code accompagnant et ce qui est enregistré ; vous restez dans l’équipe. Les tablettes que vous aviez reliées et les invitations encore en attente s’arrêtent là : la famille relie ses tablettes et décide de son équipe (un message lui dit qui en fait partie).',
        'Ma bibliothèque : sous Créer un support, touchez ce que vous voulez préparer (TLA, planning, D’abord / Ensuite, cartes à imprimer, ou à partir d’une photo) ; le support prend le nom de ce qu’il contient. Rechercher par nom retrouve un support. Les listes : Éléments créés, Partagés avec moi et Supports des utilisateurs. Touchez un support pour le personnaliser pour un enfant (Personnaliser pour…), le proposer à une famille (Proposer au profil de…) ou le partager Avec un collègue (e-mail) ou l’équipe d’un enfant.',
        'Collaborations : Mes connexions, Demandes envoyées, Ressources partagées et Activité récente.',
      ],
      en: [
        'Professional verification (when the account is created, then in Account & licence): your practice, a diploma or a licence to practise, then an identity document, deleted as soon as the check is finished. Submit for verification: our team accepts, asks for something more or refuses, and you are told in the app. Meanwhile you can explore your workspace and prepare materials, but not yet join a child’s team. To be a therapist or a teacher on a child’s team, a checked professional account is needed, even when the family invites you.',
        'Dashboard: your connected users, the pending proposals, the invitations, and shortcuts.',
        'My AAC users → Connect a user: type the code the parents gave you in “Family code or invitation code”. With an invitation’s code you join the team at once; with the family’s code, give your role, the Rights requested and a message, then Send the request: the family accepts with the rights it chooses. An invitation sent to your email address is accepted in the same place. If the family declined your request, “Ask again” sends it once more, a week later at the earliest. On a child’s page, “Leave the team” takes you off their team.',
        'My AAC users → Create a child’s profile (once your certificate is accepted): for a child whose family has no account yet. You answer the same questions as a parent and prepare the board. On the child’s page, Connect the parents → Create the parents’ code (Send by email opens your mail with the message already written): the parents create their account, choose I have an invitation code on the first screen (Your child) and type the code. The profile becomes theirs: they choose their caregiver code and what is recorded; you stay in the team. The tablets you had linked and the invitations still waiting end there: the family links its own tablets and decides who is on its team (a notice tells them who is on it).',
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
        'Depuis votre espace, Mes utilisateurs ouvre le tableau d’un enfant. Vos droits sont choisis par la famille : Utiliser, Contribuer ou Modifier directement. Le bouton Réglages à côté d’un enfant ouvre directement ses réglages : Tableau, Équipe, Suivi (si la famille vous y autorise) et votre Compte.',
        'Contribuer : vos changements vont dans un brouillon. Dès le premier changement, un bandeau indique combien sont prêts ; rien ne change pour l’enfant avant l’accord de la famille.',
        'Envoyer pour approbation : donnez un titre à la proposition et, si vous voulez, la raison. La famille voit l’avant / après et approuve, demande une modification ou refuse.',
        'Modifier directement : vos changements s’appliquent tout de suite et apparaissent dans l’historique. Utiliser : vous pouvez utiliser le tableau et modéliser, sans rien changer.',
        'Sur votre propre appareil, vous choisissez votre propre code accompagnant la première fois ; il est demandé ensuite pour le mode accompagnant et les réglages de chaque tableau que vous ouvrez (un enfant est souvent devant votre appareil). Le code de la famille ne vous est jamais demandé : vous le changez, le vôtre, dans Réglages → Code et données. Ma bibliothèque garde vos supports (TLA, plannings, D’abord / Ensuite, cartes) pour les proposer ensuite à une famille. Guide (dans votre espace) : un tableau de démonstration pour s’exercer, où rien n’est enregistré, et des tutoriels.',
      ],
      en: [
        'From your workspace, My AAC users opens a child’s board. Your rights are chosen by the family: Use, Contribute or Edit directly. The Settings button beside a child opens that child’s settings directly: Board, Team, Progress (if the family allows you) and your Account.',
        'Contribute: your changes go into a draft. From the first change, a banner says how many are ready; nothing changes for the child before the family agrees.',
        'Send for approval: give the proposal a title and, if you like, the reason. The family sees before / after and approves, asks for a change or declines.',
        'Edit directly: your changes apply at once and appear in the history. Use: you can use the board and model, without changing anything.',
        'On your own device, you choose your own caregiver code the first time; it is then asked for caregiver mode and the settings of every board you open (a child is often in front of your device). The family’s code is never asked from you: you change yours in Settings → Code and data. My library keeps your materials (activity boards, schedules, First / Then, cards) so you can propose them to a family later. Guide (in your workspace): a demonstration board to practise, where nothing is saved, and tutorials.',
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
        'Touchez deux fois l’onglet d’un TLA : modifier son titre, Dupliquer, Ranger comme le tableau principal (remet chaque type de mot dans sa colonne, après en avoir ajouté par exemple), Partager (envoyer à quelqu’un qui a un compte, ou enregistrer un fichier), Imprimer.',
        'Sélectionner : touchez plusieurs cartes (Tout sélectionner, Tout désélectionner), puis Copier / Coller, changer la Taille, les envoyer Vers un tableau d’activité, les Imprimer en cartes, ou les retirer avec la corbeille (sur le tableau principal, elle demande de confirmer). Une case + ajoute toujours un mot. Depuis le tableau principal, les cartes envoyées sont copiées : leur place ne change pas.',
        'Nouveau TLA → Créer à partir d’une photo : photographiez un menu ou une boîte de jeu ; vérifiez et corrigez les mots proposés avant de créer.',
        'En mode utilisation, un appui long sur un dossier montre ses mots les plus demandés sans l’ouvrir.',
      ],
      en: [
        'Tap a card twice: Edit, Replace the picture, Record the pronunciation, Add to favourites (“my words”), Duplicate, Delete.',
        'Long press a card, then slide it: it takes the place where you let go (two cards swap). “Undo” shows for a few seconds. Without sliding, the long press opens the card (handy for a folder).',
        'Tap an activity board tab twice: edit its title, Duplicate, Arrange like the main board (puts each kind of word back in its column, after adding some for example), Share (send to someone with an account, or save a file), Print.',
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
        'Le profil de l’enfant (mots, tableaux, réglages) est gardé sur l’appareil et, avec un compte, sur le serveur en Europe, pour l’équipe que vous choisissez. Ce que l’enfant fait n’est enregistré que si la famille l’a choisi (Réglages → Suivi). Les photos et les enregistrements sont copiés dans le compte, dans un espace privé que seule l’équipe de l’enfant peut ouvrir : une photo ajoutée sur le téléphone d’un parent arrive sur la tablette de l’enfant, et rien n’est perdu avec une tablette.',
        'L’IA (propositions de TLA, photo → TLA, dessins) ne reçoit que le sujet, la photo ou le dessin, jamais le nom ni les phrases de l’enfant ; elle se coupe dans Réglages → Données.',
        'Exporter le profil (sauvegarde) avant de changer d’appareil ; Exporter pour une autre appli de CAA (.obz) emporte les tableaux vers une autre application ; Réinitialiser le profil repart de zéro. Télécharger toutes mes données (Réglages → Compte) donne un fichier avec tout ce que le serveur garde. À la création du profil, le parent donne son accord (Votre accord) : la date et le texte sont gardés. Le serveur efface tout seul : le suivi après 24 mois (les phrases après 12), l’historique après 24 mois. Dicter une phrase se fait sur l’appareil quand sa langue y est installée ; sinon une ligne dit que le service d’Apple ou de Google l’entend.',
        'Réglages → Suivi → Aider à améliorer l’application (désactivé par défaut ; proposé aussi à la fin du parcours de départ) : des chiffres anonymes pour l’équipe de l’application. Quelles fonctions sont montrées à l’écran et lesquelles sont utilisées, combien de fois, les temps d’attente (ouverture de l’application, enregistrement, voix) en quelques tranches, la version de l’application, les problèmes techniques (quel écran, quelle version), les réglages choisis comme la langue et, si le suivi est activé, l’âge, les durées, le nombre de touches et la longueur des phrases. Jamais le nom, les mots, les phrases, les photos ni les enregistrements. L’équipe ne voit que des totaux, à partir de 5 enfants de 5 familles. Si vous arrêtez, ce qui a été compté pour l’enfant est effacé. Si la liste change, l’application l’indique (« Ce qui est partagé a changé ») et n’envoie plus rien tant que vous n’avez pas touché « J’accepte la nouvelle liste ».',
      ],
      en: [
        'The child’s profile (words, boards, settings) is kept on the device and, with an account, on the server in Europe, for the team you choose. What the child does is recorded only if the family chose it (Settings → Progress). Photos and recordings are copied to the account, in a private space only the child’s team can open: a photo added on a parent’s phone reaches the child’s tablet, and nothing is lost with a tablet.',
        'The AI (board suggestions, photo → board, drawings) only receives the topic, the photo or the drawing, never the child’s name or sentences; it can be turned off in Settings → Data.',
        'Export profile (backup) before changing device; Export for another AAC app (.obz) takes the boards to another app; Reset profile starts from scratch. Download all my data (Settings → Account) gives one file with everything the server keeps. When the profile is created, the parent gives their agreement (Your agreement): the date and the text are kept. The server erases by itself: the follow-up after 24 months (the sentences after 12), the history after 24 months. Dictating a sentence happens on the device when its language is installed there; otherwise a line says that Apple’s or Google’s service hears it.',
        'Settings → Progress → Help improve the app (off by default; also offered at the end of the set-up): anonymous figures for the app’s team. Which features are shown on screen and which are used, how often, waiting times (opening the app, saving, the voice) in a few steps, the app’s version, technical problems (which screen, which version), the settings chosen such as the language and, if the follow-up is on, age, durations, number of touches and sentence length. Never the name, the words, the sentences, photos or recordings. The team only sees totals, from 5 children of 5 families up. If you stop, what was counted for the child is erased. If the list changes, the app says so (“What is shared has changed”) and sends nothing more until you touch “I agree to the new list”.',
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
      'على اليسار، الشريط الدائم، دائماً في المكان نفسه: التواصل (الرئيسية)، اللوحات، الجدول، المؤقت، زر «مساعدة» الأحمر الكبير، ثم الأدوات: «بحث» (العدسة المكبّرة)، الدليل، «الإعدادات»، «قفل»، المرافق. تفتح العدسة ثلاثة تبويبات: «البحث في اللوحة» (إيجاد كلمة)، «كلمة جديدة» (كتابتها) و«الكتابة للنمذجة» (إظهار جملة على اللوحة).',
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
      'المس مجلداً لترى كلماته، ثم كلمة لإضافتها إلى الجملة. اسم المجلد («جسمي»، «أكل»…) لا يُقال أبداً ولا يُضاف إلى الجملة: ليس كلمة، بل هو الباب إلى كلماته.',
      '«رجوع» يعود خطوة؛ «الرئيسية» أو «التواصل» يعيدان إلى اللوحة الرئيسية.',
    ],
    tip: 'زر «جرّب» يضيء الطريق إلى كلمة «طابة».',
  },
  search: {
    title: 'البحث عن كلمة',
    steps: [
      '«بحث» (العدسة المكبّرة)، التبويب الأول («البحث في اللوحة»)، ثم اختر: اكتب الكلمة (الأخطاء الإملائية مقبولة)، أو المس «قل الكلمة» وقلها. عندما يكون المساعد بالذكاء الاصطناعي متاحاً يُضاف زر «ارسم»: ارسم الشيء بإصبعك ثم «ابحث».',
      '«أرني المكان» يضيء الطريق: المجلد أولاً، ثم الكلمة. هكذا يتعلّم الطفل مكانها.',
      'زر + يضيف الكلمة مباشرة إلى الجملة، وزر مكبّر الصوت يقولها. المجلد الذي يُعثر عليه له فقط «أرني المكان»: اسمه ليس كلمة تُقال.',
      'البحث نفسه موجود في كل مكان تُبحث فيه كلمة أو صورة: «اختر كلمة» (لبطاقة أو لخطوة في تسلسل)، مكتبة الرموز، موادّ الأخصائي. في كل مكان: اكتب، أو المس «قل الكلمة».',
    ],
    tip: 'زر «ارسم» يظهر فقط عندما يكون المساعد بالذكاء الاصطناعي متاحاً: التعرّف على الرسومات يستخدمه (يُرسل الرسم فقط)، ويمكن إيقافه في الإعدادات.',
  },
  language: {
    title: 'اختيار اللغات',
    steps: [
      'تُختار اللغات في الإعدادات (وضع المرافق)، بخيارين منفصلين: «لغة التواصل» (ما يقوله الجهاز وما يُكتب على البطاقات) و«لغة التنقل» (القوائم والأزرار والدليل).',
      'مثلاً: التنقل بالعربية والكلمات بالفرنسية، أو التنقل بالفرنسية والكلمات بالعربية. تبقى الكلمات في المكان نفسه في كل اللغات.',
      'تُسأل عن عربية التطبيق عند الإعداد إذا كانت العربية من لغات الطفل، وتُغيَّر من هنا («العربية»): اللبنانية، السورية، الأردنية / الفلسطينية، المصرية، السعودية، الخليجية، العراقية، العربية الفصحى. لا يظهر هذا الاختيار إلا إذا كانت العربية محدّدة في «لغات الطفل»؛ وإلغاء تحديد العربية يزيلها من التطبيق كله. كلمات اللوحة العربية والاقتراحات تتبع هذا الاختيار. هذا الاختيار يغيّر الكلمات لا الصوت: يقرأ الجهاز العربية بصوته العربي الفصيح مهما كانت اللهجة. إذا لم تُلفظ كلمة جيداً، سجّلها بصوتك (انظر «تعديل كلمة»).',
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
      'الكلمات الأساسية («أنا»، «بدّي»، «كمان»، «خلص!»، «ساعدني»…) موجودة دائماً في أعلى عمودها: كما في اللوحة الرئيسية، لكل نوع من الكلمات عموده (أشخاص، أفعال، كلمات صغيرة…).',
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
      'يستمر أثناء التواصل. في النهاية: صوت، و«خلص الوقت!».',
      'يظهر فوق اللوحة من دون أن يخفي أي صورة. بجانبه صورة ما ينتظره الطفل (المسبح، الحديقة…): تُقال في النهاية. يستطيع الطفل اختيار كلمة موجودة؛ أما «إنشاء كلمة جديدة» (صورة، تسجيل) فيطلب رمز المرافق.',
    ],
  },
  apps: {
    title: 'التطبيقات',
    steps: [
      'مجلد «تطبيقات»: يوتيوب، واتساب، سبوتيفاي، أنغامي. على الجهاز اللوحي، لمس تطبيق يطلب أولاً رمز المرافق («ستفتح اللوحة تطبيقاً آخر»): لا يغادر الطفل التطبيق وحده. في وضع المرافق يُفتح التطبيق بعد 3 ثوانٍ («إلغاء» إذا كان خطأ). في المتصفح (العرض التجريبي)، المس «افتح»: المتصفحات تمنع الفتح التلقائي.',
      'الجملة التي تذكر تطبيقاً تفتحه أيضاً: «بدّي إسمع موسيقى» ثم «تكلّم» ← سبوتيفاي.',
      'يحتاج واتساب أولاً إلى رقم الشخص الذي نتصل به (انظر «ربط تطبيق»).',
    ],
  },
  keyboard: {
    title: 'لوحة المفاتيح',
    steps: ['لمن يعرف الكتابة: «بحث» (العدسة المكبّرة)، تبويب «كلمة جديدة»، اكتب (أو المس «قل الكلمة» وقلها)، ثم «تكلّم» أو «أضف إلى الجملة». تدخل كل كلمة مكتوبة إلى الجملة مع رمزها (رمز اللوحة، وإلا رمز من المكتبة) وتُقال كما كُتبت.'],
  },
  caregiver: {
    title: 'وضع المرافق',
    steps: [
      '«المرافق» (القفل). تختار رمزك (4 أرقام، تُكتب مرتين) عند أول فتح للوحة، قبل هذا الدليل: لوحة الأرقام الأولى هذه لا تُغلق، فيجب أن يوجد الرمز قبل استعمال اللوحة (يبقى الشريط وزر «مساعدة» متاحين). بعدها تكتبه في كل مرة؛ وما دام الرمز لم يُختر فلا يفتح أي رمز شيئاً. على لوحة مستعملة من قبل وليس لها رمز بعد، يطلب «المرافق» أولاً كلمة مرور حسابك (أو رمزاً يصلك بالبريد الإلكتروني)، ثم تختار الرمز؛ والجهاز اللوحي المرتبط برمز لا يختاره أبداً. بعد 5 رموز خاطئة يجب الانتظار قليلاً. يمكنك تغييره في الإعدادات ← الرمز والبيانات. «نسيت الرمز؟» (تحت لوحة الأرقام): يكتب أحد الوالدين المسجَّل دخوله كلمة مرور حسابه، أو يتلقى رمزاً بالبريد الإلكتروني أو برسالة نصية ويكتبه، ثم يختار رمزاً جديداً؛ على جهاز لوحي مرتبط، افعل ذلك من هاتف أو حاسوب أحد الوالدين.',
      'الشريط الأصفر يعني أنك تستطيع التعديل: لمس بطاقة يفتح إعداداتها؛ وللمجلد، ضغطة طويلة.',
      '«الإعدادات» و«طباعة / PDF» في الشريط الأصفر. «إنهاء» يعيد إلى وضع الطفل. يُغلق وضع المرافق وحده أيضاً بعد 5 دقائق من دون لمس الشاشة، وعند مغادرة التطبيق (أو تغيير علامة التبويب): يجد الطفل لوحته من جديد. الإعدادات التي غيّرتها ولم تحفظها بعد لا تضيع: تجدها عند فتح «الإعدادات» من جديد.',
      'يُحفظ كل شيء على الجهاز، حتى بعد إطفائه؛ ومع حساب يُحفظ أيضاً على الإنترنت وتتحدّث أجهزة العائلة الأخرى تلقائياً.',
      'في الشريط زرّان للأهل، كلٌّ منهما محميّ برمز المرافق: «الإعدادات» (يفتح الإعدادات دون الانتقال إلى وضع المرافق) و«قفل». «قفل» يفتح «وضع القفل (للطفل)»: لا يستطيع الطفل فتح تطبيقات أخرى ولا الرجوع؛ ولمنعه من الخروج من التطبيق، فعّل أيضاً «الوصول الموجَّه» (آيباد) أو «تثبيت الشاشة» (أندرويد). في المتصفح لا يُعاد تحميل الصفحة عند سحبها إلى الأسفل، ويعود ملء الشاشة عند اللمسة التالية. لإزالته: «قفل» ← الرمز.',
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
      '«مكان الكلمات الظاهرة» ← «بلا فراغات»: تصطفّ الكلمات في أعلى عمودها (ينزل بعضها عند إظهار المزيد). «الأماكن النهائية»: كل كلمة في مكانها على اللوحة الكاملة، ولن يتحرك شيء.',
      'يُضبط مستوى كل كلمة على بطاقتها (وضع المرافق، اللوحة الرئيسية: الشارة N1، N2، N3).',
    ],
  },
  editWord: {
    title: 'تعديل كلمة',
    steps: [
      'في وضع المرافق، المس البطاقة: التسميات بالفرنسية والإنجليزية وبالعربية التي اخترتها.',
      'الصورة، خياران: «مكتبة التطبيق» (نحو 24 ألف رمز دون إنترنت؛ ابحث بالفرنسية أو الإنجليزية أو العربية، والمس اسم مكتبة — Mulberry أو OpenMoji… — لترى صورها فقط) أو «مكتبتك» («اختيار صورة» محفوظة على الجهاز، أو «التقاط صورة»). على الجهاز اللوحي يسأل النظام في المرة الأولى أيّ الصور يستطيع التطبيق رؤيتها (التي تختارها، كلها، أو لا شيء)؛ في المتصفح لا تُرسَل إلا الصورة التي تختارها. يُحفظ مصدر الرمز وترخيصه مع الكلمة.',
      '«صوت مسجّل»: سجّل صوتك أو صوت أحد الأقارب لهذه الكلمة، مرة لكل لغة (الفرنسية، الإنجليزية، العربية؛ علامة ✓ تبيّن اللغات المسجّلة). يحلّ التسجيل عندها محلّ صوت الجهاز كلما لُمست الكلمة أو قيلت في جملة؛ وعندما تغيّر القواعد شكل الكلمة يقولها صوت الجهاز. مثالي للأسماء وللعربية المحكية في البيت. يُزال الصمت قبل الكلمة وبعدها تلقائياً: لا حاجة للاستعجال بين الزر والكلمة. إذا لم يستطع جهاز تشغيل تسجيل، يقول صوته هو الكلمة: لا يبقى الطفل بلا صوت أبداً. يبقى التسجيل على الجهاز الذي سُجّل عليه.',
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
      'خانة فارغة ← «إنشاء كلمة جديدة» (اكتبها أو المس «قل الكلمة»؛ يُقترح الرمز تلقائياً، أو اختر «مكتبتك» لصورة من عندك؛ وعندما يكون الصوت «بنت» أو «صبي» يصبح «سجّل هذه الكلمة» إلزامياً: تُنطق الكلمة الجديدة بصوتك، ولا يعمل زر «حفظ» إلا بعد التسجيل) أو اختر كلمة موجودة (اكتبها أو قلها للعثور عليها). «رجوع»، في أعلى الشاشة، يعيد إلى الشاشة السابقة؛ وعلامة الإغلاق تغلق كل شيء.',
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
      'المس كلمة أو خطوة لإزالتها، أضف غيرها: في اللوحة المُنشأة يكون لكل نوع من الكلمات عموده كما في اللوحة الرئيسية (الأشخاص، الأفعال، الكلمات الصغيرة، الأوصاف، الأسئلة، الكلمات الاجتماعية، الأشياء)، والكلمة التي تضيفها تذهب إلى عمودها. لتغيير ترتيب الخطوات اضغط مطولاً على خطوة ثم اسحبها (أو استعمل الأسهم الصغيرة). ثم «إنشاء اللوحة».',
      'خيار «إنشاء تسلسل لهذه الخطوات أيضاً»: يرتبط التسلسل باللوحة، مع مؤقتات (مثلاً الفرن 30 دقيقة). يظهر في «الجدول».',
      'طرق أخرى: «إنشاء لوحة فارغة» (تختار كل كلمة بنفسك)؛ «الإنشاء من صورة» (قائمة طعام، علبة لعبة، مكوّنات: تحقّق من الكلمات المقترحة قبل الإنشاء)؛ «استيراد ملف» أو «مُشارَكة معي» (لوحة أرسلها لك شخص).',
    ],
  },
  editSchedule: {
    title: 'تحضير جدول',
    steps: [
      '«الجدول» ← «تسلسل جديد» (وضع المرافق): اكتب الموضوع (مثلاً «تنظيف الأسنان»)، «اقترح خطوات»، غيّر الترتيب (ضغطة طويلة ثم سحب)، ثم «إنشاء التسلسل». «تعديل التسلسل» يغيّر اسمه وخطواته.',
      'كل خطوة: رمز، ولوحة مرتبطة، ومدة للمؤقت عند الحاجة. «إضافة خطوة» يفتح «اختر كلمة»: اختر الكلمة، أو «رجوع» للعودة إلى التسلسل دون إضافة شيء (أما علامة الإغلاق فتغلق كل شيء).',
      '«أولاً / ثم»: في وضع المرافق، المس كل خانة لاختيار الصورة.',
      'الأسبوع والشهر (فعّلهما من الإعدادات ← اللوحة ← الشريط الدائم، تحت «الجدول»): في وضع المرافق، + يضيف صورة إلى يوم، ولمس صورة يزيلها.',
    ],
  },
  model: {
    title: 'النمذجة («الكتابة للنمذجة»)',
    steps: [
      '«بحث» (العدسة المكبّرة)، تبويب «الكتابة للنمذجة». «إملاء جملة» أو كتابتها، ثم «أظهر على اللوحة»: يد متحركة تضغط على كل كلمة، وتفتح المجلدات في الطريق (اسمها يُكتب في الشريط ولا يُقال أبداً)، ويُظهر الشريط إلى أين تذهب. ثم تُقرأ الجملة.',
      '«تسجيل عرض» (خارج وضع المرافق يُطلب الرمز أولاً): المس الكلمات كما يجب أن يفعل الطفل، ثم «إنهاء وحفظ». «إعادة العرض» يُظهره كلما احتجت؛ وحذفه يطلب الرمز أيضاً.',
      'السرعة: بطيئة، عادية أو سريعة.',
    ],
  },
  settings: {
    title: 'الإعدادات المفيدة',
    steps: [
      'للإعدادات عدة صفحات: «اللوحة» (إعدادات الطفل، وهي المشروحة هنا)، «الفريق»، «المتابعة» (إذا اختارتها العائلة) و«الحساب». دون حساب، تشرح صفحات «الفريق» و«المتابعة» و«الحساب» ما ستحتويه فقط. في الأعلى، حقل «ابحث عن إعداد (الصوت، الرمز، اللغة…)» يجد الإعداد باسمه. صفحة «اللوحة» مرتّبة في مجموعات: المس اسماً لفتحه.',
      '«اللغات»: «لغات الطفل»، «لغة التواصل» (ما يقوله الجهاز وما يُكتب على البطاقات)، «العربية» (اللهجة، إذا كانت العربية محدّدة) و«لغة التنقل» (القوائم والأزرار والدليل).',
      '«الجملة»: نطق كل كلمة، إضافة الكلمات إلى الجملة، القواعد التلقائية (أوقفها للتدرّب على صيغة)، التأنيث (فقط إذا كانت الفرنسية أو العربية من لغات الطفل: لا تأنيث في الإنجليزية)، المنطقة السريعة (نعم، لا، توقف، انتظر…)، فتح التطبيق المذكور في الجملة. «اللمس»: طريقة الاختيار (المس ثم ارفع الإصبع، بمجرد أن يلمس الإصبع، أو إبقاء الإصبع مضغوطاً مع مدة الضغط)، مهلة قبل لمس الصورة نفسها مجدداً (ثانيتان).',
      '«الكلمات والصور»: الكلمات الظاهرة (المستوى)، «مكتبة الرموز» (رموز أو إيموجي)، «إظهار النص تحت الصور»، حجم الصور، و«الكلمات واللوحات المحذوفة» (تُحفظ الكلمة أو لوحة النشاط المحذوفة 30 يومًا: «إعادة» يعيدها إلى مكانها). «العرض»: أزرار ونص أكبر أو تباين عالٍ، حركة أقل (هذا الخيار يوقف حركة الصور)، الصور التي تتحرّك عند لمسها (زر «جرّب» يُظهر الحركة).',
      'الشريط الدائم: إخفاء «اللوحات» أو «الجدول» أو «المؤقت» إذا لم يحتجها الطفل («التواصل» و«مساعدة» يبقيان دائماً). تحت «الجدول»: جدول الأسبوع وجدول الشهر. لا يتغيّر شيء قبل لمس «حفظ» أسفل الصفحة؛ «إلغاء التغييرات» يعيد كل شيء كما كان.',
      'الصوت: السرعة، و«نوع الصوت»: امرأة، رجل، بنت أو صبي («بنت» و«صبي» من أصوات الجهاز بعد جعلها أحدّ؛ لا توجد في الأجهزة أصوات أطفال حقيقية). «الصوت المستخدم» يبيّن صوت كل لغة: يأتي من الجهاز، و«صوت تقريبي» يعني أن الجهاز لا يملك صوتاً من هذا النوع لهذه اللغة (يمكن تثبيت أصوات أخرى من إعدادات الجهاز). إذا لم يكن على الجهاز أي صوت لإحدى لغات الطفل، تظهر رسالة تقول ذلك وتشرح أين يُثبَّت صوت (iPad: الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات؛ Android: الإعدادات ← النظام ← اللغات ← تحويل النص إلى كلام). وتقول اللوحة ذلك أيضاً، في سطر فوق الكلمات، عندما لا يملك الجهاز صوتاً للغة اللوحة. زر المساعدة: الرسالة الأولى التي تُقال، والمعلومات المفيدة.',
      'أيضاً: «زر المساعدة» (أعلاه)، «الرمز والبيانات» (رمز المرافق، اقتراحات الذكاء الاصطناعي، إعادة ضبط الملف الشخصي؛ النسخة الاحتياطية للملف في صفحة «الحساب»؛ من دون حساب، يوجد هنا أيضاً «تصدير لتطبيق تواصل بديل آخر (.obz)») و«حول التطبيق» (حقوق وتراخيص الرموز). «وضع القفل (للطفل)» والدليل يُفتحان من الشريط.',
    ],
  },
  access: {
    title: 'المفاتيح، النظر، اليد المرتجفة',
    steps: [
      'الإعدادات ← اللمس (خلف رمز المرافق). كل شيء متوقف في البداية: تعمل اللوحة كما كانت حتى تختار شيئاً وتلمس حفظ.',
      'اللمسة التي تُحتسب: «حيث يُرفع الإصبع» هي اللمسة المعتادة؛ «حيث يلمس أولاً» تختار البطاقة التي لمسها الإصبع أولاً حتى لو انزلق إلى بطاقة أخرى قبل رفعه (مع «إبقاء الإصبع مضغوطاً» يجب أن يبقى الإصبع مدة الضغط أينما انزلق). منطقة لمس أكبر: اللمس في الفراغ بين بطاقتين يُحتسب للبطاقة الأقرب؛ تبقى البطاقات في مكانها وبحجمها.',
      'الاختيار بإبقاء المؤشر فوقها (0.5 إلى 3 ث): بالفأرة أو بمؤشر الرأس أو بمؤشر يحرّكه النظر، تمتلئ البطاقة ما دام المؤشر فوقها ثم تُختار. لا يُختار شيء آخر هناك قبل أن يغادرها المؤشر. تكلّم وحذف ورجوع وأزرار الشريط تعمل بالطريقة نفسها. على الآيباد، تتبّع العين وAssistiveTouch يقومان باللمس بأنفسهما: اتركه متوقفاً هناك.',
      'المسح بالمفتاح: تلقائي (تتقدّم الإضاءة وحدها ويختار مفتاح واحد) أو خطوة بخطوة (مفتاح للتقدّم وآخر للاختيار). طريقة المرور: صفّ ثم بطاقة (يضيء صفّ، يدخله المفتاح، ثم تضيء بطاقاته واحدة بعد أخرى) أو بطاقة بعد بطاقة (للوحات الصغيرة). الوقت على كل خطوة وعدد الدورات قبل التوقف: بعدها ينتظر المسح، والضغطة التالية تعيد تشغيله. نطق الكلمة المضاءة بصوت خافت: تُقال الكلمة المضاءة بهدوء قبل اختيارها (اسم المجلد لا يُقال أبداً).',
      'المفتاح: المسافة أو الإدخال على لوحة مفاتيح أو جهاز مفاتيح (خطوة بخطوة: المسافة للتقدّم والإدخال للاختيار)، أو «الشاشة كلها تعمل كمفتاح» (لمسة في أي مكان على اللوحة تختار؛ خطوة بخطوة: النصف الأيسر للتالي والنصف الأيمن للاختيار). حذف وتكلّم (عند وجود جملة) ورجوع (داخل مجلد) تأتي أولاً؛ بعد كل اختيار يبدأ المسح من الأعلى، داخل المجلد إذا فُتح مجلد. زر «مساعدة» يأتي أخيراً، بعد آخر صف في اللوحة: هو الزر الوحيد من الشريط في المسح. الشريط لا يُغطّى أبداً: تبقى الإعدادات والمرافق متاحة بالرمز. على الكمبيوتر، Escape يوقف المسح؛ «استئناف المسح» يعيده.',
    ],
  },
  team: {
    title: 'فريق الطفل',
    steps: [
      'الإعدادات (وضع المرافق) ← الفريق: الأشخاص الذين لديهم صلاحية، دورهم وما يمكنهم فعله.',
      'دعوة شخص: الاسم، الدور، المستوى (استعمال، مساهمة، تعديل مباشر) والصلاحيات، ثم أرسل الرمز عبر «إرسال بالبريد الإلكتروني» (اختر بريدك: Gmail أو Outlook أو Yahoo أو بريد الجهاز؛ تُفتح فيه رسالة مكتوبة مسبقاً)، أو «مشاركة» أو «نسخ»: التطبيق لا يرسل بريداً إلكترونياً من تلقاء نفسه. يمكن لمختصّ أيضاً أن يطلب الانضمام برمز المختصّين: تختار صلاحياته قبل القبول. المعالج أو المعلّم في الفريق لا يتلقّى رمز المرافق الخاص بكم أبداً: يختار رمزه على جهازه.',
      'الاقتراحات: يظهر كل تغيير مقترح قبل / بعد؛ وافق، أو اطلب تعديلاً، أو ارفض. تغيير مكان كلمة أساسية يحتاج إلى تأكيد.',
      'السجل: من غيّر ماذا ومتى (أبداً ما قاله الطفل)، مع «تراجع».',
      'على شخص من الفريق: «انتهاء الصلاحية» (أسبوع، شهر، 3 أشهر أو بلا نهاية) و«سحب الصلاحية» الذي يُطبَّق فوراً. «الجديد» يجمع ما حدث (دعوة قُبلت، طلب، اقتراح وارد)؛ «تغيير الرمز» يستبدل رمز المختصّين.',
      'وليّ أمر ثانٍ: ادعُه (دور «العائلة»)، ثم المس اسمه وفعّل «يتصرف كوليّ أمر»: تصبح له كل صلاحيات العائلة، ومنها رمز المرافق. وحده وليّ الأمر المسؤول عن الملف يستطيع ذلك، بعد تأكيد هويته. على هذا الوليّ، «تسليم … إلى …» يقترح عليه أن يصبح وليّ الأمر المسؤول: يقبل من الحساب ← الأطفال، بموافقته؛ وتبقى أنت في الفريق كوليّ أمر. يفتح المعالجون والمعلمون اللوحة بحساب مهني تتحقق منه فرقتنا: في الانتظار تظهر في القائمة «بانتظار حساب مهني موثَّق». «إدارة أجهزة الطفل اللوحية» تسمح برؤية الأجهزة وإزالة جهاز لوحي للطفل وإنشاء رمز «استعمال فقط». يمكن لشخص من الفريق المغادرة بـ«مغادرة الفريق» أسفل هذه الصفحة.',
    ],
  },
  account: {
    title: 'حسابك وأطفالك وأجهزتك',
    steps: [
      'الإعدادات (وضع المرافق) ← الحساب ← «حسابي»: اسمك، «تغيير كلمة المرور»، «تسجيل الخروج». عند تسجيل الخروج تغادر لوحات الأطفال الجهاز (وتبقى في حسابكم)؛ على حاسوب مشترك، اختر أيضاً مسح الصور والتسجيلات. عند تسجيل الدخول، «إبقائي مسجّلاً» يفتح التطبيق في المرة القادمة دون طلب كلمة المرور: أزل التحديد على جهاز ليس لك. «تسجيل الدخول بخطوتين»: «تفعيل»، ثم يعطي تطبيق مصادقة (Google Authenticator أو Microsoft Authenticator أو 1Password…) رمزًا من 6 أرقام يُطلب عند كل تسجيل دخول؛ وقبل كتابته لا يظهر شيء عن الأطفال. إلزامي لفريق التطبيق. مع تسجيل الدخول بخطوتين، يطلب «تغيير كلمة المرور» رمز تطبيق المصادقة بدل كلمة المرور الحالية.',
      '«الأطفال»: حساب واحد لعدة أطفال. «إضافة طفل» ينشئ ملفه (بجانب كل سؤال علامة «؟» تشرح فائدة الاختيار)؛ المس طفلاً في القائمة لفتح لوحته. يغيّر وليّ الأمر المسؤول اسم الطفل وعمره بـ«الاسم والعمر». عندما يسلّمك وليّ الأمر الآخر طفلاً، يظهر اقتراحه هنا: حدّد الموافقة ثم «قبول».',
      '«الأجهزة والمزامنة»: الأجهزة المربوطة، آخر مزامنة، «مزامنة الآن»، وسحب جهاز مفقود. «ربط جهاز» يعطي رمزاً من 8 أحرف وأرقام يُكتب على الجهاز الآخر («ربط هذا الجهاز اللوحي برمز» في الصفحة الأولى): «صلاحية كاملة (جهاز الطفل)» أو «استعمال فقط (المدرسة، المربية…)». للصلاحية الكاملة أكّد أولًا أنك أنت (كلمة المرور، أو رمز يصل بالبريد الإلكتروني، أو رمز تطبيق المصادقة). على جهاز مربوط: «فكّ ربط هذا الجهاز». «الصور والتسجيلات»: «منسوخة في الحساب»، أو كم منها «بانتظار الإرسال» (من دون إنترنت تُرسل لاحقاً) أو «لم تصل بعد»؛ جهاز «استعمال فقط» يستقبل الصور والأصوات ولا يرسلها. يحتفظ كل جهاز لنفسه بآخر لوحة نشاط فُتحت وبالخطوات المؤشَّر عليها وبالتقدّم في الدليل: لا تنتقل إلى الأجهزة الأخرى. من دون إنترنت، أو إذا لم يُجب الخادم، تُفتح اللوحة من الجهاز؛ وتُرسل التغييرات عند عودة الاتصال. «نسخ سابقة من اللوحة»: تُحفظ نسخة كل أسبوع وقبل كل تغيير كبير؛ «إعادة» يعيد اللوحة كما كانت (تُحفظ اللوحة الحالية أولًا)؛ «حفظ نسخة الآن» قبل تجربة كبيرة. إذا تعذّر عرض لوحة، يقترح التطبيق «حاول مجددًا» وللوالدين هذه النسخ السابقة.',
      '«الخصوصية والبيانات»: «تصدير الملف (ملف)»، «تصدير لتطبيق تواصل بديل آخر (.obz)» (اللوحات مع صورها لتطبيق تواصل آخر)، «تنزيل كل بياناتي» (ملف واحد فيه كل ما يحفظه الخادم)، حذف ملف الطفل أو «حذف حسابي». ينتقل الملف المحذوف إلى «الملفات المحذوفة»: «إعادة» خلال 30 يومًا، ثم يُمحى. أما الحساب فيُحذف نهائيًا. قبل الحذف أو تنزيل كل شيء، يُطلب منك تأكيد أنك أنت. قبل حذف حسابك، تذكر القائمة الأطفال الذين تملك ملفاتهم ومن سيفقد لوحاتهم: سلّمها أولًا إلى وليّ الأمر الآخر («تسليمه أولًا إلى …») أو حدّد «مسح لوحة …»؛ ويُبلَّغ الآخرون في الفريق.',
      '«التفضيلات»: «لغة القوائم» و«الإشعارات داخل التطبيق». في المتصفح، يرسل «الإشعارات على هذا الجهاز» أيضاً، خارج التطبيق، «تذكير عند الساعة 12 إذا لم يُفتح اللوح» (للأهل) و«أفكار جديدة للتصويت»؛ يُطرح السؤال مرة واحدة بعد تسجيل الدخول. على iPhone و iPad، أضف Empower أولاً إلى الشاشة الرئيسية. لا يظهر اسم الطفل ولا كلماته في أي إشعار. «ساعدنا على تحسين Empower»: اختر موضوعاً («اقتراح وظيفة جديدة»، «طلب مفردات ناقصة»، «طلب رمز»، «طلب لغة أو لهجة»، «الإبلاغ عن صعوبة في الوصول»، «الإبلاغ عن مشكلة تقنية»)، اكتب، ثم «إرسال»؛ أو «التصويت للوظائف القادمة». لا تكتب أبداً اسم طفل ولا معلومات طبية. «فتح الدليل» يعيدك إلى هنا.',
    ],
  },
  workspace: {
    title: 'للمختصين: مساحتك',
    steps: [
      '«التحقق المهني» (عند إنشاء الحساب، ثم في «الحساب والترخيص»): ممارستك، شهادة أو ترخيص مهني، ثم وثيقة هوية تُحذف فور انتهاء التحقق. «إرسال للتحقق»: فريقنا يقبل أو يطلب معلومات إضافية أو يرفض، ونخبرك داخل التطبيق. في الانتظار يمكنك استكشاف مساحتك وتحضير المواد، لكن لا يمكنك بعد الانضمام إلى فريق طفل. لتكون معالجًا أو معلمًا في فريق طفل، يلزم حساب مهني موثَّق، حتى عندما تدعوك العائلة.',
      '«الرئيسية»: مستخدموك المرتبطون، الاقتراحات قيد الانتظار، الدعوات، واختصارات.',
      '«المستخدمون» ← «ربط مستخدم»: اكتب في «رمز العائلة أو رمز دعوة» الرمز الذي أعطاك إياه الأهل. برمز دعوة تنضمّ إلى الفريق فوراً؛ برمز العائلة، حدّد دورك و«الصلاحيات المطلوبة» ورسالة، ثم «إرسال الطلب»: تقبل العائلة بالصلاحيات التي تختارها. الدعوة المرسلة إلى بريدك الإلكتروني تُقبل في المكان نفسه. إذا رفضت العائلة طلبك، «إعادة الطلب» يرسله من جديد بعد أسبوع على الأقل. في صفحة الطفل، «مغادرة الفريق» يزيلك من فريقه.',
      '«المستخدمون» ← «إنشاء ملف طفل» (بعد قبول شهادتك): لطفل ليس لعائلته حساب بعد. تجيب عن الأسئلة نفسها التي يجيب عنها الأهل وتحضّر اللوحة. في صفحة الطفل، «ربط الأهل» ← «إنشاء رمز الأهل» («إرسال بالبريد الإلكتروني» يفتح بريدك والرسالة مكتوبة مسبقاً): ينشئ الأهل حسابهم، ويختارون «لديّ رمز دعوة» في الشاشة الأولى («طفلك») ويكتبون الرمز. يصبح الملف ملفهم: يختارون رمز المرافق وما يُسجَّل؛ وتبقى أنت ضمن الفريق. الأجهزة اللوحية التي ربطتَها والدعوات التي ما زالت تنتظر تتوقف عند ذلك: تربط العائلة أجهزتها وتقرّر من في فريقها (يصلها إشعار بأسماء من في الفريق).',
      '«مكتبتي»: تحت «إنشاء مادة»، اضغط على ما تريد تحضيره (لوحة نشاط، جدول، «أولاً / ثم»، بطاقات للطباعة، أو من صورة)؛ تأخذ المادة اسم ما تحتويه. «البحث بالاسم» يجد مادة من جديد. القوائم: «العناصر المُنشأة»، «مشترك معي» و«مواد المستخدمين». اضغط على مادة لتخصيصها لطفل («تخصيص لـ…»)، أو اقتراحها على عائلة («اقتراح على ملف…»)، أو مشاركتها «مع زميل (بريد إلكتروني) أو فريق طفل».',
      '«التعاون»: «اتصالاتي»، «الطلبات المرسلة»، «الموارد المشتركة» و«النشاط الأخير».',
    ],
  },
  proposals: {
    title: 'للمختصين: اقتراح تغييرات',
    steps: [
      'من مساحتك، «المستخدمون» يفتح لوحة طفل. العائلة هي التي تختار صلاحياتك: «استعمال»، «مساهمة» أو «تعديل مباشر». زر «الإعدادات» بجانب الطفل يفتح إعداداته مباشرة: اللوحة، الفريق، المتابعة (إذا سمحت لك العائلة) وحسابك.',
      '«مساهمة»: تذهب تغييراتك إلى مسودة. منذ أول تغيير، يظهر شريط يبيّن عدد التغييرات الجاهزة؛ لا يتغيّر شيء للطفل قبل موافقة العائلة.',
      '«إرسال للموافقة»: أعطِ الاقتراح عنواناً، واذكر السبب إن شئت. ترى العائلة ما قبل وما بعد، فتوافق أو تطلب تعديلاً أو ترفض.',
      '«تعديل مباشر»: تُطبَّق تغييراتك فوراً وتظهر في السجلّ. «استعمال»: يمكنك استعمال اللوحة والنمذجة دون تغيير أي شيء.',
      'على جهازك أنت، تختار رمز المرافق الخاص بك في المرة الأولى؛ ثم يُطلب لوضع المرافق ولإعدادات كل لوحة تفتحها (غالباً يكون طفل أمام جهازك). رمز العائلة لا يُطلب منك أبداً: تغيّر رمزك أنت من الإعدادات ← الرمز والبيانات. «مكتبتي» تحفظ موادك (لوحات نشاط، جداول، «أولاً / ثم»، بطاقات) لتقترحها لاحقاً على عائلة. «الدليل» (في مساحتك): لوحة تجريبية للتدرّب، لا يُحفظ فيها شيء، ودروس.',
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
      'المس تبويب لوحة النشاط مرتين: تعديل العنوان، نسخ، «ترتيب مثل اللوحة الرئيسية» (يعيد كل نوع من الكلمات إلى عموده، بعد إضافة كلمات مثلاً)، مشاركة (إرسال إلى شخص لديه حساب، أو حفظ ملف)، طباعة.',
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
      'يُحفظ ملف الطفل (الكلمات، اللوحات، الإعدادات) على الجهاز، ومع الحساب على الخادم في أوروبا، للفريق الذي تختاره. لا يُسجَّل ما يفعله الطفل إلا إذا اختارت العائلة ذلك (الإعدادات ← المتابعة). تُنسخ الصور والتسجيلات في الحساب، في مساحة خاصة لا يفتحها إلا فريق الطفل: الصورة التي تُضاف على هاتف أحد الوالدين تصل إلى جهاز الطفل اللوحي، ولا يضيع شيء مع ضياع الجهاز.',
      'الذكاء الاصطناعي (اقتراحات اللوحات، من صورة إلى لوحة، الرسومات) لا يتلقى إلا الموضوع أو الصورة أو الرسم، لا اسم الطفل ولا جمله أبداً، ويمكن إيقافه في الإعدادات ← البيانات.',
      '«تصدير الملف الشخصي (نسخة احتياطية)» قبل تغيير الجهاز؛ «تصدير لتطبيق تواصل بديل آخر (.obz)» ينقل اللوحات إلى تطبيق آخر؛ «إعادة ضبط الملف الشخصي» يبدأ من الصفر. «تنزيل كل بياناتي» (الإعدادات ← الحساب) يعطي ملفًا واحدًا فيه كل ما يحفظه الخادم. عند إنشاء الملف يعطي الوالد موافقته («موافقتك»): يُحفظ التاريخ والنص. يمحو الخادم من تلقاء نفسه: المتابعة بعد 24 شهرًا (الجمل بعد 12)، والسجل بعد 24 شهرًا. يتم إملاء جملة على الجهاز إذا كانت لغتها مثبّتة عليه؛ وإلا يقول سطر إن خدمة Apple أو Google تسمعها.',
      'الإعدادات ← المتابعة ← «المساعدة في تحسين التطبيق» (متوقّف افتراضياً؛ يُعرض أيضاً في نهاية مسار الإعداد): أرقام مجهولة الهوية لفريق التطبيق. أيّ الوظائف تظهر على الشاشة وأيّها تُستعمل وكم مرة، مدد الانتظار (فتح التطبيق، الحفظ، الصوت) في بضع فئات، نسخة التطبيق، المشاكل التقنية (أيّ شاشة، أيّ نسخة)، الإعدادات المختارة مثل اللغة، وإذا كانت المتابعة مفعّلة: العمر، المدد، عدد اللمسات وطول الجمل. لا الاسم ولا الكلمات ولا الجمل ولا الصور ولا التسجيلات أبداً. لا يرى الفريق إلا مجاميع، ابتداءً من 5 أطفال من 5 عائلات. إذا توقفتم يُمحى ما تمّ عدّه للطفل. وإذا تغيّرت القائمة يقول التطبيق ذلك («تغيّر ما تتمّ مشاركته») ولا يرسل شيئاً بعدها حتى تلمسوا «أوافق على القائمة الجديدة».',
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
