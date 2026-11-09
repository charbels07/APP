import { createDefaultProfile } from '../data/defaults';
import { applyAnswers, emptyAnswers, recommendedLevel, wordsAtLevel } from '../lib/onboarding';

describe('set-up journey → first board', () => {
  it('recommends fewer words for a child new to AAC, the full board for an app user', () => {
    expect(recommendedLevel({ speech: 'none', aacBefore: 'new' })).toBe(1);
    expect(recommendedLevel({ speech: 'some_words', aacBefore: 'unsure' })).toBe(1);
    expect(recommendedLevel({ speech: 'speech_support', aacBefore: 'new' })).toBe(2);
    expect(recommendedLevel({ speech: 'none', aacBefore: 'cards' })).toBe(2);
    expect(recommendedLevel({ speech: 'none', aacBefore: 'app' })).toBe(3);
  });

  it('shows about 25, 60 and 84 words at the three levels', () => {
    const p = createDefaultProfile();
    const [a, b, c] = [1, 2, 3].map((l) => wordsAtLevel(p, l as 1 | 2 | 3));
    expect(a).toBeGreaterThanOrEqual(20);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('applies the answers without moving any core word', () => {
    const base = createDefaultProfile();
    const answers = {
      ...emptyAnswers('fr'),
      name: 'Adam',
      langs: ['ar', 'fr'] as ('ar' | 'fr')[],
      gender: 'm' as const,
      voiceKind: 'm' as const,
      speech: 'none' as const,
      aacBefore: 'new' as const,
      activities: ['music', 'swing'],
      feedback: 'reduced' as const,
      visual: 'contrast' as const,
      access: 'hold' as const,
      holdTime: 1.5,
    };
    const p = applyAnswers(base, answers, [{ id: 'c_tata', label: 'Tata Rita' }]);
    expect(p.settings).toMatchObject({
      lang: 'ar',
      langs: ['ar', 'fr'],
      voiceKind: 'm',
      revealLevel: 1,
      visual: 'contrast',
      reduceMotion: true,
      wiggle: false,
      access: 'hold',
      holdTime: 1.5,
    });
    expect(p.boards.core).toEqual(base.boards.core);
    expect(p.boards.mine.cells.filter(Boolean).map((c) => c!.concept)).toEqual(['music', 'swing', 'c_tata']);
    expect(p.customConcepts.c_tata.labels.fr).toBe('Tata Rita');
    expect(p.guide).toMatchObject({ openOnStart: true, tailored: { newToAac: true } });
  });
});
