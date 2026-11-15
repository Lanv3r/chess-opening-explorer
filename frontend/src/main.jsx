import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Chessboard, useChess } from "@mdwebb/react-chess";
import "@mdwebb/react-chess/styles";
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
          event.target.closest("input, textarea, select, [contenteditable]"))
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
        <p>Make moves, then revisit them with the controls, move list, or arrow keys.</p>
      </header>

      <section className="board-area" aria-label="Interactive chessboard">
        <Chessboard
          width="min(88vw, 560px)"
          height="min(88vw, 560px)"
          theme="brown"
          moveHistoryWidth={280}
          showMoveHistory
          showNavigation
          showBoardControls
          enableKeyboardNavigation={false}
        >
          <KeyboardNavigation />
        </Chessboard>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
