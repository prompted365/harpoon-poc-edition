/**
 * Cloudflare Workers entry point with Durable Objects
 * Use this for production deployment
 */

import app from './index';

// Export agents for Durable Objects
export { default as MediatorAgent } from './agents/MediatorAgent';
export { default as OrchestratorAgent } from './agents/OrchestratorAgent';

// Export default app
export default app;
