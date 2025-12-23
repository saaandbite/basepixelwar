// packages/shared/src/types.ts

// 1. Definisi Warna (Hemat bandwidth dengan ID)
// 0=Kosong, 1=Bull(Hijau), 2=Bear(Merah)
export enum ColorID {
  Empty = 0,
  Bull = 1,
  Bear = 2
}

// 2. Struktur Pixel Utama
export type Pixel = {
  x: number;       // Koordinat X (0-500)
  y: number;       // Koordinat Y (0-500)
  c: ColorID;      // Warna (Singkat 'c' agar hemat)
  o: string;       // Owner Address (Singkat 'o')
  t: number;       // Timestamp update terakhir
};

// 3. Pesan WebSocket (Server -> Client)
export type ServerMessage = 
  | { type: 'INIT'; grid: Pixel[] }        // Saat user baru masuk
  | { type: 'UPDATE'; pixel: Pixel }       // Saat ada pixel berubah
  | { type: 'STATS'; bulls: number; bears: number }; // Live score

// 4. Request User (Client -> Server)
// Ini data yang akan ditandatangani user (EIP-712)
export type PaintRequest = {
  x: number;
  y: number;
  color: ColorID;
  timestamp: number;
  signature: string; // Bukti otentikasi
};

// 5. Konstanta Game
export const GAME_CONFIG = {
  GRID_SIZE: 100,      // Kita mulai kecil dulu (100x100)
  COST_PER_PIXEL: 1n,  // 1 Ammo per pixel
  BULL_FACTION_ID: 10n,
  BEAR_FACTION_ID: 20n
};