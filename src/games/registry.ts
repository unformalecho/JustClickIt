import { dareGame } from './dare';
import { snackGame } from './snack';
import { reactionGame } from './reaction';
import { tapRushGame } from './taprush';
import { beatGame } from './beat';
import { memoryGame } from './memory';
import { guessGame } from './guess';
import { oracleGame } from './oracle';
import type { GameDef } from './types';

export const ACTIVITIES: GameDef[] = [
  dareGame,
  snackGame,
  reactionGame,
  tapRushGame,
  beatGame,
  memoryGame,
  guessGame,
  oracleGame,
];

export function getActivity(id: string): GameDef | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}
