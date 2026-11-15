const EXPLORER_URL = "https://explorer.lichess.org/lichess";

export const RATING_GROUPS = [
  { value: "0", label: "Under 1000" },
  { value: "1000", label: "1000–1199" },
  { value: "1200", label: "1200–1399" },
  { value: "1400", label: "1400–1599" },
  { value: "1600", label: "1600–1799" },
  { value: "1800", label: "1800–1999" },
  { value: "2000", label: "2000–2199" },
  { value: "2200", label: "2200–2499" },
  { value: "2500", label: "2500+" },
];

export const TIME_CONTROLS = [
  { value: "ultraBullet", label: "Ultra bullet" },
  { value: "bullet", label: "Bullet" },
  { value: "blitz", label: "Blitz" },
  { value: "rapid", label: "Rapid" },
  { value: "classical", label: "Classical" },
  { value: "correspondence", label: "Correspondence" },
];

export function emptyFilters() {
  return { ratings: [], speeds: [], since: "", until: "" };
}

export function buildExplorerUrl(fen, filters) {
  const url = new URL(EXPLORER_URL);
  url.searchParams.set("variant", "standard");
  url.searchParams.set("fen", fen);
  url.searchParams.set("moves", "10");
  url.searchParams.set("topGames", "0");
  url.searchParams.set("recentGames", "0");

  const ratings = RATING_GROUPS.filter(({ value }) => filters.ratings.includes(value));
  const speeds = TIME_CONTROLS.filter(({ value }) => filters.speeds.includes(value));
  if (ratings.length) {
    url.searchParams.set("ratings", ratings.map(({ value }) => value).join(","));
  }
  if (speeds.length) {
    url.searchParams.set("speeds", speeds.map(({ value }) => value).join(","));
  }
  if (filters.since) url.searchParams.set("since", filters.since);
  if (filters.until) url.searchParams.set("until", filters.until);

  return url.toString();
}
