const SEARCH_TIME_MS = 4000;

export function parseEngineInfo(line) {
  if (!line.startsWith("info ") || /\b(?:lowerbound|upperbound)\b/.test(line)) {
    return null;
  }

  const depth = line.match(/\bdepth (\d+)\b/);
  const multipv = line.match(/\bmultipv (\d+)\b/);
  const score = line.match(/\bscore (cp|mate) (-?\d+)\b/);
  const pv = line.match(/\bpv (.+)$/);
  if (!depth || !score || !pv) return null;

  const moves = pv[1].trim().split(/\s+/);
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(moves[0])) return null;

  return {
    depth: Number(depth[1]),
    rank: multipv ? Number(multipv[1]) : 1,
    scoreType: score[1],
    score: Number(score[2]),
    pv: moves,
  };
}

export class StockfishController {
  constructor(worker, onUpdate) {
    this.worker = worker;
    this.onUpdate = onUpdate;
    this.ready = false;
    this.searching = false;
    this.stopping = false;
    this.disposed = false;
    this.requestedFen = null;
    this.activeFen = null;
    this.lines = new Map();

    worker.onmessage = (event) => {
      for (const line of String(event.data).split(/\r?\n/)) {
        this.handleLine(line.trim());
      }
    };
    worker.onerror = () => this.fail("Could not load the Stockfish engine.");
  }

  start() {
    this.emit("loading");
    this.worker.postMessage("uci");
  }

  analyze(fen) {
    if (this.disposed || fen === this.requestedFen) return;
    this.requestedFen = fen;

    if (!this.ready) {
      this.emit("loading");
    } else if (this.searching) {
      if (!this.stopping) {
        this.stopping = true;
        this.worker.postMessage("stop");
      }
      this.emit("waiting");
    } else {
      this.beginSearch(fen);
    }
  }

  beginSearch(fen) {
    this.activeFen = fen;
    this.searching = true;
    this.stopping = false;
    this.lines.clear();
    this.emit("analyzing");
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go movetime ${SEARCH_TIME_MS}`);
  }

  handleLine(line) {
    if (this.disposed) return;

    if (line === "uciok") {
      this.worker.postMessage("setoption name MultiPV value 3");
      this.worker.postMessage("isready");
      return;
    }
    if (line === "readyok") {
      this.ready = true;
      if (this.requestedFen && !this.searching) this.beginSearch(this.requestedFen);
      return;
    }
    if (line.startsWith("info string CRITICAL ERROR")) {
      this.fail("Stockfish could not analyze this position.");
      return;
    }
    if (line.startsWith("bestmove ")) {
      this.searching = false;
      if (this.requestedFen && this.requestedFen !== this.activeFen) {
        this.beginSearch(this.requestedFen);
      } else {
        this.emit("complete");
      }
      return;
    }
    if (this.stopping || this.activeFen !== this.requestedFen) return;

    const info = parseEngineInfo(line);
    if (info) {
      this.lines.set(info.rank, info);
      this.emit("analyzing");
    }
  }

  emit(status, message) {
    if (this.disposed) return;
    this.onUpdate({
      status,
      message,
      fen: this.requestedFen,
      lines: this.activeFen === this.requestedFen && status !== "waiting"
        ? [...this.lines.values()].sort((a, b) => a.rank - b.rank)
        : [],
    });
  }

  fail(message) {
    this.emit("error", message);
    this.dispose();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
  }
}
