# Open Bot design system

Open Bot is a dark, quiet workspace for talking to a team of bots. It keeps the
incumbent identity (near-black ground, geometric bot avatars, one bot per chat)
and raises it to a premium, mobile-first PWA. The surface mode is **Operate**:
people come to get an answer from a bot, fast, on a phone as often as on a
desk. Brand lives in precise details, not decoration.

Scene: a phone at night or a laptop in a dim room, used in short bursts. Dark
ground, high text contrast, nothing that glows for its own sake.

The source of truth for values is `src/app/globals.css`.

## Color

Use the semantic Tailwind tokens only. Never write `zinc-*`, `neutral-*`,
`black`, `white`, `bg-[#...]` or hex values in components.

| Role                            | Token                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------- |
| App ground                      | `bg-background`                                                               |
| Sidebar plane                   | `bg-sidebar`                                                                  |
| Raised control / card / bubble  | `bg-surface`                                                                  |
| Hover on raised, nested control | `bg-surface-secondary`                                                        |
| Pressed, selected row           | `bg-surface-tertiary`                                                         |
| Modal / sheet / popover         | `bg-overlay`                                                                  |
| Primary text                    | `text-foreground`                                                             |
| Secondary text                  | `text-muted`                                                                  |
| Meta text (timestamps, hints)   | `text-subtle`                                                                 |
| Hairlines                       | `border-border` (controls), `border-separator` (dividers)                     |
| Active bot accent               | `text-bot-accent`, `bg-bot-accent`, `bg-bot-accent-soft`, `border-bot-accent` |
| Status                          | `text-success`, `text-warning`, `text-danger` (+ `-soft` backgrounds)         |
| Scrim                           | `bg-backdrop`                                                                 |

Strategy: **Restrained.** Graphite neutrals plus one accent, and that accent is
the active bot's color. `--bot-accent` is set on `<html>` by the shell from
`src/features/bots/bot-accent.ts`, so focus rings, selection, the caret, the
active sidebar row and the bot's own chrome all take that bot's color. Accent
marks state (active, focused, selected, live), never fills large areas.

Primary action buttons (send, save, create) are `bg-foreground text-background`.
Secondary buttons are `bg-surface` with `border border-border`. Ghost buttons
are text-only with `hover:bg-surface`. Destructive is `text-danger` with
`hover:bg-danger-soft`; a filled danger button only inside a confirm step.

## Type

System stack (`font-sans`), no web font: instant offline paint for the PWA.
Mono (`font-mono`) only for code, model ids and keyboard keys.

| Use                          | Mobile                 | Desktop (`md:`)         |
| ---------------------------- | ---------------------- | ----------------------- |
| Greeting / empty-state title | 26px semibold, -0.02em | 32px semibold, -0.025em |
| Sheet / modal title          | 18px semibold          | 18px semibold           |
| Message body                 | 16px / 1.65            | 15px / 1.7              |
| Control label, list title    | 15px medium            | 14px medium             |
| Secondary line               | 13px                   | 13px                    |
| Meta, badges                 | 12px medium            | 12px medium             |

Any `<input>`/`<textarea>` is at least 16px on mobile (iOS zooms below that).
Headings use `text-balance`; counts and sizes use `tabular-nums`.
No eyebrow/kicker labels above headings. No gradient text.

## Space and shape

4px base. Tight inside a group (8–12px), generous between groups (24–32px).
Radius: `rounded-xl` (12px) controls and list rows, `rounded-2xl` (16px) cards
and message bubbles, `rounded-3xl` (24px) composer and sheet top corners,
`rounded-full` icon buttons, pills and avatars.
Reading measure: conversation column `max-w-3xl` (768px), centered.

Depth comes from the surface ramp and hairlines, not shadows. The only shadow
is `shadow-overlay` on floating layers (sheets, popovers, palettes).

## Touch and layout (mobile first)

- Write the mobile layout first, then add `md:`/`lg:` overrides.
- Every tap target is at least 44×44px (`size-11` icon buttons, `min-h-11` rows).
- Edge-anchored chrome respects safe areas: header `pt-safe`, composer dock
  `pb-[max(var(--safe-bottom),0.75rem)]`, drawers `pl-safe`.
- Phone: the composer is docked to the bottom in the thumb zone, on the empty
  state too. Desktop: the empty state centers the composer under the greeting.
- Phone: sidebar is a drawer from the left over a `bg-backdrop` scrim; modals
  become bottom sheets (`rounded-t-3xl`, grab handle, sticky footer actions,
  `max-h-[92dvh]`). Desktop (`md:`): persistent sidebar, centered dialogs.
- Horizontal chip rows scroll on phone (`overflow-x-auto`, `snap-x`, hidden
  scrollbar) instead of wrapping into a wall.
- Use `h-dvh`, never `h-screen`.

## Motion

One curve: `ease-out-expo`. Durations: 140ms micro (hover, press), 220ms UI
(enter, fade), 360ms sheets and drawers.

- New message: `animate-enter` (6px rise + fade), once, on mount.
- Sheet: `animate-sheet-up`; drawer: `animate-drawer-in`; scrim: `animate-fade-in`.
- Thinking indicator: three dots with `animate-typing`, staggered delay.
- Press feedback: `active:scale-[0.97]` on buttons and chips.
- Never animate layout properties; `prefers-reduced-motion` is handled globally.

## Icons

Inline SVG, 24px viewBox, `stroke="currentColor"`, `strokeWidth={1.75}`,
round caps and joins, rendered at `size-4` or `size-5`. No emoji or unicode
glyphs as icons (⚡ ✦ → ⚠️ are not icons).

## States every control carries

Default, hover (pointer only: `hover:` is fine, never hide information behind
it), `focus-visible` (global ring in bot accent; do not remove outlines),
active/pressed, disabled (`disabled:opacity-40 disabled:pointer-events-none`),
loading, and for data views: empty, error, offline.

## Voice

Bilingual parity (pt-BR and en). Controls name their action ("Salvar bot",
"Nova conversa"). Errors name the problem and the recovery. Copy lives in the
domain copy dictionaries (`chat-copy.ts` and siblings), not inline ternaries.
