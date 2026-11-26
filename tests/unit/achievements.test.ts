import { describe, expect, it } from 'vitest';
import { defaultState } from '../../src/lib/store/schema';
import { ACHIEVEMENTS, checkAchievements } from '../../src/lib/store/achievements';

function stateWith(patch: (s: ReturnType<typeof defaultState>) => void) {
  const s = defaultState();
  patch(s);
  return s;
}

describe('achievements', () => {
  it('defines 12 achievements with unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('first-click');
    expect(ids).toContain('completionist');
    expect(ids).toContain('chess-master');
    expect(ids).toContain('streak-7');
  });

  it('unlocks first-click on the first click', () => {
    const s = stateWith((x) => {
      x.clicks = 1;
    });
    const newly = checkAchievements(s);
    expect(newly.map((a) => a.id)).toContain('first-click');
    expect(s.achievements['first-click']).toBeTruthy();
  });

  it('never re-reports an already unlocked achievement', () => {
    const s = stateWith((x) => {
      x.clicks = 5;
    });
    expect(checkAchievements(s).map((a) => a.id)).toContain('first-click');
    expect(checkAchievements(s)).toEqual([]);
  });

  it('unlocks explorer-4 and completionist at the right tried counts', () => {
    const four = stateWith((x) => {
      x.tried = { dare: true, snack: true, reaction: true, taprush: true };
    });
    expect(checkAchievements(four).map((a) => a.id)).toContain('explorer-4');
    expect(checkAchievements(four).map((a) => a.id)).not.toContain('completionist');

    const all = stateWith((x) => {
      x.tried = {
        dare: true,
        snack: true,
        reaction: true,
        taprush: true,
        beat: true,
        memory: true,
        guess: true,
        oracle: true,
        chess: true,
      };
    });
    expect(checkAchievements(all).map((a) => a.id)).toContain('completionist');
  });

  it('chess-master unlocks on the first Mini Chess win', () => {
    const s = stateWith((x) => {
      x.counts.chessWins = 1;
    });
    expect(checkAchievements(s).map((a) => a.id)).toContain('chess-master');
    const none = stateWith((x) => {
      x.counts.chessWins = 0;
    });
    expect(checkAchievements(none).map((a) => a.id)).not.toContain('chess-master');
  });

  it('lightning needs reaction < 180ms (180 itself does not count)', () => {
    const fast = stateWith((x) => {
      x.best.reactionMs = 179;
    });
    expect(checkAchievements(fast).map((a) => a.id)).toContain('lightning');
    const edge = stateWith((x) => {
      x.best.reactionMs = 180;
    });
    expect(checkAchievements(edge).map((a) => a.id)).not.toContain('lightning');
  });

  it('fast-fingers needs >= 70 taps', () => {
    const s = stateWith((x) => {
      x.best.tapRush = 70;
    });
    expect(checkAchievements(s).map((a) => a.id)).toContain('fast-fingers');
  });

  it('echo-8, lucky-guesser, beatmaker, oracle-believer unlock on their counters', () => {
    const s = stateWith((x) => {
      x.best.memoryLevel = 8;
      x.best.guessFewest = 4;
      x.counts.beatHits = 10;
      x.counts.oracleAsks = 10;
    });
    const ids = checkAchievements(s).map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining(['echo-8', 'lucky-guesser', 'beatmaker', 'oracle-believer']),
    );
    const auto = stateWith((x) => {
      x.counts.beatAutoStarts = 5;
    });
    expect(checkAchievements(auto).map((a) => a.id)).toContain('beatmaker');
  });

  it('streak achievements use the best streak, not just the current one', () => {
    const s = stateWith((x) => {
      x.streak = { lastVisit: '2026-11-25', count: 1, best: 7 };
    });
    const ids = checkAchievements(s).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['streak-3', 'streak-7']));
  });
});
