# ⚔️ BasePixelWar: Bulls vs Bears (Development Task Board)

> **Mission:** Membangun *Real-Time Strategy Pixel War* tercepat di dunia menggunakan arsitektur Hybrid: **Base Blockchain** (Settlement) + **TigerBeetle** (Execution).

---

## 🏗️ Architecture Overview

Kita tidak membuat dApp biasa yang lambat. Kita membuat **Hybrid App**:
1.  **On-Chain (Base):** Hanya untuk Deposit (Beli Ammo) dan Withdraw (Klaim Hadiah). Aman, transparan.
2.  **Off-Chain (TigerBeetle):** Gameplay utama. 1 juta TPS. Instant. Gasless.
3.  **Bridge:** Backend server menjembatani Wallet User (0x...) dengan Ledger TigerBeetle (ID uint128) via Redis.

---

## 👥 The Squad & Roles

### 1. 🏛️ The Banker (Smart Contract)
* **Wilayah:** `packages/contracts`
* **Tools:** Solidity, Foundry.
* **Misi:**
    * Memastikan uang user aman di kontrak `GameVault`.
    * Menyediakan fungsi `payout` yang hanya bisa dieksekusi oleh Server di akhir ronde.
    * Optimasi Gas Fee (Base murah, tapi kita mau lebih murah).

### 2. ⚙️ The Engine (Backend Core)
* **Wilayah:** `apps/server`
* **Tools:** Node.js, TigerBeetle, Redis, Viem.
* **Misi:**
    * Menangani ribuan request klik per detik.
    * Mapping Address `0x...` ke TigerBeetle ID `123...` (via Redis).
    * Memastikan saldo (Ammo) dan Skor Faksi tercatat akurat di TigerBeetle (No Double Spending!).
    * Broadcast update pixel via WebSocket.

### 3. 🎨 The Painter (Frontend & UX)
* **Wilayah:** `apps/web`
* **Tools:** Next.js, OnchainKit, HTML5 Canvas.
* **Misi:**
    * Integrasi Wallet (Login & Signing).
    * Rendering Grid 500x500 @ 60FPS (Tanpa lag).
    * Optimistic UI: Klik dulu, update layar, baru tunggu server.
    * Visualisasi "Live War" yang estetik.

---

## 🗺️ Project Structure (Map)

Jangan salah kamar!

```text
basepixelwar/
├── apps/
│   ├── web/        --> 🎨 Frontend (Next.js App Router)
│   └── server/     --> ⚙️ Backend (Node.js src/)
├── packages/
│   ├── contracts/  --> 🏛️ Solidity (Foundry)
│   └── shared/     --> 🤝 KESEPAKATAN BERSAMA (Types.ts)