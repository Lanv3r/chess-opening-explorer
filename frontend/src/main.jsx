import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Board,
  BoardControls,
  ChessProvider,
  MoveHistory,
  Navigation,
  useChess,
} from "@mdwebb/react-chess";
import "@mdwebb/react-chess/styles";
import BotGameControls from "./BotGameControls.jsx";
import { syncBoardTurn } from "./boardTurn.js";
import EvaluationBar from "./EvaluationBar.jsx";
import EnginePanel from "./EnginePanel.jsx";
import GameResultDialog from "./GameResultDialog.jsx";
import PopularMoves from "./PopularMoves.jsx";
import { DEFAULT_MAX_FULL_MOVES } from "./botGame.js";
import { allFilters } from "./explorerQuery.js";
import { useLichessAuth } from "./lichessAuth.js";
import { useBotGame } from "./useBotGame.js";
import "./styles.css";

function KeyboardNavigation({ disabled }) {
  const { currentMoveIndex, moveHistory, goPrevious, goNext } = useChess();

  useEffect(() => {
    if (disabled) return;
    function handleKeyDown(event) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.target instanceof Element &&
          event.target.closest("dialog, input, textarea, select, [contenteditable]"))
      ) {
        return;
      }

      if (event.key === "ArrowLeft" && currentMoveIndex >= 0) {
        event.preventDefault();
        goPrevious();
      } else if (
        event.key === "ArrowRight" &&
        currentMoveIndex < moveHistory.length - 1
      ) {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, currentMoveIndex, moveHistory.length, goPrevious, goNext]);

  return null;
}

function Workspace({
  auth,
  session,
  mainFilters,
  onMainFiltersChange,
  onGameFiltersChange,
  onStartGame,
  onExitGame,
}) {
  const { api, fen, game, moveHistory } = useChess();
  const botMode = session.mode === "bot";
  const activeFilters = botMode ? session.filters : mainFilters;
  const botGame = useBotGame(session, activeFilters, auth);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineSnapshot, setEngineSnapshot] = useState(null);
  const [resultDismissed, setResultDismissed] = useState(false);
  const finished = botMode && !botGame.active;
  const showResult = finished && !resultDismissed;
  const showEvaluationBar = engineRunning && engineSnapshot?.status !== "error" &&
    (!botMode || session.showEvaluation || finished);
  const canPlay = !botMode || botGame.positionReady;
  const boardLocked = botMode && !canPlay;
  const autoStartEngine = botMode &&
    (session.showEvaluation || session.showEngineMoves || finished);

  useEffect(() => {
    syncBoardTurn(api, fen);
  }, [api, fen]);

  return (
    <>
      <header className="intro">
        <div>
          <span className="eyebrow">Opening practice</span>
          <h1>Chess Tutor</h1>
        </div>
        <BotGameControls
          session={session}
          gameState={botGame}
          plyCount={moveHistory.length}
          defaultFilters={mainFilters}
          auth={auth}
          onStart={onStartGame}
          onExit={onExitGame}
        />
      </header>

      <section className="board-area" aria-label="Chess opening explorer">
        <KeyboardNavigation disabled={botGame.active || showResult} />
        <div className={`workspace${showEvaluationBar ? " workspace--with-evaluation" : ""}`}>
          <div className="board-column">
            <div className="board-with-evaluation">
              {showEvaluationBar && <EvaluationBar snapshot={engineSnapshot} />}
              <div className="board-input-area">
                <Board
                  width="var(--board-size)"
                  height="var(--board-size)"
                  movable={botMode ? { free: false, color: session.playerColor } : undefined}
                />
                {boardLocked && <div className="board-input-shield" aria-hidden="true" />}
                {showResult && (
                  <GameResultDialog
                    game={game}
                    fen={fen}
                    playerColor={session.playerColor}
                    reason={botGame.message || botGame.outcome}
                    snapshot={engineSnapshot}
                    onClose={() => setResultDismissed(true)}
                  />
                )}
              </div>
            </div>
            <div className="board-controls">
              {!botGame.active && !showResult && <Navigation />}
              {!showResult && <BoardControls />}
            </div>
          </div>
          <div className="history-column">
            <EnginePanel
              onRunningChange={setEngineRunning}
              onSnapshotChange={setEngineSnapshot}
              autoStart={autoStartEngine}
              concealed={botGame.active && !session.showEngineMoves}
              locked={botMode}
              canPlayMoves={!botMode || (session.showEngineMoves && canPlay)}
            />
            <MoveHistory
              className="history-panel"
              aria-label="Move history"
              onMoveClick={botGame.active || showResult ? () => {} : undefined}
              style={{ height: "auto" }}
            />
          </div>
          <PopularMoves
            auth={auth}
            filters={activeFilters}
            onFiltersChange={botMode ? onGameFiltersChange : onMainFiltersChange}
            canPlayMoves={canPlay}
            fetchEnabled={!botGame.active}
            externalPosition={botGame.active ? {
              key: botGame.checkedUrl,
              data: botGame.positionData,
            } : null}
            externalError={botGame.active && botGame.botStatus === "error"}
          />
        </div>
      </section>
    </>
  );
}

function App() {
  const auth = useLichessAuth();
  const [filters, setFilters] = useState(allFilters);
  const [session, setSession] = useState({
    id: 0,
    mode: "explore",
    playerColor: "white",
    showEvaluation: false,
    showEngineMoves: false,
    maxFullMoves: DEFAULT_MAX_FULL_MOVES,
  });

  function startGame({
    playerColor,
    showEvaluation,
    showEngineMoves,
    maxFullMoves,
    filters: gameFilters,
  }) {
    setSession((current) => ({
      id: current.id + 1,
      mode: "bot",
      playerColor,
      showEvaluation,
      showEngineMoves,
      maxFullMoves,
      filters: gameFilters,
    }));
  }

  function changeGameFilters(nextFilters) {
    setSession((current) => ({ ...current, filters: nextFilters }));
  }

  function exitGame() {
    setSession((current) => ({
      ...current,
      id: current.id + 1,
      mode: "explore",
    }));
  }

  return (
    <main className="page">
      <ChessProvider
        key={session.id}
        theme="brown"
        orientation={session.mode === "bot" ? session.playerColor : "white"}
        enableKeyboardNavigation={false}
      >
        <Workspace
          auth={auth}
          session={session}
          mainFilters={filters}
          onMainFiltersChange={setFilters}
          onGameFiltersChange={changeGameFilters}
          onStartGame={startGame}
          onExitGame={exitGame}
        />
      </ChessProvider>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
