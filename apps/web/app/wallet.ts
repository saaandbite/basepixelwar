// Wallet Context and Hooks exports
export { WalletProvider, useWallet, formatAddress, isCorrectChain, TARGET_CHAIN_ID, BASE_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from "./contexts/WalletContext";
export type { WalletState, WalletContextType } from "./contexts/WalletContext";

export { useGameVault, GameMode, GameState, GAME_VAULT_ADDRESS, BID_AMOUNT_WEI } from "./hooks/useGameVault";
export type { GameInfo, UseGameVaultReturn } from "./hooks/useGameVault";
