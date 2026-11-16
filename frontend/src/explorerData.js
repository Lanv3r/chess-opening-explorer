export function gameCount(entry) {
  return (entry.white ?? 0) + (entry.draws ?? 0) + (entry.black ?? 0);
}

const resultsCache = new Map();

export function cachedExplorerPosition(url) {
  return resultsCache.get(url);
}

export async function fetchExplorerPosition(url, signal, token) {
  if (!token) throw new Error("Connect Lichess to load rated moves.");
  const cached = resultsCache.get(url);
  if (cached) return cached;

  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401 || response.status === 403) {
    const error = new Error("Lichess sign-in expired. Connect again.");
    error.status = response.status;
    throw error;
  }
  if (response.status === 429) {
    const error = new Error("Lichess is limiting requests. Wait a minute, then try again.");
    error.status = response.status;
    throw error;
  }
  if (!response.ok) throw new Error(`Lichess returned ${response.status}`);

  const data = await response.json();
  if (!Array.isArray(data.moves)) throw new Error("Invalid Lichess response");

  const prepared = {
    totalGames: gameCount(data),
    moves: [...data.moves]
      .sort((a, b) => gameCount(b) - gameCount(a))
      .slice(0, 10),
  };
  resultsCache.set(url, prepared);
  return prepared;
}
