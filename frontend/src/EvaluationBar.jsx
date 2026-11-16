import React from "react";
import { useChess } from "@mdwebb/react-chess";
import { describeEngineLine, whiteShare } from "./enginePresentation.js";

function EvaluationBar({ snapshot }) {
  const { fen, orientation } = useChess();
  const topLine = snapshot?.fen === fen
    ? snapshot.lines.find((line) => line.rank === 1)
    : null;
  const percentage = whiteShare(fen, topLine);
  const description = topLine
    ? `Stockfish evaluation ${describeEngineLine(fen, topLine).evaluation} from White’s perspective`
    : "Stockfish is analyzing this position";

  return (
    <div
      className={`evaluation-bar${orientation === "black" ? " evaluation-bar--flipped" : ""}`}
      role="meter"
      aria-label="Stockfish position evaluation"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={percentage}
      aria-valuetext={description}
      title={description}
    >
      <div className="evaluation-bar__white" style={{ height: `${percentage}%` }} />
    </div>
  );
}

export default EvaluationBar;
