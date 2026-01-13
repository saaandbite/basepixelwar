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

## Phase 5: Database & State Management (Approved Plan)
- [x] **Redis Persistence & Scaling**
    - [x] Migrate `RoomManager` to use Redis (async)
    - [x] Synchronize Global Matchmaking Queue in Redis
    - [x] Implement Game State Snapshots in Redis
    - [x] Create Leaderboard System using Redis Sorted Sets
- [x] **TigerBeetle Gameplay Integration**
    - [x] Implement Account-to-Wallet mapping logic
    - [x] Integrate transaction hooks for Ammo/Ink Bomb usage
    - [x] Implement Payout Settlement verification in TigerBeetle Ledger


Before Update Task.md.
# BasePixelWar: Bulls vs Bears (Development Task Board)

> **Mission:** Membangun *Real-Time Strategy Pixel War* tercepat di dunia menggunakan arsitektur Hybrid: **Base Blockchain** (Settlement) + **TigerBeetle** (Execution).

---

## Architecture Overview

Kita tidak membuat dApp biasa yang lambat. Kita membuat **Hybrid App**:
1.  **On-Chain (Base):** Hanya untuk Deposit (Beli Ammo) dan Withdraw (Klaim Hadiah). Aman, transparan.
2.  **Off-Chain (TigerBeetle):** Gameplay utama. 1 juta TPS. Instant. Gasless.
3.  **Bridge:** Backend server menjembatani Wallet User (0x...) dengan Ledger TigerBeetle (ID uint128) via Redis.

---

## The Squad & Roles

### 1. The Banker (Smart Contract)
* **Wilayah:** `packages/contracts`
* **Tools:** Solidity, Foundry.
* **Misi:**
    * Memastikan uang user aman di kontrak `GameVault`.
    * Menyediakan fungsi `payout` yang hanya bisa dieksekusi oleh Server di akhir ronde.
    * Optimasi Gas Fee (Base murah, tapi kita mau lebih murah).

### 2. The Engine (Backend Core)
* **Wilayah:** `apps/server`
* **Tools:** Node.js, TigerBeetle, Redis, Viem.
* **Misi:**
    * Menangani ribuan request klik per detik.
    * Mapping Address `0x...` ke TigerBeetle ID `123...` (via Redis).
    * Memastikan saldo (Ammo) dan Skor Faksi tercatat akurat di TigerBeetle (No Double Spending!).
    * Broadcast update pixel via WebSocket.

### 3. The Painter (Frontend & UX)
* **Wilayah:** `apps/web`
* **Tools:** Next.js, OnchainKit, HTML5 Canvas.
* **Misi:**
    * Integrasi Wallet (Login & Signing).
    * Rendering Canvas Grid @ 60FPS (Tanpa lag).
    * Optimistic UI: Klik dulu, update layar, baru tunggu server.
    * Visualisasi "Live War" yang estetik.

---

## Project Structure (Map)

Jangan salah kamar!

```text
basepixelwar/
├── apps/
│   ├── web/        --> Frontend (Next.js App Router)
│   └── server/     --> Backend (Node.js src/)
├── packages/
│   ├── contracts/  --> Solidity (Foundry)
│   └── shared/     --> KESEPAKATAN BERSAMA (Types.ts)