# 🚀 Harpoon v2 - Quick Reference Card

## 🌐 URLs

| Environment | URL |
|-------------|-----|
| **Production** | https://harpoon-v2.pages.dev |
| **Local Dev** | http://localhost:3000 |
| **GitHub** | https://github.com/prompted365/harpoon-poc-edition |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `Esc` | Close command palette |
| `Enter` | Send message / Execute command |
| `Shift+Enter` | New line in chat input |
| `↑` / `↓` | Navigate command palette (when open) |

## 🖱️ UI Interactions

### Orchestration Tree
- **Click ▶/▼ header** → Expand/collapse section (Mediator/Orchestrator)
- **Click ▶/▼ agent** → Expand/collapse agent details (thoughts/actions/outputs)
- **Click agent card** → Toggle expanded state

### Sidebar
- **Drag left edge** → Resize sidebar (300-800px)
- **Hover left edge** → Show purple resize handle

### Command Palette (⌘K)
- **New Covenant** → Start fresh orchestration
- **Show Insights** → Toggle system insights panel
- **Force Full Orchestration** → Use dual orchestrator for next query
- **Mediator Only** → Fast path (skip orchestrator)
- **Clear History** → Reset conversation
- **Export Covenant** → Download current covenant JSON

## 🎯 Demo Queries

### Simple (Fast Path - Mediator Only)
```
What is 2+2?
Translate 'hello' to Spanish
Who invented the telephone?
```

### Complex (Full Orchestration - Dual Orchestrator)
```
Plan a detailed 3-day Tokyo itinerary with budget breakdown
Analyze the pros and cons of remote work and create a comprehensive report
Design a marketing campaign for a new eco-friendly product launch
```

## 📊 Orchestration Tree States

| State | Icon | Color | Description |
|-------|------|-------|-------------|
| **Pending** | ⏸️ | Gray | Waiting to execute |
| **Running** | ▶️ | Blue (pulsing) | Currently executing |
| **Completed** | ✅ | Green | Finished successfully |

## 🧩 Agent Detail Components

When you expand an agent (click ▶), you'll see:

### 💭 Thoughts
Agent's internal reasoning and planning
```
"Starting classifier: Analyze task requirements"
"Spawning parallel sub-agents..."
"All parallel sub-agents completed"
```

### ⚡ Actions
Step-by-step execution log
```
• Initializing
• Loading context
• Processing
• Executing task
• Merging results
```

### 📤 Output
Final result or artifact
```
"Response generated"
"Analyze task requirements complete"
"Result 1" (for parallel tasks)
```

## 📜 Covenant Card

Shows real-time orchestration contract:

| Field | Description |
|-------|-------------|
| **Covenant ID** | Unique identifier (timestamp) |
| **Status** | Draft → Active → Completed |
| **Intent** | User's goal/query |
| **Max Cost** | Budget constraint ($0.01) |
| **Max Latency** | Time limit (5000ms) |
| **Min Quality** | Quality threshold (8.0/10) |
| **Mediator Decision** | Routing choice + reasoning |
| **Orchestration Plan** | Sub-agent workflow (if full orchestration) |

## 🔄 Orchestration Flow

### Fast Path (Simple Query)
```
User Query
  ↓
Mediator (analyzes complexity)
  ↓
Mediator Sub-Agents [classifier, executor]
  ↓
Response (~200ms)
```

### Full Orchestration (Complex Query)
```
User Query
  ↓
Mediator (analyzes complexity → high)
  ↓
Mediator → Orchestrator (delegation)
  ↓
Orchestrator Sub-Agents:
  • Classifier (analyze requirements)
  • Router (select models)
  • Executor [3 parallel] (execute sub-tasks)
  • Evaluator (assess quality)
  • Coordinator (synthesize)
  ↓
Response (~3-5s)
```

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: "⚓ Harpoon v2 - Dual Orchestrator Demo" [⌘K]      │
├──────────────────────────────┬──────────────────────────────┤
│                              │ 📜 Active Covenant           │
│   Chat Interface             │ ┌──────────────────────────┐ │
│   ┌────────────────────────┐ │ │ COVENANT #... [ACTIVE]   │ │
│   │ 👤 User: test          │ │ │ Intent: test             │ │
│   │ 04:13 AM               │ │ │ Max Cost: $0.0100       │ │
│   │                        │ │ │ Max Latency: 5000ms     │ │
│   │ 🤖 Assistant: ...      │ │ │ Min Quality: 8/10       │ │
│   │ ⚡ 200ms 💰 $0.00001   │ │ │ Mediator Decision: ...   │ │
│   └────────────────────────┘ │ └──────────────────────────┘ │
│                              │                              │
│   [Input box]                │ 🌳 Orchestration Tree        │
│   [Send →]                   │ ┌──────────────────────────┐ │
│                              │ │ ▼ 👤 Mediator (2 tasks)  │ │
│                              │ │   ▼ classifier [✅]      │ │
│                              │ │     💭 Thoughts          │ │
│                              │ │     ⚡ Actions           │ │
│                              │ │     📤 Output            │ │
│                              │ │   ▶ executor [▶️]        │ │
│                              │ └──────────────────────────┘ │
│                              │ [Resize handle] ←──────────→ │
└──────────────────────────────┴──────────────────────────────┘
```

## 🛠️ Developer Commands

### Local Development
```bash
cd /home/user/webapp/v2
npm run build
pm2 restart harpoon-v2
open http://localhost:3000
```

### Production Deployment
```bash
cd /home/user/webapp/v2
npm run build
npx wrangler pages deploy dist --project-name harpoon-v2
```

### PM2 Management
```bash
pm2 list                      # List all services
pm2 logs harpoon-v2 --nostream # View logs
pm2 restart harpoon-v2        # Restart service
pm2 delete harpoon-v2         # Remove from PM2
```

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/models` | GET | Available AI models |
| `/api/route` | POST | Smart routing decision |
| `/api/chat` | POST | Basic chat completion |
| `/api/orchestrate/smart` | POST | Smart routing pattern |
| `/api/orchestrate/parallel` | POST | Parallelization pattern |
| `/api/orchestrate/workers` | POST | Orchestrator-workers pattern |
| `/api/orchestrate/optimize` | POST | Evaluator-optimizer pattern |

## 🎬 Quick Demo Script

1. **Open app**: https://harpoon-v2.pages.dev
2. **Press ⌘K**: Show command palette
3. **Type simple query**: "What is 2+2?" → Fast path
4. **Click ▶ classifier**: Show detailed thoughts/actions
5. **Type complex query**: "Plan a Tokyo trip" → Full orchestration
6. **Watch agents spawn**: Progressive batch chunks
7. **Expand Orchestrator**: See all 5 agents + parallel executors
8. **Drag sidebar edge**: Demonstrate resizable UI
9. **Highlight covenant**: Show Mediator → Orchestrator delegation

## 🚨 Troubleshooting

### Issue: Styles not loading
**Solution**: Check `/static/styles.css` URL, rebuild with `npm run build`

### Issue: API errors
**Solution**: Add API keys to `.dev.vars` (see `API_KEYS_SETUP.md`)

### Issue: Agents not expanding
**Solution**: Click ▶ icon (not just card body), ensure JavaScript loaded

### Issue: Sidebar not resizing
**Solution**: Drag the left edge (not right), look for purple handle on hover

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `PHASE3_FULL_COMPLETE.md` | Comprehensive Phase 3 features |
| `PHASE3_UI_COMPLETE.md` | Initial UI design |
| `PHASE2.5_COMPLETE.md` | Orchestration patterns |
| `API_KEYS_SETUP.md` | Authentication setup |
| `README.md` | Project overview |
| `QUICK_REFERENCE.md` | This document |

## 🎉 Success Indicators

✅ **Working correctly if you see:**
- Collapsible ▶/▼ headers
- Agent details expand on click
- Sidebar resizes when dragging left edge
- Covenant updates when Mediator delegates
- Agents spawn progressively (batch chunks)
- Progress bars animate smoothly
- Status badges change color (gray → blue → green)

---

**Need help?** Check full documentation in `PHASE3_FULL_COMPLETE.md`  
**Report issues:** https://github.com/prompted365/harpoon-poc-edition/issues  
**Live demo:** https://harpoon-v2.pages.dev
