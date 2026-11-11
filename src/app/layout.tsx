import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { RegisterServiceWorker } from "@/features/pwa/RegisterServiceWorker";
import "./globals.css";

const GROUND_COLOR = "#0b0c0f";

export const metadata: Metadata = {
  title: "Open Bot",
  description: "A personal assistant you can run your way.",
  applicationName: "Open Bot",
  icons: { icon: "/openbot-icon.svg", apple: "/apple-icon" },
  appleWebApp: {
    capable: true,
    title: "Open Bot",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: GROUND_COLOR,
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // The CSP nonce is per request, and Next only stamps it while rendering a
  // request: opt every page into dynamic rendering.
  await connection();
  return (
    <html lang="pt-BR" data-theme="dark" className="dark">
      <body className="bg-background text-foreground antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
