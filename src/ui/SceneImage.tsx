import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SYMBOL_IMAGES } from '../data/symbolMap';
import { pictoImageUriByKey } from '../lib/pictoLibrary';
import { containRect, isDoubleTouch, markRadius, type Mark } from '../lib/sceneMarks';
import type { SymbolRef } from '../model/types';
import { useMediaUri } from './SymbolView';

/**
 * The big picture of a visual scene (beside an activity board): a photo or a pictogram, as large
 * as its place allows and never cut (the whole picture stays visible). With `onDoubleTouch`, two
 * touches on a place of the picture draw a circle around it (`marks`, kept by the screen).
 */
export function SceneImage({
  image,
  label,
  style,
  marks,
  onDoubleTouch,
}: {
  image: SymbolRef;
  label: string;
  style?: StyleProp<ViewStyle>;
  marks?: Mark[];
  /** A double touch at (x, y) on the picture drawn w × h. */
  onDoubleTouch?: (x: number, y: number, w: number, h: number) => void;
}) {
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
  const source = image.kind === 'media' ? (media ? { uri: media } : undefined) : image.kind === 'picto' ? bundled ?? (fromLibrary ? { uri: fromLibrary } : undefined) : undefined;

  // The picture's own size, to know where it is drawn inside its place (and where the circles go).
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const uri = source && typeof source === 'object' && 'uri' in source ? (source as { uri: string }).uri : undefined;
  useEffect(() => {
    let alive = true;
    setNatural(null);
    if (typeof bundled === 'number') {
      const a = Image.resolveAssetSource(bundled);
      if (a?.width && a?.height) setNatural({ w: a.width, h: a.height });
    } else if (uri)
      Image.getSize(
        uri,
        (w, h) => alive && setNatural({ w, h }),
        () => {},
      );
    return () => {
      alive = false;
    };
  }, [uri, bundled]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - box.w) > 1 || Math.abs(height - box.h) > 1) setBox({ w: width, h: height });
  };
  const rect = natural ? containRect(box.w, box.h, natural.w, natural.h) : { x: 0, y: 0, w: box.w, h: box.h };
  const last = useRef<{ x: number; y: number; at: number } | null>(null);

  return (
    <View style={style} onLayout={onLayout}>
      {image.kind === 'emoji' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 160 }}>{image.value}</Text>
        </View>
      ) : source ? (
        <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : null}
      {box.w > 0 && (
        <View
          style={[
            { position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h },
            Platform.OS === 'web' && onDoubleTouch ? ({ touchAction: 'manipulation', cursor: 'pointer' } as object) : null,
          ]}
          accessibilityRole="image"
          accessibilityLabel={label}
          onStartShouldSetResponder={() => !!onDoubleTouch}
          onResponderRelease={(e) => {
            if (!onDoubleTouch) return;
            const { locationX: x, locationY: y } = e.nativeEvent;
            const now = Date.now();
            if (isDoubleTouch(last.current, x, y, now)) {
              last.current = null;
              onDoubleTouch(x, y, rect.w, rect.h);
            } else last.current = { x, y, at: now };
          }}
        >
          {marks && marks.length > 0 && (
            <Svg width={rect.w} height={rect.h} pointerEvents="none">
              {marks.map((m, i) => (
                <React.Fragment key={i}>
                  {/* A white ring under the red one: the circle is seen on a dark or a red picture too. */}
                  <Circle cx={m.x * rect.w} cy={m.y * rect.h} r={markRadius(rect.w, rect.h)} stroke="#FFFFFF" strokeWidth={9} fill="none" />
                  <Circle cx={m.x * rect.w} cy={m.y * rect.h} r={markRadius(rect.w, rect.h)} stroke="#D92D20" strokeWidth={5} fill="none" />
                </React.Fragment>
              ))}
            </Svg>
          )}
        </View>
      )}
    </View>
  );
}
