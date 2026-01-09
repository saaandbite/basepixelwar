// apps/server/src/index.ts
// Main server entry point

import { createServer } from 'http';
import { initializeSocketServer } from './socketServer';
import { getStats } from './roomManager';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from specific path (root .env)
const envPath = path.resolve(__dirname, '../../../.env');
console.log(`[Server] Loading config from: ${envPath}`);
dotenv.config({ path: envPath });

// Try default load if above failed or for other vars
dotenv.config();

// Initialize services after env vars are loaded
import { contractService } from './contractService';
contractService.initialize();

// Verify signer matches contract (detects config issues early)
contractService.verifySigner().then(result => {
  if (result && !result.isMatch) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error(' CRITICAL: Backend wallet does NOT match contract backendSigner!');
    console.error(' Prize distributions will FAIL until this is fixed.');
    console.error(`   Server Wallet:     ${result.serverAddress}`);
    console.error(`   Contract Signer:   ${result.contractSigner}`);
    console.error('═══════════════════════════════════════════════════════════════');
  }
});

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer((req, res) => {
  // Simple health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
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
  console.log(`[Server] Server-Run`);
  console.log(`[Server] WebSocket: ws://localhost:${PORT}`); // WebSocket endpoint
  console.log(`[Server] Health:    http://localhost:${PORT}/health`); // Health check endpoint
  console.log(`[Server] Stats:     http://localhost:${PORT}/stats`); // Stats endpoint
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...');
  httpServer.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});