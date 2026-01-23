// apps/server/src/index.ts
// Main server entry point

import { createServer } from 'http';
import { initializeSocketServer } from './socketServer';
import { getStats } from './roomManager';
import * as dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { initRedis, closeRedis, isRedisConnected, getLeaderboard } from './redis';
import { initTigerBeetle, closeTigerBeetle } from './db';
import { initTournamentScheduler } from './tournamentScheduler';

// Setup timestamped logging
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const getTimestamp = () => {
  const now = new Date();
  return `[${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
};

console.log = (...args) => originalLog(getTimestamp(), ...args);
console.error = (...args) => originalError(getTimestamp(), ...args);
console.warn = (...args) => originalWarn(getTimestamp(), ...args);

// Load environment variables from specific path (root .env)
const envPath = path.resolve(__dirname, '../../../.env');
console.log(`[Server] Loading config from: ${envPath}`);
dotenv.config({ path: envPath });

// Try default load if above failed or for other vars
dotenv.config();



// Async initialization
async function main() {
  console.log('[Server] Initializing services...');

  // Initialize database connections
  try {
    // Initialize Redis (required for wallet mapping)
    await initRedis();
    // Flush stale matchmaking queue on startup to prevent zombie players
    const { clearMatchmakingQueue } = await import('./redis.js');
    await clearMatchmakingQueue();
  } catch (err) {
    console.warn('[Server] ⚠️ Redis connection failed, continuing without Redis');
    console.warn('[Server] Run `pnpm db:start` to start Docker services');
  }

  try {
    // Initialize TigerBeetle (required for financial ledger)
    await initTigerBeetle();
  } catch (err) {
    console.warn('[Server] ⚠️ TigerBeetle connection failed, continuing without TigerBeetle');
    console.warn('[Server] Run `pnpm db:start` to start Docker services');
  }

  // Initialize contract service after env vars are loaded
  const { contractService } = await import('./contractService.js');
  contractService.initialize();

  // Verify signer matches contract (detects config issues early)
  contractService.verifySigner().then((result: { isMatch: boolean; serverAddress: string; contractSigner: string } | null) => {
    if (result && !result.isMatch) {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(' CRITICAL: Backend wallet does NOT match contract backendSigner!');
      console.error(' Prize distributions will FAIL until this is fixed.');
      console.error(`   Server Wallet:     ${result.serverAddress}`);
      console.error(`   Contract Signer:   ${result.contractSigner}`);
      console.error('═══════════════════════════════════════════════════════════════');
    }
  });

  // Initialize tournament scheduler for automatic week transitions
  // This enables players to claim rewards after tournament ends
  await initTournamentScheduler();

  const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    // Simple health check endpoint
    if (req.url === '/health') {
      const stats = await getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: isRedisConnected(),
        ...stats
      }));
      return;
    }

    // Stats endpoint
    if (req.url === '/stats') {
      const stats = await getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      return;
    }

    // Leaderboard endpoint
    // Format: /leaderboard?type=wins or /leaderboard?type=eth
    if (req.url && req.url.startsWith('/leaderboard')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const type = url.searchParams.get('type');

      if (type === 'wins' || type === 'eth') {
        try {
          const { getUsername, formatWalletAddress } = await import('./redis.js');
          const data = await getLeaderboard(type as 'wins' | 'eth');

          // Enrich data with usernames and formatted wallets
          const enrichedData = await Promise.all(
            data.map(async (entry) => ({
              wallet: entry.wallet,
              walletFormatted: formatWalletAddress(entry.wallet),
              username: await getUsername(entry.wallet) || 'Anonymous',
              score: entry.score
            }))
          );

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(enrichedData));
        } catch (error) {
          console.error('[Server] Leaderboard error:', error);
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid type. Use "wins" or "eth"' }));
      }
      return;
    }

    // Profile endpoint
    if (req.method === 'GET' && req.url && req.url.startsWith('/api/profile')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const wallet = url.searchParams.get('wallet');
      const type = url.searchParams.get('type'); // 'tournament' | 'global'

      if (!wallet) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing wallet parameter' }));
        return;
      }

      try {
        const { getUsername, getPlayerStats, getTournamentPlayerStats } = await import('./redis.js');
        const username = await getUsername(wallet);

        let stats;
        if (type === 'tournament') {
          stats = await getTournamentPlayerStats(wallet);
        } else {
          stats = await getPlayerStats(wallet);
        }

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          wallet,
          username: username || `Player ${wallet.slice(0, 6)}...`,
          stats
        }));

      } catch (error: any) {
        console.error('[Server] Profile error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Tournament endpoints
    if (req.method === 'POST' && req.url === '/api/tournament/join') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { walletAddress, week, txHash } = JSON.parse(body);

          if (!walletAddress || !week || !txHash) {
            console.warn('[Server] Tournament join missing fields');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
          }

          const maskWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
          console.log(`[Server] Tournament Join Request: ${maskWallet} (Week ${week})`);

          const { joinTournament } = await import('./tournamentManager.js');
          const result = await joinTournament(walletAddress, Number(week), txHash);

          console.log(`[Server] Tournament Join Processed: ${maskWallet} -> Room ${result.roomId} (New: ${result.isNew})`);

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(result));
        } catch (error: any) {
          console.error('[Server] Tournament join error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message || 'Server error' }));
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url && req.url.startsWith('/api/tournament/room')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const week = url.searchParams.get('week');
      const roomId = url.searchParams.get('roomId');
      const wallet = url.searchParams.get('wallet');
      const maskWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'N/A';

      console.log(`[Server] API Request: GET /api/tournament/room (Week: ${week}, Room: ${roomId}, Wallet: ${maskWallet})`);

      try {
        const { getRoomPlayers, getPlayerRoom } = await import('./tournamentManager.js');

        let resultData: any = {};

        // Scenario 1: Get specific room
        if (week && roomId) {
          resultData.players = await getRoomPlayers(Number(week), Number(roomId));
        }
        // Scenario 2: Get room by wallet
        else if (wallet) {
          const location = await getPlayerRoom(wallet);
          if (location) {
            resultData.location = location;
            resultData.players = await getRoomPlayers(location.week, location.roomId);
          } else {
            resultData.location = null;
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing week+roomId OR wallet params' }));
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(resultData));

      } catch (error: any) {
        console.error('[Server] Tournament room error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Tournament Rooms List Endpoint - Get all rooms for a week
    if (req.method === 'GET' && req.url && req.url.startsWith('/api/tournament/rooms')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const weekParam = url.searchParams.get('week');

      try {
        const { getTournamentStatus } = await import('./tournamentConfig.js');
        const { getRedis } = await import('./redis.js');
        const r = getRedis();

        // Use week from param or from current tournament
        const week = weekParam ? Number(weekParam) : getTournamentStatus().week;

        // Get total player count for the week
        const playerCountKey = `tournament:${week}:player_count`;
        const totalPlayers = Number(await r.get(playerCountKey) || 0);
        const totalRooms = totalPlayers > 0 ? Math.ceil(totalPlayers / 10) : 0;

        // Build room list with player counts
        const rooms: { roomId: number; playerCount: number }[] = [];
        for (let roomId = 1; roomId <= totalRooms; roomId++) {
          const roomKey = `tournament:${week}:room:${roomId}`;
          const playerCount = await r.llen(roomKey);
          rooms.push({ roomId, playerCount });
        }

        console.log(`[Server] Tournament Rooms: Week ${week}, ${totalRooms} rooms, ${totalPlayers} players`);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          week,
          totalPlayers,
          totalRooms,
          rooms
        }));
      } catch (error: any) {
        console.error('[Server] Tournament rooms error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Tournament Status Endpoint
    if (req.method === 'GET' && req.url === '/api/tournament/status') {
      try {
        const { getTournamentStatus } = await import('./tournamentConfig.js');
        const status = getTournamentStatus();

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(status));
      } catch (error: any) {
        console.error('[Server] Tournament status error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Tournament Sync Endpoint - Recover player data from smart contract
    if (req.method === 'GET' && req.url && req.url.startsWith('/api/tournament/sync')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const wallet = url.searchParams.get('wallet');
      const weekParam = url.searchParams.get('week');

      if (!wallet) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing wallet parameter' }));
        return;
      }

      const maskWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
      console.log(`[Server] Sync Request: Wallet=${maskWallet}, Week=${weekParam || 'auto'}`);

      try {
        const { contractService } = await import('./contractService.js');
        const { getRedis } = await import('./redis.js');

        // Get week from param or from smart contract
        let week: number;
        if (weekParam) {
          week = Number(weekParam);
        } else {
          const chainWeek = await contractService.getCurrentWeekFromChain();
          if (!chainWeek) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Could not get current week from chain' }));
            return;
          }
          week = chainWeek;
        }

        // Read player info from smart contract
        const playerInfo = await contractService.getPlayerInfoFromChain(wallet, week);

        if (!playerInfo || playerInfo.roomId === 0) {
          console.log(`[Server] Sync: Player ${maskWallet} not found on-chain for Week ${week}`);
          res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({
            error: 'Player not registered on-chain for this week',
            week,
            wallet: maskWallet
          }));
          return;
        }

        // Save to Redis
        const r = getRedis();
        const TOURNAMENT_PLAYER_KEY = `tournament:player:${wallet.toLowerCase()}`;
        const location = { week, roomId: playerInfo.roomId };
        await r.set(TOURNAMENT_PLAYER_KEY, JSON.stringify(location));

        // Also add to room list if not exists
        const TOURNAMENT_ROOM_KEY = `tournament:${week}:room:${playerInfo.roomId}`;
        const existingPlayers = await r.lrange(TOURNAMENT_ROOM_KEY, 0, -1);
        const alreadyInRoom = existingPlayers.some(p => {
          try {
            const parsed = JSON.parse(p);
            return parsed.walletAddress?.toLowerCase() === wallet.toLowerCase();
          } catch { return false; }
        });

        if (!alreadyInRoom) {
          const playerEntry = {
            walletAddress: wallet.toLowerCase(),
            joinedAt: Date.now(),
            txHash: 'synced-from-chain'
          };
          await r.rpush(TOURNAMENT_ROOM_KEY, JSON.stringify(playerEntry));
          console.log(`[Server] Sync: Added ${maskWallet} to Room ${playerInfo.roomId} list`);
        }

        console.log(`[Server] Sync SUCCESS: ${maskWallet} -> Week ${week} Room ${playerInfo.roomId}`);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success: true,
          synced: true,
          week,
          roomId: playerInfo.roomId,
          score: playerInfo.score,
          hasClaimed: playerInfo.hasClaimed
        }));

      } catch (error: any) {
        console.error('[Server] Tournament sync error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Manual Score Sync Endpoint - Force sync tournament scores to blockchain
    // POST /api/tournament/force-sync?week=1
    if (req.method === 'POST' && req.url && req.url.startsWith('/api/tournament/force-sync')) {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const weekParam = urlObj.searchParams.get('week');

      if (!weekParam) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing week parameter' }));
        return;
      }

      const week = Number(weekParam);
      console.log(`[Server] Manual score sync requested for Week ${week}`);

      try {
        const { syncAllScoresToChain } = await import('./tournamentScheduler.js');
        const success = await syncAllScoresToChain(week);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success,
          week,
          message: success ? 'Scores synced to blockchain successfully!' : 'No scores to sync or sync failed'
        }));
      } catch (error: any) {
        console.error('[Server] Force sync error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Global CORS preflight handler
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  // Initialize WebSocket server
  initializeSocketServer(httpServer);

  // Start listening
  httpServer.listen(PORT, () => {
    console.log('[Server] Server running');

    // Find local IP addresses
    const nets = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]!) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address);
        }
      }
    }

    console.log(`[Server] Local:     http://localhost:${PORT}`);
    console.log(`[Server] Health:    http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Server] Shutting down...');

    // 1. Close HTTP/Socket Server FIRST
    // This stops new connections and handles existing ones (depending on config)
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        console.log('[Server] HTTP/Socket Server closed');
        resolve();
      });

      // Force close any existing sockets if needed
      // io.close() // already handled by httpServer.close() usually, but explicit io.disconnectSockets() is safer if needed
      const { getIO } = require('./socketServer');
      const io = getIO();
      if (io) {
        io.disconnectSockets(true); // Force disconnect all clients
        console.log('[Server] Forced disconnect of all sockets');
      }
    });

    // 2. Close Database Connections
    // Now safe to close because no clients can trigger DB ops
    await closeRedis();
    await closeTigerBeetle();

    console.log('[Server] Closed');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Run main
main().catch(err => {
  console.error('[Server] Fatal error during startup:', err);
  process.exit(1);
});