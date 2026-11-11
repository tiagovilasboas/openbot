import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3800;
const isCI = Boolean(process.env.CI);

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
      // No provider on the server: the model is always the stub.
      ROUTER_URL: "",
      ROUTER_MODEL: "",
      ROUTER_API_KEY: "",
      LOCAL_MODEL_URL: "",
      LOCAL_MODEL_NAME: "",
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: "",
      // The key vault and database live in a throwaway folder, never in ~/.openbot.
      OPENBOT_DATA_DIR: join(
        tmpdir(),
        `openbot-e2e-${Date.now()}-${process.pid}`,
      ),
    },
  },
});
