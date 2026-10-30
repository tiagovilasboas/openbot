import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "./openbot.css";
import "../features/chat/chat-chrome.css";
import "../features/chat/chat-conversation.css";
import "../features/chat/chat-composer.css";

export const metadata: Metadata = {
  title: "Open Bot",
  description: "A personal assistant you can run your way.",
  applicationName: "Open Bot",
  icons: { icon: "/openbot-icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101114",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
