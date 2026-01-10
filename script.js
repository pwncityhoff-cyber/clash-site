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

function buildPointsTable({ rows, driverHeader, pointsHeader }){
  if(!Array.isArray(rows) || rows.length === 0) return null;

  const header = rows[0].map(h => String((h === null || h === undefined) ? '' : h).trim());
  const headerNorm = header.map(normalizeHeader);

  const driverIdx = headerNorm.indexOf(normalizeHeader(driverHeader));
  const pointsIdx = headerNorm.indexOf(normalizeHeader(pointsHeader));
  if(driverIdx < 0 || pointsIdx < 0) return null;

  const entries = rows
    .slice(1)
    .map(r => ({
      driver: String((r && r[driverIdx] !== null && r[driverIdx] !== undefined) ? r[driverIdx] : '').trim(),
      points: Number((r && r[pointsIdx] !== null && r[pointsIdx] !== undefined) ? r[pointsIdx] : 0)
    }))
    .filter(e => e.driver && Number.isFinite(e.points));

  entries.sort((a, b) => b.points - a.points);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>#</th><th>Driver</th><th>Points</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  entries.forEach((e, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + (idx + 1) + '</td><td>' + e.driver + '</td><td>' + e.points + '</td>';
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
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

    const table = buildPointsTable({
      rows,
      driverHeader: 'Racer Name',
      pointsHeader: 'Total Points'
    });
    if(!table) throw new Error('Could not locate "Racer Name" and "Total Points" columns');

    host.innerHTML = '';
    host.appendChild(table);
    if(status) status.remove();
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

// Render 2025 archive points table
render2025PointsFromXlsx();
