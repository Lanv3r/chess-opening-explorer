import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";

const source = new URL("../node_modules/stockfish/", import.meta.url);
const destination = new URL("../public/stockfish/", import.meta.url);
const files = [
  ["bin/stockfish-19-single.js", "stockfish-19-single.js"],
  ["bin/stockfish-19-single.wasm", "stockfish-19-single.wasm"],
  ["Copying.txt", "Copying.txt"],
];

await mkdir(destination, { recursive: true });

for (const [from, to] of files) {
  const sourceFile = new URL(from, source);
  const destinationFile = new URL(to, destination);
  const sourceInfo = await stat(sourceFile);
  const destinationInfo = await stat(destinationFile).catch(() => null);

  if (
    !destinationInfo ||
    destinationInfo.size !== sourceInfo.size ||
    destinationInfo.mtimeMs < sourceInfo.mtimeMs
  ) {
    await copyFile(sourceFile, destinationFile);
  }
}

await writeFile(
  new URL("SOURCE.txt", destination),
  "Stockfish.js 19.0.1 (full, single-threaded)\n" +
    "Source and build instructions: https://github.com/nmrugg/stockfish.js/tree/v19.0.1\n" +
    "License: GNU GPL v3; see Copying.txt in this directory.\n",
);

console.log("Stockfish 19 full browser engine is ready.");
