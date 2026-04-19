const state = {
  balance: 75,
  hardware: { cpu: 0, ram: 0, gpu: 0 },
  operations: {},
  programs: {
    equipped: {
      operations: [null, null],
      security:   [null],
      system:     [null, null],
    },
    inventory: [],
  },
  scripts: { hash_cracker_basic: true },
  messages: [],
  map: null,
  exposure: 0,
  inventory: { hashes: [], dumps: [] },
  totalHashesCracked: 0,
  gameStartTime: Date.now(),
};

// ── Program / Script lookups ─────────────────────────────

function getProgram(id) {
  return PROGRAMS.find(p => p.id === id);
}

function getScript(id) {
  return SCRIPTS.find(s => s.id === id);
}

// ── Equipped programs ────────────────────────────────────

function getEquippedProgramIds() {
  const { operations, security, system } = state.programs.equipped;
  return [...operations, ...security, ...system].filter(Boolean);
}

function isProgramEquipped(id) {
  return getEquippedProgramIds().includes(id);
}

function isProgramOwned(id) {
  return state.programs.inventory.includes(id) || isProgramEquipped(id);
}

// ── Slot management ──────────────────────────────────────

function getOperationsSlotCount() {
  return Math.min(5, 2 + state.hardware.cpu);
}

function getSystemSlotCount() {
  return Math.min(4, 2 + Math.max(0, state.hardware.ram - 1));
}

function _syncProgramSlots() {
  const ops = getOperationsSlotCount();
  const sys = getSystemSlotCount();
  while (state.programs.equipped.operations.length < ops) state.programs.equipped.operations.push(null);
  while (state.programs.equipped.system.length < sys) state.programs.equipped.system.push(null);
}

// ── Hardware / Resources ─────────────────────────────────

function getCapacity(type) {
  const hw       = HARDWARE[type].tiers[state.hardware[type]].capacity;
  const borrowed = typeof getBorrowedResources === 'function' ? getBorrowedResources()[type] : 0;
  return hw + borrowed;
}

function getOpCosts(op) {
  if (op.requiredScript) {
    const script = getScript(op.requiredScript);
    return script ? { cpu: script.cpu, ram: script.ram, gpu: script.gpu } : null;
  }
  return { cpu: op.cpu ?? 0, ram: op.ram ?? 0, gpu: op.gpu ?? 0 };
}

function getUsedResources() {
  let cpu = 0, ram = 0, gpu = 0;
  for (const id of getEquippedProgramIds()) {
    const p = getProgram(id);
    if (p) { cpu += p.cpu; ram += p.ram; gpu += p.gpu; }
  }
  for (const op of OPERATIONS) {
    if (state.operations[op.id]) {
      const costs = getOpCosts(op);
      if (costs) { cpu += costs.cpu; ram += costs.ram; gpu += costs.gpu; }
    }
  }
  return { cpu, ram, gpu };
}

function isOperationActive(op) {
  if (op.requiredScript) return !!state.scripts[op.requiredScript] && !!state.operations[op.id];
  return !!state.operations[op.id];
}

function getOpStatus(op) {
  if (op.requiredScript) {
    if (!state.scripts[op.requiredScript]) return 'no-script';
  }
  const costs = { cpu: op.cpu ?? 0, ram: op.ram ?? 0, gpu: op.gpu ?? 0 };
  const used = getUsedResources();
  const fits = (
    used.cpu + costs.cpu <= getCapacity('cpu') &&
    used.ram + costs.ram <= getCapacity('ram') &&
    used.gpu + costs.gpu <= getCapacity('gpu')
  );
  if (!fits && !state.operations[op.id]) return 'no-resources';
  return 'ok';
}

function canActivate(op) {
  return getOpStatus(op) === 'ok';
}

// ── Player Actions ───────────────────────────────────────

function toggleOperation(id) {
  const op = OPERATIONS.find(o => o.id === id);
  if (!op) return;
  state.operations[id] = state.operations[id] ? false : (canActivate(op) ? true : false);
  renderCards();
}

function buyHardware(type) {
  const tierIdx = state.hardware[type];
  const tiers = HARDWARE[type].tiers;
  if (tierIdx >= tiers.length - 1) return;
  const next = tiers[tierIdx + 1];
  if (state.balance < next.cost) return;
  state.balance -= next.cost;
  state.hardware[type] = tierIdx + 1;
  _syncProgramSlots();
  renderCards();
}

function buyProgram(id) {
  const prog = getProgram(id);
  if (!prog || isProgramOwned(id) || state.balance < prog.cost) return;
  state.balance -= prog.cost;
  state.programs.inventory.push(id);
  renderCards();
}

function buyScript(id) {
  const script = getScript(id);
  if (!script || state.scripts[id] || state.balance < script.cost) return;
  state.balance -= script.cost;
  state.scripts[id] = true;
  renderCards();
}

function equipProgram(id, slotType, slotIndex) {
  const prog = getProgram(id);
  if (!prog || prog.slotType !== slotType) return;

  const invIdx = state.programs.inventory.indexOf(id);
  if (invIdx === -1) return;

  // Resource check: free what's currently in slot, then check if new prog fits
  const currentId = state.programs.equipped[slotType][slotIndex];
  const used = getUsedResources();
  const freed = currentId ? (() => {
    const p = getProgram(currentId);
    return p ? { cpu: p.cpu, ram: p.ram, gpu: p.gpu } : { cpu: 0, ram: 0, gpu: 0 };
  })() : { cpu: 0, ram: 0, gpu: 0 };

  const fits = (
    used.cpu - freed.cpu + prog.cpu <= getCapacity('cpu') &&
    used.ram - freed.ram + prog.ram <= getCapacity('ram') &&
    used.gpu - freed.gpu + prog.gpu <= getCapacity('gpu')
  );
  if (!fits) return;

  if (currentId) state.programs.inventory.push(currentId);
  state.programs.inventory.splice(invIdx, 1);
  state.programs.equipped[slotType][slotIndex] = id;
  renderCards();
}

function unequipProgram(slotType, slotIndex) {
  const id = state.programs.equipped[slotType][slotIndex];
  if (!id) return;
  state.programs.equipped[slotType][slotIndex] = null;
  state.programs.inventory.push(id);
  renderCards();
}

// ── Income ───────────────────────────────────────────────

function getExposureDecayBonus() {
  return getEquippedProgramIds().map(getProgram).filter(Boolean)
    .reduce((sum, p) => sum + (p.stats?.exposureDecay || 0), 0);
}

function getIncomePerSec() {
  // Multipliers stack from both owned scripts and equipped programs
  let globalMultiplier = 1;
  for (const s of SCRIPTS) {
    if (state.scripts[s.id] && s.stats?.incomeMultiplier) globalMultiplier *= s.stats.incomeMultiplier;
  }
  for (const p of getEquippedProgramIds().map(getProgram).filter(Boolean)) {
    if (p.stats?.incomeMultiplier) globalMultiplier *= p.stats.incomeMultiplier;
  }
  const opIncome    = OPERATIONS.reduce((sum, op) => sum + (isOperationActive(op) ? op.incomePerSec : 0), 0);
  const bleedIncome = typeof getBleedIncomePerSec === 'function' ? getBleedIncomePerSec() : 0;
  return (opIncome + bleedIncome) * globalMultiplier;
}

// ── Contract System ──────────────────────────────────────

const _CONTRACT_SENDERS = ['anon_47', 'mr.null', 'c1pher', 'v01d', 'ghost_3x', 'nx0p', 'byte_lord', 'z3r0'];

const _CONTRACT_SUBJECTS = {
  hash_crack: ['Hash cracking job', 'Processing request', 'Bulk hash work', 'Decode and deliver'],
  exfil:      ['Data extraction job', 'File retrieval', 'Exfil target acquired', 'Clean pull required'],
  backdoor:   ['Persistent access needed', 'Keep the door open', 'Maintain foothold'],
  disrupt:    ['Target disruption contract', 'Take it offline', 'Node takedown required'],
  stealth_op: ['Ghost operation', 'Sensitive extraction', 'Black bag job', 'No trace required'],
};

const _CONTRACT_BODIES = {
  hash_crack: tier => `Got a hash dump that needs cracking. ${['3 hashes', '5 hashes', '8 hashes'][tier-1]}, standard format.\n\nPaying on delivery. Don't sit on this.`,
  exfil:      (tier, label) => `Need files pulled from ${label}. Get in, search the system, get out.\n\nNo traces. Paying on delivery.`,
  backdoor:   (tier, label, dur) => `We need sustained access to ${label} for ${dur}. Compromise it and hold the connection.\n\nDon't let it go offline. Full payout on completion.`,
  disrupt:    (tier, label, mins) => `We need ${label} taken offline for ${mins} minutes. Clean job, no attribution.\n\nTimer starts when the node goes down.`,
  stealth_op: (tier, label) => `Delicate work. Need data pulled from ${label} without triggering detection.\n\nGhost job. If your tools aren't quiet enough, don't accept. One chance.`,
};

function getContractDuration(durationSecs) {
  let speedBonus = 1;
  for (const s of SCRIPTS) {
    if (state.scripts[s.id] && s.stats?.contractSpeedBonus) speedBonus = Math.max(speedBonus, s.stats.contractSpeedBonus);
  }
  for (const p of getEquippedProgramIds().map(getProgram).filter(Boolean)) {
    if (p.stats?.contractSpeedBonus) speedBonus = Math.max(speedBonus, p.stats.contractSpeedBonus);
  }
  return Math.floor((durationSecs * 1000) / speedBonus);
}

// ── BFS ───────────────────────────────────────────────────

function _nodesWithinHops(maxHops) {
  if (!state.map) return [];
  const distances = new Map();
  const queue     = [];

  for (const node of state.map.nodes) {
    if (node.status === 'compromised') { distances.set(node.id, 0); queue.push(node.id); }
  }

  let i = 0;
  while (i < queue.length) {
    const id   = queue[i++];
    const dist = distances.get(id);
    if (dist >= maxHops) continue;
    for (const edge of state.map.edges) {
      const nb = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
      if (!nb || distances.has(nb)) continue;
      distances.set(nb, dist + 1);
      queue.push(nb);
    }
  }

  return [...distances.entries()]
    .filter(([id, dist]) => {
      if (dist === 0) return false;
      const node = state.map.nodes.find(n => n.id === id);
      return node && node.type !== 'home' && node.status !== 'compromised' && node.status !== 'disrupted';
    })
    .map(([id, dist]) => ({ id, dist }));
}

function _pickTargetNode(tier) {
  const reachable = _nodesWithinHops(tier);
  if (!reachable.length) return null;
  const preferred = reachable.filter(n => n.dist === tier);
  const pool      = preferred.length ? preferred : reachable;
  const { id }    = pool[Math.floor(Math.random() * pool.length)];
  return state.map.nodes.find(n => n.id === id);
}

// ── Contract generation ───────────────────────────────────

function _pickTier() {
  const comp = (state.map?.nodes || []).filter(n => n.status === 'compromised').length;
  if (comp < 3) return 1;
  if (comp < 6) return Math.random() < 0.7 ? 1 : 2;
  const r = Math.random();
  return r < 0.3 ? 1 : r < 0.7 ? 2 : 3;
}

function _generateContract() {
  const tier   = _pickTier();
  const sender = _CONTRACT_SENDERS[Math.floor(Math.random() * _CONTRACT_SENDERS.length)];

  const hasNetworkTool = state.scripts['ssh_brute'] || state.scripts['exploit_kit'];
  const types = ['hash_crack', 'hash_crack'];
  if (hasNetworkTool && _nodesWithinHops(tier).length > 0) {
    types.push('exfil', 'backdoor', 'disrupt');
    const stealthScript = ['stealth_basic', 'ghost_protocol', 'phantom_kernel'][tier - 1];
    if (state.scripts[stealthScript]) types.push('stealth_op');
  }

  const contractType = types[Math.floor(Math.random() * types.length)];

  const REWARDS   = { hash_crack:[280,700,1800],  exfil:[400,1000,2800],  backdoor:[600,1500,4000],  disrupt:[350,900,2500],  stealth_op:[700,1800,5000]  };
  const DEADLINES = { hash_crack:[120,200,300],    exfil:[180,300,480],    backdoor:[360,540,900],    disrupt:[180,300,480],    stealth_op:[200,360,540]    };

  const reward   = REWARDS[contractType][tier - 1] + Math.floor(Math.random() * 80);
  const deadline = DEADLINES[contractType][tier - 1];
  const subject  = _CONTRACT_SUBJECTS[contractType][Math.floor(Math.random() * _CONTRACT_SUBJECTS[contractType].length)];

  let body = '', extra = {};

  if (contractType === 'hash_crack') {
    const hashCount = [3, 5, 8][tier - 1];
    body  = _CONTRACT_BODIES.hash_crack(tier);
    extra = { hashCount, hashesAtAccept: null };

  } else if (contractType === 'exfil' || contractType === 'stealth_op') {
    const target = _pickTargetNode(tier);
    if (!target) return null;
    body  = _CONTRACT_BODIES[contractType](tier, target.label);
    extra = { targetNodeId: target.id, targetNodeLabel: target.label, targetNodeType: target.type };
    if (contractType === 'stealth_op') {
      extra.requiredScript = ['stealth_basic', 'ghost_protocol', 'phantom_kernel'][tier - 1];
    }

  } else if (contractType === 'backdoor') {
    const target   = _pickTargetNode(tier);
    if (!target) return null;
    const holdMins = [10, 20, 45][tier - 1];
    body  = _CONTRACT_BODIES.backdoor(tier, target.label, `${holdMins} min`);
    extra = { targetNodeId: target.id, targetNodeLabel: target.label, targetNodeType: target.type, holdDuration: holdMins * 60000, holdStartedAt: null };

  } else if (contractType === 'disrupt') {
    const target      = _pickTargetNode(tier);
    if (!target) return null;
    const disruptMins = [5, 10, 20][tier - 1];
    body  = _CONTRACT_BODIES.disrupt(tier, target.label, disruptMins);
    extra = { targetNodeId: target.id, targetNodeLabel: target.label, targetNodeType: target.type, disruptDuration: disruptMins * 60000, disruptStartedAt: null };
  }

  return { from: sender, subject, body, reward, duration: deadline, expiresIn: deadline * 2, tier, contractType, followUp: 'Opportunity closed.', ...extra };
}

// ── Message management ────────────────────────────────────

function spawnMessage(contract) {
  const now = Date.now();
  state.messages.push({
    id: `msg_${now}_${Math.random().toString(36).slice(2, 5)}`,
    type: 'contract', status: 'unread',
    followUpBody: null, followUpAt: null, followUpUnread: false,
    spawnedAt: now, acceptedAt: null, completesAt: null,
    ...contract,
    expiresAt: now + (contract.expiresIn || 300) * 1000,
  });
}

function acceptContract(msgId) {
  const msg = state.messages.find(m => m.id === msgId);
  if (!msg || msg.type !== 'contract') return;
  if (msg.status !== 'unread' && msg.status !== 'read') return;
  if (msg.contractType === 'stealth_op' && !state.scripts[msg.requiredScript]) return;
  msg.status     = 'active';
  msg.acceptedAt = Date.now();
  msg.completesAt = Date.now() + getContractDuration(msg.duration);
  if (msg.contractType === 'hash_crack') {
    msg.hashesAtAccept = state.totalHashesCracked;
    const valueRanges = [[50, 200], [150, 500], [400, 1200]];
    const [min, max]  = valueRanges[(msg.tier || 1) - 1];
    const now2        = Date.now();
    for (let i = 0; i < msg.hashCount; i++) {
      state.inventory.hashes.push({
        id:            `hash_${now2}_${Math.random().toString(36).slice(2, 6)}`,
        nodeLabel:     `ANON-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        nodeType:      'pc',
        value:         Math.floor(Math.random() * (max - min + 1) + min),
        status:        'pending',
        contractHash:  true,
        foundAt:       now2,
        crackStartedAt: null,
        cracksAt:       null,
      });
    }
  }
  renderCards();
}

function declineContract(msgId) {
  const msg = state.messages.find(m => m.id === msgId);
  if (!msg) return;
  msg.status = 'declined';
  renderCards();
}

function expireMessage(msg) {
  msg.status = 'expired';
  if (msg.followUp) { msg.followUpBody = msg.followUp; msg.followUpAt = Date.now(); msg.followUpUnread = true; }
}

function completeContract(msgId) {
  const msg = state.messages.find(m => m.id === msgId);
  if (!msg || msg.status !== 'active') return;
  msg.status = 'completed';
  state.balance += msg.reward;
  msg.followUpBody   = `Job confirmed. Payment processed — ${formatMoney(msg.reward)}.\n\nGood work. We'll be in touch.`;
  msg.followUpAt     = Date.now();
  msg.followUpUnread = true;
}

function failContract(msgId) {
  const msg = state.messages.find(m => m.id === msgId);
  if (!msg || msg.status !== 'active') return;
  msg.status         = 'failed';
  msg.followUpBody   = `Deadline missed. Don't waste my time again.`;
  msg.followUpAt     = Date.now();
  msg.followUpUnread = true;
}

// ── Condition checks ──────────────────────────────────────

function _checkContractConditions(msg) {
  switch (msg.contractType) {
    case 'hash_crack':
      return msg.hashesAtAccept !== null && state.totalHashesCracked - msg.hashesAtAccept >= msg.hashCount;

    case 'exfil':
    case 'stealth_op': {
      const node = state.map?.nodes.find(n => n.id === msg.targetNodeId);
      return !!(node?.status === 'compromised' && node.searchedAt > msg.acceptedAt);
    }

    case 'backdoor': {
      const node = state.map?.nodes.find(n => n.id === msg.targetNodeId);
      if (!node || node.status !== 'compromised') { msg.holdStartedAt = null; return false; }
      if (!msg.holdStartedAt) {
        msg.holdStartedAt = Date.now();
        msg.completesAt = msg.holdStartedAt + msg.holdDuration + 30000;
      }
      return Date.now() - msg.holdStartedAt >= msg.holdDuration;
    }

    case 'disrupt': {
      const node = state.map?.nodes.find(n => n.id === msg.targetNodeId);
      if (!node || node.status !== 'disrupted') { msg.disruptStartedAt = null; return false; }
      if (!msg.disruptStartedAt) {
        msg.disruptStartedAt = Date.now();
        msg.completesAt = msg.disruptStartedAt + msg.disruptDuration + 30000;
      }
      return Date.now() - msg.disruptStartedAt >= msg.disruptDuration;
    }

    default: return false;
  }
}

// Contract tick — every second
let _lastContractSpawnTime = 0;

setInterval(() => {
  const now     = Date.now();
  const elapsed = now - state.gameStartTime;
  let changed   = false;

  const pending = state.messages.filter(m => m.status === 'unread' || m.status === 'read').length;
  if (elapsed >= 12000 && pending < 3 && now - _lastContractSpawnTime >= 35000) {
    const contract = _generateContract();
    if (contract) { spawnMessage(contract); _lastContractSpawnTime = now; changed = true; }
  }

  for (const msg of [...state.messages]) {
    if ((msg.status === 'unread' || msg.status === 'read') && msg.expiresAt && now >= msg.expiresAt) {
      expireMessage(msg); changed = true;
    }
    if (msg.status === 'active') {
      if (msg.contractType && _checkContractConditions(msg)) {
        completeContract(msg.id); changed = true; continue;
      }
      if (msg.completesAt && now >= msg.completesAt) {
        msg.contractType ? failContract(msg.id) : completeContract(msg.id);
        changed = true;
      }
    }
  }

  if (state.map) {
    for (const node of state.map.nodes) {
      if (node.status !== 'disrupted') continue;
      const active = state.messages.some(m => m.status === 'active' && m.contractType === 'disrupt' && m.targetNodeId === node.id);
      if (!active) { node.status = 'compromised'; changed = true; }
    }
  }

  if (changed) renderCards();
  if (typeof updateMessageBadge === 'function') updateMessageBadge();
}, 1000);

// ── Main Tick ────────────────────────────────────────────

function affordSnapshot() {
  const hw = ['cpu', 'ram', 'gpu'].map(type => {
    const next = HARDWARE[type].tiers[state.hardware[type] + 1];
    return next ? (state.balance >= next.cost ? '1' : '0') : 'x';
  }).join('');
  const progs = PROGRAMS.map(p =>
    isProgramOwned(p.id) ? 'o' : (state.balance >= p.cost ? '1' : '0')
  ).join('');
  const scripts = SCRIPTS.map(s =>
    state.scripts[s.id] ? 'o' : (state.balance >= s.cost ? '1' : '0')
  ).join('');
  return hw + progs + scripts;
}

let _lastAffordSnapshot = '';

setInterval(() => {
  state.balance += getIncomePerSec() / 10;
  renderUI();
  const snap = affordSnapshot();
  if (snap !== _lastAffordSnapshot) {
    _lastAffordSnapshot = snap;
    renderCards();
  }
}, 100);
