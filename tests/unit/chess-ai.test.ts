import { describe, expect, it } from 'vitest';
import {
  applyMove,
  boardFromRows,
  gameStatus,
  initialBoard,
  legalMoves,
  type Board,
  type Color,
} from '../../src/games/chess/engine';
import { chooseBestMove, chooseChillMove, chooseMove, evaluate } from '../../src/games/chess/ai';

describe('Chill AI', () => {
  it('always returns a legal move', () => {
    for (let game = 0; game < 20; game++) {
      let board = initialBoard();
      let turn: Color = 'w';
      for (let ply = 0; ply < 40; ply++) {
        const legal = legalMoves(board, turn);
        if (legal.length === 0) break;
        const move = chooseChillMove(board, turn);
        expect(move).not.toBeNull();
        expect(legal).toContainEqual(move);
        board = applyMove(board, move as { from: number; to: number });
        turn = turn === 'w' ? 'b' : 'w';
      }
    }
  });

  it('takes the best capture when one exists', () => {
    // White queen on c3 can take a black rook on c6 (+500) or a black
    // pawn on f3 (+100). Greedy must take the rook.
    const board = boardFromRows(['..r.k.', '......', '......', '..Q..p', '......', '....K.']);
    const move = chooseChillMove(board, 'w');
    expect(move?.captured).toEqual({ type: 'R', color: 'b' });
  });

  it('returns null with no legal moves', () => {
    const board = boardFromRows(['k.....', '.QK...', '......', '......', '......', '......']);
    expect(gameStatus(board, 'b')).toBe('checkmate');
    expect(chooseChillMove(board, 'b')).toBeNull();
  });
});

describe('Unsolvable AI (minimax)', () => {
  it('finds a forced mate in 1', () => {
    // Queen on b4, king on c5: Qb5 is mate (also Qb6). Any mating move counts.
    const board = boardFromRows(['k.....', '..K...', '.Q....', '......', '......', '......']);
    const move = chooseBestMove(board, 'w', 500);
    expect(move).not.toBeNull();
    const next = applyMove(board, move as { from: number; to: number });
    expect(gameStatus(next, 'b')).toBe('checkmate');
  });

  it('picks the clearly best capture', () => {
    const board = boardFromRows(['..r.k.', '......', '......', '..Q..p', '......', '....K.']);
    const move = chooseBestMove(board, 'w', 500);
    expect(move?.captured).toEqual({ type: 'R', color: 'b' });
  });

  it('does not hang the queen for a pawn (sees the recapture)', () => {
    // White queen on d4 can take a black pawn on e4, but the black rook on
    // e6 guards e4: Qxe4 Rxe4 loses the queen for a pawn. The search must
    // not pick it.
    const board = boardFromRows(['....rk', '......', '......', '...Qp.', '......', '....K.']);
    const move = chooseBestMove(board, 'w', 500);
    expect(move).not.toBeNull();
    // Taking the pawn on e4 (square 22) would be the blunder.
    expect(move?.to).not.toBe(22);
  });

  it('returns within its time budget, even a tiny one', () => {
    const board = initialBoard();
    const start = Date.now();
    const move = chooseBestMove(board, 'w', 50);
    const elapsed = Date.now() - start;
    expect(move).not.toBeNull();
    expect(legalMoves(board, 'w')).toContainEqual(move);
    // Generous wall-clock bound: the search must stop, not run away.
    expect(elapsed).toBeLessThan(2000);
  });

  it('returns a legal move even with a 1 ms budget', () => {
    const board = initialBoard();
    const move = chooseBestMove(board, 'w', 1);
    expect(move).not.toBeNull();
    expect(legalMoves(board, 'w')).toContainEqual(move);
  });

  it('evaluates material: up a queen beats even', () => {
    const even = boardFromRows(['rnbqk.', 'pppppp', '......', '......', 'PPPPPP', 'RNBQK.']);
    const upQueen = boardFromRows(['rnb.k.', 'pppppp', '......', '......', 'PPPPPP', 'RNBQK.']);
    expect(evaluate(upQueen, 'w')).toBeGreaterThan(evaluate(even, 'w'));
  });

  it('chooseMove dispatches by mode and never returns an illegal move', () => {
    let board: Board = initialBoard();
    let turn: Color = 'w';
    for (let ply = 0; ply < 12; ply++) {
      const legal = legalMoves(board, turn);
      if (legal.length === 0) break;
      const move = chooseMove(board, turn, ply % 2 === 0 ? 'unsolvable' : 'chill', 100);
      expect(move).not.toBeNull();
      expect(legal).toContainEqual(move);
      board = applyMove(board, move as { from: number; to: number });
      turn = turn === 'w' ? 'b' : 'w';
    }
  });

  it('Unsolvable beats Chill in an engine match (sanity, not luck)', { timeout: 60000 }, () => {
    // Unsolvable as White vs Chill as Black, 60 ms/move. Unsolvable
    // should never lose; Chill's randomness loses material constantly.
    let wins = 0;
    let losses = 0;
    let draws = 0;
    for (let game = 0; game < 6; game++) {
      let board = initialBoard();
      let turn: Color = 'w';
      let result: 'win' | 'loss' | 'draw' = 'draw';
      for (let ply = 0; ply < 100; ply++) {
        const status = gameStatus(board, turn);
        if (status === 'checkmate') {
          result = turn === 'b' ? 'win' : 'loss';
          break;
        }
        if (status === 'stalemate') {
          result = 'draw';
          break;
        }
        const move = turn === 'w' ? chooseBestMove(board, 'w', 60) : chooseChillMove(board, 'b');
        if (!move) {
          result = 'draw';
          break;
        }
        board = applyMove(board, move);
        turn = turn === 'w' ? 'b' : 'w';
      }
      if (result === 'win') wins++;
      else if (result === 'loss') losses++;
      else draws++;
    }
    expect(losses).toBe(0);
    expect(wins + draws).toBe(6);
  });
});
