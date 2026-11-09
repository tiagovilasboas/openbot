# Spike: functional audit of the 0.1 crew

Date: 2026-11-09. Code: `main` at 4b4cd12. Status: **done; findings feed roadmap stage 4**.

This spike answers one question: what works today, what breaks, and what stands between this build and a crew you can trust on your own phone. Three reviews ran in parallel: a functional QA pass in headless Chrome, a read-only security review and a read-only inventory of the code against the roadmap and specs.

## Method and limits

- QA drove a real `next dev` server with headless Chrome over the DevTools Protocol, on a 1280x800 desktop and a 390x844 phone, with fresh `localStorage`.
- The server's model (`router`, `o3-mini`) answered with `provider_unreachable` on almost every call during the pass. Replies, queueing and delegation were tested with a fetch override that returns canned replies. **No real model reply, streaming or failover text was verified in this pass.**
- Security and inventory read the code. Nothing was exploited and the inventory ran no tests. Where a finding comes from reading only, it says so.
- Not covered: PWA install and the service worker offline shell on a device, the Model tab save paths, and Enter-to-submit on the lock screen.

## What works

`npm test` passes (177 tests, 0 failures). In the browser, on desktop and phone:

- First load: nine bots, the Chief of Staff on top, no horizontal scroll.
- Create (blank and from a template), edit and delete bots. The main bot offers no Delete; making another bot main moves it to the top.
- `@` hand-off and the `/` skills palette, including a skill's instructions reaching the system prompt.
- Delegation with canned replies: kickoff, one message per specialist under its own avatar, one summary. The cap of three held (five asked, five calls in all). A failing specialist and an all-failing turn both ended with a readable message.
- GitHub issues for a public repository, including the empty state.
- Local lock: short or mismatched password, wrong password, unlock, removal. No plaintext in storage.
- Settings: provider switch, the free model list with "Ver todos", and invalid keys rejected without saving.
- A 5000-character message, an empty message, going offline and back online, and a basic accessibility pass (names on controls, focus kept inside dialogs, Esc closes sheets).

## Functional bugs

| #   | Severity | Bug                                                                                                                                     | Evidence                                                                                                                                                                                                                                                                                                                                       |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | High     | A message sent while another is being answered is lost, and the second request is invalid.                                              | QA: the second request body ended with an assistant message, and the real route answers 400 `invalid_request` when the last message is not from the user. The stored thread kept two assistant messages and dropped the queued user bubble. Likely cause: `processTurn` recurses with a history built from stale state (`ChatExperience.tsx`). |
| F2  | High     | Long threads stop working. The client sends the whole history, and the route rejects more than 50 messages.                             | Read in `ChatExperience.tsx` and `parse-chat-request.ts`. Not reproduced.                                                                                                                                                                                                                                                                      |
| F3  | Medium   | The PT/EN choice is not saved; every reload goes back to Portuguese.                                                                    | `useState("pt")`, no storage key.                                                                                                                                                                                                                                                                                                              |
| F4  | Medium   | Every chat failure, offline included, shows the same message. A hung provider keeps the chat busy: there are no timeouts and no cancel. | QA and a grep for `AbortController`.                                                                                                                                                                                                                                                                                                           |
| F5  | Low      | An unknown delegation target leaks the raw `@delegate` line as the Chief's reply.                                                       | QA.                                                                                                                                                                                                                                                                                                                                            |
| F6  | Low      | A very long bot name overflows the empty-state title; the name input has no length limit.                                               | QA screenshots.                                                                                                                                                                                                                                                                                                                                |
| F7  | Low      | Error texts show internal codes (`provider_rejected`, `provider_unreachable`).                                                          | QA.                                                                                                                                                                                                                                                                                                                                            |
| F8  | Low      | "Make main" applies at once and Cancel does not undo it; the new main keeps no Chief description, and the old one keeps it.             | QA.                                                                                                                                                                                                                                                                                                                                            |
| F9  | Low      | Reloading mid-reply drops the reply with no retry hint. On mobile, focus is not returned to a meaningful control after a sheet closes.  | QA.                                                                                                                                                                                                                                                                                                                                            |
| F10 | Low      | Bot subtitles stay in Portuguese in the English interface (known limit).                                                                | QA, README.                                                                                                                                                                                                                                                                                                                                    |

## Security findings

The server was built for one person on localhost. It is not safe to expose as it is. Details and line references are in the review; the order to ship them is below.

| #   | Severity               | Finding                                                                                                                                                                                                              |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Critical off localhost | SSRF and open relay: a client-supplied `baseUrl` is only checked for the `http` or `https` scheme, so any caller can make the server reach private addresses and cloud metadata. Upstream error text is echoed back. |
| S2  | High off localhost     | No server authentication: every `/api/*` route is open, and the server's own keys are used when the client sends none.                                                                                               |
| S3  | High off localhost     | No Origin check, rate limit, body size cap or spend cap. Upstream calls have no timeout.                                                                                                                             |
| S4  | Medium                 | Keys live in plaintext in `localStorage` and travel in request bodies. There is no Content-Security-Policy.                                                                                                          |
| S5  | Medium                 | Prompt injection: a model reply can write `@delegate` lines, and imported skills are full prompt text. Impact is bounded (three delegations, one hop, no tools) but external text is not marked as data.             |
| S6  | Low                    | The local lock is a screen lock, not authentication: it is client-side, uses 100k PBKDF2 iterations and does not encrypt storage.                                                                                    |

What holds: `npm audit --omit=dev` reports 0 vulnerabilities, there is no `dangerouslySetInnerHTML`, the service worker never caches `/api`, and the GitHub client targets a fixed host with validated owner and repository names.

## Where the product stands

Verified by reading the code, against `docs/roadmap/` and `docs/specs/`:

- **Done and real:** the PWA shell, the three model paths, free model discovery per account, per-provider keys, failover, GitHub read, the daily briefing from GitHub data, skills per bot, the crew with templates, the main bot, delegation, the local lock, two languages.
- **Partial:** installable PWA (no device evidence), conversation (no streaming), pairing (local lock only), onboarding.
- **Not started:** server-side persistence, backup, device pairing and revocation, HTTPS recipe, tool execution by an executor, MCP, calendar, shared channels (UC-05), compaction (UC-09), the evaluation baseline.
- **Stale in the docs:** the simulated agenda tool (row 1.3) no longer exists, the daily summary (3.6) is marked done while the calendar it depends on is open, the PWA item in the product roadmap is marked planned though the manifest and service worker exist, and multiple bots are still listed as "after the MVP".
- **Tests:** 36 unit test files. There are no end-to-end, component or route-integration tests, and only one of five API routes has a test. `execute-chat-message.ts`, `use-bots.ts` and `use-bot-messages.ts` carry risky logic without tests.
- **Rules from AGENTS.md:** three files are a few lines over 300 (`ChatExperience.tsx`, `blob-art.ts`, `BotEditModal.tsx`), none over 500, and there are no catch-all folders. Several features import from `chat` (the `ChatLanguage` type, `LanguageToggle`), which makes cycles between features.

## Decisions

1. **Fix what breaks a normal session first** (F1, F2, F3, F5, F6): small, independent, test-backed. They go ahead of every new feature.
2. **Close the server before opening it** (S1 to S3). Until they ship, the README keeps saying: run it on localhost.
3. **A real model run is the next piece of evidence.** Nothing in this audit proves a live reply. Roadmap 1.2 stays open until a run with a configured provider is recorded.
4. **Data safety before sync.** Export and import first; server-side persistence only after device pairing exists.
5. **No new integrations** (calendar, MCP, writes) until stage 4 closes.

The plan, sizes and order are in stage 4 of the [roadmap](../roadmap/roadmap.pt-BR.md).
