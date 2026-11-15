import React, { useEffect, useState } from "react";
import { useChess } from "@mdwebb/react-chess";

const EXPLORER_URL = "https://explorer.lichess.org/lichess";
const resultsCache = new Map();
const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fullNumber = new Intl.NumberFormat("en");

function gameCount(entry) {
  return (entry.white ?? 0) + (entry.draws ?? 0) + (entry.black ?? 0);
}

function formatShare(share) {
  if (share > 0 && share < 0.1) return "<0.1%";
  return `${share.toFixed(1)}%`;
}

function PopularMoves() {
  const { fen, makeMove } = useChess();
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState({ fen, status: "loading", data: null });

  useEffect(() => {
    const cached = resultsCache.get(fen);
    if (cached) {
      setResult({ fen, status: "ready", data: cached });
      return;
    }

    const controller = new AbortController();
    setResult({ fen, status: "loading", data: null });

    // Avoid a request for every intermediate position during quick navigation.
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({
        variant: "standard",
        fen,
        moves: "10",
        topGames: "0",
        recentGames: "0",
      });

      try {
        const response = await fetch(`${EXPLORER_URL}?${params}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Lichess returned ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data.moves)) throw new Error("Invalid Lichess response");

        const prepared = {
          totalGames: gameCount(data),
          moves: [...data.moves]
            .sort((a, b) => gameCount(b) - gameCount(a))
            .slice(0, 10),
        };
        resultsCache.set(fen, prepared);
        if (!controller.signal.aborted) {
          setResult({ fen, status: "ready", data: prepared });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult({ fen, status: "error", data: null });
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fen, retryCount]);

  const visibleResult = result.fen === fen ? result : { status: "loading" };
  const moves = visibleResult.data?.moves ?? [];
  const totalGames = visibleResult.data?.totalGames ?? 0;

  return (
    <section className="popular-moves" aria-labelledby="popular-moves-title">
      <div className="popular-moves__heading">
        <div>
          <span className="eyebrow">Lichess rated games</span>
          <h2 id="popular-moves-title">Popular human moves</h2>
        </div>
        <span className="popular-moves__limit">Top 10</span>
      </div>
      <p className="popular-moves__description">
        Most played next moves across all ratings and time controls.
      </p>

      <div className="popular-moves__content" aria-live="polite">
        {visibleResult.status === "loading" && <p>Loading Lichess moves…</p>}
        {visibleResult.status === "error" && (
          <div className="popular-moves__message">
            <p>Could not load Lichess moves for this position.</p>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
              Try again
            </button>
          </div>
        )}
        {visibleResult.status === "ready" && moves.length === 0 && (
          <p>No rated games found for this position.</p>
        )}
        {visibleResult.status === "ready" && moves.length > 0 && (
          <>
            <p className="popular-moves__total">
              {fullNumber.format(totalGames)} games reached this position
            </p>
            <ol className="popular-moves__list">
              {moves.map((move, index) => {
                const count = gameCount(move);
                const share = totalGames ? (count / totalGames) * 100 : 0;

                return (
                  <li key={move.uci}>
                    <button
                      className="popular-moves__row"
                      type="button"
                      onClick={() =>
                        makeMove(move.uci.slice(0, 2), move.uci.slice(2, 4), move.uci[4])
                      }
                      aria-label={`Play ${move.san}, ${formatShare(share)} of games`}
                    >
                      <span className="popular-moves__rank">{index + 1}.</span>
                      <span className="popular-moves__san">{move.san}</span>
                      <span className="popular-moves__bar" aria-hidden="true">
                        <span style={{ width: `${share}%` }} />
                      </span>
                      <span className="popular-moves__stats">
                        <strong>{formatShare(share)}</strong>
                        <small>{compactNumber.format(count)} games</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}

export default PopularMoves;
