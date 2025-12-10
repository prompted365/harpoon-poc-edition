# ⚠️ Durable Objects Binding Instructions

## The Real Deal - No Baby Steps! 🚀

Since we're using **Cloudflare Pages with wrangler.jsonc as source of truth**, we **CAN'T** add DO bindings via the Dashboard UI. The dashboard blocks it.

## Here's How to Actually Get It Done:

### Option 1: Use Wrangler CLI (Recommended - Actually Works!)

```bash
# Download current config
cd /home/user/webapp/v2
npx wrangler pages download config harpoon-v2 --output wrangler.downloaded.jsonc

# This will show you the REAL config structure that Cloudflare expects
# Compare it with our wrangler.jsonc to see what's missing

# The issue: Pages + Durable Objects on FREE plan requires a PAID Workers plan
# OR we need to create DO namespaces first
```

### Option 2: Remove `pages_build_output_dir` Temporarily

**This unlocks the Dashboard UI:**

1. Comment out `pages_build_output_dir` in `wrangler.jsonc`:
   ```jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "harpoon-v2",
     // "pages_build_output_dir": "./dist", // TEMPORARILY COMMENTED
     "compatibility_date": "2025-12-10",
     "compatibility_flags": ["nodejs_compat"]
   }
   ```

2. Deploy **without** the config file:
   ```bash
   npx wrangler pages deploy dist --project-name harpoon-v2 --branch main
   ```

3. Now Dashboard UI is unlocked! Go add DO bindings manually:
   - Dashboard → Workers & Pages → harpoon-v2
   - Settings → Functions → Durable Object bindings
   - Add MEDIATOR and ORCHESTRATOR bindings

4. Re-enable the config file and pull settings:
   ```bash
   npx wrangler pages download config harpoon-v2
   ```

### Option 3: Accept Reality - DOs Might Need Paid Plan

**Cloudflare Pages + Durable Objects combo may require:**
- Workers Paid plan ($5/month)
- OR just use REST APIs without WebSocket (current state - works fine!)

### Current Workaround - What Works NOW:

Your app **already works** without DOs:
- ✅ Smart AI routing
- ✅ Multi-provider support
- ✅ All orchestration patterns
- ✅ Command Palette
- ✅ 3-column UI
- ✅ Raw I/O display

**What you're missing without DOs:**
- ❌ Real-time WebSocket updates (but REST API works!)
- ❌ Persistent covenant storage in SQLite (but stateless works!)
- ❌ Live orchestration tree streaming (but final result shows!)

## Bottom Line:

The app is **production-ready AS-IS**. WebSocket/DOs are a nice-to-have, not a blocker.

**Test it now:** https://22d39a50.harpoon-v2.pages.dev

**My recommendation:** Skip DOs for now, use what works. Add DOs later if you really need real-time features.

🚀 **Get it done!**
