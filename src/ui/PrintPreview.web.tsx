import React from 'react';
import { View } from 'react-native';

/** Live preview of the printable page (browser demo). */
export function PrintPreview({ html, landscape }: { html: string; landscape: boolean }) {
  const ratio = landscape ? 297 / 210 : 210 / 297;
  return (
    <View style={{ width: '100%', aspectRatio: ratio, maxHeight: 520, alignSelf: 'center', borderWidth: 1, borderColor: '#D5DBE3', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' }}>
      {React.createElement('iframe', {
        title: 'preview',
        srcDoc: html,
        style: { width: '100%', height: '100%', border: 0, background: '#fff' },
      })}
    </View>
  );
}
