/**
 * The words every activity board (TLA) carries, whatever its topic (TLA-01, TLA-02): a small
 * block of core words, and four communication words (comment, turns, ask).
 * They take the first places of their kind's column, so they are found at the same height on
 * every activity board.
 */
export const TLA_CORE: string[][] = [
  ['i', 'want'],
  ['you', 'like'],
  ['more', 'not'],
  ['done', 'stop'],
  ['help_me', 'what'],
];

export const TLA_FUNCTIONS = ['look_at', 'my_turn', 'i_like_it', 'where'];
