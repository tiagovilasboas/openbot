import { chmodSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PRIVATE_DIR_MODE = 0o700;

type DataDirOptions = {
  env?: Record<string, string | undefined>;
  home?: string;
};

// OPENBOT_DATA_DIR wins; otherwise the data lives in ~/.openbot.
export function resolveDataDir(options: DataDirOptions = {}): string {
  const env = options.env ?? process.env;
  const override = env.OPENBOT_DATA_DIR?.trim();
  if (override) return override;
  return join(options.home ?? homedir(), ".openbot");
}

// Creates the directory when missing and tightens it to owner-only access.
export function ensureDataDir(dir: string): string {
  mkdirSync(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
  if ((statSync(dir).mode & 0o777) !== PRIVATE_DIR_MODE) {
    chmodSync(dir, PRIVATE_DIR_MODE);
  }
  return dir;
}
