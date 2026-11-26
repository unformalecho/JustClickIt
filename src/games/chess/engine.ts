/**
 * Mini Chess engine — pure 6x6 chess rules, no DOM, no dependencies.
 *
 * Board: 36 squares, index = row * 6 + col. Row 0 is the top rank (Black's
 * back rank, White's promotion rank); row 5 is the bottom rank (White's
 * back rank). White moves toward row 0, Black toward row 5.
 *
 * Rules (kept simple and standard): normal chess movement adapted to 6x6.
 * No castling, no en passant, no double pawn step (pawns move 1 forward,
 * capture diagonally, promote to Queen on the last rank). Win by checkmate;
 * stalemate is a draw.
 */

export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type Color = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: Color;
}

/** 36 squares; `null` is an empty square. Index = row * 6 + col. */
export type Board = (Piece | null)[];

export interface Move {
  from: number;
  to: number;
  /** Promotion target (always 'Q' in Mini Chess). */
  promotion?: 'Q';
  /** Piece captured on the target square, if any. */
  captured?: Piece;
}

export type GameStatus = 'ongoing' | 'check' | 'checkmate' | 'stalemate';

export const PIECE_VALUES: Record<PieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 0,
};

const GLYPHS: Record<Color, Record<PieceType, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

const PIECE_NAMES: Record<PieceType, string> = {
  K: 'King',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
  P: 'Pawn',
};

export function rowOf(sq: number): number {
  return Math.floor(sq / 6);
}

export function colOf(sq: number): number {
  return sq % 6;
}

export function square(row: number, col: number): number {
  return row * 6 + col;
}

/** Algebraic name, e.g. square 0 is a6, square 35 is f1. */
export function squareName(sq: number): string {
  return `${'abcdef'[colOf(sq)]}${6 - rowOf(sq)}`;
}

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function pieceGlyph(piece: Piece): string {
  return GLYPHS[piece.color][piece.type];
}

export function pieceName(piece: Piece): string {
  return `${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type]}`;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 6 && col >= 0 && col < 6;
}

/**
 * Starting position. Back rank R-N-B-Q-K-R, second rank 6 pawns, per side.
 * White sits on rows 4-5 (bottom) and moves first.
 */
export function initialBoard(): Board {
  const board: Board = Array<Piece | null>(36).fill(null);
  const back: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'R'];
  for (let col = 0; col < 6; col++) {
    board[square(0, col)] = { type: back[col] as PieceType, color: 'b' };
    board[square(1, col)] = { type: 'P', color: 'b' };
    board[square(4, col)] = { type: 'P', color: 'w' };
    board[square(5, col)] = { type: back[col] as PieceType, color: 'w' };
  }
  return board;
}

/**
 * Build a board from 6 strings of 6 characters, top rank first.
 * Uppercase = White, lowercase = Black, '.' = empty.
 * Example: boardFromRows(['k.....', '..K...', '.Q....', '......', '......', '......'])
 */
export function boardFromRows(rows: string[]): Board {
  if (rows.length !== 6) throw new Error('boardFromRows: need exactly 6 rows');
  const board: Board = Array<Piece | null>(36).fill(null);
  const map: Record<string, PieceType> = {
    K: 'K',
    Q: 'Q',
    R: 'R',
    B: 'B',
    N: 'N',
    P: 'P',
  };
  for (let row = 0; row < 6; row++) {
    const line = rows[row] as string;
    if (line.length !== 6) throw new Error('boardFromRows: each row needs 6 characters');
    for (let col = 0; col < 6; col++) {
      const ch = line[col] as string;
      if (ch === '.') continue;
      const type = map[ch.toUpperCase()];
      if (!type) throw new Error(`boardFromRows: unknown piece '${ch}'`);
      board[square(row, col)] = {
        type,
        color: ch === ch.toUpperCase() ? 'w' : 'b',
      };
    }
  }
  return board;
}

export function findKing(board: Board, color: Color): number {
  for (let sq = 0; sq < 36; sq++) {
    const p = board[sq];
    if (p && p.type === 'K' && p.color === color) return sq;
  }
  return -1;
}

/** True when `sq` is attacked by any piece of `by`. */
export function isSquareAttacked(board: Board, sq: number, by: Color): boolean {
  const row = rowOf(sq);
  const col = colOf(sq);

  // Pawns: a white pawn attacks from one row below its target (it moves
  // toward row 0); a black pawn attacks from one row above.
  const pawnRow = by === 'w' ? row + 1 : row - 1;
  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (inBounds(pawnRow, c)) {
      const p = board[square(pawnRow, c)];
      if (p && p.type === 'P' && p.color === by) return true;
    }
  }

  // Knights.
  const knightJumps: Array<[number, number]> = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightJumps) {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) continue;
    const p = board[square(r, c)];
    if (p && p.type === 'N' && p.color === by) return true;
  }

  // King (adjacent squares).
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const p = board[square(r, c)];
      if (p && p.type === 'K' && p.color === by) return true;
    }
  }

  // Sliders: rook/queen orthogonal, bishop/queen diagonal.
  const rays: Array<{ dr: number; dc: number; types: PieceType[] }> = [
    { dr: -1, dc: 0, types: ['R', 'Q'] },
    { dr: 1, dc: 0, types: ['R', 'Q'] },
    { dr: 0, dc: -1, types: ['R', 'Q'] },
    { dr: 0, dc: 1, types: ['R', 'Q'] },
    { dr: -1, dc: -1, types: ['B', 'Q'] },
    { dr: -1, dc: 1, types: ['B', 'Q'] },
    { dr: 1, dc: -1, types: ['B', 'Q'] },
    { dr: 1, dc: 1, types: ['B', 'Q'] },
  ];
  for (const { dr, dc, types } of rays) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = board[square(r, c)];
      if (p) {
        if (p.color === by && types.includes(p.type)) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function isInCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color);
  if (king < 0) return false;
  return isSquareAttacked(board, king, opposite(color));
}

/** A new board with `move` applied. The input board is not modified. */
export function applyMove(board: Board, move: Move): Board {
  const next = [...board];
  const piece = next[move.from] as Piece;
  next[move.from] = null;
  next[move.to] = move.promotion === 'Q' ? { type: 'Q', color: piece.color } : piece;
  return next;
}

function slidingMoves(
  board: Board,
  from: number,
  dirs: Array<[number, number]>,
  color: Color,
  out: Move[],
): void {
  const row = rowOf(from);
  const col = colOf(from);
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const target = square(r, c);
      const p = board[target];
      if (!p) {
        out.push({ from, to: target });
      } else {
        if (p.color !== color) out.push({ from, to: target, captured: p });
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

/** Pseudo-legal moves (may leave the own king in check). */
export function pseudoMoves(board: Board, color: Color): Move[] {
  const moves: Move[] = [];
  const forward = color === 'w' ? -1 : 1;
  const promotionRow = color === 'w' ? 0 : 5;

  for (let from = 0; from < 36; from++) {
    const piece = board[from];
    if (!piece || piece.color !== color) continue;
    const row = rowOf(from);
    const col = colOf(from);

    if (piece.type === 'P') {
      const r1 = row + forward;
      if (inBounds(r1, col) && !board[square(r1, col)]) {
        const to = square(r1, col);
        moves.push(r1 === promotionRow ? { from, to, promotion: 'Q' } : { from, to });
      }
      for (const dc of [-1, 1]) {
        const c = col + dc;
        if (!inBounds(r1, c)) continue;
        const target = board[square(r1, c)];
        if (target && target.color !== color) {
          const to = square(r1, c);
          moves.push(
            r1 === promotionRow
              ? { from, to, promotion: 'Q', captured: target }
              : { from, to, captured: target },
          );
        }
      }
      continue;
    }

    if (piece.type === 'N') {
      const jumps: Array<[number, number]> = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      for (const [dr, dc] of jumps) {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const target = board[square(r, c)];
        if (!target) moves.push({ from, to: square(r, c) });
        else if (target.color !== color) moves.push({ from, to: square(r, c), captured: target });
      }
      continue;
    }

    if (piece.type === 'K') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = row + dr;
          const c = col + dc;
          if (!inBounds(r, c)) continue;
          const target = board[square(r, c)];
          if (!target) moves.push({ from, to: square(r, c) });
          else if (target.color !== color) moves.push({ from, to: square(r, c), captured: target });
        }
      }
      continue;
    }

    const orthogonal: Array<[number, number]> = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    const diagonal: Array<[number, number]> = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
    if (piece.type === 'R') slidingMoves(board, from, orthogonal, color, moves);
    else if (piece.type === 'B') slidingMoves(board, from, diagonal, color, moves);
    else slidingMoves(board, from, [...orthogonal, ...diagonal], color, moves);
  }

  return moves;
}

/** Fully legal moves: pseudo-legal moves that do not leave the own king in check. */
export function legalMoves(board: Board, color: Color): Move[] {
  return pseudoMoves(board, color).filter((m) => {
    const next = applyMove(board, m);
    return !isInCheck(next, color);
  });
}

/**
 * Position status for the side to move: checkmate (in check, no legal
 * moves), stalemate (not in check, no legal moves), check, or ongoing.
 */
export function gameStatus(board: Board, color: Color): GameStatus {
  const moves = legalMoves(board, color);
  if (moves.length > 0) return isInCheck(board, color) ? 'check' : 'ongoing';
  return isInCheck(board, color) ? 'checkmate' : 'stalemate';
}

/** Pieces of `color` missing from the board, i.e. captured by the opponent. */
export function capturedPieces(board: Board, color: Color): Piece[] {
  const start: Record<PieceType, number> = { K: 1, Q: 1, R: 2, B: 1, N: 1, P: 6 };
  const remaining: Record<PieceType, number> = { K: 0, Q: 0, R: 0, B: 0, N: 0, P: 0 };
  for (const p of board) {
    if (p && p.color === color) remaining[p.type]++;
  }
  // Pawns promote to Queens, so an extra queen accounts for a "missing" pawn.
  const extraQueens = Math.max(0, remaining.Q - start.Q);
  const missing: Record<PieceType, number> = {
    K: Math.max(0, start.K - remaining.K),
    Q: Math.max(0, start.Q - remaining.Q),
    R: Math.max(0, start.R - remaining.R),
    B: Math.max(0, start.B - remaining.B),
    N: Math.max(0, start.N - remaining.N),
    P: Math.max(0, start.P - remaining.P - extraQueens),
  };
  const captured: Piece[] = [];
  const order: PieceType[] = ['Q', 'R', 'B', 'N', 'P'];
  for (const type of order) {
    for (let i = 0; i < missing[type]; i++) captured.push({ type, color });
  }
  return captured;
}
