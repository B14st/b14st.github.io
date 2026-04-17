const state = {
  balance: 75,
  hardware: { cpu: 0, ram: 0, gpu: 0 },
  operations: {},
  scripts: {},
  messages: [],
  map: null,
  exposure: 0,
  inventory: { hashes: [], dumps: [] },
  gameStartTime: Date.now(),
};

// ── Hardware / Resources ─────────────────────────────────

function getCapacity(type) {
  const hw       = HARDWARE[type].tiers[state.hardware[type]].capacity;
  const borrowed = typeof getBorrowedResources === 'function' ? getBorrowedResources()[type] : 0;
  return hw + borrowed;
}

function getScript(scriptId) {
  return SCRIPTS.find(s => s.id === scriptId);
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
  for (const op of OPERATIONS) {
    if (state.operations[op.id]) {
      const costs = getOpCosts(op);
      if (costs) { cpu += costs.cpu; ram += costs.ram; gpu += costs.gpu; }
    }
  }
  return { cpu, ram, gpu };
}

function getOpStatus(op) {
  if (op.requiredScript) {
    const script = getScript(op.requiredScript);
    if (!script || !state.scripts[script.id]) return 'no-script';
  }
  const costs = getOpCosts(op);
  const used = getUsedResources();
  const fits = costs && (
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
  renderCards();
}

function buyScript(id) {
  const script = getScript(id);
  if (!script || state.scripts[id] || state.balance < script.cost) return;
  state.balance -= script.cost;
  state.scripts[id] = true;
  renderCards();
}

// ── Income ───────────────────────────────────────────────

function getIncomePerSec() {
  const globalMultiplier = SCRIPTS.reduce((mult, s) => {
    if (state.scripts[s.id] && s.stats?.incomeMultiplier) {
      return mult * s.stats.incomeMultiplier;
    }
    return mult;
  }, 1);

  const opIncome   = OPERATIONS.reduce((sum, op) => sum + (state.operations[op.id] ? op.incomePerSec : 0), 0);
  const bleedIncome = typeof getBleedIncomePerSec === 'function' ? getBleedIncomePerSec() : 0;
  return (opIncome + bleedIncome) * globalMultiplier;
}

// ── Contract System ──────────────────────────────────────

function getContractDuration(durationSecs) {
  const speedBonus = SCRIPTS.reduce((best, s) => {
    if (state.scripts[s.id] && s.stats?.contractSpeedBonus) {
      return Math.max(best, s.stats.contractSpeedBonus);
    }
    return best;
  }, 1);
  return Math.floor((durationSecs * 1000) / speedBonus);
}

function spawnMessage(contract) {
  state.messages.push({
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    contractId: contract.id,
    type: 'contract',
    status: 'unread',
    from: contract.from,
    subject: contract.subject,
    body: contract.body,
    reward: contract.reward,
    duration: contract.duration,
    followUp: contract.followUp || null,
    followUpBody: null,
    followUpAt: null,
    followUpUnread: false,
    spawnedAt: Date.now(),
    expiresAt: Date.now() + contract.expiresIn * 1000,
    acceptedAt: null,
    completesAt: null,
  });
}

function acceptContract(msgId) {
  const msg = state.messages.find(m => m.id === msgId);
  if (!msg || msg.type !== 'contract') return;
  if (msg.status !== 'unread' && msg.status !== 'read') return;
  msg.status = 'active';
  msg.acceptedAt = Date.now();
  msg.completesAt = Date.now() + getContractDuration(msg.duration);
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
  if (msg.followUp) {
    msg.followUpBody = msg.followUp;
    msg.followUpAt = Date.now();
    msg.followUpUnread = true;
  }
}

function completeContract(msgId) {
  const msg = state.messages.find(m => m.id === msgId);
  if (!msg || msg.status !== 'active') return;
  msg.status = 'completed';
  state.balance += msg.reward;
}

// Contract management tick — every second
setInterval(() => {
  const now = Date.now();
  let changed = false;

  for (const contract of CONTRACTS) {
    const alreadySpawned = state.messages.some(m => m.contractId === contract.id);
    if (!alreadySpawned && now >= state.gameStartTime + contract.spawnDelay * 1000) {
      spawnMessage(contract);
      changed = true;
    }
  }

  for (const msg of [...state.messages]) {
    if ((msg.status === 'unread' || msg.status === 'read') && msg.expiresAt && now >= msg.expiresAt) {
      expireMessage(msg);
      changed = true;
    }
    if (msg.status === 'active' && msg.completesAt && now >= msg.completesAt) {
      completeContract(msg.id);
      changed = true;
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
  const scripts = SCRIPTS.map(s =>
    state.scripts[s.id] ? 'o' : (state.balance >= s.cost ? '1' : '0')
  ).join('');
  return hw + scripts;
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
