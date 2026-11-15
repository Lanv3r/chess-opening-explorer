import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import { describeEngineLine } from "../src/enginePresentation.js";

test("shows a white badge and numbered moves when White is better", () => {
  const line = describeEngineLine(new Chess().fen(), {
    scoreType: "cp",
    score: 42,
    pv: ["e2e4", "e7e5", "g1f3", "b8c6"],
  });

  assert.deepEqual(line, {
    evaluation: "+0.42",
    winningSide: "white",
    sequence: "1. e4 e5 2. Nf3 Nc6",
    firstMove: "e4",
  });
});

test("flips side-to-move scores and numbers a Black-first sequence", () => {
  const game = new Chess();
  game.move("e4");
  const line = describeEngineLine(game.fen(), {
    scoreType: "cp",
    score: 45,
    pv: ["e7e5", "g1f3", "b8c6"],
  });

  assert.deepEqual(line, {
    evaluation: "−0.45",
    winningSide: "black",
    sequence: "1... e5 2. Nf3 Nc6",
    firstMove: "e5",
  });
});

test("shows a neutral badge for equality and the winner for mate", () => {
  const fen = new Chess().fen();
  assert.equal(describeEngineLine(fen, {
    scoreType: "cp", score: 0, pv: ["e2e4"],
  }).winningSide, "equal");
  const mate = describeEngineLine(fen, {
    scoreType: "mate", score: -3, pv: ["e2e4"],
  });
  assert.equal(mate.evaluation, "−M3");
  assert.equal(mate.winningSide, "black");
});
