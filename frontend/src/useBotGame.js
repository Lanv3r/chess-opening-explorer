import { useEffect, useState } from "react";
import { useChess } from "@mdwebb/react-chess";
import { chooseBotMove } from "./botMove.js";
import {
  DEFAULT_MIN_POSITION_GAMES,
  gameOutcome,
  isBotTurn,
  isPositionTooRare,
} from "./botGame.js";
import { boardMoveFromExplorer } from "./explorerMove.js";
import { fetchExplorerPosition } from "./explorerData.js";
import { buildExplorerUrl } from "./explorerQuery.js";

export function useBotGame(session, filters, auth) {
  const { fen, game, makeMove, moveHistory } = useChess();
  const [state, setState] = useState(() => ({
    phase: session.mode === "bot" ? "active" : "idle",
    botStatus: "idle",
    message: "",
    checkedUrl: null,
    positionData: null,
  }));
  const [retryCount, setRetryCount] = useState(0);
  const minimumGames = session.minimumGames ?? DEFAULT_MIN_POSITION_GAMES;
  const outcome = session.mode === "bot"
    ? gameOutcome(game, moveHistory.length, session.maxFullMoves)
    : null;
  const active = session.mode === "bot" && state.phase === "active" && !outcome;
  const botTurn = session.mode === "bot" && isBotTurn(fen, session.playerColor);
  const requestUrl = buildExplorerUrl(fen, filters);
  const positionReady = active && auth.status === "connected" && !botTurn &&
    state.checkedUrl === requestUrl &&
    state.botStatus === "ready";

  useEffect(() => {
    if (active || !outcome || state.phase !== "active") return;
    setState({ phase: "finished", botStatus: "idle", message: outcome });
  }, [active, outcome, state.phase]);

  useEffect(() => {
    if (!active) return;

    if (auth.status !== "connected") {
      setState((current) => ({
        ...current,
        botStatus: auth.status === "connecting" ? "checking" : "auth-required",
        checkedUrl: null,
        positionData: null,
      }));
      return;
    }

    const controller = new AbortController();
    setState((current) => ({
      ...current,
      botStatus: "checking",
      message: "",
      checkedUrl: null,
      positionData: null,
    }));

    fetchExplorerPosition(requestUrl, controller.signal, auth.token)
      .then((positionData) => {
        if (controller.signal.aborted) return;
        const { totalGames, moves } = positionData;
        const tooRare = isPositionTooRare(totalGames, minimumGames);
        if (tooRare || moves.length === 0) {
          setState({
            phase: "finished",
            botStatus: "idle",
            message: totalGames === 0
              ? "No rated moves found for this position."
              : tooRare
                ? `${totalGames} rated games reached this position (under ${minimumGames}).`
                : "No rated moves available from this position.",
            checkedUrl: requestUrl,
            positionData,
          });
          return;
        }

        if (!botTurn) {
          setState((current) => ({
            ...current,
            botStatus: "ready",
            checkedUrl: requestUrl,
            positionData,
          }));
          return;
        }

        const choice = chooseBotMove(positionData.moves);
        const { from, to, promotion } = boardMoveFromExplorer(choice);
        if (makeMove(from, to, promotion)) {
          setState((current) => ({
            ...current,
            botStatus: "idle",
            checkedUrl: null,
            positionData: null,
          }));
        } else {
          setState((current) => ({
            ...current,
            botStatus: "error",
            message: "The bot could not play that move. Try again.",
            checkedUrl: null,
            positionData: null,
          }));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          if (error.status === 401 || error.status === 403) {
            auth.invalidate();
            return;
          }
          setState((current) => ({
            ...current,
            botStatus: "error",
            message: error.status === 429
              ? error.message
              : "Could not check Lichess moves. Try again.",
            checkedUrl: null,
            positionData: null,
          }));
        }
      });

    return () => controller.abort();
  }, [active, botTurn, requestUrl, makeMove, retryCount, auth.status, auth.token, minimumGames]);

  return {
    ...state,
    active,
    botTurn,
    outcome,
    positionReady,
    retry: () => setRetryCount((count) => count + 1),
  };
}
