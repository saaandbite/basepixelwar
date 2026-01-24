import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323, Outfit } from "next/font/google";
import "./globals.css";
import "@coinbase/onchainkit/styles.css";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-retro",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-terminal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PixelWar - Territory Conquest Game",
  description: "Fast-paced territory conquest game. Shoot, capture, and dominate the battlefield!",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3B82F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${pressStart2P.variable} ${vt323.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

