/**
 * What the Settings pages show on a child's board opened by a professional (Team, Follow-up,
 * Account), and the card that hands a profile created by a professional over to the parents.
 */
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { serverMode } from '../../backend';
import type { Invitation, Membership } from '../../backend/types';
import { APP_NAME, errorText } from '../../i18n/account';
import { onboardingStrings } from '../../i18n/onboarding';
import { proStrings, type ProStrings } from '../../i18n/pro';
import { settingsStrings } from '../../i18n/settings';
import { MailChoice } from '../MailChoice';
import { preset } from '../../lib/permissions';
import type { Profile } from '../../model/types';
import type { ProBoardCtx } from '../../state/BoardContext';
import { useSession } from '../../state/Session';
import { Btn, Field, Section } from '../common';
import { DataDashboard } from '../data/DataDashboard';
import { MyAccount, Preferences } from '../settings/AccountTab';
import { Note, ss } from '../settings/SettingsScreen';
import { Row } from '../settings/TeamTab';
import { C } from '../theme';

/**
 * The code that hands a profile over to the child's parents. It is an invitation with the role
 * "parent", written by the professional who owns the profile: the server makes the parent who
 * uses it the owner, and keeps the professional in the team.
 */
export function ParentsCard({ profileId, p }: { profileId: string; p: ProStrings }) {
  const { api, s, uiLang } = useSession();
  const x = settingsStrings(uiLang);
  const first = onboardingStrings(uiLang).childTitle;
  const [inv, setInv] = useState<Invitation | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The parents' address, if the professional has it: the message is then addressed to them, and
  // the invitation also shows by itself in the account they create with that address.
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  // "Send by email" first asks which mail service to use.
  const [mailOpen, setMailOpen] = useState(false);
  useEffect(() => {
    api
      .profileInvitations(profileId)
      .then((l) => {
        const found = l.find((i) => i.direction === 'invite' && i.role === 'parent' && i.status === 'pending') ?? null;
        setInv(found);
        if (found?.email) setEmail(found.email);
      })
      .catch(() => setInv(null));
  }, [api, profileId]);
  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      // A new code replaces the one given before.
      if (inv) await api.cancelInvitation(inv.id);
      setInv(await api.invite(profileId, { email: email.trim() || undefined, role: 'parent', ...preset('parent') }));
      setCopied(false);
    } catch (e) {
      setError(errorText(s, e));
    }
    setBusy(false);
  };
  const site = Platform.OS === 'web' && serverMode() === 'online' && typeof window !== 'undefined' ? window.location.origin : '';
  const message = inv ? p.parentsMessage(inv.fromName, inv.childName, inv.code, APP_NAME, site, s.roleParent, first, s.haveCode) : '';
  return (
    <View style={ss.card}>
      <Text style={ss.title}>{p.parentsTitle}</Text>
      <Note text={p.parentsIntro} />
      <Field label={p.parentsEmail} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={{ textAlign: 'left' }} />
      {inv ? (
        <>
          <Text style={ss.code} selectable>
            {inv.code}
          </Text>
          {/* The app does not send e-mails itself: the professional picks a mail service, the message opens there ready. */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Btn kind="primary" icon="mail" label={x.inviteByMail} selected={mailOpen} onPress={() => setMailOpen((v) => !v)} />
            <Btn icon="external" label={x.share} onPress={() => void Share.share({ message }).catch(() => {})} />
            <Btn
              icon="clipboard"
              label={copied ? x.copied : x.copy}
              onPress={async () => {
                await Clipboard.setStringAsync(message).catch(() => {});
                setCopied(true);
              }}
            />
          </View>
          {mailOpen && <MailChoice to={email || inv.email} subject={p.parentsSubject(inv.childName, APP_NAME)} body={message} x={x} />}
          {p.parentsSteps(s.roleParent, first, s.haveCode).map((t, i) => (
            <Note key={i} text={`${i + 1}. ${t}`} />
          ))}
          <Note text={p.parentsWarn} />
          <Btn small icon="refresh" label={p.parentsRenew} disabled={busy} onPress={make} style={{ alignSelf: 'flex-start' }} />
        </>
      ) : (
        <Btn kind="primary" icon="users" label={p.parentsMake} disabled={busy || inv === undefined} onPress={make} />
      )}
      {error ? <Text style={{ color: C.help, fontWeight: '600' }}>{error}</Text> : null}
    </View>
  );
}


/** Settings → Team, Follow-up or Account, for a professional on a child's board. */
export function ProSettingsTab({ tab, pro, profile }: { tab: 'team' | 'data' | 'account'; pro: ProBoardCtx; profile: Profile }) {
  const { api, uiLang, account } = useSession();
  const p = proStrings(uiLang);
  const x = settingsStrings(uiLang);
  const own = pro.access.owner;
  const [team, setTeam] = useState<Membership[]>([]);
  useEffect(() => {
    if (tab !== 'team') return;
    api
      .listMembers(pro.profileId)
      .then((m) => setTeam(m.filter((y) => y.status === 'active' && y.role !== 'device')))
      .catch(() => {});
  }, [api, pro.profileId, tab]);

  if (tab === 'team') {
    return (
      <>
        <Text style={[ss.title, { fontSize: 18 }]}>{`${x.teamOf} ${pro.childName}`}</Text>
        {own ? <ParentsCard profileId={pro.profileId} p={p} /> : <Note text={x.notManager} />}
        <Section title={x.people}>
          <Row icon="heart" title={own ? p.youOwner : x.ownerRole} sub={own ? undefined : x.ownerRole} />
          {team.map((m) => (
            <Row
              key={m.userId}
              icon="user"
              title={m.userId === account?.id ? `${m.displayName} (${x.you})` : m.displayName}
              sub={`${x.roles[m.role]} · ${x.levels[m.level]}`}
            />
          ))}
        </Section>
      </>
    );
  }
  if (tab === 'data') {
    // The page itself says so when the family has not allowed this person to see the follow-up.
    return (
      <>
        {own && <Note text={p.ownerNoData} />}
        <DataDashboard profileId={pro.profileId} childName={pro.childName} profile={profile} manager={false} />
      </>
    );
  }
  return (
    <>
      <MyAccount x={x} />
      <Preferences x={x} />
      <Note text={p.accountElsewhere(p.nav.account)} />
    </>
  );
}
