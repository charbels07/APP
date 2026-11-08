import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { onPastedImage, pasteImageFromClipboard } from '../lib/clipboardImage';
import { saveImageLink, saveWebPicture, searchWebPictures, ServiceError, type WebKind, type WebPicture } from '../lib/webPictures';
import { useApp } from '../state/AppState';
import { Btn, Segmented } from './common';
import { C, radius } from './theme';

/**
 * Picture for a word from the internet: free pictogram sets and photos/drawings
 * (with their licence), an image copied anywhere and pasted, or an image link.
 * The chosen picture is downloaded and kept on the device.
 */
export function WebPicturePicker({
  initialQuery,
  onPicked,
}: {
  initialQuery: string;
  onPicked: (mediaName: string, credit?: string) => void;
}) {
  const { t, profile } = useApp();
  const lang = profile.settings.uiLang;
  const [kind, setKind] = useState<WebKind>('symbols');
  const [q, setQ] = useState(initialQuery);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'offline'>('idle');
  const [results, setResults] = useState<WebPicture[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const picked = useRef(onPicked);
  picked.current = onPicked;

  const run = async (k: WebKind = kind, query: string = q) => {
    if (!query.trim()) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setState('loading');
    setMsg(null);
    try {
      const r = await searchWebPictures(query, k, lang, c.signal);
      if (c.signal.aborted) return;
      setResults(r);
      setState('done');
    } catch (e) {
      if (c.signal.aborted) return;
      setResults([]);
      // An error from the service shows as "nothing found"; no answer at all means no internet.
      setState(e instanceof ServiceError ? 'done' : 'offline');
    }
  };

  useEffect(() => {
    run(kind, initialQuery);
    return () => ctl.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Ctrl/⌘+V anywhere while this is open (web).
  useEffect(() => onPastedImage((name) => picked.current(name)), []);

  const choose = async (p: WebPicture) => {
    setSaving(p.key);
    setMsg(null);
    try {
      onPicked(await saveWebPicture(p), p.credit);
    } catch {
      setMsg(t.linkFailed);
    } finally {
      setSaving(null);
    }
  };

  const paste = async () => {
    setMsg(null);
    try {
      const name = await pasteImageFromClipboard();
      if (name) onPicked(name);
      else setMsg(t.pasteNone);
    } catch {
      setMsg(t.pasteHint);
    }
  };

  const fromLink = async () => {
    setSaving('link');
    setMsg(null);
    try {
      const host = link.trim().replace(/^https?:\/\//i, '').split('/')[0];
      onPicked(await saveImageLink(link), host || undefined);
      setLink('');
    } catch {
      setMsg(t.linkFailed);
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Segmented
        value={kind}
        onChange={(k: WebKind) => {
          setKind(k);
          run(k);
        }}
        options={[
          { value: 'symbols', label: t.webSymbols },
          { value: 'photos', label: t.webPhotos },
          { value: 'drawings', label: t.webDrawings },
        ]}
      />
      <View style={s.row}>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => run()}
          placeholder={t.webSearch}
          placeholderTextColor="#98A2B3"
          returnKeyType="search"
          style={[s.input, { flex: 1 }]}
        />
        <Btn small kind="primary" icon="search" label={t.webSearch} disabled={!q.trim()} onPress={() => run()} />
      </View>
      {state === 'loading' && (
        <View style={s.row}>
          <ActivityIndicator color={C.accent} />
          <Text style={s.note}>{t.webSearching}</Text>
        </View>
      )}
      {state === 'offline' && <Text style={s.warn}>{t.webOffline}</Text>}
      {state === 'done' && !results.length && <Text style={s.note}>{t.webNone}</Text>}
      {results.length > 0 && (
        <View style={s.grid}>
          {results.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => choose(p)}
              disabled={!!saving}
              accessibilityRole="button"
              accessibilityLabel={p.title || p.credit}
              style={({ pressed }) => [s.hit, pressed && { opacity: 0.6 }]}
            >
              <Image source={{ uri: p.thumb }} style={s.thumb} resizeMode="contain" />
              <Text style={s.credit} numberOfLines={2}>
                {p.credit}
              </Text>
              {saving === p.key && <ActivityIndicator style={StyleSheet.absoluteFill} color={C.accent} />}
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.row}>
        <Btn small icon="clipboard" label={t.pasteImage} onPress={paste} />
        <Text style={[s.note, { flex: 1 }]}>{t.pasteHint}</Text>
      </View>
      <View style={s.row}>
        <TextInput
          value={link}
          onChangeText={setLink}
          onSubmitEditing={() => link.trim() && fromLink()}
          placeholder={t.imageLink}
          placeholderTextColor="#98A2B3"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[s.input, { flex: 1 }]}
        />
        <Btn small icon="link" label={saving === 'link' ? t.saving : t.useLink} disabled={!link.trim() || !!saving} onPress={fromLink} />
      </View>
      {msg && <Text style={s.warn}>{msg}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  input: {
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 16,
    color: C.text,
    backgroundColor: C.surface,
    minWidth: 160,
  },
  note: { fontSize: 13, color: C.textMuted },
  warn: { fontSize: 13, backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hit: {
    width: 104,
    padding: 6,
    gap: 4,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  thumb: { width: 88, height: 88 },
  credit: { fontSize: 10, color: C.textMuted, textAlign: 'center' },
});
