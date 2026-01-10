import chokidar, { type FSWatcher } from "chokidar";
import * as path from "path";

const NB_DIR = process.env.NB_DIR || path.join(process.cwd(), "data/notes");

type ChangeCallback = (event: "add" | "change" | "unlink", filepath: string) => void;

let watcher: FSWatcher | null = null;
const callbacks: Set<ChangeCallback> = new Set();

export function startWatcher(): void {
  if (watcher) return;

  watcher = chokidar.watch(`${NB_DIR}/**/*.md`, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  watcher
    .on("add", (filepath) => notifyAll("add", filepath))
    .on("change", (filepath) => notifyAll("change", filepath))
    .on("unlink", (filepath) => notifyAll("unlink", filepath));
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

export function subscribe(callback: ChangeCallback): () => void {
  callbacks.add(callback);
  return () => callbacks.delete(callback);
}

function notifyAll(event: "add" | "change" | "unlink", filepath: string): void {
  callbacks.forEach((cb) => cb(event, filepath));
}

export function getWatcherStatus(): { running: boolean; watchedPaths: number } {
  if (!watcher) {
    return { running: false, watchedPaths: 0 };
  }
  const watched = watcher.getWatched();
  const count = Object.values(watched).reduce((sum, files) => sum + files.length, 0);
  return { running: true, watchedPaths: count };
}
