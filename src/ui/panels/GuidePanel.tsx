import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GUIDE, GUIDE_TRACK_INTRO, type GuideAction, type GuideChapter, type GuideTrack } from '../../data/guide';
import { tailoredChapter } from '../../data/guideTailored';
import { locate } from '../../lib/search';
import type { DemoStep } from '../../model/types';
import { useApp } from '../../state/AppState';
import { Btn, Panel, Segmented, useNavRtl } from '../common';
import { Icon } from '../Icon';
import { C, radius } from '../theme';

/** Chapters that happen in caregiver mode (the code is asked first). */
const NEEDS_CAREGIVER: GuideAction[] = ['settings', 'newTla', 'print'];

/** The example sentence of the "Building a sentence" chapter. */
const EXAMPLE: DemoStep[] = ['i', 'want', 'play'].map((concept) => ({ kind: 'word', concept }));

/** In-app guide, from A to Z, in two tracks (first steps / caregivers & professionals). */
export function GuidePanel() {
  const app = useApp();
  const { t, profile, editMode } = app;
  const ui = profile.settings.uiLang;
  const [track, setTrack] = useState<GuideTrack>(editMode ? 'pro' : 'start');
  // After the set-up journey: "Your board" first (written from this child's settings), open.
  const mine = tailoredChapter(profile);
  const [open, setOpen] = useState<string | null>(mine && !profile.guide?.read?.includes(mine.id) ? mine.id : null);
  const read = profile.guide?.read ?? [];
  const chapters = [...(mine && track === 'start' ? [mine] : []), ...GUIDE.filter((c) => c.track === track)];
  const readHere = chapters.filter((c) => read.includes(c.id)).length;

  // Opening the guide counts as having seen the welcome card.
  useEffect(() => {
    if (!profile.guide?.seen) app.update((d) => void (d.guide = { ...d.guide, seen: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openChapter = (id: string | null) => {
    setOpen(id);
    if (id && !read.includes(id)) app.update((d) => void (d.guide = { ...d.guide, read: [...(d.guide?.read ?? []), id] }));
  };

  const run = (action: GuideAction) => {
    if (NEEDS_CAREGIVER.includes(action) && !editMode) return app.setOverlay({ kind: 'pin' });
    switch (action) {
      case 'demo':
        app.goHome();
        app.playSteps(EXAMPLE, { speakAtEnd: true });
        return;
      case 'folder': {
        const loc = (locate(profile).get('ball') ?? []).find((l) => l.visible);
        return loc ? app.showMeWhere(loc) : app.setOverlay({ kind: 'search' });
      }
      case 'apps':
        app.goHome();
        app.openFolder('apps');
        return;
      case 'timer':
        app.setOverlay(null);
        app.setTimerOpen(true);
        return;
      case 'tla':
        return app.openTla();
      case 'schedule':
        return app.openSchedule();
      case 'newTla':
        app.openTla();
        app.setOverlay({ kind: 'newTla' });
        return;
      case 'caregiver':
        return app.setOverlay(editMode ? null : { kind: 'pin' });
      default:
        // search, keyboard, lang, model, help, settings, print
        return app.setOverlay({ kind: action });
    }
  };

  return (
    <Panel title={t.guideTitle} onClose={() => app.setOverlay(null)}>
      <Segmented
        value={track}
        onChange={(v: GuideTrack) => {
          setTrack(v);
          setOpen(null);
        }}
        options={[
          { value: 'start', label: t.guideStart },
          { value: 'pro', label: t.guidePro },
        ]}
      />
      <Text style={[s.intro, ui === 'ar' && s.textRtl]}>{GUIDE_TRACK_INTRO[track][ui]}</Text>
      <Text style={[s.progress, ui === 'ar' && s.textRtl]}>
        {readHere} / {chapters.length} {t.guideRead}
      </Text>
      {chapters.map((c, i) => (
        <Chapter
          key={c.id}
          chapter={c}
          number={i + 1}
          read={read.includes(c.id)}
          open={open === c.id}
          onToggle={() => openChapter(open === c.id ? null : c.id)}
          onTry={c.action ? () => run(c.action!) : undefined}
          onNext={i < chapters.length - 1 ? () => openChapter(chapters[i + 1].id) : undefined}
          lockedNote={c.action && NEEDS_CAREGIVER.includes(c.action) && !editMode ? t.guideUnlock : undefined}
        />
      ))}
    </Panel>
  );
}

function Chapter({
  chapter,
  number,
  read,
  open,
  onToggle,
  onTry,
  onNext,
  lockedNote,
}: {
  chapter: GuideChapter;
  number: number;
  read: boolean;
  open: boolean;
  onToggle: () => void;
  onTry?: () => void;
  onNext?: () => void;
  lockedNote?: string;
}) {
  const { t, profile } = useApp();
  const ui = profile.settings.uiLang;
  const rtl = useNavRtl();
  const row = rtl ? s.rowRtl : null;
  const right = rtl ? s.textRtl : null;
  return (
    <View style={[s.chapter, open && s.chapterOpen]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={chapter.title[ui]}
        style={({ pressed }) => [s.head, row, pressed && { opacity: 0.7 }]}
      >
        <View style={[s.num, read && s.numRead]}>
          {read ? <Icon name="check" size={16} color="#fff" strokeWidth={3} /> : <Text style={s.numText}>{number}</Text>}
        </View>
        <Icon name={chapter.icon} size={22} color={C.accent} />
        <Text style={[s.title, right]}>{chapter.title[ui]}</Text>
        <Icon name={open ? 'chevronDown' : rtl ? 'chevronLeft' : 'chevronRight'} size={20} color={C.textMuted} />
      </Pressable>
      {open && (
        <View style={s.body}>
          {chapter.steps[ui].map((step, k) => (
            <View key={k} style={[s.step, row]}>
              <Text style={[s.bullet, right]}>{k + 1}.</Text>
              <Text style={[s.stepText, right]}>{step}</Text>
            </View>
          ))}
          {chapter.tip && <Text style={[s.tip, right]}>{chapter.tip[ui]}</Text>}
          {lockedNote && <Text style={[s.tip, right]}>{lockedNote}</Text>}
          <View style={[s.actions, row]}>
            {onTry && (
              <Btn
                kind="primary"
                icon={chapter.action === 'demo' ? 'play' : 'pointer'}
                label={chapter.action === 'demo' ? t.showExample : t.tryIt}
                onPress={onTry}
              />
            )}
            {onNext && <Btn icon={rtl ? 'chevronLeft' : 'chevronRight'} label={t.nextChapter} onPress={onNext} />}
          </View>
        </View>
      )}
    </View>
  );
}

/** Shown once, on the first launch (and once for profiles saved before the guide existed). */
export function WelcomeCard() {
  const app = useApp();
  const { t } = app;
  const rtl = useNavRtl();
  const dismiss = () => app.update((d) => void (d.guide = { ...d.guide, seen: true }));
  return (
    <Panel title={t.welcomeTitle} onClose={dismiss} maxWidth={560}>
      <View style={[s.welcome, rtl && s.rowRtl]}>
        <View style={s.welcomeIcon}>
          <Icon name="book" size={40} color={C.accent} />
        </View>
        <Text style={[s.welcomeText, rtl && s.textRtl]}>{t.welcomeText}</Text>
      </View>
      <View style={[s.actions, rtl && s.rowRtl]}>
        <Btn kind="primary" icon="book" label={t.openGuide} onPress={() => app.setOverlay({ kind: 'guide' })} style={{ flexGrow: 1 }} />
        <Btn label={t.later} onPress={dismiss} />
      </View>
    </Panel>
  );
}

const s = StyleSheet.create({
  intro: { fontSize: 15, color: C.text, lineHeight: 21 },
  rowRtl: { flexDirection: 'row-reverse' },
  textRtl: { textAlign: 'right', writingDirection: 'rtl' },
  progress: { fontSize: 13, color: C.textMuted, fontWeight: '700' },
  chapter: { borderWidth: 1.5, borderColor: C.border, borderRadius: radius.md, backgroundColor: C.surface },
  chapterOpen: { borderColor: C.accent },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, minHeight: 52 },
  num: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numRead: { backgroundColor: '#12B76A' },
  numText: { fontSize: 14, fontWeight: '800', color: C.text },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  body: { paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  step: { flexDirection: 'row', gap: 8 },
  bullet: { width: 20, fontSize: 15, fontWeight: '800', color: C.accent, lineHeight: 22 },
  stepText: { flex: 1, fontSize: 15, color: C.text, lineHeight: 22 },
  tip: { fontSize: 14, color: C.accent, backgroundColor: C.accentSoft, padding: 10, borderRadius: radius.md, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  welcome: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  welcomeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: { flex: 1, fontSize: 16, color: C.text, lineHeight: 23 },
});
