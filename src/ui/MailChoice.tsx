/**
 * "Send by email": asks which mail service the person uses, then opens a new message there,
 * already written (address, subject, text). The app itself sends nothing: the person checks the
 * message and presses "send" in their own mailbox.
 */
import React from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import type { SettingsStrings } from '../i18n/settings';
import { MAIL_SERVICES, mailLinks, type MailService } from '../lib/inviteMail';
import { outside } from '../lib/outside';
import { Btn, useNavRtl } from './common';
import { C } from './theme';

/** Opens the new message: the service's app on a tablet or phone when it is installed, its page otherwise. */
export async function openMail(service: MailService, to: string | undefined, subject: string, body: string): Promise<void> {
  // The message is written in another app or tab, and the person comes back to the team's page.
  return outside(() => openMailNow(service, to, subject, body));
}

async function openMailNow(service: MailService, to: string | undefined, subject: string, body: string): Promise<void> {
  const links = mailLinks(service, to, subject, body);
  if (Platform.OS !== 'web' && links.app) {
    try {
      await Linking.openURL(links.app);
      return;
    } catch {
      // The app is not installed: the service's page in the browser.
    }
  }
  await Linking.openURL(links.web).catch(() => {});
}

export function MailChoice({
  to,
  subject,
  body,
  x,
  onSent,
}: {
  to?: string;
  subject: string;
  body: string;
  x: SettingsStrings;
  /** A service was chosen and its new message asked for. */
  onSent?: () => void;
}) {
  const rtl = useNavRtl();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: '700', color: C.text, textAlign: rtl ? 'right' : 'left' }}>{x.mailWith}</Text>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 8, flexWrap: 'wrap' }}>
        {MAIL_SERVICES.map((service) => (
          <Btn
            key={service}
            icon={service === 'device' ? 'mail' : 'external'}
            label={x.mailServices[service]}
            onPress={() => {
              void openMail(service, to, subject, body);
              onSent?.();
            }}
          />
        ))}
      </View>
      <Text style={{ color: C.textMuted, fontSize: 13, textAlign: rtl ? 'right' : 'left' }}>{x.mailOpens}</Text>
    </View>
  );
}
