let activeView = 'dashboard';
let selectedMessageId = null;
let _bmTab = 'buy';

const RARITY_COLORS = {
  common:    'var(--text-secondary)',
  uncommon:  'var(--green)',
  rare:      'var(--accent)',
  legendary: 'var(--gold)',
};

function formatMoney(amount) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000)     return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Navigation ───────────────────────────────────────────

function setView(view) {
  activeView = view;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  renderContent();
}

// ── Tick updates ─────────────────────────────────────────

function renderUI() {
  document.getElementById('balance').textContent = formatMoney(state.balance);
  document.getElementById('income-rate').textContent = `${formatMoney(getIncomePerSec())}/s`;

  if (activeView === 'dashboard') {
    renderStatsPanel();
    renderResourcesPanel();
    updateActiveContractsProgress();
  } else if (activeView === 'messages') {
    updateMessageTimers();
  } else if (activeView === 'map') {
    updateMapTimers();
  } else if (activeView === 'programs') {
    updateProgramsTimers();
  }

  // Exposure bar (dashboard resources panel)
  const expFill = document.getElementById('exposure-fill');
  const expPct  = document.getElementById('exposure-pct');
  if (expFill) {
    const e = state.exposure;
    expFill.style.width = `${e}%`;
    expFill.className   = `resource-fill${e >= 70 ? ' full' : e >= 40 ? ' high' : ''}`;
  }
  if (expPct) expPct.textContent = `${Math.round(state.exposure)}%`;

  updateMessageBadge();
}

// ── State-change rebuilds ────────────────────────────────

function renderCards() {
  switch (activeView) {
    case 'dashboard':
      renderOperationsPanel();
      renderResourcesPanel();
      renderActiveContractsPanel();
      break;
    case 'hardware':    renderHardwareView();    break;
    case 'blackmarket': renderBlackMarketView(); break;
    case 'messages':
      renderMessageList();
      renderMessageDetail(selectedMessageId);
      break;
    case 'map':
      renderMapView();
      break;
    case 'files':
      renderFilesView();
      break;
    case 'programs':
      renderProgramsView();
      break;
  }
}

// ── Message badge ────────────────────────────────────────

function updateMessageBadge() {
  const count = state.messages.filter(m => m.status === 'unread' || m.followUpUnread).length;
  const badge = document.getElementById('msg-badge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

// ── Content router ───────────────────────────────────────

function _fixShopHeight() {
  const shopBody = document.getElementById('shop-body');
  if (!shopBody) return;
  shopBody.style.flex = 'none';
  shopBody.style.height = Math.floor(window.innerHeight / 1.6) + 'px';
}

function renderContent() {
  const content = document.getElementById('content');

  switch (activeView) {
    case 'dashboard':
      content.innerHTML = `
        <div class="dashboard-grid">
          <div class="panel" id="panel-stats">
            <div class="panel-header">System</div>
            <div id="stats-body"></div>
          </div>
          <div class="panel" id="panel-resources">
            <div class="panel-header">Resources</div>
            <div id="resources-body"></div>
          </div>
          <div class="panel" id="panel-ops">
            <div class="panel-header">Operations</div>
            <div class="ops-body" id="ops-body"></div>
          </div>
          <div class="panel" id="panel-contracts">
            <div class="panel-header">Active Jobs</div>
            <div class="panel-body" id="contracts-body"></div>
          </div>
        </div>
      `;
      renderStatsPanel();
      renderResourcesPanel();
      renderOperationsPanel();
      renderActiveContractsPanel();
      break;

    case 'hardware':
      content.innerHTML = `<div class="shop-view"><div class="shop-body" id="shop-body"></div></div>`;
      renderHardwareView();
      _fixShopHeight();
      break;

    case 'blackmarket':
      content.innerHTML = `<div class="shop-view"><div class="shop-body" id="shop-body"></div></div>`;
      renderBlackMarketView();
      _fixShopHeight();
      break;

    case 'messages':
      content.innerHTML = `
        <div class="messages-view">
          <div class="msg-list-pane" id="msg-list-pane"></div>
          <div class="msg-detail-pane" id="msg-detail-pane"></div>
        </div>
      `;
      renderMessageList();
      renderMessageDetail(selectedMessageId);
      break;

    case 'map':
      renderMapContent();
      break;

    case 'files':
      renderFilesView();
      break;

    case 'programs':
      renderProgramsView();
      break;

    default:
      content.innerHTML = `
        <div class="empty-view">Coming soon.</div>
      `;
  }
}

// ── Dashboard panels ─────────────────────────────────────

function renderStatsPanel() {
  const body = document.getElementById('stats-body');
  if (!body) return;
  const activeOps = OPERATIONS.filter(op => state.operations[op.id]).length;
  const ownedScripts = Object.values(state.scripts).filter(Boolean).length;
  body.innerHTML = `
    <div class="stats-grid">
      <div class="stat-tile">
        <div class="stat-tile-label">Balance</div>
        <div class="stat-tile-value accent">${formatMoney(state.balance)}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">Income</div>
        <div class="stat-tile-value green">${formatMoney(getIncomePerSec())}/s</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">Operations</div>
        <div class="stat-tile-value">${activeOps}<span class="stat-sub"> / ${OPERATIONS.length}</span></div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">Scripts</div>
        <div class="stat-tile-value">${ownedScripts}<span class="stat-sub"> / ${SCRIPTS.length}</span></div>
      </div>
    </div>
  `;
}

function renderResourcesPanel() {
  const body = document.getElementById('resources-body');
  if (!body) return;
  const used = getUsedResources();
  body.innerHTML = `
    <div class="resource-list">
      ${['cpu', 'ram', 'gpu'].map(type => {
        const cap = getCapacity(type);
        const u = used[type];
        const pct = cap > 0 ? (u / cap) * 100 : 0;
        const fillClass = pct >= 100 ? ' full' : pct > 70 ? ' high' : '';
        const tier = HARDWARE[type].tiers[state.hardware[type]].label;
        return `
          <div class="resource-row">
            <div class="resource-meta">
              <span class="resource-name">${HARDWARE[type].name}</span>
              <span class="resource-reading">${u} / ${cap} ${HARDWARE[type].unit}</span>
            </div>
            <div class="resource-track">
              <div class="resource-fill${fillClass}" style="width:${pct}%"></div>
            </div>
            <div class="resource-tier">${tier}</div>
          </div>
        `;
      }).join('')}
      <div class="resource-row">
        <div class="resource-meta">
          <span class="resource-name">Exposure</span>
          <span class="resource-reading" id="exposure-pct">${Math.round(state.exposure)}%</span>
        </div>
        <div class="resource-track">
          <div class="resource-fill" id="exposure-fill" style="width:${state.exposure}%"></div>
        </div>
        <div class="resource-tier">${state.exposure < 40 ? 'Low risk' : state.exposure < 70 ? 'Elevated' : 'Danger'}</div>
      </div>
    </div>
  `;
}

function renderOperationsPanel() {
  const body = document.getElementById('ops-body');
  if (!body) return;
  body.innerHTML = '';

  for (const op of OPERATIONS) {
    const active = !!state.operations[op.id];
    const status = active ? 'ok' : getOpStatus(op);
    const script = op.requiredScript ? getScript(op.requiredScript) : null;
    const costs = getOpCosts(op);
    const canToggle = active || status === 'ok';

    let statusHint = '';
    if (status === 'no-script') {
      statusHint = `<div class="status-hint">Requires <span class="filename">${script ? script.filename : '???'}</span></div>`;
    } else if (status === 'no-resources') {
      const used = getUsedResources();
      const lacking = [];
      if (costs.cpu && used.cpu + costs.cpu > getCapacity('cpu')) lacking.push(`CPU ${costs.cpu}`);
      if (costs.ram && used.ram + costs.ram > getCapacity('ram')) lacking.push(`RAM ${costs.ram}GB`);
      if (costs.gpu && used.gpu + costs.gpu > getCapacity('gpu')) lacking.push(`GPU ${costs.gpu}GB`);
      statusHint = `<div class="status-hint warn">Insufficient: ${lacking.join(', ')}</div>`;
    }

    const reqs = costs ? [
      costs.cpu ? `<span class="req">CPU ${costs.cpu}</span>` : '',
      costs.ram ? `<span class="req">RAM ${costs.ram}GB</span>` : '',
      costs.gpu ? `<span class="req">GPU ${costs.gpu}GB</span>` : '',
    ].join('') : '';

    const card = document.createElement('div');
    card.className = `card${active ? ' active' : ''}${!canToggle ? ' locked' : ''}`;
    card.innerHTML = `
      <div class="card-left">
        <div class="card-title">${op.name}</div>
        <div class="card-desc">${op.description}</div>
        <div class="req-list">${reqs}</div>
        ${statusHint}
      </div>
      <div class="card-right">
        <div class="income-badge">${formatMoney(op.incomePerSec)}<span class="per-sec">/s</span></div>
        <button
          class="btn ${active ? 'btn-stop' : canToggle ? 'btn-primary' : 'btn-disabled'}"
          onclick="toggleOperation('${op.id}')"
          ${canToggle ? '' : 'disabled'}
        >${active ? 'STOP' : 'RUN'}</button>
      </div>
    `;
    body.appendChild(card);
  }
}

// ── Hardware View ────────────────────────────────────────

const HW_ICONS = {
  cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="5" y="5" width="14" height="14" rx="2"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
    <line x1="9" y1="5" x2="9" y2="2"/><line x1="12" y1="5" x2="12" y2="2"/><line x1="15" y1="5" x2="15" y2="2"/>
    <line x1="9" y1="19" x2="9" y2="22"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="15" y1="19" x2="15" y2="22"/>
    <line x1="5" y1="9" x2="2" y2="9"/><line x1="5" y1="12" x2="2" y2="12"/><line x1="5" y1="15" x2="2" y2="15"/>
    <line x1="19" y1="9" x2="22" y2="9"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="19" y1="15" x2="22" y2="15"/>
  </svg>`,
  ram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="2" y="8" width="20" height="9" rx="2"/>
    <rect x="5" y="11" width="2" height="3" rx="0.5" fill="currentColor" stroke="none"/>
    <rect x="9" y="11" width="2" height="3" rx="0.5" fill="currentColor" stroke="none"/>
    <rect x="13" y="11" width="2" height="3" rx="0.5" fill="currentColor" stroke="none"/>
    <rect x="17" y="11" width="2" height="3" rx="0.5" fill="currentColor" stroke="none"/>
    <line x1="10" y1="17" x2="10" y2="20"/><line x1="14" y1="17" x2="14" y2="20"/>
  </svg>`,
  gpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="1" y="7" width="22" height="11" rx="2"/>
    <circle cx="8" cy="12.5" r="2.5"/>
    <circle cx="16" cy="12.5" r="2.5"/>
    <line x1="7" y1="7" x2="7" y2="4"/><line x1="11" y1="7" x2="11" y2="4"/><line x1="15" y1="7" x2="15" y2="4"/><line x1="19" y1="7" x2="19" y2="4"/>
  </svg>`,
};

function renderHardwareView() {
  const body = document.getElementById('shop-body');
  if (!body) return;

  body.innerHTML = `
    <div class="store-header">
      <div class="store-brand">
        <div class="store-name">NEXUS HARDWARE</div>
        <div class="store-tagline">Custom PC Components &amp; Upgrades</div>
      </div>
      <div class="store-wallet">
        <div class="store-wallet-label">AVAILABLE BUDGET</div>
        <div class="store-wallet-amount">${formatMoney(state.balance)}</div>
      </div>
    </div>

    ${['cpu', 'ram', 'gpu'].map(type => {
      const hw = HARDWARE[type];
      const currentTier = state.hardware[type];

      return `
        <div class="store-section">
          <div class="store-section-header">
            <span class="store-section-icon">${HW_ICONS[type]}</span>
            <span class="store-section-name">${hw.section}</span>
          </div>
          <div class="product-grid">
            ${hw.tiers.map((tier, idx) => {
              const tierState = idx < currentTier  ? 'past'
                              : idx === currentTier ? 'current'
                              : idx === currentTier + 1 ? 'next'
                              : 'future';
              const canAfford = state.balance >= tier.cost;

              let actionHtml = '';
              if (tierState === 'past') {
                actionHtml = `<div class="product-badge badge-owned">OWNED</div>`;
              } else if (tierState === 'current') {
                actionHtml = `<div class="product-badge badge-installed">INSTALLED</div>`;
              } else if (tierState === 'next') {
                actionHtml = `
                  <div class="product-price">${formatMoney(tier.cost)}</div>
                  <button
                    class="btn ${canAfford ? 'btn-primary' : 'btn-disabled'} btn-block"
                    onclick="buyHardware('${type}')"
                    ${canAfford ? '' : 'disabled'}
                  >${canAfford ? 'ADD TO BUILD' : 'INSUFFICIENT FUNDS'}</button>
                `;
              } else {
                actionHtml = `
                  <div class="product-price muted">${formatMoney(tier.cost)}</div>
                  <div class="product-badge badge-locked">LOCKED</div>
                `;
              }

              return `
                <div class="product-card tier-${tierState}">
                  <div class="product-icon-wrap">
                    ${HW_ICONS[type]}
                  </div>
                  <div class="product-info">
                    <div class="product-model">${tier.model}</div>
                    <div class="product-spec">${tier.spec}</div>
                  </div>
                  <div class="product-action">${actionHtml}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ── Black Market View ────────────────────────────────────

const SCRIPT_ICONS = {
  automation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <polyline points="8,9 5,12 8,15"/>
    <polyline points="16,9 19,12 16,15"/>
    <line x1="12" y1="7" x2="10" y2="17"/>
  </svg>`,
  contract: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="13" y2="17"/>
    <polyline points="9,9 10,9"/>
  </svg>`,
  network: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M3.6 9h16.8M3.6 15h16.8"/>
    <path d="M12 3c-2.5 3-4 5.7-4 9s1.5 6 4 9M12 3c2.5 3 4 5.7 4 9s-1.5 6-4 9"/>
  </svg>`,
};

const STAT_LABELS = {
  incomeMultiplier:   v => `Income ×${v}`,
  contractSpeedBonus: v => `Speed ×${v}`,
};

function setBMTab(tab) {
  _bmTab = tab;
  renderBlackMarketView();
}

function _renderBMSellTab() {
  const hashes = (state.inventory?.hashes || []).filter(h => h.status === 'done');
  const dumps  = state.inventory?.dumps || [];

  const hashSection = `
    <div class="bm-sell-section">
      <div class="bm-sell-header">
        <span class="bm-sell-title">CRACKED HASHES</span>
        ${hashes.length > 1 ? `<button class="btn btn-primary" style="font-size:10px;padding:4px 10px" onclick="sellAllHashes()">SELL ALL (${formatMoney(hashes.reduce((s,h)=>s+h.value,0))})</button>` : ''}
      </div>
      ${hashes.length === 0
        ? `<div class="bm-sell-empty">No cracked hashes. Run the Hash Cracker in Programs.</div>`
        : hashes.map(h => `
          <div class="bm-sell-row">
            <span class="bm-sell-name">wallet_${h.nodeLabel.toLowerCase()}.hash</span>
            <span class="bm-sell-value">${formatMoney(h.value)}</span>
            <button class="btn btn-primary" style="font-size:10px;padding:4px 10px" onclick="sellHash('${h.id}')">SELL</button>
          </div>
        `).join('')
      }
    </div>
  `;

  const dumpSection = `
    <div class="bm-sell-section">
      <div class="bm-sell-header">
        <span class="bm-sell-title">DATA DUMPS</span>
        ${dumps.length > 1 ? `<button class="btn btn-primary" style="font-size:10px;padding:4px 10px" onclick="sellAllDumps()">SELL ALL (${formatMoney(dumps.reduce((s,d)=>s+d.value,0))})</button>` : ''}
      </div>
      ${dumps.length === 0
        ? `<div class="bm-sell-empty">No data dumps. Search compromised nodes on the Map.</div>`
        : dumps.map(d => `
          <div class="bm-sell-row">
            <span class="bm-sell-name">${d.nodeLabel.toLowerCase()}_dump.dat</span>
            <span class="bm-sell-type">${d.nodeType} data</span>
            <span class="bm-sell-value">${formatMoney(d.value)}</span>
            <button class="btn btn-primary" style="font-size:10px;padding:4px 10px" onclick="sellDump('${d.id}')">SELL</button>
          </div>
        `).join('')
      }
    </div>
  `;

  return hashSection + dumpSection;
}

function renderBlackMarketView() {
  const body = document.getElementById('shop-body');
  if (!body) return;

  const categories = [
    { key: 'automation', label: 'AUTOMATION TOOLS',  desc: 'Passive income scripts. Run continuously in the background.' },
    { key: 'contract',   label: 'CONTRACT TOOLS',    desc: 'One-time job utilities. Speeds up contract completion time.'  },
    { key: 'network',    label: 'NETWORK TOOLS',     desc: 'Node intrusion and exploitation utilities. Used on the Map.'  },
  ];

  body.innerHTML = `
    <div class="store-header bm-header">
      <div class="store-brand">
        <div class="store-name bm-name">sh4dow.market</div>
        <div class="store-tagline">Anonymous script exchange &mdash; no questions asked</div>
      </div>
      <div class="store-wallet">
        <div class="store-wallet-label">AVAILABLE BUDGET</div>
        <div class="store-wallet-amount">${formatMoney(state.balance)}</div>
      </div>
    </div>

    <div class="bm-tabs">
      <button class="bm-tab${_bmTab === 'buy'  ? ' active' : ''}" onclick="setBMTab('buy')">BUY</button>
      <button class="bm-tab${_bmTab === 'sell' ? ' active' : ''}" onclick="setBMTab('sell')">SELL</button>
    </div>

    ${_bmTab === 'sell' ? _renderBMSellTab() : categories.map(cat => {
      const scripts = SCRIPTS.filter(s => s.category === cat.key);
      if (!scripts.length) return '';

      return `
        <div class="store-section">
          <div class="store-section-header">
            <span class="store-section-icon">${SCRIPT_ICONS[cat.key]}</span>
            <div>
              <div class="store-section-name">${cat.label}</div>
              <div class="store-section-desc">${cat.desc}</div>
            </div>
          </div>
          <div class="product-grid bm-grid">
            ${scripts.map(script => {
              const owned      = !!state.scripts[script.id];
              const canAfford  = !owned && state.balance >= script.cost;
              const rarityColor = RARITY_COLORS[script.rarity] || RARITY_COLORS.common;

              const reqs = [
                script.cpu ? `<span class="req">CPU ${script.cpu}</span>` : '',
                script.ram ? `<span class="req">RAM ${script.ram}GB</span>` : '',
                script.gpu ? `<span class="req">GPU ${script.gpu}GB</span>` : '',
              ].filter(Boolean).join('');

              const stats = Object.entries(script.stats || {})
                .map(([k, v]) => STAT_LABELS[k] ? `<span class="stat-badge">${STAT_LABELS[k](v)}</span>` : '')
                .filter(Boolean).join('');

              return `
                <div class="product-card bm-card${owned ? ' bm-owned' : ''}">
                  <div class="bm-card-top">
                    <div class="bm-icon-wrap rarity-bg-${script.rarity}">
                      ${SCRIPT_ICONS[script.category]}
                    </div>
                    <div class="bm-card-meta">
                      <div class="bm-filename" style="color:${rarityColor}">${script.filename}</div>
                      <div class="bm-tags">
                        <span class="rarity-tag rarity-${script.rarity}">${script.rarity}</span>
                      </div>
                    </div>
                  </div>

                  <div class="bm-desc">${script.description}</div>

                  <div class="bm-footer">
                    <div class="req-list">${reqs}${stats}</div>
                    <div class="bm-action">
                      ${owned
                        ? `<div class="product-badge badge-installed">INSTALLED</div>`
                        : `<div class="bm-price">${formatMoney(script.cost)}</div>
                           <button
                             class="btn ${canAfford ? 'btn-market' : 'btn-disabled'} btn-block"
                             onclick="buyScript('${script.id}')"
                             ${canAfford ? '' : 'disabled'}
                           >${canAfford ? 'ACQUIRE' : 'INSUFFICIENT FUNDS'}</button>`
                      }
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ── Active Contracts Panel ───────────────────────────────

function renderActiveContractsPanel() {
  const body = document.getElementById('contracts-body');
  if (!body) return;

  const active = state.messages.filter(m => m.status === 'active');

  if (active.length === 0) {
    body.innerHTML = `<div class="panel-empty">No active jobs.</div>`;
    return;
  }

  const now = Date.now();
  body.innerHTML = active.map(msg => {
    const total     = msg.completesAt - msg.acceptedAt;
    const elapsed   = now - msg.acceptedAt;
    const pct       = Math.min(100, (elapsed / total) * 100);
    const remaining = Math.max(0, Math.ceil((msg.completesAt - now) / 1000));
    return `
      <div class="ac-card">
        <div class="ac-header">
          <span class="ac-from">${msg.from}</span>
          <span class="ac-reward">${formatMoney(msg.reward)}</span>
        </div>
        <div class="ac-subject">${msg.subject}</div>
        <div class="ac-progress-row">
          <div class="progress-track">
            <div class="progress-fill" id="ac-fill-${msg.id}" style="width:${pct}%"></div>
          </div>
          <span class="ac-time" id="ac-time-${msg.id}">${remaining}s</span>
        </div>
      </div>
    `;
  }).join('');
}

function updateActiveContractsProgress() {
  const now = Date.now();
  for (const msg of state.messages) {
    if (msg.status !== 'active') continue;
    const fill = document.getElementById(`ac-fill-${msg.id}`);
    const time = document.getElementById(`ac-time-${msg.id}`);
    if (!fill || !time) continue;
    const total   = msg.completesAt - msg.acceptedAt;
    const elapsed = now - msg.acceptedAt;
    fill.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
    time.textContent = `${Math.max(0, Math.ceil((msg.completesAt - now) / 1000))}s`;
  }
}

// ── Messages View ────────────────────────────────────────

const AVATAR_COLORS = ['#5b9cf6','#4ade80','#a78bfa','#fb923c','#f87171','#34d399','#f59e0b'];

function getAvatar(name) {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return `<div class="msg-avatar" style="background:${color}18;color:${color};border-color:${color}35">${name[0].toUpperCase()}</div>`;
}

function relativeTime(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

const MSG_STATUS_LABELS = {
  active:    { text: 'RUNNING',   cls: 'tag-green'  },
  completed: { text: 'PAID',      cls: 'tag-green'  },
  expired:   { text: 'EXPIRED',   cls: 'tag-muted'  },
  declined:  { text: 'DECLINED',  cls: 'tag-muted'  },
};

function renderMessageList() {
  const pane = document.getElementById('msg-list-pane');
  if (!pane) return;

  const sorted = [...state.messages].sort((a, b) => b.spawnedAt - a.spawnedAt);
  const unreadCount = sorted.filter(m => m.status === 'unread').length;

  const listItems = sorted.length === 0
    ? `<div class="msg-list-empty">No messages.</div>`
    : sorted.map(msg => {
        const isSelected = msg.id === selectedMessageId;
        const isUnread   = msg.status === 'unread' || msg.followUpUnread;
        const tag        = msg.followUpUnread
          ? { text: 'REPLY', cls: 'tag-accent' }
          : (MSG_STATUS_LABELS[msg.status] || null);
        const preview    = msg.followUpUnread && msg.followUpBody
          ? msg.followUpBody.replace(/\n/g, ' ').slice(0, 72) + (msg.followUpBody.length > 72 ? '…' : '')
          : msg.body.replace(/\n/g, ' ').slice(0, 72) + (msg.body.length > 72 ? '…' : '');

        return `
          <div class="msg-row${isSelected ? ' selected' : ''}${isUnread ? ' unread' : ''}"
               onclick="selectMessage('${msg.id}')">
            ${getAvatar(msg.from)}
            <div class="msg-row-body">
              <div class="msg-row-top">
                <span class="msg-row-from">${msg.from}</span>
                <span class="msg-row-time">${relativeTime(msg.spawnedAt)}</span>
              </div>
              <div class="msg-row-subject">${msg.subject}</div>
              <div class="msg-row-preview">${preview}</div>
            </div>
            ${tag ? `<span class="msg-tag ${tag.cls}" style="position:absolute;top:10px;right:10px">${tag.text}</span>` : ''}
          </div>
        `;
      }).join('');

  pane.innerHTML = `
    <div class="msg-pane-header">
      <span class="msg-pane-title">Inbox</span>
      ${unreadCount > 0 ? `<span class="msg-unread-count">${unreadCount} unread</span>` : ''}
    </div>
    <div class="msg-list-scroll">${listItems}</div>
  `;
}

function selectMessage(msgId) {
  selectedMessageId = msgId;
  const msg = state.messages.find(m => m.id === msgId);
  if (msg) {
    if (msg.status === 'unread') msg.status = 'read';
    if (msg.followUpUnread) msg.followUpUnread = false;
    updateMessageBadge();
  }
  renderMessageList();
  renderMessageDetail(msgId);
}

function renderMessageDetail(msgId) {
  const pane = document.getElementById('msg-detail-pane');
  if (!pane) return;

  const msg = msgId ? state.messages.find(m => m.id === msgId) : null;

  if (!msg) {
    pane.innerHTML = `<div class="msg-detail-empty">Select a message to read.</div>`;
    return;
  }

  const now        = Date.now();
  const isContract = msg.type === 'contract';
  const isActive   = msg.status === 'active';
  const isPending  = msg.status === 'unread' || msg.status === 'read';
  const isDone     = !isPending && !isActive;

  // Toolbar buttons
  let toolbarHtml = '';
  if (isContract && isPending) {
    toolbarHtml = `
      <button class="email-btn email-btn-primary" onclick="acceptContract('${msg.id}')">Accept job</button>
      <button class="email-btn email-btn-ghost" onclick="declineContract('${msg.id}')">Decline</button>
    `;
  } else if (isActive) {
    toolbarHtml = `<span class="email-status-pill pill-running">Running…</span>`;
  } else if (msg.status === 'completed') {
    toolbarHtml = `<span class="email-status-pill pill-done">Paid — ${formatMoney(msg.reward)}</span>`;
  } else if (msg.status === 'expired') {
    toolbarHtml = `<span class="email-status-pill pill-dead">Expired</span>`;
  } else if (msg.status === 'declined') {
    toolbarHtml = `<span class="email-status-pill pill-dead">Declined</span>`;
  }

  // Progress bar
  let progressHtml = '';
  if (isActive) {
    const total     = msg.completesAt - msg.acceptedAt;
    const elapsed   = now - msg.acceptedAt;
    const pct       = Math.min(100, (elapsed / total) * 100);
    const remaining = Math.max(0, Math.ceil((msg.completesAt - now) / 1000));
    progressHtml = `
      <div class="email-progress">
        <div class="progress-track">
          <div class="progress-fill" id="progress-${msg.id}" style="width:${pct}%"></div>
        </div>
        <span class="email-progress-label" id="progress-text-${msg.id}">${remaining}s remaining</span>
      </div>
    `;
  }

  // Contract metadata
  let metaHtml = '';
  if (isContract && msg.reward) {
    const expiryHtml = isPending && msg.expiresAt
      ? `<div class="email-meta-row">
           <span class="email-meta-key">Expires in</span>
           <span class="email-meta-val expiry" id="expiry-detail-${msg.id}">${formatCountdown(msg.expiresAt - now)}</span>
         </div>`
      : '';
    metaHtml = `
      <div class="email-meta-block">
        <div class="email-meta-row">
          <span class="email-meta-key">Reward</span>
          <span class="email-meta-val green">${formatMoney(msg.reward)}</span>
        </div>
        <div class="email-meta-row">
          <span class="email-meta-key">Est. duration</span>
          <span class="email-meta-val">~${msg.duration}s</span>
        </div>
        ${expiryHtml}
      </div>
    `;
  }

  const replyHtml = msg.followUpBody ? `
    <div class="email-thread-divider"><span class="email-thread-label">Reply</span></div>
    <div class="email-reply">
      <div class="email-sender-row" style="margin-bottom:0">
        ${getAvatar(msg.from)}
        <div class="email-sender-info">
          <div class="email-sender-name">${msg.from}</div>
          <div class="email-sender-time">${relativeTime(msg.followUpAt)}</div>
        </div>
      </div>
      <div class="email-body" style="margin-bottom:0">${msg.followUpBody.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>
    </div>
  ` : '';

  pane.innerHTML = `
    <div class="email-view">
      <div class="email-toolbar">
        <h2 class="email-subject">${msg.subject}</h2>
        <div class="email-toolbar-actions">${toolbarHtml}</div>
      </div>

      <div class="email-sender-row">
        ${getAvatar(msg.from)}
        <div class="email-sender-info">
          <div class="email-sender-name">${msg.from}</div>
          <div class="email-sender-time">${relativeTime(msg.spawnedAt)}</div>
        </div>
      </div>

      <div class="email-divider"></div>

      <div class="email-body">${msg.body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>

      ${metaHtml}
      ${progressHtml}
      ${replyHtml}
    </div>
  `;
}

function updateMessageTimers() {
  const now = Date.now();

  // Progress bars for active contracts
  for (const msg of state.messages) {
    if (msg.status === 'active') {
      const fill = document.getElementById(`progress-${msg.id}`);
      const text = document.getElementById(`progress-text-${msg.id}`);
      if (fill && text) {
        const total = msg.completesAt - msg.acceptedAt;
        const elapsed = now - msg.acceptedAt;
        fill.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
        const remaining = Math.max(0, Math.ceil((msg.completesAt - now) / 1000));
        text.textContent = remaining > 0 ? `${remaining}s remaining` : 'Completing...';
      }
    }

    // Expiry countdown in detail pane
    if ((msg.status === 'read' || msg.status === 'unread') && msg.expiresAt) {
      const el = document.getElementById(`expiry-detail-${msg.id}`);
      if (el) el.textContent = formatCountdown(msg.expiresAt - now);
    }
  }
}

// ── Init ─────────────────────────────────────────────────

renderContent();
