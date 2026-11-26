import { blip } from '../lib/audio/blips';
import { confetti } from '../lib/fx';
import { el } from '../lib/dom';
import {
  applyMove,
  capturedPieces,
  colOf,
  gameStatus,
  initialBoard,
  isInCheck,
  legalMoves,
  pieceGlyph,
  pieceName,
  rowOf,
  square,
  squareName,
  type Board,
  type Color,
  type Move,
} from './chess/engine';
import { chooseMove, type AiMode } from './chess/ai';
import type { GameDef } from './types';

/** AI difficulty, kept for the session so it survives re-mounts. */
let aiMode: AiMode = 'chill';

export const chessGame: GameDef = {
  id: 'chess',
  name: 'Mini Chess',
  tag: '6×6 · You vs AI',
  icon: '♞',
  desc: 'Six-by-six chess against the machine. Beat it if you can.',
  mount(stage, ctx) {
    let board: Board = initialBoard();
    let turn: Color = 'w';
    let selected: number | null = null;
    let targets: Move[] = [];
    let lastMove: { from: number; to: number } | null = null;
    let over: 'win' | 'loss' | 'draw' | null = null;
    let aiTimer: number | null = null;
    let usedKeyboard = false;

    // ---- DOM ----
    const status = el('p', 'statusline');
    status.id = 'cStatus';
    status.setAttribute('role', 'status');

    const modeRow = el('div', 'chess-mode');
    modeRow.setAttribute('role', 'group');
    modeRow.setAttribute('aria-label', 'AI difficulty');
    const modeLabel = el('span', 'chess-mode-label', 'AI:');
    const chillBtn = el('button', 'seg') as HTMLButtonElement;
    chillBtn.type = 'button';
    chillBtn.id = 'cModeChill';
    chillBtn.textContent = 'Chill';
    const hardBtn = el('button', 'seg') as HTMLButtonElement;
    hardBtn.type = 'button';
    hardBtn.id = 'cModeHard';
    hardBtn.innerHTML = 'Unsolvable <span class="chess-sub">Good luck.</span>';
    modeRow.append(modeLabel, chillBtn, hardBtn);

    const boardEl = el('div', 'chess-board');
    boardEl.id = 'cBoard';
    boardEl.setAttribute('role', 'grid');
    boardEl.setAttribute('aria-label', 'Mini chess board, 6 by 6');
    const squares: HTMLButtonElement[] = [];
    for (let sq = 0; sq < 36; sq++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'csq';
      btn.dataset.square = String(sq);
      btn.setAttribute('role', 'gridcell');
      btn.addEventListener('click', () => onSquare(sq));
      boardEl.appendChild(btn);
      squares.push(btn);
    }
    // Arrow keys move focus across the board (roving, no wrap).
    boardEl.addEventListener('keydown', (e) => {
      if (!e.key.startsWith('Arrow')) return;
      const active = document.activeElement as HTMLElement | null;
      const current = active?.dataset?.square;
      if (current === undefined) return;
      usedKeyboard = true;
      const from = Number(current);
      const row = rowOf(from);
      const col = colOf(from);
      let next: number | null = null;
      if (e.key === 'ArrowUp' && row > 0) next = square(row - 1, col);
      else if (e.key === 'ArrowDown' && row < 5) next = square(row + 1, col);
      else if (e.key === 'ArrowLeft' && col > 0) next = square(row, col - 1);
      else if (e.key === 'ArrowRight' && col < 5) next = square(row, col + 1);
      if (next !== null) {
        e.preventDefault();
        squares[next]?.focus();
      }
    });

    const trays = el('div', 'chess-trays');
    const trayWhite = el('p', 'chess-tray');
    trayWhite.id = 'cTrayWhite';
    const trayBlack = el('p', 'chess-tray');
    trayBlack.id = 'cTrayBlack';
    trays.append(trayWhite, trayBlack);

    const foot = el('div', 'btnrow');
    const newBtn = el('button', 'btn ghost', 'New game') as HTMLButtonElement;
    newBtn.type = 'button';
    newBtn.id = 'cNew';
    const hint = el('p', 'chess-hint', 'Tap one of your pieces, then a highlighted square.');
    foot.append(newBtn, hint);

    const result = el('div', 'chess-result');
    result.id = 'cResult';
    result.hidden = true;
    const resultText = el('p', 'cardtext');
    resultText.id = 'cResultText';
    const againBtn = el('button', 'btn', 'Play again') as HTMLButtonElement;
    againBtn.type = 'button';
    againBtn.id = 'cAgain';
    result.append(resultText, againBtn);

    stage.append(status, modeRow, boardEl, trays, foot, result);

    // ---- Rendering ----
    function describeSquare(sq: number): string {
      const piece = board[sq];
      const name = squareName(sq);
      return piece ? `${name}, ${pieceName(piece)}` : `${name}, empty`;
    }

    function render(): void {
      const inCheck = !over && isInCheck(board, turn);
      for (let sq = 0; sq < 36; sq++) {
        const btn = squares[sq] as HTMLButtonElement;
        const piece = board[sq];
        btn.textContent = piece ? pieceGlyph(piece) : '';
        btn.classList.toggle('light', (rowOf(sq) + colOf(sq)) % 2 === 0);
        btn.classList.toggle('sel', selected === sq);
        btn.classList.toggle(
          'target',
          targets.some((m) => m.to === sq),
        );
        btn.classList.toggle(
          'capture',
          targets.some((m) => m.to === sq && m.captured !== undefined),
        );
        btn.classList.toggle(
          'last',
          lastMove !== null && (lastMove.from === sq || lastMove.to === sq),
        );
        btn.classList.toggle(
          'in-check',
          inCheck &&
            piece !== undefined &&
            piece !== null &&
            piece.type === 'K' &&
            piece.color === turn,
        );
        btn.setAttribute('aria-label', describeSquare(sq));
        // Only disable on game over. During the AI's turn clicks are
        // ignored by the onSquare guard, and the squares must stay
        // focusable so keyboard focus can be restored after a move.
        btn.disabled = over !== null;
      }

      const whiteCaptured = capturedPieces(board, 'b');
      const blackCaptured = capturedPieces(board, 'w');
      trayWhite.textContent = '';
      trayWhite.append(
        document.createTextNode('You took: '),
        document.createTextNode(
          whiteCaptured.length > 0 ? whiteCaptured.map(pieceGlyph).join(' ') : '—',
        ),
      );
      trayBlack.textContent = '';
      trayBlack.append(
        document.createTextNode('AI took: '),
        document.createTextNode(
          blackCaptured.length > 0 ? blackCaptured.map(pieceGlyph).join(' ') : '—',
        ),
      );

      if (over === 'win') status.textContent = 'Checkmate — you win!';
      else if (over === 'loss') status.textContent = 'Checkmate — the AI wins.';
      else if (over === 'draw') status.textContent = 'Stalemate — draw.';
      else if (turn === 'b') status.textContent = 'AI is thinking…';
      else
        status.textContent = inCheck
          ? 'Check! Your move — save the King.'
          : 'Your turn — White to move';

      chillBtn.setAttribute('aria-pressed', aiMode === 'chill' ? 'true' : 'false');
      chillBtn.classList.toggle('on', aiMode === 'chill');
      hardBtn.setAttribute('aria-pressed', aiMode === 'unsolvable' ? 'true' : 'false');
      hardBtn.classList.toggle('on', aiMode === 'unsolvable');
    }

    // ---- Flow ----
    function endGame(resultKind: 'win' | 'loss' | 'draw'): void {
      over = resultKind;
      if (resultKind === 'win') {
        ctx.store.update((s) => {
          s.counts.chessWins += 1;
        });
        ctx.recordPlay('chess', 'win');
        confetti();
        blip(880, 0.12);
        setTimeout(() => blip(1174, 0.16), 110);
        resultText.textContent = 'Checkmate — you beat the machine. Actual legend.';
      } else if (resultKind === 'loss') {
        ctx.recordPlay('chess', 'loss');
        resultText.textContent = 'Checkmate — the AI wins. It happens to the best of us.';
      } else {
        ctx.recordPlay('chess', 'draw');
        resultText.textContent = 'Stalemate — nobody wins. A draw, somehow.';
      }
      result.hidden = false;
      ctx.checkAchievements();
      render();
    }

    function scheduleAi(): void {
      aiTimer = window.setTimeout(() => {
        aiTimer = null;
        if (over !== null || ctx.currentId() !== 'chess') return;
        const move = chooseMove(board, 'b', aiMode, 1000);
        if (!move) return;
        const wasCapture = move.captured !== undefined;
        board = applyMove(board, move);
        lastMove = { from: move.from, to: move.to };
        turn = 'w';
        blip(wasCapture ? 300 : 440, 0.07);
        if (move.promotion) ctx.toast('AI promoted a pawn', 'It is a Queen now. Sorry.');
        render();
        const st = gameStatus(board, 'w');
        if (st === 'checkmate') endGame('loss');
        else if (st === 'stalemate') endGame('draw');
      }, 350);
    }

    function doPlayerMove(move: Move): void {
      const wasCapture = move.captured !== undefined;
      const wasPromotion = move.promotion !== undefined;
      board = applyMove(board, move);
      lastMove = { from: move.from, to: move.to };
      selected = null;
      targets = [];
      turn = 'b';
      blip(wasCapture ? 300 : 520, 0.07);
      if (wasPromotion) ctx.toast('Pawn promoted', 'Your pawn is a Queen now.');
      render();
      // Restore focus to the square the piece landed on (keyboard users).
      if (usedKeyboard) squares[move.to]?.focus();
      const st = gameStatus(board, 'b');
      if (st === 'checkmate') {
        endGame('win');
        return;
      }
      if (st === 'stalemate') {
        endGame('draw');
        return;
      }
      scheduleAi();
    }

    function onSquare(sq: number): void {
      if (over !== null || turn !== 'w') return;
      const piece = board[sq];
      if (selected !== null) {
        const move = targets.find((m) => m.to === sq);
        if (move) {
          doPlayerMove(move);
          return;
        }
      }
      if (piece && piece.color === 'w') {
        selected = sq;
        targets = legalMoves(board, 'w').filter((m) => m.from === sq);
        blip(600, 0.05);
        render();
        return;
      }
      selected = null;
      targets = [];
      render();
    }

    function resetGame(): void {
      if (aiTimer !== null) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      board = initialBoard();
      turn = 'w';
      selected = null;
      targets = [];
      lastMove = null;
      over = null;
      result.hidden = true;
      render();
    }

    function setMode(mode: AiMode): void {
      aiMode = mode;
      blip(mode === 'unsolvable' ? 240 : 600, 0.06);
      render();
    }

    chillBtn.addEventListener('click', () => setMode('chill'));
    hardBtn.addEventListener('click', () => setMode('unsolvable'));
    newBtn.addEventListener('click', () => {
      blip(500, 0.06);
      resetGame();
    });
    againBtn.addEventListener('click', () => {
      blip(500, 0.06);
      resetGame();
    });
    stage.addEventListener('keydown', () => {
      usedKeyboard = true;
    });

    render();

    return () => {
      if (aiTimer !== null) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
    };
  },
};
