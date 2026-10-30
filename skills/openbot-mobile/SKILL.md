---
name: openbot-mobile
description: Build or assess Open Bot mobile PWA screens using Next.js, React, HeroUI and Apple-inspired design guidance.
---

# Open Bot mobile

Read `docs/stacks/README.md` and `docs/spikes/mobile-agent.md` before choosing libraries. Next.js and HeroUI React are the current prototype stack; PWA behavior remains unverified until device testing records evidence.

For UI work, keep conversation, connection and approval behavior in their owning product domains. Use accessible labels, keyboard and screen-reader semantics, visible focus, touch-friendly controls and clear loading and error states. Do not put secrets or provider credentials in client bundles.

## Apple-inspired design

Use the [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) as design guidance, while giving Open Bot its own identity. Favor a clear content hierarchy, familiar navigation, concise labels, consistent spacing and controls that communicate their state. Keep the chat composer and important actions usable when the software keyboard is open; respect safe areas and system UI. Adapt layouts to screen size, orientation, text enlargement and language length.

Use semantic color and typography tokens; Open Bot uses a dark-only interface with readable contrast. Do not rely on color alone for status. Check labels, focus order, screen-reader announcements, touch targets and reduced-motion preferences. Apply these principles to the web implementation rather than assuming native-only iOS features exist in a PWA. See Apple's [layout](https://developer.apple.com/design/human-interface-guidelines/layout) and [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) guidance.

Use HeroUI's public components and default theme where possible. Do not copy HeroUI Pro templates or introduce application-authored CSS/inline styles. Validate actual PWA behavior instead of assuming it matches a native app. On Android, check navigation, back behavior, keyboard, safe areas and accessibility against platform expectations; do not force iOS conventions without a product decision.

Use HeroUI components for chat controls and icons. Use a distinct Open Bot identity inspired by Grok Bot; proposed workflows are in `docs/roadmap/roadmap.pt-BR.md`. Check contrast before adopting colors.

Verify the relevant flows on available mobile browsers: safe areas, viewport and soft keyboard, scrolling, reconnect, contrast and focus. Record exact device and browser; do not claim iOS or Android coverage without observing it.
