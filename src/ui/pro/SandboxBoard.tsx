/**
 * The real board, outside the child's saved profile, with a banner on top:
 *  - a child's board seen by a professional: changes are a draft, sent as a proposal
 *    (or applied directly where the family gave editing rights);
 *  - a material being made (TLA, schedule) in a sandbox profile;
 *  - the learning center's demonstration board.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Proposal } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { proStrings } from '../../i18n/pro';
import { settingsStrings } from '../../i18n/settings';
import { describeOps } from '../../lib/describeOps';
import { classifyOps } from '../../lib/permissions';
import { applyOps, diffProfiles, invertOps, type Op } from '../../lib/profileDiff';
import { migrate } from '../../lib/storage';
import type { Profile } from '../../model/types';
import { AppProvider, useApp, type Overlay } from '../../state/AppState';
import type { MyAccess } from '../../state/BoardContext';
import { useSession } from '../../state/Session';
import { Btn, Panel, Section } from '../common';
import { Icon, type IconName } from '../Icon';
import { Root } from '../Root';
import { ChangeList } from '../settings/TeamTab';
import { C, radius } from '../theme';

/** Opens a place of the app once the board is shown (edit mode, a TLA, a panel…). */
function StartAt({ edit, view, overlay }: { edit?: boolean; view?: 'tla' | 'schedule'; overlay?: Overlay }) {
  const app = useApp();
  useEffect(() => {
    if (edit) app.setEditMode(true);
    if (view === 'tla') app.openTla();
    if (view === 'schedule') app.openSchedule();
    if (overlay) setTimeout(() => app.setOverlay(overlay), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function Banner({ icon, text, tone = 'accent', children }: { icon: IconName; text: string; tone?: 'accent' | 'edit' | 'success'; children?: React.ReactNode }) {
  const { uiLang } = useSession();
  const color = tone === 'edit' ? C.edit : tone === 'success' ? C.success : C.accent;
  const bg = tone === 'edit' ? C.editSoft : tone === 'success' ? C.successSoft : C.accentSoft;
  return (
    <View style={[s.banner, { backgroundColor: bg, borderColor: color }, uiLang === 'ar' && { flexDirection: 'row-reverse' }]}>
      <Icon name={icon} size={22} color={color} />
      <Text style={[s.bannerText, { color }, uiLang === 'ar' && { textAlign: 'right' }]} numberOfLines={3}>
        {text}
      </Text>
      {children}
    </View>
  );
}

/** Learning center: the full app on a sample profile, nothing saved. */
export function DemoBoard({ start, onClose }: { start?: Overlay | 'edit'; onClose: () => void }) {
  const { uiLang, setUiLang } = useSession();
  const p = proStrings(uiLang);
  const initial = useMemo(() => migrate({}), []);
  return (
    <AppProvider initial={initial} onChange={() => {}} uiLang={uiLang} setUiLang={setUiLang} preview>
      <Root
        banner={
          <Banner icon="book" text={p.demoBanner}>
            <Btn small kind="primary" icon="x" label={p.close} onPress={onClose} />
          </Banner>
        }
      />
      <StartAt edit={start === 'edit'} overlay={start && start !== 'edit' ? start : undefined} />
    </AppProvider>
  );
}

/** A material (TLA, schedule) being made in its sandbox. */
export function MaterialBoard({
  initial,
  view,
  openNew,
  onSave,
  onClose,
}: {
  initial: Profile;
  view: 'tla' | 'schedule';
  openNew?: boolean;
  onSave: (p: Profile) => Promise<void>;
  onClose: () => void;
}) {
  const { uiLang, setUiLang } = useSession();
  const p = proStrings(uiLang);
  const latest = useRef(initial);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <AppProvider initial={initial} onChange={(x) => (latest.current = x)} uiLang={uiLang} setUiLang={setUiLang}>
      <Root
        banner={
          <Banner icon="sparkles" text={msg ?? p.editorBanner}>
            <Btn small label={p.back} onPress={onClose} />
            <Btn
              small
              kind="primary"
              icon="check"
              label={p.saveLib}
              onPress={async () => {
                await onSave(latest.current);
                setMsg(p.savedLib);
              }}
            />
          </Banner>
        }
      />
      <StartAt edit view={view} overlay={openNew ? { kind: view === 'tla' ? 'newTla' : 'scheduleEditor', id: initial.schedules[0]?.id } as Overlay : undefined} />
    </AppProvider>
  );
}

/**
 * A child's board seen by a professional. The board works as usual; changes are kept as a draft
 * and compared with the child's profile. "Send for approval" sorts them with the family's rules:
 * applied directly (editing rights), sent as a proposal, or not allowed.
 */
export function ChildDraftBoard({ profileId, resume, onClose }: { profileId: string; resume?: Proposal; onClose: () => void }) {
  const sess = useSession();
  const { api, uiLang, setUiLang } = sess;
  const p = proStrings(uiLang);
  const [base, setBase] = useState<{ data: Profile; version: number; name: string } | null>(null);
  const [access, setAccess] = useState<MyAccess | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);
  const [key, setKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [r, a] = await Promise.all([api.getProfile(profileId), api.myAccess(profileId)]);
    const data = migrate(r.data);
    setBase({ data, version: r.version, name: r.name });
    setAccess(a);
    setDraft(resume ? applyOps(data, resume.ops, { force: true }).profile : data);
    setKey((k) => k + 1);
  };
  useEffect(() => {
    load().catch((e) => setError(errorText(sess.s, e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const ops = useMemo(() => (base && draft ? diffProfiles(base.data, draft) : []), [base, draft]);
  if (error) {
    return (
      <View style={s.center}>
        <Text style={{ color: C.help, fontSize: 16 }}>{error}</Text>
        <Btn label={p.close} onPress={onClose} />
      </View>
    );
  }
  if (!base || !draft || !access) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }
  const useOnly = access.level < 2;
  return (
    <>
      <AppProvider key={key} initial={draft} onChange={setDraft} uiLang={uiLang} setUiLang={setUiLang}>
        <Root
          banner={
            <Banner icon={useOnly ? 'eye' : 'pencil'} tone={ops.length ? 'edit' : 'accent'} text={useOnly ? p.draftUseOnly : p.draftBanner(ops.length)}>
              {!useOnly && ops.length > 0 && <Btn small label={p.discard} onPress={() => void load()} />}
              {!useOnly && <Btn small kind="primary" icon="mail" label={p.sendForApproval} disabled={!ops.length} onPress={() => setSending(true)} />}
              <Btn small icon="x" label={p.close} onPress={onClose} />
            </Banner>
          }
        />
      </AppProvider>
      {sending && (
        <SendPanel
          profileId={profileId}
          base={base}
          ops={ops}
          access={access}
          resume={resume}
          onClose={() => setSending(false)}
          onSent={async () => {
            setSending(false);
            await load();
          }}
        />
      )}
    </>
  );
}

function SendPanel({
  profileId,
  base,
  ops,
  access,
  resume,
  onClose,
  onSent,
}: {
  profileId: string;
  base: { data: Profile; version: number };
  ops: Op[];
  access: MyAccess;
  resume?: Proposal;
  onClose: () => void;
  onSent: () => void;
}) {
  const { api, uiLang, s: acc } = useSession();
  const p = proStrings(uiLang);
  const x = settingsStrings(uiLang);
  const [title, setTitle] = useState(resume?.title ?? '');
  const [reason, setReason] = useState(resume?.reason ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lang = base.data.settings.lang;
  const groups = useMemo(() => classifyOps(ops, access, base.data), [ops, access, base.data]);
  const after = useMemo(() => applyOps(base.data, ops, { force: true }).profile, [base.data, ops]);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const name = title.trim() || p.untitled;
      if (groups.direct.length) {
        // Editing rights: applied on top of the latest version (someone may have saved meanwhile).
        for (let attempt = 0; attempt < 3; attempt++) {
          const cur = await api.getProfile(profileId);
          const merged = applyOps(migrate(cur.data), groups.direct).profile;
          const r = await api.saveProfile(profileId, merged, cur.version);
          if (r.ok) {
            await api.addHistory({ profileId, summary: name, ops: groups.direct, inverse: invertOps(groups.direct) }).catch(() => {});
            break;
          }
        }
      }
      if (groups.approval.length) {
        const input = { title: name, reason: reason.trim() || undefined, ops: groups.approval, baseVersion: base.version };
        if (resume) await api.updateProposal(resume.id, input);
        else await api.createProposal(profileId, input);
      }
      onSent();
    } catch (e) {
      setError(errorText(acc, e));
      setBusy(false);
    }
  };
  const section = (label: string, list: Op[], icon: IconName) =>
    list.length > 0 && (
      <Section title={label}>
        <ChangeList items={describeOps(list, base.data, uiLang, lang).map((it) => ({ ...it, icon }))} profileBefore={base.data} profileAfter={after} x={x} />
      </Section>
    );
  return (
    <Panel title={p.sendForApproval} onClose={onClose} maxWidth={720}>
      <TextInput value={title} onChangeText={setTitle} placeholder={p.proposalTitle} placeholderTextColor={C.placeholder} style={s.input} accessibilityLabel={p.proposalTitle} />
      <TextInput value={reason} onChangeText={setReason} placeholder={p.proposalReason} placeholderTextColor={C.placeholder} style={[s.input, { minHeight: 70 }]} multiline accessibilityLabel={p.proposalReason} />
      <Text style={{ fontWeight: '800', color: C.text }}>{p.impact}</Text>
      {section(p.direct, groups.direct, 'check')}
      {section(p.needsApproval, groups.approval, 'mail')}
      {section(p.notAllowed, groups.forbidden, 'x')}
      {error ? <Text style={{ color: C.help, fontWeight: '600' }}>{error}</Text> : null}
      <Btn kind="primary" icon="mail" label={p.confirmSend} disabled={busy || !(groups.direct.length + groups.approval.length)} onPress={send} />
    </Panel>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
  },
  bannerText: { flex: 1, fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.bg },
  input: { borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, minHeight: 46, fontSize: 16, color: C.text },
});
