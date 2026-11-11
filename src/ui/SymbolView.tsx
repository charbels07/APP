import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { SYMBOL_IMAGES } from '../data/symbolMap';
import { mediaUri } from '../lib/media';
import { pictoImageUriByKey } from '../lib/pictoLibrary';
import type { SymbolRef } from '../model/types';

export function useMediaUri(name: string | undefined): string | undefined {
  const [uri, setUri] = useState<string | undefined>();
  useEffect(() => {
    let alive = true;
    setUri(undefined);
    if (name) mediaUri(name).then((u) => alive && setUri(u));
    return () => {
      alive = false;
    };
  }, [name]);
  return uri;
}

/** A library pictogram that is not one of the built-in pictures: read from the offline library. */
function useLibraryUri(key: string | undefined): string | undefined {
  const [uri, setUri] = useState<string | undefined>();
  useEffect(() => {
    let alive = true;
    setUri(undefined);
    if (key)
      pictoImageUriByKey(key)
        .then((u) => alive && setUri(u))
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  return uri;
}

export const SymbolView = React.memo(function SymbolView({ symbol, size }: { symbol: SymbolRef; size: number }) {
  const media = useMediaUri(symbol.kind === 'media' ? symbol.name : undefined);
  const bundled = symbol.kind === 'picto' ? SYMBOL_IMAGES[symbol.key] : undefined;
  const fromLibrary = useLibraryUri(symbol.kind === 'picto' && !bundled ? symbol.key : undefined);
  if (symbol.kind === 'picto') {
    const source = bundled ?? (fromLibrary ? { uri: fromLibrary } : undefined);
    return source ? (
      <Image source={source} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
    ) : (
      <View style={{ width: size, height: size }} />
    );
  }
  if (symbol.kind === 'media') {
    return media ? (
      <Image source={{ uri: media }} style={{ width: size, height: size, borderRadius: 8 }} resizeMode="cover" />
    ) : (
      <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: '#E4E7EC' }} />
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: Math.round(size * 0.72), lineHeight: Math.round(size * 0.95) }}>{symbol.value}</Text>
    </View>
  );
});
