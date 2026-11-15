import React, { useState } from "react";
import EngineAnalysis from "./EngineAnalysis.jsx";

function EnginePanel() {
  const [enabled, setEnabled] = useState(false);

  return (
    <section className="engine-panel" aria-labelledby="engine-panel-title">
      <div className="engine-panel__header">
        <h2 id="engine-panel-title">Stockfish 19</h2>
        <button
          type="button"
          onClick={() => setEnabled((value) => !value)}
          aria-label={enabled ? "Stop Stockfish engine" : "Load Stockfish engine"}
        >
          {enabled ? "Stop" : "Load"}
        </button>
      </div>
      {enabled ? (
        <EngineAnalysis />
      ) : (
        <p className="engine-panel__intro">
          Full engine · about 95 MB first load · 4s per position · depth varies.
        </p>
      )}
    </section>
  );
}

export default EnginePanel;
