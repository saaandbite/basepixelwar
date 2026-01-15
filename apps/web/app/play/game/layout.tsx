import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "PixelWar - Play Now",
    description: "Fast-paced territory conquest game. Shoot, capture, and dominate the battlefield!",
};

export default function GameLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="game-layout min-h-screen">
            {children}
        </div>
    );
}
