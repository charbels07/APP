import { addLine, clear, EMPTY_WHITEBOARD, ERASER_FACTOR, extend, linePath, newLine, redo, undo, WB_COLORS, WB_SIZES } from '../lib/whiteboard';

describe('whiteboard', () => {
  it('draws with the colour and thickness chosen, and the eraser is wider and white', () => {
    const pen = newLine({ ...EMPTY_WHITEBOARD, color: 'red', size: 2 }, 10, 20);
    expect(pen).toEqual({ points: [10, 20], color: WB_COLORS.red, width: WB_SIZES[2] });
    const rub = newLine({ ...EMPTY_WHITEBOARD, tool: 'eraser', size: 1 }, 0, 0);
    expect(rub.erase).toBe(true);
    expect(rub.color).toBe('#FFFFFF');
    expect(rub.width).toBe(Math.round(WB_SIZES[1] * ERASER_FACTOR));
  });

  it('keeps lighter lines (points closer than 2 px are skipped) and a touch leaves a dot', () => {
    const l = newLine(EMPTY_WHITEBOARD, 0, 0);
    expect(extend(l, 1, 1)).toBe(false);
    expect(extend(l, 5, 0)).toBe(true);
    expect(l.points).toEqual([0, 0, 5, 0]);
    expect(linePath([3, 4])).toBe('M3.0 4.0 L3.1 4.0');
    expect(linePath([0, 0, 5, 0])).toBe('M0.0 0.0 L5.0 0.0');
  });

  it('undo, redo, and a new line forgets what redo could bring back', () => {
    const a = newLine(EMPTY_WHITEBOARD, 0, 0);
    const b = newLine(EMPTY_WHITEBOARD, 9, 9);
    let wb = addLine(addLine(EMPTY_WHITEBOARD, a), b);
    wb = undo(wb);
    expect(wb.lines).toEqual([a]);
    wb = redo(wb);
    expect(wb.lines).toEqual([a, b]);
    wb = addLine(undo(wb), a);
    expect(wb.undone).toEqual([]);
    expect(undo(EMPTY_WHITEBOARD)).toBe(EMPTY_WHITEBOARD);
  });

  it('"Clear the drawing" empties the paper and keeps the tools chosen', () => {
    const wb = clear(addLine({ ...EMPTY_WHITEBOARD, color: 'blue', background: 'grid' }, newLine(EMPTY_WHITEBOARD, 1, 1)));
    expect(wb).toMatchObject({ lines: [], undone: [], color: 'blue', background: 'grid' });
  });
});

describe('pictures on the whiteboard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const w = require('../lib/whiteboard') as typeof import('../lib/whiteboard');
  const area = { w: 1000, h: 600 };
  const withPic = () => w.addPicture(w.EMPTY_WHITEBOARD, 'https://example.org/cat.png', { width: 800, height: 400 }, area);

  it('a new picture is centred, at most 60 % of the area, its proportions kept, and chosen', () => {
    const wb = withPic();
    const p = wb.pictures[0];
    expect(p).toMatchObject({ w: 600, h: 300, x: 200, y: 150, opacity: 1 });
    expect(wb.selected).toBe(p.id);
  });

  it('bigger, smaller (around its middle), see-through, moved, removed', () => {
    let wb = withPic();
    const id = wb.selected;
    wb = w.resizePicture(wb, id, 2);
    expect(wb.pictures[0]).toMatchObject({ w: 1200, h: 600, x: -100, y: 0 });
    wb = w.setPictureOpacity(wb, id, 0.5);
    expect(wb.pictures[0].opacity).toBe(0.5);
    wb = w.movePicture(wb, id, 5000, 10, area);
    expect(wb.pictures[0].x).toBe(area.w - 30); // a corner stays inside
    expect(w.pictureAt(wb, area.w - 10, 20)?.id).toBe(id);
    wb = w.removePicture({ ...wb, tool: 'move' }, id);
    expect(wb.pictures).toEqual([]);
    expect(wb.tool).toBe('pen');
    expect(wb.selected).toBeUndefined();
  });

  it('"Clear the drawing" keeps the pictures; the eraser rubs out only the ink before it', () => {
    const pen = w.newLine(w.EMPTY_WHITEBOARD, 0, 0);
    const rub = w.newLine({ ...w.EMPTY_WHITEBOARD, tool: 'eraser' }, 0, 0);
    const later = w.newLine(w.EMPTY_WHITEBOARD, 5, 5);
    const wb = w.addLine(withPic(), pen);
    expect(w.clear(wb).pictures.length).toBe(1);
    expect(w.inkLayers([pen, rub, rub, later])).toEqual([
      { pens: [pen], erasers: [rub, rub] },
      { pens: [later], erasers: [] },
    ]);
  });
});
