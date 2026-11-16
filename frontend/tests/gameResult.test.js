import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import { decisiveResult, finalEvaluation } from "../src/gameResult.js";

const fen = new Chess().fen();
const cp = (score) => ({ scoreType: "cp", score });

test("result labels checkmate for the player and draws", () => {
  const mate = new Chess();
  for (const move of ["f3", "e5", "g4", "Qh4#"]) mate.move(move);
  assert.equal(decisiveResult(mate, "white").title, "Loss");
  assert.equal(decisiveResult(mate, "black").title, "Victory");

  const stalemate = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(decisiveResult(stalemate, "white").title, "Draw");
  assert.equal(decisiveResult(new Chess(), "white"), null);
});

test("final score favors White when positive, while the message uses the player's color", () => {
  assert.deepEqual(finalEvaluation(fen, cp(0), "white"), {
    value: "0.00", message: "The opening was equal.",
  });
  assert.equal(finalEvaluation(fen, cp(99), "white").message,
    "You had a slight advantage after the opening.");
  assert.equal(finalEvaluation(fen, cp(1), "white").value, "+0.01");
  assert.equal(finalEvaluation(fen, cp(100), "white").message,
    "You had a significant advantage after the opening.");
  assert.equal(finalEvaluation(fen, cp(-99), "white").message,
    "You had a slight disadvantage after the opening.");
  assert.equal(finalEvaluation(fen, cp(-1), "white").value, "−0.01");
  assert.equal(finalEvaluation(fen, cp(-100), "white").message,
    "You had a significant disadvantage after the opening.");
  assert.deepEqual(finalEvaluation(fen, cp(125), "black"), {
    value: "+1.25",
    message: "You had a significant disadvantage after the opening.",
  });

  const afterE4 = new Chess();
  afterE4.move("e4");
  assert.deepEqual(finalEvaluation(afterE4.fen(), cp(45), "black"), {
    value: "−0.45",
    message: "You had a slight advantage after the opening.",
  });
  assert.equal(finalEvaluation(fen, { scoreType: "mate", score: 3 }, "white").value, "+M3");
});

