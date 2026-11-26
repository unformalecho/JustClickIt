/**
 * Mini Chess AI — two modes.
 *
 * Chill (default): greedy. Take the best capture when one exists (highest
 * captured value, random tie-break); otherwise a random legal move.
 *
 * Unsolvable: minimax with alpha-beta pruning, iterative deepening under a
 * time budget (default ~1s), captures-first move ordering, and a
 * material + piece-square-table evaluation that prefers the fastest mate.
 * Strong enough that a casual player effectively cannot win — that is the
 * joke. The search never exceeds its time budget: it checks the deadline
 * on an adaptive interval (starting every 256 nodes, tightening when
 * nodes are slow) and returns the best move from the last completed depth.
 */

import {
  PIECE_VALUES,
  applyMove,
  colOf,
  isInCheck,
  legalMoves,
  opposite,
  rowOf,
  type Board,
  type Color,
  type Move,
  type PieceType,
} from './engine';
import { pick } from '../../lib/random';

export type AiMode = 'chill' | 'unsolvable';

/** Mate scores live far above any material score (max material is ~3200). */
const MATE_SCORE = 100000;

/**
 * Piece-square tables, from White's perspective (row 0 = rank 6, the top of
 * the board). Black mirrors them vertically. Values are small nudges on top
 * of material: center control, pawn advancement, king safety on the home rank.
 */
const PST: Record<PieceType, number[]> = {
  P: [
    0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 10, 10, 20, 20, 10, 10, 5, 5, 10, 10, 5, 5, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  N: [
    -20, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, -10, -10, 0, 10, 10, 0, -10, -10, 0, 10, 10, 0,
    -10, -10, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -20,
  ],
  B: [
    -10, 0, 0, 0, 0, -10, 0, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 0, 0,
    10, 0, -10, 0, 0, 0, 0, -10,
  ],
  R: [
    0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
  ],
  Q: [
    -10, -5, -5, -5, -5, -10, -5, 0, 0, 0, 0, -5, -5, 0, 5, 5, 0, -5, -5, 0, 5, 5, 0, -5, -5, 0, 0,
    0, 0, -5, -10, -5, -5, -5, -5, -10,
  ],
  K: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 0, 0, 10, 10,
    20, 20, 0, 0, 20, 20,
  ],
};

function pstValue(type: PieceType, color: Color, sq: number): number {
  const table = PST[type] as number[];
  if (color === 'w') return table[sq] as number;
  const mirrored = (5 - rowOf(sq)) * 6 + colOf(sq);
  return table[mirrored] as number;
}

/** Static evaluation from `color`'s point of view (positive = good for color). */
export function evaluate(board: Board, color: Color): number {
  let score = 0;
  for (let sq = 0; sq < 36; sq++) {
    const piece = board[sq];
    if (!piece) continue;
    const value = PIECE_VALUES[piece.type] + pstValue(piece.type, piece.color, sq);
    score += piece.color === color ? value : -value;
  }
  return score;
}

/** MVV-LVA ordering: best captures first, promotions next. */
function moveOrderScore(move: Move, board: Board): number {
  let score = 0;
  if (move.captured) {
    const victim = PIECE_VALUES[move.captured.type];
    const attacker = PIECE_VALUES[(board[move.from] as { type: PieceType }).type];
    score += 10 * victim - attacker / 10;
  }
  if (move.promotion) score += 900;
  return score;
}

function orderMoves(moves: Move[], board: Board): Move[] {
  return [...moves].sort((a, b) => moveOrderScore(b, board) - moveOrderScore(a, board));
}

/** Greedy: best capture (random tie-break), else a random legal move. */
export function chooseChillMove(board: Board, color: Color): Move | null {
  const moves = legalMoves(board, color);
  if (moves.length === 0) return null;
  const captures = moves.filter((m) => m.captured);
  if (captures.length > 0) {
    const best = Math.max(
      ...captures.map((m) => PIECE_VALUES[(m.captured as { type: PieceType }).type]),
    );
    return pick(
      captures.filter((m) => PIECE_VALUES[(m.captured as { type: PieceType }).type] === best),
    );
  }
  return pick(moves);
}

interface SearchState {
  nodes: number;
  deadline: number;
  aborted: boolean;
  /**
   * Nodes between deadline checks. Starts at 256 and adapts to node speed:
   * when checks are slow (slow CPU) it halves toward 32 so the budget is
   * never overshot by much; when checks are cheap it doubles toward 2048
   * to keep the Date.now() overhead negligible.
   */
  checkEvery: number;
  lastCheckAt: number;
}

function negamax(
  board: Board,
  color: Color,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  state: SearchState,
): number {
  if (state.nodes % state.checkEvery === 0) {
    const now = Date.now();
    const elapsed = now - state.lastCheckAt;
    state.lastCheckAt = now;
    if (elapsed > 25 && state.checkEvery > 32)
      state.checkEvery = Math.max(32, state.checkEvery >> 1);
    else if (elapsed < 5 && state.checkEvery < 2048)
      state.checkEvery = Math.min(2048, state.checkEvery << 1);
    if (now >= state.deadline) {
      state.aborted = true;
      return 0;
    }
  }
  state.nodes++;

  // Leaf node: static evaluation only. Generating legal moves here (as the
  // old code did) wasted the whole move generation on a node whose moves
  // are never used. Mate/stalemate is still detected at depth >= 1, where
  // moves are generated anyway, so forced mates are found from depth 2 up.
  if (depth <= 0) return evaluate(board, color);

  const moves = legalMoves(board, color);
  if (moves.length === 0) {
    // Checkmate: sooner is worse for the side to move (prefer the fastest
    // mate when winning, the slowest when losing). Stalemate is a draw.
    return isInCheck(board, color) ? -(MATE_SCORE - ply) : 0;
  }

  const ordered = orderMoves(moves, board);
  let best = -Infinity;
  for (const move of ordered) {
    const score = -negamax(
      applyMove(board, move),
      opposite(color),
      depth - 1,
      -beta,
      -alpha,
      ply + 1,
      state,
    );
    if (state.aborted) return 0;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Minimax with alpha-beta pruning and iterative deepening. Returns the best
 * move from the last fully completed depth; when the time budget runs out
 * mid-depth, the previous depth's move stands. Always returns a legal move
 * (the best capture-first guess when even depth 1 cannot finish).
 */
export function chooseBestMove(board: Board, color: Color, timeBudgetMs = 1000): Move | null {
  const moves = orderMoves(legalMoves(board, color), board);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0] as Move;

  const now = Date.now();
  const state: SearchState = {
    nodes: 0,
    deadline: now + Math.max(1, timeBudgetMs),
    aborted: false,
    checkEvery: 256,
    lastCheckAt: now,
  };
  let bestMove = moves[0] as Move;
  for (let depth = 1; depth <= 20; depth++) {
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let depthBest = moves[0] as Move;
    for (const move of moves) {
      const score = -negamax(
        applyMove(board, move),
        opposite(color),
        depth - 1,
        -Infinity,
        -alpha,
        1,
        state,
      );
      if (state.aborted) break;
      if (score > bestScore) {
        bestScore = score;
        depthBest = move;
      }
      if (score > alpha) alpha = score;
    }
    if (state.aborted) break;
    bestMove = depthBest;
    // A forced mate is found: deeper search cannot improve on it.
    if (bestScore >= MATE_SCORE - 1000) break;
    if (Date.now() >= state.deadline) break;
  }
  return bestMove;
}

/** Pick a move for `color` in the given mode. Never returns an illegal move. */
export function chooseMove(
  board: Board,
  color: Color,
  mode: AiMode,
  timeBudgetMs = 1000,
): Move | null {
  return mode === 'unsolvable'
    ? chooseBestMove(board, color, timeBudgetMs)
    : chooseChillMove(board, color);
}
