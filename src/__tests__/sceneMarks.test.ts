import { containRect, isDoubleTouch, markRadius, sceneSize, SCENE_DEFAULT, SCENE_MAX, SCENE_MIN, stepScene, toggleMark } from '../lib/sceneMarks';

describe('visual scene', () => {
  it('the picture takes a share of the room within bounds; a step at a time', () => {
    expect(sceneSize(undefined)).toBe(SCENE_DEFAULT);
    expect(sceneSize(2)).toBe(SCENE_DEFAULT);
    expect(stepScene(undefined, 1)).toBe(0.4);
    expect(stepScene(0.4, -1)).toBe(0.35);
    expect(stepScene(SCENE_MAX, 1)).toBe(SCENE_MAX);
    expect(stepScene(SCENE_MIN, -1)).toBe(SCENE_MIN);
  });

  it('the picture is drawn whole and centred in its place', () => {
    expect(containRect(400, 400, 800, 400)).toEqual({ x: 0, y: 100, w: 400, h: 200 });
    expect(containRect(300, 200, 0, 0)).toEqual({ x: 0, y: 0, w: 300, h: 200 });
  });

  it('a double touch circles a place; on a circle it removes it', () => {
    let marks = toggleMark([], 100, 50, 400, 200);
    expect(marks).toEqual([{ x: 0.25, y: 0.25 }]);
    marks = toggleMark(marks, 300, 150, 400, 200);
    expect(marks.length).toBe(2);
    expect(toggleMark(marks, 105, 55, 400, 200)).toEqual([{ x: 0.75, y: 0.75 }]);
    expect(markRadius(400, 200)).toBe(26);
  });

  it('two touches close in time and place are a double touch', () => {
    expect(isDoubleTouch({ x: 10, y: 10, at: 1000 }, 15, 12, 1200)).toBe(true);
    expect(isDoubleTouch({ x: 10, y: 10, at: 1000 }, 15, 12, 1500)).toBe(false);
    expect(isDoubleTouch({ x: 10, y: 10, at: 1000 }, 200, 12, 1100)).toBe(false);
    expect(isDoubleTouch(null, 1, 1, 1)).toBe(false);
  });
});
