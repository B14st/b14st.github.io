let _selectedSlot = null; // { slotType, slotIndex } or null

// ── Programs view ─────────────────────────────────────────

function renderProgramsView() {
  const content = document.getElementById('content');
  if (!content) return;

  _syncProgramSlots();

  content.innerHTML = `
    <div class="programs-view">
      <div class="programs-left" id="programs-left"></div>
      <div class="programs-right" id="programs-right"></div>
    </div>
  `;

  _renderLoadout();
  _renderProgramInventory();
}

function selectProgram() {} // stub kept for any external callers

// ── Loadout panel (left) ──────────────────────────────────

function _renderLoadout() {
  const el = document.getElementById('programs-left');
  if (!el) return;

  const used = getUsedResources();

  const sectionHtml = (label, slotType, slots) => {
    const filledCount = slots.filter(Boolean).length;
    const slotsHtml = slots.map((progId, i) => {
      const prog       = progId ? getProgram(progId) : null;
      const isSelected = _selectedSlot?.slotType === slotType && _selectedSlot?.slotIndex === i;

      if (prog) {
        const color    = RARITY_COLORS[prog.rarity] || RARITY_COLORS.common;
        const statsStr = _progStatsLine(prog);
        const resCost  = [
          prog.cpu ? `CPU ${prog.cpu}` : '',
          prog.ram ? `RAM ${prog.ram}GB` : '',
          prog.gpu ? `GPU ${prog.gpu}GB` : '',
        ].filter(Boolean).join(' · ');
        return `
          <div class="prog-slot prog-slot-filled${isSelected ? ' selected' : ''}"
               style="border-left-color:${color}"
               onclick="selectSlot('${slotType}', ${i})">
            <div class="prog-slot-body">
              <div class="prog-slot-name" style="color:${color}">${prog.filename}</div>
              ${statsStr ? `<div class="prog-slot-stats">${statsStr}</div>` : ''}
              ${resCost  ? `<div class="prog-slot-res">${resCost}</div>` : ''}
            </div>
            <button class="btn btn-stop prog-slot-btn"
              onclick="event.stopPropagation();unequipProgram('${slotType}', ${i})">UNEQUIP</button>
          </div>
        `;
      }

      return `
        <div class="prog-slot prog-slot-empty${isSelected ? ' selected' : ''}"
             onclick="selectSlot('${slotType}', ${i})">
          <div class="prog-slot-empty-label">EMPTY SLOT</div>
          <div class="prog-slot-empty-hint">click to equip</div>
        </div>
      `;
    }).join('');

    return `
      <div class="prog-section">
        <div class="prog-section-header">
          ${label}
          <span class="prog-section-count">${filledCount}/${slots.length}</span>
        </div>
        <div class="prog-slots-grid">${slotsHtml}</div>
      </div>
    `;
  };

  const { operations, security, system } = state.programs.equipped;

  el.innerHTML = `
    <div class="prog-loadout-header">
      <div class="prog-loadout-title">LOADOUT</div>
      <div class="prog-res-meters" style="flex:none">
        ${['cpu', 'ram', 'gpu'].map(type => {
          const cap = getCapacity(type);
          const u   = used[type];
          const pct = cap > 0 ? (u / cap) * 100 : 0;
          const cls = pct >= 100 ? ' full' : pct > 70 ? ' high' : '';
          return `
            <div class="prog-res-row">
              <span class="prog-res-label">${HARDWARE[type].name}</span>
              <div class="resource-track prog-res-track">
                <div class="resource-fill${cls}" style="width:${pct}%"></div>
              </div>
              <span class="prog-res-reading">${u}/${cap}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ${sectionHtml('OPERATIONS', 'operations', operations)}
    ${sectionHtml('SYSTEM', 'system', system)}
    ${sectionHtml('SECURITY', 'security', security)}
    ${_renderHashCrackerQueue()}
  `;
}

function _progStatsLine(prog) {
  const parts = [];
  if (prog.stats?.parallelCracks)     parts.push(`${prog.stats.parallelCracks} crack slots`);
  if (prog.stats?.contractSpeedBonus) parts.push(`Speed ×${prog.stats.contractSpeedBonus}`);
  if (prog.stats?.incomeMultiplier)   parts.push(`Income ×${prog.stats.incomeMultiplier}`);
  return parts.join(' · ');
}

// ── Hash cracker queue (inline below loadout) ─────────────

function _renderHashCrackerQueue() {
  const { slots, speed } = getCrackConfig();
  if (slots === 0) return '';

  const hashes  = state.inventory?.hashes || [];
  const active  = hashes.filter(h => h.status === 'cracking');
  const pending = hashes.filter(h => h.status === 'pending');
  const now     = Date.now();

  // Find the best active cracker — from equipped programs or owned scripts
  const progCracker    = getEquippedProgramIds().map(getProgram).filter(Boolean).find(p => p.stats?.parallelCracks);
  const scriptCrackers = SCRIPTS.filter(s => state.scripts[s.id] && s.stats?.parallelCracks)
    .sort((a, b) => (b.stats.parallelCracks || 0) - (a.stats.parallelCracks || 0));
  const cracker = progCracker || scriptCrackers[0] || null;
  if (!cracker) return '';

  const slotDots = Array.from({ length: slots }, (_, i) =>
    `<div class="program-slot-dot${i < active.length ? ' active' : ''}"></div>`
  ).join('');

  const activeHtml = active.length > 0 ? active.map(hash => {
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
  }).join('') : '';

  const pendingHtml = pending.length > 0 ? `
    <div class="program-section-label" style="margin-top:10px">QUEUED (${pending.length})</div>
    <div class="program-queue-list">
      ${pending.map(hash => `
        <div class="program-queue-item">
          <span>wallet_${hash.nodeLabel.toLowerCase()}.hash</span>
          <span class="program-queue-badge">WAITING</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const emptyHtml = active.length === 0 && pending.length === 0
    ? `<div style="font-size:11px;color:var(--text-muted)">No hashes queued. Search compromised nodes on the Map.</div>`
    : '';

  const color = RARITY_COLORS[cracker.rarity] || RARITY_COLORS.common;

  return `
    <div class="prog-section prog-cracker-section">
      <div class="prog-section-header">HASH CRACKER</div>
      <div class="prog-cracker-name" style="color:${color}">${cracker.filename}</div>
      <div class="program-slots-row" style="margin:6px 0 10px">
        <span style="font-size:10px;color:var(--text-muted);margin-right:4px">${active.length}/${slots} slots</span>
        ${slotDots}
      </div>
      ${activeHtml}
      ${pendingHtml}
      ${emptyHtml}
    </div>
  `;
}

// ── Inventory panel (right) ───────────────────────────────

function _renderProgramInventory() {
  const el = document.getElementById('programs-right');
  if (!el) return;

  const inv = state.programs.inventory;

  el.innerHTML = `
    <div class="prog-inv-header">
      INVENTORY
      <span class="prog-inv-count">${inv.length}</span>
    </div>
    ${inv.length === 0
      ? `<div class="prog-inv-empty">No programs in inventory.<br>Buy from the Black Market or find them while searching nodes.</div>`
      : `<div class="prog-inv-list">
          ${inv.map((progId, invIdx) => {
            const prog = getProgram(progId);
            if (!prog) return '';
            const color       = RARITY_COLORS[prog.rarity] || RARITY_COLORS.common;
            const isCompatible = _selectedSlot && prog.slotType === _selectedSlot.slotType;

            // Check resource fit if a slot is selected
            let canEquip = true, equipLabel = 'EQUIP';
            if (_selectedSlot && isCompatible) {
              const currentId = state.programs.equipped[_selectedSlot.slotType][_selectedSlot.slotIndex];
              const used = getUsedResources();
              const freed = currentId ? (() => {
                const p = getProgram(currentId);
                return p ? { cpu: p.cpu, ram: p.ram, gpu: p.gpu } : { cpu: 0, ram: 0, gpu: 0 };
              })() : { cpu: 0, ram: 0, gpu: 0 };
              canEquip = (
                used.cpu - freed.cpu + prog.cpu <= getCapacity('cpu') &&
                used.ram - freed.ram + prog.ram <= getCapacity('ram') &&
                used.gpu - freed.gpu + prog.gpu <= getCapacity('gpu')
              );
              equipLabel = canEquip ? 'EQUIP HERE' : 'NO CAPACITY';
            }

            const btnFn = (_selectedSlot && isCompatible)
              ? `equipProgram('${progId}', '${_selectedSlot.slotType}', ${_selectedSlot.slotIndex})`
              : `autoEquipProgram('${progId}')`;

            const statsStr = _progStatsLine(prog);
            const resCost  = [
              prog.cpu ? `CPU ${prog.cpu}` : '',
              prog.ram ? `RAM ${prog.ram}GB` : '',
              prog.gpu ? `GPU ${prog.gpu}GB` : '',
            ].filter(Boolean).join(' · ');
            return `
              <div class="prog-inv-card${isCompatible ? ' compatible' : ''}">
                <div class="prog-inv-top">
                  <span class="prog-inv-name" style="color:${color}">${prog.filename}</span>
                  <span class="prog-inv-slot">${prog.slotType}</span>
                </div>
                ${statsStr ? `<div class="prog-inv-stats">${statsStr}</div>` : ''}
                ${resCost  ? `<div class="prog-inv-stats" style="color:var(--text-muted)">${resCost}</div>` : ''}
                <div class="prog-inv-footer">
                  <button class="btn ${canEquip ? 'btn-primary' : 'btn-disabled'} prog-inv-btn"
                    onclick="${btnFn}" ${canEquip ? '' : 'disabled'}>${equipLabel}</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>`
    }
  `;
}

// ── Slot selection ────────────────────────────────────────

function selectSlot(slotType, slotIndex) {
  if (_selectedSlot?.slotType === slotType && _selectedSlot?.slotIndex === slotIndex) {
    _selectedSlot = null;
  } else {
    _selectedSlot = { slotType, slotIndex };
  }
  _renderLoadout();
  _renderProgramInventory();
}

function autoEquipProgram(progId) {
  const prog = getProgram(progId);
  if (!prog) return;

  const slots    = state.programs.equipped[prog.slotType];
  const emptyIdx = slots.findIndex(s => s === null);

  if (emptyIdx !== -1) {
    equipProgram(progId, prog.slotType, emptyIdx);
  } else {
    // All slots full — highlight first slot so player can swap
    _selectedSlot = { slotType: prog.slotType, slotIndex: 0 };
    _renderLoadout();
    _renderProgramInventory();
  }
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
