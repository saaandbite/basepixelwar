// apps/server/src/index.ts
// Main server entry point

import { createServer } from 'http';
import { initializeSocketServer } from './socketServer';
import { getStats } from './roomManager';

const PORT = process.env.PORT || 3002;

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
  console.log('═══════════════════════════════════════════');
  console.log('  🎮 Chroma Duel PvP Server');
  console.log('═══════════════════════════════════════════');
  console.log(`  📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`  🔗 Health:    http://localhost:${PORT}/health`);
  console.log(`  📊 Stats:     http://localhost:${PORT}/stats`);
  console.log('═══════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...');
  httpServer.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});