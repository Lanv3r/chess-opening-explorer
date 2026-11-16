import React from "react";
import { RATING_GROUPS, TIME_CONTROLS } from "./explorerQuery.js";

function ExplorerFilterFields({ value, onToggle, onDateChange, error }) {
  return (
    <div className="explorer-filter-fields">
      <fieldset>
        <legend>Rating bands</legend>
        <div className="explorer-filter-fields__options">
          {RATING_GROUPS.map(({ value: rating, label }) => (
            <label className="explorer-filter-fields__option" key={rating}>
              <input
                type="checkbox"
                checked={value.ratings.includes(rating)}
                onChange={() => onToggle("ratings", rating)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Time controls</legend>
        <div className="explorer-filter-fields__options">
          {TIME_CONTROLS.map(({ value: speed, label }) => (
            <label className="explorer-filter-fields__option" key={speed}>
              <input
                type="checkbox"
                checked={value.speeds.includes(speed)}
                onChange={() => onToggle("speeds", speed)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Game dates</legend>
        <div className="explorer-filter-fields__dates">
          <label>
            From
            <input
              type="month"
              value={value.since}
              onChange={(event) => onDateChange("since", event.target.value)}
            />
          </label>
          <label>
            Through
            <input
              type="month"
              value={value.until}
              onChange={(event) => onDateChange("until", event.target.value)}
            />
          </label>
        </div>
        {error && <p className="explorer-filter-fields__error" role="alert">{error}</p>}
      </fieldset>
    </div>
  );
}

export default ExplorerFilterFields;
