export function syncBoardTurn(api, fen) {
  if (!api) return;
  api.set({ turnColor: fen.split(" ")[1] === "b" ? "black" : "white" });
}
