/**
 * Standalone Hono server for local development (without wrangler)
 * Uses @hono/node-server for Node.js compatibility
 */

import { serve } from '@hono/node-server';
import app from './src/index';

// Load environment variables from .dev.vars
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envFile = readFileSync(join(__dirname, '.dev.vars'), 'utf8');
  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
} catch (error) {
  console.warn('Could not load .dev.vars file');
}

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Harpoon v2 starting on http://0.0.0.0:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0'
});
