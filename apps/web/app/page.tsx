"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    // TODO: Implement wallet connection logic
    try {
      // Placeholder for wallet connection
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Wallet connected!");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={styles.landingPage}>
      {/* Background Effects */}
      <div className={styles.backgroundGrid} />
      <div className={styles.glowOrb1} />
      <div className={styles.glowOrb2} />

      <main className={styles.heroSection}>
        {/* Title */}
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>
            <span className={styles.pixel}>Pixel</span>
            <span className={styles.war}>War</span>
          </h1>
          <p className={styles.subtitle}>
            Compete. Conquer. Claim your territory.
          </p>
        </div>

        {/* Buttons */}
        <div className={styles.buttonContainer}>
          <Link href="/game" className={styles.startButton}>
            <span className={styles.buttonIcon}>🎮</span>
            Start Game
          </Link>
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className={styles.walletButton}
          >
            <span className={styles.buttonIcon}>🔗</span>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>⚔️</span>
            <span>Real-time Battles</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>💰</span>
            <span>Win Rewards</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🏆</span>
            <span>Climb Leaderboard</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Built on Base L2 • Powered by Web3</p>
      </footer>
    </div>
  );
}
