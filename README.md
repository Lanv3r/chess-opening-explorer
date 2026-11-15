# Chess Tutor

This is the starting point for a chess opening tutor. The frontend shows an interactive chessboard, the 10 most played next moves from [Lichess's rated-games opening explorer](https://lichess.org/api#tag/Opening-Explorer/operation/openingExplorerLichess), and optional local Stockfish analysis. The `backend/` directory is intentionally empty.

## Run the frontend

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Drag pieces, click a piece and its destination, or click a popular human move to play it. Use the previous/next controls, click a move in the history, or press the left/right arrow keys to revisit positions. The flip control changes board orientation.

The popular-moves box follows the board's current position and needs an internet connection to load Lichess data.
Use **Filters** to select multiple rating bands and time controls, plus an optional month range. Apply the selections to update the Lichess query; leave a group empty to include all of it.

Select **Load** above the move list to analyze the current position with the full, single-threaded Stockfish 19 browser build. The first download is about 95 MB. Engine moves can be clicked to play them, and **Stop** releases the engine. Analysis runs for four seconds per position without a depth cap. `npm run dev` and `npm run build` copy the engine worker, WASM, license, and source information from the pinned `stockfish` dependency into static assets. Generated engine assets are ignored by Git.

Keep the app within the viewport without page scrolling. The move history, engine analysis, and popular-move lists scroll inside their panels.
