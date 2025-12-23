# BasePixelWar

BasePixelWar is a real-time multiplayer pixel painting game built on the Base blockchain. Players can purchase pixels on a shared grid and paint them in their faction's color (Bull or Bear).

## Project Structure

This is a Turborepo monorepo with the following packages/apps:

### Apps and Packages

- `web`: [Next.js](https://nextjs.org/) frontend application running on port 3000
- `server`: Node.js API server
- `tigerbeetle`: High-performance financial ledger for tracking balances and scores
- `redis`: Cache and mapping service for wallet addresses to account IDs
- `@repo/shared`: Shared TypeScript types and utilities

## Prerequisites

- Node.js >= 18
- pnpm (v9.0.0 or higher)
- Docker and Docker Compose
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd basepixelwar
```

2. Install dependencies:
```bash
pnpm install
```

3. Install tsx for TypeScript execution:
```bash
pnpm add -D -w tsx
```

## Setup & Running

### 1. Initialize the Database

First, initialize the TigerBeetle data directory:
```bash
pnpm db:init
```

### 2. Start Database Services

Start TigerBeetle and Redis using Docker Compose:
```bash
pnpm db:up
```

### 3. Run the Development Server

To run both the web and server apps simultaneously:
```bash
pnpm dev
```

To run individual apps:
- Web app only: `pnpm --filter web dev`
- Server only: `pnpm --filter server dev`

### 4. Other Useful Commands

- Build all packages: `pnpm build`
- Lint code: `pnpm lint`
- Check types: `pnpm check-types`
- Stop database services: `pnpm db:down`
- Reset database: `pnpm db:reset`

## Database Services

The project uses two main database services managed by Docker Compose:

- **TigerBeetle** (financial ledger): Runs on port 3004
- **Redis** (cache and mapping): Runs on port 6379
- **Redis Commander** (GUI): Available at http://localhost:8081

## Troubleshooting

### Server TypeScript Error

If you encounter the error `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode`, we've already fixed this by using `tsx` to run TypeScript files directly in development mode.

### Docker Issues

If Docker containers fail to start:
1. Make sure Docker is running
2. Check that ports 3004, 6379, and 8081 are available
3. Run `pnpm db:down` to stop containers and try `pnpm db:up` again

## Technologies Used

- [Turborepo](https://turbo.build/repo) - Build system and monorepo manager
- [Next.js](https://nextjs.org/) - React framework for the frontend
- [TigerBeetle](https://www.tigerbeetle.com/) - High-performance financial ledger
- [Redis](https://redis.io/) - In-memory data structure store
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- [Docker](https://www.docker.com/) - Container platform
- [pnpm](https://pnpm.io/) - Fast, disk space efficient package manager
