import React, { useEffect, useRef, useState } from "react";
import { useChess } from "@mdwebb/react-chess";
import {
  buildExplorerUrl,
  emptyFilters,
  RATING_GROUPS,
  TIME_CONTROLS,
} from "./explorerQuery.js";
import { boardMoveFromExplorer } from "./explorerMove.js";

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

function filterSummary(filters) {
  const ratings = filters.ratings.length
    ? `${filters.ratings.length} rating band${filters.ratings.length === 1 ? "" : "s"}`
    : "All ratings";
  const speeds = filters.speeds.length
    ? TIME_CONTROLS.filter(({ value }) => filters.speeds.includes(value))
        .map(({ label }) => label)
        .join(", ")
    : "All time controls";
  const dates = filters.since && filters.until
    ? `${filters.since}–${filters.until}`
    : filters.since
      ? `Since ${filters.since}`
      : filters.until
        ? `Through ${filters.until}`
        : null;

  return [ratings, speeds, dates].filter(Boolean).join(" · ");
}

function PopularMoves() {
  const { fen, makeMove } = useChess();
  const dialogRef = useRef(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [draft, setDraft] = useState(emptyFilters);
  const [dateError, setDateError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState({ key: null, status: "loading", data: null });
  const requestUrl = buildExplorerUrl(fen, filters);
  const activeFilterCount =
    filters.ratings.length +
    filters.speeds.length +
    Number(Boolean(filters.since)) +
    Number(Boolean(filters.until));

  useEffect(() => {
    const cached = resultsCache.get(requestUrl);
    if (cached) {
      setResult({ key: requestUrl, status: "ready", data: cached });
      return;
    }

    const controller = new AbortController();
    setResult({ key: requestUrl, status: "loading", data: null });

    // Avoid a request for every intermediate position during quick navigation.
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(requestUrl, {
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
        resultsCache.set(requestUrl, prepared);
        if (!controller.signal.aborted) {
          setResult({ key: requestUrl, status: "ready", data: prepared });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult({ key: requestUrl, status: "error", data: null });
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [requestUrl, retryCount]);

  function openFilters() {
    setDraft({ ...filters, ratings: [...filters.ratings], speeds: [...filters.speeds] });
    setDateError("");
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }

  function toggleDraft(group, value) {
    setDraft((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    if (draft.since && draft.until && draft.since > draft.until) {
      setDateError("Start month must be before end month.");
      return;
    }
    setFilters(draft);
    dialogRef.current?.close();
  }

  const visibleResult = result.key === requestUrl ? result : { status: "loading" };
  const moves = visibleResult.data?.moves ?? [];
  const totalGames = visibleResult.data?.totalGames ?? 0;

  return (
    <section className="popular-moves" aria-labelledby="popular-moves-title">
      <div className="popular-moves__heading">
        <div>
          <span className="eyebrow">Lichess rated games</span>
          <h2 id="popular-moves-title">Popular human moves</h2>
        </div>
        <button
          className="popular-moves__filter-button"
          type="button"
          onClick={openFilters}
          aria-haspopup="dialog"
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>
      <p className="popular-moves__description">{filterSummary(filters)}</p>

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
                      onClick={() => {
                        const { from, to, promotion } = boardMoveFromExplorer(move);
                        makeMove(from, to, promotion);
                      }}
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

      <dialog
        className="filters-dialog"
        ref={dialogRef}
        aria-labelledby="filters-dialog-title"
      >
        <form className="filters-dialog__form" onSubmit={applyFilters}>
          <div className="filters-dialog__header">
            <h2 id="filters-dialog-title">Filter rated games</h2>
            <button
              className="filters-dialog__close"
              type="button"
              aria-label="Close filters"
              onClick={() => dialogRef.current?.close()}
            >
              ×
            </button>
          </div>

          <div className="filters-dialog__body">
            <p>Select multiple options. Leaving a group empty includes all of it.</p>

            <fieldset>
              <legend>Rating bands</legend>
              <div className="filters-dialog__options">
                {RATING_GROUPS.map(({ value, label }) => (
                  <label className="filters-dialog__option" key={value}>
                    <input
                      type="checkbox"
                      checked={draft.ratings.includes(value)}
                      onChange={() => toggleDraft("ratings", value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Time controls</legend>
              <div className="filters-dialog__options">
                {TIME_CONTROLS.map(({ value, label }) => (
                  <label className="filters-dialog__option" key={value}>
                    <input
                      type="checkbox"
                      checked={draft.speeds.includes(value)}
                      onChange={() => toggleDraft("speeds", value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Game dates</legend>
              <div className="filters-dialog__dates">
                <label>
                  From
                  <input
                    type="month"
                    value={draft.since}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, since: event.target.value }));
                      setDateError("");
                    }}
                  />
                </label>
                <label>
                  Through
                  <input
                    type="month"
                    value={draft.until}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, until: event.target.value }));
                      setDateError("");
                    }}
                  />
                </label>
              </div>
              {dateError && <p className="filters-dialog__error" role="alert">{dateError}</p>}
            </fieldset>
          </div>

          <div className="filters-dialog__footer">
            <button
              className="filters-dialog__clear"
              type="button"
              onClick={() => {
                setDraft(emptyFilters());
                setDateError("");
              }}
            >
              Clear all
            </button>
            <div>
              <button type="button" onClick={() => dialogRef.current?.close()}>
                Cancel
              </button>
              <button className="filters-dialog__apply" type="submit">
                Apply filters
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </section>
  );
}

export default PopularMoves;
