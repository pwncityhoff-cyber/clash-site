// Tabs logic (generic)
let _classCardRaf = 0;
function equalizeClassCardHeights(){
  const cards = Array.from(document.querySelectorAll('#classes .grid .card'));
  if(cards.length === 0) return;

  // Always reset first so we can measure natural heights / allow single-column layouts to flow naturally.
  cards.forEach(c => { c.style.height = 'auto'; });

  // Only equalize when we're in the multi-column layout.
  // (The CSS turns on 3 columns at 900px; on mobile this would create lots of blank space.)
  const shouldEqualize = window.matchMedia('(min-width: 900px)').matches;
  if(!shouldEqualize) return;

  const max = Math.max(...cards.map(c => c.getBoundingClientRect().height));
  const h = Math.ceil(max);
  cards.forEach(c => { c.style.height = h + 'px'; });
}
function scheduleEqualizeClassCardHeights(){
  if(_classCardRaf) cancelAnimationFrame(_classCardRaf);
  _classCardRaf = requestAnimationFrame(() => {
    _classCardRaf = 0;
    equalizeClassCardHeights();
  });
}

// Points (XLSX -> table)
function normalizeHeader(s){
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parsePointsRows({ rows, driverHeader, pointsHeader }){
  if(!Array.isArray(rows) || rows.length === 0) return null;

  const header = rows[0].map(h => String((h === null || h === undefined) ? '' : h).trim());
  const headerNorm = header.map(normalizeHeader);

  const driverIdx = headerNorm.indexOf(normalizeHeader(driverHeader));
  const pointsIdx = headerNorm.indexOf(normalizeHeader(pointsHeader));
  if(driverIdx < 0 || pointsIdx < 0) return null;

  const eventCols = [];
  for(let i = 0; i < header.length; i++){
    if(i === driverIdx || i === pointsIdx) continue;
    if(!header[i]) continue;
    eventCols.push({ idx: i, name: header[i] });
  }

  const entries = rows
    .slice(1)
    .map(r => {
      const driver = String((r && r[driverIdx] !== null && r[driverIdx] !== undefined) ? r[driverIdx] : '').trim();
      const total = Number((r && r[pointsIdx] !== null && r[pointsIdx] !== undefined) ? r[pointsIdx] : 0);

      const events = [];
      for(let j = 0; j < eventCols.length; j++){
        const c = eventCols[j];
        const v = (r && r[c.idx] !== null && r[c.idx] !== undefined) ? r[c.idx] : null;
        events.push(v);
      }

      return { driver, total, events };
    })
    .filter(e => e.driver && Number.isFinite(e.total));

  entries.sort((a, b) => b.total - a.total);

  return { entries, eventCols };
}

// Current year standings (pre-season TBD)
function renderCurrentYearTbdStandings(){
  const mount = document.getElementById('points-current-grid');
  if(!mount) return;

  const classCards = Array.from(document.querySelectorAll('#classes .grid > article.card, #classes .grid > .card'));
  if(classCards.length === 0){
    mount.innerHTML = '<div class="card"><h3>Standings</h3><p class="muted">No classes found.</p></div>';
    return;
  }

  const classes = classCards.map(card => {
    const name = (card.querySelector('h3')?.textContent || '').trim();
    const tagEl = card.querySelector('.tag');
    const tag = (tagEl?.textContent || '').trim();
    const tagClass = tagEl ? tagEl.className : 'tag';
    const href = card.querySelector('a.btn.primary')?.getAttribute('href') || '';
    return { name, tag, tagClass, href };
  }).filter(c => c.name);

  mount.innerHTML = '';

  for(const c of classes){
    const el = document.createElement('div');
    el.className = 'card standings-card standings-tbd';

    const top = document.createElement('div');
    top.className = 'row between standings-head';

    const h3 = document.createElement('h3');
    h3.textContent = c.name;
    top.appendChild(h3);

    if(c.tag){
      const pill = document.createElement('span');
      pill.className = c.tagClass || 'tag';
      pill.textContent = c.tag;
      top.appendChild(pill);
    }

    el.appendChild(top);

    const tbd = document.createElement('div');
    tbd.className = 'standings-tbd-hero';
    tbd.innerHTML = '<div class="tbd-badge">TBD</div><div class="muted">No points yet — check back after Round 1.</div>';
    el.appendChild(tbd);

    const sk = document.createElement('div');
    sk.className = 'standings-skel';
    sk.innerHTML =
      '<div class="standings-skel-head"><span>#</span><span>Racer</span><span class="right">Pts</span></div>' +
      '<div class="standings-skel-row"><span class="skel"></span></div>' +
      '<div class="standings-skel-row"><span class="skel"></span></div>' +
      '<div class="standings-skel-row"><span class="skel"></span></div>';
    el.appendChild(sk);

    const actions = document.createElement('div');
    actions.className = 'row standings-actions';

    if(c.href){
      const a = document.createElement('a');
      a.className = 'btn';
      a.href = c.href;
      a.textContent = 'Class Info';
      actions.appendChild(a);
    }

    el.appendChild(actions);
    mount.appendChild(el);
  }
}

function buildPagedPointsView({ parsed, pageSize }){
  if(!parsed) return null;

  const entries = parsed.entries || [];
  const eventCols = parsed.eventCols || [];
  const size = pageSize || 10;

  const root = document.createElement('div');
  root.className = 'points-pager';

  const controls = document.createElement('div');
  controls.className = 'row between points-pager-controls';

  const left = document.createElement('div');
  left.className = 'row';

  const btnPrev = document.createElement('button');
  btnPrev.className = 'btn';
  btnPrev.type = 'button';
  btnPrev.textContent = '◀ Prev';

  const btnNext = document.createElement('button');
  btnNext.className = 'btn';
  btnNext.type = 'button';
  btnNext.textContent = 'Next ▶';

  const meta = document.createElement('span');
  meta.className = 'muted';

  left.appendChild(btnPrev);
  left.appendChild(btnNext);
  controls.appendChild(left);
  controls.appendChild(meta);
  root.appendChild(controls);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'points-pager-tablewrap';
  root.appendChild(tableWrap);

  const table = document.createElement('table');
  tableWrap.appendChild(table);

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  trh.innerHTML = '<th>#</th><th>Racer</th>';
  for(let i = 0; i < eventCols.length; i++){
    const th = document.createElement('th');
    th.textContent = eventCols[i].name;
    trh.appendChild(th);
  }
  const thTotal = document.createElement('th');
  thTotal.textContent = 'Total Points';
  trh.appendChild(thTotal);
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  function formatCellValue(v){
    if(v === null || v === undefined) return '-';
    const s = String(v);
    if(s.trim() === '') return '-';
    return s;
  }

  let page = 0;
  const pageCount = Math.max(1, Math.ceil(entries.length / size));

  function clampPage(p){
    if(p < 0) return 0;
    if(p > pageCount - 1) return pageCount - 1;
    return p;
  }

  function render(){
    page = clampPage(page);
    const start = page * size;
    const end = Math.min(entries.length, start + size);

    // Update meta + buttons
    if(entries.length === 0) meta.textContent = 'No standings found.';
    else meta.textContent = 'Showing ' + (start + 1) + '–' + end + ' of ' + entries.length;

    btnPrev.disabled = (page <= 0);
    btnNext.disabled = (page >= pageCount - 1);

    // Render rows
    tbody.innerHTML = '';
    for(let i = start; i < end; i++){
      const e = entries[i];
      const tr = document.createElement('tr');

      const tdRank = document.createElement('td');
      tdRank.textContent = String(i + 1);
      tr.appendChild(tdRank);

      const tdDriver = document.createElement('td');
      tdDriver.textContent = e.driver;
      tr.appendChild(tdDriver);

      for(let j = 0; j < eventCols.length; j++){
        const td = document.createElement('td');
        const v = (e.events && e.events.length > j) ? e.events[j] : null;
        td.textContent = formatCellValue(v);
        tr.appendChild(td);
      }

      const tdTotal = document.createElement('td');
      tdTotal.textContent = String(e.total);
      tr.appendChild(tdTotal);

      tbody.appendChild(tr);
    }
  }

  btnPrev.addEventListener('click', () => { page = clampPage(page - 1); render(); });
  btnNext.addEventListener('click', () => { page = clampPage(page + 1); render(); });

  // Swipe left/right on controls to change pages (mobile).
  // (Table itself needs horizontal scroll for many race columns.)
  let touchStartX = null;
  let touchStartY = null;

  function onTouchStart(e){
    const t = e.touches && e.touches[0];
    if(!t) return;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  function onTouchEnd(e){
    if(touchStartX === null || touchStartY === null) return;
    const t = e.changedTouches && e.changedTouches[0];
    if(!t) return;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    touchStartX = null;
    touchStartY = null;

    if(Math.abs(dx) < 60) return;
    if(Math.abs(dx) < Math.abs(dy)) return;

    if(dx < 0) page = clampPage(page + 1);
    else page = clampPage(page - 1);
    render();
  }

  controls.addEventListener('touchstart', onTouchStart, { passive: true });
  controls.addEventListener('touchend', onTouchEnd, { passive: true });

  render();
  return root;
}

function getEventPointsValue(entry, eventIndex){
  const v = (entry && entry.events && entry.events.length > eventIndex) ? entry.events[eventIndex] : null;
  if(v === null || v === undefined) return null;
  const n = Number(v);
  if(!Number.isFinite(n)) return null;
  return n;
}

function sanitizeFilename(s){
  return String(s || '')
    .replace(/[\\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateRacePointsPdf({ parsed, eventIndex }){
  if(!parsed || !parsed.eventCols || !parsed.entries) return;
  const eventCol = (parsed.eventCols.length > eventIndex) ? parsed.eventCols[eventIndex] : null;
  if(!eventCol) return;

  if(!window.jspdf || !window.jspdf.jsPDF){
    throw new Error('PDF library not loaded');
  }

  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const title = String(eventCol.name || ('Race #' + (eventIndex + 1)));
  const filename = sanitizeFilename('2025 ' + title + ' Points.pdf') || '2025 Race Points.pdf';

  const rows = parsed.entries
    .map(e => ({ driver: e.driver, points: getEventPointsValue(e, eventIndex) }))
    .filter(r => r.points !== null && r.points > 0)
    .sort((a, b) => b.points - a.points);

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title + ' — Points Earners', marginX, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Generated from 2025 points standings', marginX, y);
  y += 18;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('#', marginX, y);
  doc.text('Driver', marginX + 30, y);
  doc.text('Points', pageW - marginX - 40, y, { align: 'right' });
  y += 10;
  doc.setDrawColor(120);
  doc.line(marginX, y, pageW - marginX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  if(rows.length === 0){
    doc.text('No points recorded for this race yet.', marginX, y);
  } else {
    const lineH = 16;
    const maxY = doc.internal.pageSize.getHeight() - 54;

    for(let i = 0; i < rows.length; i++){
      if(y > maxY){
        doc.addPage();
        y = 52;
        doc.setFont('helvetica', 'bold');
        doc.text(title + ' — Points Earners (cont.)', marginX, y);
        y += 24;
        doc.setFont('helvetica', 'normal');
      }

      const rank = String(i + 1);
      const driver = String(rows[i].driver || '-');
      const points = String(rows[i].points);

      doc.text(rank, marginX, y);
      doc.text(driver, marginX + 30, y, { maxWidth: pageW - (marginX * 2) - 90 });
      doc.text(points, pageW - marginX - 40, y, { align: 'right' });
      y += lineH;
    }
  }

  doc.save(filename);
}

function populatePastRaces2025Cards(parsed){
  const cards = Array.from(document.querySelectorAll('#media .card[data-points-race-index]'));
  if(cards.length === 0) return;

  // Only fill the first 5 event columns to match the 5 cards.
  const eventCols = (parsed && parsed.eventCols) ? parsed.eventCols : [];

  for(let i = 0; i < cards.length; i++){
    const card = cards[i];
    const idx = Number(card.getAttribute('data-points-race-index'));
    if(!Number.isFinite(idx)) continue;

    const eventName = (eventCols[idx] && eventCols[idx].name) ? eventCols[idx].name : ('Round ' + (idx + 1));

    const titleEl = card.querySelector('[data-role="race-title"]');
    if(titleEl) titleEl.textContent = 'Round ' + (idx + 1) + ' • ' + eventName;

    // Top 3 earners (points > 0)
    const top3 = (parsed && parsed.entries ? parsed.entries : [])
      .map(e => ({ driver: e.driver, points: getEventPointsValue(e, idx) }))
      .filter(r => r.points !== null && r.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    const tbody = card.querySelector('tbody[data-role="race-top3"]');
    if(tbody){
      tbody.innerHTML = '';
      for(let r = 0; r < 3; r++){
        const row = document.createElement('tr');
        const entry = top3[r] || null;
        const driver = entry ? entry.driver : '-';
        const points = entry ? String(entry.points) : '-';
        row.innerHTML = '<td>' + (r + 1) + '</td><td>' + driver + '</td><td>' + points + '</td>';
        tbody.appendChild(row);
      }
    }

    const pdfLink = card.querySelector('a[data-role="race-pdf"]');
    if(pdfLink && !pdfLink._racePdfBound){
      pdfLink._racePdfBound = true;
      pdfLink.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          generateRacePointsPdf({ parsed: window._points2025Parsed || parsed, eventIndex: idx });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[pdf] failed to generate:', err);
          alert('Unable to generate PDF. ' + ((err && err.message) ? err.message : ''));
        }
      });
    }
  }
}

async function render2025PointsFromXlsx(){
  const host = document.getElementById('points-2025-table');
  const status = document.getElementById('points-2025-status');
  if(!host) return;

  const xlsxUrl = 'standings/2025/2025%20Clash%20Point%20Series%20Standings.xlsx';

  try {
    // If opened directly from disk, many browsers block/hang local fetch() calls.
    if (window.location && window.location.protocol === 'file:') {
      if(status) status.textContent = 'To load the 2025 table, open this site from a web server (not a file). Example: run "python -m http.server" in the project folder, then visit http://localhost:8000.';
      return;
    }

    if(typeof window.XLSX === 'undefined') throw new Error('XLSX library not loaded');

    if(status) status.textContent = 'Loading 2025 standings…';

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutMs = 15000;
    const to = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    const res = await fetch(xlsxUrl, {
      cache: 'no-cache',
      signal: controller ? controller.signal : undefined
    });

    if(to) clearTimeout(to);
    if(!res.ok) throw new Error('Failed to fetch standings (' + res.status + ')');
    const buf = await res.arrayBuffer();

    const wb = window.XLSX.read(buf, { type: 'array' });
    const sheetName = (wb.SheetNames && wb.SheetNames[0]) ? wb.SheetNames[0] : null;
    if(!sheetName) throw new Error('No sheets found in workbook');

    const ws = wb.Sheets[sheetName];
    const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    const parsed = parsePointsRows({
      rows,
      driverHeader: 'Racer Name',
      pointsHeader: 'Total Points'
    });
    if(!parsed) throw new Error('Could not locate "Racer Name" and "Total Points" columns');

    const view = buildPagedPointsView({ parsed, pageSize: 10 });
    if(!view) throw new Error('Could not build standings table');

    host.innerHTML = '';
    host.appendChild(view);
    if(status) status.remove();

    // Store for PDF generation handlers
    window._points2025Parsed = parsed;
    populatePastRaces2025Cards(parsed);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    if(status) status.textContent = 'Unable to load 2025 standings: ' + msg;
    // eslint-disable-next-line no-console
    console.warn('[points] 2025 standings load failed:', err);
  }
}

// Mobile nav toggle (hamburger)
function initMobileNav(){
  const header = document.querySelector('header');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('primary-nav');
  if(!header || !toggle || !menu) return;

  const setOpen = (open) => {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  const isOpen = () => header.classList.contains('nav-open');
  const close = () => setOpen(false);

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Close when clicking outside the header/menu
  document.addEventListener('click', (e) => {
    if(!isOpen()) return;
    if(e.target.closest('header')) return;
    close();
  });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') close();
  });

  // Close on menu item click (works for index anchors and normal links)
  menu.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if(link) close();
  });

  // If we leave mobile breakpoint, ensure menu is closed
  const mq = window.matchMedia('(min-width: 721px)');
  const handle = () => { if(mq.matches) close(); };
  if(typeof mq.addEventListener === 'function') mq.addEventListener('change', handle);
  else if(typeof mq.addListener === 'function') mq.addListener(handle);
}

document.querySelectorAll('.tabs').forEach(group => {
  group.addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if(!btn) return;
    const id = btn.dataset.tab;
    const parent = group.parentElement;
    group.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t===btn ? 'true' : 'false'));
    parent.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
    const active = parent.querySelector('#'+id);
    if(active) active.classList.add('active');
    scheduleEqualizeClassCardHeights();
  });
});

// Points tab switch (top-level)
document.querySelectorAll('#points .tabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.tab;
    const wrap = document.querySelector('#points');
    wrap.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t===btn ? 'true' : 'false'));
    wrap.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  });
});

// Dynamic year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Smooth anchor scrolling
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
  });
});

// Initial + resize equal-height pass for class cards
scheduleEqualizeClassCardHeights();
window.addEventListener('resize', scheduleEqualizeClassCardHeights);

// Init hamburger nav after the DOM exists
initMobileNav();

// Render current year (pre-season TBD) cards
renderCurrentYearTbdStandings();

// Render 2025 archive points table
render2025PointsFromXlsx();
