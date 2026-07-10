/* ==========================================================
   APP — Tile & Flooring Formula Reference
   ========================================================== */

(function () {
  'use strict';

  /* ── State ──────────────────────────────────────────────── */
  let activeCategory = 'all';
  let searchQuery    = '';

  /* ── DOM refs ───────────────────────────────────────────── */
  const listView     = document.getElementById('list-view');
  const detailView   = document.getElementById('detail-view');
  const topicList    = document.getElementById('topic-list');
  const categoryBar  = document.getElementById('category-bar');
  const searchInput  = document.getElementById('search');
  const searchClear  = document.getElementById('search-clear');
  const emptyMsg     = document.getElementById('empty-msg');
  const backBtn      = document.getElementById('back-btn');
  const detailCatPill= document.getElementById('detail-cat-pill');
  const detailContent= document.getElementById('detail-content');

  /* ── Utility ─────────────────────────────────────────────── */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function categoryColor(cat) {
    return CATEGORY_COLORS[cat] || '#64748b';
  }

  /* ── Build category chips ────────────────────────────────── */
  function buildCategoryBar() {
    const cats = [...new Set(TOPICS.map(t => t.category))];
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      categoryBar.appendChild(btn);
    });
    categoryBar.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (chip) selectCategory(chip.dataset.cat);
    });
  }

  function selectCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.cat === cat);
    });
    renderList();
  }

  /* ── Filter topics ───────────────────────────────────────── */
  function stripHtml(str) {
    return (str || '').replace(/<[^>]*>/g, ' ');
  }

  function topicText(t) {
    const parts = [
      t.title,
      t.subtitle,
      t.category,
      ...(t.tags || []),
      t.formula ? t.formula.primary : '',
      t.formula && t.formula.legend ? t.formula.legend.map(l => `${l.sym} ${l.desc}`).join(' ') : '',
      stripHtml(t.formula ? t.formula.note : ''),
      stripHtml(t.problem),
      stripHtml(t.whyItWorks),
      ...(t.tips || []).map(stripHtml),
      ...(t.assumptions || []).map(stripHtml),
      ...(t.example || []).map(s => `${s.step} ${stripHtml(s.body)}`),
    ];
    return parts.join(' ').toLowerCase();
  }

  const topicIndex = TOPICS.map(t => ({ id: t.id, text: topicText(t) }));

  function filteredTopics() {
    const q = searchQuery.toLowerCase().trim();
    return TOPICS.filter((t, i) => {
      if (activeCategory !== 'all' && t.category !== activeCategory) return false;
      if (!q) return true;
      return topicIndex[i].text.includes(q);
    });
  }

  /* ── Render topic list ───────────────────────────────────── */
  function renderList() {
    topicList.innerHTML = '';
    const topics = filteredTopics();

    emptyMsg.hidden = topics.length > 0;

    if (activeCategory === 'all') {
      /* Group by category */
      const groups = {};
      topics.forEach(t => {
        if (!groups[t.category]) groups[t.category] = [];
        groups[t.category].push(t);
      });

      Object.entries(groups).forEach(([cat, items]) => {
        const label = document.createElement('div');
        label.className = 'category-group-label';
        label.textContent = cat;
        topicList.appendChild(label);
        items.forEach(t => topicList.appendChild(makeCard(t)));
      });
    } else {
      topics.forEach(t => topicList.appendChild(makeCard(t)));
    }
  }

  function makeCard(topic) {
    const card = document.createElement('div');
    card.className = 'topic-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', topic.title);

    card.innerHTML = `
      <div class="card-dot" style="background:${esc(topic.color || '#64748b')}"></div>
      <div class="card-body">
        <div class="card-title">${esc(topic.title)}</div>
        <div class="card-sub">${esc(topic.subtitle)}</div>
      </div>
      <div class="card-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>`;

    function open() { showDetail(topic.id); }
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

    return card;
  }

  /* ── Search ──────────────────────────────────────────────── */
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    searchClear.classList.toggle('visible', searchQuery.length > 0);
    renderList();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.remove('visible');
    searchInput.focus();
    renderList();
  });

  /* ── Navigation ──────────────────────────────────────────── */
  function showList() {
    detailView.classList.remove('active');
    listView.classList.add('active');
    document.title = 'Flis & Gulv — Formelsamling';
    window.scrollTo(0, 0);
    history.pushState({ view: 'list' }, '', '#');
  }

  function showDetail(id) {
    const topic = TOPICS.find(t => t.id === id);
    if (!topic) return;
    renderDetail(topic);
    listView.classList.remove('active');
    detailView.classList.add('active');
    document.title = `${topic.title} — Flis & Gulv`;
    window.scrollTo(0, 0);
    history.pushState({ view: 'detail', id }, '', `#${id}`);
  }

  backBtn.addEventListener('click', showList);

  window.addEventListener('popstate', e => {
    if (e.state && e.state.view === 'detail') {
      const topic = TOPICS.find(t => t.id === e.state.id);
      if (topic) renderDetail(topic);
      listView.classList.remove('active');
      detailView.classList.add('active');
    } else {
      showList();
    }
  });

  /* Handle direct URL hash on load */
  if (location.hash) {
    const id = location.hash.slice(1);
    const topic = TOPICS.find(t => t.id === id);
    if (topic) {
      setTimeout(() => showDetail(id), 0);
    }
  }

  /* ── Render detail view ──────────────────────────────────── */
  function renderDetail(topic) {
    detailCatPill.textContent = topic.category;
    detailCatPill.style.background = hex2rgba(topic.color || '#64748b', 0.22);

    let html = `
      <h1 class="detail-title">${esc(topic.title)}</h1>
      <p class="detail-subtitle">${esc(topic.subtitle)}</p>`;

    /* Problem */
    html += section('problem', '?', 'Problem', topic.problem);

    /* Formula */
    if (topic.formula) {
      html += section('formula', 'Σ', 'Formel', renderFormula(topic.formula));
    }

    /* Diagram + Why it works */
    let whyBody = '';
    if (topic.diagram) {
      whyBody += `<div class="diagram-wrap">${topic.diagram}`;
      if (topic.diagramCaption) {
        whyBody += `<p class="diagram-caption">${esc(topic.diagramCaption)}</p>`;
      }
      whyBody += `</div>`;
    }
    whyBody += topic.whyItWorks || '';
    if (whyBody) {
      html += section('why', '💡', 'Slik fungerer det', whyBody);
    }

    /* Conversion table (special case) */
    if (topic.conversionTable) {
      html += section('example', '⇌', 'Omregningstabeller', renderConversionTable());
    } else if (topic.example) {
      html += section('example', '✎', 'Beregningseksempel', renderExample(topic.example, topic.exampleAnswer));
    }

    /* Assumptions */
    if (topic.assumptions && topic.assumptions.length) {
      html += section('limits', '⚠', 'Forutsetninger og begrensninger', renderItemList(topic.assumptions, '⚠'));
    }

    /* Tips */
    if (topic.tips && topic.tips.length) {
      html += section('tips', '✓', 'Tips', renderItemList(topic.tips, '✓'));
    }

    /* Related */
    if (topic.related && topic.related.length) {
      html += renderRelated(topic.related);
    }

    detailContent.innerHTML = html;

    /* Wire up related chips */
    detailContent.querySelectorAll('.related-chip').forEach(chip => {
      chip.addEventListener('click', () => showDetail(chip.dataset.id));
    });
  }

  /* ── HTML helpers ─────────────────────────────────────────── */
  function section(type, icon, label, body) {
    return `<div class="section ${esc(type)}">
      <div class="section-header">
        <div class="section-icon">${esc(icon)}</div>
        <span class="section-label">${esc(label)}</span>
      </div>
      <div class="section-body">${body}</div>
    </div>`;
  }

  function renderFormula(f) {
    let html = `<div class="formula-box">
      <div class="formula-display">${esc(f.primary)}</div>`;

    if (f.legend && f.legend.length) {
      html += `<table class="formula-legend">`;
      f.legend.forEach(row => {
        html += `<tr>
          <td class="legend-sym">${esc(row.sym)}</td>
          <td class="legend-desc">${esc(row.desc)}</td>
          <td class="legend-unit">${esc(row.unit)}</td>
        </tr>`;
      });
      html += `</table>`;
    }

    if (f.note) {
      html += `<div class="formula-note">${f.note}</div>`;
    }

    html += `</div>`;
    return html;
  }

  function renderExample(steps, answer) {
    let html = '';
    steps.forEach((s, i) => {
      html += `<div class="example-step">
        <div class="step-num">${i + 1}</div>
        <div class="step-body"><strong>${esc(s.step)}:</strong> ${s.body}</div>
      </div>`;
    });
    if (answer) {
      html += `<div class="example-answer"><strong>Resultat:</strong> ${answer}</div>`;
    }
    return html;
  }

  function renderItemList(items, icon) {
    return `<ul class="item-list">${items.map(item =>
      `<li><span class="item-icon">${esc(icon)}</span><span>${item}</span></li>`
    ).join('')}</ul>`;
  }

  function renderRelated(ids) {
    const found = ids.map(id => TOPICS.find(t => t.id === id)).filter(Boolean);
    if (!found.length) return '';
    const chips = found.map(t =>
      `<button class="related-chip" data-id="${esc(t.id)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        ${esc(t.title)}
      </button>`
    ).join('');
    return `<div class="section tips">
      <div class="section-header">
        <div class="section-icon">↗</div>
        <span class="section-label">Relaterte emner</span>
      </div>
      <div class="related-chips">${chips}</div>
    </div>`;
  }

  function renderConversionTable() {
    let html = `<table class="conv-table">
      <thead><tr>
        <th>From</th><th>To / Equivalent</th><th>Factor</th>
      </tr></thead><tbody>`;

    CONVERSIONS.forEach(row => {
      if (row.section) {
        html += `<tr class="conv-section-head"><td colspan="3">${esc(row.section)}</td></tr>`;
      } else {
        html += `<tr>
          <td>${esc(row.from)}</td>
          <td>${esc(row.to)}</td>
          <td style="font-family:var(--mono);font-size:.78rem;color:#64748b">${esc(row.factor || '—')}</td>
        </tr>`;
      }
    });

    html += `</tbody></table>`;
    return html;
  }

  function hex2rgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ── Init ────────────────────────────────────────────────── */
  buildCategoryBar();
  renderList();

})();
