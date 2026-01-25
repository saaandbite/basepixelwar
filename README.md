# PixelWar
> "Real-Time PvP Battle Arena with Instant On-Chain Settlement on Base L2."

> **Concept Reference:**
> This implementation is based on the provided concept.
>
> **Admin Transaction Log:** [https://sepolia.basescan.org/txs?a=0x7bA8ebC043FC93b218D046Eb15A77765D14f47c6](https://sepolia.basescan.org/txs?a=0x7bA8ebC043FC93b218D046Eb15A77765D14f47c6)
>
> **Smart Contract Transaction Log:** [https://sepolia.basescan.org/txs?a=0x089a1619c076b6e844620cf80ea3b981daca3772](https://sepolia.basescan.org/txs?a=0x089a1619c076b6e844620cf80ea3b981daca3772)

---

## Elevator Pitch
PixelWar is a Skill-Based Wagering platform that combines the speed of Web2 gameplay with Web3 financial security.

We recognize that Fully On-Chain Games are often slow and expensive. Therefore, PixelWar adopts a Hybrid Architecture approach:
1.  **Off-Chain Gameplay**: 1vs1 battles run in real-time (lag-free) on the game server for maximum user experience.
2.  **On-Chain Settlement**: All fund flows (Betting & Rewards) are processed directly by Smart Contracts on the Base L2 network.

The result? A game that is exciting to play without interruption, but with guarantee transparent, automatic, and trustless prize payouts.

## Key Features (Active)
*   **Zero-Latency Gameplay**:
    Mechanics run on a custom-built Node.js WebSocket server, ensuring smooth real-time 1vs1 battles.
*   **Trustless Settlement**:
    Prize pool management is fully automated via Base Smart Contract. No manual payouts.
*   **Secure Wallet Login**:
    Integrated with OnchainKit for seamless wallet connection and transaction signing.
*   **Tournament Ecosystem** (New):
    Fully automated tournament lobbies with "Room" based matchmaking and bracket progression.
*   **Room & Lobby System**:
    Players can browse active game rooms, view live player counts, and join specific lobbies.
*   **Live Leaderboards**:
    Real-time tracking of player performance and earnings.

## Technical Flow (Implemented)
1.  **Staking**: Player approves 0.001 ETH tx.
2.  **Lobby**: Player selects a Room or Tournament.
3.  **Battle**: 90-second match on WebSocket server.
4.  **Result**: Winner declared, server triggers On-Chain Payout.

## Status: Active Beta (Phase 2)
We are currently in **Phase 2 (Security & Expansion)**.
*   **Gameplay**: 1vs1 Battles and Tournament Rooms are Live.
*   **Blockchain**: Escrow & Payout Contracts are deployed on Base Sepolia.
*   **Database**: Redis & TigerBeetle integration is Active.
*   **3D Graphics**: Custom optimized HTML5 Canvas engine (No heavy engines like Three.js).

---

## Roadmap: The Journey to Mainnet

This roadmap is built based on the team's direct experience building and testing the PixelWar MVP on Base Sepolia.

### Phase 1: Proof of Concept (Completed)
**Status:** Completed
**Network:** Base Sepolia Testnet

*   [x] **Hybrid Architecture**: Next.js Frontend + WebSocket Server + Solidity Contracts.
*   [x] **1 vs 1 Wagering**: Basic betting and payout loop.
*   [x] **Wallet Integration**: OnchainKit & Smart Wallet support.

### Phase 2: Security & Experience (Current)
**Target:** Q2 2026

*   [x] **Tournament System**: Automated lobbies and room management.
*   [x] **Leaderboard V1**: Basic ranking display.
*   [ ] **Anti-Cheat System**: Server-side movement validation (In Progress).
*   [ ] **Smart Contract Audit**: Security review of `payoutWinner`.
*   [ ] **Mobile Optimization**: Refine UX for mobile wallet browsers.

### Phase 3: Mainnet Launch
**Target:** Q3 2026

*   [ ] **Go Live on Base Mainnet**: Real ETH mainnet deployment.
*   [ ] **Community Guilds**: Clan/Team features.
*   [ ] **MCL Protocol**: Professional Weekly Tournaments.

---

## Technical Documentation

## Project Structure & Architecture
This is a **Turborepo monorepo**. Here are the main components:

### Apps
-   `web`: Frontend application using [Next.js](https://nextjs.org/) (Port 3000). Custom 3D rendering engine.
-   `server`: Node.js API & WebSocket server. Handles game state, rooms, and tournaments.
-   `tigerbeetle`: High-performance financial ledger for tracking balances & scores.
-   `redis`: Cache & mapping service (Wallet Address <-> Account ID).

### Packages
-   `@repo/shared`: Shared TypeScript types and utilities.
-   `@repo/ui`: Shared UI components.
-   `contracts`: Solidity Smart Contracts & Foundry environment.

## Database Services
The project runs two main databases via Docker Compose:
-   **TigerBeetle** (Port `3005`): Financial ledger.
-   **Redis** (Port `6379`): Data cache & sessions.

## Tech Stack
**Core Stack**
-   [Turborepo](https://turbo.build/repo): Build system.
-   [Next.js](https://nextjs.org/): Frontend Framework.
-   [TypeScript](https://www.typescriptlang.org/): Primary programming language.
-   [Docker](https://www.docker.com/): Container platform.

**Backend & Blockchain**
-   [TigerBeetle](https://www.tigerbeetle.com/): Financial ledger.
-   [Redis](https://redis.io/): In-memory store.
-   Foundry & Solidity: Smart Contracts.

## How to Run the Application

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
-   Web App: http://localhost:3000
-   Server: http://localhost:3001 (WebSocket)

### 4. Tailwind CSS Setup & Configuration
This project uses **Tailwind CSS v4**.
-   **Configuration**: `apps/web/tailwind.config.js`
-   **Global CSS**: `apps/web/app/globals.css`

## Development Team
-   **Haris Sandi Purna Yudha**: Fullstack Developer & Blockchain Engineer
-   **Roro Ayu Savera Wijaya**: Frontend Designer (Placeholder)
-   **Ahmad Dedad**: Backend Specialist (Placeholder)

## Additional Notes
Use the following commands for other utilities:
-   `pnpm build`: Build all packages.
-   `pnpm lint`: Check code quality.
-   `pnpm db:reset`: **Wipe** all data and reset database (Use with caution!).
-   `pnpm dev:reset`: **Deep Clean** project (delete node_modules, cache, and reinstall).
