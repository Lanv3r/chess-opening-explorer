import { Chess } from "chess.js";

function playUci(game, uci) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  try {
    return game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
  } catch {
    return null;
  }
}

export function describeEngineLine(fen, line) {
  const fields = fen.split(" ");
  const score = fields[1] === "b" ? -line.score : line.score;
  const winningSide = score > 0 ? "white" : score < 0 ? "black" : "equal";
  const evaluation = line.scoreType === "mate"
    ? `${score < 0 ? "−" : ""}M${Math.abs(score)}`
    : `${score > 0 ? "+" : score < 0 ? "−" : ""}${(Math.abs(score) / 100).toFixed(2)}`;

  const game = new Chess(fen);
  const moves = [];
  let turn = fields[1];
  let moveNumber = Number(fields[5]) || 1;
  let firstMove = line.pv[0];

  for (const [index, uci] of line.pv.slice(0, 6).entries()) {
    const move = playUci(game, uci);
    if (!move) break;
    if (index === 0) firstMove = move.san;

    if (turn === "w") {
      moves.push(`${moveNumber}.`, move.san);
    } else {
      if (index === 0) moves.push(`${moveNumber}...`);
      moves.push(move.san);
      moveNumber += 1;
    }
    turn = turn === "w" ? "b" : "w";
  }

  return {
    evaluation,
    winningSide,
    sequence: moves.join(" ") || firstMove,
    firstMove,
  };
}
