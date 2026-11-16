import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import { canMove } from "chessground/board";
import { configure } from "chessground/config";
import { defaults } from "chessground/state";
import { syncBoardTurn } from "../src/boardTurn.js";

test("Black can move on the board after the bot's first White move", (t) => {
  const previousWindow = globalThis.window;
  globalThis.window = {};
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  const game = new Chess();
  game.move("e4");
  const state = defaults();
  configure(state, {
    fen: game.fen(),
    movable: { free: false, color: "black", dests: new Map([["e7", ["e5"]]]) },
  });
  const api = { set: (config) => configure(state, config) };

  assert.equal(canMove(state, "e7", "e5"), false);
  syncBoardTurn(api, game.fen());
  assert.equal(canMove(state, "e7", "e5"), true);

  game.move("e5");
  configure(state, {
    fen: game.fen(),
    movable: { color: "white", dests: new Map([["g1", ["f3"]]]) },
  });
  syncBoardTurn(api, game.fen());
  assert.equal(canMove(state, "g1", "f3"), true);
});
