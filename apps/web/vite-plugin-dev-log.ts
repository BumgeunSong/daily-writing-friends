import type { Plugin, ViteDevServer } from 'vite';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Vite dev-log plugin for agent observability
 * Provides JSON-line logging endpoints during development
 */
export default function devLogPlugin(): Plugin {
  let logFilePath: string;

  return {
    name: 'dev-log',
    apply: 'serve', // Only apply in dev mode

    configureServer(server: ViteDevServer) {
      // Create .logs directory
      const logsDir = path.resolve(process.cwd(), '.logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Generate session log path
      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/T/, '-')
        .replace(/:/g, '')
        .slice(0, 17); // YYYY-MM-DD-HHmmss
      logFilePath = path.join(logsDir, `dev-${timestamp}.jsonl`);

      console.log(`[dev-log] Logging to: ${logFilePath}`);

      // POST /__dev/log - append log entry
      server.middlewares.use('/__dev/log', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            // Validate JSON
            JSON.parse(body);
            // Send response first (fire-and-forget pattern)
            res.statusCode = 204;
            res.end();
            // Append to JSONL file asynchronously
            fs.appendFile(logFilePath, body + '\n', 'utf-8', (err) => {
              if (err) console.error('[dev-log] Write error:', err);
            });
          } catch (error) {
            res.statusCode = 400;
            res.end('Invalid JSON');
          }
        });
      });

      // GET /__dev/logs/path - return log file path
      // NOTE: Must be registered BEFORE /__dev/logs (connect does prefix matching)
      server.middlewares.use('/__dev/logs/path', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(logFilePath);
      });

      // GET /__dev/logs - retrieve log entries
      server.middlewares.use('/__dev/logs', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        // Parse query params
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);

        // Read log file if exists
        if (!fs.existsSync(logFilePath)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end('[]');
          return;
        }

        try {
          const content = fs.readFileSync(logFilePath, 'utf-8');
          const lines = content.trim().split('\n').filter(Boolean);
          const lastN = lines.slice(-limit);
          const entries = lastN.map((line) => JSON.parse(line));

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(entries, null, 2));
        } catch (error) {
          res.statusCode = 500;
          res.end('Error reading log file');
        }
      });
    },
  };
}
