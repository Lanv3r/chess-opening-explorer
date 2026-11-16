import assert from "node:assert/strict";
import test from "node:test";
import { finishLichessLogin, startLichessLogin } from "../src/lichessAuth.js";

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
    values: () => entries.values(),
  };
}

test("Lichess sign-in uses PKCE and exchanges a verified callback once", async (t) => {
  const local = memoryStorage();
  const session = memoryStorage();
  let authorizationUrl;
  let cleanedUrl;
  const location = {
    origin: "http://localhost:5173",
    pathname: "/",
    href: "http://localhost:5173/",
    search: "",
    assign: (url) => { authorizationUrl = url; },
  };
  const browser = {
    location,
    history: { state: null, replaceState: (_state, _title, url) => { cleanedUrl = url; } },
  };
  for (const [name, value] of [
    ["window", browser],
    ["localStorage", local],
    ["sessionStorage", session],
  ]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }

  await startLichessLogin();
  const url = new URL(authorizationUrl);
  const [pending] = [...session.values()].map(JSON.parse);
  assert.equal(url.origin, "https://lichess.org");
  assert.equal(url.pathname, "/oauth");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), pending.state);
  assert.equal(url.searchParams.has("scope"), false);

  location.search = `?code=example-code&state=${pending.state}`;
  location.href += location.search;
  const fetchMock = t.mock.method(globalThis, "fetch", async (requestUrl, options) => {
    assert.equal(requestUrl, "https://lichess.org/api/token");
    assert.equal(options.body.get("code_verifier"), pending.verifier);
    assert.equal(options.body.get("redirect_uri"), pending.redirectUri);
    return { ok: true, json: async () => ({ access_token: "example-token", expires_in: 3600 }) };
  });

  const completion = finishLichessLogin();
  assert.strictEqual(finishLichessLogin(), completion);
  assert.equal(await completion, "example-token");
  assert.equal(fetchMock.mock.calls.length, 1);
  assert.equal(cleanedUrl, "http://localhost:5173/");
  assert.equal(JSON.parse([...local.values()][0]).token, "example-token");
});
