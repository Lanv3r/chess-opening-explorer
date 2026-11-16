import { gameCount } from "./explorerData.js";

export function chooseBotMove(moves, random = Math.random) {
  const topMoves = [...moves]
    .sort((a, b) => gameCount(b) - gameCount(a))
    .slice(0, 10);
  if (!topMoves.length) return null;

  const weights = topMoves.map((move) => Math.sqrt(gameCount(move)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const draw = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
  if (total === 0) return topMoves[Math.floor(draw * topMoves.length)];

  let remaining = draw * total;
  for (let index = 0; index < topMoves.length; index += 1) {
    remaining -= weights[index];
    if (remaining < 0) return topMoves[index];
  }
  return topMoves.at(-1);
}
