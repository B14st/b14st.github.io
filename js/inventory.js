// ── Crack config ──────────────────────────────────────────

function getCrackConfig() {
  let slots = 0, speed = 1;
  for (const script of SCRIPTS) {
    if (state.scripts[script.id] && script.stats?.parallelCracks) {
      if (script.stats.parallelCracks > slots) {
        slots = script.stats.parallelCracks;
        speed = script.stats.contractSpeedBonus || 1;
      }
    }
  }
  return { slots, speed };
}

// ── Loot tables ───────────────────────────────────────────

const HASH_RANGES = {
  pc:      [50,   300],
  server:  [200, 1000],
  company: [500, 3000],
};

const DUMP_RANGES = {
  pc:      [80,   250],
  server:  [250,  700],
  company: [700, 2000],
};

const SCRIPT_RARITY_ODDS = {
  pc:      { common: 0.70, uncommon: 0.28, rare: 0.02 },
  server:  { common: 0.45, uncommon: 0.40, rare: 0.15 },
  company: { common: 0.20, uncommon: 0.45, rare: 0.35 },
};

function _randRange([min, max]) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function _rollScript(node) {
  const odds = SCRIPT_RARITY_ODDS[node.type] || SCRIPT_RARITY_ODDS.pc;
  const r = Math.random();
  let cum = 0, targetRarity = 'common';
  for (const [rarity, prob] of Object.entries(odds)) {
    cum += prob;
    if (r < cum) { targetRarity = rarity; break; }
  }

  const pool = SCRIPTS.filter(s =>
    s.rarity === targetRarity &&
    s.rarity !== 'legendary' &&
    !state.scripts[s.id]
  );

  const fallback = pool.length > 0
    ? pool
    : SCRIPTS.filter(s => !state.scripts[s.id] && s.rarity !== 'legendary');

  if (fallback.length === 0) return _rollHash(node);

  const chosen = fallback[Math.floor(Math.random() * fallback.length)];
  return { type: 'script', scriptId: chosen.id };
}

function _rollHash(node) {
  return { type: 'hash', value: _randRange(HASH_RANGES[node.type] || HASH_RANGES.pc) };
}

function _rollDump(node) {
  return { type: 'dump', value: _randRange(DUMP_RANGES[node.type] || DUMP_RANGES.pc) };
}

function _rollLootItem(node) {
  const r = Math.random();
  if (r < 0.40) return _rollScript(node);
  if (r < 0.75) return _rollHash(node);
  return _rollDump(node);
}

// ── Search node ───────────────────────────────────────────

function searchNode(nodeId) {
  const node = state.map?.nodes.find(n => n.id === nodeId);
  if (!node || node.status !== 'compromised' || node.searched) return;

  node.searched   = true;
  node.searchedAt = Date.now();
  const count = Math.random() < 0.08 ? 2 : 1;
  const items = Array.from({ length: count }, () => _rollLootItem(node));
  node.lootFound = items;

  for (const item of items) {
    if (item.type === 'script') {
      state.scripts[item.scriptId] = true;
    } else if (item.type === 'hash') {
      state.inventory.hashes.push({
        id:            `hash_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        nodeLabel:     node.label,
        nodeType:      node.type,
        value:         item.value,
        status:        'pending',
        foundAt:       Date.now(),
        crackStartedAt: null,
        cracksAt:       null,
      });
    } else if (item.type === 'dump') {
      state.inventory.dumps.push({
        id:        `dump_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        nodeLabel: node.label,
        nodeType:  node.type,
        value:     item.value,
        foundAt:   Date.now(),
      });
    }
  }

  renderCards();
}

// ── Sell dump ─────────────────────────────────────────────

function sellDump(dumpId) {
  const idx = state.inventory.dumps.findIndex(d => d.id === dumpId);
  if (idx === -1) return;
  state.balance += state.inventory.dumps[idx].value;
  state.inventory.dumps.splice(idx, 1);
  renderCards();
}

function sellAllDumps() {
  for (const dump of state.inventory.dumps) state.balance += dump.value;
  state.inventory.dumps = [];
  renderCards();
}

function sellHash(hashId) {
  const idx = state.inventory.hashes.findIndex(h => h.id === hashId);
  if (idx === -1 || state.inventory.hashes[idx].status !== 'done') return;
  state.balance += state.inventory.hashes[idx].value;
  state.inventory.hashes.splice(idx, 1);
  renderCards();
}

function sellAllHashes() {
  const done = state.inventory.hashes.filter(h => h.status === 'done');
  for (const h of done) state.balance += h.value;
  state.inventory.hashes = state.inventory.hashes.filter(h => h.status !== 'done');
  renderCards();
}

// ── Crack queue tick ──────────────────────────────────────

setInterval(() => {
  if (!state.inventory?.hashes.length) return;

  const { slots, speed } = getCrackConfig();
  const now = Date.now();
  let changed = false;

  // Complete finished cracks
  for (const hash of state.inventory.hashes) {
    if (hash.status === 'cracking' && hash.cracksAt && now >= hash.cracksAt) {
      hash.status = 'done';
      state.totalHashesCracked = (state.totalHashesCracked || 0) + 1;
      changed = true;
    }
  }

  // Fill free slots with pending hashes
  if (slots > 0) {
    const active   = state.inventory.hashes.filter(h => h.status === 'cracking').length;
    const free     = slots - active;
    const pending  = state.inventory.hashes.filter(h => h.status === 'pending');

    for (let i = 0; i < Math.min(free, pending.length); i++) {
      const hash          = pending[i];
      hash.status         = 'cracking';
      hash.crackStartedAt = now;
      hash.cracksAt       = now + Math.max(5000, Math.floor((hash.value / 10) * 1000 / speed));
      changed = true;
    }
  }

  if (changed) renderCards();
}, 1000);
