export const DEFAULT_MAX_FULL_MOVES = 10;
export const DEFAULT_MIN_POSITION_GAMES = 50;

export function parseMoveLimit(value) {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function parseMinimumGames(value) {
  return parseMoveLimit(value);
}

export function isPositionTooRare(totalGames, minimumGames = DEFAULT_MIN_POSITION_GAMES) {
  return totalGames < minimumGames;
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
