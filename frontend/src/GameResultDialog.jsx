import React, { useEffect, useRef } from "react";
import { decisiveResult, finalEvaluation } from "./gameResult.js";

function GameResultDialog({ game, fen, playerColor, reason, snapshot, onClose }) {
  const closeRef = useRef(null);
  const decisive = decisiveResult(game, playerColor);
  const finalLine = !decisive && snapshot?.fen === fen && snapshot.status === "complete"
    ? snapshot.lines?.find((line) => line.rank === 1)
    : null;
  const evaluation = finalEvaluation(fen, finalLine, playerColor);
  const analysisUnavailable = snapshot?.fen === fen &&
    (snapshot.status === "error" || (snapshot.status === "complete" && !finalLine));

  useEffect(() => { closeRef.current?.focus(); }, []);

  return (
    <div className="game-result-overlay">
      <section
        className="game-result-dialog"
        role="dialog"
        aria-labelledby="game-result-title"
        aria-describedby="game-result-reason"
        onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
      >
        <button
          className="game-result-dialog__close"
          type="button"
          aria-label="Close game result"
          ref={closeRef}
          onClick={onClose}
        >
          ×
        </button>
        <span className="eyebrow">Game finished</span>
        <h2 id="game-result-title">{decisive?.title || "Opening complete"}</h2>
        <p id="game-result-reason">{decisive?.reason || reason}</p>
        {!decisive && (
          evaluation ? (
            <>
              <div className="game-result-dialog__score">
                <span>Final evaluation</span>
                <strong>{evaluation.value}</strong>
              </div>
              <p className="game-result-dialog__assessment">{evaluation.message}</p>
            </>
          ) : (
            <p className="game-result-dialog__assessment" aria-live="polite">
              {analysisUnavailable ? "Final evaluation unavailable." : "Analyzing the final position…"}
            </p>
          )
        )}
        <button className="game-result-dialog__review" type="button" onClick={onClose}>
          Review board
        </button>
      </section>
    </div>
  );
}

export default GameResultDialog;
