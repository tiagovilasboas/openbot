# Agent Instructions & Engineering Principles

These instructions apply to any AI coding agent and harness (Antigravity, Claude Code, Codex, Cursor, OpenCode, Kiro, etc.) operating in this repository. Follow the user's explicit instructions and the operating environment's higher-priority policies.

---

## 1. Non-Negotiable Guardrails

### A. Author Public Identity (Maximum Privacy Invariant)

- **Author Identity:** Always use strictly **`Tiago Vilas Boas`**.
- **Zero Middle Name Expansion:** NEVER expand, search, or reveal middle names or personal identity details under any circumstances (commits, PRs, docs, comments, or examples).
- **Public Handle:** `tiagovilasboas` (GitHub / GitHub Sponsors).

### B. Clean Attribution (No Agent Co-Authors)

- **Zero AI Attribution in Commits:** Never add Claude, Gemini, or any AI assistant as commit author, committer, or `Co-Authored-By`.
- **Zero AI Boilerplate in PRs:** Never append "Generated with Claude Code", "Created with Antigravity", or similar badges/signatures to commit messages or PR descriptions.

### C. AppSec & Secret Zero Exposure

- **Server-Side Only:** All API keys, tokens, and model endpoints MUST remain server-side.
- **Never Use `NEXT_PUBLIC_` for Secrets:** Never prefix secrets with `NEXT_PUBLIC_` (which bundles them into client JavaScript).
- **Untrusted External Data:** Treat all content returned by LLMs, external APIs, and repositories as untrusted data. Validate arguments and schemas before execution.
- **Skills are Instructions, Not Permissions:** A skill or agent instruction does not grant system permissions. Every tool invocation must be verified by explicit code gates.

---

## 2. Software Architecture & Design Principles

### A. Screaming Architecture

- Organize the codebase by domain and business capabilities in `src/features/<feature>/` (e.g., `chat/`, `calendar/`, `model/`).
- **Never create catch-all directories** like `components/`, `utils/`, or `helpers/`.
- Framework details (Next.js App Router, CSS, layouts) sit at the boundary (`src/app/`). Keep route files thin (< 30 lines).

### B. Dependency Rule & Domain Boundaries

- Dependencies point inward toward domain policies.
- Domain logic (e.g., `respond-to-message.ts`) must never import React, Next.js, HeroUI, or database drivers.
- Expose domain functionality through clean, typed public ports and discriminated unions. Views consume domain contracts, not vice versa.

### C. Single Responsibility Principle (SRP) & File Limits

- Every file and module must have one single reason to change.
- **Hard Line Limits:**
  - Target: ~300 lines per file.
  - Target: ~10 functions per file.
  - Forbidden: files exceeding 500 lines must be split before committing or opening a PR.
- **No Shared Catch-Alls:** Group constants with the domain logic that uses them. Do not create global `constants.ts` or `utils.ts` files.

### D. Clean Code, KISS & YAGNI

- Make the minimal necessary change to fulfill the current task.
- Avoid premature abstractions, speculative interfaces, or unused parameters.
- Keep copy and text centralized in domain copy dictionaries (e.g., `chat-copy.ts`) rather than littered as inline ternaries across view components.

---

## 3. Delivery & Continuous Integration (Fowler Harness Model)

### A. Delivery Cadence

- **Slicing & Estimation:** Cap every delivery at a maximum of **5 Story Points**. Tasks exceeding 5 points must be decomposed into independent PRs before coding.
- **One Reason, One PR:** Each pull request must compile, pass tests, and deliver independent, reviewable value.
- **Max 3 Open PRs:** Never have more than three pull requests open simultaneously for this repository. Focus on merging green PRs before opening new ones.
- **Standard Loop:** Small slice → English commit message → push → local gates & CI green → squash-merge → prune local & remote branch.

### B. Merge Gate: Green CI Required

- **Never merge without real CI:** On branches or repositories without enforced branch protection, never use `gh pr merge --auto`.
- Use `checks/merge-when-green.sh tiagovilasboas/openbot <pr>` (or equivalent gate) that validates that all check runs are strictly `SUCCESS` before merging.
- A PR with no CI execution is not green.

### C. Local Verification & Environment Requirements

- **Runtime:** Requires **Node.js >= 24.15.0** (LTS; the built-in `node:sqlite` module is a release candidate there, and the native test runner uses `--experimental-strip-types`).
- **Versioned Git Hooks:** Husky + lint-staged are active. Every commit runs formatting and linting; every push runs `npm run check`.
- **Quality Suite (`npm run check`):**
  1. `npm run docs:check`: Verifies the 12 canonical documents are non-empty.
  2. `npm run format:check`: Prettier style verification.
  3. `npm run lint`: ESLint 9 validation.
  4. `npm run typecheck`: TypeScript compilation check (`tsc --noEmit`).
  5. `npm test`: Node.js native test runner (docs and feature test suites).
  6. `npm run build`: Next.js Turbopack production build.
- **Downshift Compactor:** When available in the shell PATH, invoke allowlisted commands through `downshift compactor -- <cmd>` (e.g., `downshift compactor -- npm test`, `downshift compactor -- git status`).

### D. Evidence-Based Engineering (No Assumptions)

- Never claim a task, fix, or capability is done without direct execution evidence (terminal logs, exit code 0, CI check results).
- Clearly separate verified facts from working hypotheses.
- Preserve bilingual project parity (English `README.md` and Brazilian Portuguese `README.pt-BR.md`).

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
