import React, { useEffect, useRef, useState } from "react";
import { useChess } from "@mdwebb/react-chess";
import {
  buildExplorerUrl,
  copyFilters,
  dateRangeError,
  emptyFilters,
  RATING_GROUPS,
  TIME_CONTROLS,
} from "./explorerQuery.js";
import { boardMoveFromExplorer } from "./explorerMove.js";
import ExplorerFilterFields from "./ExplorerFilterFields.jsx";
import {
  cachedExplorerPosition,
  fetchExplorerPosition,
  gameCount,
} from "./explorerData.js";

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fullNumber = new Intl.NumberFormat("en");

function formatShare(share) {
  if (share > 0 && share < 0.1) return "<0.1%";
  return `${share.toFixed(1)}%`;
}

function filterSummary(filters) {
  const ratings = filters.ratings.length > 0 &&
    filters.ratings.length < RATING_GROUPS.length
    ? `${filters.ratings.length} rating band${filters.ratings.length === 1 ? "" : "s"}`
    : "All ratings";
  const speeds = filters.speeds.length > 0 &&
    filters.speeds.length < TIME_CONTROLS.length
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

function PopularMoves({
  auth,
  filters,
  onFiltersChange,
  canPlayMoves = true,
  fetchEnabled = true,
  externalPosition = null,
  externalError = false,
}) {
  const { fen, makeMove } = useChess();
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState(filters);
  const [dateError, setDateError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState({ key: null, status: "loading", data: null, error: "" });
  const requestUrl = buildExplorerUrl(fen, filters);
  const activeFilterCount =
    filters.ratings.length +
    filters.speeds.length +
    Number(Boolean(filters.since)) +
    Number(Boolean(filters.until));

  useEffect(() => {
    if (!fetchEnabled || auth.status !== "connected") return;
    const cached = cachedExplorerPosition(requestUrl);
    if (cached) {
      setResult({ key: requestUrl, status: "ready", data: cached });
      return;
    }

    const controller = new AbortController();
    setResult({ key: requestUrl, status: "loading", data: null });

    // Avoid a request for every intermediate position during quick navigation.
    const timer = window.setTimeout(async () => {
      try {
        const prepared = await fetchExplorerPosition(requestUrl, controller.signal, auth.token);
        if (!controller.signal.aborted) {
          setResult({ key: requestUrl, status: "ready", data: prepared });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (error.status === 401 || error.status === 403) auth.invalidate();
          else setResult({ key: requestUrl, status: "error", data: null, error: error.message });
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [requestUrl, retryCount, fetchEnabled, auth.status, auth.token]);

  function openFilters() {
    setDraft(copyFilters(filters));
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
    const error = dateRangeError(draft);
    if (error) {
      setDateError(error);
      return;
    }
    onFiltersChange(draft);
    dialogRef.current?.close();
  }

  let visibleResult;
  if (auth.status === "connecting") {
    visibleResult = { status: "auth-loading" };
  } else if (auth.status !== "connected") {
    visibleResult = { status: "auth-required" };
  } else if (!fetchEnabled) {
    visibleResult = externalError
      ? { status: "bot-error" }
      : externalPosition?.key === requestUrl && externalPosition.data
        ? { status: "ready", data: externalPosition.data }
        : { status: "paused" };
  } else {
    visibleResult = result.key === requestUrl ? result : { status: "loading" };
  }
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
        {visibleResult.status === "auth-loading" && <p>Connecting to Lichess…</p>}
        {visibleResult.status === "auth-required" && (
          <div className="popular-moves__message">
            <p>{auth.error || "Connect Lichess to load rated moves."}</p>
            <button type="button" onClick={auth.connect}>Connect Lichess</button>
          </div>
        )}
        {visibleResult.status === "paused" && <p>Checking rated moves…</p>}
        {visibleResult.status === "bot-error" && <p>Could not check this position. Use Retry bot above.</p>}
        {visibleResult.status === "loading" && <p>Loading Lichess moves…</p>}
        {visibleResult.status === "error" && (
          <div className="popular-moves__message">
            <p>{visibleResult.error || "Could not load Lichess moves for this position."}</p>
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
                      disabled={!canPlayMoves}
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
            <ExplorerFilterFields
              value={draft}
              onToggle={toggleDraft}
              onDateChange={(field, value) => {
                setDraft((current) => ({ ...current, [field]: value }));
                setDateError("");
              }}
              error={dateError}
            />
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
