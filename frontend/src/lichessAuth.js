import { useEffect, useState } from "react";

const CLIENT_ID = "lanv3r-chess-opening-explorer";
const TOKEN_KEY = "chess-tutor-lichess-token";
const PENDING_KEY = "chess-tutor-lichess-oauth";

function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(length) {
  return base64Url(crypto.getRandomValues(new Uint8Array(length)));
}

function storedToken() {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  try {
    const { token, expiresAt } = JSON.parse(stored);
    if (typeof token === "string" && expiresAt > Date.now()) return token;
  } catch {
    // An invalid or expired token needs a fresh sign-in.
  }
  localStorage.removeItem(TOKEN_KEY);
  return null;
}

function clearCallbackParams() {
  const url = new URL(window.location.href);
  for (const name of ["code", "state", "error", "error_description"]) {
    url.searchParams.delete(name);
  }
  window.history.replaceState(window.history.state, "", url.toString());
}

export async function startLichessLogin() {
  const verifier = randomString(48);
  const state = randomString(24);
  const redirectUri = window.location.origin + window.location.pathname;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state, redirectUri }));

  const url = new URL("https://lichess.org/oauth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);
  window.location.assign(url.toString());
}

let loginCompletion;

export function finishLichessLogin() {
  if (!loginCompletion) loginCompletion = completeLichessLogin();
  return loginCompletion;
}

async function completeLichessLogin() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("code") && !params.has("error")) return storedToken();

  localStorage.removeItem(TOKEN_KEY);
  const pending = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  clearCallbackParams();
  if (!pending) throw new Error("Lichess sign-in expired. Please try again.");

  const { verifier, state, redirectUri } = JSON.parse(pending);
  if (!state || params.get("state") !== state) {
    throw new Error("Lichess sign-in could not be verified. Please try again.");
  }
  if (params.has("error")) {
    throw new Error("Lichess sign-in was cancelled. Please try again.");
  }

  const response = await fetch("https://lichess.org/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.get("code"),
      code_verifier: verifier,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
    }),
  });
  if (!response.ok) throw new Error("Lichess sign-in failed. Please try again.");
  const result = await response.json();
  if (typeof result.access_token !== "string" || !Number.isFinite(result.expires_in)) {
    throw new Error("Lichess returned an invalid sign-in response.");
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify({
    token: result.access_token,
    expiresAt: Date.now() + result.expires_in * 1000,
  }));
  return result.access_token;
}

export function useLichessAuth() {
  const [auth, setAuth] = useState({ status: "connecting", token: null, error: "" });

  useEffect(() => {
    let mounted = true;
    finishLichessLogin()
      .then((token) => {
        if (mounted) setAuth({ status: token ? "connected" : "disconnected", token, error: "" });
      })
      .catch((error) => {
        if (mounted) setAuth({ status: "disconnected", token: null, error: error.message });
      });
    return () => { mounted = false; };
  }, []);

  return {
    ...auth,
    connect: () => startLichessLogin().catch((error) => {
      setAuth({ status: "disconnected", token: null, error: error.message });
    }),
    invalidate: () => {
      localStorage.removeItem(TOKEN_KEY);
      setAuth({ status: "disconnected", token: null, error: "Lichess sign-in expired. Connect again." });
    },
  };
}
