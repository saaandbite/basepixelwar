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
*   ✅ **Gameplay**: 1vs1 Battles are Live.
*   ✅ **Blockchain**: Escrow & Payout Contracts are deployed on Base Sepolia.
*   🚧 **Database**: Redis & TigerBeetle integration is **In Progress**.
*   🔮 **Future Features**: Leaderboards, Guilds, and NFTs are planned for Q3 2026.

## Roadmap: The Journey to Mainnet
Our development strategy focuses on MVP stability before feature expansion.

### Phase 1: Proof of Concept (Current - Hackathon MVP)
*Status: Live on Base Sepolia Testnet*
*   **Hybrid Architecture**: Next.js Frontend integration with Base Smart Contract.
*   **1vs1 Wagering**: Implementation of basic wagering features and automated prize withdrawal.
*   **Wallet Integration**: Using OnchainKit for seamless onboarding (Smart Wallet Support).
*   **Mid-Submission ( Jan 12)**: Validation of Fund Flows and wallet connection stability.

### Phase 2: Security & Experience (Q2 2026)
*   **Anti-Cheat System**: Enhancing Off-Chain server security to validate player input (preventing speed hacks).
*   **Contract Audit**: Security audit on the payoutWinner function (Access Control & Reentrancy Check).
*   **Mobile Optimization**: UI/UX refinement to be 100% responsive in in-app wallet browsers (MetaMask Mobile).

### Phase 3: Mainnet Launch (Q3 2026)
*   **Go Live on Base**: Deployment to Base Mainnet using real ETH.
*   **Leaderboard System**: Weekly rankings for players with the highest Win Rate.
*   **Community Guilds**: Simple clan features for the community base.

### Phase 4: Future Vision (Q4 2026)
*   **The "MCL" Protocol (Weekly Tournament)**: Automated weekly tournaments with a bracket system.
*   **Generative Trophy NFT**: Tournament winners receive a unique NFT Trophy generated based on their victory data.

> "Pioneering the Hybrid-Wagering Model on Base: The speed of Web2 gaming meets the security of Base L2 settlements."

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
