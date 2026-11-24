import React, { useEffect, useState } from 'react';
import { Image, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SYMBOL_IMAGES } from '../data/symbolMap';
import { pictoImageUriByKey } from '../lib/pictoLibrary';
import type { SymbolRef } from '../model/types';
import { useMediaUri } from './SymbolView';

/**
 * The big picture of a visual scene (beside an activity board): a photo or a pictogram, as large
 * as its place allows and never cut (the whole picture stays visible).
 */
export function SceneImage({ image, label, style }: { image: SymbolRef; label: string; style?: StyleProp<ViewStyle> }) {
  const media = useMediaUri(image.kind === 'media' ? image.name : undefined);
  const bundled = image.kind === 'picto' ? SYMBOL_IMAGES[image.key] : undefined;
  const [fromLibrary, setFromLibrary] = useState<string | undefined>();
  const key = image.kind === 'picto' && !bundled ? image.key : undefined;
  useEffect(() => {
    let alive = true;
    setFromLibrary(undefined);
    if (key)
      pictoImageUriByKey(key)
        .then((u) => alive && setFromLibrary(u))
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  if (image.kind === 'emoji')
    return (
      <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]} accessibilityRole="image" accessibilityLabel={label}>
        <Text style={{ fontSize: 160 }}>{image.value}</Text>
      </View>
    );
  const source = image.kind === 'media' ? (media ? { uri: media } : undefined) : bundled ?? (fromLibrary ? { uri: fromLibrary } : undefined);
  return (
    <View style={style}>
      {source ? (
        <Image
          source={source}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={label}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}
