# BasePixelWar
**Real-Time Decentralized Pixel Battle on Base Blockchain**

## Problem Background
In traditional gaming, players often lack control or transparency over game mechanics. Match outcomes and incentives are fully controlled by closed centralized servers (black boxes). This creates doubts regarding fair play and true asset ownership. Pure blockchain solutions are often too slow for real-time games, necessitating a hybrid approach.

## Project Objectives
1.  **Transparent Fairness**: Ensure final game outcomes are validated and recorded on-chain.
2.  **High-Performance Gameplay**: Provide a responsive (low latency) gaming experience without sacrificing Web3 security.
3.  **Community Ownership**: Provide real incentives to players through a faction system (Bull vs Bear) and on-chain rewards.

## Solution Offered
BasePixelWar implements a **Hybrid On-Chain/Off-Chain** architecture. The game runs in real-time using a fast WebSocket server for a smooth user experience, while final results, scores, and reward distributions are executed via Smart Contracts on the Base network. This combines "Web2 speed" with "Web3 trust".

## Key Features
-   **Real-Time Multiplayer**: Instant grid updates for all players via Socket.IO.
-   **Competitive Factions**: Choose your side, Bull Faction or Bear Faction, and dominate the territory.
-   **On-Chain Rewards**: Winners and contributors are validated and rewarded directly via Smart Contract.
-   **Dual-Database System**: TigerBeetle for precise financial in-game balances, and Redis for high-speed caching.
-   **Wallet Integration**: Secure login using Web3 wallets (like MetaMask/Coinbase Wallet).

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

*Optional: Install tsx for TypeScript execution if not available:*
```bash
pnpm add -D -w tsx
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

### Server TypeScript Error
If you encounter `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode`, we have handled this by using `tsx`. Ensure you run the server via the `pnpm dev` script.

### Docker Issues
If containers fail to start:
1.  Ensure Docker Desktop is running.
2.  Check if ports `3004`, `6379`, or `8085` are occupied.
3.  Restart services: `pnpm db:down` then `pnpm db:up` again.

## Development Team
-   **[Your Name/Developer 1]**: Fullstack Developer & Blockchain Engineer
-   **[Member 2]**: Frontend Designer (Placeholder)
-   **[Member 3]**: Backend Specialist (Placeholder)

## Additional Notes
Use the following commands for other utilities:
-   `pnpm build`: Build all packages.
-   `pnpm lint`: Check code quality.
-   `pnpm db:reset`: **Wipe** all data and reset database (Use with caution!).
-   `pnpm dev:reset`: **Deep Clean** project (delete node_modules, cache, and reinstall). Use this if you encounter strange errors.
