import { createServer } from 'node:http';
import { logger } from './log-rate-limiter.js';

/**
 * Simple HTTP health check server for deployment platforms
 * Responds to GET requests on /health with 200 OK
 */
export function startHealthCheckServer(port: number = 8080): void {
  const server = createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    logger.info(`Health check server listening on port ${port}`);
  });
}
