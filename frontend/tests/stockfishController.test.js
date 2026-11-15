import assert from "node:assert/strict";
import test from "node:test";
import { parseEngineInfo, StockfishController } from "../src/stockfishController.js";

class FakeWorker {
  commands = [];
  terminated = false;

  postMessage(command) {
    this.commands.push(command);
  }

  emit(line) {
    this.onmessage({ data: line });
  }

  terminate() {
    this.terminated = true;
  }
}

test("parses ranked Stockfish analysis lines", () => {
  assert.deepEqual(
    parseEngineInfo("info depth 16 seldepth 23 multipv 2 score cp -34 nodes 1234 pv d2d4 d7d5"),
    { depth: 16, rank: 2, scoreType: "cp", score: -34, pv: ["d2d4", "d7d5"] },
  );
  assert.equal(parseEngineInfo("info depth 16 score cp 12 lowerbound pv e2e4"), null);
});

test("discards old analysis and searches only the latest position", () => {
  const worker = new FakeWorker();
  const snapshots = [];
  const controller = new StockfishController(worker, (snapshot) => snapshots.push(snapshot));

  controller.analyze("position-a");
  controller.start();
  worker.emit("uciok");
  worker.emit("readyok");
  assert.deepEqual(worker.commands.slice(0, 5), [
    "uci",
    "setoption name MultiPV value 3",
    "isready",
    "position fen position-a",
    "go movetime 4000",
  ]);

  worker.emit("info depth 8 multipv 1 score cp 25 pv e2e4 e7e5");
  assert.equal(snapshots.at(-1).lines[0].pv[0], "e2e4");

  controller.analyze("position-b");
  controller.analyze("position-c");
  assert.equal(worker.commands.filter((command) => command === "stop").length, 1);
  worker.emit("info depth 9 multipv 1 score cp 30 pv d2d4 d7d5");
  assert.equal(snapshots.at(-1).fen, "position-c");
  assert.deepEqual(snapshots.at(-1).lines, []);

  worker.emit("bestmove e2e4");
  assert.equal(worker.commands.at(-2), "position fen position-c");
  assert.equal(worker.commands.at(-1), "go movetime 4000");
  worker.emit("info depth 6 multipv 1 score cp -15 pv g1f3 d7d5");
  worker.emit("bestmove g1f3");
  assert.equal(snapshots.at(-1).status, "complete");
  assert.equal(snapshots.at(-1).fen, "position-c");
  assert.equal(snapshots.at(-1).lines[0].pv[0], "g1f3");

  controller.dispose();
  assert.equal(worker.terminated, true);
});
