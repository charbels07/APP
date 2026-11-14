/**
 * The e-mail a parent sends to someone they invite. The app has no mail service of its own for
 * invitations: this opens the person's own mail app with the message already written (they press
 * "send"). An address that is not a plain e-mail address is left out, never put in the link.
 */
const PLAIN_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function inviteMailLink(to: string | undefined, subject: string, body: string): string {
  const address = to && PLAIN_ADDRESS.test(to.trim()) ? to.trim() : '';
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
