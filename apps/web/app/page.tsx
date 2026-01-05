"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { useWallet, formatAddress, isCorrectChain } from "./contexts/WalletContext";

export default function Home() {
  const {
    address,
    isConnected,
    isConnecting,
    chainId,
    error,
    connect,
    disconnect,
    switchToBase,
  } = useWallet();

  const handleConnectWallet = async () => {
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const isOnCorrectChain = isCorrectChain(chainId);

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

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Chain Warning */}
        {isConnected && !isOnCorrectChain && (
          <div className={styles.warningMessage}>
            <span>⚠️ Wrong network detected. Please switch to Base.</span>
            <button onClick={switchToBase} className={styles.switchButton}>
              Switch to Base
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className={styles.buttonContainer}>
          <Link href="/room" className={styles.startButton}>
            <span className={styles.buttonIcon}>🎮</span>
            Start Game
          </Link>

          {isConnected && address ? (
            <button
              onClick={handleDisconnect}
              className={styles.walletButtonConnected}
            >
              <span className={styles.buttonIcon}>✅</span>
              {formatAddress(address)}
            </button>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className={styles.walletButton}
            >
              <span className={styles.buttonIcon}>🔗</span>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>

        {/* Connected Info */}
        {isConnected && address && (
          <div className={styles.connectedInfo}>
            <div className={styles.walletBadge}>
              <span className={styles.walletDot} />
              <span>Wallet Connected</span>
            </div>
            {isOnCorrectChain && (
              <div className={styles.chainBadge}>
                <span>🔵 Base Network</span>
              </div>
            )}
          </div>
        )}

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
