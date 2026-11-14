/**
 * Small charts of the "Suivi" pages, drawn with plain views (no chart library):
 * stat tiles, a day-by-day column chart (tap a column to read it, or switch to a table),
 * horizontal bar lists (value at the tip), a split bar (one whole in two parts) and
 * two-series bars with a legend. One blue for single series; blue + orange when two series
 * are compared (checked for colour-blind safety). Text always uses the text colours.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavRtl } from '../common';
import { C } from '../theme';

export const SERIES = ['#2672cc', '#eb6834'] as const;
/** Text written inside a bar of each series (4.5:1 at least): white on the blue, dark on the orange. */
const INSIDE = ['#fff', C.text] as const;
const GRID = C.border;
const BASE = '#B8C0CC';
const RIGHT = { textAlign: 'right' as const, writingDirection: 'rtl' as const };

export const compact = (n: number) =>
  n >= 10000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(Math.round(n * 10) / 10);

// ── Stat tiles ──

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={st.grid}>{children}</View>;
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const rtl = useNavRtl();
  return (
    <View style={st.tile} accessible accessibilityRole="image" accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <Text style={[st.tileLabel, rtl && RIGHT]}>{label}</Text>
      <Text style={[st.tileValue, rtl && RIGHT]}>{value}</Text>
      {sub ? <Text style={[st.tileSub, rtl && RIGHT]}>{sub}</Text> : null}
    </View>
  );
}

// ── Card with a title ──

export function ChartCard({ title, note, right, children }: { title: string; note?: string; right?: React.ReactNode; children: React.ReactNode }) {
  const rtl = useNavRtl();
  return (
    <View style={st.card}>
      <View style={[st.cardHead, rtl && { flexDirection: 'row-reverse' }]}>
        <Text style={[st.cardTitle, rtl && RIGHT]}>{title}</Text>
        {right}
      </View>
      {note ? <Text style={[st.note, rtl && RIGHT]}>{note}</Text> : null}
      {children}
    </View>
  );
}

// ── Columns: one value per day ──

export interface Column {
  key: string;
  /** Short label under the first / last columns and in the reading line. */
  label: string;
  value: number;
}

const niceMax = (v: number) => {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v)!;
};

export function ColumnChart({ columns, unit, height = 140, table }: { columns: Column[]; unit: string; height?: number; table?: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  const rtl = useNavRtl();
  const max = niceMax(Math.max(0, ...columns.map((c) => c.value)));
  if (table) {
    return <DataTable head={['', unit]} rows={columns.filter((c) => c.value > 0).map((c) => [c.label, compact(c.value)])} />;
  }
  const picked = sel != null ? columns[sel] : null;
  const gap = columns.length > 40 ? 1 : 2;
  return (
    <View style={{ gap: 6 }}>
      <Text style={[st.reading, rtl && RIGHT]}>{picked ? `${picked.label} · ${compact(picked.value)} ${unit}` : ' '}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ height, justifyContent: 'space-between', alignItems: 'flex-end', width: 28 }}>
          <Text style={st.tick}>{compact(max)}</Text>
          <Text style={st.tick}>{compact(max / 2)}</Text>
          <Text style={st.tick}>0</Text>
        </View>
        <View style={{ flex: 1, height }}>
          {/* Hairline grid: top, middle; the baseline is a little darker. */}
          <View style={[st.gridLine, { top: 0 }]} />
          <View style={[st.gridLine, { top: height / 2 }]} />
          <View style={[st.gridLine, { bottom: 0, backgroundColor: BASE }]} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap }}>
            {columns.map((c, i) => (
              <Pressable
                key={c.key}
                onPress={() => setSel(sel === i ? null : i)}
                accessibilityRole="button"
                accessibilityLabel={`${c.label}: ${c.value} ${unit}`}
                style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}
              >
                <View
                  style={{
                    width: '100%',
                    maxWidth: 24,
                    height: c.value > 0 ? Math.max(2, (c.value / max) * height) : 0,
                    backgroundColor: SERIES[0],
                    opacity: sel == null || sel === i ? 1 : 0.45,
                    borderTopLeftRadius: columns.length > 40 ? 1 : 4,
                    borderTopRightRadius: columns.length > 40 ? 1 : 4,
                  }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 34 }}>
        <Text style={st.tick}>{columns[0]?.label}</Text>
        <Text style={st.tick}>{columns[columns.length - 1]?.label}</Text>
      </View>
    </View>
  );
}

// ── Horizontal bars, value at the tip ──

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Shown at the tip instead of the number. */
  valueText?: string;
  sub?: string;
  /** A picture before the label (pictogram of a word). */
  lead?: React.ReactNode;
}

export function BarList({ items, max, labelWidth = '42%' }: { items: BarItem[]; max?: number; labelWidth?: `${number}%` | number }) {
  const rtl = useNavRtl();
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={{ gap: 8 }}>
      {items.map((it) => (
        <View
          key={it.key}
          style={[st.barRow, rtl && { flexDirection: 'row-reverse' }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${it.label}: ${it.valueText ?? it.value}`}
        >
          <View style={[{ width: labelWidth, flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }]}>
            {it.lead}
            <View style={{ flex: 1 }}>
              <Text style={[st.barLabel, rtl && RIGHT]} numberOfLines={2}>
                {it.label}
              </Text>
              {it.sub ? <Text style={[st.barSub, rtl && RIGHT]} numberOfLines={1}>{it.sub}</Text> : null}
            </View>
          </View>
          <View style={[st.barTrack, rtl && { flexDirection: 'row-reverse' }]}>
            <View
              style={[
                st.bar,
                { width: `${Math.max(it.value > 0 ? 1.5 : 0, (it.value / top) * 100) * 0.82}%` },
                rtl ? { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 } : { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
              ]}
            />
            <Text style={st.barValue}>{it.valueText ?? compact(it.value)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── One whole in parts (tall split bar) ──

export function SplitBar({ parts }: { parts: { key: string; label: string; value: number }[] }) {
  const rtl = useNavRtl();
  const total = parts.reduce((s, p) => s + p.value, 0);
  const [w, setW] = useState(0);
  if (!total) return null;
  return (
    <View style={{ gap: 8 }}>
      <View
        style={[{ flexDirection: rtl ? 'row-reverse' : 'row', height: 28, gap: 2 }]}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={parts.map((p) => `${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`).join(', ')}
      >
        {parts.map((p, i) =>
          p.value > 0 ? (
            <View key={p.key} style={{ flex: p.value, backgroundColor: SERIES[i], borderRadius: 4, justifyContent: 'center', paddingHorizontal: 6 }}>
              {(p.value / total) * w > 44 ? <Text style={[st.inside, { color: INSIDE[i] ?? '#fff' }]}>{Math.round((p.value / total) * 100)}%</Text> : null}
            </View>
          ) : null,
        )}
      </View>
      <Legend items={parts.map((p) => `${p.label} · ${compact(p.value)}`)} />
    </View>
  );
}

// ── Two series per row (e.g. recognised / observed) ──

export function PairBarList({ items, series }: { items: { key: string; label: string; a: number; b: number; sub?: string }[]; series: [string, string] }) {
  const rtl = useNavRtl();
  const top = Math.max(1, ...items.map((i) => i.a + i.b));
  return (
    <View style={{ gap: 8 }}>
      <Legend items={series} />
      {items.map((it) => (
        <View
          key={it.key}
          style={[st.barRow, rtl && { flexDirection: 'row-reverse' }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${it.label}: ${series[0]} ${it.a}, ${series[1]} ${it.b}`}
        >
          <View style={{ width: '42%' }}>
            <Text style={[st.barLabel, rtl && RIGHT]} numberOfLines={2}>
              {it.label}
            </Text>
            {it.sub ? <Text style={[st.barSub, rtl && RIGHT]} numberOfLines={2}>{it.sub}</Text> : null}
          </View>
          <View style={[st.barTrack, { gap: 2 }, rtl && { flexDirection: 'row-reverse' }]}>
            {it.a > 0 && <View style={[st.bar, { width: `${(it.a / top) * 78}%`, backgroundColor: SERIES[0] }, it.b ? null : endRadius(rtl)]} />}
            {it.b > 0 && <View style={[st.bar, { width: `${(it.b / top) * 78}%`, backgroundColor: SERIES[1] }, endRadius(rtl)]} />}
            <Text style={st.barValue}>{it.a + it.b}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const endRadius = (rtl: boolean) =>
  rtl ? { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 } : { borderTopRightRadius: 4, borderBottomRightRadius: 4 };

export function Legend({ items }: { items: readonly string[] }) {
  const rtl = useNavRtl();
  return (
    <View style={[{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 14 }]}>
      {items.map((t, i) => (
        <View key={t} style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: SERIES[i] }} />
          <Text style={st.legend}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Table (the same numbers without a chart) ──

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const rtl = useNavRtl();
  const dir = rtl ? 'row-reverse' : 'row';
  return (
    <View style={st.table}>
      <View style={[st.tr, { flexDirection: dir }, st.th]}>
        {head.map((h, i) => (
          <Text key={i} style={[st.td, st.thText, i > 0 && st.num]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r, j) => (
        <View key={j} style={[st.tr, { flexDirection: dir }]}>
          {r.map((c, i) => (
            <Text key={i} style={[st.td, i > 0 && st.num, rtl && i === 0 && RIGHT]}>
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 2,
  },
  tileLabel: { fontSize: 13, color: C.textMuted },
  tileValue: { fontSize: 26, fontWeight: '600', color: C.text },
  tileSub: { fontSize: 12, color: C.textMuted },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  note: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  reading: { fontSize: 13, fontWeight: '600', color: C.text, minHeight: 18 },
  tick: { fontSize: 11, color: C.textMuted, fontVariant: ['tabular-nums'] },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: GRID },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  barLabel: { fontSize: 14, color: C.text },
  barSub: { fontSize: 12, color: C.textMuted },
  barTrack: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: { height: 14, backgroundColor: SERIES[0] },
  barValue: { fontSize: 13, color: C.textMuted, fontVariant: ['tabular-nums'] },
  inside: { color: '#fff', fontSize: 13, fontWeight: '700' },
  legend: { fontSize: 13, color: C.text },
  table: { borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  th: { backgroundColor: C.surfaceAlt, borderTopWidth: 0 },
  td: { flex: 1, paddingVertical: 6, paddingHorizontal: 10, fontSize: 13, color: C.text },
  thText: { fontWeight: '700', color: C.textMuted },
  num: { textAlign: 'right', fontVariant: ['tabular-nums'] },
});
