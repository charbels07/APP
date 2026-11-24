import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PICTO_LIBRARIES } from '../data/pictoLibraries';
import { loadPictoLibrary, pictoImageUri } from '../lib/pictoLibrary';
import { libraryOf, PICTO_AMBIGUOUS, PICTO_AR_AUTO, PICTO_FR_AUTO, searchPictosAndGuess, type PreparedIndex } from '../lib/pictoSearch';
import { boardToolsStrings } from '../i18n/boardTools';
import { reportProblem } from '../lib/product';
import { normalize } from '../lib/search';
import type { Lang } from '../model/types';
import { useApp } from '../state/AppState';
import { Btn } from './common';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';
import { C, radius } from './theme';
import { checked } from './a11y';

/** Loads the offline library once; `null` while loading, `false` if unavailable. */
export function usePictoLibrary(): PreparedIndex | null | false {
  const [lib, setLib] = useState<PreparedIndex | null | false>(null);
  useEffect(() => {
    let alive = true;
    loadPictoLibrary()
      .then((l) => alive && setLib(l))
      .catch((e) => {
        reportProblem('picto', e);
        if (alive) setLib(false);
      });
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
  wide,
  hold,
}: {
  id: number;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
  caption?: string;
  removable?: boolean;
  /** Search results: room for the word and the library's name. */
  wide?: boolean;
  /** Makes the chip holdable (hold then slide to move it): see Reorderable. */
  hold?: { onLongPress: () => void; onPressOut: () => void; delayLongPress: number };
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
      {...hold}
      accessibilityRole="button"
      accessibilityLabel={caption?.replace('\n', ', ')}
      style={({ pressed }) => [
        styles.thumb,
        { width: wide ? Math.max(size + 14, 104) : size + 14 },
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
        <Text style={styles.caption} numberOfLines={wide ? 3 : 2}>
          {caption.split('\n')[0]}
          {caption.includes('\n') ? <Text style={styles.source}>{`\n${caption.split('\n')[1]}`}</Text> : null}
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

const LIBRARY_NAMES: Record<string, string> = Object.fromEntries(PICTO_LIBRARIES.map((l) => [l.id, l.name]));

/**
 * Search box + results from the offline pictogram library: every library at once, or one of
 * them. Each result shows the word found in the person's language and the library it comes from;
 * a small mark warns when that word was translated automatically.
 */
export function PictoSearch({
  initialQuery,
  query: controlledQuery,
  onPick,
  selectedId,
  max = 18,
  lang,
  showInput = true,
  onResults,
  onGuess,
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
  /**
   * What was typed is not a word of the library: the spelling it probably meant, chosen by the
   * person ("Did you mean « trottinette »?"). Given when the text is typed elsewhere (`query`).
   */
  onGuess?: (spelling: string) => void;
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
  const [guess, setGuess] = useState<string | undefined>();
  const [only, setOnly] = useState<string | undefined>();
  const l = lang ?? app.profile.settings.uiLang;
  useEffect(() => {
    if (lib === null) return;
    const found = lib ? searchPictosAndGuess(lib, debounced, l, max, only) : { ids: [] as number[] };
    setIds(found.ids);
    setGuess(found.guess);
    onResults?.(found.ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, debounced, l, max, only]);
  const slot = l === 'fr' ? 4 : l === 'ar' ? 6 : 5;
  const captionOf = (id: number) => {
    const it = lib ? lib.byId.get(id) : undefined;
    if (!it) return undefined;
    // The word that matches what was typed (e.g. the family's own Arabic), else the first one.
    const q = normalize(debounced);
    const words = it[slot] as string[];
    const word = (q ? words.find((w) => normalize(w).includes(q)) : undefined) ?? words[0] ?? it[5][0];
    const auto = (it[8] ?? 0) & ((l === 'fr' ? PICTO_FR_AUTO : l === 'ar' ? PICTO_AR_AUTO : 0) | PICTO_AMBIGUOUS);
    return `${word}${auto ? ' *' : ''}\n${LIBRARY_NAMES[libraryOf(lib as PreparedIndex, id) ?? ''] ?? ''}`;
  };
  const anyAuto = !!lib && ids.some((id) => (lib.byId.get(id)?.[8] ?? 0) & ((l === 'fr' ? PICTO_FR_AUTO : l === 'ar' ? PICTO_AR_AUTO : 0) | PICTO_AMBIGUOUS));

  return (
    <View style={{ gap: 8 }}>
      {/* The same ways in as the home search: type the word, or say it. */}
      {showInput && <SearchBox value={own} onChange={setOwn} placeholder={t.pictoLibrary} lang={l} />}
      {lib === null && <Text style={styles.note}>{t.pictoLoading}</Text>}
      {lib === false && <Text style={styles.note}>{t.pictoOffline}</Text>}
      {showInput && lib && (
        <View style={styles.libs} accessibilityRole="radiogroup">
          {[undefined, ...(lib.raw.libs ?? [])].map((id) => (
            <Pressable
              key={id ?? 'all'}
              onPress={() => setOnly(id)}
              accessibilityRole="radio"
              {...checked(only === id)}
              style={[styles.lib, only === id && styles.libOn]}
            >
              <Text style={[styles.libText, only === id && { color: '#fff' }]}>{id ? LIBRARY_NAMES[id] ?? id : t.pictoAllLibraries}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {guess && (showInput || onGuess) ? (
        <View style={styles.guess}>
          <Text style={styles.guessText}>{boardToolsStrings(app.profile.settings.uiLang).didYouMean}</Text>
          <Btn
            small
            kind="primary"
            label={app.profile.settings.uiLang === 'fr' ? `« ${guess} » ?` : app.profile.settings.uiLang === 'ar' ? `«${guess}»؟` : `“${guess}”?`}
            onPress={() => {
              if (controlledQuery === undefined) setOwn(guess);
              onGuess?.(guess);
            }}
          />
        </View>
      ) : null}
      {lib && debounced.trim() && !ids.length ? <Text style={styles.note}>{t.pictoNone}</Text> : null}
      <View style={styles.grid}>
        {ids.map((id) => (
          <PictoThumb key={id} id={id} selected={id === selectedId} onPress={() => onPick(id)} caption={showInput ? captionOf(id) : undefined} wide={showInput} />
        ))}
      </View>
      {showInput && anyAuto && <Text style={styles.note}>* {t.pictoToReview}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: C.textMuted },
  guess: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  guessText: { fontSize: 14, fontWeight: '700', color: C.text },
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
  source: { fontSize: 10, fontWeight: '400', color: C.textMuted },
  libs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lib: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  libOn: { backgroundColor: C.accent, borderColor: C.accent },
  libText: { fontSize: 12, fontWeight: '600', color: C.text },
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
