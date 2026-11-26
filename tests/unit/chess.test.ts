import { describe, expect, it } from 'vitest';
import {
  applyMove,
  boardFromRows,
  capturedPieces,
  findKing,
  gameStatus,
  initialBoard,
  isInCheck,
  isSquareAttacked,
  legalMoves,
  pieceGlyph,
  square,
  squareName,
  type Board,
} from '../../src/games/chess/engine';

describe('initial position', () => {
  it('sets up 12 pieces per side: back rank R-N-B-Q-K-R, 6 pawns', () => {
    const board = initialBoard();
    const pieces = board.filter((p) => p !== null);
    expect(pieces).toHaveLength(24);
    expect(pieces.filter((p) => p?.color === 'w')).toHaveLength(12);
    expect(pieces.filter((p) => p?.color === 'b')).toHaveLength(12);
    // Back ranks.
    expect(board[square(0, 0)]).toEqual({ type: 'R', color: 'b' });
    expect(board[square(0, 1)]).toEqual({ type: 'N', color: 'b' });
    expect(board[square(0, 2)]).toEqual({ type: 'B', color: 'b' });
    expect(board[square(0, 3)]).toEqual({ type: 'Q', color: 'b' });
    expect(board[square(0, 4)]).toEqual({ type: 'K', color: 'b' });
    expect(board[square(0, 5)]).toEqual({ type: 'R', color: 'b' });
    expect(board[square(5, 4)]).toEqual({ type: 'K', color: 'w' });
    // Pawn ranks.
    for (let col = 0; col < 6; col++) {
      expect(board[square(1, col)]).toEqual({ type: 'P', color: 'b' });
      expect(board[square(4, col)]).toEqual({ type: 'P', color: 'w' });
    }
    // Middle is empty.
    for (let row = 2; row <= 3; row++) {
      for (let col = 0; col < 6; col++) expect(board[square(row, col)]).toBeNull();
    }
  });

  it('gives White 8 legal moves (6 pawns + 2 knight jumps)', () => {
    const moves = legalMoves(initialBoard(), 'w');
    expect(moves).toHaveLength(8);
    expect(legalMoves(initialBoard(), 'b')).toHaveLength(8);
  });

  it('names squares a6 (top-left) to f1 (bottom-right)', () => {
    expect(squareName(0)).toBe('a6');
    expect(squareName(5)).toBe('f6');
    expect(squareName(30)).toBe('a1');
    expect(squareName(35)).toBe('f1');
  });

  it('uses outline glyphs for White and filled glyphs for Black', () => {
    expect(pieceGlyph({ type: 'K', color: 'w' })).toBe('♔');
    expect(pieceGlyph({ type: 'Q', color: 'w' })).toBe('♕');
    expect(pieceGlyph({ type: 'K', color: 'b' })).toBe('♚');
    expect(pieceGlyph({ type: 'N', color: 'b' })).toBe('♞');
  });
});

describe('pawn movement', () => {
  it('moves one square forward and captures diagonally, never two', () => {
    // White pawn on d4 (row 3, col 3), black pawn on e5 (row 2, col 4).
    const board = boardFromRows(['....k.', '......', '....p.', '...P..', '......', '....K.']);
    const moves = legalMoves(board, 'w');
    const pawnMoves = moves.filter((m) => m.from === square(3, 3));
    // d5 forward, e5 capture. No d6 double step.
    expect(pawnMoves.map((m) => m.to).sort((a, b) => a - b)).toEqual([square(2, 3), square(2, 4)]);
    expect(pawnMoves.find((m) => m.to === square(2, 4))?.captured).toEqual({
      type: 'P',
      color: 'b',
    });
  });

  it('cannot move forward into an occupied square', () => {
    const board = boardFromRows(['....k.', '......', '...p..', '...P..', '......', '....K.']);
    const moves = legalMoves(board, 'w');
    expect(moves.filter((m) => m.from === square(3, 3))).toHaveLength(0);
  });

  it('promotes to Queen on the last rank', () => {
    const board = boardFromRows(['....k.', 'P.....', '......', '......', '......', '....K.']);
    const moves = legalMoves(board, 'w').filter((m) => m.from === square(1, 0));
    expect(moves).toHaveLength(1);
    expect(moves[0]?.promotion).toBe('Q');
    const next = applyMove(board, moves[0] as { from: number; to: number });
    expect(next[square(0, 0)]).toEqual({ type: 'Q', color: 'w' });
  });

  it('promotes on a capture too', () => {
    const board = boardFromRows(['.r..k.', 'P.....', '......', '......', '......', '....K.']);
    const moves = legalMoves(board, 'w').filter((m) => m.from === square(1, 0));
    const capture = moves.find((m) => m.to === square(0, 1));
    expect(capture?.promotion).toBe('Q');
    expect(capture?.captured).toEqual({ type: 'R', color: 'b' });
  });
});

describe('check, checkmate, stalemate', () => {
  it('detects check from a queen up the file', () => {
    const board = boardFromRows(['....k.', '....Q.', '......', '......', '......', 'K.....']);
    expect(isInCheck(board, 'b')).toBe(true);
    expect(isInCheck(board, 'w')).toBe(false);
    expect(gameStatus(board, 'b')).toBe('check');
  });

  it('detects check from a knight', () => {
    // Knight on c5 attacks e6 (a (±1, ±2) jump).
    const board = boardFromRows(['....k.', '..N...', '......', '......', '......', 'K.....']);
    expect(isSquareAttacked(board, findKing(board, 'b'), 'w')).toBe(true);
    expect(isInCheck(board, 'b')).toBe(true);
  });

  it('a pinned piece cannot move (it would expose the king)', () => {
    // White king e1, white rook e2, black rook e6: the rook is pinned.
    const board = boardFromRows(['....rk', '......', '......', '......', '....R.', '....K.']);
    const moves = legalMoves(board, 'w').filter((m) => m.from === square(4, 4));
    // The rook may only move along the e-file (staying on it) or capture.
    expect(moves.map((m) => m.to).sort((a, b) => a - b)).toEqual([
      square(0, 4),
      square(1, 4),
      square(2, 4),
      square(3, 4),
    ]);
  });

  it('detects checkmate: queen on b5 protected by the king on c5', () => {
    const board = boardFromRows(['k.....', '.QK...', '......', '......', '......', '......']);
    expect(isInCheck(board, 'b')).toBe(true);
    expect(legalMoves(board, 'b')).toHaveLength(0);
    expect(gameStatus(board, 'b')).toBe('checkmate');
  });

  it('detects stalemate: king boxed in with no check', () => {
    const board = boardFromRows(['k.....', '..K...', '.Q....', '......', '......', '......']);
    expect(isInCheck(board, 'b')).toBe(false);
    expect(legalMoves(board, 'b')).toHaveLength(0);
    expect(gameStatus(board, 'b')).toBe('stalemate');
  });

  it('the king cannot move into check or next to the enemy king', () => {
    const board = boardFromRows(['......', '......', '..k...', '......', '......', '..K...']);
    // Black king on c4, white king on c1: black has 8 neighbours minus the
    // ones next to the white king; c1 attacks b1, c2, d1... none adjacent to
    // c4, so all 8 king moves are legal (kings are 3 ranks apart).
    expect(legalMoves(board, 'b').filter((m) => m.from === square(2, 2))).toHaveLength(8);
    const close = boardFromRows(['......', '......', '......', '..k...', '......', '..K...']);
    // Kings two ranks apart: black king on c3 cannot step to c2 (adjacent
    // to the white king on c1).
    const kingMoves = legalMoves(close, 'b').filter((m) => m.from === square(3, 2));
    expect(kingMoves.map((m) => m.to)).not.toContain(square(4, 2));
  });
});

describe('applyMove and captured pieces', () => {
  it('does not mutate the input board', () => {
    const board = initialBoard();
    const before = JSON.stringify(board);
    const move = legalMoves(board, 'w')[0] as { from: number; to: number };
    applyMove(board, move);
    expect(JSON.stringify(board)).toBe(before);
  });

  it('lists captured pieces by value order', () => {
    const board = boardFromRows(['....k.', '......', '..q...', '......', '......', '....K.']);
    // Only the black king and queen are on the board; the other 10 black
    // pieces are gone.
    const captured = capturedPieces(board, 'b');
    expect(captured).toHaveLength(10);
    expect(captured[0]).toEqual({ type: 'R', color: 'b' });
    expect(captured.filter((p) => p.type === 'P')).toHaveLength(6);
    // White has only its king on this board: the other 11 white pieces
    // are all "captured".
    expect(capturedPieces(board, 'w')).toHaveLength(11);
  });

  it('a promoted pawn is not counted as captured', () => {
    // Full white army, plus a second queen on a6: the a-pawn promoted, so
    // no white piece is actually captured.
    const board = boardFromRows(['Q...k.', '......', '......', '......', '.PPPPP', 'RNBQKR']);
    expect(capturedPieces(board, 'w')).toHaveLength(0);
  });

  it('boardFromRows rejects bad input', () => {
    expect(() => boardFromRows(['......'])).toThrow();
    expect(() =>
      boardFromRows(['......', '......', '......', '......', '......', '...X..']),
    ).toThrow();
  });
});

describe('legal move sanity', () => {
  it('every legal move keeps the own king safe', () => {
    const board = initialBoard();
    for (const move of legalMoves(board, 'w')) {
      expect(isInCheck(applyMove(board, move), 'w')).toBe(false);
    }
    for (const move of legalMoves(board, 'b')) {
      expect(isInCheck(applyMove(board, move), 'b')).toBe(false);
    }
  });

  it('a full random game stays legal and terminates', () => {
    // Play 30 Chill-vs-Chill games (random moves): every move must be legal,
    // and every game must end in mate, stalemate, or the move cap.
    let finished = 0;
    for (let game = 0; game < 30; game++) {
      let board: Board = initialBoard();
      let turn: 'w' | 'b' = 'w';
      let movesPlayed = 0;
      for (let ply = 0; ply < 200; ply++) {
        const moves = legalMoves(board, turn);
        const status = gameStatus(board, turn);
        if (moves.length === 0) {
          expect(['checkmate', 'stalemate']).toContain(status);
          finished++;
          break;
        }
        const move = moves[Math.floor(Math.random() * moves.length)] as {
          from: number;
          to: number;
        };
        board = applyMove(board, move);
        movesPlayed++;
        turn = turn === 'w' ? 'b' : 'w';
      }
      expect(movesPlayed).toBeLessThanOrEqual(200);
    }
    expect(finished).toBeGreaterThan(0);
  });
});
