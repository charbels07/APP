/**
 * Professional verification in four steps (progress bar 1/4 … 4/4):
 *  1. the practice (name, country, profession, workplace);
 *  2. a licence or diploma;
 *  3. an identity document;
 *  4. the status (under review / verified / more information / not approved).
 * The decision is made by the review team (back-office); the demo can simulate it.
 * Documents go to a private storage folder only their owner (and the review team) can read.
 */
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { Verification as V, VerificationDoc, VerificationStatus } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { proStrings } from '../../i18n/pro';
import { useSession } from '../../state/Session';
import { Btn, Field } from '../common';
import { Icon } from '../Icon';
import { ErrorText, StartLayout, T, st, useRtl } from '../start/StartLayout';
import { C } from '../theme';

type Draft = Omit<V, 'userId' | 'status' | 'submittedAt' | 'decidedAt'>;
const PROFESSIONS = ['slp', 'ot', 'psychomotor', 'psychologist', 'teacher', 'educator', 'behaviour', 'other'];

export function Verification({ initial, onExplore }: { initial: V | null; onExplore: () => void }) {
  const { api, uiLang, s, account, signOut } = useSession();
  const p = proStrings(uiLang);
  const rtl = useRtl();
  const [v, setV] = useState<V | null>(initial);
  const [d, setD] = useState<Draft>({
    fullName: initial?.fullName ?? account?.displayName ?? '',
    country: initial?.country ?? '',
    profession: initial?.profession ?? 'slp',
    organization: initial?.organization,
    documents: initial?.documents ?? [],
  });
  const editable = !v || v.status === 'draft' || v.status === 'more_info';
  const [step, setStep] = useState(editable ? 1 : 4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [step]);

  const save = async (next: Draft) => {
    setD(next);
    setV(await api.saveVerification(next));
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(s, e));
    } finally {
      setBusy(false);
    }
  };
  const addDoc = (kind: VerificationDoc['kind']) =>
    run(async () => {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.length) return;
      const a = r.assets[0];
      const ref = await api.uploadVerificationDocument({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? undefined });
      await save({ ...d, documents: [...d.documents, { name: a.name, kind, uploadedAt: Date.now(), ref }] });
    });

  const docs = (kinds: VerificationDoc['kind'][]) => (
    <View style={{ gap: 8 }}>
      {d.documents
        .filter((x) => kinds.includes(x.kind))
        .map((x) => (
          <View key={x.ref} style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: C.surfaceAlt }}>
            <Icon name="check" size={18} color={C.success} />
            <T style={{ flex: 1 }}>{`${p.docKinds[x.kind]} · ${x.name}`}</T>
            {editable && <Btn small kind="ghost" label={p.remove} onPress={() => run(() => save({ ...d, documents: d.documents.filter((y) => y.ref !== x.ref) }))} />}
          </View>
        ))}
    </View>
  );

  const progress = (
    <View style={{ gap: 6 }}>
      <T style={{ fontSize: 13, fontWeight: '800', color: C.textMuted }}>{`${p.verifyTitle.toUpperCase()} · ${p.step} ${step} ${p.of} 4`}</T>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.surfaceAlt }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: C.accent, width: `${step * 25}%` }} />
      </View>
    </View>
  );
  const footer = (canGo: boolean, onNext: () => void) => (
    <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 10 }}>
      <Btn label={p.back} style={{ flex: 1 }} onPress={() => (step === 1 ? signOut() : setStep(step - 1))} />
      <Btn kind="primary" label={p.next} style={{ flex: 2 }} disabled={!canGo || busy} onPress={onNext} />
    </View>
  );

  if (step === 1) {
    return (
      <StartLayout onBack={signOut}>
        {progress}
        <T style={st.title}>{p.s1Title}</T>
        <T style={st.muted}>{p.verifyIntro}</T>
        <Field label={p.fullName} value={d.fullName} onChangeText={(fullName) => setD({ ...d, fullName })} autoComplete="name" />
        <Field label={p.country} value={d.country} onChangeText={(country) => setD({ ...d, country })} />
        <T style={{ fontSize: 13, color: C.textMuted, fontWeight: '600' }}>{p.profession}</T>
        <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
          {PROFESSIONS.map((k) => (
            <Btn key={k} small kind={d.profession === k ? 'primary' : 'secondary'} label={p.professions[k]} onPress={() => setD({ ...d, profession: k })} />
          ))}
        </View>
        <Field label={p.organization} value={d.organization ?? ''} onChangeText={(organization) => setD({ ...d, organization: organization || undefined })} />
        <T style={{ fontSize: 13, color: C.textMuted }}>{p.orgNote}</T>
        <ErrorText text={error} />
        {footer(!!d.fullName.trim() && !!d.country.trim(), () => run(async () => {
          await save(d);
          setStep(2);
        }))}
      </StartLayout>
    );
  }
  if (step === 2 || step === 3) {
    // One "Add a document" button per step. Step 2 takes a licence or a diploma, whichever the
    // person has: it is stored as one kind ("licence"); a request made before may still hold a "diploma".
    const kinds: VerificationDoc['kind'][] = step === 2 ? ['licence', 'diploma'] : ['id'];
    const kind: VerificationDoc['kind'] = step === 2 ? 'licence' : 'id';
    const has = d.documents.some((x) => kinds.includes(x.kind));
    return (
      <StartLayout onBack={() => setStep(step - 1)}>
        {progress}
        <T style={st.title}>{step === 2 ? p.s2Title : p.s3Title}</T>
        <T style={st.muted}>{step === 2 ? p.s2Intro : p.s3Intro}</T>
        {docs(kinds)}
        <Btn icon="plus" label={p.addFile} onPress={() => addDoc(kind)} disabled={busy} />
        <ErrorText text={error} />
        {footer(has, () => setStep(step + 1))}
      </StartLayout>
    );
  }

  // Step 4: status
  const status: VerificationStatus = v?.status ?? 'draft';
  const color = status === 'verified' ? C.success : status === 'rejected' ? C.help : status === 'draft' ? C.textMuted : C.edit;
  return (
    <StartLayout onBack={editable ? () => setStep(3) : undefined}>
      {progress}
      <T style={st.title}>{p.s4Title}</T>
      <View style={{ gap: 6, padding: 16, borderRadius: 14, borderWidth: 2, borderColor: color }}>
        <T style={{ fontSize: 20, fontWeight: '800', color }}>{p.status[status]}</T>
        <T>{p.statusNotes[status]}</T>
        {v?.note ? <T style={{ color: C.textMuted }}>{v.note}</T> : null}
      </View>
      <ErrorText text={error} />
      {status === 'draft' && <Btn kind="primary" icon="shield" label={p.submit} disabled={busy} onPress={() => run(async () => setV(await api.submitVerification()))} />}
      {status === 'more_info' && (
        <>
          <Btn icon="pencil" label={p.editRequest} onPress={() => setStep(1)} />
          <Btn kind="primary" icon="shield" label={p.submit} disabled={busy} onPress={() => run(async () => setV(await api.submitVerification()))} />
        </>
      )}
      {status !== 'draft' && <Btn kind="primary" label={p.explore} onPress={onExplore} />}
      {api.demoSetVerificationStatus && status !== 'draft' && (
        <View style={{ gap: 6, padding: 12, borderRadius: 12, backgroundColor: C.editSoft }}>
          <Text style={{ color: C.edit, fontWeight: '700' }}>{p.demoDecision}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(['verified', 'more_info', 'rejected', 'pending'] as VerificationStatus[]).map((k) => (
              <Btn
                key={k}
                small
                label={p.status[k]}
                onPress={() =>
                  run(async () => {
                    await api.demoSetVerificationStatus!(k);
                    setV(await api.getVerification());
                  })
                }
              />
            ))}
          </View>
        </View>
      )}
    </StartLayout>
  );
}
