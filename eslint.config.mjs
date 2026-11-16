import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // The connections core is pure domain: no framework, runtime, storage or
    // other feature. Flows reach the outside only through its ports.
    files: ["src/features/connections/core/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../**",
                "@/**",
                "react",
                "react-dom",
                "react/**",
                "next",
                "next/**",
                "node:*",
                "@heroui/**",
              ],
              message:
                "connections/core is pure: import only sibling core files and reach the outside through connection-ports.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    // Everything outside the connections feature reaches it through its
    // public contract (index.ts) only, never through its internal folders.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/connections/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/connections/**",
                "!@/features/connections/index.ts",
                "!@/features/connections/copy.ts",
                "**/connections/**",
                "!**/connections/index.ts",
                "!**/connections/copy.ts",
              ],
              message:
                "Import connections only through its public entries: index.ts, or copy.ts for the React-free copy.",
            },
          ],
        },
      ],
    },
  },
  {
    // The key flow is a use case: no UI, no server wiring, no other flow.
    files: ["src/features/connections/api-key/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-dom",
                "react/**",
                "next",
                "next/**",
                "@heroui/**",
                "../panel/**",
                "../server/**",
                "../oauth/**",
                "../cli-login/**",
              ],
              message:
                "connections/api-key is a use case: depend on core/, never on UI, server wiring or another flow.",
            },
          ],
        },
      ],
    },
  },
  {
    // The panel renders states and calls the key flow's public functions. It
    // never reaches the server wiring, other flows or the credential adapter.
    // (It still reads the model, github and key-vault hooks it used before the
    // move; those go away as the panel moves to the feature's HTTP client.)
    files: ["src/features/connections/panel/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                "../server/**",
                "../oauth/**",
                "../cli-login/**",
                "../credentials/**",
                "../api-key/*",
                "!../api-key/manage-connection.ts",
              ],
              message:
                "connections/panel may import core/, its own files and the api-key public functions only.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees are full checkouts with their own builds.
    ".claude/**",
  ]),
]);
