import React from 'react';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

const P = (d: string) => <Path d={d} />;

const ICONS = {
  home: <>{P('M3 10.5 12 3l9 7.5')}{P('M5 9.5V21h14V9.5')}{P('M9.5 21v-6h5v6')}</>,
  grid: (
    <>
      <Rect x={3} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={14} width={7} height={7} rx={1} />
      <Rect x={3} y={14} width={7} height={7} rx={1} />
    </>
  ),
  calendar: (
    <>
      <Rect x={3} y={4} width={18} height={18} rx={2} />
      {P('M16 2v4M8 2v4M3 10h18')}
      {P('m9 16 2 2 4-4')}
    </>
  ),
  timer: (
    <>
      <Circle cx={12} cy={13} r={8} />
      {P('M12 9v4l2.5 2.5')}
      {P('M10 2h4')}
    </>
  ),
  help: (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Circle cx={12} cy={12} r={4} />
      {P('m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24')}
    </>
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={7} />
      {P('m21 21-4.3-4.3')}
    </>
  ),
  keyboard: (
    <>
      <Rect x={2} y={5} width={20} height={14} rx={2} />
      {P('M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12.5h.01M10 12.5h.01M14 12.5h.01M18 12.5h.01M7 16h10')}
    </>
  ),
  globe: (
    <>
      <Circle cx={12} cy={12} r={10} />
      {P('M2 12h20')}
      {P('M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z')}
    </>
  ),
  lock: (
    <>
      <Rect x={4} y={11} width={16} height={10} rx={2} />
      {P('M8 11V7a4 4 0 0 1 8 0v4')}
    </>
  ),
  unlock: (
    <>
      <Rect x={4} y={11} width={16} height={10} rx={2} />
      {P('M8 11V7a4 4 0 0 1 7.9-1')}
    </>
  ),
  backspace: <>{P('M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z')}{P('M18 9l-6 6M12 9l6 6')}</>,
  x: P('M18 6 6 18M6 6l12 12'),
  volume: <>{P('M11 5 6 9H2v6h4l5 4V5z')}{P('M15.5 8.5a5 5 0 0 1 0 7')}{P('M19 5a10 10 0 0 1 0 14')}</>,
  play: <Polygon points="6 3 20 12 6 21 6 3" />,
  pause: (
    <>
      <Rect x={6} y={4} width={4} height={16} rx={1} />
      <Rect x={14} y={4} width={4} height={16} rx={1} />
    </>
  ),
  chevronLeft: P('m15 18-6-6 6-6'),
  chevronRight: P('m9 18 6-6-6-6'),
  plus: P('M12 5v14M5 12h14'),
  minus: P('M5 12h14'),
  trash: <>{P('M3 6h18')}{P('M8 6V4h8v2')}{P('M19 6l-1 14H6L5 6')}</>,
  printer: (
    <>
      {P('M6 9V2h12v7')}
      <Rect x={6} y={14} width={12} height={8} />
      {P('M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2')}
    </>
  ),
  settings: P('M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4'),
  check: P('M20 6 9 17l-5-5'),
  arrowUp: P('M12 19V5M5 12l7-7 7 7'),
  arrowDown: P('M12 5v14M19 12l-7 7-7-7'),
  mic: (
    <>
      <Rect x={9} y={2} width={6} height={12} rx={3} />
      {P('M19 10v2a7 7 0 0 1-14 0v-2M12 19v3')}
    </>
  ),
  image: (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Circle cx={9} cy={9} r={2} />
      {P('m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21')}
    </>
  ),
  camera: (
    <>
      {P('M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z')}
      <Circle cx={12} cy={13} r={3} />
    </>
  ),
  pencil: P('M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'),
  external: <>{P('M15 3h6v6')}{P('M10 14 21 3')}{P('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6')}</>,
  link: <>{P('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71')}{P('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71')}</>,
  clipboard: <>{P('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2')}{P('M9 2h6v4H9z')}</>,
  undo: <>{P('M3 7v6h6')}{P('M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13')}</>,
  star: <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  download: <>{P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4')}{P('M7 10l5 5 5-5')}{P('M12 15V3')}</>,
  list: P('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  pointer: (
    <>
      {P('M22 14a8 8 0 0 1-8 8')}
      {P('M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2')}
      {P('M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1')}
      {P('M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10')}
      {P('M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15')}
    </>
  ),
  record: <Circle cx={12} cy={12} r={7} />,
  target: (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Circle cx={12} cy={12} r={6} />
      <Circle cx={12} cy={12} r={2} />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 24,
  color = '#1B2430',
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </Svg>
  );
}
