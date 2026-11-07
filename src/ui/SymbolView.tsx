import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { ARASAAC_IMAGES } from '../data/arasaacMap';
import { mediaUri } from '../lib/media';
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

export const arasaacUrl = (id: number) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;

export const SymbolView = React.memo(function SymbolView({ symbol, size }: { symbol: SymbolRef; size: number }) {
  const media = useMediaUri(symbol.kind === 'media' ? symbol.name : undefined);
  if (symbol.kind === 'arasaac') {
    const local = ARASAAC_IMAGES[symbol.id];
    return (
      <Image
        source={local ?? { uri: arasaacUrl(symbol.id) }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
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
