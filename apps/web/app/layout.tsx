import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "./contexts/WalletContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "block",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} ${nunito.variable}`}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}

