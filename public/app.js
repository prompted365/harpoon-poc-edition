/**
 * Harpoon v2 - Command Palette + Dual Orchestrator UI
 * Minimal, space-conscious design with progressive disclosure
 */

// ==========================================
// STATE MANAGEMENT
// ==========================================

const state = {
  covenant: null,
  messages: [],
  orchestration: {
    active: false,
    mediator: { status: 'idle', tasks: [] },
    orchestrator: { status: 'idle', subAgents: [] },
    tree: []
  },
  commandPaletteOpen: false,
  insightsExpanded: false,
  expandedAgents: new Set(), // Track which agents are expanded
  sidebarWidth: 400, // Resizable sidebar width
  ws: {
    mediator: null,
    orchestrator: null,
    connected: false
  },
  userId: `user-${Date.now()}` // Unique user ID for DO isolation
};

// ==========================================
// COMMAND PALETTE
// ==========================================

function initCommandPalette() {
  // Cmd+K or Ctrl+K to open
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    }
    if (e.key === 'Escape' && state.commandPaletteOpen) {
      toggleCommandPalette();
    }
  });
}

function toggleCommandPalette() {
  state.commandPaletteOpen = !state.commandPaletteOpen;
  const palette = document.getElementById('commandPalette');
  const overlay = document.getElementById('paletteOverlay');
  
  if (state.commandPaletteOpen) {
    palette.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.getElementById('paletteInput').focus();
  } else {
    palette.classList.add('hidden');
    overlay.classList.add('hidden');
  }
}

const commands = [
  { id: 'new-covenant', icon: '📜', label: 'New Covenant', desc: 'Start a new AI orchestration', action: () => startNewCovenant() },
  { id: 'show-insights', icon: '🔍', label: 'Show Insights', desc: 'View orchestration details', action: () => toggleInsights() },
  { id: 'force-orchestration', icon: '🎭', label: 'Force Full Orchestration', desc: 'Use dual orchestrator for next request', action: () => setMode('full') },
  { id: 'mediator-only', icon: '⚡', label: 'Mediator Only', desc: 'Skip orchestrator, use mediator sub-agents', action: () => setMode('fast') },
  { id: 'clear-history', icon: '🗑️', label: 'Clear History', desc: 'Reset conversation', action: () => clearHistory() },
  { id: 'export-covenant', icon: '💾', label: 'Export Covenant', desc: 'Download current covenant', action: () => exportCovenant() }
];

function renderCommandPalette() {
  const searchTerm = document.getElementById('paletteInput').value.toLowerCase();
  const filtered = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(searchTerm) || 
    cmd.desc.toLowerCase().includes(searchTerm)
  );
  
  const list = document.getElementById('commandList');
  list.innerHTML = filtered.map((cmd, i) => `
    <div class="palette-item ${i === 0 ? 'selected' : ''}" data-cmd="${cmd.id}" onclick="executeCommand('${cmd.id}')">
      <span class="text-2xl">${cmd.icon}</span>
      <div class="flex-1">
        <div class="font-semibold text-white">${cmd.label}</div>
        <div class="text-xs text-gray-400">${cmd.desc}</div>
      </div>
      <kbd class="px-2 py-1 bg-gray-700 rounded text-xs">↵</kbd>
    </div>
  `).join('');
}

function executeCommand(cmdId) {
  const cmd = commands.find(c => c.id === cmdId);
  if (cmd) {
    cmd.action();
    toggleCommandPalette();
    showToast(`${cmd.icon} ${cmd.label}`, 'success');
  }
}

// ==========================================
// COVENANT MANAGEMENT
// ==========================================

async function startNewCovenant() {
  state.covenant = {
    id: Date.now(),
    user_intent: '',
    constraints: { cost: 0.01, latency: 5000, quality: 8.0 },
    status: 'draft',
    mediator_decision: null,
    orchestration_plan: null
  };
  
  document.getElementById('chatInput').focus();
  renderCovenant();
}

function renderCovenant() {
  if (!state.covenant) return;
  
  const container = document.getElementById('covenantCard');
  const card = `
    <div class="covenant-card ${state.covenant.status === 'active' ? 'active' : 'draft'}">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-mono text-gray-400">COVENANT #${state.covenant.id}</span>
        <span class="px-2 py-1 rounded text-xs ${
          state.covenant.status === 'active' ? 'bg-green-500/20 text-green-400' :
          state.covenant.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
          'bg-gray-500/20 text-gray-400'
        }">${state.covenant.status.toUpperCase()}</span>
      </div>
      
      ${state.covenant.user_intent ? `
        <div class="mb-3">
          <div class="text-xs text-gray-500 mb-1">Intent:</div>
          <div class="text-sm text-white">${state.covenant.user_intent}</div>
        </div>
      ` : ''}
      
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div class="text-gray-500">Max Cost</div>
          <div class="text-green-400 font-mono">$${state.covenant.constraints.cost.toFixed(4)}</div>
        </div>
        <div>
          <div class="text-gray-500">Max Latency</div>
          <div class="text-blue-400 font-mono">${state.covenant.constraints.latency}ms</div>
        </div>
        <div>
          <div class="text-gray-500">Min Quality</div>
          <div class="text-purple-400 font-mono">${state.covenant.constraints.quality}/10</div>
        </div>
      </div>
      
      ${state.covenant.mediator_decision ? `
        <div class="mt-3 pt-3 border-t border-gray-700">
          <div class="text-xs text-gray-500 mb-1">Mediator Decision:</div>
          <div class="text-sm text-amber-400">${state.covenant.mediator_decision}</div>
        </div>
      ` : ''}
    </div>
  `;
  
  container.innerHTML = card;
}

// ==========================================
// CHAT INTERFACE
// ==========================================

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const prompt = input.value.trim();
  
  if (!prompt) return;
  
  // Add user message
  state.messages.push({ role: 'user', content: prompt, timestamp: Date.now() });
  renderMessages();
  input.value = '';
  
  // Update covenant with user intent
  if (!state.covenant) {
    state.covenant = {
      id: Date.now(),
      user_intent: prompt,
      constraints: { cost: 0.01, latency: 5000, quality: 8.0 },
      status: 'draft',
      mediator_decision: null,
      orchestration_plan: null
    };
  } else {
    state.covenant.user_intent = prompt;
    state.covenant.status = 'active';
  }
  
  renderCovenant();
  
  // Show loading
  showAgentActivity('mediator', 'Analyzing request...');
  
  try {
    // Mediator makes routing decision
    const routingDecision = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    }).then(r => r.json());
    
    state.covenant.mediator_decision = routingDecision.decision.reasoning;
    renderCovenant();
    
    // Determine if we need full orchestration
    const complexity = analyzeComplexity(prompt);
    const useFullOrchestration = complexity > 0.6;
    
    if (useFullOrchestration) {
      // Full dual-orchestrator flow
      await runFullOrchestration(prompt, routingDecision);
    } else {
      // Fast path: Mediator with sub-agents
      await runMediatorOnly(prompt, routingDecision);
    }
    
  } catch (error) {
    console.error('Error:', error);
    showToast('⚠️ Error processing request', 'error');
    state.messages.push({ 
      role: 'system', 
      content: `Error: ${error.message}`, 
      timestamp: Date.now() 
    });
    renderMessages();
  }
}

function analyzeComplexity(prompt) {
  // Simple heuristic for complexity
  const words = prompt.split(/\s+/).length;
  const hasMultipleTasks = /\band\b|\bthen\b|\balso\b/i.test(prompt);
  const hasQualityTerms = /\bdetailed\b|\bcomprehensive\b|\bthorough\b/i.test(prompt);
  
  let score = 0;
  if (words > 20) score += 0.3;
  if (hasMultipleTasks) score += 0.4;
  if (hasQualityTerms) score += 0.3;
  
  return Math.min(score, 1.0);
}

async function runMediatorOnly(prompt, routing) {
  showToast('⚡ Fast Path: Mediator + Sub-Agents', 'info');
  
  // Simulate mediator coordinating sub-agents
  showAgentActivity('mediator', 'Coordinating sub-agents...');
  
  const subAgents = ['classifier', 'executor'];
  state.orchestration.mediator.tasks = subAgents.map(name => ({
    id: `${name}-${Date.now()}`,
    name,
    status: 'pending',
    progress: 0,
    thoughts: 'Initializing...',
    actions: [],
    output: null
  }));
  
  renderOrchestrationTree();
  
  // Animate agent execution with thoughts/actions
  for (let task of state.orchestration.mediator.tasks) {
    task.status = 'running';
    task.thoughts = `Analyzing ${prompt.substring(0, 30)}...`;
    task.actions = ['Reading input', 'Processing context'];
    renderOrchestrationTree();
    await new Promise(resolve => setTimeout(resolve, 400));
    
    task.progress = 50;
    task.thoughts = 'Generating response...';
    task.actions.push('Executing task');
    renderOrchestrationTree();
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  
  // Execute with smart routing
  const response = await fetch('/api/orchestrate/smart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  }).then(r => r.json());
  
  // Complete sub-agents
  state.orchestration.mediator.tasks.forEach(task => {
    task.status = 'completed';
    task.progress = 100;
    task.thoughts = 'Task completed successfully';
    task.output = 'Response generated';
  });
  
  renderOrchestrationTree();
  
  // Add response
  state.messages.push({
    role: 'assistant',
    content: response.answer || response.data?.answer || 'Response generated',
    metadata: response.metadata || {},
    timestamp: Date.now()
  });
  
  state.covenant.status = 'completed';
  renderCovenant();
  renderMessages();
  
  hideAgentActivity();
  showToast('✅ Completed via Mediator', 'success');
}

async function runFullOrchestration(prompt, routing) {
  showToast('🎭 Full Orchestration: Dual Orchestrator Active', 'info');
  
  // Mediator delegates to Orchestrator - UPDATE COVENANT
  showAgentActivity('mediator', 'Delegating to Orchestrator...');
  state.covenant.mediator_decision += ' → Delegating to Orchestrator for complex workflow';
  renderCovenant();
  
  await new Promise(resolve => setTimeout(resolve, 800));
  
  showAgentActivity('orchestrator', 'Planning sub-agent swarm...');
  
  // Simulate orchestrator creating sub-agent plan
  const subAgentPlan = [
    { type: 'classifier', role: 'Analyze task requirements' },
    { type: 'router', role: 'Select optimal models' },
    { type: 'executor', role: 'Execute sub-tasks', parallel: true, count: 3 },
    { type: 'evaluator', role: 'Assess quality' },
    { type: 'coordinator', role: 'Synthesize results' }
  ];
  
  // Update covenant with orchestration plan
  state.covenant.orchestration_plan = subAgentPlan.map(a => a.role).join(' → ');
  renderCovenant();
  
  state.orchestration.orchestrator.subAgents = subAgentPlan.map((agent, i) => ({
    id: `${agent.type}-${Date.now()}-${i}`,
    type: agent.type,
    role: agent.role,
    status: 'pending',
    progress: 0,
    thoughts: 'Waiting for execution...',
    actions: [],
    output: null,
    children: agent.parallel ? Array(agent.count).fill(null).map((_, j) => ({
      id: `${agent.type}-child-${j}`,
      type: `${agent.type}-${j+1}`,
      status: 'pending',
      progress: 0,
      thoughts: 'Waiting...',
      actions: [],
      output: null
    })) : []
  }));
  
  renderOrchestrationTree();
  
  // Start async API call (non-blocking)
  const responsePromise = fetch('/api/orchestrate/workers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      prompt,
      orchestrator_model: 'openai/gpt-4o-mini',
      worker_model: 'groq/llama-3.1-8b-instant'
    })
  }).then(r => r.json());
  
  // Animate sub-agents appearing in BATCH CHUNKS (non-blocking)
  for (let i = 0; i < state.orchestration.orchestrator.subAgents.length; i++) {
    const agent = state.orchestration.orchestrator.subAgents[i];
    
    // Agent appears and starts thinking
    agent.status = 'running';
    agent.thoughts = `Starting ${agent.type}: ${agent.role}`;
    agent.actions = ['Initializing', 'Loading context'];
    renderOrchestrationTree();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update progress
    agent.progress = 30;
    agent.thoughts = `Executing ${agent.role.toLowerCase()}...`;
    agent.actions.push('Processing');
    renderOrchestrationTree();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (agent.children.length > 0) {
      // Parallel execution - spawn children in chunks
      agent.thoughts = 'Spawning parallel sub-agents...';
      renderOrchestrationTree();
      
      for (let j = 0; j < agent.children.length; j++) {
        const child = agent.children[j];
        child.status = 'running';
        child.thoughts = `Parallel execution ${j+1}/${agent.children.length}`;
        child.actions = ['Working on sub-task'];
        renderOrchestrationTree();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Complete child
        child.status = 'completed';
        child.progress = 100;
        child.thoughts = 'Sub-task completed';
        child.output = `Result ${j+1}`;
        renderOrchestrationTree();
      }
      
      agent.thoughts = 'All parallel sub-agents completed';
      agent.actions.push('Merging results');
    }
    
    // Complete agent
    agent.status = 'completed';
    agent.progress = 100;
    agent.thoughts = `${agent.type} task completed successfully`;
    agent.output = `${agent.role} complete`;
    renderOrchestrationTree();
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Wait for API response
  const response = await responsePromise;
  
  // Add response
  state.messages.push({
    role: 'assistant',
    content: response.data.final_answer,
    metadata: response.metadata,
    orchestration: {
      plan: response.data.plan,
      task_results: response.data.task_results
    },
    timestamp: Date.now()
  });
  
  state.covenant.status = 'completed';
  renderCovenant();
  renderMessages();
  
  hideAgentActivity();
  showToast('✅ Full Orchestration Complete', 'success');
}

function renderMessages() {
  const container = document.getElementById('messages');
  container.innerHTML = state.messages.map(msg => {
    if (msg.role === 'user') {
      return `
        <div class="message user-message">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <span class="text-sm">👤</span>
            </div>
            <div class="flex-1">
              <div class="text-white">${msg.content}</div>
              <div class="text-xs text-gray-500 mt-1">${formatTime(msg.timestamp)}</div>
            </div>
          </div>
        </div>
      `;
    } else if (msg.role === 'assistant') {
      return `
        <div class="message assistant-message">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span class="text-sm">🤖</span>
            </div>
            <div class="flex-1">
              <div class="text-white whitespace-pre-wrap">${msg.content}</div>
              ${msg.metadata ? `
                <div class="mt-3 flex gap-3 text-xs">
                  <span class="text-gray-400">⚡ ${msg.metadata.duration_ms}ms</span>
                  <span class="text-green-400">💰 $${msg.metadata.cost_estimate.toFixed(6)}</span>
                  <span class="text-purple-400">🤖 ${msg.metadata.models_used.join(', ')}</span>
                </div>
              ` : ''}
              ${msg.orchestration ? `
                <button onclick="showOrchestrationDetails(${msg.timestamp})" class="mt-2 text-xs text-blue-400 hover:text-blue-300">
                  🔍 View Orchestration Plan
                </button>
              ` : ''}
              <div class="text-xs text-gray-500 mt-1">${formatTime(msg.timestamp)}</div>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// ==========================================
// ORCHESTRATION TREE VISUALIZATION
// ==========================================

function renderOrchestrationTree() {
  const container = document.getElementById('orchestrationTree');
  
  if (!state.orchestration.mediator.tasks.length && !state.orchestration.orchestrator.subAgents.length) {
    container.innerHTML = '<div class="text-center text-gray-500 py-8">No active orchestration</div>';
    return;
  }
  
  let html = '';
  
  // Mediator tasks
  if (state.orchestration.mediator.tasks.length > 0) {
    html += `
      <div class="tree-node">
        <div class="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-800/30 p-2 rounded" onclick="toggleSection('mediator')">
          <span class="text-lg">${state.expandedAgents.has('mediator') ? '▼' : '▶'}</span>
          <span class="text-lg">👤</span>
          <span class="text-sm font-semibold text-white">Mediator</span>
          <span class="text-xs text-gray-500 ml-2">(${state.orchestration.mediator.tasks.length} tasks)</span>
        </div>
        <div class="ml-6 space-y-2 ${state.expandedAgents.has('mediator') ? '' : 'hidden'}">
          ${state.orchestration.mediator.tasks.map(task => {
            const isExpanded = state.expandedAgents.has(task.id);
            return `
              <div class="agent-card ${task.status}">
                <div class="flex items-center justify-between cursor-pointer" onclick="toggleAgent('${task.id}')">
                  <div class="flex items-center gap-2">
                    <span class="text-xs">${isExpanded ? '▼' : '▶'}</span>
                    <span class="text-sm">${task.name}</span>
                  </div>
                  <span class="status-badge ${task.status}">${task.status}</span>
                </div>
                ${task.progress > 0 ? `
                  <div class="progress-bar mt-2">
                    <div class="progress-fill" style="width: ${task.progress}%"></div>
                  </div>
                ` : ''}
                ${isExpanded ? `
                  <div class="mt-3 space-y-2 text-xs">
                    <div>
                      <div class="text-gray-500 font-semibold mb-1">💭 Thoughts:</div>
                      <div class="text-gray-300 italic">${task.thoughts || 'No thoughts recorded'}</div>
                    </div>
                    ${task.actions && task.actions.length > 0 ? `
                      <div>
                        <div class="text-gray-500 font-semibold mb-1">⚡ Actions:</div>
                        <ul class="text-gray-300 list-disc list-inside">
                          ${task.actions.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                      </div>
                    ` : ''}
                    ${task.output ? `
                      <div>
                        <div class="text-gray-500 font-semibold mb-1">📤 Output:</div>
                        <div class="text-gray-300 bg-gray-800/50 p-2 rounded">${task.output}</div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  // Orchestrator sub-agents
  if (state.orchestration.orchestrator.subAgents.length > 0) {
    html += `
      <div class="tree-node mt-4">
        <div class="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-800/30 p-2 rounded" onclick="toggleSection('orchestrator')">
          <span class="text-lg">${state.expandedAgents.has('orchestrator') ? '▼' : '▶'}</span>
          <span class="text-lg">🎭</span>
          <span class="text-sm font-semibold text-white">Orchestrator</span>
          <span class="text-xs text-gray-500 ml-2">(${state.orchestration.orchestrator.subAgents.length} agents)</span>
        </div>
        <div class="ml-6 space-y-2 ${state.expandedAgents.has('orchestrator') ? '' : 'hidden'}">
          ${state.orchestration.orchestrator.subAgents.map(agent => {
            const isExpanded = state.expandedAgents.has(agent.id);
            return `
              <div class="agent-card ${agent.status}">
                <div class="cursor-pointer" onclick="toggleAgent('${agent.id}')">
                  <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                      <span class="text-xs">${isExpanded ? '▼' : '▶'}</span>
                      <span class="text-sm font-semibold">${agent.type}</span>
                    </div>
                    <span class="status-badge ${agent.status}">${agent.status}</span>
                  </div>
                  <div class="text-xs text-gray-400 ml-5">${agent.role}</div>
                </div>
                ${agent.progress > 0 ? `
                  <div class="progress-bar mt-2">
                    <div class="progress-fill" style="width: ${agent.progress}%"></div>
                  </div>
                ` : ''}
                
                ${isExpanded ? `
                  <div class="mt-3 space-y-2 text-xs">
                    <div>
                      <div class="text-gray-500 font-semibold mb-1">💭 Thoughts:</div>
                      <div class="text-gray-300 italic">${agent.thoughts || 'No thoughts recorded'}</div>
                    </div>
                    ${agent.actions && agent.actions.length > 0 ? `
                      <div>
                        <div class="text-gray-500 font-semibold mb-1">⚡ Actions:</div>
                        <ul class="text-gray-300 list-disc list-inside">
                          ${agent.actions.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                      </div>
                    ` : ''}
                    ${agent.output ? `
                      <div>
                        <div class="text-gray-500 font-semibold mb-1">📤 Output:</div>
                        <div class="text-gray-300 bg-gray-800/50 p-2 rounded">${agent.output}</div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                
                ${agent.children.length > 0 ? `
                  <div class="ml-4 mt-2 space-y-1 border-l-2 border-gray-700 pl-2">
                    ${agent.children.map(child => {
                      const childExpanded = state.expandedAgents.has(child.id);
                      return `
                        <div class="child-agent ${child.status} p-2 cursor-pointer" onclick="event.stopPropagation(); toggleAgent('${child.id}')">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <span class="text-xs">${childExpanded ? '▼' : '▶'}</span>
                              <span class="text-xs">${child.type}</span>
                            </div>
                            <span class="status-dot ${child.status}"></span>
                          </div>
                          ${childExpanded ? `
                            <div class="mt-2 space-y-1 text-xs">
                              <div class="text-gray-400 italic">${child.thoughts || 'Working...'}</div>
                              ${child.output ? `<div class="text-gray-300">\u2713 ${child.output}</div>` : ''}
                            </div>
                          ` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showAgentActivity(agent, message) {
  const indicator = document.getElementById('agentActivity');
  indicator.classList.remove('hidden');
  indicator.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="loading-spinner"></div>
      <span class="text-sm">${agent === 'mediator' ? '👤 Mediator' : '🎭 Orchestrator'}: ${message}</span>
    </div>
  `;
}

function hideAgentActivity() {
  const indicator = document.getElementById('agentActivity');
  indicator.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function toggleInsights() {
  state.insightsExpanded = !state.insightsExpanded;
  const panel = document.getElementById('insightsPanel');
  panel.classList.toggle('expanded');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function setMode(mode) {
  showToast(mode === 'full' ? '🎭 Full orchestration enabled' : '⚡ Fast mode enabled', 'info');
}

function clearHistory() {
  state.messages = [];
  state.covenant = null;
  state.orchestration.mediator.tasks = [];
  state.orchestration.orchestrator.subAgents = [];
  renderMessages();
  renderCovenant();
  renderOrchestrationTree();
}

function exportCovenant() {
  if (!state.covenant) {
    showToast('⚠️ No active covenant', 'error');
    return;
  }
  
  const data = JSON.stringify(state.covenant, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `covenant-${state.covenant.id}.json`;
  a.click();
}

function showOrchestrationDetails(timestamp) {
  const msg = state.messages.find(m => m.timestamp === timestamp);
  if (!msg || !msg.orchestration) return;
  
  alert(`Orchestration Plan:\n\n${JSON.stringify(msg.orchestration.plan, null, 2)}`);
}

function toggleSection(sectionId) {
  if (state.expandedAgents.has(sectionId)) {
    state.expandedAgents.delete(sectionId);
  } else {
    state.expandedAgents.add(sectionId);
  }
  renderOrchestrationTree();
}

function toggleAgent(agentId) {
  if (state.expandedAgents.has(agentId)) {
    state.expandedAgents.delete(agentId);
  } else {
    state.expandedAgents.add(agentId);
  }
  renderOrchestrationTree();
}

// Resizable sidebar functionality
function initResizableSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) {
    console.warn('Sidebar element not found, skipping resize initialization');
    return;
  }
  const resizer = document.createElement('div');
  resizer.className = 'sidebar-resizer';
  resizer.innerHTML = '<div class="resize-handle"></div>';
  sidebar.insertBefore(resizer, sidebar.firstChild);
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const width = startWidth + (startX - e.clientX);
    if (width >= 300 && width <= 800) {
      state.sidebarWidth = width;
      sidebar.style.width = `${width}px`;
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ==========================================
// INITIALIZATION
// ==========================================

// WebSocket Connection Management
function connectWebSocket() {
  // Check if WebSocket is supported
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  try {
    // Connect to Mediator DO
    const mediatorWs = new WebSocket(`${protocol}//${host}/api/agents/mediator/${state.userId}/ws`);
    
    mediatorWs.onopen = () => {
      console.log('✅ Mediator WebSocket connected');
      state.ws.mediator = mediatorWs;
      state.ws.connected = true;
      showToast('🔗 Real-time connection established', 'success');
    };
    
    mediatorWs.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };
    
    mediatorWs.onerror = (error) => {
      console.error('❌ Mediator WebSocket error:', error);
      state.ws.connected = false;
    };
    
    mediatorWs.onclose = () => {
      console.log('🔌 Mediator WebSocket closed');
      state.ws.mediator = null;
      state.ws.connected = false;
      
      // Attempt reconnect after 5s
      setTimeout(() => {
        if (!state.ws.connected) {
          console.log('🔄 Attempting to reconnect...');
          connectWebSocket();
        }
      }, 5000);
    };
  } catch (error) {
    console.warn('⚠️ WebSocket not available (development mode)');
    console.log('💡 Deploy to Cloudflare Pages for real-time features');
  }
}

function handleWebSocketMessage(message) {
  console.log('📨 WebSocket message:', message.type, message.data);
  
  switch (message.type) {
    case 'covenant_update':
      state.covenant = message.data;
      renderCovenant();
      break;
      
    case 'status_change':
      if (state.covenant) {
        state.covenant.status = message.data.status;
        renderCovenant();
      }
      break;
      
    case 'agent_spawn':
      addAgentToTree(message.data);
      break;
      
    case 'agent_progress':
      updateAgentProgress(message.data);
      break;
      
    case 'agent_complete':
      markAgentComplete(message.data);
      break;
      
    case 'delegation':
      showToast(`🎭 Delegating to ${message.data.to}`, 'info');
      break;
      
    case 'task_start':
      showToast('🚀 Orchestration started', 'info');
      break;
      
    case 'task_complete':
      showToast('✅ Orchestration complete', 'success');
      break;
      
    case 'error':
      showToast(`⚠️ ${message.data.message}`, 'error');
      break;
  }
}

function addAgentToTree(agent) {
  // Add to appropriate section (mediator or orchestrator)
  if (agent.type.includes('mediator') || !state.orchestration.orchestrator.subAgents.length) {
    state.orchestration.mediator.tasks.push(agent);
  } else {
    state.orchestration.orchestrator.subAgents.push(agent);
  }
  renderOrchestrationTree();
}

function updateAgentProgress(agent) {
  // Find and update agent in tree
  let found = state.orchestration.mediator.tasks.find(a => a.id === agent.id);
  if (found) {
    Object.assign(found, agent);
  } else {
    found = state.orchestration.orchestrator.subAgents.find(a => a.id === agent.id);
    if (found) {
      Object.assign(found, agent);
    }
  }
  renderOrchestrationTree();
}

function markAgentComplete(agent) {
  updateAgentProgress(agent);
}

function sendWebSocketMessage(type, data) {
  if (state.ws.mediator && state.ws.mediator.readyState === WebSocket.OPEN) {
    state.ws.mediator.send(JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    }));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCommandPalette();
  initResizableSidebar();
  
  // Expand sections by default
  state.expandedAgents.add('mediator');
  state.expandedAgents.add('orchestrator');
  
  renderMessages();
  renderCovenant();
  renderOrchestrationTree();
  
  // Auto-create initial covenant
  startNewCovenant();
  
  // Connect WebSocket for real-time updates
  connectWebSocket();
  
  // Enter to send
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Command palette search
  document.getElementById('paletteInput').addEventListener('input', renderCommandPalette);
  renderCommandPalette();
  
  console.log('🚀 Harpoon v2 UI Loaded - Press Cmd+K for command palette');
  console.log('💡 Click agent headers to expand/collapse details');
  console.log('↔️ Drag sidebar edge to resize');
  console.log('🔗 Connecting to WebSocket for real-time updates...');
});
