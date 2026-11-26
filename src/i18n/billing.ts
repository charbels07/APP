/**
 * Words of payment (src/lib/billing.ts): the family's subscription, the professional's licence, the
 * message after the caregiver code. Plain words; prices are always the store's (never written here).
 */
import type { UiLang } from '../model/types';

export interface BillingStrings {
  subscription: string;
  licence: string;
  /** The professional's page: paying her licence (beside the certificate's "Licence"). */
  licencePay: string;
  /** The reminder dot on "Settings" and "Caregiver", for screen readers. */
  dotLabel: string;
  status: {
    trial: string;
    grace: string;
    paused: string;
    frozen: string;
    paid: string;
    paidEnds: string;
    free: string;
  };
  childStillTalks: string;
  pausedMeans: string;
  frozenMeans: string;
  notPayer: string;
  notPayerTablet: string;
  plansTitle: string;
  monthly: string;
  yearly: string;
  perMonth: string;
  perYear: string;
  once: string;
  subscribe: string;
  restore: string;
  manage: string;
  later: string;
  myAccount: string;
  renewsNote: string;
  terms: string;
  privacy: string;
  storesOnly: string;
  noPlans: string;
  bought: string;
  pending: string;
  restored: string;
  storeError: string;
  checking: string;
  licenceIntro: string;
  licenceOwned: string;
  buyLicence: string;
  messageTitle: string;
}

const fr: BillingStrings = {
  subscription: 'Abonnement',
  licence: 'Licence',
  licencePay: 'Paiement de la licence',
  dotLabel: 'rappel d’abonnement',
  status: {
    trial: 'Semaine gratuite : encore {n} jour(s).',
    grace: 'L’abonnement est terminé. Rien n’est bloqué pendant encore {n} jour(s).',
    paused: 'L’abonnement est terminé : tout est en pause sauf la parole de l’enfant (encore {n} jour(s) avant le gel du tableau).',
    frozen: 'L’abonnement est terminé : le tableau est gelé. L’enfant parle toujours.',
    paid: 'Abonnement actif. Il se renouvelle le {date}.',
    paidEnds: 'Abonnement actif jusqu’au {date} (sans renouvellement).',
    free: 'Rien à payer pour l’instant.',
  },
  childStillTalks: 'L’enfant peut toujours parler avec son tableau, même sans abonnement.',
  pausedMeans: 'En pause : pas de nouveaux mots ni de changements, pas de synchronisation, de suivi, d’équipe ni de copies. Rien n’est effacé : tout revient dès l’abonnement.',
  frozenMeans: 'Gelé : le tableau reste tel quel et parle toujours. Rien n’est effacé : tout revient dès l’abonnement.',
  notPayer: 'C’est le parent qui détient le compte de l’enfant qui peut s’abonner, depuis Mon compte.',
  notPayerTablet: 'Un parent peut s’abonner depuis son propre appareil (Mon compte).',
  plansTitle: 'Choisir un abonnement',
  monthly: 'Mensuel',
  yearly: 'Annuel',
  perMonth: '{price} par mois',
  perYear: '{price} par an',
  once: '{price}, une seule fois',
  subscribe: 'S’abonner',
  restore: 'Restaurer les achats',
  manage: 'Gérer l’abonnement',
  later: 'Plus tard',
  myAccount: 'Mon compte',
  renewsNote: 'L’abonnement se renouvelle automatiquement au même prix, sauf s’il est annulé au moins 24 heures avant la fin de la période. Il se gère et s’annule dans les réglages du store.',
  terms: 'Conditions d’utilisation',
  privacy: 'Politique de confidentialité',
  storesOnly: 'L’abonnement se prend dans l’app Daleth AAC sur iPhone, iPad ou Android (App Store, Google Play).',
  noPlans: 'Le store ne répond pas pour l’instant. Réessayez dans un moment.',
  bought: 'Merci ! L’abonnement est actif.',
  pending: 'Le store attend une confirmation du paiement. L’abonnement sera actif dès qu’elle arrive.',
  restored: 'Achats vérifiés.',
  storeError: 'L’achat n’a pas pu se faire. Rien n’a été payé. Réessayez dans un moment.',
  checking: 'Vérification…',
  licenceIntro: 'Une licence professionnelle, payée une seule fois, permet de rejoindre l’équipe des enfants comme orthophoniste ou enseignant(e).',
  licenceOwned: 'Votre licence est active.',
  buyLicence: 'Acheter la licence',
  messageTitle: 'Abonnement',
};

const en: BillingStrings = {
  subscription: 'Subscription',
  licence: 'Licence',
  licencePay: 'Licence payment',
  dotLabel: 'subscription reminder',
  status: {
    trial: 'Free week: {n} day(s) left.',
    grace: 'The subscription has ended. Nothing is blocked for {n} more day(s).',
    paused: 'The subscription has ended: everything is paused except the child talking ({n} day(s) before the board is frozen).',
    frozen: 'The subscription has ended: the board is frozen. The child still talks.',
    paid: 'Subscription active. It renews on {date}.',
    paidEnds: 'Subscription active until {date} (not renewing).',
    free: 'Nothing to pay for now.',
  },
  childStillTalks: 'The child can always talk with the board, even without a subscription.',
  pausedMeans: 'Paused: no new words or changes, no sync, follow-up, team or copies. Nothing is deleted: everything comes back as soon as you subscribe.',
  frozenMeans: 'Frozen: the board stays as it is and still talks. Nothing is deleted: everything comes back as soon as you subscribe.',
  notPayer: 'The parent who holds the child’s account can subscribe, from My account.',
  notPayerTablet: 'A parent can subscribe from their own device (My account).',
  plansTitle: 'Choose a subscription',
  monthly: 'Monthly',
  yearly: 'Yearly',
  perMonth: '{price} a month',
  perYear: '{price} a year',
  once: '{price}, once',
  subscribe: 'Subscribe',
  restore: 'Restore purchases',
  manage: 'Manage subscription',
  later: 'Later',
  myAccount: 'My account',
  renewsNote: 'The subscription renews automatically at the same price unless it is cancelled at least 24 hours before the end of the period. Manage or cancel it in the store’s settings.',
  terms: 'Terms of use',
  privacy: 'Privacy policy',
  storesOnly: 'Subscribe in the Daleth AAC app on an iPhone, iPad or Android device (App Store, Google Play).',
  noPlans: 'The store is not answering right now. Try again in a moment.',
  bought: 'Thank you! The subscription is active.',
  pending: 'The store is waiting for the payment to be confirmed. The subscription starts as soon as it is.',
  restored: 'Purchases checked.',
  storeError: 'The purchase did not go through. Nothing was paid. Try again in a moment.',
  checking: 'Checking…',
  licenceIntro: 'A professional licence, paid once, lets you join children’s teams as a speech therapist or a teacher.',
  licenceOwned: 'Your licence is active.',
  buyLicence: 'Buy the licence',
  messageTitle: 'Subscription',
};

const ar: BillingStrings = {
  subscription: 'الاشتراك',
  licence: 'الرخصة',
  licencePay: 'دفع الرخصة',
  dotLabel: 'تذكير بالاشتراك',
  status: {
    trial: 'الأسبوع المجاني: بقي {n} يوم.',
    grace: 'انتهى الاشتراك. لا شيء محظور لمدة {n} يوم آخر.',
    paused: 'انتهى الاشتراك: كل شيء متوقف ما عدا كلام الطفل (بقي {n} يوم قبل تجميد اللوح).',
    frozen: 'انتهى الاشتراك: اللوح مجمّد. ما زال الطفل يتكلّم.',
    paid: 'الاشتراك فعّال. يتجدّد في {date}.',
    paidEnds: 'الاشتراك فعّال حتى {date} (من دون تجديد).',
    free: 'لا شيء للدفع حاليًا.',
  },
  childStillTalks: 'يستطيع الطفل دائمًا أن يتكلّم بلوحه، حتى من دون اشتراك.',
  pausedMeans: 'متوقف: لا كلمات جديدة ولا تغييرات، ولا مزامنة ولا متابعة ولا فريق ولا نسخ. لا يُحذف شيء: يعود كل شيء فور الاشتراك.',
  frozenMeans: 'مجمّد: يبقى اللوح كما هو وما زال يتكلّم. لا يُحذف شيء: يعود كل شيء فور الاشتراك.',
  notPayer: 'الوالد الذي يملك حساب الطفل هو من يستطيع الاشتراك، من «حسابي».',
  notPayerTablet: 'يستطيع أحد الوالدين الاشتراك من جهازه الخاص («حسابي»).',
  plansTitle: 'اختر اشتراكًا',
  monthly: 'شهري',
  yearly: 'سنوي',
  perMonth: '{price} في الشهر',
  perYear: '{price} في السنة',
  once: '{price}، مرة واحدة',
  subscribe: 'اشترك',
  restore: 'استعادة المشتريات',
  manage: 'إدارة الاشتراك',
  later: 'لاحقًا',
  myAccount: 'حسابي',
  renewsNote: 'يتجدّد الاشتراك تلقائيًا بالسعر نفسه ما لم يُلغَ قبل 24 ساعة على الأقل من نهاية المدة. تتم إدارته وإلغاؤه من إعدادات المتجر.',
  terms: 'شروط الاستخدام',
  privacy: 'سياسة الخصوصية',
  storesOnly: 'يتم الاشتراك في تطبيق Daleth AAC على iPhone أو iPad أو Android (App Store، Google Play).',
  noPlans: 'المتجر لا يجيب الآن. حاول بعد قليل.',
  bought: 'شكرًا! الاشتراك فعّال.',
  pending: 'المتجر ينتظر تأكيد الدفع. يبدأ الاشتراك فور وصوله.',
  restored: 'تم التحقق من المشتريات.',
  storeError: 'لم تتم عملية الشراء. لم يُدفع شيء. حاول بعد قليل.',
  checking: 'جارٍ التحقق…',
  licenceIntro: 'رخصة مهنية تُدفع مرة واحدة، تتيح الانضمام إلى فرق الأطفال كمعالج(ة) نطق أو كمعلّم(ة).',
  licenceOwned: 'رخصتك فعّالة.',
  buyLicence: 'شراء الرخصة',
  messageTitle: 'الاشتراك',
};

const ALL: Record<UiLang, BillingStrings> = { fr, en, ar };
export const billingStrings = (l: UiLang): BillingStrings => ALL[l] ?? fr;
