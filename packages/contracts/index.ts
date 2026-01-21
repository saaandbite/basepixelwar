// packages/contracts/index.ts
// Native JSON imports with Import Attributes (Required by Node.js 22 ESM)

import TournamentMCLABI from './src/TournamentMCLABI.json' with { type: "json" };
import PixelTrophyABI from './src/PixelTrophyABI.json' with { type: "json" };
import GameVaultABI from './src/GameVaultABI.json' with { type: "json" };

export const TOURNAMENT_ABI = TournamentMCLABI;
export const PIXEL_TROPHY_ABI = PixelTrophyABI;
export const GAME_VAULT_ABI = GameVaultABI;
