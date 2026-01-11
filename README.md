# PixelWar
> "Real-Time PvP Battle Arena with Instant On-Chain Settlement on Base L2."

## Elevator Pitch
PixelWar is a Skill-Based Wagering platform that combines the speed of Web2 gameplay with Web3 financial security.

We recognize that Fully On-Chain Games are often slow and expensive. Therefore, PixelWar adopts a Hybrid Architecture approach:
1.  **Off-Chain Gameplay**: 1vs1 battles run in real-time (lag-free) on the game server for maximum user experience.
2.  **On-Chain Settlement**: All fund flows (Betting & Rewards) are processed directly by Smart Contracts on the Base L2 network.

The result? A game that is exciting to play without interruption, but with guaranteed transparent, automatic, and trustless prize payouts.

## Key Features (Current MVP)
*   **Zero-Latency Gameplay**:
    Mechanics run on a custom-built Node.js WebSocket server, ensuring smooth real-time 1vs1 battles.
*   **Trustless Settlement**:
    Prize pool management is fully automated via Base Smart Contract. No manual payouts.
*   **Secure Wallet Login**:
    Integrated with OnchainKit for seamless wallet connection and transaction signing.
*   **Hybrid Sync Engine**:
    State synchronization between Client (React) and Server ensuring fair play with validation logic.

## Technical Flow (Implemented)
1.  **Staking**: Player approves 0.001 ETH tx.
2.  **Lobby**: Player waits in queue for opponent.
3.  **Battle**: 90-second match on WebSocket server.
4.  **Result**: Winner declared, server triggers On-Chain Payout.

## Status: Active MVP
We are currently in **Phase 1 (Proof of Concept)**.
*   **Gameplay**: 1vs1 Battles are Live.
*   **Blockchain**: Escrow & Payout Contracts are deployed on Base Sepolia.
*   **Database**: Redis & TigerBeetle integration is **In Progress**.
*   **Future Features**: Leaderboards, Guilds, and NFTs are planned for Q3 2026.

## Roadmap: The Journey to Mainnet

This roadmap is built based on the team's direct experience building and testing the PixelWar MVP on Base Sepolia. Our primary focus is ensuring core features are truly playable and stable before expanding features and scaling the ecosystem towards Mainnet.

---

### Phase 1: Proof of Concept

**Status:** Current – Hackathon MVP
**Network:** Live on Base Sepolia Testnet

In this phase, we are validating the core idea of PixelWar as a real-world playable on-chain PvP game, not just a concept.

**Development Scope:**

* **Hybrid Architecture**
  Integration of Next.js as the frontend with Base Smart Contracts for on-chain logic, and an off-chain server for gameplay synchronization.
* **1 vs 1 Wagering**
  Implementation of basic wagering mechanisms between players with automatic prize distribution via smart contracts.
* **Wallet Integration**
  Using OnchainKit for simpler and faster wallet onboarding, including Smart Wallet support.
* **Mid-Submission (12 Jan)**
  Validation of the flow of funds and testing wallet connection stability based on playtest results and transaction simulations.

---

### Phase 2: Security & Experience

**Target:** Q2 2026

Once the MVP is validated, this phase focuses on strengthening system security and improving the gaming experience based on user feedback.

**Main Focus:**

* **Anti-Cheat System**
  Improved validation on the off-chain server to ensure player input remains fair and prevent exploits like speed hacks.
* **Smart Contract Audit**
  Security audit of the `payoutWinner` function, focusing on access control and potential reentrancy.
* **Mobile Optimization**
  UI/UX refinements to ensure optimal performance in in-app wallet browsers, especially MetaMask Mobile.

---

### Phase 3: Mainnet Launch

**Target:** Q3 2026

This phase marks the transition of PixelWar from the testnet environment to the full Mainnet ecosystem.

**Implementation Plan:**

* **Go Live on Base Mainnet**
  Smart contract deployment to Base Mainnet using real ETH.
* **Leaderboard System**
  Weekly ranking system to encourage competition based on player win rates.
* **Community Guilds**
  Simple clan features to build community interaction and team-based competition.

---

### Phase 4: Future Vision

**Target:** Q4 2026

Long-term stage to expand the PixelWar competitive ecosystem and provide sustainable value for players.

**Further Development:**

* **The "MCL" Protocol (Weekly Tournament)**
  Automated weekly tournaments with an on-chain managed bracket system.
* **Generative Trophy NFT**
  Tournament winners will receive unique Trophy NFTs generated based on their victory data and performance.

---

> PixelWar is developed as an on-chain competitive arena that balances blockchain transparency, real-time gameplay, and a fair user experience.

---

## Technical Documentation

## Project Structure & Architecture
This is a **Turborepo monorepo**. Here are the main components:

### Apps
-   `web`: Frontend application using [Next.js](https://nextjs.org/) (Port 3000/5173).
-   `server`: Node.js API & WebSocket server.
-   `tigerbeetle`: High-performance financial ledger for tracking balances & scores.
-   `redis`: Cache & mapping service (Wallet Address <-> Account ID).

### Packages
-   `@repo/shared`: Shared TypeScript types and utilities.
-   `@repo/ui`: Shared UI components.
-   `contracts`: Solidity Smart Contracts & Foundry environment.

## Database Services
The project runs two main databases via Docker Compose:
-   **TigerBeetle** (Port `3004`): Financial ledger.
-   **Redis** (Port `6379`): Data cache & sessions.
-   **Redis Commander** (Port `8085`): GUI to view Redis data in browser (http://localhost:8085).

## Tech Stack
**Core Stack**
-   [Turborepo](https://turbo.build/repo): Build system.
-   [Next.js](https://nextjs.org/): Frontend Framework.
-   [TypeScript](https://www.typescriptlang.org/): Primary programming language.
-   [Docker](https://www.docker.com/): Container platform.
-   [pnpm](https://pnpm.io/): Package manager.

**Backend & Blockchain**
-   [TigerBeetle](https://www.tigerbeetle.com/): Financial ledger.
-   [Redis](https://redis.io/): In-memory store.
-   Foundry & Solidity: Smart Contracts.

## How to Run the Application1`

### Prerequisites
-   Node.js >= 18
-   pnpm (v9.0.0+)
-   Docker & Docker Compose
-   Git

### 1. Installation
Clone repository and install dependencies:
```bash
git clone <repository-url>
cd basepixelwar
pnpm install
```

*Optional: Install tsx for TypeScript execution if not available:*
```bash
pnpm add -D -w typescript@latest
```

### 2. Database Setup
Initialize TigerBeetle data (needs to be done once):
```bash
pnpm db:init
```

Start database services (TigerBeetle & Redis):
```bash
pnpm db:up
```

### 3. Start Development Server
Run frontend and backend simultaneously:
```bash
pnpm dev
```
-   Web App: http://localhost:5173 (or 3000)
-   Server: http://localhost:3000

To run separately:
-   Web only: `pnpm --filter web dev`
-   Server only: `pnpm --filter server dev`

### 4. Tailwind CSS Setup & Configuration
This project uses **Tailwind CSS v4**.

-   **Configuration**: `apps/web/tailwind.config.js`
-   **Global CSS**: `apps/web/app/globals.css`

To change faction theme colors, edit `tailwind.config.js` in the `extend.colors` section.

## Troubleshooting

### Docker Issues
If containers fail to start:
1.  Ensure Docker Desktop is running.
2.  Check if ports `3005`, `6379`, or `8085` are occupied.
3.  Restart services: `pnpm db:down` then `pnpm db:up` again.

## Development Team
-   **Haris Sandi Purna Yudha**: Fullstack Developer & Blockchain Engineer
-   **Roro Ayu Savera Wijaya**: Frontend Designer (Placeholder)
-   **Ahmad Dedad**: Backend Specialist (Placeholder)

## Additional Notes
Use the following commands for other utilities:
-   `pnpm build`: Build all packages.
-   `pnpm lint`: Check code quality.
-   `pnpm db:reset`: **Wipe** all data and reset database (Use with caution!).
-   `pnpm dev:reset`: **Deep Clean** project (delete node_modules, cache, and reinstall). Use this if you encounter strange errors.
