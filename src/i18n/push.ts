/** Notifications outside the app: the question asked once after signing in, and the switches in the account's preferences. */
import type { UiLang } from '../model/types';

const fr = {
  askTitle: 'Activer les notifications ?',
  askParent: 'Empower peut vous envoyer un court rappel à 12 h les jours où le tableau n’a pas encore été ouvert, et vous prévenir quand une nouvelle idée est soumise au vote.',
  askPro: 'Empower peut vous prévenir quand une nouvelle idée est soumise au vote.',
  askNote: 'Jamais le nom ni les mots d’un enfant dans une notification. Vous pouvez les désactiver à tout moment dans les préférences de votre compte.',
  yes: 'Activer',
  later: 'Pas maintenant',
  goOn: 'Continuer',
  refused: 'Votre navigateur bloque les notifications. Pour les autoriser, ouvrez les réglages du site dans le navigateur (le cadenas à côté de l’adresse).',
  failed: 'Les notifications n’ont pas pu être activées. Réessayez plus tard.',
  device: 'Notifications sur cet appareil',
  reminder: 'Rappel à 12 h si le tableau n’a pas été ouvert',
  ideas: 'Nouvelles idées à voter',
  homeScreen: 'Sur iPhone et iPad : ajoutez d’abord Empower à l’écran d’accueil (Partager, puis « Sur l’écran d’accueil ») et ouvrez-le depuis là.',
};

const en: typeof fr = {
  askTitle: 'Turn on notifications?',
  askParent: 'Empower can send you a short reminder at 12:00 on the days the board has not been opened yet, and tell you when a new idea is put to the vote.',
  askPro: 'Empower can tell you when a new idea is put to the vote.',
  askNote: 'Never a child’s name or words in a notification. You can turn them off at any time in your account’s preferences.',
  yes: 'Turn on',
  later: 'Not now',
  goOn: 'Continue',
  refused: 'Your browser is blocking notifications. To allow them, open the site’s settings in the browser (the padlock next to the address).',
  failed: 'Notifications could not be turned on. Try again later.',
  device: 'Notifications on this device',
  reminder: 'Reminder at 12:00 if the board was not opened',
  ideas: 'New ideas to vote on',
  homeScreen: 'On iPhone and iPad: first add Empower to the Home Screen (Share, then “Add to Home Screen”) and open it from there.',
};

const ar: typeof fr = {
  askTitle: 'تفعيل الإشعارات؟',
  askParent: 'يستطيع Empower أن يرسل لك تذكيرًا قصيرًا عند الساعة 12 في الأيام التي لم يُفتح فيها اللوح بعد، وأن يخبرك عند طرح فكرة جديدة للتصويت.',
  askPro: 'يستطيع Empower أن يخبرك عند طرح فكرة جديدة للتصويت.',
  askNote: 'لا يظهر اسم الطفل ولا كلماته في أي إشعار. يمكنك إيقافها في أي وقت من تفضيلات حسابك.',
  yes: 'تفعيل',
  later: 'ليس الآن',
  goOn: 'متابعة',
  refused: 'متصفحك يحظر الإشعارات. للسماح بها، افتح إعدادات الموقع في المتصفح (القفل بجانب العنوان).',
  failed: 'تعذّر تفعيل الإشعارات. حاول لاحقًا.',
  device: 'الإشعارات على هذا الجهاز',
  reminder: 'تذكير عند الساعة 12 إذا لم يُفتح اللوح',
  ideas: 'أفكار جديدة للتصويت',
  homeScreen: 'على iPhone و iPad: أضف Empower أولًا إلى الشاشة الرئيسية (مشاركة، ثم «إضافة إلى الشاشة الرئيسية») وافتحه من هناك.',
};

export type PushStrings = typeof fr;
const DICTS: Record<UiLang, PushStrings> = { fr, en, ar };
export const pushStrings = (l: UiLang): PushStrings => DICTS[l];
