# Chess Tutor

This is the starting point for a chess opening tutor. The frontend shows an interactive chessboard and the 10 most played next moves from [Lichess's rated-games opening explorer](https://lichess.org/api#tag/Opening-Explorer/operation/openingExplorerLichess). All ratings and time controls are included. The `backend/` directory is intentionally empty; computer move suggestions have not been implemented yet.

## Run the frontend

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Drag pieces, click a piece and its destination, or click a popular human move to play it. Use the previous/next controls, click a move in the history, or press the left/right arrow keys to revisit positions. The flip control changes board orientation.

The popular-moves box follows the board's current position and needs an internet connection to load Lichess data.
Use **Filters** to select multiple rating bands and time controls, plus an optional month range. Apply the selections to update the Lichess query; leave a group empty to include all of it.

Keep the app within the viewport without page scrolling. On smaller screens, the move history and popular-move lists can scroll inside their panels.
