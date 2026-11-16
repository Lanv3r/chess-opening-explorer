import React, { useRef, useState } from "react";
import {
  DEFAULT_MAX_FULL_MOVES,
  MIN_TOP_MOVE_GAMES,
  parseMoveLimit,
} from "./botGame.js";
import ExplorerFilterFields from "./ExplorerFilterFields.jsx";
import { copyFilters, dateRangeError, emptyFilters, gameSetupFilters } from "./explorerQuery.js";

function BotGameControls({ session, gameState, plyCount, defaultFilters, auth, onStart, onExit }) {
  const dialogRef = useRef(null);
  const [playerColor, setPlayerColor] = useState("white");
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showEngineMoves, setShowEngineMoves] = useState(false);
  const [moveLimit, setMoveLimit] = useState(String(DEFAULT_MAX_FULL_MOVES));
  const [moveLimitError, setMoveLimitError] = useState("");
  const [gameFilters, setGameFilters] = useState(() => gameSetupFilters(defaultFilters));
  const [dateError, setDateError] = useState("");
  const playing = session.mode === "bot";
  const finished = gameState.phase === "finished" || Boolean(gameState.outcome);
  const maxFullMoves = session.maxFullMoves ?? DEFAULT_MAX_FULL_MOVES;
  const completedMoves = Math.min(Math.floor(plyCount / 2), maxFullMoves);

  const status = finished
    ? gameState.message || gameState.outcome
    : gameState.botStatus === "auth-required"
      ? "Connect Lichess to continue."
    : gameState.botStatus === "error"
      ? gameState.message
      : gameState.botTurn
        ? "Bot is choosing a move…"
        : gameState.positionReady
          ? "Your move"
          : "Checking opening…";

  function openSetup() {
    setGameFilters(gameSetupFilters(defaultFilters));
    setDateError("");
    setMoveLimitError("");
    dialogRef.current?.showModal();
  }

  function toggleGameFilter(group, value) {
    setGameFilters((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }));
  }

  function startConfiguredGame(event) {
    event.preventDefault();
    if (auth.status !== "connected") return;
    const error = dateRangeError(gameFilters);
    const parsedLimit = parseMoveLimit(moveLimit);
    if (error) {
      setDateError(error);
    }
    if (parsedLimit === null) setMoveLimitError("Enter a positive whole number.");
    if (error || parsedLimit === null) return;
    onStart({
      playerColor,
      showEvaluation,
      showEngineMoves,
      maxFullMoves: parsedLimit,
      filters: copyFilters(gameFilters),
    });
  }

  return (
    <div className="bot-game-controls">
      {playing ? (
        <>
          <div className="bot-game-controls__status" aria-live="polite">
            <strong>{status}</strong>
            <small>{completedMoves} / {maxFullMoves} full moves</small>
          </div>
          {gameState.botStatus === "error" && !finished && (
            <button type="button" onClick={gameState.retry}>Retry bot</button>
          )}
          {finished && (
            <button
              type="button"
              onClick={() => onStart({
                playerColor: session.playerColor,
                showEvaluation: session.showEvaluation,
                showEngineMoves: session.showEngineMoves,
                maxFullMoves: session.maxFullMoves,
                filters: copyFilters(session.filters),
              })}
            >
              New game
            </button>
          )}
          <button type="button" onClick={onExit}>Explore</button>
        </>
      ) : (
        <button type="button" onClick={openSetup}>
          Play bot
        </button>
      )}

      <dialog className="bot-setup-dialog" ref={dialogRef} aria-labelledby="bot-setup-title">
        <button
          className="bot-setup-dialog__close"
          type="button"
          aria-label="Close game setup"
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>
        <form onSubmit={startConfiguredGame} noValidate>
          <h2 id="bot-setup-title">Play the opening bot</h2>
          <p>Practice against popular moves from rated Lichess games.</p>

          <fieldset>
            <legend>Your color</legend>
            <label>
              <input
                type="radio"
                name="player-color"
                checked={playerColor === "white"}
                onChange={() => setPlayerColor("white")}
              />
              White
            </label>
            <label>
              <input
                type="radio"
                name="player-color"
                checked={playerColor === "black"}
                onChange={() => setPlayerColor("black")}
              />
              Black
            </label>
          </fieldset>

          <div className="bot-setup-dialog__move-limit">
            <label htmlFor="bot-move-limit">Maximum full moves</label>
            <div className="bot-setup-dialog__limit-input">
              <input
                id="bot-move-limit"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={moveLimit}
                onChange={(event) => {
                  setMoveLimit(event.target.value);
                  setMoveLimitError("");
                }}
                aria-invalid={Boolean(moveLimitError)}
                aria-describedby={moveLimitError ? "bot-move-limit-error" : undefined}
              />
              <button
                type="button"
                className="bot-setup-dialog__info"
                aria-label={`The game will terminate if the top1 move has been played less than ${MIN_TOP_MOVE_GAMES} times`}
              >
                i
                <span className="bot-setup-dialog__tooltip" role="tooltip">
                  The game will terminate if the top1 move has been played less than {MIN_TOP_MOVE_GAMES} times
                </span>
              </button>
            </div>
            {moveLimitError && (
              <p id="bot-move-limit-error" className="bot-setup-dialog__error" role="alert">
                {moveLimitError}
              </p>
            )}
          </div>

          <label className="bot-setup-dialog__evaluation">
            <input
              type="checkbox"
              checked={showEvaluation}
              onChange={(event) => setShowEvaluation(event.target.checked)}
            />
            Show evaluation bar while playing
          </label>
          <label className="bot-setup-dialog__engine-moves">
            <input
              type="checkbox"
              checked={showEngineMoves}
              onChange={(event) => setShowEngineMoves(event.target.checked)}
            />
            Show engine moves while playing
          </label>
          <div className="bot-setup-dialog__filters-heading">
            <h3>Bot move filters</h3>
            <button
              type="button"
              onClick={() => {
                setGameFilters(emptyFilters());
                setDateError("");
              }}
            >
              Clear all
            </button>
          </div>
          <ExplorerFilterFields
            value={gameFilters}
            onToggle={toggleGameFilter}
            onDateChange={(field, value) => {
              setGameFilters((current) => ({ ...current, [field]: value }));
              setDateError("");
            }}
            error={dateError}
          />

          {auth.status !== "connected" && (
            <div className="bot-setup-dialog__auth">
              <p>{auth.error || "Connect Lichess to use rated game data."}</p>
              <button type="button" onClick={auth.connect}>Connect Lichess</button>
            </div>
          )}

          <div className="bot-setup-dialog__actions">
            <button type="button" onClick={() => dialogRef.current?.close()}>Cancel</button>
            <button type="submit" disabled={auth.status !== "connected"}>Start game</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export default BotGameControls;
