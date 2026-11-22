/**
 * People and rights (gap review, batch 4): the second parent, handing a child over, leaving a
 * team, asking again, renaming a child, deleting an account that owns a child's profile.
 */
import type { UiLang } from '../model/types';

const fr = {
  actsAsParent: 'Agit comme parent',
  actsAsParentNote: 'Tous les droits de la famille, le code accompagnant compris. Vous seul pouvez les donner ou les retirer.',
  waiting: 'En attente d’un compte professionnel vérifié',
  waitingNote:
    'Les thérapeutes et les enseignants ouvrent le tableau avec un compte professionnel vérifié par notre équipe. En attendant, vous pouvez lui donner un autre rôle.',
  proInvite: 'Cette personne ouvrira le tableau avec un compte professionnel, vérifié par notre équipe.',
  handOver: (child: string, name: string) => `Confier ${child} à ${name}`,
  handOverNote: (name: string) => `${name} devient le parent responsable du profil, après avoir accepté. Vous restez dans l’équipe comme parent.`,
  handOverSent: (name: string) => `Proposition envoyée : ${name} doit l’accepter.`,
  leave: 'Quitter l’équipe',
  leaveNote: (child: string) => `Vous n’aurez plus accès au tableau de ${child}. La famille pourra vous inviter à nouveau.`,
  leaveConfirm: 'Confirmer : quitter l’équipe',
  declined: 'Refusée',
  askAgain: 'Redemander',
  askedAgain: 'Demande envoyée à nouveau.',
  nameAge: 'Prénom et âge',
  childName: 'Prénom',
  childAge: 'Âge (facultatif)',
  saved: 'Enregistré.',
  offer: (from: string, child: string) => `${from} vous propose de devenir le parent responsable du profil de ${child}.`,
  offerAccept: 'Accepter',
  offerDecline: 'Refuser',
  deleteWho: 'Supprimer votre compte efface aussi le tableau de ces enfants :',
  profileLine: (name: string, people: string[], tablets: number) =>
    [name, people.length ? `${people.join(', ')} le perdront aussi` : '', tablets ? `${tablets} tablette${tablets > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · '),
  inBin: (name: string) => `${name} (dans la corbeille)`,
  handFirst: (name: string) => `Le confier d’abord à ${name}`,
  offered: (name: string) => `En attente de la réponse de ${name}`,
  noParent: 'Pour confier un enfant à l’autre parent : dans Équipe, ouvrez cette personne et activez « Agit comme parent ».',
  eraseTick: (name: string) => `Effacer le tableau de ${name}`,
  twoStepCode: 'Code de l’application d’authentification',
  loadFailed: 'Impossible de charger les invitations. Vérifiez la connexion.',
  retry: 'Réessayer',
  proOffline: 'Pas de connexion : votre compte ne peut pas être vérifié pour le moment.',
};

type Dict = typeof fr;

const en: Dict = {
  actsAsParent: 'Acts as a parent',
  actsAsParentNote: 'Every right of the family, the caregiver code included. Only you can give or take them.',
  waiting: 'Waiting for a checked professional account',
  waitingNote: 'Therapists and teachers open the board with a professional account checked by our team. Meanwhile, you can give this person another role.',
  proInvite: 'This person will open the board with a professional account, checked by our team.',
  handOver: (child, name) => `Hand ${child} to ${name}`,
  handOverNote: (name) => `${name} becomes the parent in charge of the profile, once they accept. You stay on the team as a parent.`,
  handOverSent: (name) => `Offer sent: ${name} has to accept it.`,
  leave: 'Leave the team',
  leaveNote: (child) => `You will no longer have access to ${child}’s board. The family can invite you again.`,
  leaveConfirm: 'Confirm: leave the team',
  declined: 'Declined',
  askAgain: 'Ask again',
  askedAgain: 'Request sent again.',
  nameAge: 'Name and age',
  childName: 'First name',
  childAge: 'Age (optional)',
  saved: 'Saved.',
  offer: (from, child) => `${from} asks you to become the parent in charge of ${child}’s profile.`,
  offerAccept: 'Accept',
  offerDecline: 'Decline',
  deleteWho: 'Deleting your account also erases these children’s boards:',
  profileLine: (name, people, tablets) =>
    [name, people.length ? `${people.join(', ')} will lose it too` : '', tablets ? `${tablets} tablet${tablets > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · '),
  inBin: (name) => `${name} (in the bin)`,
  handFirst: (name) => `Hand it to ${name} first`,
  offered: (name) => `Waiting for ${name}’s answer`,
  noParent: 'To hand a child to the other parent: in Team, open that person and turn on “Acts as a parent”.',
  eraseTick: (name) => `Erase ${name}’s board`,
  twoStepCode: 'Code from the authenticator app',
  loadFailed: 'The invitations could not be loaded. Check the connection.',
  retry: 'Try again',
  proOffline: 'No connection: your account cannot be checked right now.',
};

const ar: Dict = {
  actsAsParent: 'يتصرف كوليّ أمر',
  actsAsParentNote: 'كل صلاحيات العائلة، ومنها رمز المرافق. أنت وحدك تمنحها أو تسحبها.',
  waiting: 'بانتظار حساب مهني موثَّق',
  waitingNote: 'يفتح المعالجون والمعلمون اللوحة بحساب مهني تتحقق منه فرقتنا. في الانتظار، يمكنك إعطاء هذا الشخص دورًا آخر.',
  proInvite: 'سيفتح هذا الشخص اللوحة بحساب مهني تتحقق منه فرقتنا.',
  handOver: (child, name) => `تسليم ${child} إلى ${name}`,
  handOverNote: (name) => `يصبح ${name} وليّ الأمر المسؤول عن الملف بعد قبوله. تبقى في الفريق كوليّ أمر.`,
  handOverSent: (name) => `أُرسل الاقتراح: على ${name} قبوله.`,
  leave: 'مغادرة الفريق',
  leaveNote: (child) => `لن تتمكن بعد الآن من فتح لوحة ${child}. يمكن للعائلة دعوتك من جديد.`,
  leaveConfirm: 'تأكيد: مغادرة الفريق',
  declined: 'مرفوض',
  askAgain: 'إعادة الطلب',
  askedAgain: 'أُرسل الطلب من جديد.',
  nameAge: 'الاسم والعمر',
  childName: 'الاسم',
  childAge: 'العمر (اختياري)',
  saved: 'تم الحفظ.',
  offer: (from, child) => `${from} يقترح عليك أن تصبح وليّ الأمر المسؤول عن ملف ${child}.`,
  offerAccept: 'قبول',
  offerDecline: 'رفض',
  deleteWho: 'حذف حسابك يمسح أيضًا لوحات هؤلاء الأطفال:',
  profileLine: (name, people, tablets) =>
    [name, people.length ? `سيفقدها أيضًا: ${people.join('، ')}` : '', tablets ? `${tablets} جهاز لوحي` : ''].filter(Boolean).join(' · '),
  inBin: (name) => `${name} (في سلة المحذوفات)`,
  handFirst: (name) => `تسليمه أولًا إلى ${name}`,
  offered: (name) => `بانتظار رد ${name}`,
  noParent: 'لتسليم طفل إلى وليّ الأمر الآخر: في الفريق، افتح هذا الشخص وفعّل «يتصرف كوليّ أمر».',
  eraseTick: (name) => `مسح لوحة ${name}`,
  twoStepCode: 'رمز تطبيق المصادقة',
  loadFailed: 'تعذّر تحميل الدعوات. تحقق من الاتصال.',
  retry: 'إعادة المحاولة',
  proOffline: 'لا اتصال: لا يمكن التحقق من حسابك الآن.',
};

const DICTS: Record<UiLang, Dict> = { fr, en, ar };
export type PeopleStrings = Dict;
export const peopleStrings = (l: UiLang): Dict => DICTS[l];
