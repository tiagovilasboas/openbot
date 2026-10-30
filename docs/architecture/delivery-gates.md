# Delivery gates

Status: implemented for the repository foundation. Husky, lint-staged, ESLint, formatting checks and document-checker tests run locally and in pull request CI. Type checking and the Next.js production build run automatically once application source exists; until then those scripts report a clear skip. The tests do not cover chat, tool use, model providers or security behavior; those checks must be added with those features.

## Local and CI contract

The application must start with versioned Husky hooks and pinned compatible tooling, installed by one documented command. Contributors and coding agents follow the same gates.

| Gate            | Responsibility                                                                                                              | Evidence                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Pre-commit      | Use lint-staged to format and lint supported staged files. Run meaningful checks relevant to those changes where practical. | Nonzero exit blocks the commit; the index must contain the reviewed changes. |
| Pre-push        | Run one shared complete check command: lint, project typecheck, meaningful tests and build when application code exists.    | Any failing component blocks the push.                                       |
| Pull request CI | Run the same complete command from a clean dependency install.                                                              | Actual successful execution for the PR head; no checks is not green.         |

Type checking uses project configuration, not a staged-file list that ignores it. If types or tests run in pre-commit, use a coherent project snapshot and describe that scope accurately. Keep pre-commit fast; pre-push and CI run the complete shared gate.

## Implementation boundary

Package scripts, lockfile, formatter/linter configuration, type configuration and the conditional build/typecheck runners are versioned. Lefthook has been replaced by Husky so the repository has one hook manager. Installation and current test limitations are documented in CONTRIBUTING. The document checker remains part of the shared gate.

Tests verify domain behavior and relevant failure paths: authorization, tool arguments, model boundaries, cancellation and persistence as implemented. Empty suites and placeholder assertions do not count as application coverage. Extend the gate as real boundaries appear.

## Guide and sensor

This contract and contributor instructions are **guia inferencial** for maintainability, architecture fitness and behaviour. Installed hooks and CI are **sensor computacional** for the checks actually executed. Evidence-based review is **sensor inferencial** for responsibilities and coverage gaps. Correct hook failures; bypass requires explicit maintainer approval.
