# Delivery gates

Status: architecture decision for the future JavaScript/TypeScript application. Husky, lint-staged, application lint, type checking and tests are **not implemented yet**. The current repository uses Lefthook with a document-presence check.

## Local and CI contract

The application must start with versioned Husky hooks and pinned compatible tooling, installed by one documented command. Contributors and coding agents follow the same gates.

| Gate | Responsibility | Evidence |
| --- | --- | --- |
| Pre-commit | Use lint-staged to format and lint supported staged files. Run meaningful checks relevant to those changes where practical. | Nonzero exit blocks the commit; the index must contain the reviewed changes. |
| Pre-push | Run one shared complete check command: lint, project typecheck, meaningful tests and build when application code exists. | Any failing component blocks the push. |
| Pull request CI | Run the same complete command from a clean dependency install. | Actual successful execution for the PR head; no checks is not green. |

Type checking uses project configuration, not a staged-file list that ignores it. If types or tests run in pre-commit, use a coherent project snapshot and describe that scope accurately. Keep pre-commit fast; pre-push and CI run the complete shared gate.

## Implementation boundary

Introduce package scripts, lockfile, formatter/linter configuration, type configuration and test runner with the first application increment. Choose compatible versions then. Replace Lefthook atomically so both hook managers do not compete. Document installation and limitations in CONTRIBUTING. Keep the current document check as a component where useful.

Tests verify domain behavior and relevant failure paths: authorization, tool arguments, model boundaries, cancellation and persistence as implemented. Empty suites and placeholder assertions do not count as application coverage. Extend the gate as real boundaries appear.

## Guide and sensor

This contract and contributor instructions are **guia inferencial** for maintainability, architecture fitness and behaviour. Installed hooks and CI are **sensor computacional** for the checks actually executed. Evidence-based review is **sensor inferencial** for responsibilities and coverage gaps. This document alone proves no runtime enforcement. Correct hook failures; bypass requires explicit maintainer approval.
