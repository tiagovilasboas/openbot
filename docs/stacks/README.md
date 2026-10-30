# Stack candidates

Status: **the first chat screen uses Astryx 0.7.4 with its Neutral theme in dark mode.** Astryx is MIT-licensed and currently beta. Apple Human Interface Guidelines guide hierarchy, accessibility, safe areas and platform behavior. This is an initial implementation choice, not device validation.

## Initial spike result

- The production build emits `/` and `/manifest.webmanifest` successfully.
- Astryx supplies the chat composer, message list, message bubbles, tool-call display, layout, theme tokens and icons. The project adapts the official AI Chat Landing and AI Chat Conversation patterns, keeping the product focused on a bilingual local mock and calendar tool.
- This is desktop evidence only. There is no service worker/offline behavior, trusted HTTPS pairing, installation test, iOS/Android test, real model/provider, or latency result.

| Area             | Candidate                          | Reason / open question                                                                                                       |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Mobile interface | React and TypeScript PWA           | One web interface for phone and desktop; validate installation and network access on target devices.                         |
| Mobile UI        | Astryx 0.7.4                       | MIT React design system and chat templates; beta status means upgrades and mobile behavior need review.                      |
| Server           | Node.js and TypeScript             | Shared language across UI and agent; validate tool and provider SDK support.                                                 |
| Storage          | SQLite                             | Small local deployment; decide how to protect credentials separately.                                                        |
| Local model      | Liquid LFM3-1.7B                   | Candidate for the first experiment; measure Portuguese, latency and tool calling.                                            |
| External models  | Provider adapters                  | Start by evaluating Anthropic and a free cloud provider through optional 9Router; support compatible endpoints as validated. |
| Tools            | MCP client and direct API adapters | Start with GitHub and calendar read access.                                                                                  |

## UI kit decision

- **Selected for the MVP:** Astryx 0.7.4 with the Neutral theme forced to dark mode. The app composes Astryx components and theme tokens without application-authored CSS; Neutral keeps a restrained sans-serif interface suited to a utility chat surface.
- **License and maturity:** Astryx core and Neutral theme are MIT; the project is beta. Pin versions and verify generated HTML, keyboard behavior and mobile layout when upgrading.
- **Mobile touch target:** Astryx 0.7.4's largest built-in `Button` is 36 px high; `SegmentedControl` rendered 28 px high at 320 × 659. Neither reaches Apple's 44 pt target. The product avoids authored CSS overrides, so track an upstream larger size or a core control that supplies one.
- **Design guidance:** Apple Human Interface Guidelines inform hierarchy, touch targets, safe areas and accessibility. They are not a UI component kit.
- **Not selected:** Ionic React, shadcn/ui and Material UI would add a redundant component kit to the current MVP.

## Other UI candidates

- **Astryx:** React components and chat-specific patterns with an MIT license; beta maturity is the main trade-off.
- **Ionic React:** mobile navigation and components out of the box; stronger framework conventions.
- **shadcn/ui:** customizable React components; mobile interaction and layout require more product design work.
- **Material UI:** comprehensive React components and Material styling; adapting its visual identity takes effort.
- **React Aria:** accessible behavior primitives with extensive visual control; requires more styling work.

Evaluate with a small prototype: chat, settings, connections and an approval dialog on iOS and Android browsers. Check keyboard, touch targets, safe areas, accessibility, installability and dark mode before choosing.
