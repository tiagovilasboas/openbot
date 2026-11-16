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
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees are full checkouts with their own builds.
    ".claude/**",
  ]),
]);
