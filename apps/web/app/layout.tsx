import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import "@coinbase/onchainkit/styles.css";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const fredoka = { variable: "font-fredoka" };
const nunito = { variable: "font-nunito" };

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

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start-2p",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} ${nunito.variable} ${pressStart2P.variable} ${vt323.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

