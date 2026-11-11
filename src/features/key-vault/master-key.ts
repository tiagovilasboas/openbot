import { randomBytes } from "node:crypto";
import {
  chmodSync,
  linkSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  ensureDataDir,
  resolveDataDir,
} from "../../shared/local-store/data-dir.ts";

const KEY_BYTES = 32;
const KEY_FILE = "vault.key";
const PRIVATE_FILE_MODE = 0o600;

type MasterKeyOptions = {
  env?: Record<string, string | undefined>;
  dir?: string;
};

function decodeKey(encoded: string, source: string): Buffer {
  const trimmed = encoded.trim();
  const key = Buffer.from(trimmed, "base64");
  // The round trip rejects stray characters that base64 decoding drops.
  if (key.length !== KEY_BYTES || key.toString("base64") !== trimmed) {
    throw new Error(`${source} must be base64 for exactly ${KEY_BYTES} bytes.`);
  }
  return key;
}

function readKeyFile(path: string): Buffer {
  if ((statSync(path).mode & 0o077) !== 0) chmodSync(path, PRIVATE_FILE_MODE);
  return decodeKey(readFileSync(path, "utf8"), KEY_FILE);
}

// Writes a private temp file ("wx"), then links it into place. The link fails
// when another process won the race, so nobody reads a half-written key.
function createKeyFile(path: string): Buffer {
  const key = randomBytes(KEY_BYTES);
  const temp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(temp, key.toString("base64"), {
    flag: "wx",
    mode: PRIVATE_FILE_MODE,
  });
  try {
    linkSync(temp, path);
    return key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return readKeyFile(path);
    }
    throw error;
  } finally {
    unlinkSync(temp);
  }
}

// OPENBOT_VAULT_KEY wins; otherwise <dataDir>/vault.key is created on first use.
export function resolveMasterKey(options: MasterKeyOptions = {}): Buffer {
  const env = options.env ?? process.env;
  const fromEnv = env.OPENBOT_VAULT_KEY?.trim();
  if (fromEnv) return decodeKey(fromEnv, "OPENBOT_VAULT_KEY");
  const dir = ensureDataDir(options.dir ?? resolveDataDir({ env }));
  const path = join(dir, KEY_FILE);
  try {
    return readKeyFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return createKeyFile(path);
  }
}
