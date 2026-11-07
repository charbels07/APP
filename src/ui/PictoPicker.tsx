import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { loadPictoLibrary, pictoImageUri } from '../lib/pictoLibrary';
import { searchPictos, type PreparedIndex } from '../lib/pictoSearch';
import type { Lang } from '../model/types';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { C, radius } from './theme';

/** Loads the offline library once; `null` while loading, `false` if unavailable. */
export function usePictoLibrary(): PreparedIndex | null | false {
  const [lib, setLib] = useState<PreparedIndex | null | false>(null);
  useEffect(() => {
    let alive = true;
    loadPictoLibrary()
      .then((l) => alive && setLib(l))
      .catch(() => alive && setLib(false));
    return () => {
      alive = false;
    };
  }, []);
  return lib;
}

export const PictoThumb = React.memo(function PictoThumb({
  id,
  size = 64,
  selected,
  onPress,
  caption,
  removable,
}: {
  id: number;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
  caption?: string;
  removable?: boolean;
}) {
  const [uri, setUri] = useState<string>();
  useEffect(() => {
    let alive = true;
    pictoImageUri(id)
      .then((u) => alive && setUri(u))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={caption}
      style={({ pressed }) => [
        styles.thumb,
        { width: size + 14 },
        selected && styles.selected,
        pressed && { opacity: 0.6 },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" />
      ) : (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.textMuted} />
        </View>
      )}
      {caption ? (
        <Text style={styles.caption} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
      {removable && (
        <View style={styles.remove}>
          <Icon name="x" size={14} color="#fff" strokeWidth={3} />
        </View>
      )}
      {selected && (
        <View style={styles.check}>
          <Icon name="check" size={14} color="#fff" strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
});

/** Search box + results from the offline ARASAAC library. */
export function PictoSearch({
  initialQuery,
  query: controlledQuery,
  onPick,
  selectedId,
  max = 18,
  lang,
  showInput = true,
  onResults,
}: {
  initialQuery?: string;
  /** When given, the search follows this text (e.g. the word being typed). */
  query?: string;
  onPick: (id: number) => void;
  selectedId?: number;
  max?: number;
  lang?: Lang;
  showInput?: boolean;
  onResults?: (ids: number[]) => void;
}) {
  const app = useApp();
  const { t } = app;
  const lib = usePictoLibrary();
  const [own, setOwn] = useState(initialQuery ?? '');
  const query = controlledQuery ?? own;
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(id);
  }, [query]);
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    if (!lib) return;
    const r = searchPictos(lib, debounced, lang ?? app.profile.settings.uiLang, max);
    setIds(r);
    onResults?.(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, debounced, lang, max]);

  return (
    <View style={{ gap: 8 }}>
      {showInput && (
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color={C.textMuted} />
          <TextInput
            value={own}
            onChangeText={setOwn}
            placeholder={t.pictoLibrary}
            placeholderTextColor="#98A2B3"
            style={styles.input}
            autoCorrect={false}
          />
        </View>
      )}
      {lib === null && <Text style={styles.note}>{t.pictoLoading}</Text>}
      {lib === false && <Text style={styles.note}>{t.arasaacOffline}</Text>}
      {lib && debounced.trim() && !ids.length ? <Text style={styles.note}>{t.pictoNone}</Text> : null}
      <View style={styles.grid}>
        {ids.map((id) => (
          <PictoThumb key={id} id={id} selected={id === selectedId} onPress={() => onPick(id)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    minHeight: 46,
  },
  input: { flex: 1, fontSize: 16, color: C.text, minHeight: 44, outlineStyle: 'none' } as object,
  note: { fontSize: 13, color: C.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: '#fff',
    gap: 2,
  },
  selected: { borderColor: C.success, borderWidth: 3, backgroundColor: C.successSoft },
  caption: { fontSize: 12, fontWeight: '600', color: C.text, textAlign: 'center' },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.help,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
