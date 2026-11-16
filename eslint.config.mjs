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
    // The thin routes in src/app/api/connections/ are the HTTP boundary and
    // import server/index.ts directly.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/connections/**", "src/app/api/connections/**"],
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
  {
    // The OAuth flow knows core and its own files; network and storage come
    // in through ports (HttpClient, PendingAuthStore, CredentialStore).
    files: ["src/features/connections/oauth/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../**",
                "!../core",
                "!../core/**",
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
                "connections/oauth imports only connections/core and its own files; reach the outside through ports.",
            },
          ],
        },
      ],
    },
  },
  {
    // The only bridge from connections to the key vault.
    files: ["src/features/connections/credentials/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../**",
                "!../core",
                "!../core/**",
                "!../..",
                "!../../key-vault",
                "!../../key-vault/**",
                "@/**",
                "react",
                "react-dom",
                "react/**",
                "next",
                "next/**",
                "@heroui/**",
              ],
              message:
                "connections/credentials imports only connections/core and the key-vault public modules.",
            },
          ],
        },
      ],
    },
  },
  {
    // Server handlers and composition: no UI.
    files: ["src/features/connections/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/**", "@heroui/**"],
              message: "connections/server is server-only: no UI imports.",
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
