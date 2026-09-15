import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIZA",
  description:
    "AIZA — voice-first access to verified Malagasy administrative procedures.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C2410C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mg">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
