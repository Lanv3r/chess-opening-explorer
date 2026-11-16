import { scoreForWhite } from "./enginePresentation.js";

export function decisiveResult(game, playerColor) {
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "black" : "white";
    return winner === playerColor
      ? { title: "Victory", reason: "You won by checkmate." }
      : { title: "Loss", reason: "You lost by checkmate." };
  }
  if (game.isStalemate()) return { title: "Draw", reason: "The game ended in stalemate." };
  if (game.isDraw()) return { title: "Draw", reason: "The game ended in a draw." };
  return null;
}

export function finalEvaluation(fen, line, playerColor) {
  if (!line) return null;
  const whiteScore = scoreForWhite(fen, line);
  const playerScore = whiteScore * (playerColor === "white" ? 1 : -1);
  const favorable = playerScore > 0;
  const significant = line.scoreType === "mate" || Math.abs(playerScore) >= 100;
  const message = playerScore === 0
    ? "The opening was equal."
    : favorable
      ? significant
        ? "You had a significant advantage after the opening."
        : "You had a slight advantage after the opening."
      : significant
        ? "You had a significant disadvantage after the opening."
        : "You had a slight disadvantage after the opening.";
  const value = line.scoreType === "mate"
    ? `${whiteScore < 0 ? "−" : "+"}M${Math.abs(whiteScore)}`
    : `${whiteScore < 0 ? "−" : whiteScore > 0 ? "+" : ""}${(Math.abs(whiteScore) / 100).toFixed(2)}`;

  return { value, message };
}
