# Stack candidates

Status: **the first chat screen uses HeroUI React v3.2.7 with its default dark theme.** HeroUI React and styles are Apache-2.0; Tailwind CSS and its PostCSS plugin are MIT. Apple Human Interface Guidelines guide hierarchy, accessibility, safe areas and platform behavior. This is an initial implementation choice, not device validation.

## Initial spike result

- HeroUI React supplies accessible controls, cards, inputs, badges and icons. The application composes these public components into a bilingual mobile-first chat with a local mock calendar tool.
- The app keeps the Next.js manifest. This does not include a service worker or offline behavior. Installation, trusted HTTPS pairing, iOS/Android testing, a real model/provider and latency remain unverified.
- HeroUI's Chat starter template is a Pro template; Open Bot does not copy it. The chat screen uses public HeroUI components and an application-owned composition.

| Area             | Candidate                          | Reason / open question                                                                                                       |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Mobile interface | React and TypeScript PWA           | One web interface for phone and desktop; validate installation and network access on target devices.                         |
| Mobile UI        | HeroUI React 3.2.7                 | Apache-2.0 React component library built on React Aria; use public components and keep the official style imports intact.    |
| Server           | Node.js and TypeScript             | Shared language across UI and agent; validate tool and provider SDK support.                                                 |
| Storage          | SQLite                             | Small local deployment; decide how to protect credentials separately.                                                        |
| Local model      | Liquid LFM3-1.7B                   | Candidate for the first experiment; measure Portuguese, latency and tool calling.                                            |
| External models  | Provider adapters                  | Start by evaluating Anthropic and a free cloud provider through optional 9Router; support compatible endpoints as validated. |
| Tools            | MCP client and direct API adapters | Start with GitHub and calendar read access.                                                                                  |

## UI kit decision

- **Selected for the MVP:** HeroUI React v3.2.7, dark-only, with its official style package and Tailwind CSS 4 setup. `globals.css` contains only the official imports; the app adds no CSS declarations or inline styles. Tailwind utilities compose layout and responsive behavior.
- **License:** `@heroui/react` and `@heroui/styles` package metadata declare Apache-2.0; Tailwind CSS and `@tailwindcss/postcss` declare MIT. Keep the licenses with redistributed assets or code.
- **Starter templates:** the official Chat template is a Pro offering; the app uses public components rather than copying premium template code.
- **Design guidance:** Apple Human Interface Guidelines inform hierarchy, touch targets, safe areas and accessibility. They are not a UI component kit.
- **Not selected:** Ionic React, Astryx, shadcn/ui and Material UI would add a redundant component kit to the current MVP.

## Other UI candidates

- **Astryx:** React components and chat-specific patterns; not selected after choosing HeroUI.
- **Ionic React:** mobile navigation and components out of the box; stronger framework conventions.
- **shadcn/ui:** customizable React components; mobile interaction and layout require more product design work.
- **Material UI:** comprehensive React components and Material styling; adapting its visual identity takes effort.
- **React Aria:** accessible behavior primitives with extensive visual control; requires more styling work.

Evaluate with a small prototype: chat, settings, connections and an approval dialog on iOS and Android browsers. Check keyboard, touch targets, safe areas, accessibility, installability and dark mode before choosing.
