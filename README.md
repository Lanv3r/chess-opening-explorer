# Chess Tutor

This is the starting point for a chess opening tutor. The frontend has an interactive chessboard, the 10 most played next moves from [Lichess's rated-games opening explorer](https://lichess.org/api#tag/Opening-Explorer/operation/openingExplorerLichess), an opening bot, and optional local Stockfish analysis. The `backend/` directory is intentionally empty.

## Run the frontend

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Drag pieces, click a piece and its destination, or click a popular human move to play it. Use the previous/next controls, click a move in the history, or press the left/right arrow keys to revisit positions. The flip control changes board orientation.

The popular-moves box follows the board's current position. Lichess now requires authentication for opening explorer requests, so select **Connect Lichess** and sign in to load rated-game data. Chess Tutor requests no account permissions beyond access to the authenticated explorer endpoint. The browser keeps the sign-in token on this site for subsequent visits; it is never added to the repository.
All rating bands and time controls are selected on the main page by default, with no date range. Use **Filters** to change those selections or add an optional month range. Apply the selections to update the Lichess query; leave a group empty to include all of it.

Select **Load** above the move list to analyze the current position with the full, single-threaded Stockfish 19 browser build. The first download is about 95 MB. Engine moves can be clicked to play them, and **Stop** releases the engine. An evaluation bar appears left of the board while the engine runs. Analysis runs for four seconds per position without a depth cap. `npm run dev` and `npm run build` copy the engine worker, WASM, license, and source information from the pinned `stockfish` dependency into static assets. Generated engine assets are ignored by Git.

Select **Play bot** to start a fresh game as White or Black. Set a positive whole-number limit for full moves (default 10). If the explorer has no filters selected, game setup selects every rating band and time control with no date range. Otherwise, setup copies the explorer filters. Changing them for a game leaves the explorer selections intact. You can choose independently whether to show the evaluation bar and engine moves during play. Engine moves can be clicked on your turn. Hidden analysis appears when the game ends. A game ends at the chosen move limit, on checkmate or draw, or when the most played human move in the current filtered position has fewer than 100 rated games. The bot samples the ten most played moves with weights proportional to the square root of their game counts. This keeps common moves more likely while giving less common moves more chances than their raw play rates. Lichess request failures can be retried.

When a bot game ends, a result dialog appears over the board. Checkmate and draw show the result immediately. Other endings wait for Stockfish's final-position evaluation. Its numeric score is positive for White and negative for Black, while the advantage message is written for the player, including games stopped for insufficient Lichess data. Close the dialog to review the board.

Keep the app within the viewport without page scrolling. The move history and popular-move lists scroll inside their panels.
