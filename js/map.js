// ── Port generation ───────────────────────────────────────

function _generatePorts(nodeType) {
  const config = NODE_PORT_CONFIG[nodeType] || NODE_PORT_CONFIG.pc;
  const pool   = [...(NODE_PORT_POOLS[nodeType] || NODE_PORT_POOLS.pc)];

  // Shuffle pool and take `total` ports
  pool.sort(() => Math.random() - 0.5);
  const selected = pool.slice(0, config.total);

  // Randomly mark `open` ports, then shuffle order so open isn't always first
  return selected
    .map((type, i) => ({ type, open: i < config.open, discovered: false }))
    .sort(() => Math.random() - 0.5);
}

// ── Map generation ────────────────────────────────────────

function _mapDist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function _edgeExists(edges, a, b) {
  return edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
}

function generateMap() {
  const nodes = [], edges = [];
  let nid = 0;

  for (let ring = 0; ring < MAP_RINGS.length; ring++) {
    const { count, pool } = MAP_RINGS[ring];
    const radius  = MAP_RING_RADII[ring];
    const { x: cx, y: cy } = MAP_CENTER;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const prevRing = nodes.filter(n => n.ring === ring - 1);

    for (let i = 0; i < count; i++) {
      const type = ring === 0 ? 'home' : shuffled[i % shuffled.length];
      let x = cx, y = cy;

      if (ring > 0) {
        const angle  = (2 * Math.PI * i / count) + ring * 0.35;
        const jitter = ring > 1 ? 28 : 12;
        x = Math.round(cx + Math.cos(angle) * radius + (Math.random() - 0.5) * jitter);
        y = Math.round(cy + Math.sin(angle) * radius + (Math.random() - 0.5) * jitter);
      }

      nodes.push({
        id: `n${nid++}`,
        type, ring, x, y,
        label:        makeNodeLabel(type),
        security:     NODE_TYPES[type].security,
        hackDuration: HACK_DURATIONS[type] || 0,
        status:       ring === 0 ? 'compromised' : ring === 1 ? 'discovered' : 'unknown',
        borrowing:    false,
        bleeding:     false,
        // Exploit progress
        hackStartedAt:  null,
        hackEndsAt:     null,
        exploitScriptId: null,
        // Loot
        searched:  type === 'home',
        lootFound: null,
        // Port scan
        ports:           type === 'home' ? [] : _generatePorts(type),
        scanned:         type === 'home',
        scanScriptId:    null,
        nextPortRevealAt: null,
      });

      if (prevRing.length > 0) {
        const cur    = nodes[nodes.length - 1];
        const sorted = [...prevRing].sort((a, b) => _mapDist(cur, a) - _mapDist(cur, b));
        edges.push({ from: sorted[0].id, to: cur.id });
        if (sorted.length > 1 && Math.random() < 0.35 && !_edgeExists(edges, sorted[1].id, cur.id)) {
          edges.push({ from: sorted[1].id, to: cur.id });
        }
      }
    }

    if (ring >= 2) {
      const rn = nodes.filter(n => n.ring === ring);
      for (let i = 0; i < rn.length; i++) {
        if (Math.random() < 0.28) {
          const j = (i + 1) % rn.length;
          if (!_edgeExists(edges, rn[i].id, rn[j].id)) {
            edges.push({ from: rn[i].id, to: rn[j].id });
          }
        }
      }
    }
  }

  state.map = { nodes, edges };
}

// ── Recon (port scan) ─────────────────────────────────────

function getReconScripts() {
  return SCRIPTS.filter(s => state.scripts[s.id] && (s.portTypes?.length || 0) > 0);
}

function getExploitScripts(node) {
  if (!node.ports) return [];
  const openTypes = node.ports.filter(p => p.open && p.discovered).map(p => p.type);
  if (openTypes.length === 0) return [];
  return SCRIPTS.filter(s => state.scripts[s.id] && s.portTypes?.some(t => openTypes.includes(t)));
}

function canScan(node) {
  if (node.type === 'home') return false;
  if (node.status !== 'discovered' && node.status !== 'offline') return false;
  return getReconScripts().length > 0;
}

function canExploit(node) {
  if (!node.scanned) return false;
  if (node.status !== 'discovered' && node.status !== 'offline') return false;
  return getExploitScripts(node).length > 0;
}

function startScan(nodeId, scriptId) {
  const node   = state.map?.nodes.find(n => n.id === nodeId);
  const script = SCRIPTS.find(s => s.id === scriptId);
  if (!node || !script || !state.scripts[scriptId] || !script.portTypes?.length) return;
  if (node.status !== 'discovered' && node.status !== 'offline') return;
  if (node.type === 'home') return;

  // Reset any previous discoveries
  for (const port of node.ports) port.discovered = false;
  node.scanned = false;

  node.status       = 'scanning';
  node.scanScriptId = scriptId;
  const interval    = Math.floor(3000 / (script.reconSpeed || 1));
  node.nextPortRevealAt = Date.now() + interval;
  renderCards();
}

function _revealNextPort(node) {
  const undiscovered = node.ports.filter(p => !p.discovered);
  if (undiscovered.length === 0) {
    node.status          = 'discovered';
    node.scanned         = true;
    node.scanScriptId    = null;
    node.nextPortRevealAt = null;
    return;
  }

  undiscovered[0].discovered = true;

  if (node.ports.every(p => p.discovered)) {
    node.status          = 'discovered';
    node.scanned         = true;
    node.scanScriptId    = null;
    node.nextPortRevealAt = null;
  } else {
    const script   = SCRIPTS.find(s => s.id === node.scanScriptId);
    const interval = Math.floor(3000 / (script?.reconSpeed || 1));
    node.nextPortRevealAt = Date.now() + interval;
  }
}

function rescan(nodeId) {
  const node = state.map?.nodes.find(n => n.id === nodeId);
  if (!node || node.status !== 'discovered') return;
  node.scanned = false;
  for (const port of node.ports) port.discovered = false;
  renderCards();
}

// ── Exploit ───────────────────────────────────────────────

function startExploit(nodeId, scriptId) {
  const node   = state.map?.nodes.find(n => n.id === nodeId);
  const script = SCRIPTS.find(s => s.id === scriptId);
  if (!node || !script || !state.scripts[scriptId]) return;
  if (!node.scanned) return;
  if (node.status !== 'discovered' && node.status !== 'offline') return;

  const openTypes = node.ports.filter(p => p.open && p.discovered).map(p => p.type);
  if (!script.portTypes?.some(t => openTypes.includes(t))) return;

  node.status          = 'hacking';
  node.hackStartedAt   = Date.now();
  node.hackEndsAt      = Date.now() + node.hackDuration * 1000;
  node.exploitScriptId = scriptId;
  renderCards();
}

function _revealNeighbors(nodeId) {
  for (const edge of state.map.edges) {
    const neighborId = edge.from === nodeId ? edge.to : edge.to === nodeId ? edge.from : null;
    if (!neighborId) continue;
    const neighbor = state.map.nodes.find(n => n.id === neighborId);
    if (neighbor?.status === 'unknown') neighbor.status = 'discovered';
  }
}

function _resolveHack(node) {
  // Deterministic success — no RNG
  node.status          = 'compromised';
  node.hackStartedAt   = null;
  node.hackEndsAt      = null;
  node.exploitScriptId = null;
  _revealNeighbors(node.id);
  _expireContractsTargeting(node.id);
}

function _expireContractsTargeting(nodeId) {
  for (const msg of state.messages) {
    if (msg.targetNodeId !== nodeId) continue;
    if (msg.status !== 'unread' && msg.status !== 'read') continue;
    msg.status = 'expired';
  }
}

// ── Resources & Income ────────────────────────────────────

function getBorrowedResources() {
  let cpu = 0, ram = 0, gpu = 0;
  for (const node of (state.map?.nodes || [])) {
    if (node.borrowing && node.status === 'compromised') {
      const r = NODE_TYPES[node.type].resources;
      cpu += r.cpu; ram += r.ram; gpu += r.gpu;
    }
  }
  return { cpu, ram, gpu };
}

function getBleedIncomePerSec() {
  let income = 0;
  for (const node of (state.map?.nodes || [])) {
    if (node.bleeding && node.status === 'compromised' && state.scripts['corp_bleeder']) {
      income += NODE_TYPES[node.type].bleedPerSec;
    }
  }
  return income;
}

function toggleBorrow(nodeId) {
  const node = state.map?.nodes.find(n => n.id === nodeId);
  if (!node || node.status !== 'compromised' || node.type === 'home') return;
  node.borrowing = !node.borrowing;
  renderCards();
}

function toggleBleed(nodeId) {
  const node = state.map?.nodes.find(n => n.id === nodeId);
  if (!node || node.status !== 'compromised' || node.type !== 'company') return;
  if (!state.scripts['corp_bleeder']) return;
  node.bleeding = !node.bleeding;
  renderCards();
}

function disruptNode(nodeId) {
  const node = state.map?.nodes.find(n => n.id === nodeId);
  if (!node || node.status !== 'compromised' || node.type === 'home') return;
  node.status    = 'disrupted';
  node.borrowing = false;
  node.bleeding  = false;
  renderCards();
}

// ── Exposure ──────────────────────────────────────────────

function getExposureGainRate() {
  let rate = 0;
  for (const node of (state.map?.nodes || [])) {
    if (node.status !== 'compromised') continue;
    if (node.borrowing) rate += 0.5;
    if (node.bleeding)  rate += 1.8;
  }
  return rate;
}

// ── Map Tick ─────────────────────────────────────────────

setInterval(() => {
  if (!state.map?.nodes) return;
  const now = Date.now();
  let changed = false;

  for (const node of state.map.nodes) {
    // Exploit completion
    if (node.status === 'hacking' && node.hackEndsAt && now >= node.hackEndsAt) {
      _resolveHack(node);
      changed = true;
    }
    // Port scan tick — reveal one port at a time
    if (node.status === 'scanning' && node.nextPortRevealAt && now >= node.nextPortRevealAt) {
      _revealNextPort(node);
      changed = true;
    }
  }

  // Exposure: gain from risky nodes, decay passively + from equipped security programs
  const net = getExposureGainRate() - 1.0 - getExposureDecayBonus();
  state.exposure = Math.max(0, Math.min(100, state.exposure + net));

  // High exposure: random active node goes offline
  if (state.exposure >= 85) {
    const risky = state.map.nodes.filter(
      n => (n.borrowing || n.bleeding) && n.status === 'compromised' && n.type !== 'home'
    );
    if (risky.length > 0 && Math.random() < 0.08) {
      const victim = risky[Math.floor(Math.random() * risky.length)];
      victim.status    = 'offline';
      victim.borrowing = false;
      victim.bleeding  = false;
      changed = true;
    }
  }

  if (changed) renderCards();
}, 1000);
