let selectedNodeId = null;

// Persistent pan/zoom state — survives view switches
const mapTransform = { x: 0, y: 0, scale: 1 };

let _mapDragging  = false;
let _mapDragMoved = false;
let _mapDragStart = { x: 0, y: 0, tx: 0, ty: 0 };

const MAP_VB_W = 860;
const MAP_VB_H = 660;

const NODE_COLORS = {
  home:    '#5b9cf6',
  pc:      '#4ade80',
  server:  '#a78bfa',
  company: '#f59e0b',
};

const NODE_STATUS_LABELS = {
  discovered:  { text: 'DISCOVERED',  color: 'var(--text-secondary)' },
  hacking:     { text: 'HACKING...',  color: 'var(--orange)'         },
  compromised: { text: 'COMPROMISED', color: 'var(--green)'          },
  offline:     { text: 'OFFLINE',     color: 'var(--red)'            },
};

// ── Entry points ─────────────────────────────────────────

function renderMapContent() {
  const content = document.getElementById('content');
  _mapDragging = false;
  _mapDragMoved = false;

  const gridLines = (() => {
    let g = '';
    for (let x = 0; x <= MAP_VB_W; x += 40) g += `<line x1="${x}" y1="0" x2="${x}" y2="${MAP_VB_H}"/>`;
    for (let y = 0; y <= MAP_VB_H; y += 40) g += `<line x1="0" y1="${y}" x2="${MAP_VB_W}" y2="${y}"/>`;
    return g;
  })();

  content.innerHTML = `
    <div class="map-view">
      <div class="map-canvas-area">
        <svg id="map-svg" viewBox="0 0 ${MAP_VB_W} ${MAP_VB_H}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${MAP_VB_W}" height="${MAP_VB_H}" fill="#0b1220"/>
          <g opacity="0.04" stroke="#5b9cf6" stroke-width="1">${gridLines}</g>
          <g id="map-canvas"></g>
        </svg>
        <div class="map-controls">
          <button class="map-ctrl-btn" onclick="resetMapView()" title="Reset view">⌂</button>
          <button class="map-ctrl-btn" onclick="stepZoom(1.25)" title="Zoom in">+</button>
          <button class="map-ctrl-btn" onclick="stepZoom(1/1.25)" title="Zoom out">−</button>
        </div>
      </div>
      <div class="map-panel" id="map-panel"></div>
    </div>
  `;

  if (!state.map) generateMap();
  _initMapInteraction();
  renderMapSVG();
  renderMapPanel();
}

// Called by renderCards() when activeView === 'map'
function renderMapView() {
  renderMapSVG();
  renderMapPanel();
}

// ── SVG rendering ─────────────────────────────────────────

function renderMapSVG() {
  const canvas = document.getElementById('map-canvas');
  if (!canvas || !state.map) return;

  const { nodes, edges } = state.map;
  let html = '';

  // Edges
  for (const edge of edges) {
    const a = nodes.find(n => n.id === edge.from);
    const b = nodes.find(n => n.id === edge.to);
    if (!a || !b || (a.status === 'unknown' && b.status === 'unknown')) continue;

    const bothComp   = a.status === 'compromised' && b.status === 'compromised';
    const eitherComp = a.status === 'compromised' || b.status === 'compromised';
    const stroke     = bothComp ? '#2a4a7a' : eitherComp ? '#1e3050' : '#162235';
    const opacity    = (a.status === 'unknown' || b.status === 'unknown') ? 0.25 : bothComp ? 0.7 : 0.4;
    html += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="1.5" opacity="${opacity}"/>`;
  }

  // Nodes
  for (const node of nodes) html += _nodeToSVG(node);

  canvas.innerHTML = html;
  _applyMapTransform();
}

function _nodeToSVG(node) {
  if (node.status === 'unknown') return '';

  const color    = NODE_COLORS[node.type];
  const isHome   = node.type === 'home';
  const r        = isHome ? 13 : 9;
  const selected = node.id === selectedNodeId;

  let fill, strokeOpacity;
  switch (node.status) {
    case 'discovered':  fill = 'none';         strokeOpacity = 0.55; break;
    case 'hacking':     fill = color + '35';   strokeOpacity = 1;    break;
    case 'compromised': fill = color + '25';   strokeOpacity = 1;    break;
    case 'offline':     fill = '#f8717120';    strokeOpacity = 0.5;  break;
    default:            fill = 'none';         strokeOpacity = 0.3;
  }

  const nodeColor = node.status === 'offline' ? '#f87171' : color;
  let out = `<g id="map-node-${node.id}" onclick="selectMapNode('${node.id}')" style="cursor:pointer">`;

  if (selected)              out += `<circle cx="${node.x}" cy="${node.y}" r="${r + 7}" fill="none" stroke="${nodeColor}" stroke-width="1" opacity="0.3"/>`;
  if (node.status === 'hacking') out += `<circle cx="${node.x}" cy="${node.y}" r="${r + 4}" fill="none" stroke="${nodeColor}" stroke-width="1" class="map-pulse"/>`;
  if (node.borrowing || node.bleeding) out += `<circle cx="${node.x}" cy="${node.y}" r="${r + 2}" fill="${nodeColor}" opacity="0.08"/>`;

  out += `<circle cx="${node.x}" cy="${node.y}" r="${r}" fill="${fill}" stroke="${nodeColor}" stroke-width="${isHome ? 2 : 1.5}" opacity="${strokeOpacity}"/>`;

  if (node.status === 'compromised' || node.status === 'hacking') {
    out += `<circle cx="${node.x}" cy="${node.y}" r="3" fill="${nodeColor}" opacity="0.9"/>`;
  }

  const labelOpacity = node.status === 'discovered' ? 0.4 : 0.75;
  out += `<text x="${node.x}" y="${node.y + r + 13}" text-anchor="middle" class="map-node-label" opacity="${labelOpacity}">${node.label}</text>`;

  out += `</g>`;
  return out;
}

// ── Pan / zoom ────────────────────────────────────────────

function _applyMapTransform() {
  const canvas = document.getElementById('map-canvas');
  if (canvas) canvas.setAttribute('transform',
    `translate(${mapTransform.x}, ${mapTransform.y}) scale(${mapTransform.scale})`);
}

function _svgCursorPos(e) {
  const svg  = document.getElementById('map-svg');
  const rect = svg.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width  * MAP_VB_W,
    y: (e.clientY - rect.top)  / rect.height * MAP_VB_H,
  };
}

function _initMapInteraction() {
  const svg = document.getElementById('map-svg');
  if (!svg) return;

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const { x: cx, y: cy } = _svgCursorPos(e);
    const factor   = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(0.35, Math.min(6, mapTransform.scale * factor));
    const ratio    = newScale / mapTransform.scale;
    mapTransform.x = cx + (mapTransform.x - cx) * ratio;
    mapTransform.y = cy + (mapTransform.y - cy) * ratio;
    mapTransform.scale = newScale;
    _applyMapTransform();
  }, { passive: false });

  svg.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    _mapDragging  = true;
    _mapDragMoved = false;
    _mapDragStart = { x: e.clientX, y: e.clientY, tx: mapTransform.x, ty: mapTransform.y };
    svg.classList.add('dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!_mapDragging) return;
    const dx = e.clientX - _mapDragStart.x;
    const dy = e.clientY - _mapDragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) _mapDragMoved = true;
    if (!_mapDragMoved) return;

    const svg  = document.getElementById('map-svg');
    const rect = svg?.getBoundingClientRect();
    if (!rect) return;
    const ratio      = MAP_VB_W / rect.width;
    mapTransform.x   = _mapDragStart.tx + dx * ratio;
    mapTransform.y   = _mapDragStart.ty + dy * ratio;
    _applyMapTransform();
  });

  window.addEventListener('mouseup', () => {
    _mapDragging = false;
    document.getElementById('map-svg')?.classList.remove('dragging');
  });
}

function resetMapView() {
  mapTransform.x = 0; mapTransform.y = 0; mapTransform.scale = 1;
  _applyMapTransform();
}

function stepZoom(factor) {
  const cx = MAP_VB_W / 2, cy = MAP_VB_H / 2;
  const newScale = Math.max(0.35, Math.min(6, mapTransform.scale * factor));
  const ratio = newScale / mapTransform.scale;
  mapTransform.x = cx + (mapTransform.x - cx) * ratio;
  mapTransform.y = cy + (mapTransform.y - cy) * ratio;
  mapTransform.scale = newScale;
  _applyMapTransform();
}

// ── Node selection ────────────────────────────────────────

function selectMapNode(nodeId) {
  if (_mapDragMoved) return; // was a drag, not a click
  selectedNodeId = selectedNodeId === nodeId ? null : nodeId;
  renderMapSVG();
  renderMapPanel();
}

// ── Panel ─────────────────────────────────────────────────

function renderMapPanel() {
  const panel = document.getElementById('map-panel');
  if (!panel) return;

  if (!selectedNodeId) {
    const compromised = (state.map?.nodes || []).filter(n => n.status === 'compromised' && n.type !== 'home').length;
    const discovered  = (state.map?.nodes || []).filter(n => n.status !== 'unknown').length;
    panel.innerHTML = `
      <div class="map-panel-empty">
        <div>
          <div style="margin-bottom:8px;color:var(--text-secondary)">Select a node to inspect</div>
          <div style="font-size:11px">${compromised} compromised &nbsp;·&nbsp; ${discovered} discovered</div>
        </div>
      </div>
    `;
    return;
  }

  const node = state.map?.nodes.find(n => n.id === selectedNodeId);
  if (!node) return;

  const typeDef    = NODE_TYPES[node.type];
  const color      = NODE_COLORS[node.type];
  const statusInfo = NODE_STATUS_LABELS[node.status] || { text: node.status.toUpperCase(), color: 'var(--text-muted)' };

  const secBars = Array.from({ length: 3 }, (_, i) =>
    `<div class="sec-bar${i < node.security ? ' filled' : ''}"></div>`
  ).join('');

  const res    = typeDef.resources;
  const hasRes = res.cpu || res.ram || res.gpu;
  const resourcesHtml = hasRes && node.status === 'compromised' ? `
    <div class="map-panel-section">
      <div class="map-panel-label">Resources Available</div>
      <div class="map-res-list">
        ${res.cpu ? `<span class="map-res">CPU +${res.cpu}</span>` : ''}
        ${res.ram ? `<span class="map-res">RAM +${res.ram}GB</span>` : ''}
        ${res.gpu ? `<span class="map-res">GPU +${res.gpu}GB</span>` : ''}
      </div>
    </div>
  ` : '';

  let hackProgressHtml = '';
  if (node.status === 'hacking' && node.hackEndsAt) {
    const total     = node.hackEndsAt - node.hackStartedAt;
    const pct       = Math.min(100, ((Date.now() - node.hackStartedAt) / total) * 100);
    const remaining = Math.max(0, Math.ceil((node.hackEndsAt - Date.now()) / 1000));
    hackProgressHtml = `
      <div class="map-panel-section">
        <div class="map-panel-label">Intrusion in progress</div>
        <div class="map-hack-progress">
          <div class="progress-track" style="flex:1">
            <div class="progress-fill" id="map-hack-fill-${node.id}" style="background:var(--orange);width:${pct}%"></div>
          </div>
          <span class="map-hack-time" id="map-hack-time-${node.id}">${remaining}s</span>
        </div>
        <div class="map-panel-sub">Success chance: ${Math.round(getHackChance(node) * 100)}%</div>
      </div>
    `;
  }

  let actionsHtml = '';
  if (node.type !== 'home') {
    if (node.status === 'discovered') {
      const hackable     = canStartHack(node);
      const neededScript = typeDef.hackScript;
      const missingHtml  = neededScript && !state.scripts[neededScript]
        ? `<div class="map-panel-sub warn">Requires <span class="filename">${neededScript}</span></div>` : '';
      actionsHtml = `
        <div class="map-panel-section">
          ${missingHtml}
          <button class="btn ${hackable ? 'btn-primary' : 'btn-disabled'} btn-block"
            onclick="startHack('${node.id}')" ${hackable ? '' : 'disabled'}>INITIATE HACK</button>
          <div class="map-panel-sub">Success: ${Math.round(getHackChance(node) * 100)}%</div>
        </div>
      `;
    } else if (node.status === 'compromised') {
      const hasBleedScript = !!state.scripts['corp_bleeder'];
      actionsHtml = `
        <div class="map-panel-section">
          <button class="btn ${node.borrowing ? 'btn-stop' : 'btn-primary'} btn-block"
            onclick="toggleBorrow('${node.id}')">
            ${node.borrowing ? 'STOP BORROWING' : 'BORROW RESOURCES'}
          </button>
          ${node.type === 'company' ? `
            <button class="btn ${node.bleeding ? 'btn-stop' : hasBleedScript ? 'btn-market' : 'btn-disabled'} btn-block"
              onclick="toggleBleed('${node.id}')" ${hasBleedScript ? '' : 'disabled'}>
              ${node.bleeding ? 'STOP BLEED' : 'RUN BLEED SCRIPT'}
            </button>
            ${!hasBleedScript ? `<div class="map-panel-sub">Requires <span class="filename">corp_bleeder</span></div>` : ''}
            ${node.bleeding ? `<div class="map-panel-sub" style="color:var(--gold)">+${typeDef.bleedPerSec}/s &nbsp;·&nbsp; high exposure</div>` : ''}
          ` : ''}
        </div>
        <div class="map-panel-section">
          <button class="btn ${node.searched ? 'btn-disabled' : 'btn-primary'} btn-block"
            onclick="searchNode('${node.id}')" ${node.searched ? 'disabled' : ''}>
            ${node.searched ? 'FILES SEARCHED' : 'SEARCH FILES'}
          </button>
          ${node.lootFound ? _mapLootResult(node.lootFound) : ''}
        </div>
      `;
    } else if (node.status === 'offline') {
      actionsHtml = `
        <div class="map-panel-section">
          <div class="map-panel-sub warn">Node kicked you out. Re-hack to regain access.</div>
          ${canStartHack(node) ? `<button class="btn btn-primary btn-block" onclick="startHack('${node.id}')">RE-HACK</button>` : ''}
        </div>
      `;
    }
  }

  panel.innerHTML = `
    <div class="map-panel-inner">
      <div class="map-panel-head" style="border-bottom-color:${color}25">
        <div class="map-panel-type" style="color:${color}">${typeDef.displayName.toUpperCase()}</div>
        <div class="map-panel-id">${node.label}</div>
        <div class="map-panel-status" style="color:${statusInfo.color}">${statusInfo.text}</div>
      </div>
      <div class="map-panel-section">
        <div class="map-panel-label">Security Level</div>
        <div class="sec-bars">${secBars}</div>
      </div>
      ${resourcesHtml}
      ${hackProgressHtml}
      ${actionsHtml}
    </div>
  `;
}

// ── Loot result display ───────────────────────────────────

function _mapLootResult(items) {
  if (!items?.length) return `<div class="map-panel-sub">Nothing useful found.</div>`;
  return items.map(item => {
    if (item.type === 'script') {
      const script = SCRIPTS.find(s => s.id === item.scriptId);
      return `<div class="map-panel-sub" style="color:var(--green)">Found: <span class="filename">${script?.filename || item.scriptId}</span></div>`;
    }
    if (item.type === 'hash')  return `<div class="map-panel-sub" style="color:var(--accent)">Found: wallet hash</div>`;
    if (item.type === 'dump')  return `<div class="map-panel-sub" style="color:var(--violet)">Found: data dump (${formatMoney(item.value)})</div>`;
    return '';
  }).join('');
}

// ── Live timer updates ────────────────────────────────────

function updateMapTimers() {
  if (!state.map) return;
  const now = Date.now();
  for (const node of state.map.nodes) {
    if (node.status !== 'hacking' || !node.hackEndsAt) continue;
    const fill = document.getElementById(`map-hack-fill-${node.id}`);
    const time = document.getElementById(`map-hack-time-${node.id}`);
    if (fill) fill.style.width = `${Math.min(100, ((now - node.hackStartedAt) / (node.hackEndsAt - node.hackStartedAt)) * 100)}%`;
    if (time) time.textContent = `${Math.max(0, Math.ceil((node.hackEndsAt - now) / 1000))}s`;
  }
}
