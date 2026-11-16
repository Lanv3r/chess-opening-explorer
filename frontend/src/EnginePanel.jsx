import React, { useEffect, useState } from "react";
import EngineAnalysis from "./EngineAnalysis.jsx";

function EnginePanel({
  onRunningChange,
  onSnapshotChange,
  autoStart = false,
  concealed = false,
  locked = false,
  canPlayMoves = true,
}) {
  const [enabled, setEnabled] = useState(autoStart);

  useEffect(() => {
    if (autoStart) {
      setEnabled(true);
      onRunningChange(true);
    }
  }, [autoStart, onRunningChange]);

  function toggleEngine() {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    onRunningChange(nextEnabled);
    onSnapshotChange(null);
  }

  return (
    <section className="engine-panel" aria-labelledby="engine-panel-title">
      <div className="engine-panel__header">
        <h2 id="engine-panel-title">Stockfish 19</h2>
        {!locked && (
          <button
            type="button"
            onClick={toggleEngine}
            aria-label={enabled ? "Stop Stockfish engine" : "Load Stockfish engine"}
          >
            {enabled ? "Stop" : "Load"}
          </button>
        )}
      </div>
      {concealed && (
        <p className="engine-panel__intro">Engine lines appear when the game ends.</p>
      )}
      {enabled && (
        <div className="engine-panel__analysis" hidden={concealed}>
          <EngineAnalysis
            onSnapshotChange={onSnapshotChange}
            canPlayMoves={canPlayMoves}
          />
        </div>
      )}
      {!enabled && !concealed && (
        <p className="engine-panel__intro">
          Full engine · about 95 MB first load · 4s per position · depth varies.
        </p>
      )}
    </section>
  );
}

export default EnginePanel;
