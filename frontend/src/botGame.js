import { gameCount } from "./explorerData.js";

export const DEFAULT_MAX_FULL_MOVES = 10;
export const MIN_TOP_MOVE_GAMES = 100;

export function parseMoveLimit(value) {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function topMoveGameCount(moves) {
  return moves.reduce((highest, move) => Math.max(highest, gameCount(move)), 0);
}

export function isPositionTooRare(moves) {
  return topMoveGameCount(moves) < MIN_TOP_MOVE_GAMES;
}

export function isBotTurn(fen, playerColor) {
  return fen.split(" ")[1] !== playerColor[0];
}

export function gameOutcome(game, plyCount, maxFullMoves = DEFAULT_MAX_FULL_MOVES) {
  if (game.isCheckmate()) {
    return `${game.turn() === "w" ? "Black" : "White"} wins by checkmate.`;
  }
  if (game.isStalemate()) return "Game drawn by stalemate.";
  if (game.isDraw()) return "Game drawn.";
  if (plyCount >= maxFullMoves * 2) {
    return `${maxFullMoves} full ${maxFullMoves === 1 ? "move" : "moves"} complete.`;
  }
  return null;
}
