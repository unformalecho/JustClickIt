import dares from '../data/dares.json';
import facts from '../data/facts.json';
import jokes from '../data/jokes.json';
import riddles from '../data/riddles.json';
import wyr from '../data/wyr.json';
import oracle from '../data/oracle.json';

export interface TextItem {
  id: string;
  text: string;
}
export interface Riddle {
  id: string;
  q: string;
  a: string;
}
export interface WyrPair {
  id: string;
  a: string;
  b: string;
}

export const DARES = dares as TextItem[];
export const FACTS = facts as TextItem[];
export const JOKES = jokes as TextItem[];
export const RIDDLES = riddles as Riddle[];
export const WYR = wyr as WyrPair[];
export const ANSWERS = oracle as TextItem[];
export const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
