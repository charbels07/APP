/**
 * Notices are written by the server in one language; the app shows them in the language of the
 * menus (src/lib/notices.ts). These are the sentences the server writes today (supabase/migrations
 * and the demo server): each one must be recognised.
 */
import fs from 'fs';
import path from 'path';
import { NOTICE_TEMPLATES, noticeText } from '../lib/notices';

describe('notices in the language of the menus', () => {
  it('a notice written in French is read in English or Arabic, names kept', () => {
    expect(noticeText('Votre certificat a été accepté : vous pouvez maintenant rejoindre l’équipe d’un enfant.', 'en')).toBe(
      'Your certificate was accepted: you can now join a child’s team.',
    );
    // The database writes straight apostrophes.
    expect(noticeText("Votre certificat a été accepté : vous pouvez maintenant rejoindre l'équipe d'un enfant.", 'ar')).toBe('تم قبول شهادتك: يمكنك الآن الانضمام إلى فريق طفل.');
    expect(noticeText("Rita vous invite à rejoindre l'équipe de Adam.", 'en')).toBe('Rita invites you to join Adam’s team.');
    expect(noticeText("Rappel : Rita vous invite à rejoindre l'équipe de Adam.", 'en')).toBe('Reminder: Rita invites you to join Adam’s team.');
    expect(noticeText('Sarah K. a partagé « Dentiste » avec vous.', 'en')).toBe('Sarah K. shared “Dentiste” with you.');
    expect(noticeText('Sarah propose : Ajouter pizza', 'ar')).toBe('Sarah يقترح: Ajouter pizza');
    expect(noticeText('Votre demande pour Adam a été acceptée.', 'en')).toBe('Your request for Adam was accepted.');
    expect(noticeText('Vérification : il nous manque une information. Le diplôme est illisible.', 'en')).toBe('Verification: we need one more thing. Le diplôme est illisible.');
  });
  it('a notice written in English or Arabic is read in French too', () => {
    expect(noticeText("Eve is now the parent in charge of Adam's profile. You stay on the team.", 'fr')).toBe(
      'Eve est maintenant le parent responsable du profil de Adam. Vous restez dans son équipe.',
    );
    expect(noticeText('A device was just linked (Tablette école, full access). If it was not you: Settings → Account → Devices → Remove.', 'fr')).toBe(
      'Un appareil vient d’être relié (Tablette école, accès complet). Si ce n’est pas vous : Réglages → Compte → Appareils → Retirer.',
    );
    expect(noticeText('تم قبول شهادتك: يمكنك الآن الانضمام إلى فريق طفل.', 'fr')).toBe(
      'Votre certificat a été accepté : vous pouvez maintenant rejoindre l’équipe d’un enfant.',
    );
  });
  it('an unknown sentence is shown as it was written', () => {
    expect(noticeText('Bienvenue !', 'en')).toBe('Bienvenue !');
    expect(noticeText('', 'en')).toBe('');
  });
  it('every sentence the server writes is known to the app', () => {
    // French sentences inside notify(…) calls of the migrations, with their SQL joints removed.
    const dir = path.join(__dirname, '../../supabase/migrations');
    const sql = fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const samples = [
      "Vos droits sur le profil de Adam ont changé.",
      "Votre accès au profil de Adam a été retiré.",
      "Rita vous invite à rejoindre l'équipe de Adam.",
      "Votre demande pour Adam a été refusée.",
      "Sarah a accepté l'invitation pour Adam.",
      "Sarah a refusé l'invitation pour Adam.",
      "Sarah a rejoint l'équipe de Adam.",
      "Marc demande à rejoindre l'équipe de Adam.",
      'Sarah a révisé : Ajouter pizza',
      'Proposition acceptée : Ajouter pizza',
      'Proposition refusée : Ajouter pizza',
      'Révision demandée : Ajouter pizza',
      'Sarah a partagé « Dentiste ».',
      "Votre demande de vérification n'a pas été acceptée. Licence expirée.",
      "Un appareil vient d'être relié (iPad). Si ce n'est pas vous : Réglages → Compte → Appareils → Retirer.",
    ];
    for (const sample of samples) expect(noticeText(sample, 'en')).not.toBe(sample);
    // The fixed parts of those sentences really are in the database files (so this list stays honest).
    for (const part of ['ont changé.', 'a été retiré.', 'vous invite à rejoindre', 'demande à rejoindre', ' a révisé : ', 'Proposition acceptée : ', ' a partagé « ', 'est maintenant le parent responsable']) {
      expect(sql).toContain(part);
    }
    expect(NOTICE_TEMPLATES.every((t) => t.fr && t.en && t.ar)).toBe(true);
  });
});
