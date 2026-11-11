import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Test-only: points the local store and key vault at a throwaway folder, so
 * a test that reaches the real store never writes to the user's home folder.
 */
process.env.OPENBOT_DATA_DIR = mkdtempSync(join(tmpdir(), "openbot-test-"));
