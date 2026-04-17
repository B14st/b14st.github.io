let _activeProgram = 'hash_cracker';

// ── Programs view ─────────────────────────────────────────

function renderProgramsView() {
  const content = document.getElementById('content');
  if (!content) return;

  const crackerVersion = _getHashCrackerVersion();

  const programList = [
    {
      id:    'hash_cracker',
      name:  crackerVersion ? crackerVersion.name : 'Hash Cracker',
      owned: !!crackerVersion,
    },
  ];

  content.innerHTML = `
    <div class="programs-view">
      <div class="programs-sidebar">
        <div class="programs-sidebar-header">PROGRAMS</div>
        ${programList.map(p => `
          <div class="program-entry${_activeProgram === p.id ? ' active' : ''}${!p.owned ? ' locked' : ''}"
               onclick="${p.owned ? `selectProgram('${p.id}')` : ''}">
            <svg class="program-entry-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="3" width="16" height="13" rx="2"/>
              <polyline points="6,7.5 8.5,10 6,12.5"/>
              <line x1="10.5" y1="12.5" x2="14" y2="12.5"/>
            </svg>
            <span>${p.name}</span>
            ${!p.owned ? `<span class="program-locked-badge">LOCKED</span>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="programs-content" id="programs-content">
        ${_renderActiveProgramContent(crackerVersion)}
      </div>
    </div>
  `;
}

function selectProgram(id) {
  _activeProgram = id;
  const pane = document.getElementById('programs-content');
  if (pane) pane.innerHTML = _renderActiveProgramContent(_getHashCrackerVersion());
}

function _getHashCrackerVersion() {
  if (state.scripts['hash_cracker_v3']) return { id: 'hash_cracker_v3', name: 'Hash Cracker v3' };
  if (state.scripts['hash_cracker_v2']) return { id: 'hash_cracker_v2', name: 'Hash Cracker v2' };
  if (state.scripts['hash_cracker'])    return { id: 'hash_cracker',    name: 'Hash Cracker'    };
  return null;
}

function _renderActiveProgramContent(crackerVersion) {
  if (_activeProgram === 'hash_cracker') {
    return _renderHashCrackerProgram(crackerVersion);
  }
  return `<div class="programs-empty">Select a program.</div>`;
}

// ── Hash Cracker program ───────────────────────────────────

function _renderHashCrackerProgram(crackerVersion) {
  if (!crackerVersion) {
    return `
      <div class="programs-empty">
        <div>Hash Cracker not installed.</div>
        <div style="color:var(--text-muted)">Purchase one from the Black Market to start cracking wallet hashes.</div>
      </div>
    `;
  }

  const { slots, speed } = getCrackConfig();
  const hashes  = state.inventory?.hashes || [];
  const active  = hashes.filter(h => h.status === 'cracking');
  const pending = hashes.filter(h => h.status === 'pending');
  const now     = Date.now();

  const slotDots = Array.from({ length: slots }, (_, i) =>
    `<div class="program-slot-dot${i < active.length ? ' active' : ''}"></div>`
  ).join('');

  const activeHtml = active.length > 0 ? `
    <div class="program-section-label">ACTIVE</div>
    ${active.map(hash => {
      const total     = hash.cracksAt - hash.crackStartedAt;
      const pct       = Math.min(100, ((now - hash.crackStartedAt) / total) * 100);
      const remaining = Math.max(0, Math.ceil((hash.cracksAt - now) / 1000));
      return `
        <div class="program-crack-card">
          <div class="program-crack-top">
            <span class="program-crack-label">wallet_${hash.nodeLabel.toLowerCase()}.hash</span>
          </div>
          <div class="program-crack-progress">
            <div class="progress-track" style="flex:1">
              <div class="progress-fill" id="crack-fill-${hash.id}" style="width:${pct}%"></div>
            </div>
            <span class="program-crack-time" id="crack-time-${hash.id}">${remaining}s</span>
          </div>
        </div>
      `;
    }).join('')}
  ` : '';

  const pendingHtml = pending.length > 0 ? `
    <div class="program-section-label" style="margin-top:12px">QUEUED (${pending.length})</div>
    <div class="program-queue-list">
      ${pending.map(hash => `
        <div class="program-queue-item">
          <span>wallet_${hash.nodeLabel.toLowerCase()}.hash</span>
          <span class="program-queue-badge">WAITING</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const emptyHtml = active.length === 0 && pending.length === 0 ? `
    <div style="font-size:12px;color:var(--text-muted)">No hashes queued. Search compromised nodes on the Map.</div>
  ` : '';

  return `
    <div class="program-view">
      <div class="program-header">
        <div>
          <div class="program-title">${crackerVersion.name.toUpperCase()}</div>
          <div class="program-version">Wallet hash cracker — parallel processing</div>
        </div>
      </div>
      <div class="program-slots-row">
        <span style="font-size:11px;color:var(--text-muted);margin-right:4px">${active.length}/${slots} slots</span>
        ${slotDots}
      </div>
      ${activeHtml}
      ${pendingHtml}
      ${emptyHtml}
    </div>
  `;
}

// ── Live timer updates ─────────────────────────────────────

function updateProgramsTimers() {
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
