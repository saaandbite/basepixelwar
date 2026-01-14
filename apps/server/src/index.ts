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
          const data = await getLeaderboard(type as 'wins' | 'eth');
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(data));
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

    // Deposit recording endpoint
    if (req.method === 'POST' && req.url === '/api/deposit') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { walletAddress, amount, txHash } = JSON.parse(body);

          // Validate inputs
          if (!walletAddress || !amount) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields: walletAddress and amount' }));
            return;
          }

          // Validate wallet address format
          if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid wallet address format' }));
            return;
          }

          console.log(`[Server] Recording deposit: ${amount} wei from ${walletAddress}`);

          // Record deposit to TigerBeetle
          const { recordDeposit } = await import('./db.js');
          const transferId = await recordDeposit(
            walletAddress,
            BigInt(amount),
            txHash
          );

          console.log(`[Server] ✅ Deposit recorded successfully. Transfer ID: ${transferId}`);

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({
            success: true,
            transferId: transferId.toString(),
            message: 'Deposit recorded successfully'
          }));
        } catch (error: any) {
          console.error('[Server] ❌ Deposit recording error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: error.message || 'Internal Server Error'
          }));
        }
      });
      return;
    }

    // Handle CORS preflight for deposit endpoint
    if (req.method === 'OPTIONS' && req.url === '/api/deposit') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    console.log('[Server] 🚀 Server-Run');

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

    // Close database connections
    await closeRedis();
    await closeTigerBeetle();

    httpServer.close(() => {
      console.log('[Server] Closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Run main
main().catch(err => {
  console.error('[Server] Fatal error during startup:', err);
  process.exit(1);
});