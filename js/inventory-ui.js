function renderInventoryView() {
  const body = document.getElementById('inv-body');
  if (!body) return;
  body.innerHTML = _invScriptsSection() + _invCrackSection() + _invDumpsSection();
}

function updateInventoryTimers() {
  if (!state.inventory) return;
  const now = Date.now();
  for (const hash of state.inventory.hashes) {
    if (hash.status !== 'cracking' || !hash.cracksAt) continue;
    const fill = document.getElementById(`crack-fill-${hash.id}`);
    const time = document.getElementById(`crack-time-${hash.id}`);
    if (fill) {
      const total = hash.cracksAt - hash.crackStartedAt;
      fill.style.width = `${Math.min(100, ((now - hash.crackStartedAt) / total) * 100)}%`;
    }
    if (time) time.textContent = `${Math.max(0, Math.ceil((hash.cracksAt - now) / 1000))}s`;
  }
}

// ── Scripts section ───────────────────────────────────────

function _invScriptsSection() {
  const owned = SCRIPTS.filter(s => state.scripts[s.id]);

  const categoryOrder = ['network', 'automation', 'contract'];
  const grouped = {};
  for (const s of owned) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
  const RARITY_COLORS = {
    common:    'var(--text-secondary)',
    uncommon:  'var(--green)',
    rare:      'var(--accent)',
    legendary: 'var(--gold)',
  };
  const STAT_LABELS = {
    contractSpeedBonus: v => `Speed ×${v}`,
    incomeMultiplier:   v => `Income ×${v}`,
    parallelCracks:     v => `${v} crack slot${v > 1 ? 's' : ''}`,
  };

  const categories = categoryOrder.filter(c => grouped[c]?.length);

  if (owned.length === 0) {
    return `
      <div class="store-section">
        <div class="store-section-header">
          <span class="store-section-name">INSTALLED SCRIPTS</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">No scripts installed. Visit the Black Market.</div>
      </div>
    `;
  }

  return categories.map(cat => {
    const scripts = [...(grouped[cat] || [])].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
    const CAT_LABELS = { network: 'NETWORK', automation: 'AUTOMATION', contract: 'CONTRACT' };

    return `
      <div class="store-section">
        <div class="store-section-header">
          <span class="store-section-name">INSTALLED — ${CAT_LABELS[cat] || cat.toUpperCase()}</span>
        </div>
        <div class="inv-script-list">
          ${scripts.map(s => {
            const stats = Object.entries(s.stats || {})
              .map(([k, v]) => STAT_LABELS[k] ? `<span class="stat-badge">${STAT_LABELS[k](v)}</span>` : '')
              .filter(Boolean).join('');
            return `
              <div class="inv-script-row">
                <div class="inv-script-left">
                  <span class="filename-title" style="color:${RARITY_COLORS[s.rarity]}">${s.filename}</span>
                  <div class="inv-script-meta">
                    <span class="rarity-tag rarity-${s.rarity}">${s.rarity}</span>
                    ${stats}
                  </div>
                  <div class="inv-script-desc">${s.description}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ── Crack queue section ───────────────────────────────────

function _invCrackSection() {
  const { slots, speed } = getCrackConfig();
  const hashes  = state.inventory?.hashes || [];
  const active  = hashes.filter(h => h.status === 'cracking');
  const pending = hashes.filter(h => h.status === 'pending');
  const done    = hashes.filter(h => h.status === 'done');
  const now     = Date.now();

  const slotDots = slots > 0
    ? Array.from({ length: slots }, (_, i) =>
        `<div class="crack-slot-dot${i < active.length ? ' active' : ''}"></div>`
      ).join('')
    : '';

  const noHashCracker = slots === 0;

  const activeHtml = active.map(hash => {
    const total     = hash.cracksAt - hash.crackStartedAt;
    const pct       = Math.min(100, ((now - hash.crackStartedAt) / total) * 100);
    const remaining = Math.max(0, Math.ceil((hash.cracksAt - now) / 1000));
    return `
      <div class="inv-hash-card active">
        <div class="inv-hash-top">
          <span class="inv-hash-source">${hash.nodeLabel}</span>
          <span class="inv-hash-value" style="color:var(--text-muted)">???</span>
        </div>
        <div class="inv-hash-progress">
          <div class="progress-track" style="flex:1">
            <div class="progress-fill" id="crack-fill-${hash.id}" style="width:${pct}%"></div>
          </div>
          <span class="inv-hash-time" id="crack-time-${hash.id}">${remaining}s</span>
        </div>
      </div>
    `;
  }).join('');

  const pendingHtml = pending.length > 0 ? `
    <div class="inv-queue-label">Queued (${pending.length})</div>
    ${pending.map(hash => `
      <div class="inv-hash-card pending">
        <span class="inv-hash-source">${hash.nodeLabel}</span>
        <span class="inv-hash-value" style="color:var(--text-muted)">???</span>
      </div>
    `).join('')}
  ` : '';

  const doneHtml = done.map(hash => `
    <div class="inv-hash-card done">
      <span class="inv-hash-source">${hash.nodeLabel}</span>
      <span class="inv-hash-value" style="color:var(--green)">+${formatMoney(hash.value)} collected</span>
    </div>
  `).join('');

  return `
    <div class="store-section">
      <div class="store-section-header">
        <span class="store-section-name">CRACK QUEUE</span>
        ${!noHashCracker ? `
          <div class="crack-slots-wrap">
            <span class="crack-slots-label">${active.length}/${slots} slots</span>
            <div class="crack-slots">${slotDots}</div>
          </div>
        ` : ''}
      </div>
      ${noHashCracker ? `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:${pending.length ? '10px' : '0'}">
          No hash cracker installed — hashes will queue once you acquire one.
        </div>
        ${pendingHtml}
      ` : hashes.length === 0 ? `
        <div style="font-size:12px;color:var(--text-muted)">No hashes in queue. Search compromised nodes on the Map.</div>
      ` : `
        ${activeHtml}
        ${pendingHtml}
        ${doneHtml}
      `}
    </div>
  `;
}

// ── Data dumps section ────────────────────────────────────

function _invDumpsSection() {
  const dumps = state.inventory?.dumps || [];

  const totalValue = dumps.reduce((sum, d) => sum + d.value, 0);

  return `
    <div class="store-section">
      <div class="store-section-header">
        <span class="store-section-name">DATA DUMPS</span>
        ${dumps.length > 1 ? `
          <button class="btn btn-primary" style="font-size:10px;padding:4px 10px"
            onclick="sellAllDumps()">SELL ALL (${formatMoney(totalValue)})</button>
        ` : ''}
      </div>
      ${dumps.length === 0 ? `
        <div style="font-size:12px;color:var(--text-muted)">No data dumps. Search compromised nodes on the Map.</div>
      ` : `
        <div class="inv-dump-list">
          ${dumps.map(dump => `
            <div class="inv-dump-row">
              <div class="inv-dump-left">
                <span class="inv-dump-source">${dump.nodeLabel}</span>
                <span class="inv-dump-type">${dump.nodeType} data</span>
              </div>
              <div class="inv-dump-right">
                <span class="inv-dump-value">${formatMoney(dump.value)}</span>
                <button class="btn btn-primary" style="font-size:10px;padding:4px 10px"
                  onclick="sellDump('${dump.id}')">SELL</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}
