/**
 * The e-mail a parent or a professional sends to someone they invite. The app has no mail service
 * of its own for invitations: the person chooses their mail service (Gmail, Outlook, Yahoo, or the
 * mail app of the device) and a new message opens there, already written; they press "send".
 * An address that is not a plain e-mail address is left out, never put in a link.
 */
const PLAIN_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const plainAddress = (to: string | undefined) => (to && PLAIN_ADDRESS.test(to.trim()) ? to.trim() : '');

/** The mail app of the device (a `mailto:` link). */
export function inviteMailLink(to: string | undefined, subject: string, body: string): string {
  return `mailto:${plainAddress(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type MailService = 'gmail' | 'outlook' | 'yahoo' | 'device';
/** In the order they are offered. */
export const MAIL_SERVICES: readonly MailService[] = ['gmail', 'outlook', 'yahoo', 'device'];

export interface MailLinks {
  /** The service's own app on a tablet or phone, tried first there (absent: no such app link). */
  app?: string;
  /** The service's "new message" page in a browser, or the `mailto:` link. Always works as a fallback. */
  web: string;
}

/**
 * Where a new message, already written, opens for each service. Only these fixed addresses are
 * ever opened; the address, the subject and the text are written into them encoded.
 */
export function mailLinks(service: MailService, to: string | undefined, subject: string, body: string): MailLinks {
  const q = (names: [string, string, string]) =>
    `${names[0]}=${encodeURIComponent(plainAddress(to))}&${names[1]}=${encodeURIComponent(subject)}&${names[2]}=${encodeURIComponent(body)}`;
  switch (service) {
    case 'gmail':
      return {
        app: `googlegmail://co?${q(['to', 'subject', 'body'])}`,
        web: `https://mail.google.com/mail/?view=cm&fs=1&${q(['to', 'su', 'body'])}`,
      };
    case 'outlook':
      return {
        app: `ms-outlook://compose?${q(['to', 'subject', 'body'])}`,
        web: `https://outlook.live.com/mail/0/deeplink/compose?${q(['to', 'subject', 'body'])}`,
      };
    case 'yahoo':
      return {
        app: `ymail://mail/compose?${q(['to', 'subject', 'body'])}`,
        web: `https://compose.mail.yahoo.com/?${q(['to', 'subject', 'body'])}`,
      };
    default:
      return { web: inviteMailLink(to, subject, body) };
  }
}
