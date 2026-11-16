# Spec: UX parity with openbot.run

Status: draft for the UX track in [openbot-run-parity.md](../roadmap/openbot-run-parity.md), section 9. Docs only; no code changes in this document.

## 1. Purpose and rules

The product owner finds that Open Bot still feels "the old way". This spec sets the target: the flows and patterns of openbot.run, screen by screen, adapted to a single-user PWA.

Rules:

- Patterns and flows only. Nothing here copies text, labels, icons, artwork or colors from openbot.run. Our copy stays in our i18n dictionaries (pt-BR, en, es).
- Every acceptance criterion (AC) must be checkable by a unit test, an e2e test (Playwright) or a manual check at 375 px width.
- Out of scope, as in the parity roadmap: dock, native computer use, remote desktop, hosted servers, member roles, ACP agents, several accounts, CLI updates, analytics and password-manager integrations.

Sources:

- openbot.run: our notes in `docs/spikes/openbot-run/` (68 use cases, IDs AG, PR, AU, TL) and `docs/spikes/openbot-run-rea.md`. The notes come from read-only work on the open-source desktop app at commit `a9b40aa`. The app was not run and the notes were not re-read in this pass. Section 6 lists where they are thin.
- Our screens: read on `main` at `621a2e7`. Each area names the files it reads from.

## 2. Parity matrix

Legend follows the REA: **Tem** (we have it), **Parcial** (base exists, a part of the flow is missing), **Falta** (not started).

| Area                          | Parity now | Main gap                                                            | Slices                |
| ----------------------------- | ---------- | ------------------------------------------------------------------- | --------------------- |
| 3.1 Shell and sidebar         | Parcial    | Attention is a count badge, not a section; no keyboard agent switch | UX-7, UX-8            |
| 3.2 Agent list and creation   | Parcial    | Model per agent is a free-text id in a long form                    | UX-1                  |
| 3.3 First-run onboarding      | Falta      | No first-run path; a new user lands in an empty chat with a notice  | UX-2, UX-3, UX-4      |
| 3.4.1 Header, model per agent | Parcial    | Badge shows and changes the global model; hidden on phones          | UX-1, UX-6            |
| 3.4.2 Pending runtime         | Falta      | A model change has no "applies next turn" state                     | UX-5                  |
| 3.4.3 Composer and send       | Parcial    | No client message id, so a retry can duplicate                      | UX-9                  |
| 3.4.4 Busy agent              | Parcial    | FIFO queue only; no steer mode                                      | UX-10 (CHT-2)         |
| 3.4.5 Tool activity           | Tem        | Step detail and persistence after the turn not verified             | (verify only)         |
| 3.4.6 Approvals               | Parcial    | Always-allow grants cannot be listed or revoked in the UI           | UX-11                 |
| 3.5 Settings structure        | Parcial    | Flat selector instead of a list of providers; no enable/disable     | UX-12, UX-2           |
| 3.6 Team and automation       | Falta      | Crew exists; routines, channels and automation do not               | ROT-_, CRW-_ (not UX) |
| 3.7 Workspace and tools       | Parcial    | No per-agent folder, no per-tool level, no voice                    | TOL-1, TOL-4, APP-4   |

Current work in progress, not re-planned here:

- **UX-1**: per-bot model picker opened from the chat header badge (another agent).
- **UX-2**: Connect button in the Modelo tab's OpenRouter preset (another agent).

---

## 3. Screen specs

### 3.1 App shell and sidebar navigation

**Pattern.** The sidebar is where the product starts. Agents come first, each with a visible state (working, waiting, hidden). Anything that waits on the user (an approval, a question, an unread reply) is collected in one section above the list, and each item links to the chat that needs the answer. Hidden agents sit in a collapsed group and keep working. Keyboard users switch between the first agents with a shortcut. On desktop the sidebar collapses to a rail; on phones it is a drawer.

**Our screen.** `src/app/page.tsx` is a thin route that renders `ChatExperience.tsx`, which composes:

- `ChatSidebar.tsx`: desktop column and mobile drawer;
- `SidebarRail.tsx` (`RailButton`): collapsed rail, including the lock button when a local password exists;
- `SidebarPanel.tsx` and `SidebarBotList.tsx` / `SidebarBotRow.tsx`: the agent list, with `AttentionBadge` counts from `src/features/attention/`;
- `SidebarHiddenBots.tsx`: collapsed hidden group (delivered in #142, #146);
- `SidebarActionRow.tsx`, `CommandPalette.tsx`.

The Chief of Staff is pinned through `mainBotId`.

**Gap.**

- Attention shows as a badge per agent. Nothing gathers the items that wait on the user.
- Agents cannot be switched by a numeric shortcut. The command palette is the only keyboard route found.
- Routines, tasks and schedule have no pages (depends on the routines domain, not this track).

**Acceptance criteria.**

- AC-SH-1: A section above the agent list lists every agent with a pending approval, tool confirmation or unread reply. Each row opens that agent's chat at the item.
- AC-SH-2: The section is hidden when empty. Counts come from `attention-counts.ts` and have a unit test.
- AC-SH-3: A shortcut switches to agents 1 to 9 in list order, and focus moves to the composer (e2e).
- AC-SH-4: The rail and the drawer keep the same order and show the same attention markers.
- AC-SH-5: At 375 px the drawer opens and closes with focus trapped while open, and focus returns to the header toggle on close.

### 3.2 Agent list and creation

**Pattern.** Creating an agent is quick: a name, a purpose and optionally a template. The new agent's first screen offers three concrete starter tasks drawn from its profile, and the user can still type freely. Editing uses the same fields. Deleting leaves an undo window before anything is removed. Hiding an agent keeps it working.

**Our screen.**

- `BotEditModal.tsx`: name, role, instructions, workspace, and memory (`MemorySection`).
- `BotModelField.tsx`: the model is a free-text id, validated by `isBotModelIdValid`.
- `BotBackupModelsField.tsx`: up to three backup models (#143).
- `BotTemplatePicker.tsx` with `bot-templates.ts`: local templates, select only.
- `BotDeleteControl.tsx` with undo (#142); `BotHideControl.tsx`; `BotAvatarPickers.tsx`.
- `WelcomeStarters.tsx` with `bot-starters.ts`: three tasks from the profile (#142), rendered in the empty chat.

**Gap.**

- The model is a free-text id inside a long form, so the user must know model ids. UX-1 replaces this with the picker.
- Template preview and an install step with confirmation do not exist (BOT-4 in the parity roadmap).

**Acceptance criteria.**

- AC-AG-1: From the template picker to a usable chat takes at most two actions. The name is prefilled from the template and can be edited.
- AC-AG-2: After creation the empty chat shows the three starter tasks and focuses the composer. Choosing one only fills the composer; the user sends.
- AC-AG-3: The model field in the editor opens the same picker as the chat header (UX-1). Free text remains only as a fallback for ids the picker does not list.
- AC-AG-4: Delete keeps the existing undo window and removes nothing until it closes.

### 3.3 First-run onboarding

**Pattern.** On first open the app asks one question: start free with a provider that needs no account, or connect an account or key. The path ends in a chat that is ready to answer. The next button is never disabled silently. While something is still running (download, connection, error) one line says why, and an error offers a retry. Steps that only apply to one operating system are skipped elsewhere. The provider list puts the popular options first and folds the rest.

**Our screen.** No first-run flow exists. A search for onboarding or first-run code finds nothing.

- `ChatEmptyState.tsx`: when `isConfigured` is false it shows a notice with a button that opens Settings (lines ~96-110). The starter tasks and the composer render either way; the composer receives `isConfigured`.
- `ChatHeader.tsx`: the model badge opens `SettingsModal.tsx`.
- `src/features/model/FreeModelList.tsx` and `use-free-models.ts`: the free route exists, reached only from Settings.
- `src/features/auth/LockScreen.tsx`: appears only when a local password is set in Security.

**Gap.**

- A new user with no model sees an empty chat and a notice, and must find Settings.
- "Start free" is not an explicit choice.
- The connect path depends on UX-2.
- Setting the local password is not part of the first run.

**Acceptance criteria.**

- AC-ON-1: On a profile with no model configured, the first screen offers two choices, "start free" and "connect", each with its own copy in pt-BR, en and es.
- AC-ON-2: "Start free" selects a validated free model and ends in the chat with that model active. A starter task is in the composer, and the user sends it.
- AC-ON-3: "Connect" opens the connection dialog from UX-2 and returns to the chat on success. Cancel returns to the choice.
- AC-ON-4: No action is disabled without a reason line. Waiting shows what it waits for, and a failure shows a retry.
- AC-ON-5: The flow does not appear when a model is already configured. It can be reopened from Settings.
- AC-ON-6: Nothing is sent to a provider before the user picks one. No default key or request runs at first open.
- AC-ON-7: The flow works at 375 px with no horizontal scroll, and every step is keyboard reachable.

### 3.4 Agent chat

#### 3.4.1 Header and model per agent

**Pattern.** The chat header names the agent and shows the model that agent will use, with its status. Tapping the model opens a picker for this agent (provider and model) and its backup order. Other agents are not affected. Global settings are a fallback when an agent has no model of its own.

**Our screen.** `ChatHeader.tsx` shows the identity (tapping it opens the bot editor), the `ModelStatusBadge.tsx` with context usage (#128), a language toggle and a new-chat button. The model badge sits in `hidden md:flex`, so it is not shown on phones. The badge opens global Settings. `use-active-model.ts` resolves the active model from the global config or the server. Per-agent model and backups are in the bot editor (#143).

**In progress (UX-1).** The picker from the badge. This spec only sets the acceptance criteria below.

**Gap.**

- The badge reads and writes the global model.
- On phones no model appears in the header, and no other entry point was found.
- The backup chain is edited only in the bot editor.

**Acceptance criteria.**

- AC-CH-1: The header shows the current agent's model and status at every width, not the global one.
- AC-CH-2: Changing the model in the picker changes only that agent. Covered by a test with two agents.
- AC-CH-3: An agent with no model of its own follows the global default, and the picker says so.
- AC-CH-4: On phones the header shows a short model label and status. Tapping it opens the same picker.
- AC-CH-5: The picker shows the backup order and links to edit it.

#### 3.4.2 Model change while the agent is working (pending runtime)

**Pattern.** A model change made during a running turn does not alter that turn. It is stored as pending and applied to the next turn. The header and the picker say that the next message will use the new model, and that state clears when the next message is sent. When a provider limit or error forces a switch, the switch is reported once per turn, with the reason and the reset time when known.

**Our screen.** No pending state. The model is read when a message is sent (`use-chat-turns.ts` takes `modelConfig` from `ChatExperience.tsx`). `FailoverNotice.tsx` with `reset-wait.ts` reports a failover, and backup failover is delivered (#143, #147).

**Gap.** No "applies next turn" state. The effect of a change on messages already queued was not verified.

**Acceptance criteria.**

- AC-PR-1: A change during a running turn does not change the running turn's model. Covered by a test that checks the model id used by the stream.
- AC-PR-2: The header and picker show a "next message" state until the next send, and then clear it.
- AC-PR-3: A queued message uses the model that is current when its turn starts. The UI says so once, when the queue is not empty.
- AC-PR-4: A failover notice appears once per turn with the source model, target model and reason (keep `FailoverNotice`).

#### 3.4.3 Composer and sending

**Pattern.** A send is idempotent. The message appears at once as pending. A failed send offers retry or edit on that message, and retry never creates a second user message. Mentions and attachments are tokens that survive a retry. Long pastes become an attached text file above a size limit.

**Our screen.** `ChatComposer.tsx` with `ComposerToolbar.tsx` (skill and mention buttons), `ComposerPalette.tsx`, `BotMentionPalette.tsx`, `AttachButton.tsx`, `AttachmentChips.tsx`, `use-composer-attachments.ts`, `use-file-drop.ts`. `use-chat-turns.ts` sends. `RollbackControl.tsx` allows editing a message by rolling the thread back. A search of `src` finds no client message id, so a retry may duplicate a message.

**Gap.** No idempotency key. No retry on a failed user message. The keyboard send and newline behavior was not verified in this pass.

**Acceptance criteria.**

- AC-CO-1: Each send carries a client message id. A second write with the same id creates no second message (unit test on the store and the send path).
- AC-CO-2: A failed send shows retry and edit on that message. Retry reuses the message.
- AC-CO-3: Mentions and attachments survive retry.
- AC-CO-4: On touch devices Enter inserts a newline and the send button sends. On desktop the shortcut is documented in the UI and tested.

#### 3.4.4 Busy agent: queue and steer

**Pattern.** A message sent while the agent works either joins the running turn at its next step (steer) or waits in a visible queue. The user sets the mode per agent. Queued items show their state and can be cancelled. A steer that the model cannot take falls back to the queue and says so.

**Our screen.** `use-message-queue.ts` gives a FIFO queue, with `queueCount` passed to `ConversationView.tsx`. There is no steer mode and no per-item control in the notes. Parity slice CHT-2 covers the steer mode.

**Acceptance criteria.**

- AC-BZ-1: The per-agent mode is steer or queue. The default is queue, which keeps today's behavior.
- AC-BZ-2: The queue shows its items above the composer, each with a cancel action.
- AC-BZ-3: A steer that cannot be applied falls back to the queue, and the fallback is shown.

#### 3.4.5 Tool activity

**Pattern.** While a turn runs, one activity line says what the agent is doing (working, waiting for a tool, waiting for approval, failed). Each tool call appears as a step with its status. The steps stay in the answer after the turn ends.

**Our screen.** `ThinkingIndicator.tsx` with `activity-phase.ts` (live activity line, #127). Tool steps and the approval card are in `src/features/tools/client/` (`tool-turn-view.ts`, `tool-stream-events.ts`, `paused-turn.ts`; step chips in #135).

**Gap.** Whether steps stay in the answer after the turn was not verified. The step detail view was not checked.

**Acceptance criteria.**

- AC-TA-1: Each tool call shows its name, status (running, done, failed, waiting) and duration.
- AC-TA-2: Steps remain in the answer after the turn ends, collapsed by default.
- AC-TA-3: The activity line names the phase in the user's language.

#### 3.4.6 Approvals

**Pattern.** When a tool needs permission, a card appears in that agent's chat and the same item appears in the attention section (3.1). The card says what the tool will do in one line and offers allow once, always allow for that tool, or deny. Always allow is a per-tool grant the user can see and revoke. Some actions never get a blanket grant (for example, taking over a browser).

**Our screen.** `src/features/tools/client/ApprovalCard.tsx` with the copy "Permitir uma vez" and "Sempre permitir" (`tools-copy.ts`). `tool-policy.ts` defaults to asking and allows always-allow only when a tool opts in with `allowAlways`. Grants persist on the server in `src/features/tools/server/grants-repository.ts`. A search of the client, settings, auth and model code found no screen that lists or revokes grants. The deny option's copy was not confirmed in this pass.

**Gap.** No list or revoke screen for grants. The approval card is not in the attention section.

**Acceptance criteria.**

- AC-AP-1: The card names the tool and the agent, and states the effect in one line.
- AC-AP-2: Settings lists always-allow grants with per-tool revoke. A revoke applies to the next call (test).
- AC-AP-3: A pending approval appears in the attention section (3.1).
- AC-AP-4: A tool without `allowAlways` never shows the always-allow button (existing policy; keep the test).

### 3.5 Settings structure

**Pattern.** Settings is grouped by what the user changes: general (language, appearance, notifications), profile, providers, usage and limits, security, and app behavior. Providers are a list, and each provider has its own page with models, key status and actions (reset usage, disconnect, remove an account), reached from a menu. A provider can be turned off without deleting its key. Disconnect and disable are refused while a running turn uses that provider, and the reason is shown.

**Our screen.** `SettingsModal.tsx` has four tabs from `SettingsTabs.tsx`:

- **Modelo**: `SettingsForm.tsx`, `SettingsProviderSelector.tsx`, `SettingsProviderFields.tsx`, `SettingsModelPresets.tsx` and `PresetRow.tsx` (OpenRouter, Ollama and LM Studio presets; local detection from #143), `ConnectionTest.tsx`, `FreeModelList.tsx`, and the language toggle. UX-2 adds the Connect button in the OpenRouter preset.
- **Conexões**: `src/features/connections/panel/ConnectionsPanel.tsx`, with models and tools groups, `ConnectionRow.tsx`, `ConnectionDetail.tsx` and `ConnectNotice.tsx`. One-click OpenRouter connect is delivered (#144).
- **Segurança**: `SettingsSecuritySection.tsx` and `BackupSection.tsx`.
- **Uso**: `UsageSection.tsx`.

**Gap.**

- Providers are a selector with fields, not a list with per-provider pages and actions.
- No enable/disable per provider.
- No custom OpenAI-compatible endpoint with a name (parity PRV-2).
- Settings has no search.

**Acceptance criteria.**

- AC-ST-1: Each provider appears once in a list, with its state: not configured, connected, in use, or off.
- AC-ST-2: The provider page shows models and key status (never the key) and the actions. Disconnect and disable are refused, with the reason shown, while a running turn uses the provider.
- AC-ST-3: Turning a provider off keeps its key and removes it from the pickers. Agents that use it show a warning.
- AC-ST-4: Low priority: a search field matches row labels.

### 3.6 Team and automation

**Pattern.** Agents work without the user watching. Scheduled routines report into the same history and attention model as a normal turn. A "nothing new" run is quiet: it is recorded but does not notify or count as unread. Failures show a reason. Channels let several agents share a thread under a lead.

**Our screen.** The crew lives in `src/features/crew/` (`CrewRoomControl.tsx`, `CrewRoomStep.tsx`, `run-crew-turn.ts`, `parse-delegations.ts`, `crew-roster.ts`). Hidden agents are kept out of the crew roster, delegations and mentions (#146). There is no routines, schedule, channels, webhook or local automation route. Under `src/app/api/` there is no automation route.

**Gap.** The whole domain is missing. Parity slices ROT-1 to ROT-8 and CRW-1 and CRW-2 own the work. This spec sets only the UX expectations.

**Acceptance criteria (for when those slices land).**

- AC-TM-1: A routine run appears in the agent's chat like a normal turn. A quiet run does not count as unread (depends on ROT-3).
- AC-TM-2: The crew room shows which agent is working and who was delegated to, and the hop limit is visible (depends on CRW-1).
- AC-TM-3: Each automation shows its last run status, and a failed run shows the reason.

### 3.7 Workspace and tools

**Pattern.** Each agent has its own working folder and can read files there. Access is explicit (workspace only, ask first, full access). Each tool has a level: ask, allow or block. Attachments are visible before sending and can be removed. Voice dictation and read-aloud are optional, and the UI hides them where the browser does not support them.

**Our screen.** Attachments in `src/features/attachments/` (`AttachButton.tsx`, `AttachmentChips.tsx`, `add-attachments.ts`, `read-attachment.ts`, `attachment-limits.ts`). The GitHub read tool in `src/features/github/` and `src/features/tools/server/github-list-open-items.ts`. The memory note tool in `src/features/tools/server/memory-add-note.ts`. Tool gating in `tool-policy.ts`. No per-agent folder. No speech code (a search found no SpeechRecognition or speechSynthesis use). No MCP and no file library.

**Gap.** No per-agent folder (TOL-4). Only the always-allow flag, not a per-tool level (TOL-1). No voice (APP-4). No file library (TOL-6).

**Acceptance criteria.**

- AC-WT-1: A per-tool level control (ask, allow, block) lives in the bot editor. Delivered by TOL-1.
- AC-WT-2: Attachments show name, type and size, and can be removed before sending. Verify the current behavior against this.
- AC-WT-3: Low priority: dictation uses the Web Speech API when the browser supports it, and is hidden where it does not (APP-4).

### 3.8 Cross-cutting rules

- **Mobile.** Every AC above is checked at 375 x 812 with no horizontal scroll. Touch targets stay at least 44 px (existing `min-h-11`).
- **Copy.** Every new string is added to the pt-BR, en and es dictionaries. This document is in English; the UI is not.
- **Accessibility.** Keep the tablist arrow-key behavior in `SettingsTabs.tsx`. Drawers trap and return focus. Attention markers are not color only.
- **Privacy.** Nothing leaves the device before the user picks a provider (AC-ON-6). Keys stay server side in the vault.

---

## 4. Delivery order

The ordered UX slices, points and parallel groups are in [openbot-run-parity.md, section 9](../roadmap/openbot-run-parity.md). Priority follows the user-visible promise: onboarding that ends in a working chat first, then model per agent in chat, then agent-first navigation.

## 5. Mapping to existing roadmap IDs

| UX slice   | Overlaps with roadmap | Note                                                                    |
| ---------- | --------------------- | ----------------------------------------------------------------------- |
| UX-1       | AG-24, PR-08          | Per-bot picker; the editor already has per-bot model and backups (#143) |
| UX-2       | CON-4, PR-03          | #144 delivered the OAuth connect; UX-2 is the entry point in Modelo     |
| UX-3, UX-4 | PR-01, APP-2          | APP-2 is the same onboarding item; UX-3 and UX-4 split it               |
| UX-5       | AG-24                 | pendingRuntime                                                          |
| UX-6       | AU-09                 | Mobile review of the model entry point                                  |
| UX-7, UX-8 | TL-13                 | Attention section and agent shortcuts                                   |
| UX-9       | AG-06, CHT-1          | Same work as CHT-1                                                      |
| UX-10      | AG-07, CHT-2          | Same work as CHT-2 (referenced, not re-planned)                         |
| UX-11      | AG-12, TOL-1          | Grant list and revoke                                                   |
| UX-12      | PR-07, PR-19          | Provider list and enable/disable                                        |

The parity table in `openbot-run-parity.md` has no status column. Git history shows these as delivered and they are used here as a base: BOT-1, BOT-2 and BOT-3 (#142), PRV-1, PRV-4 and part of PRV-5 (#143), the connections layer and one-click OpenRouter connect (#144), and the tool approval card (#135).

## 6. Where our openbot.run notes are thin

Read these as limits on confidence, not as settled facts:

- **Onboarding.** The notes name the steps (choose, plan, and a macOS-only step) and the rule that Next explains a block. They give no copy, layout, timing or screenshots. The "start free" target is our own choice (`openrouter/free`), not theirs.
- **Sidebar.** The notes list pages and name the attention section. The order of sections, icons and the collapsed-rail behavior are not in the notes.
- **Composer.** Only the Enter and modifier-Enter send behavior is noted (AG-06). The visual layout is not.
- **Approval card.** The notes give the kinds of approval and the resolution rules (AG-12, TL-10). The card layout is not described.
- **Pending runtime.** The notes give the field name and the rule (AG-24), but not the wording or placement of the state.
- **Tool activity.** The notes mention an activity line with a mood avatar, not the format of the steps.
- **Settings.** The tab list is confirmed (PR-19). The per-provider page layout comes from PR-01 and PR-04 only.
- **Mobile.** AU-09 lists features. No mobile screen flows are described.
- **Team and automation.** Several items are marked "inferido" in the notes, and there are no screen descriptions.
- **REA summary.** `openbot-run-rea.md` is older and makes claims the 68-case notes do not support, for example one-click template cloning and a failover banner's wording. Prefer the 68-case notes.

Nothing above was verified by running openbot.run. Before a slice relies on a thin area, check that area against the app itself.
