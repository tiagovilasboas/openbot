import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3800;
const isCI = Boolean(process.env.CI);
// The server keeps bots in a data dir: every run gets a fresh one, so the
// specs never touch ~/.openbot. A reused server keeps the dir it started with.
const DATA_DIR = mkdtempSync(join(tmpdir(), "openbot-e2e-"));

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // The service worker would answer before page.route can stub /api calls.
    serviceWorkers: "block",
    acceptDownloads: true,
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 240_000,
    env: {
      OPENBOT_DATA_DIR: DATA_DIR,
      // No provider on the server: the model is always the stub.
      ROUTER_URL: "",
      ROUTER_MODEL: "",
      ROUTER_API_KEY: "",
      LOCAL_MODEL_URL: "",
      LOCAL_MODEL_NAME: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
    },
  },
});
