import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import { boardMoveFromExplorer } from "../src/explorerMove.js";

const board = "r3k2r/8/8/8/8/8/8/R3K2R";

for (const [side, san, uci, destination] of [
  ["w", "O-O", "e1h1", "g1"],
  ["w", "O-O-O", "e1a1", "c1"],
  ["b", "O-O", "e8h8", "g8"],
  ["b", "O-O-O", "e8a8", "c8"],
]) {
  test(`${side} ${san} from Lichess plays as castling`, () => {
    const game = new Chess(`${board} ${side} KQkq - 0 1`);
    const converted = boardMoveFromExplorer({ san, uci });
    assert.equal(converted.to, destination);
    assert.equal(game.move(converted).san, san);
  });
}

test("castling with check and ordinary moves retain their meaning", () => {
  assert.deepEqual(boardMoveFromExplorer({ san: "O-O+", uci: "e1h1" }), {
    from: "e1", to: "g1", promotion: undefined,
  });
  assert.deepEqual(boardMoveFromExplorer({ san: "Rh1", uci: "e1h1" }), {
    from: "e1", to: "h1", promotion: undefined,
  });
  assert.deepEqual(boardMoveFromExplorer({ san: "e8=Q", uci: "e7e8q" }), {
    from: "e7", to: "e8", promotion: "q",
  });
});
