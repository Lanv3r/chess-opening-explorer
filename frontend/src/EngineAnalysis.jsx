import React, { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useChess } from "@mdwebb/react-chess";
import { StockfishController } from "./stockfishController.js";

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

function principalVariation(fen, moves) {
  const game = new Chess(fen);
  const notation = [];
  for (const uci of moves.slice(0, 6)) {
    const move = playUci(game, uci);
    if (!move) break;
    notation.push(move.san);
  }
  return notation.join(" ");
}

function whiteScore(fen, line) {
  const score = fen.split(" ")[1] === "b" ? -line.score : line.score;
  if (line.scoreType === "mate") {
    return score < 0 ? `−M${Math.abs(score)}` : `M${score}`;
  }
  return `${score >= 0 ? "+" : ""}${(score / 100).toFixed(2)}`;
}

function EngineAnalysis() {
  const { fen, makeMove } = useChess();
  const latestFen = useRef(fen);
  const controllerRef = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState({
    status: "loading",
    fen,
    lines: [],
  });

  latestFen.current = fen;

  useEffect(() => {
    setSnapshot({ status: "loading", fen: latestFen.current, lines: [] });

    // StrictMode cleans up the first effect before this starts the large worker.
    const timer = window.setTimeout(() => {
      try {
        const worker = new Worker(
          `${import.meta.env.BASE_URL}stockfish/stockfish-19-single.js`,
        );
        const controller = new StockfishController(worker, setSnapshot);
        controllerRef.current = controller;
        controller.analyze(latestFen.current);
        controller.start();
      } catch {
        setSnapshot({
          status: "error",
          message: "Could not start the Stockfish engine.",
          fen: latestFen.current,
          lines: [],
        });
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    controllerRef.current?.analyze(fen);
  }, [fen]);

  const visible = snapshot.fen === fen
    ? snapshot
    : { status: "loading", lines: [] };
  const depth = Math.max(0, ...visible.lines.map((line) => line.depth));

  return (
    <div className="engine-analysis">
      <div className="engine-analysis__content" aria-live="polite">
        {visible.status === "loading" && (
          <p>Loading engine…</p>
        )}
        {visible.status === "waiting" && <p>Switching to this position…</p>}
        {visible.status === "error" && (
          <div className="engine-analysis__error">
            <p>{visible.message}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </div>
        )}
        {(visible.status === "analyzing" || visible.status === "complete") && (
          <>
            <p className="engine-analysis__status">
              {visible.status === "analyzing" ? "Analyzing" : "Analysis complete"}
              {depth > 0 ? ` · depth ${depth}` : ""}
            </p>
            {visible.lines.length > 0 ? (
              <>
                <ol className="engine-analysis__lines">
                  {visible.lines.map((line) => {
                    const uci = line.pv[0];
                    const variation = principalVariation(fen, line.pv);
                    const san = variation.split(" ")[0] || uci;
                    return (
                      <li key={line.rank}>
                        <button
                          type="button"
                          onClick={() =>
                            makeMove(uci.slice(0, 2), uci.slice(2, 4), uci[4])
                          }
                          aria-label={`Play engine move ${san}`}
                        >
                          <span className="engine-analysis__rank">{line.rank}.</span>
                          <strong>{san}</strong>
                          <span className="engine-analysis__score">{whiteScore(fen, line)}</span>
                        </button>
                        <span className="engine-analysis__variation">{variation}</span>
                      </li>
                    );
                  })}
                </ol>
                <p className="engine-analysis__footnote">Scores are from White’s perspective.</p>
              </>
            ) : (
              <p>{visible.status === "complete" ? "No legal moves." : "Waiting for engine lines…"}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EngineAnalysis;
