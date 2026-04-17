// ── Generation ────────────────────────────────────────────

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
        hackStartedAt: null,
        hackEndsAt:    null,
        searched:     type === 'home', // home node is not searchable
        lootFound:    null,
      });

      // Connect to nearest node(s) in previous ring
      if (prevRing.length > 0) {
        const cur    = nodes[nodes.length - 1];
        const sorted = [...prevRing].sort((a, b) => _mapDist(cur, a) - _mapDist(cur, b));
        edges.push({ from: sorted[0].id, to: cur.id });
        if (sorted.length > 1 && Math.random() < 0.35 && !_edgeExists(edges, sorted[1].id, cur.id)) {
          edges.push({ from: sorted[1].id, to: cur.id });
        }
      }
    }

    // Sparse intra-ring edges for outer rings
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

// ── Hack Logic ────────────────────────────────────────────

function getHackChance(node) {
  let best = 0;
  for (const [scriptId, odds] of Object.entries(HACK_SCRIPT_ODDS)) {
    if (state.scripts[scriptId]) best = Math.max(best, odds[node.security] || 0);
  }
  return best;
}

function canStartHack(node) {
  if (node.status !== 'discovered') return false;
  const needed = NODE_TYPES[node.type].hackScript;
  return !needed || !!state.scripts[needed];
}

function startHack(nodeId) {
  const node = state.map?.nodes.find(n => n.id === nodeId);
  if (!node || !canStartHack(node)) return;
  node.status        = 'hacking';
  node.hackStartedAt = Date.now();
  node.hackEndsAt    = Date.now() + node.hackDuration * 1000;
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
  if (Math.random() < getHackChance(node)) {
    node.status = 'compromised';
    _revealNeighbors(node.id);
  } else {
    node.status = 'discovered';
  }
  node.hackStartedAt = null;
  node.hackEndsAt    = null;
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

// ── Exposure ──────────────────────────────────────────────

function getExposureGainRate() {
  let rate = 0;
  for (const node of (state.map?.nodes || [])) {
    if (node.status !== 'compromised') continue;
    if (node.borrowing) rate += 0.5;
    if (node.bleeding)  rate += 1.8;
  }
  return rate; // per second
}

// ── Map Tick ─────────────────────────────────────────────

setInterval(() => {
  if (!state.map?.nodes) return;
  const now = Date.now();
  let changed = false;

  // Resolve completed hacks
  for (const node of state.map.nodes) {
    if (node.status === 'hacking' && node.hackEndsAt && now >= node.hackEndsAt) {
      _resolveHack(node);
      changed = true;
    }
  }

  // Exposure: gain from risky nodes, decay 1/s passively
  const net = getExposureGainRate() - 1.0;
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
