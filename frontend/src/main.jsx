import React, { useEffect } from "react";
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
import EnginePanel from "./EnginePanel.jsx";
import PopularMoves from "./PopularMoves.jsx";
import "./styles.css";

function KeyboardNavigation() {
  const { currentMoveIndex, moveHistory, goPrevious, goNext } = useChess();

  useEffect(() => {
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
  }, [currentMoveIndex, moveHistory.length, goPrevious, goNext]);

  return null;
}

function App() {
  return (
    <main className="page">
      <header className="intro">
        <span className="eyebrow">Opening practice</span>
        <h1>Chess Tutor</h1>
      </header>

      <section className="board-area" aria-label="Chess opening explorer">
        <ChessProvider theme="brown" enableKeyboardNavigation={false}>
          <KeyboardNavigation />
          <div className="workspace">
            <div className="board-column">
              <Board width="var(--board-size)" height="var(--board-size)" />
              <div className="board-controls">
                <Navigation />
                <BoardControls />
              </div>
            </div>
            <div className="history-column">
              <EnginePanel />
              <MoveHistory
                className="history-panel"
                aria-label="Move history"
                style={{ height: "auto" }}
              />
            </div>
            <PopularMoves />
          </div>
        </ChessProvider>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
