/**
 * The "?" beside each question of the set-up journey: what the choice does and where it can be
 * changed later, in a few plain lines, followed by the part of the in-app guide that goes with it
 * (`guide`: a chapter of `src/data/guide.ts` and the steps of it to show).
 *
 * Written about "the child" (not "your child"): the same text serves parents and professionals.
 * The three languages always have the same number of lines (a test checks it), and every chapter
 * and step named here must exist in the guide (a test checks that too).
 */
import type { UiLang } from '../model/types';
import { GUIDE } from './guide';

export type SetupHelpId =
  | 'child'
  | 'langs'
  | 'arabic'
  | 'voice'
  | 'comm'
  | 'activities'
  | 'visual'
  | 'feedback'
  | 'review'
  | 'vocab'
  | 'layout'
  | 'access'
  | 'plans'
  | 'data';

export interface SetupHelp {
  lines: Record<UiLang, string[]>;
  /** Parts of the guide shown under the explanation. */
  guide?: { chapter: string; steps: number[] }[];
}

export const SETUP_HELP: Record<SetupHelpId, SetupHelp> = {
  child: {
    lines: {
      fr: [
        'Le prénom est affiché dans l’application et aux personnes que vous invitez dans l’équipe. Il n’est jamais envoyé à l’aide par IA.',
        'L’âge est facultatif : il est seulement gardé dans le profil, pour vous et l’équipe.',
        'Garçon ou fille : uniquement pour accorder les mots en français et en arabe (« je suis fatigué » ou « fatiguée »). Cela se change dans les Réglages.',
      ],
      en: [
        'The first name is shown in the app and to the people you invite to the team. It is never sent to the AI helper.',
        'The age is optional: it is only kept in the profile, for you and the team.',
        'Boy or girl: only to make words agree in French and Arabic (« je suis fatigué » or « fatiguée »). It can be changed in Settings.',
      ],
      ar: [
        'يظهر الاسم في التطبيق وللأشخاص الذين تدعوهم إلى الفريق. لا يُرسل أبداً إلى المساعد بالذكاء الاصطناعي.',
        'العمر اختياري: يُحفظ فقط في الملف، لك وللفريق.',
        'ولد أو بنت: فقط لتصريف الكلمات بالفرنسية والعربية (مثل «أنا تعبان» أو «تعبانة»). يمكن تغييره من الإعدادات.',
      ],
    },
  },
  langs: {
    lines: {
      fr: [
        'Ce sont les langues des mots : ce qui est écrit sous les images et ce que dit la voix. Chaque mot garde la même place dans toutes les langues.',
        'La première langue cochée est celle dans laquelle le tableau s’ouvre. Vous pourrez en ajouter, en retirer ou en changer plus tard dans les Réglages.',
        'La langue des menus est à part : elle se choisit avec FR / EN / ع en haut de l’écran.',
      ],
      en: [
        'These are the languages of the words: what is written under the pictures and what the voice says. Each word keeps the same place in every language.',
        'The first language ticked is the one the board opens in. You can add, remove or switch languages later in Settings.',
        'The language of the menus is separate: it is chosen with FR / EN / ع at the top of the screen.',
      ],
      ar: [
        'هذه لغات الكلمات: ما يُكتب تحت الصور وما يقوله الصوت. تبقى كل كلمة في المكان نفسه في كل اللغات.',
        'أول لغة تختارها هي التي تُفتح بها اللوحة. يمكنك إضافة لغة أو حذفها أو تغييرها لاحقاً من الإعدادات.',
        'لغة القوائم منفصلة: تُختار من FR / EN / ع أعلى الشاشة.',
      ],
    },
    guide: [{ chapter: 'language', steps: [0, 1, 3] }],
  },
  arabic: {
    lines: {
      fr: [
        'Les mots arabes changent d’un pays à l’autre (« بدي », « عايز », « أبغى »…). Ce choix règle les mots arabes écrits sur le tableau et ceux qui sont proposés.',
        'Il change les mots, pas la voix : l’appareil lit l’arabe avec sa voix arabe standard. Un mot qui sonne mal peut être enregistré avec votre propre voix.',
        'Cela se change plus tard dans les Réglages.',
      ],
      en: [
        'Arabic words change from one country to another (« بدي », « عايز », « أبغى »…). This choice sets the Arabic words written on the board and the ones that are suggested.',
        'It changes the words, not the voice: the device reads Arabic with its standard Arabic voice. A word that sounds wrong can be recorded with your own voice.',
        'It can be changed later in Settings.',
      ],
      ar: [
        'تختلف الكلمات العربية من بلد إلى آخر («بدي»، «عايز»، «أبغى»…). هذا الاختيار يحدّد الكلمات العربية المكتوبة على اللوحة والكلمات المقترحة.',
        'يغيّر الكلمات لا الصوت: يقرأ الجهاز العربية بصوته العربي الفصيح. يمكن تسجيل الكلمة التي لا تُنطق جيداً بصوتك.',
        'يمكن تغييره لاحقاً من الإعدادات.',
      ],
    },
    guide: [{ chapter: 'language', steps: [2] }],
  },
  voice: {
    lines: {
      fr: [
        'C’est la voix qui dit les mots que l’enfant touche. Elle vient de l’appareil : pas besoin d’internet.',
        'Féminine ou masculine : c’est une voix de l’appareil. Touchez « Écouter » pour l’entendre.',
        'Plus tard, dans Réglages → Voix : la vitesse, et la voix utilisée pour chaque langue. Un mot peut aussi être enregistré par quelqu’un de la famille.',
      ],
      en: [
        'This is the voice that says the words the child touches. It comes from the device: no internet needed.',
        'Female or male: it is one of the device’s voices. Touch “Listen” to hear it.',
        'Later, in Settings → Voice: the speed, and the voice used for each language. A word can also be recorded by someone in the family.',
      ],
      ar: [
        'هذا هو الصوت الذي ينطق الكلمات التي يلمسها الطفل. يأتي من الجهاز: لا حاجة إلى الإنترنت.',
        'صوت امرأة أو رجل: هو أحد أصوات الجهاز. المس «استمع» لتسمعه.',
        'لاحقاً، في الإعدادات ← الصوت: السرعة، والصوت المستخدم لكل لغة. يمكن أيضاً أن يسجّل أحد أفراد العائلة كلمة بصوته.',
      ],
    },
    guide: [{ chapter: 'settings', steps: [5] }],
  },
  comm: {
    lines: {
      fr: [
        'Ces questions servent à choisir combien de mots le premier tableau montre : peu de mots pour un enfant qui découvre la CAA, le tableau complet pour un enfant qui utilise déjà une application.',
        'Il n’y a pas de mauvaise réponse et rien n’est figé : le nombre de mots vous est montré plus loin, et se change à tout moment dans les Réglages.',
        'Les réponses servent aussi à vous donner, dans le Guide, des premiers conseils adaptés à l’enfant. Les autres façons de communiquer (gestes, images…) sont notées dans le profil pour l’équipe ; elles ne changent pas le tableau.',
      ],
      en: [
        'These questions choose how many words the first board shows: few words for a child who is new to AAC, the full board for a child who already uses an app.',
        'There is no wrong answer and nothing is fixed: the number of words is shown to you further on, and can be changed at any time in Settings.',
        'The answers are also used to give you, in the Guide, first tips that suit the child. The other ways of communicating (gestures, pictures…) are noted in the profile for the team; they do not change the board.',
      ],
      ar: [
        'تُستعمل هذه الأسئلة لاختيار عدد الكلمات في اللوحة الأولى: كلمات قليلة لطفل يبدأ بالتواصل المعزَّز والبديل، واللوحة الكاملة لطفل يستعمل تطبيقاً من قبل.',
        'لا توجد إجابة خاطئة ولا شيء نهائي: يظهر لك عدد الكلمات لاحقاً، ويمكن تغييره في أي وقت من الإعدادات.',
        'تُستعمل الإجابات أيضاً لإعطائك في الدليل نصائح أولى تناسب الطفل. طرق التواصل الأخرى (الإشارات، الصور…) تُدوَّن في الملف للفريق ولا تغيّر اللوحة.',
      ],
    },
    guide: [{ chapter: 'reveal', steps: [0] }],
  },
  activities: {
    lines: {
      fr: [
        'Les activités cochées sont rangées dans le dossier « mes mots », sur le tableau principal : l’enfant les trouve en une touche.',
        'Vous pouvez ajouter les siennes (un lieu, une personne, un jeu). Les mots et les images s’ajoutent, se changent ou se retirent plus tard en mode accompagnant.',
        'C’est facultatif : vous pouvez passer cette étape.',
      ],
      en: [
        'The activities you tick go in the “my words” folder, on the main board: the child finds them in one touch.',
        'You can add the child’s own (a place, a person, a game). Words and pictures can be added, changed or removed later in caregiver mode.',
        'It is optional: you can skip this step.',
      ],
      ar: [
        'الأنشطة التي تختارها توضع في مجلد «كلماتي» على اللوحة الرئيسية: يجدها الطفل بلمسة واحدة.',
        'يمكنك إضافة أنشطته الخاصة (مكان، شخص، لعبة). يمكن إضافة الكلمات والصور أو تغييرها أو حذفها لاحقاً في وضع المرافق.',
        'هذه الخطوة اختيارية: يمكنك تخطّيها.',
      ],
    },
    guide: [{ chapter: 'folders', steps: [0, 1] }],
  },
  visual: {
    lines: {
      fr: [
        'C’est l’aspect des cases : les couleurs habituelles, des textes plus grands et plus gras, ou des cases sombres à bordure vive (contraste élevé) pour un enfant qui voit moins bien.',
        'Dans tous les cas, la couleur d’une case garde son sens (personnes, actions, mots qui décrivent…).',
        'Le petit aperçu montre le résultat. Cela se change dans Réglages → Présentation et accès.',
      ],
      en: [
        'This is how the cards look: the usual colours, bigger and bolder text, or dark cards with a bright border (high contrast) for a child who sees less well.',
        'In every case the colour of a card keeps its meaning (people, actions, describing words…).',
        'The small preview shows the result. It can be changed in Settings → Presentation and access.',
      ],
      ar: [
        'هذا شكل البطاقات: الألوان المعتادة، أو نص أكبر وأعرض، أو بطاقات داكنة بإطار زاهٍ (تباين عالٍ) لطفل يرى أقل.',
        'في كل الحالات يحتفظ لون البطاقة بمعناه (أشخاص، أفعال، كلمات وصف…).',
        'المعاينة الصغيرة تُظهر النتيجة. يمكن تغييره في الإعدادات ← العرض وطريقة الاختيار.',
      ],
    },
    guide: [
      { chapter: 'settings', steps: [3] },
      { chapter: 'principles', steps: [3] },
    ],
  },
  feedback: {
    lines: {
      fr: [
        'Standard : l’image bouge un peu quand on la touche et quand son mot est dit, ce qui aide l’enfant à suivre. Réduit : pas de mouvement, pas de vibration, minuteur silencieux — pour un enfant vite gêné par le bruit ou le mouvement. La voix reste toujours.',
        'Une tablette comme l’iPad n’a pas de moteur de vibration : seule l’image bouge.',
        'Cela se change dans les Réglages.',
      ],
      en: [
        'Standard: the picture moves a little when it is touched and when its word is said, which helps the child follow. Reduced: no movement, no vibration, a silent timer — for a child easily bothered by noise or movement. The voice always stays.',
        'A tablet such as an iPad has no vibration motor: only the picture moves.',
        'It can be changed in Settings.',
      ],
      ar: [
        'عادي: تتحرك الصورة قليلاً عند لمسها وعند نطق كلمتها، وهذا يساعد الطفل على المتابعة. مخفَّف: بلا حركة ولا اهتزاز ومؤقت صامت — لطفل يزعجه الصوت أو الحركة بسرعة. الصوت يبقى دائماً.',
        'الجهاز اللوحي مثل الآيباد ليس فيه محرّك اهتزاز: تتحرك الصورة فقط.',
        'يمكن تغييره من الإعدادات.',
      ],
    },
    guide: [{ chapter: 'settings', steps: [2, 3] }],
  },
  review: {
    lines: {
      fr: [
        'Rien n’est encore créé : relisez chaque réponse, et touchez « Modifier » pour en changer une.',
        'Tout ce qui est ici se change aussi plus tard dans les Réglages.',
      ],
      en: [
        'Nothing is created yet: read each answer again, and touch “Edit” to change one.',
        'Everything here can also be changed later in Settings.',
      ],
      ar: [
        'لم يُنشأ شيء بعد: راجع كل إجابة، والمس «تعديل» لتغيير إحداها.',
        'كل ما هنا يمكن تغييره لاحقاً من الإعدادات أيضاً.',
      ],
    },
  },
  vocab: {
    lines: {
      fr: [
        'Le vocabulaire, ce sont les mots et leur place. Notre vocabulaire de base compte environ 80 mots fréquents (je, vouloir, encore, pas…) qui ne changent jamais de place, plus des dossiers (nourriture, personnes, émotions…).',
        'La même place à chaque fois : la main apprend le chemin, comme sur un clavier.',
        'Les autres choix partent d’un tableau qui existe déjà : celui de cette tablette, celui d’un frère ou d’une sœur, ou un fichier exporté depuis l’application.',
      ],
      en: [
        'The vocabulary is the words and their places. Our core vocabulary has about 80 frequent words (I, want, more, not…) that never change place, plus folders (food, people, feelings…).',
        'The same place every time: the hand learns the way, as on a keyboard.',
        'The other choices start from a board that already exists: the one on this tablet, a brother’s or sister’s, or a file exported from the app.',
      ],
      ar: [
        'المفردات هي الكلمات وأماكنها. مفرداتنا الأساسية فيها نحو 80 كلمة شائعة (أنا، أريد، أكثر، لا…) لا تغيّر مكانها أبداً، مع مجلدات (طعام، أشخاص، مشاعر…).',
        'المكان نفسه في كل مرة: تتعلّم اليد الطريق، كما على لوحة المفاتيح.',
        'الخيارات الأخرى تبدأ من لوحة موجودة: لوحة هذا الجهاز، أو لوحة أخ أو أخت، أو ملف مُصدَّر من التطبيق.',
      ],
    },
    guide: [{ chapter: 'principles', steps: [0] }],
  },
  layout: {
    lines: {
      fr: [
        'Mots affichés : un enfant qui débute peut voir d’abord environ 25 mots, puis davantage. Les mots cachés ne sont pas perdus : vous les montrez quand l’enfant est prêt.',
        'Taille des images : avec les grandes images, le dessin occupe plus de place dans la case.',
        'Écrire le mot sous l’image : à garder pour que l’enfant et les adultes voient le mot écrit ; sans cela, il n’y a que les images.',
      ],
      en: [
        'Words shown: a child who is starting can first see about 25 words, then more. The hidden words are not lost: you show them when the child is ready.',
        'Picture size: with large pictures, the drawing takes more room in the card.',
        'Write the word under the picture: keep it so that the child and the adults see the written word; without it there are only pictures.',
      ],
      ar: [
        'الكلمات الظاهرة: الطفل المبتدئ يمكن أن يرى أولاً نحو 25 كلمة ثم أكثر. الكلمات المخفية لا تضيع: تُظهرها عندما يكون الطفل جاهزاً.',
        'حجم الصور: مع الصور الكبيرة يأخذ الرسم مساحة أكبر في البطاقة.',
        'كتابة الكلمة تحت الصورة: أبقِها ليرى الطفل والكبار الكلمة مكتوبة؛ من دونها تبقى الصور فقط.',
      ],
    },
    guide: [{ chapter: 'reveal', steps: [0, 1] }],
  },
  access: {
    lines: {
      fr: [
        'C’est la façon dont une touche compte. Toucher puis lever le doigt : le mot est dit quand le doigt se lève, l’enfant peut donc glisser jusqu’à la bonne case. Dès que le doigt touche : pour un enfant qui tape vite. Garder le doigt appuyé : le doigt doit rester un instant, ce qui évite les touches par accident.',
        'Durée d’appui : le temps pendant lequel le doigt doit rester. Délai avant de répéter : empêche le même mot d’être dit plusieurs fois de suite (« pas pas pas »).',
        'Cela se change dans Réglages → Présentation et accès.',
      ],
      en: [
        'This is how a touch counts. Touch, then lift the finger: the word is said when the finger lifts, so the child can slide to the right card. As soon as the finger touches: for a child who taps fast. Keep the finger pressed: the finger must stay a moment, which avoids touches by accident.',
        'Hold time: how long the finger must stay. Delay before repeating: stops the same word being said several times in a row (“not not not”).',
        'It can be changed in Settings → Presentation and access.',
      ],
      ar: [
        'هذه طريقة احتساب اللمسة. اللمس ثم رفع الإصبع: تُنطق الكلمة عند رفع الإصبع، فيستطيع الطفل أن ينزلق إلى البطاقة الصحيحة. فور لمس الإصبع: لطفل ينقر بسرعة. إبقاء الإصبع مضغوطاً: يجب أن يبقى الإصبع لحظة، وهذا يمنع اللمس بالخطأ.',
        'مدة الضغط: الوقت الذي يجب أن يبقى فيه الإصبع. المهلة قبل التكرار: تمنع نطق الكلمة نفسها مرات متتالية («لا لا لا»).',
        'يمكن تغييره في الإعدادات ← العرض وطريقة الاختيار.',
      ],
    },
    guide: [{ chapter: 'settings', steps: [3] }],
  },
  plans: {
    lines: {
      fr: [
        'Le planning montre la journée en images (maintenant, ensuite). Il est toujours là.',
        'Semaine : les activités de chaque jour. Mois : un calendrier des événements (anniversaire, médecin, vacances). Ne les activez que s’ils aident l’enfant : moins de boutons, c’est plus simple.',
        'Cela se change dans Réglages → Tableau → Barre universelle.',
      ],
      en: [
        'The schedule shows the day in pictures (now, next). It is always there.',
        'Week: each day’s activities. Month: a calendar of events (birthday, doctor, holidays). Turn them on only if they help the child: fewer buttons is simpler.',
        'It can be changed in Settings → Board → Universal bar.',
      ],
      ar: [
        'يُظهر الجدول اليوم بالصور (الآن، بعد ذلك). هو موجود دائماً.',
        'الأسبوع: أنشطة كل يوم. الشهر: تقويم للأحداث (عيد ميلاد، طبيب، عطلة). فعّلهما فقط إذا كانا يساعدان الطفل: أزرار أقل تعني بساطة أكثر.',
        'يمكن تغييره في الإعدادات ← اللوحة ← الشريط الدائم.',
      ],
    },
    guide: [{ chapter: 'schedule', steps: [0, 3] }],
  },
  data: {
    lines: {
      fr: [
        'L’application peut tenir un journal de la façon dont l’enfant utilise son tableau, pour voir ses progrès avec l’équipe. Vous choisissez jusqu’où : rien ; l’utilisation seulement (quand, combien de temps) ; l’utilisation et les mots ; ou l’utilisation, les mots et les phrases.',
        'Ce journal reste avec le profil de l’enfant. Les professionnels ne le voient que si vous le leur permettez, et vous pouvez tout effacer à tout moment (Réglages → Suivi).',
        'Ne rien choisir, c’est ne rien enregistrer.',
        'Tout en bas, « Aider à améliorer l’application » est un autre choix, éteint au départ : il envoie à l’équipe de l’application des chiffres anonymes (quelles fonctions servent, quels problèmes techniques), jamais le nom, les mots ni les phrases de l’enfant.',
      ],
      en: [
        'The app can keep a diary of how the child uses the board, to see progress with the team. You choose how far: nothing; use only (when, how long); use and words; or use, words and sentences.',
        'This diary stays with the child’s profile. Professionals only see it if you allow them, and you can erase everything at any time (Settings → Progress).',
        'Choosing nothing means recording nothing.',
        'At the bottom, “Help improve the app” is another choice, off to start with: it sends the app’s team anonymous figures (which features are used, which technical problems happen), never the child’s name, words or sentences.',
      ],
      ar: [
        'يستطيع التطبيق أن يحفظ سجلاً لطريقة استعمال الطفل للوحته، لمتابعة تقدّمه مع الفريق. أنت تختار المدى: لا شيء؛ الاستعمال فقط (متى وكم من الوقت)؛ الاستعمال والكلمات؛ أو الاستعمال والكلمات والجمل.',
        'يبقى هذا السجل مع ملف الطفل. لا يراه المختصون إلا إذا سمحت لهم، ويمكنك محو كل شيء في أي وقت (الإعدادات ← المتابعة).',
        'عدم الاختيار يعني عدم تسجيل أي شيء.',
        'في الأسفل، «المساعدة في تحسين التطبيق» خيار آخر، متوقّف في البداية: يرسل إلى فريق التطبيق أرقاماً مجهولة الهوية (أيّ الوظائف تُستعمل، وأيّ المشاكل التقنية تحدث)، ولا يرسل أبداً اسم الطفل ولا كلماته ولا جمله.',
      ],
    },
    guide: [
      { chapter: 'progress', steps: [0, 4] },
      { chapter: 'privacy', steps: [0] },
    ],
  },
};

export interface SetupHelpText {
  lines: string[];
  /** The parts of the guide that go with the question: the chapter's title and the chosen steps. */
  guide: { title: string; steps: string[] }[];
}

/** What the "?" of a set-up question shows, in the language of the menus. */
export function setupHelp(id: SetupHelpId, lang: UiLang): SetupHelpText {
  const help = SETUP_HELP[id];
  const guide = (help.guide ?? []).flatMap((part) => {
    const chapter = GUIDE.find((c) => c.id === part.chapter);
    if (!chapter) return [];
    const steps = part.steps.map((i) => chapter.steps[lang][i]).filter(Boolean);
    return steps.length ? [{ title: chapter.title[lang], steps }] : [];
  });
  return { lines: help.lines[lang], guide };
}
