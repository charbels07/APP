import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { isRtl, label, symbolOf } from "../../lib/lexicon";
import type { Schedule, ScheduleStep } from "../../model/types";
import { useApp } from "../../state/AppState";
import { Btn, Segmented } from "../common";
import { Icon } from "../Icon";
import { SymbolView } from "../SymbolView";
import { C, radius } from "../theme";
import { MonthView, WeekView } from "./PlansViews";

export const scheduleTitle = (
  s: Schedule,
  profile: ReturnType<typeof useApp>["profile"],
  lang: ReturnType<typeof useApp>["lang"],
) => s.title || label(profile, s.concept, lang);

/** Visual schedules (spec §15) and First–Then (spec §16). */
export function ScheduleScreen() {
  const app = useApp();
  const { profile, lang, t, editMode } = app;
  const [mode, setMode] = useState<"sequence" | "firstThen" | "week" | "month">(
    "sequence",
  );
  const plans = profile.settings.plans ?? { week: false, month: false };
  // A plan turned off in Settings while open: back to the day plan.
  const shown =
    (mode === "week" && !plans.week) || (mode === "month" && !plans.month)
      ? "sequence"
      : mode;
  const dayPlan = shown === "sequence" || shown === "firstThen";
  const schedule =
    profile.schedules.find((s) => s.id === profile.activeSchedule) ??
    profile.schedules[0];

  const setActive = (id: string) =>
    app.update((d) => void (d.activeSchedule = id));
  const toggleDone = (stepId: string) =>
    app.update((d) => {
      const s = d.schedules.find((x) => x.id === schedule?.id);
      const st = s?.steps.find((x) => x.id === stepId);
      if (st) st.done = !st.done;
    });
  const resetAll = () =>
    app.update((d) => {
      const s = d.schedules.find((x) => x.id === schedule?.id);
      s?.steps.forEach((st) => (st.done = false));
    });
  const newSchedule = () => {
    const id = `sched_${Date.now().toString(36)}`;
    app.update((d) => {
      d.schedules.push({
        id,
        title: t.newSchedule,
        concept: "s_morning",
        recurring: false,
        steps: [],
      });
      d.activeSchedule = id;
    });
    app.setOverlay({ kind: "scheduleEditor", id });
  };

  const steps = schedule?.steps ?? [];
  const currentIndex = steps.findIndex((s) => !s.done);
  const current = currentIndex >= 0 ? steps[currentIndex] : undefined;
  const next =
    currentIndex >= 0
      ? steps.slice(currentIndex + 1).find((s) => !s.done)
      : undefined;

  const firstId = profile.firstThen?.first ?? current?.concept;
  const thenId = profile.firstThen?.then ?? next?.concept;
  const pickFirstThen = (slot: "first" | "then") =>
    app.setOverlay({
      kind: "picker",
      onPick: (conceptId) => {
        app.update((d) => {
          d.firstThen = { ...(d.firstThen ?? {}), [slot]: conceptId };
        });
        app.setOverlay(null);
      },
    });

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={styles.header}>
        {dayPlan && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
            style={{ flexShrink: 1 }}
          >
            {profile.schedules.map((s) => {
              const active = s.id === schedule?.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() =>
                    active && editMode
                      ? app.setOverlay({ kind: "scheduleEditor", id: s.id })
                      : setActive(s.id)
                  }
                  style={({ pressed }) => [
                    styles.tab,
                    active && styles.tabActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <SymbolView symbol={symbolOf(profile, s.concept)} size={28} />
                  <Text style={[styles.tabText, active && { color: C.accent }]}>
                    {scheduleTitle(s, profile, lang)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {dayPlan && editMode && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Btn
              small
              icon="plus"
              accessibilityLabel={t.newSchedule}
              onPress={newSchedule}
            />
            {schedule && (
              <Btn
                small
                icon="pencil"
                label={t.editSchedule}
                onPress={() =>
                  app.setOverlay({ kind: "scheduleEditor", id: schedule.id })
                }
              />
            )}
          </View>
        )}
        <View style={{ minWidth: 260 }}>
          <Segmented
            value={shown}
            onChange={setMode}
            options={[
              { value: "sequence", label: t.sequence },
              { value: "firstThen", label: t.firstThen },
              ...(plans.week
                ? [{ value: "week" as const, label: t.weekPlan }]
                : []),
              ...(plans.month
                ? [{ value: "month" as const, label: t.monthPlan }]
                : []),
            ]}
          />
        </View>
        {dayPlan && (
          <Btn
            small
            icon="undo"
            accessibilityLabel={t.resetSchedule}
            onPress={resetAll}
          />
        )}
      </View>

      {shown === "week" ? (
        <WeekView />
      ) : shown === "month" ? (
        <MonthView />
      ) : shown === "firstThen" ? (
        <View style={styles.bigRow}>
          <BigCard
            heading={t.first}
            conceptId={firstId}
            tone="now"
            onPress={() =>
              editMode
                ? pickFirstThen("first")
                : firstId && app.speakConcept(firstId)
            }
            hint={editMode ? t.tapToChoose : undefined}
          />
          <Icon name="chevronRight" size={48} color={C.textMuted} />
          <BigCard
            heading={t.then}
            conceptId={thenId}
            tone="next"
            onPress={() =>
              editMode
                ? pickFirstThen("then")
                : thenId && app.speakConcept(thenId)
            }
            hint={editMode ? t.tapToChoose : undefined}
          />
          {editMode && profile.firstThen && (
            <Btn
              small
              icon="calendar"
              accessibilityLabel={t.schedule}
              onPress={() => app.update((d) => void delete d.firstThen)}
            />
          )}
        </View>
      ) : (
        <>
          <View style={[styles.bigRow, { flex: 1.25 }]}>
            {current ? (
              <BigCard
                heading={t.now}
                conceptId={current.concept}
                tone="now"
                onPress={() => app.speakConcept(current.concept)}
                actions={
                  <StepActions
                    step={current}
                    onDone={() => toggleDone(current.id)}
                  />
                }
              />
            ) : (
              <View style={[styles.big, styles.allDone]}>
                <Icon
                  name="check"
                  size={64}
                  color={C.success}
                  strokeWidth={3}
                />
                <Text style={styles.allDoneText}>{t.allDone}</Text>
              </View>
            )}
            {current && (
              <>
                <Icon name="chevronRight" size={40} color={C.textMuted} />
                <BigCard
                  heading={t.next}
                  conceptId={next?.concept}
                  tone="next"
                  onPress={() => next && app.speakConcept(next.concept)}
                />
              </>
            )}
          </View>
          <ScrollView
            horizontal
            contentContainerStyle={styles.sequence}
            style={{ flex: 1 }}
          >
            {steps.map((st, i) => {
              const isCurrent = i === currentIndex;
              return (
                <View
                  key={st.id}
                  style={[
                    styles.stepCard,
                    isCurrent && styles.stepCurrent,
                    st.done && styles.stepDone,
                  ]}
                >
                  <Pressable
                    onPress={() => app.speakConcept(st.concept)}
                    style={styles.stepMain}
                    accessibilityLabel={label(profile, st.concept, lang)}
                  >
                    <Text style={styles.stepNum}>{i + 1}</Text>
                    <SymbolView
                      symbol={symbolOf(profile, st.concept)}
                      size={64}
                    />
                    <Text
                      style={[
                        styles.stepLabel,
                        { writingDirection: isRtl(lang) ? "rtl" : "ltr" },
                      ]}
                      numberOfLines={2}
                    >
                      {label(profile, st.concept, lang)}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleDone(st.id)}
                    style={[
                      styles.check,
                      st.done && {
                        backgroundColor: C.success,
                        borderColor: C.success,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: st.done }}
                    accessibilityLabel={t.markDone}
                  >
                    <Icon
                      name="check"
                      size={22}
                      color={st.done ? "#fff" : C.textMuted}
                      strokeWidth={3}
                    />
                  </Pressable>
                  {st.done && <Text style={styles.doneTag}>{t.doneLabel}</Text>}
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function StepActions({
  step,
  onDone,
}: {
  step: ScheduleStep;
  onDone: () => void;
}) {
  const app = useApp();
  const { t, profile, lang } = app;
  return (
    <View style={styles.actions}>
      <Btn kind="success" icon="check" label={t.markDone} onPress={onDone} />
      {step.tla && profile.boards[step.tla] && (
        <Btn
          icon="grid"
          label={label(profile, profile.boards[step.tla].concept, lang)}
          onPress={() => app.openTla(step.tla)}
        />
      )}
      {step.timerMin ? (
        <Btn
          icon="timer"
          label={`${step.timerMin} ${t.minutes}`}
          onPress={() => app.startTimer(step.timerMin!, step.concept)}
        />
      ) : null}
    </View>
  );
}

function BigCard({
  heading,
  conceptId,
  tone,
  onPress,
  actions,
  hint,
}: {
  heading: string;
  conceptId?: string;
  tone: "now" | "next";
  onPress: () => void;
  actions?: React.ReactNode;
  hint?: string;
}) {
  const { profile, lang } = useApp();
  return (
    <View style={[styles.big, tone === "now" ? styles.bigNow : styles.bigNext]}>
      <Text
        style={[styles.bigHeading, tone === "now" && { color: C.highlight }]}
      >
        {heading}
      </Text>
      <Pressable
        onPress={onPress}
        style={styles.bigBody}
        accessibilityRole="button"
      >
        {conceptId ? (
          <>
            <SymbolView
              symbol={symbolOf(profile, conceptId)}
              size={tone === "now" ? 150 : 110}
            />
            <Text
              style={[
                styles.bigLabel,
                { writingDirection: isRtl(lang) ? "rtl" : "ltr" },
              ]}
            >
              {label(profile, conceptId, lang)}
            </Text>
          </>
        ) : (
          <Text style={styles.bigEmpty}>—</Text>
        )}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </Pressable>
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tabActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  tabText: { fontSize: 16, fontWeight: "700", color: C.text },
  bigRow: { flex: 1, flexDirection: "row", alignItems: "stretch", gap: 10 },
  big: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: C.surface,
    borderWidth: 3,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  bigNow: { borderColor: C.highlight },
  bigNext: { borderColor: C.border, flex: 0.8 },
  bigHeading: {
    fontSize: 20,
    fontWeight: "900",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bigBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "stretch",
  },
  bigLabel: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
  },
  bigEmpty: { fontSize: 40, color: C.textMuted },
  hint: { fontSize: 14, color: C.edit, fontWeight: "700" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  allDone: { borderColor: C.success, justifyContent: "center" },
  allDoneText: { fontSize: 28, fontWeight: "800", color: C.success },
  sequence: { gap: 10, alignItems: "stretch", paddingBottom: 4 },
  stepCard: {
    width: 150,
    borderRadius: radius.md,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    padding: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepCurrent: { borderColor: C.highlight, borderWidth: 3 },
  stepDone: { opacity: 0.5 },
  stepMain: { alignItems: "center", gap: 4, flex: 1, justifyContent: "center" },
  stepNum: {
    position: "absolute",
    top: -2,
    left: -2,
    fontSize: 13,
    fontWeight: "800",
    color: C.textMuted,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    color: C.text,
  },
  check: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTag: {
    position: "absolute",
    top: 6,
    right: 8,
    fontSize: 11,
    fontWeight: "800",
    color: C.success,
  },
});
