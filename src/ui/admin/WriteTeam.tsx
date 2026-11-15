/**
 * "Help us improve Empower": on the account page of a parent and of a professional.
 * One question ("what would make Empower more useful for you?"), seven answers:
 *  - six subjects to write about (a new feature, missing vocabulary, a pictogram, a language or
 *    dialect, an accessibility difficulty, a technical problem): a message for the app's team;
 *  - or voting for the ideas the team is thinking about.
 * What is written is read in the back office (Requests, and Bugs for the problems). It is sent
 * on purpose by an adult: it does not depend on "Help improve the app", which is about figures
 * the app counts by itself.
 * For a member of the app's team, also the way back to the back office.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedbackKind, RoadmapItem } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { adminStrings } from '../../i18n/admin';
import { productStrings } from '../../i18n/product';
import { APP_VERSION } from '../../lib/appVersion';
import { useSession } from '../../state/Session';
import { checked, pressed } from '../a11y';
import { Btn, Field, Section, useNavRtl } from '../common';
import { Icon } from '../Icon';
import { Note } from '../settings/SettingsScreen';
import { ErrorText } from '../start/StartLayout';
import { C, radius } from '../theme';

type Choice = Exclude<FeedbackKind, 'other'> | 'vote';
const CHOICES: Choice[] = ['feature', 'vocabulary', 'pictogram', 'language', 'access', 'problem', 'vote'];

export function WriteTeam() {
  const { api, uiLang, s, isAdmin, go } = useSession();
  const a = adminStrings(uiLang);
  const x = productStrings(uiLang);
  const rtl = useNavRtl();
  const [choice, setChoice] = useState<Choice>('feature');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<RoadmapItem[] | null>(null);

  const loadIdeas = useCallback(() => {
    api.roadmapList().then(setIdeas, () => setIdeas([]));
  }, [api]);
  useEffect(() => {
    if (choice === 'vote' && !ideas) loadIdeas();
  }, [choice, ideas, loadIdeas]);

  const send = async () => {
    if (choice === 'vote') return;
    setBusy(true);
    setError(null);
    try {
      await api.sendFeedback({ kind: choice, text: text.trim(), platform: Platform.OS, appVersion: APP_VERSION });
      setText('');
      setSent(true);
    } catch (e) {
      setError(errorText(s, e));
    } finally {
      setBusy(false);
    }
  };

  const vote = async (item: RoadmapItem) => {
    // Shown at once; put right if the server says no.
    setIdeas((list) => (list ?? []).map((i) => (i.id === item.id ? { ...i, mine: !item.mine, votes: i.votes + (item.mine ? -1 : 1) } : i)));
    try {
      await api.roadmapVote(item.id, !item.mine);
    } catch (e) {
      setError(errorText(s, e));
      loadIdeas();
    }
  };

  return (
    <Section title={x.improveTitle}>
      <Note text={x.improveIntro} />
      <View accessibilityRole="radiogroup" accessibilityLabel={x.improveIntro} style={{ gap: 6 }}>
        {CHOICES.map((k) => {
          const on = k === choice;
          return (
            <Pressable
              key={k}
              onPress={() => {
                setChoice(k);
                setSent(false);
                setError(null);
              }}
              style={({ pressed: down }) => [st.choice, rtl && st.rev, on && st.choiceOn, down && { opacity: 0.7 }]}
              accessibilityRole="radio"
              accessibilityLabel={k === 'vote' ? x.vote : x.kinds[k]}
              {...checked(on)}
            >
              <View style={[st.radio, on && st.radioOn]}>{on && <View style={st.dot} />}</View>
              <Text style={[st.choiceText, rtl && st.right]}>{k === 'vote' ? x.vote : x.kinds[k]}</Text>
            </Pressable>
          );
        })}
      </View>

      {choice === 'vote' ? (
        <View style={{ gap: 8 }}>
          <Note text={x.voteIntro} />
          {ideas && ideas.length === 0 && <Note text={x.noIdeas} />}
          {(ideas ?? []).map((i) => {
            const title = i.title[uiLang] || i.title.en || i.title.fr || i.title.ar;
            return (
              <Pressable
                key={i.id}
                onPress={() => void vote(i)}
                style={({ pressed: down }) => [st.idea, rtl && st.rev, i.mine && st.ideaOn, down && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${x.votes(i.votes)}, ${i.mine ? x.voted : x.voteFor}`}
                {...pressed(i.mine)}
              >
                <Icon name={i.mine ? 'check' : 'plus'} size={20} color={i.mine ? C.success : C.accent} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[st.ideaTitle, rtl && st.right]}>{title}</Text>
                  <Text style={[st.ideaSub, rtl && st.right]}>
                    {[x.votes(i.votes), i.status === 'planned' ? x.planned : '', i.mine ? x.voted : ''].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          <ErrorText text={error} />
        </View>
      ) : (
        <>
          <Field
            value={text}
            onChangeText={(t) => {
              setText(t);
              setSent(false);
            }}
            placeholder={x.placeholder}
            accessibilityLabel={x.placeholder}
            multiline
            maxLength={4000}
            style={{ minHeight: 96 }}
          />
          <Note text={x.sendNote} />
          <ErrorText text={error} />
          {sent && <Text style={{ color: C.success, fontWeight: '700' }}>{x.sent}</Text>}
          <Btn small kind="primary" icon="mail" label={x.send} disabled={busy || text.trim().length < 3} onPress={() => void send()} />
        </>
      )}
      {isAdmin && <Btn small icon="shield" label={a.entry} onPress={() => go({ name: 'admin' })} />}
    </Section>
  );
}

const st = StyleSheet.create({
  rev: { flexDirection: 'row-reverse' },
  right: { textAlign: 'right', writingDirection: 'rtl' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  choiceOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.inputBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  radioOn: { borderColor: C.accent },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.accent },
  choiceText: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text },
  idea: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  ideaOn: { borderColor: C.success, backgroundColor: C.successSoft },
  ideaTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  ideaSub: { fontSize: 13, color: C.textMuted },
});
