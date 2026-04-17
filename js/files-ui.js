let _filesFolder = 'scripts';

function renderFilesView() {
  const content = document.getElementById('content');
  if (!content) return;

  const hashes      = state.inventory?.hashes || [];
  const dumps       = state.inventory?.dumps  || [];
  const ownedScripts = SCRIPTS.filter(s => state.scripts[s.id]);

  const counts = { scripts: ownedScripts.length, hashes: hashes.length, dumps: dumps.length };

  const folders = [
    { id: 'scripts', label: 'scripts',  icon: '.sh'   },
    { id: 'hashes',  label: 'hashes',   icon: '.hash' },
    { id: 'dumps',   label: 'dumps',    icon: '.dat'  },
  ];

  content.innerHTML = `
    <div class="files-view">
      <div class="files-sidebar">
        <div class="files-tree-header">FILE SYSTEM</div>
        <div class="files-tree">
          ${folders.map(f => `
            <div class="files-folder${_filesFolder === f.id ? ' active' : ''}"
                 onclick="selectFilesFolder('${f.id}')">
              <span class="files-folder-slash">/</span>
              <span class="files-folder-name">${f.label}</span>
              <span class="files-folder-count">${counts[f.id]}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="files-content">
        <div class="files-path">~/${_filesFolder}/</div>
        <div class="files-list">${_renderFileList()}</div>
      </div>
    </div>
  `;
}

function selectFilesFolder(folder) {
  _filesFolder = folder;
  renderFilesView();
}

function _renderFileList() {
  if (_filesFolder === 'scripts') return _renderScriptFiles();
  if (_filesFolder === 'hashes')  return _renderHashFiles();
  if (_filesFolder === 'dumps')   return _renderDumpFiles();
  return '';
}

// ── Scripts ───────────────────────────────────────────────

const _FILES_RARITY_COLORS = {
  common:    'var(--text-secondary)',
  uncommon:  'var(--green)',
  rare:      'var(--accent)',
  legendary: 'var(--gold)',
};

const _FILES_STAT_LABELS = {
  contractSpeedBonus: v => `Speed ×${v}`,
  incomeMultiplier:   v => `Income ×${v}`,
  parallelCracks:     v => `${v} crack slot${v > 1 ? 's' : ''}`,
};

function _renderScriptFiles() {
  const owned = SCRIPTS.filter(s => state.scripts[s.id]);
  if (owned.length === 0) {
    return `<div class="files-empty">No scripts installed. Visit the Black Market.</div>`;
  }

  return owned.map(s => {
    const color = _FILES_RARITY_COLORS[s.rarity] || _FILES_RARITY_COLORS.common;
    const stats = Object.entries(s.stats || {})
      .map(([k, v]) => _FILES_STAT_LABELS[k] ? `<span class="stat-badge">${_FILES_STAT_LABELS[k](v)}</span>` : '')
      .filter(Boolean).join('');
    const ext = s.filename.includes('.') ? '.' + s.filename.split('.').pop() : '.sh';

    return `
      <div class="files-entry">
        <span class="files-entry-ext">${ext}</span>
        <span class="files-entry-name" style="color:${color}">${s.filename}</span>
        <div class="files-entry-tags">
          <span class="rarity-tag rarity-${s.rarity}">${s.rarity}</span>
          ${stats}
        </div>
        <span class="files-entry-desc">${s.description}</span>
      </div>
    `;
  }).join('');
}

// ── Hashes ────────────────────────────────────────────────

function _renderHashFiles() {
  const hashes = state.inventory?.hashes || [];
  if (hashes.length === 0) {
    return `<div class="files-empty">No hashes. Search compromised nodes on the Map.</div>`;
  }

  return hashes.map(h => {
    let statusHtml = '';
    let valueHtml  = '';

    if (h.status === 'pending') {
      statusHtml = `<span class="files-hash-status status-pending">QUEUED</span>`;
    } else if (h.status === 'cracking') {
      statusHtml = `<span class="files-hash-status status-cracking">CRACKING</span>`;
    } else if (h.status === 'done') {
      statusHtml = `<span class="files-hash-status status-done">CRACKED</span>`;
      valueHtml  = `<span class="files-hash-value">${formatMoney(h.value)}</span>`;
    }

    return `
      <div class="files-entry">
        <span class="files-entry-ext">.hash</span>
        <span class="files-entry-name">wallet_${h.nodeLabel.toLowerCase()}</span>
        ${statusHtml}
        ${valueHtml}
      </div>
    `;
  }).join('');
}

// ── Dumps ─────────────────────────────────────────────────

function _renderDumpFiles() {
  const dumps = state.inventory?.dumps || [];
  if (dumps.length === 0) {
    return `<div class="files-empty">No data dumps. Search compromised nodes on the Map.</div>`;
  }

  return dumps.map(d => `
    <div class="files-entry">
      <span class="files-entry-ext">.dat</span>
      <span class="files-entry-name">${d.nodeLabel.toLowerCase()}_dump</span>
      <span class="files-dump-type">${d.nodeType} data</span>
      <span class="files-dump-value">${formatMoney(d.value)}</span>
    </div>
  `).join('');
}
