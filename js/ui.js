let activeView = 'dashboard';
let selectedMessageId = null;
let _bmTab = 'buy';
let _bmFilter = 'all';
const _expandedStatuses = new Set();

const NODE_TYPE_COLORS = {
  pc:      '#4ade80',
  server:  '#a78bfa',
  company: '#f59e0b',
};

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

// ── Map summary (sidebar) ────────────────────────────────

const _MAP_SUMMARY_STATUSES = [
  { key: 'compromised', label: 'COMPROMISED', color: '#4ade80' },
  { key: 'scanning',    label: 'SCANNING',    color: '#a78bfa' },
  { key: 'hacking',     label: 'EXPLOITING',  color: '#fb923c' },
  { key: 'discovered',  label: 'DISCOVERED',  color: 'var(--text-secondary)' },
  { key: 'disrupted',   label: 'DISRUPTED',   color: '#f59e0b' },
  { key: 'offline',     label: 'OFFLINE',     color: '#f87171' },
];

function toggleMapSummary(status) {
  _expandedStatuses.has(status) ? _expandedStatuses.delete(status) : _expandedStatuses.add(status);
  updateMapSummary();
}

function updateMapSummary() {
  const el = document.getElementById('map-summary');
  if (!el) return;

  if (!state.map?.nodes) { el.innerHTML = ''; return; }

  const nodes = state.map.nodes.filter(n => n.type !== 'home' && n.status !== 'unknown');
  const groups = _MAP_SUMMARY_STATUSES
    .map(cfg => ({ ...cfg, nodes: nodes.filter(n => n.status === cfg.key) }))
    .filter(g => g.nodes.length > 0);

  if (groups.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div class="map-summary-inner">
      ${groups.map(g => {
        const expanded = _expandedStatuses.has(g.key);
        return `
          <div class="map-summary-group">
            <div class="map-summary-row" onclick="toggleMapSummary('${g.key}')">
              <span class="map-summary-dot" style="background:${g.color}"></span>
              <span class="map-summary-label">${g.label}</span>
              <span class="map-summary-count">${g.nodes.length}</span>
              <span class="map-summary-arrow">${expanded ? '▾' : '▸'}</span>
            </div>
            ${expanded ? `
              <div class="map-summary-nodes">
                ${g.nodes.map(n => {
                  const c = NODE_TYPE_COLORS[n.type] || 'var(--text-muted)';
                  return `<div class="map-summary-node" style="color:${c}" onclick="focusMapNode('${n.id}')">${n.label}</div>`;
                }).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
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

  const resEl = document.getElementById('sidebar-resources');
  if (resEl) {
    const used = getUsedResources();
    resEl.innerHTML = ['cpu', 'ram', 'gpu'].map(type => {
      const cap = getCapacity(type);
      const u   = used[type];
      const pct = cap > 0 ? (u / cap) * 100 : 0;
      const cls = pct >= 100 ? ' full' : pct > 70 ? ' high' : '';
      return `
        <div class="sidebar-res-row">
          <span class="sidebar-res-label">${HARDWARE[type].name}</span>
          <div class="resource-track sidebar-res-track">
            <div class="resource-fill${cls}" style="width:${pct}%"></div>
          </div>
          <span class="sidebar-res-reading">${u}/${cap}</span>
        </div>`;
    }).join('');
  }

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
  updateMapSummary();
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
  const activeOps    = OPERATIONS.filter(op => isOperationActive(op)).length;
  const ownedPrograms = new Set([...state.programs.inventory, ...getEquippedProgramIds()]).size;
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
        <div class="stat-tile-label">Programs</div>
        <div class="stat-tile-value">${ownedPrograms}<span class="stat-sub"> / ${PROGRAMS.length}</span></div>
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
    const active    = isOperationActive(op);
    const status    = active ? 'ok' : getOpStatus(op);
    const canToggle = active || status === 'ok';

    let statusHint = '';
    if (status === 'no-script') {
      const script = getScript(op.requiredScript);
      statusHint = `<div class="status-hint">Requires <span class="filename">${script ? script.filename : '???'}</span></div>`;
    } else if (status === 'no-resources') {
      const costs = getOpCosts(op);
      const used  = getUsedResources();
      const lacking = [];
      if (costs?.cpu && used.cpu + costs.cpu > getCapacity('cpu')) lacking.push(`CPU ${costs.cpu}`);
      if (costs?.ram && used.ram + costs.ram > getCapacity('ram')) lacking.push(`RAM ${costs.ram}GB`);
      if (costs?.gpu && used.gpu + costs.gpu > getCapacity('gpu')) lacking.push(`GPU ${costs.gpu}GB`);
      statusHint = `<div class="status-hint warn">Insufficient: ${lacking.join(', ')}</div>`;
    }

    const costs = getOpCosts(op);
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
        <button class="btn ${active ? 'btn-stop' : canToggle ? 'btn-primary' : 'btn-disabled'}"
          onclick="toggleOperation('${op.id}')" ${canToggle ? '' : 'disabled'}>${active ? 'STOP' : 'RUN'}</button>
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
  stealth: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z"/>
    <path d="M12 8v4l3 3"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
  </svg>`,
};

const STAT_LABELS = {
  incomeMultiplier:   v => `Income ×${v}`,
  contractSpeedBonus: v => `Speed ×${v}`,
  parallelCracks:     v => `${v} crack slots`,
  exposureDecay:      v => `-${v}/s exposure`,
};

function setBMTab(tab) {
  _bmTab = tab;
  renderBlackMarketView();
}

function setBMFilter(filter) {
  _bmFilter = filter;
  renderBlackMarketView();
}

function _renderBMSellTab() {
  const hashes = (state.inventory?.hashes || []).filter(h => h.status === 'done' && !h.contractHash);
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

function _renderBMItemCard(item, owned, onBuy, canAfford) {
  const color = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
  const reqs = [
    item.cpu ? `<span class="req">CPU ${item.cpu}</span>` : '',
    item.ram ? `<span class="req">RAM ${item.ram}GB</span>` : '',
    item.gpu ? `<span class="req">GPU ${item.gpu}GB</span>` : '',
  ].filter(Boolean).join('');
  const stats = Object.entries(item.stats || {})
    .map(([k, v]) => STAT_LABELS[k] ? `<span class="stat-badge">${STAT_LABELS[k](v)}</span>` : '')
    .filter(Boolean).join('');

  return `
    <div class="bm-card bm-card-${item.rarity}${owned ? ' bm-card-owned' : ''}">
      <div class="bm-card-top">
        <span class="bm-card-name" style="color:${color}">${item.filename}</span>
        <span class="bm-card-cat">${item.category}</span>
      </div>
      <div class="bm-card-desc">${item.description}</div>
      <div class="bm-card-badges">${stats}${reqs}</div>
      <div class="bm-card-footer">
        ${owned
          ? `<span class="bm-card-installed">OWNED</span>`
          : `<span class="bm-card-price">${formatMoney(item.cost)}</span>
             <button class="btn ${canAfford ? 'btn-market' : 'btn-disabled'} bm-card-btn"
               onclick="${onBuy}" ${canAfford ? '' : 'disabled'}>${canAfford ? 'ACQUIRE' : 'NO FUNDS'}</button>`
        }
      </div>
    </div>
  `;
}

function renderBlackMarketView() {
  const body = document.getElementById('shop-body');
  if (!body) return;

  body.innerHTML = `
    <div class="store-header bm-header">
      <div class="store-brand">
        <div class="store-name bm-name">sh4dow.market</div>
        <div class="store-tagline">Anonymous exchange &mdash; no questions asked</div>
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

    ${_bmTab === 'sell' ? _renderBMSellTab() : (() => {
      const filters = [
        { key: 'all',        label: 'ALL'        },
        { key: 'automation', label: 'AUTOMATION' },
        { key: 'contract',   label: 'CONTRACT'   },
        { key: 'network',    label: 'NETWORK'    },
        { key: 'stealth',    label: 'STEALTH'    },
        { key: 'common',     label: 'COMMON',    rarity: true },
        { key: 'uncommon',   label: 'UNCOMMON',  rarity: true },
        { key: 'rare',       label: 'RARE',      rarity: true },
        { key: 'legendary',  label: 'LEGENDARY', rarity: true },
      ];

      const filterBar = `
        <div class="bm-filter-bar">
          <div class="bm-filter-group">
            ${filters.filter(f => !f.rarity).map(f => `
              <button class="bm-filter-btn${_bmFilter === f.key ? ' active' : ''}"
                onclick="setBMFilter('${f.key}')">${f.label}</button>
            `).join('')}
          </div>
          <div class="bm-filter-sep"></div>
          <div class="bm-filter-group">
            ${filters.filter(f => f.rarity).map(f => `
              <button class="bm-filter-btn bm-filter-rarity bm-filter-rarity-${f.key}${_bmFilter === f.key ? ' active' : ''}"
                onclick="setBMFilter('${f.key}')">${f.label}</button>
            `).join('')}
          </div>
        </div>
      `;

      // Programs (equippable)
      const visibleProgs = PROGRAMS.filter(p => {
        if (_bmFilter === 'all') return true;
        const f = filters.find(fi => fi.key === _bmFilter);
        if (f?.rarity) return p.rarity === _bmFilter;
        return p.category === _bmFilter;
      });

      // Scripts — filter same as programs
      const visibleScripts = SCRIPTS.filter(s => {
        if (_bmFilter === 'all') return true;
        const f = filters.find(fi => fi.key === _bmFilter);
        if (f?.rarity) return s.rarity === _bmFilter;
        return s.category === _bmFilter;
      });

      const progsHtml = visibleProgs.length > 0 ? `
        <div class="bm-section-label">PROGRAMS <span class="bm-section-sub">— equip in Programs tab</span></div>
        <div class="bm-grid">
          ${visibleProgs.map(p => {
            const owned     = isProgramOwned(p.id);
            const canAfford = !owned && state.balance >= p.cost;
            return _renderBMItemCard(p, owned, `buyProgram('${p.id}')`, canAfford);
          }).join('')}
        </div>
      ` : '';

      const scriptsHtml = visibleScripts.length > 0 ? `
        <div class="bm-section-label" style="margin-top:20px">SCRIPTS <span class="bm-section-sub">— hacking tools &amp; automation</span></div>
        <div class="bm-grid">
          ${visibleScripts.map(s => {
            const owned     = !!state.scripts[s.id];
            const canAfford = !owned && state.balance >= s.cost;
            return _renderBMItemCard(s, owned, `buyScript('${s.id}')`, canAfford);
          }).join('')}
        </div>
      ` : '';

      const emptyHtml = !progsHtml && !scriptsHtml
        ? `<div class="bm-grid-empty">Nothing matches this filter.</div>` : '';

      return filterBar + progsHtml + scriptsHtml + emptyHtml;
    })()}
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
  failed:    { text: 'FAILED',    cls: 'tag-red'     },
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

  // Contract type metadata
  const CONTRACT_TYPE_INFO = {
    hash_crack:  { label: 'HASH CRACK',  color: 'var(--accent)'         },
    exfil:       { label: 'EXFIL',       color: 'var(--violet)'         },
    backdoor:    { label: 'BACKDOOR',    color: 'var(--orange)'         },
    disrupt:     { label: 'DISRUPT',     color: 'var(--red)'            },
    stealth_op:  { label: 'GHOST OP',   color: 'var(--green)'          },
  };
  const typeInfo = msg.contractType ? CONTRACT_TYPE_INFO[msg.contractType] : null;

  // Stealth validation
  const stealthBlocked = msg.contractType === 'stealth_op' && isPending && !state.scripts[msg.requiredScript];
  const stealthScript  = msg.requiredScript ? SCRIPTS.find(s => s.id === msg.requiredScript) : null;

  // Toolbar buttons
  let toolbarHtml = '';
  if (isContract && isPending) {
    toolbarHtml = stealthBlocked
      ? `<span class="email-status-pill pill-dead">Requires ${stealthScript?.filename || msg.requiredScript}</span>
         <button class="email-btn email-btn-ghost" onclick="declineContract('${msg.id}')">Decline</button>`
      : `<button class="email-btn email-btn-primary" onclick="acceptContract('${msg.id}')">Accept job</button>
         <button class="email-btn email-btn-ghost" onclick="declineContract('${msg.id}')">Decline</button>`;
  } else if (isActive) {
    toolbarHtml = `<span class="email-status-pill pill-running">Running…</span>`;
  } else if (msg.status === 'completed') {
    toolbarHtml = `<span class="email-status-pill pill-done">Paid — ${formatMoney(msg.reward)}</span>`;
  } else if (msg.status === 'failed') {
    toolbarHtml = `<span class="email-status-pill pill-dead">Failed</span>`;
  } else if (msg.status === 'expired') {
    toolbarHtml = `<span class="email-status-pill pill-dead">Expired</span>`;
  } else if (msg.status === 'declined') {
    toolbarHtml = `<span class="email-status-pill pill-dead">Declined</span>`;
  }

  // Progress section
  let progressHtml = '';
  if (isActive) {
    const deadlineRemaining = Math.max(0, Math.ceil((msg.completesAt - now) / 1000));

    if (msg.contractType === 'hash_crack') {
      const cracked = Math.min(msg.hashCount, state.totalHashesCracked - (msg.hashesAtAccept || 0));
      const pct     = Math.min(100, (cracked / msg.hashCount) * 100);
      progressHtml = `
        <div class="email-progress">
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="email-progress-label">${cracked} / ${msg.hashCount} cracked · ${deadlineRemaining}s left</span>
        </div>
      `;
    } else if (msg.contractType === 'exfil' || msg.contractType === 'stealth_op') {
      const targetNode = state.map?.nodes.find(n => n.id === msg.targetNodeId);
      const done = targetNode?.status === 'compromised' && targetNode?.searchedAt > msg.acceptedAt;
      progressHtml = `
        <div class="email-progress">
          <div class="progress-track">
            <div class="progress-fill" style="width:${done ? 100 : 0}%"></div>
          </div>
          <span class="email-progress-label">${done ? 'Data retrieved — completing…' : `Infiltrate ${msg.targetNodeLabel} and search files · ${deadlineRemaining}s left`}</span>
        </div>
      `;
    } else if (msg.contractType === 'backdoor') {
      const held  = msg.holdStartedAt ? Math.min(msg.holdDuration, Date.now() - msg.holdStartedAt) : 0;
      const pct   = Math.min(100, (held / msg.holdDuration) * 100);
      const heldS = Math.floor(held / 1000);
      const totS  = Math.floor(msg.holdDuration / 1000);
      progressHtml = `
        <div class="email-progress">
          <div class="progress-track">
            <div class="progress-fill" id="progress-${msg.id}" style="width:${pct}%"></div>
          </div>
          <span class="email-progress-label" id="progress-text-${msg.id}">${msg.holdStartedAt ? `${heldS}s / ${totS}s held` : `Compromise ${msg.targetNodeLabel} to start timer`} · ${deadlineRemaining}s deadline</span>
        </div>
      `;
    } else if (msg.contractType === 'disrupt') {
      const disrupted = msg.disruptStartedAt ? Math.min(msg.disruptDuration, Date.now() - msg.disruptStartedAt) : 0;
      const pct       = Math.min(100, (disrupted / msg.disruptDuration) * 100);
      const disS      = Math.floor(disrupted / 1000);
      const totS      = Math.floor(msg.disruptDuration / 1000);
      progressHtml = `
        <div class="email-progress">
          <div class="progress-track">
            <div class="progress-fill" id="progress-${msg.id}" style="background:var(--gold);width:${pct}%"></div>
          </div>
          <span class="email-progress-label" id="progress-text-${msg.id}">${msg.disruptStartedAt ? `${disS}s / ${totS}s disrupted` : `Disrupt ${msg.targetNodeLabel} from the Map`} · ${deadlineRemaining}s deadline</span>
        </div>
      `;
    } else {
      const total   = msg.completesAt - msg.acceptedAt;
      const elapsed = now - msg.acceptedAt;
      const pct     = Math.min(100, (elapsed / total) * 100);
      progressHtml = `
        <div class="email-progress">
          <div class="progress-track">
            <div class="progress-fill" id="progress-${msg.id}" style="width:${pct}%"></div>
          </div>
          <span class="email-progress-label" id="progress-text-${msg.id}">${deadlineRemaining}s remaining</span>
        </div>
      `;
    }
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
    const targetHtml = msg.targetNodeLabel ? (() => {
      const nodeColor = NODE_TYPE_COLORS[msg.targetNodeType] || 'var(--text-secondary)';
      const typeLabel = { pc: 'Workstation', server: 'Server', company: 'Corp Server' }[msg.targetNodeType] || msg.targetNodeType || '';
      return `<div class="email-meta-row">
           <span class="email-meta-key">Target</span>
           <span class="email-meta-val">
             <span style="font-family:'JetBrains Mono',monospace;color:${nodeColor}">${msg.targetNodeLabel}</span>
             <span style="color:${nodeColor};opacity:0.6;font-size:10px;margin-left:4px">${typeLabel}</span>
           </span>
         </div>`;
    })() : '';
    const hashCountHtml = msg.hashCount
      ? `<div class="email-meta-row">
           <span class="email-meta-key">Hashes</span>
           <span class="email-meta-val">${msg.hashCount} to crack</span>
         </div>`
      : '';
    const stealthReqHtml = msg.requiredScript
      ? `<div class="email-meta-row">
           <span class="email-meta-key">Requires</span>
           <span class="email-meta-val${stealthBlocked ? ' warn' : ''}"><span class="filename">${stealthScript?.filename || msg.requiredScript}</span></span>
         </div>`
      : '';
    metaHtml = `
      <div class="email-meta-block">
        ${typeInfo ? `<div class="email-meta-row">
          <span class="email-meta-key">Type</span>
          <span class="email-meta-val" style="color:${typeInfo.color}">${typeInfo.label}${msg.tier ? ` · Tier ${msg.tier}` : ''}</span>
        </div>` : ''}
        <div class="email-meta-row">
          <span class="email-meta-key">Reward</span>
          <span class="email-meta-val green">${formatMoney(msg.reward)}</span>
        </div>
        <div class="email-meta-row">
          <span class="email-meta-key">Deadline</span>
          <span class="email-meta-val">~${msg.duration}s</span>
        </div>
        ${targetHtml}
        ${hashCountHtml}
        ${stealthReqHtml}
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

  for (const msg of state.messages) {
    if (msg.status === 'active') {
      const fill     = document.getElementById(`progress-${msg.id}`);
      const text     = document.getElementById(`progress-text-${msg.id}`);
      const deadline = Math.max(0, Math.ceil((msg.completesAt - now) / 1000));

      if (msg.contractType === 'backdoor' && fill && text) {
        const held = msg.holdStartedAt ? Math.min(msg.holdDuration, now - msg.holdStartedAt) : 0;
        fill.style.width = `${Math.min(100, (held / msg.holdDuration) * 100)}%`;
        text.textContent = msg.holdStartedAt
          ? `${Math.floor(held/1000)}s / ${Math.floor(msg.holdDuration/1000)}s held · ${deadline}s deadline`
          : `Compromise ${msg.targetNodeLabel} to start timer · ${deadline}s deadline`;

      } else if (msg.contractType === 'disrupt' && fill && text) {
        const dis = msg.disruptStartedAt ? Math.min(msg.disruptDuration, now - msg.disruptStartedAt) : 0;
        fill.style.width = `${Math.min(100, (dis / msg.disruptDuration) * 100)}%`;
        text.textContent = msg.disruptStartedAt
          ? `${Math.floor(dis/1000)}s / ${Math.floor(msg.disruptDuration/1000)}s disrupted · ${deadline}s deadline`
          : `Disrupt ${msg.targetNodeLabel} from the Map · ${deadline}s deadline`;

      } else if (fill && text && !msg.contractType) {
        const total = msg.completesAt - msg.acceptedAt;
        fill.style.width = `${Math.min(100, ((now - msg.acceptedAt) / total) * 100)}%`;
        text.textContent = deadline > 0 ? `${deadline}s remaining` : 'Completing...';
      }
    }

    if ((msg.status === 'read' || msg.status === 'unread') && msg.expiresAt) {
      const el = document.getElementById(`expiry-detail-${msg.id}`);
      if (el) el.textContent = formatCountdown(msg.expiresAt - now);
    }
  }
}

// ── Init ─────────────────────────────────────────────────

renderContent();
