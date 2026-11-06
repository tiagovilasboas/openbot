import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RegisterServiceWorker } from "@/features/pwa/RegisterServiceWorker";
import "./globals.css";

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
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark" className="dark bg-black">
      <body className="bg-black text-zinc-100 antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
