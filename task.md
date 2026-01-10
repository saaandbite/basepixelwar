# Project Task List

## Phase 1: Foundation & Setup
- [x] Initialize Monorepo (Turborepo)
- [x] Setup Development Environment (Docker, pnpm)
- [x] Configure Tailwind CSS & UI Components

## Phase 2: Frontend & Basic Backend
- [x] Implement Next.js Frontend (App Router)
- [x] Create Game UI (Canvas/Grid)
- [x] Setup Basic Node.js Server
- [x] Implement Basic WebSocket Communication (Socket.IO)
- [x] Integrate OnchainKit for Wallet Connection

## Phase 3: Gameplay Logic & Synchronization
- [x] Sync Game State between Client & Server
- [x] Implement "Hybrid" Validation Logic
- [x] Finalize Anti-Cheat Verification (Basic Validation Implemented)

## Phase 4: Smart Contract Integration
- [x] Deploy Escrow/Game Vault Contract to Base Sepolia
- [x] Implement `payoutWinner` function call from Server
- [x] Verify End-to-End Fund Flow (Deposit -> Play -> Payout)

## Phase 5: Database & State Management (Pending)
- [ ] **Integrate Redis**
    - [ ] Setup Redis verification in Docker
    - [ ] Implement Session Management via Redis
    - [ ] Cache Game State in Redis
- [ ] **Integrate TigerBeetle**
    - [ ] Setup TigerBeetle Cluster in Docker
    - [ ] Implement Ledger Client in Server
    - [ ] Define Account Codes & Transfer Types