/**
 * Standalone Hono server for local development (without wrangler)
 * Uses @hono/node-server for Node.js compatibility
 */

import { serve } from '@hono/node-server';
import app from './src/index';
import type { Env } from './src/types';

// Load environment variables from .dev.vars
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envVars: Record<string, string> = {};

try {
  const envFile = readFileSync(join(__dirname, '.dev.vars'), 'utf8');
  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        const value = valueParts.join('=').trim();
        envVars[key.trim()] = value;
        process.env[key.trim()] = value;
      }
    }
  });
  console.log('✅ Loaded environment variables from .dev.vars');
  console.log(`   - CLOUDFLARE_ACCOUNT_ID: ${envVars.CLOUDFLARE_ACCOUNT_ID ? '✓' : '✗'}`);
  console.log(`   - AI_GATEWAY_ID: ${envVars.AI_GATEWAY_ID ? '✓' : '✗'}`);
  console.log(`   - GROQ_API_KEY: ${envVars.GROQ_API_KEY ? '✓' : '✗'}`);
  console.log(`   - OPENAI_API_KEY: ${envVars.OPENAI_API_KEY ? '✓' : '✗'}`);
} catch (error) {
  console.error('❌ Could not load .dev.vars file:', error);
}

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Harpoon v2 starting on http://0.0.0.0:${port}`);

// Create a wrapped fetch that injects environment
const wrappedFetch = (request: Request, env?: any, ctx?: any) => {
  // Inject loaded env vars into the Hono context
  const mockEnv: Env = {
    AI: null, // Mock AI binding (not used in Node server)
    CLOUDFLARE_ACCOUNT_ID: envVars.CLOUDFLARE_ACCOUNT_ID || '',
    AI_GATEWAY_ID: envVars.AI_GATEWAY_ID || '',
    AI_GATEWAY_TOKEN: envVars.AI_GATEWAY_TOKEN || '',
    WORKERS_AI_TOKEN: envVars.WORKERS_AI_TOKEN || '',
    GROQ_API_KEY: envVars.GROQ_API_KEY || '',
    OPENAI_API_KEY: envVars.OPENAI_API_KEY || '',
    AI_GATEWAY_BASE_URL: envVars.AI_GATEWAY_BASE_URL || '',
    GROQ_GATEWAY_URL: envVars.GROQ_GATEWAY_URL || '',
    OPENAI_GATEWAY_URL: envVars.OPENAI_GATEWAY_URL || ''
  };
  
  return app.fetch(request, mockEnv, ctx);
};

serve({
  fetch: wrappedFetch,
  port,
  hostname: '0.0.0.0'
});
