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
