import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QUICK_ZONE } from '../data/defaults';
import { IN_EMBEDDED_PAGE } from '../lib/appLinks';
import { isRtl, label, symbolOf } from '../lib/lexicon';
import { useApp } from '../state/AppState';
import { Btn } from './common';
import { Icon } from './Icon';
import { CaregiverOverlay } from './panels/CaregiverPanels';
import { HelpPanel, KeyboardPanel, LangPanel, PinPanel, SearchPanel } from './panels/CommPanels';
import { ModelPanel } from './panels/ModelPanel';
import { GuidePanel, WelcomeCard } from './panels/GuidePanel';
import { NewTlaPanel } from './panels/NewTlaPanel';
import { BoardScreen } from './screens/BoardScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { TlaScreen } from './screens/TlaScreen';
import { SentenceStrip } from './SentenceStrip';
import { SymbolView } from './SymbolView';
import { C, radius } from './theme';
import { TimerCard } from './TimerCard';
import { UniversalBar } from './UniversalBar';

/** `banner`: shown above the sentence strip (e.g. the preview's "nothing is saved"). */
export function Root({ banner }: { banner?: React.ReactNode } = {}) {
  const { width, height } = useWindowDimensions();
  const app = useApp();
  const { view, overlay, editMode, t, profile } = app;
  const landscape = width >= height && width >= 700;
  const compact = width < 700 || height < 600;

  const content = (
    <View style={styles.content}>
      {view === 'board' && <BoardScreen />}
      {view === 'tla' && <TlaScreen />}
      {view === 'schedule' && <ScheduleScreen />}
      <TimerCard />
      {overlay?.kind === 'search' && <SearchPanel />}
      {overlay?.kind === 'keyboard' && <KeyboardPanel />}
      {overlay?.kind === 'help' && <HelpPanel />}
      {overlay?.kind === 'lang' && <LangPanel />}
      {overlay?.kind === 'pin' && <PinPanel />}
      {overlay?.kind === 'model' && <ModelPanel />}
      {overlay?.kind === 'newTla' && <NewTlaPanel />}
      {overlay?.kind === 'guide' && <GuidePanel />}
      {!banner && !overlay && !profile.guide?.seen && !editMode && !app.playing && !app.recording && <WelcomeCard />}
      <CaregiverOverlay />
    </View>
  );

  const main = (
    <View style={styles.main}>
      {app.recording && (
        <View style={[styles.banner, styles.recBanner]}>
          <View style={styles.recDot} />
          <Text style={[styles.bannerText, { color: C.help }]} numberOfLines={1}>
            {t.recordingBanner}
          </Text>
          <Btn small label={t.cancel} onPress={() => app.finishRecording(false)} />
          <Btn small kind="primary" icon="check" label={t.saveDemo} onPress={() => app.finishRecording(true)} />
        </View>
      )}
      {app.playing && (
        <View style={[styles.banner, styles.playBanner]}>
          {app.demoCaption?.concept ? (
            <SymbolView symbol={symbolOf(profile, app.demoCaption.concept)} size={34} />
          ) : (
            <Icon name="pointer" size={22} color={C.accent} />
          )}
          <Text style={[styles.bannerText, styles.captionText]} numberOfLines={1}>
            {app.demoCaption?.text ?? t.playingBanner}
          </Text>
          <Btn small kind="primary" icon="pause" label={t.stopDemo} onPress={app.stopPlaying} />
        </View>
      )}
      {app.appLaunch && <AppLaunchBanner />}
      {editMode && app.moveSource && (
        <View style={[styles.banner, styles.playBanner]}>
          <Icon name="target" size={22} color={C.accent} />
          <Text style={[styles.bannerText, { color: C.accent }]} numberOfLines={2}>
            {t.moveBanner}
          </Text>
          <Btn small label={t.cancel} onPress={() => app.setMoveSource(null)} />
        </View>
      )}
      {editMode && (
        <View style={styles.editBanner}>
          <Text style={styles.editText} numberOfLines={1}>
            {t.editBanner}
          </Text>
          <Btn small icon="settings" label={compact ? undefined : t.settings} accessibilityLabel={t.settings} onPress={() => app.setOverlay({ kind: 'settings' })} />
          <Btn small icon="printer" label={compact ? undefined : t.print} accessibilityLabel={t.print} onPress={() => app.setOverlay({ kind: 'print' })} />
          <Btn small kind="primary" icon="check" label={t.exit} onPress={() => app.setEditMode(false)} />
        </View>
      )}
      {banner}
      <SentenceStrip compact={compact} />
      {profile.settings.quickZone && <QuickZone />}
      {content}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      {landscape ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <UniversalBar vertical />
          {main}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {main}
          <UniversalBar vertical={false} />
        </View>
      )}
    </SafeAreaView>
  );
}

/** "Opening YouTube… 3" with Cancel / Open now — or, for an app without a link, a notice for the parents. */
function AppLaunchBanner() {
  const app = useApp();
  const { appLaunch, profile, lang, t } = app;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);
  if (!appLaunch) return null;
  const name = label(profile, appLaunch.concept, lang);
  if (appLaunch.blocked || (!appLaunch.at && appLaunch.url)) {
    return (
      <View style={[styles.banner, appLaunch.blocked ? styles.missingBanner : styles.playBanner]} accessibilityRole="alert">
        <SymbolView symbol={symbolOf(profile, appLaunch.concept)} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.bannerText, appLaunch.blocked ? { color: C.edit } : styles.captionText]} numberOfLines={2}>
            {appLaunch.blocked ? `${t.appBlocked} ${name}.` : `${name} — ${t.appTapToOpen}`}
          </Text>
          {appLaunch.blocked && (
            <Text style={styles.missingHint} selectable>
              {t.appBlockedHint} {appLaunch.url}
            </Text>
          )}
          {!appLaunch.blocked && IN_EMBEDDED_PAGE && (
            <Text style={styles.missingHint} selectable>
              {t.appDemoHint} {appLaunch.url}
            </Text>
          )}
        </View>
        <Btn small label={appLaunch.blocked ? t.close : t.cancel} onPress={app.cancelAppLaunch} />
        <Btn small kind="primary" icon="external" label={`${t.openNow} ${name}`} onPress={app.openAppNow} />
      </View>
    );
  }
  if (!appLaunch.at) {
    return (
      <View style={[styles.banner, styles.missingBanner]} accessibilityRole="alert">
        <SymbolView symbol={symbolOf(profile, appLaunch.concept)} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.bannerText, { color: C.edit }]}>
            {name} {t.appMissing}
          </Text>
          <Text style={styles.missingHint}>{t.appMissingHint}</Text>
        </View>
        <Btn small kind="primary" icon="check" label={t.close} onPress={app.cancelAppLaunch} />
      </View>
    );
  }
  const seconds = Math.max(1, Math.ceil((appLaunch.at - now) / 1000));
  return (
    <View style={[styles.banner, styles.playBanner]} accessibilityRole="alert">
      <SymbolView symbol={symbolOf(profile, appLaunch.concept)} size={36} />
      <Text style={[styles.bannerText, styles.captionText]} numberOfLines={1}>
        {t.appOpening} {name}… {seconds}
      </Text>
      <Btn small label={t.cancel} onPress={app.cancelAppLaunch} />
      <Btn small kind="primary" icon="external" label={t.openNow} onPress={app.openAppNow} />
    </View>
  );
}

/** Fixed zone of urgent / repair messages (spec §7), optional per profile. */
function QuickZone() {
  const app = useApp();
  const { profile, lang } = app;
  return (
    <View style={styles.quick}>
      {QUICK_ZONE.map((id) => (
        <Pressable
          key={id}
          onPress={() => app.touchConcept(id)}
          style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={label(profile, id, lang)}
        >
          <SymbolView symbol={symbolOf(profile, id)} size={26} />
          <Text style={[styles.quickText, { writingDirection: isRtl(lang) ? 'rtl' : 'ltr' }]} numberOfLines={1}>
            {label(profile, id, lang)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.rail },
  main: { flex: 1, backgroundColor: C.bg, padding: 8, gap: 8 },
  content: { flex: 1 },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.editSoft,
    borderColor: '#FEC84B',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
  },
  editText: { flex: 1, color: C.edit, fontWeight: '800', fontSize: 15 },
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
  bannerText: { flex: 1, fontWeight: '800', fontSize: 15 },
  captionText: { color: C.accent, fontSize: 19 },
  recBanner: { backgroundColor: C.helpSoft, borderColor: '#F4B4AE' },
  playBanner: { backgroundColor: C.accentSoft, borderColor: '#A4C2FF' },
  missingBanner: { backgroundColor: C.editSoft, borderColor: '#FEC84B', paddingVertical: 8 },
  missingHint: { color: C.text, fontSize: 14 },
  recDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.help },
  quick: { flexDirection: 'row', gap: 6 },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 4,
  },
  quickText: { fontSize: 15, fontWeight: '700', color: C.text, flexShrink: 1 },
});
