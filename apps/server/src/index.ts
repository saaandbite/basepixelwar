// apps/server/src/index.ts
// Main server entry point

import { createServer } from 'http';
import { initializeSocketServer } from './socketServer';
import { getStats } from './roomManager';
import * as dotenv from 'dotenv';
import path from 'path';
import { initRedis, closeRedis, isRedisConnected } from './redis';
import { initTigerBeetle, closeTigerBeetle } from './db';

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
  const httpServer = createServer((req, res) => {
    // Simple health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: isRedisConnected(),
        ...getStats()
      }));
      return;
    }

    // Stats endpoint
    if (req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStats()));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  // Initialize WebSocket server
  initializeSocketServer(httpServer);

  // Start listening
  httpServer.listen(PORT, () => {
    console.log('[Server] Server-Run');
    console.log(`[Server] WebSocket: ws://localhost:${PORT}`);
    console.log(`[Server] Health:    http://localhost:${PORT}/health`);
    console.log(`[Server] Stats:     http://localhost:${PORT}/stats`);
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