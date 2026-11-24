import type { LocalStateV1 } from './schema';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Progress 0..1 (1 = complete) for the Achievements view. */
  progress: (s: LocalStateV1) => number;
  unlocked: (s: LocalStateV1) => boolean;
}

function triedCount(s: LocalStateV1): number {
  return Object.keys(s.tried).length;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-click',
    name: 'First Click',
    description: 'Click the big button for the first time.',
    icon: '👆',
    progress: (s) => (s.clicks >= 1 ? 1 : 0),
    unlocked: (s) => s.clicks >= 1,
  },
  {
    id: 'explorer-4',
    name: 'Explorer',
    description: 'Try 4 different distractions.',
    icon: '🧭',
    progress: (s) => Math.min(1, triedCount(s) / 4),
    unlocked: (s) => triedCount(s) >= 4,
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Try all 8 distractions.',
    icon: '🏆',
    progress: (s) => Math.min(1, triedCount(s) / 8),
    unlocked: (s) => triedCount(s) >= 8,
  },
  {
    id: 'lightning',
    name: 'Lightning',
    description: 'Reaction Test best under 180 ms.',
    icon: '⚡',
    progress: (s) => (s.best.reactionMs !== null && s.best.reactionMs < 180 ? 1 : 0),
    unlocked: (s) => s.best.reactionMs !== null && s.best.reactionMs < 180,
  },
  {
    id: 'fast-fingers',
    name: 'Fast Fingers',
    description: 'Tap Rush: 70 taps or more in 10 seconds.',
    icon: '🖐️',
    progress: (s) => Math.min(1, (s.best.tapRush ?? 0) / 70),
    unlocked: (s) => (s.best.tapRush ?? 0) >= 70,
  },
  {
    id: 'echo-8',
    name: 'Echo Master',
    description: 'Memory Echo: reach level 8.',
    icon: '🔢',
    progress: (s) => Math.min(1, s.best.memoryLevel / 8),
    unlocked: (s) => s.best.memoryLevel >= 8,
  },
  {
    id: 'lucky-guesser',
    name: 'Lucky Guesser',
    description: 'Guess the Number in 4 guesses or fewer.',
    icon: '🔮',
    progress: (s) => (s.best.guessFewest !== null && s.best.guessFewest <= 4 ? 1 : 0),
    unlocked: (s) => s.best.guessFewest !== null && s.best.guessFewest <= 4,
  },
  {
    id: 'beatmaker',
    name: 'Beatmaker',
    description: 'Play the Beat Pad 10 times, or start Auto-beat 5 times.',
    icon: '🥁',
    progress: (s) =>
      Math.max(Math.min(1, s.counts.beatHits / 10), Math.min(1, s.counts.beatAutoStarts / 5)),
    unlocked: (s) => s.counts.beatHits >= 10 || s.counts.beatAutoStarts >= 5,
  },
  {
    id: 'oracle-believer',
    name: 'Oracle Believer',
    description: 'Ask The Oracle 10 times.',
    icon: '🪙',
    progress: (s) => Math.min(1, s.counts.oracleAsks / 10),
    unlocked: (s) => s.counts.oracleAsks >= 10,
  },
  {
    id: 'streak-3',
    name: '3-Day Streak',
    description: 'Come back 3 days in a row.',
    icon: '🔥',
    progress: (s) => Math.min(1, Math.max(s.streak.count, s.streak.best) / 3),
    unlocked: (s) => Math.max(s.streak.count, s.streak.best) >= 3,
  },
  {
    id: 'streak-7',
    name: '7-Day Streak',
    description: 'Come back 7 days in a row.',
    icon: '🔥',
    progress: (s) => Math.min(1, Math.max(s.streak.count, s.streak.best) / 7),
    unlocked: (s) => Math.max(s.streak.count, s.streak.best) >= 7,
  },
];

/**
 * Check all achievements against the current state. Unlocks newly earned ones
 * (writing the unlock date into state) and returns their definitions, in
 * definition order. Already-unlocked achievements are never returned again.
 */
export function checkAchievements(state: LocalStateV1): AchievementDef[] {
  const newly: AchievementDef[] = [];
  const now = new Date().toISOString();
  for (const def of ACHIEVEMENTS) {
    if (state.achievements[def.id]) continue;
    if (def.unlocked(state)) {
      state.achievements[def.id] = now;
      newly.push(def);
    }
  }
  return newly;
}
