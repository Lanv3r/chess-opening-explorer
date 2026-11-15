export function boardMoveFromExplorer(move) {
  const from = move.uci.slice(0, 2);
  let to = move.uci.slice(2, 4);

  // Lichess encodes castling as king-to-rook; chess.js expects king-to-destination.
  const castle = /^O-O(-O)?[+#]?$/.exec(move.san);
  if (castle && (from === "e1" || from === "e8")) {
    to = `${castle[1] ? "c" : "g"}${from[1]}`;
  }

  return { from, to, promotion: move.uci[4] };
}
