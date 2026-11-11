/**
 * Optional week and month plans (Planning screen), turned on at set-up or in Settings.
 * Child: touching a picture says it; touching a day says its name. Caregiver mode: "+" adds a
 * picture (word chooser), touching a picture removes it. Weeks start on Monday and are never
 * mirrored (same place in every language, like the boards).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { dayLabel, MONTHS, monthGrid, WEEKDAYS, WEEKDAYS_SHORT, weekdayIndex, ymd } from '../../data/calendar';
import { isRtl, label, symbolOf } from '../../lib/lexicon';
import { speakText } from '../../lib/speech';
import type { MonthEvent } from '../../model/types';
import { useApp } from '../../state/AppState';
import { Btn } from '../common';
import { Icon } from '../Icon';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';

const newId = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function WeekView() {
  const app = useApp();
  const { profile, lang, t, editMode } = app;
  const today = weekdayIndex(new Date());
  const days = profile.weekPlan ?? {};
  const rtl = isRtl(lang);
  const add = (d: number) =>
    app.setOverlay({
      kind: 'picker',
      title: `${t.planAdd} · ${WEEKDAYS[lang][d]}`,
      onPick: (concept) => {
        app.update((p) => {
          p.weekPlan ??= {};
          p.weekPlan[String(d)] = [...(p.weekPlan[String(d)] ?? []), { id: newId('w'), concept }];
        });
        app.setOverlay(null);
      },
    });
  const remove = (d: number, id: string) =>
    app.update((p) => {
      p.weekPlan ??= {};
      const left = (p.weekPlan[String(d)] ?? []).filter((x) => x.id !== id);
      if (left.length) p.weekPlan[String(d)] = left;
      else delete p.weekPlan[String(d)];
    });

  return (
    <View style={{ flex: 1, gap: 6 }}>
      {editMode && <Text style={styles.hint}>{t.planEditHint}</Text>}
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }} showsHorizontalScrollIndicator={false}>
        <View style={styles.week}>
          {WEEKDAYS[lang].map((name, d) => {
            const items = days[String(d)] ?? [];
            const isToday = d === today;
            return (
              <View key={d} style={[styles.dayCol, isToday && styles.todayCol]}>
                <Pressable
                  onPress={() => speakText(name, lang, profile.settings)}
                  style={[styles.dayHead, isToday && { backgroundColor: C.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel={isToday ? `${name}, ${t.today}` : name}
                >
                  <Text style={[styles.dayName, isToday && { color: '#fff' }, rtl && { writingDirection: 'rtl' }]} numberOfLines={1}>
                    {name}
                  </Text>
                  {isToday && <Text style={styles.todayTag}>{t.today}</Text>}
                </Pressable>
                <ScrollView contentContainerStyle={{ gap: 6, padding: 6 }}>
                  {items.map((it) => (
                    <Pressable
                      key={it.id}
                      onPress={() => (editMode ? remove(d, it.id) : app.speakConcept(it.concept))}
                      style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={label(profile, it.concept, lang)}
                    >
                      <SymbolView symbol={symbolOf(profile, it.concept)} size={52} />
                      <Text style={styles.itemText} numberOfLines={2}>
                        {label(profile, it.concept, lang)}
                      </Text>
                      {editMode && (
                        <View style={styles.removeDot}>
                          <Icon name="x" size={14} color="#fff" strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  ))}
                  {!items.length && !editMode && <Text style={styles.empty}>—</Text>}
                  {editMode && <Btn small icon="plus" accessibilityLabel={`${t.planAdd} · ${name}`} onPress={() => add(d)} />}
                </ScrollView>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function MonthView() {
  const app = useApp();
  const { profile, lang, t, editMode } = app;
  const { width } = useWindowDimensions();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(ymd(now));
  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const byDate = useMemo(() => {
    const map = new Map<string, MonthEvent[]>();
    for (const e of Object.values(profile.monthPlan ?? {})) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [profile.monthPlan]);
  const todayKey = ymd(now);
  const selDate = new Date(Number(selected.slice(0, 4)), Number(selected.slice(5, 7)) - 1, Number(selected.slice(8, 10)));
  const selEvents = byDate.get(selected) ?? [];
  const wide = width >= 900;
  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const pick = (d: Date) => {
    setSelected(ymd(d));
    const events = byDate.get(ymd(d)) ?? [];
    const words = events.map((e) => label(profile, e.concept, lang)).join(', ');
    speakText(words ? `${dayLabel(d, lang)} : ${words}` : dayLabel(d, lang), lang, profile.settings);
  };
  const add = () =>
    app.setOverlay({
      kind: 'picker',
      title: `${t.planAdd} · ${dayLabel(selDate, lang)}`,
      onPick: (concept) => {
        app.update((p) => {
          p.monthPlan ??= {};
          const id = newId('e');
          p.monthPlan[id] = { id, date: selected, concept };
        });
        app.setOverlay(null);
      },
    });
  const remove = (id: string) => app.update((p) => void delete p.monthPlan?.[id]);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', gap: 10 }}>
      <View style={{ flex: wide ? 2 : 3, gap: 6 }}>
        <View style={styles.monthHead}>
          <Btn small icon="chevronLeft" accessibilityLabel={t.prevMonth} onPress={() => move(-1)} />
          <Text style={styles.monthTitle}>{`${MONTHS[lang][cursor.m]} ${cursor.y}`}</Text>
          <Btn small icon="chevronRight" accessibilityLabel={t.nextMonth} onPress={() => move(1)} />
        </View>
        <View style={styles.weekRow}>
          {WEEKDAYS_SHORT[lang].map((d) => (
            <Text key={d} style={styles.weekLabel} numberOfLines={1}>
              {d}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {rows.map((row, r) => (
            <View key={r} style={[styles.weekRow, { flex: 1 }]}>
              {row.map((d, i) => {
                if (!d) return <View key={i} style={[styles.dayCell, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />;
                const key = ymd(d);
                const evs = byDate.get(key) ?? [];
                return (
                  <Pressable
                    key={i}
                    onPress={() => pick(d)}
                    style={[styles.dayCell, key === todayKey && styles.dayToday, key === selected && styles.daySelected]}
                    accessibilityRole="button"
                    accessibilityLabel={dayLabel(d, lang)}
                  >
                    <Text style={[styles.dayNum, key === todayKey && { color: C.accent }]}>{d.getDate()}</Text>
                    <View style={styles.dayPictos}>
                      {evs.slice(0, 2).map((e) => (
                        <SymbolView key={e.id} symbol={symbolOf(profile, e.concept)} size={26} />
                      ))}
                      {evs.length > 2 && <Text style={styles.more}>+{evs.length - 2}</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.detail, { flex: wide ? 1 : 2 }]}>
        <Text style={styles.detailTitle}>{dayLabel(selDate, lang)}</Text>
        {editMode && <Text style={styles.hint}>{t.planEditHint}</Text>}
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          {selEvents.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => (editMode ? remove(e.id) : app.speakConcept(e.concept))}
              style={({ pressed }) => [styles.eventRow, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={label(profile, e.concept, lang)}
            >
              <SymbolView symbol={symbolOf(profile, e.concept)} size={64} />
              <Text style={[styles.itemText, { fontSize: 18, flex: 1 }]}>{label(profile, e.concept, lang)}</Text>
              {editMode && <Icon name="x" size={20} color={C.help} />}
            </Pressable>
          ))}
          {!selEvents.length && <Text style={styles.empty}>{t.nothingPlanned}</Text>}
          {editMode && <Btn small icon="plus" label={t.planAdd} onPress={add} />}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: C.edit, fontWeight: '700', fontSize: 14 },
  week: { flex: 1, flexDirection: 'row', gap: 6 },
  dayCol: { flex: 1, minWidth: 118, backgroundColor: C.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' },
  todayCol: { borderColor: C.accent, borderWidth: 2.5 },
  dayHead: { alignItems: 'center', paddingVertical: 8, backgroundColor: C.surfaceAlt, gap: 2 },
  dayName: { fontSize: 17, fontWeight: '800', color: C.text },
  todayTag: { fontSize: 12, fontWeight: '800', color: '#fff' },
  item: { alignItems: 'center', gap: 2, padding: 6, borderRadius: radius.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  itemText: { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center' },
  removeDot: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: C.help, alignItems: 'center', justifyContent: 'center' },
  empty: { color: C.textMuted, textAlign: 'center', fontSize: 16, paddingVertical: 8 },
  monthHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: C.text },
  weekRow: { flexDirection: 'row', gap: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontWeight: '800', color: C.textMuted, fontSize: 13 },
  dayCell: { flex: 1, minHeight: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: 3 },
  dayToday: { borderColor: C.accent, borderWidth: 2.5 },
  daySelected: { backgroundColor: C.accentSoft },
  dayNum: { fontSize: 14, fontWeight: '800', color: C.text },
  dayPictos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 2 },
  more: { fontSize: 12, fontWeight: '800', color: C.textMuted },
  detail: { backgroundColor: C.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: C.border, padding: 10, gap: 8 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: C.border },
});
