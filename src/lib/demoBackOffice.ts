/**
 * Demonstration of the back office (demo server only): invented professionals waiting for a
 * decision, example messages and example figures. Nothing here is a real person or a real number;
 * the back-office page says so while it shows them.
 */
import type { AdminOverview, Feedback, Verification, VerificationDoc } from '../backend/types';

const HOUR = 3600000;
const DAY = 24 * HOUR;

const doc = (kind: VerificationDoc['kind'], name: string, at: number): VerificationDoc => ({ kind, name, uploadedAt: at, ref: `example:${kind}` });

/** Invented people, so the demonstration has requests to accept or refuse. */
export function exampleRequests(now: number): {
  people: { fullName: string; email: string; createdAt: number; request: Omit<Verification, 'userId'> }[];
  messages: Omit<Feedback, 'id'>[];
} {
  const person = (
    fullName: string,
    email: string,
    country: string,
    profession: string,
    organization: string | undefined,
    status: Verification['status'],
    ago: number,
    docs: VerificationDoc[],
    extra: Partial<Verification> = {},
  ) => ({
    fullName,
    email,
    createdAt: now - ago - 2 * HOUR,
    request: { fullName, country, profession, organization, documents: docs, status, submittedAt: now - ago, ...extra },
  });
  return {
    people: [
      person('Maya Haddad', 'maya.haddad@exemple.test', 'Liban', 'slp', 'Centre Parole, Beyrouth', 'pending', 2 * DAY, [
        doc('licence', 'autorisation-exercice.jpg', now - 2 * DAY),
        doc('id', 'carte-identite.jpg', now - 2 * DAY),
      ]),
      person('Omar Al-Fahad', 'omar.alfahad@exemple.test', 'Arabie saoudite', 'ot', undefined, 'pending', 5 * HOUR, [
        doc('diploma', 'diplome-ergotherapie.jpg', now - 5 * HOUR),
        doc('id', 'passeport.jpg', now - 5 * HOUR),
      ]),
      person('Claire Dubois', 'claire.dubois@exemple.test', 'France', 'psychologist', 'Cabinet libéral', 'more_info', 6 * DAY, [doc('diploma', 'master-psychologie.jpg', now - 6 * DAY)], {
        note: 'La pièce d’identité manque.',
        decidedAt: now - 5 * DAY,
      }),
      person('Lina Mansour', 'lina.mansour@exemple.test', 'Jordanie', 'teacher', 'École Al-Amal, Amman', 'verified', 20 * DAY, [doc('licence', 'carte-enseignante.jpg', now - 20 * DAY)], {
        decidedAt: now - 19 * DAY,
      }),
    ],
    messages: [
      { kind: 'idea', text: 'Ce serait bien d’avoir plus de pictogrammes sur le football et les jeux de ballon.', platform: 'ios', appVersion: '1.0.0', status: 'new', createdAt: now - 3 * HOUR, fromName: 'Parent (exemple)', fromRole: 'parent', fromEmail: 'parent@exemple.test' },
      { kind: 'problem', text: 'La voix se coupe parfois quand la phrase est longue, sur une tablette Android.', platform: 'android', appVersion: '1.0.0', status: 'new', createdAt: now - 1 * DAY, fromName: 'Orthophoniste (exemple)', fromRole: 'pro', fromEmail: 'pro@exemple.test' },
      { kind: 'other', text: 'Merci pour le dialecte jordanien, mon fils reconnaît enfin les mots de la maison.', platform: 'ios', appVersion: '1.0.0', status: 'done', createdAt: now - 4 * DAY, fromName: 'Parent (exemple)', fromRole: 'parent', fromEmail: 'parent2@exemple.test' },
    ],
  };
}

/** A picture that looks like a certificate and says it is an example (never a real document). */
export function exampleDocument(kind: VerificationDoc['kind'], owner: string): string {
  const title = kind === 'id' ? 'IDENTITY DOCUMENT' : kind === 'diploma' ? 'DIPLOMA' : 'LICENCE TO PRACTISE';
  const safe = owner.replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 440">
<rect width="640" height="440" fill="#fffdf6"/>
<rect x="18" y="18" width="604" height="404" fill="none" stroke="#9a7b2f" stroke-width="4"/>
<rect x="30" y="30" width="580" height="380" fill="none" stroke="#9a7b2f" stroke-width="1"/>
<text x="320" y="110" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#3b2f12">${title}</text>
<text x="320" y="190" text-anchor="middle" font-family="Georgia,serif" font-size="28" fill="#1d2939">${safe}</text>
<line x1="170" y1="210" x2="470" y2="210" stroke="#9a7b2f" stroke-width="1"/>
<text x="320" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="46" font-weight="700" fill="#d92d20" opacity="0.55" transform="rotate(-12 320 300)">EXAMPLE · EXEMPLE</text>
<text x="320" y="385" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#667085">Demonstration document, invented person</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const monday = (t: number) => {
  const d = new Date(t);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.getTime();
};
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Example figures with the same shape as the real server's answer. */
export function exampleOverview(now: number): AdminOverview {
  const w0 = monday(now);
  const weeks = Array.from({ length: 12 }, (_, i) => w0 - (11 - i) * 7 * DAY);
  const growth = [6, 9, 8, 14, 17, 15, 22, 27, 25, 34, 41, 38];
  return {
    at: new Date(now).toISOString(),
    example: true,
    accounts: {
      parents: 412,
      pros: 57,
      unconfirmed: 31,
      new7: 43,
      new30: 151,
      languages: { ar: 236, fr: 148, en: 85 },
      weeks: weeks.map((t, i) => ({ week: ymd(t), parents: growth[i], pros: Math.round(growth[i] / 7) })),
    },
    families: {
      parents: 412,
      withChild: 356,
      children: 381,
      withTablet: 298,
      withTeam: 143,
      used7: 244,
      used30: 301,
      edited30: 212,
      collection: { off: 176, usage: 88, vocabulary: 71, language: 46 },
      sharing: 132,
    },
    devices: {
      total: 463,
      seen7: 287,
      seen30: 371,
      waiting: 9,
      platforms: { ios: 318, android: 121, web: 24 },
      versions: { '1.2.0': 301, '1.1.0': 118, '1.0.0': 44 },
    },
    pros: {
      accounts: 57,
      status: { draft: 6, pending: 2, verified: 41, more_info: 1, rejected: 3 },
      professions: { slp: 24, ot: 8, teacher: 7, psychologist: 4, educator: 3, psychomotor: 1 },
      countries: { Liban: 19, 'Arabie saoudite': 11, Jordanie: 6, 'Émirats arabes unis': 5, France: 4, Égypte: 2 },
      hoursToDecide: 21,
      oldestWaitingDays: 2,
      working: 33,
      childrenFollowed: 118,
    },
    teamwork: {
      members: { therapist: 96, teacher: 41, family: 58, caregiver: 22, parent: 37, other: 6 },
      invitations: { accepted: 214, pending: 37, declined: 9, cancelled: 12 },
      requests: { accepted: 61, pending: 8, declined: 5 },
      proposals: { approved: 182, pending: 14, declined: 11, revision: 6, withdrawn: 3 },
      materials: { tla: 141, schedule: 77, firstThen: 39, timer: 18, cards: 52 },
      shares: 203,
      observations: 644,
      changes30: 1870,
    },
    ai: {
      calls30: 936,
      users30: 121,
      mostPerPersonDay: 14,
      days: Array.from({ length: 30 }, (_, i) => {
        const calls = 18 + Math.round(14 * Math.abs(Math.sin(i * 0.9))) + (i % 7 === 5 ? 12 : 0);
        return { day: ymd(now - (29 - i) * DAY), calls, users: Math.max(3, Math.round(calls / 3)) };
      }),
    },
    feedback: { new: 2, total: 3, kinds: { idea: 1, problem: 1, other: 1 } },
    usage: {
      sharing: 132,
      children: 117,
      minimum: 5,
      enough: true,
      days: 90,
      childDays: 5148,
      daysPerWeek: 3.4,
      minutes: 23.6,
      selections: 71.2,
      utterances: 18.4,
      words: 27.3,
      searches: 0.42,
      boardsMade: 96,
      errors: 23,
      offlineShare: 0.18,
      lengths: { one: 51200, two: 29800, more: 13700 },
      places: { core: 201400, folder: 98700, tla: 41200, quick: 12600, schedule: 8900, keyboard: 3700 },
      hours: [0, 0, 0, 0, 0, 120, 2100, 9800, 21400, 26900, 24100, 19800, 22600, 17300, 14200, 18900, 27800, 31200, 29400, 25100, 14800, 5200, 900, 60],
      platforms: { ios: 84, android: 29, web: 4 },
      weeks: weeks.map((t, i) => ({ week: ymd(t), children: 61 + i * 5, minutes: 19 + Math.round(i * 0.45 * 10) / 10, selections: 58 + i * 1.3 })),
      ages: [
        { band: '0-3', children: 14, minutes: 14.2, selections: 38.5, longer: 0.21 },
        { band: '4-6', children: 49, minutes: 22.8, selections: 66.1, longer: 0.39 },
        { band: '7-10', children: 37, minutes: 27.9, selections: 88.4, longer: 0.52 },
        { band: '11-14', children: 12, minutes: 25.1, selections: 79.0, longer: 0.58 },
      ],
    },
    setup: {
      children: 132,
      minimum: 5,
      choices: {
        lang: { ar: 79, fr: 34, en: 19 },
        langs: { 'ar+en': 41, ar: 23, 'ar+fr': 15, 'en+fr': 9, fr: 22, 'ar+en+fr': 14, en: 8 },
        arabic: { lb: 38, sa: 27, jo: 14, gulf: 13, eg: 9, sy: 6, msa: 5, iq: 2, none: 18 },
        uiLang: { ar: 71, fr: 39, en: 22 },
        level: { '1': 44, '2': 53, '3': 35 },
        symbols: { pictos: 121, emoji: 11 },
        visual: { standard: 104, large: 21, contrast: 7 },
        access: { release: 109, press: 9, hold: 14 },
        voice: { 'device/adult': 61, 'f/adult': 22, 'm/adult': 11, 'f/child': 21, 'm/child': 17 },
        grammar: { true: 97, false: 35 },
        quickZone: { true: 88, false: 44 },
        ai: { true: 69, false: 63 },
        weekPlan: { true: 31, false: 101 },
        monthPlan: { true: 12, false: 120 },
        recording: { off: 0, usage: 58, vocabulary: 44, language: 30 },
      },
      averages: { activityBoards: 3.8, ownWords: 11.6, changedWords: 7.2, schedules: 2.1, demonstrations: 0.9 },
    },
  };
}
