"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { useWallet, formatAddress, isCorrectChain } from "./contexts/WalletContext";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  Name,
  Identity,
} from "@coinbase/onchainkit/identity";

export default function Home() {
  const {
    address,
    isConnected,
    chainId,
    error,
    switchToBase,
  } = useWallet();

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

          {/* Wallet Button - Wrapped for consistent width */}
          <div className={styles.walletWrapper}>
            {!isConnected ? (
              <Wallet>
                <ConnectWallet className={styles.walletButton}>
                  <span>Connect Wallet</span>
                </ConnectWallet>
              </Wallet>
            ) : (
              <Wallet>
                <ConnectWallet className={styles.walletButtonConnected}>
                  <span className={styles.walletDot} />
                  <span>{formatAddress(address || '')}</span>
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            )}
          </div>
        </div>

        {/* Connected Info - Only show chain badge */}
        {isConnected && address && isOnCorrectChain && (
          <div className={styles.connectedInfo}>
            <div className={styles.chainBadge}>
              <span>🔵 Base Network</span>
            </div>
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
        <p>Built on Base L2 • Powered by OnchainKit</p>
      </footer>
    </div>
  );
}
