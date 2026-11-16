import React, { useEffect, useRef, useState } from "react";
import { useChess } from "@mdwebb/react-chess";
import { describeEngineLine } from "./enginePresentation.js";
import { StockfishController } from "./stockfishController.js";

function EngineAnalysis({ onSnapshotChange }) {
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
    const loading = { status: "loading", fen: latestFen.current, lines: [] };
    setSnapshot(loading);
    onSnapshotChange(loading);

    // StrictMode cleans up the first effect before this starts the large worker.
    const timer = window.setTimeout(() => {
      try {
        const worker = new Worker(
          `${import.meta.env.BASE_URL}stockfish/stockfish-19-single.js`,
        );
        const controller = new StockfishController(worker, (nextSnapshot) => {
          setSnapshot(nextSnapshot);
          onSnapshotChange(nextSnapshot);
        });
        controllerRef.current = controller;
        controller.analyze(latestFen.current);
        controller.start();
      } catch {
        const failed = {
          status: "error",
          message: "Could not start the Stockfish engine.",
          fen: latestFen.current,
          lines: [],
        };
        setSnapshot(failed);
        onSnapshotChange(failed);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controllerRef.current?.dispose();
      controllerRef.current = null;
      onSnapshotChange(null);
    };
  }, [attempt, onSnapshotChange]);

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
                    const { evaluation, winningSide, sequence, firstMove } =
                      describeEngineLine(fen, line);
                    return (
                      <li key={line.rank}>
                        <button
                          type="button"
                          title={sequence}
                          onClick={() =>
                            makeMove(uci.slice(0, 2), uci.slice(2, 4), uci[4])
                          }
                          aria-label={`Play ${firstMove}. Engine line ${sequence}, evaluation ${evaluation}`}
                        >
                          <span
                            className={`engine-analysis__evaluation engine-analysis__evaluation--${winningSide}`}
                            aria-hidden="true"
                          >
                            {evaluation}
                          </span>
                          <span className="engine-analysis__sequence">{sequence}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
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
