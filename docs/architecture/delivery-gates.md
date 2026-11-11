# Delivery gates

Status: implemented for repository foundation and prototype. Node.js >= 24.15.0 is required (LTS, with the built-in `node:sqlite` module; native test running uses `--experimental-strip-types`). Husky, lint-staged, ESLint, formatting checks, type checking (`tsc --noEmit`), and the Next.js production build (`next build`) run actively in local checks and pull request CI because application source code exists in `src/`. Automated tests cover the document checker and initial chat/simulated tool response logic. Real model providers, external integrations, and server security controls will require dedicated tests when implemented.

## Local and CI contract

The application starts with versioned Husky hooks and pinned compatible tooling, installed by one documented command. Contributors and coding agents follow the same gates.

| Gate            | Responsibility                                                                                                              | Evidence                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Pre-commit      | Use lint-staged to format and lint supported staged files. Run meaningful checks relevant to those changes where practical. | Nonzero exit blocks the commit; the index must contain the reviewed changes. |
| Pre-push        | Run one shared complete check command: document checks, formatting, lint, project typecheck, tests, and production build.   | Any failing component blocks the push.                                       |
| Pull request CI | Run the same complete command from a clean dependency install.                                                              | Actual successful execution for the PR head; no checks is not green.         |

Type checking uses project configuration (`tsc --noEmit`), not a staged-file list that ignores it. If types or tests run in pre-commit, use a coherent project snapshot and describe that scope accurately. Keep pre-commit fast; pre-push and CI run the complete shared gate.

## Implementation boundary

Package scripts, lockfile, formatter/linter configuration, type configuration, and build/typecheck runners are versioned. Husky and lint-staged manage local hooks. The toolchain requires Node.js >= 24.15.0. Installation and current test scope are documented in CONTRIBUTING. The document checker and prototype chat response tests are part of the shared gate.

Tests verify domain behavior and relevant failure paths: authorization, tool arguments, model boundaries, cancellation and persistence as implemented. Empty suites and placeholder assertions do not count as application coverage. Extend the gate with dedicated tests as real model providers and external integrations are introduced.

## Guide and sensor

This contract and contributor instructions are **guia inferencial** for maintainability, architecture fitness and behaviour. Installed hooks and CI are **sensor computacional** for the checks actually executed. Evidence-based review is **sensor inferencial** for responsibilities and coverage gaps. Correct hook failures; bypass requires explicit maintainer approval.
