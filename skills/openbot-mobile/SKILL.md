---
name: openbot-mobile
description: Build or assess Open Bot mobile PWA screens using the proposed Next.js, React, Ionic and Apple-inspired interface.
---

# Open Bot mobile

Read `docs/stacks/README.md` and `docs/spikes/mobile-agent.md` before choosing libraries. Next.js, Ionic and PWA behavior remain hypotheses until the spike records evidence.

For UI work, keep conversation, connection and approval behavior in their owning product domains. Use accessible labels, keyboard and screen-reader semantics, visible focus, touch-friendly controls and clear loading and error states. Do not put secrets or provider credentials in client bundles.

Verify the relevant flows on available mobile browsers: safe areas, viewport and soft keyboard, scrolling, reconnect, contrast and focus. Record exact device and browser; do not claim iOS or Android coverage without observing it. If Ionic and Next.js conflict, document the failure and alternatives rather than silently changing stack.
