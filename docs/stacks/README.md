# Stack candidates

Status: **initial result: Next.js 16.4.3, React 19.3.1 and Ionic React 9.0.10 build together and run the first dark, bilingual chat/tool demo in desktop Chrome; mobile fit remains unvalidated**. Stack choices stay provisional until target-device and integration checks are complete.

## Initial spike result

- The production build emits `/` and `/manifest.webmanifest` successfully.
- Ionic React Web Components are loaded client-side to avoid mismatched markup during React hydration. A static HTML welcome/composer shell renders first and shares copy with the interactive UI, with a small amount of repeated presentation markup. Interactivity starts after the Ionic bundle loads.
- This is desktop evidence only. There is no service worker/offline behavior, trusted HTTPS pairing, installation test, iOS/Android test, real model/provider, or latency result.

| Area             | Candidate                          | Reason / open question                                                                                                       |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Mobile interface | React and TypeScript PWA           | One web interface for phone and desktop; validate installation and network access on target devices.                         |
| Mobile UI        | Ionic React                        | Mobile-oriented components and PWA support; compare with shadcn/ui for visual flexibility.                                   |
| Server           | Node.js and TypeScript             | Shared language across UI and agent; validate tool and provider SDK support.                                                 |
| Storage          | SQLite                             | Small local deployment; decide how to protect credentials separately.                                                        |
| Local model      | Liquid LFM3-1.7B                   | Candidate for the first experiment; measure Portuguese, latency and tool calling.                                            |
| External models  | Provider adapters                  | Start by evaluating Anthropic and a free cloud provider through optional 9Router; support compatible endpoints as validated. |
| Tools            | MCP client and direct API adapters | Start with GitHub and calendar read access.                                                                                  |

## UI candidates

- **Ionic React:** mobile navigation and components out of the box; stronger framework conventions.
- **shadcn/ui:** customizable React components; mobile interaction and layout require more product design work.
- **Material UI:** comprehensive React components and Material styling; adapting its visual identity takes effort.
- **React Aria:** accessible behavior primitives with extensive visual control; requires more styling work.

Evaluate with a small prototype: chat, settings, connections and an approval dialog on iOS and Android browsers. Check keyboard, touch targets, safe areas, accessibility, installability and dark mode before choosing.
