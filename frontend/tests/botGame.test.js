import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import { chooseBotMove } from "../src/botMove.js";
import { fetchExplorerPosition } from "../src/explorerData.js";
import { boardMoveFromExplorer } from "../src/explorerMove.js";
import {
  DEFAULT_MAX_FULL_MOVES,
  gameOutcome,
  isBotTurn,
  isPositionTooRare,
  parseMoveLimit,
  topMoveGameCount,
} from "../src/botGame.js";
import {
  allFilters,
  buildExplorerUrl,
  dateRangeError,
  emptyFilters,
  gameSetupFilters,
  RATING_GROUPS,
  TIME_CONTROLS,
} from "../src/explorerQuery.js";

test("bot weighting favors common moves while boosting less common ones", () => {
  const popular = { uci: "e7e5", white: 100, draws: 0, black: 0 };
  const lessCommon = { uci: "c7c5", white: 25, draws: 0, black: 0 };

  assert.equal(chooseBotMove([lessCommon, popular], () => 0.6), popular);
  // Raw play rate is 80%; square-root weighting gives the top move 2/3.
  assert.equal(chooseBotMove([lessCommon, popular], () => 0.7), lessCommon);
});

test("bot samples only the ten most played moves", () => {
  const moves = Array.from({ length: 11 }, (_, index) => ({
    uci: String(index),
    white: 11 - index,
  }));
  assert.notEqual(chooseBotMove(moves, () => 0.999).uci, "10");
});

test("bot turn and configured full-move ending use the correct side and ply count", () => {
  const game = new Chess();
  assert.equal(isBotTurn(game.fen(), "white"), false);
  assert.equal(isBotTurn(game.fen(), "black"), true);
  assert.equal(gameOutcome(game, DEFAULT_MAX_FULL_MOVES * 2 - 1), null);
  assert.equal(gameOutcome(game, DEFAULT_MAX_FULL_MOVES * 2), "10 full moves complete.");
  assert.equal(gameOutcome(game, 1, 1), null);
  assert.equal(gameOutcome(game, 2, 1), "1 full move complete.");

  game.move("f3");
  game.move("e5");
  game.move("g4");
  game.move("Qh4#");
  assert.equal(gameOutcome(game, 4), "Black wins by checkmate.");
});

test("move limit accepts positive whole numbers only", () => {
  assert.equal(parseMoveLimit("1"), 1);
  assert.equal(parseMoveLimit("10"), 10);
  assert.equal(parseMoveLimit("0"), null);
  assert.equal(parseMoveLimit("-2"), null);
  assert.equal(parseMoveLimit("1.5"), null);
  assert.equal(parseMoveLimit("1e2"), null);
  assert.equal(parseMoveLimit(""), null);
  assert.equal(parseMoveLimit("999999999999999999999"), null);
});

test("game ends below 100 plays of the most popular move", () => {
  const rare = [{ white: 49, draws: 50, black: 0 }];
  const enough = [{ white: 49, draws: 51, black: 0 }];
  assert.equal(topMoveGameCount(rare), 99);
  assert.equal(isPositionTooRare(rare), true);
  assert.equal(isPositionTooRare(enough), false);
  assert.equal(isPositionTooRare([]), true);
});

test("eight available moves remain playable when the top move has 150 games", async (t) => {
  const entries = [
    ["e2e4", "e4", 150],
    ["d2d4", "d4", 30],
    ["g1f3", "Nf3", 20],
    ["c2c4", "c4", 10],
    ["b1c3", "Nc3", 5],
    ["g2g3", "g3", 3],
    ["b2b3", "b3", 2],
    ["f2f4", "f4", 1],
  ];
  const moves = entries.map(([uci, san, white]) => ({
    uci, san, white, draws: 0, black: 0,
  }));
  const fetchMock = t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ white: 221, draws: 0, black: 0, moves }),
  }));

  const position = await fetchExplorerPosition("https://example.test/eight-moves", undefined, "test-token");
  assert.equal(fetchMock.mock.calls[0].arguments[1].headers.Authorization, "Bearer test-token");
  assert.equal(position.totalGames, 221);
  assert.equal(position.moves.length, 8);
  assert.equal(topMoveGameCount(position.moves), 150);
  assert.equal(isPositionTooRare(position.moves), false);

  const first = chooseBotMove(position.moves, () => 0);
  const last = chooseBotMove(position.moves, () => 0.999);
  assert.equal(first.uci, "e2e4");
  assert.equal(last.uci, "f2f4");
  assert.equal(new Chess().move(boardMoveFromExplorer(last)).san, "f4");
});

test("explorer requires a Lichess token before requesting games", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch");
  await assert.rejects(
    fetchExplorerPosition("https://example.test/no-token"),
    /Connect Lichess/,
  );
  assert.equal(fetchMock.mock.calls.length, 0);
});

test("explorer reports expired authentication and rate limits", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 401 }));
  await assert.rejects(
    fetchExplorerPosition("https://example.test/expired", undefined, "test-token"),
    { status: 401 },
  );
  fetchMock.mock.mockImplementation(async () => ({ ok: false, status: 429 }));
  await assert.rejects(
    fetchExplorerPosition("https://example.test/rate-limit", undefined, "test-token"),
    { status: 429 },
  );
});

test("bot explorer request uses the selected ratings and time controls", () => {
  const url = new URL(buildExplorerUrl(new Chess().fen(), {
    ratings: ["1600", "1800"],
    speeds: ["blitz", "rapid"],
    since: "2024-01",
    until: "2024-12",
  }));

  assert.equal(url.searchParams.get("moves"), "10");
  assert.equal(url.searchParams.get("ratings"), "1600,1800");
  assert.equal(url.searchParams.get("speeds"), "blitz,rapid");
  assert.equal(url.searchParams.get("since"), "2024-01");
  assert.equal(url.searchParams.get("until"), "2024-12");
});

test("game setup selects every rating and speed when explorer filters are empty", () => {
  const explorer = emptyFilters();
  const game = gameSetupFilters(explorer);
  assert.deepEqual(game.ratings, RATING_GROUPS.map(({ value }) => value));
  assert.deepEqual(game.speeds, TIME_CONTROLS.map(({ value }) => value));
  assert.equal(game.since, "");
  assert.equal(game.until, "");

  const url = new URL(buildExplorerUrl(new Chess().fen(), game));
  assert.equal(url.searchParams.get("ratings"), game.ratings.join(","));
  assert.equal(url.searchParams.get("speeds"), game.speeds.join(","));
  assert.equal(url.searchParams.has("since"), false);
  assert.equal(url.searchParams.has("until"), false);
  game.ratings.pop();
  assert.deepEqual(explorer, emptyFilters());
});

test("main explorer defaults to every rating and time control with no date range", () => {
  const filters = allFilters();
  assert.deepEqual(filters, gameSetupFilters(emptyFilters()));
  const url = new URL(buildExplorerUrl(new Chess().fen(), filters));
  assert.equal(url.searchParams.get("ratings"), filters.ratings.join(","));
  assert.equal(url.searchParams.get("speeds"), filters.speeds.join(","));
  assert.equal(url.searchParams.has("since"), false);
  assert.equal(url.searchParams.has("until"), false);
});

test("game setup starts from independent selected explorer filters", () => {
  const explorer = {
    ratings: ["1600"],
    speeds: ["blitz"],
    since: "2024-01",
    until: "2024-12",
  };
  const game = gameSetupFilters(explorer);
  game.ratings.push("1800");
  game.speeds.splice(0, 1, "rapid");

  assert.deepEqual(explorer.ratings, ["1600"]);
  assert.deepEqual(explorer.speeds, ["blitz"]);
  assert.deepEqual(game.ratings, ["1600", "1800"]);
  assert.equal(dateRangeError(game), "");
  assert.equal(dateRangeError({ ...game, since: "2025-01" }),
    "Start month must be before end month.");
});
