import { Pixel, ColorID } from "@repo/shared";

const serverName: string = "TigerBeetle Game Engine";
console.log(`Starting ${serverName}...`);

// TEST DATA (Sesuai Type Definition terbaru)
const testPixel: Pixel = {
  x: 10,
  y: 20,
  c: ColorID.Bull,    // Gunakan Enum, bukan angka manual
  o: "0x123abc...",   // 'o' bukan 'owner'
  t: Date.now()       // 't' timestamp (wajib ada sekarang)
};

console.log("✅ Test Pixel Data Valid:", testPixel);

// Simulasi Server Loop agar process tidak langsung mati saat dev
setInterval(() => {
  // Keep alive
}, 10000);