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

  function normalizeClassKey(s){
    return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }
  // Lil' Titans is not a points class — keep it out of points standings.
  const excludedStandingsClasses = new Set(['liltitans']);

  const classes = classCards.map(card => {
    const name = (card.querySelector('h3')?.textContent || '').trim();
    const tagEl = card.querySelector('.tag');
    const tag = (tagEl?.textContent || '').trim();
    const tagClass = tagEl ? tagEl.className : 'tag';
    const href = card.querySelector('a.btn.primary')?.getAttribute('href') || '';
    return { name, tag, tagClass, href };
  }).filter(c => c.name && !excludedStandingsClasses.has(normalizeClassKey(c.name)));

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

// Mobile: collapsible sections (accordion-style)
function initMobileCollapsibleSections(){
  const mq = window.matchMedia('(max-width: 720px)');

  function ensureStructure(){
    const sections = Array.from(document.querySelectorAll('section[id]:not(.hero)'));

    for(const section of sections){
      if(section.dataset.collapsibleReady === 'true') continue;

      const id = section.id;
      const container = section.querySelector(':scope > .container') || section;

      // Prefer the top heading of the section.
      const heading = container.querySelector(':scope > h2, :scope > h1, :scope > h3');
      if(!heading) continue;

      // Build header row (heading + toggle button)
      const headerRow = document.createElement('div');
      headerRow.className = 'section-collapsible-header';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'section-collapsible-toggle';
      toggle.setAttribute('aria-label', 'Toggle ' + (heading.textContent || 'section'));

      const body = document.createElement('div');
      body.className = 'section-collapsible-body';
      const bodyId = 'section-body-' + id;
      body.id = bodyId;

      toggle.setAttribute('aria-controls', bodyId);

      // Move everything after the heading into the body wrapper.
      const start = heading.nextSibling;
      let node = start;
      while(node){
        const next = node.nextSibling;
        body.appendChild(node);
        node = next;
      }

      // Replace heading with header row containing heading + toggle.
      headerRow.appendChild(heading);
      headerRow.appendChild(toggle);

      container.insertBefore(headerRow, container.firstChild);
      container.insertBefore(body, headerRow.nextSibling);

      section.classList.add('section-collapsible');
      section.dataset.collapsibleReady = 'true';

      toggle.addEventListener('click', () => {
        const expanded = section.getAttribute('data-expanded') === 'true';
        setExpanded(section, !expanded);
      });
    }
  }

  function setExpanded(section, expanded){
    section.setAttribute('data-expanded', expanded ? 'true' : 'false');
    const btn = section.querySelector(':scope .section-collapsible-toggle');
    if(btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function applyStateForBreakpoint(){
    ensureStructure();

    const sections = Array.from(document.querySelectorAll('section.section-collapsible[id]:not(.hero)'));
    if(!mq.matches){
      // Desktop/tablet: always expanded (but keep structure; CSS hides toggle)
      sections.forEach(s => setExpanded(s, true));
      return;
    }

    // Mobile: collapse everything except Classes.
    for(const s of sections){
      const shouldExpand = (s.id === 'classes');
      setExpanded(s, shouldExpand);
    }
  }

  // Expand a section by id (mobile only), then return it.
  function expandIfCollapsible(targetId){
    if(!targetId) return null;
    const el = document.getElementById(targetId);
    if(!el) return null;
    if(!mq.matches) return el;
    if(el.matches && el.matches('section.section-collapsible')) setExpanded(el, true);
    return el;
  }

  // Expose for anchor scroll logic
  window.__expandCollapsibleSection = expandIfCollapsible;

  applyStateForBreakpoint();

  const handle = () => applyStateForBreakpoint();
  if(typeof mq.addEventListener === 'function') mq.addEventListener('change', handle);
  else if(typeof mq.addListener === 'function') mq.addListener(handle);
}

// Past Races: scrollable photo galleries + lightbox
function initPastRacesPhotoGalleries(){
  const galleryEls = Array.from(document.querySelectorAll('.thumb-gallery[data-manifest]'));
  if(galleryEls.length === 0) return;

  const lightboxEl = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxOpen = document.getElementById('lightbox-open');
  if(!lightboxEl || !lightboxImg || !lightboxCaption || !lightboxOpen) return;

  const active = {
    photos: [],
    index: 0,
    title: '',
    lastFocus: null,
  };

  function setLightboxOpen(isOpen){
    if(isOpen){
      lightboxEl.hidden = false;
      active.lastFocus = document.activeElement;
      document.body.style.overflow = 'hidden';
      lightboxEl.setAttribute('aria-hidden', 'false');
    }else{
      lightboxEl.hidden = true;
      document.body.style.overflow = '';
      lightboxEl.setAttribute('aria-hidden', 'true');
      if(active.lastFocus && typeof active.lastFocus.focus === 'function') active.lastFocus.focus();
      active.lastFocus = null;
    }
  }

  function showAt(nextIndex){
    if(!Array.isArray(active.photos) || active.photos.length === 0) return;
    const len = active.photos.length;
    const i = ((nextIndex % len) + len) % len;
    active.index = i;
    const src = encodeURI(active.photos[i]);
    const abs = (typeof URL !== 'undefined') ? (new URL(src, window.location.href)).toString() : src;
    lightboxImg.src = src;
    lightboxImg.alt = active.title ? (active.title + ' photo ' + (i + 1)) : ('Photo ' + (i + 1));
    lightboxCaption.textContent = (active.title ? (active.title + ' • ') : '') + (i + 1) + ' / ' + len;
    lightboxOpen.href = abs;
    lightboxOpen.setAttribute('href', abs);
  }

  function openLightbox({ photos, index, title }){
    active.photos = Array.isArray(photos) ? photos : [];
    active.title = String(title || '').trim();
    setLightboxOpen(true);
    showAt(Number.isFinite(index) ? index : 0);
  }

  function closeLightbox(){
    setLightboxOpen(false);
  }

  function next(){ showAt(active.index + 1); }
  function prev(){ showAt(active.index - 1); }

  lightboxEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    const action = btn ? btn.getAttribute('data-action') : null;
    if(action === 'close') closeLightbox();
    else if(action === 'next') next();
    else if(action === 'prev') prev();
  });

  document.addEventListener('keydown', e => {
    if(lightboxEl.hidden) return;
    if(e.key === 'Escape'){ e.preventDefault(); closeLightbox(); }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); next(); }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); prev(); }
  });

  function computeScrollStep(track){
    const first = track.querySelector('.thumb');
    const thumbW = first ? first.getBoundingClientRect().width : 150;
    const gap = parseFloat(getComputedStyle(track).gap || '0') || 0;
    return Math.round((thumbW + gap) * 4);
  }

  async function hydrateGallery(galleryEl){
    const manifestUrl = galleryEl.getAttribute('data-manifest');
    const videoHref = galleryEl.getAttribute('data-video-href');
    const videoThumb = galleryEl.getAttribute('data-video-thumb');
    const track = galleryEl.querySelector('.gallery-track');
    const btnPrev = galleryEl.querySelector('.gallery-nav.prev');
    const btnNext = galleryEl.querySelector('.gallery-nav.next');
    if(!manifestUrl || !track) return;

    // Visible state so we can tell if hydration is running.
    galleryEl.dataset.galleryState = 'loading';
    track.innerHTML = '<div class="muted" style="padding:10px 2px;">Loading photos…</div>';

    try{
      const res = await fetch(manifestUrl, { cache: 'no-store' });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const photos = Array.isArray(data?.photos) ? data.photos : [];
      const title = String(data?.round || '').trim() || 'Photos';

      const frag = document.createDocumentFragment();

      // Optional video thumb (included in the same scrollable gallery)
      if(videoHref && videoThumb){
        const a = document.createElement('a');
        a.className = 'thumb thumb-video';
        a.href = videoHref;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', 'Watch ' + title + ' highlight video');

        const img = document.createElement('img');
        img.className = 'thumb-img';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = title + ' video thumbnail';
        img.src = videoThumb;

        const badge = document.createElement('span');
        badge.className = 'thumb-badge';
        badge.textContent = 'Video';

        a.appendChild(img);
        a.appendChild(badge);
        frag.appendChild(a);
      }

      for(let i = 0; i < photos.length; i++){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumb thumb-photo';
        btn.setAttribute('aria-label', 'Open ' + title + ' photo ' + (i + 1) + ' of ' + photos.length);
        btn.dataset.index = String(i);

        const img = document.createElement('img');
        img.className = 'thumb-img';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.draggable = false;
        img.alt = title + ' thumbnail ' + (i + 1);
        // Encode spaces and other safe URL chars, but keep it relative.
        img.src = encodeURI(photos[i]);

        const badge = document.createElement('span');
        badge.className = 'thumb-badge';
        badge.textContent = 'Photo';

        btn.appendChild(img);
        btn.appendChild(badge);
        frag.appendChild(btn);
      }

      track.innerHTML = '';
      track.appendChild(frag);
      galleryEl.dataset.galleryState = 'ready';

      track.addEventListener('click', e => {
        const btn = e.target.closest('button.thumb-photo');
        if(!btn) return;
        const idx = Number(btn.dataset.index || 0);
        openLightbox({ photos, index: idx, title });
      });

      const step = () => computeScrollStep(track);
      if(btnPrev){
        btnPrev.addEventListener('click', () => {
          track.scrollBy({ left: -step(), behavior: 'smooth' });
        });
      }
      if(btnNext){
        btnNext.addEventListener('click', () => {
          track.scrollBy({ left: step(), behavior: 'smooth' });
        });
      }
    }catch(err){
      // Keep layout stable but show a useful hint.
      track.innerHTML = '<div class="muted" style="padding:10px 2px;">Photos unavailable (check server console for 404s).</div>';
      galleryEl.dataset.galleryState = 'error';
    }
  }

  galleryEls.forEach(el => { hydrateGallery(el); });
}

// Schedule: ticket type modal for "Buy Tickets"
function initScheduleTicketModal(){
  const modal = document.getElementById('ticket-modal');
  if(!modal) return;

  const subtitle = document.getElementById('ticket-modal-subtitle');
  const btnGa = document.getElementById('ticket-modal-ga');
  const btnRv = document.getElementById('ticket-modal-rv');
  if(!btnGa || !btnRv) return;

  const active = {
    isOpen: false,
    lastFocus: null,
    gaHref: '#',
    rvHref: '#',
  };

  function setOpen(open){
    active.isOpen = open;
    if(open){
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      active.lastFocus = document.activeElement;
      document.body.style.overflow = 'hidden';
      // Focus first choice
      setTimeout(() => { try{ btnGa.focus(); }catch(_e){} }, 0);
    }else{
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if(active.lastFocus && typeof active.lastFocus.focus === 'function') active.lastFocus.focus();
      active.lastFocus = null;
    }
  }

  function deriveLinksFromTrigger(trigger){
    const rawHref = trigger ? (trigger.getAttribute('href') || '') : '';
    let base;
    try{
      base = new URL(rawHref || '', window.location.href);
    }catch(_e){
      base = new URL(window.location.href);
    }

    // If the trigger points at a #tickets hash already, strip it for clean option hashes.
    base.hash = '';

    // Apply per-round GA links ONLY to the modal's GA option.
    // (Keep schedule buttons pointing to local event pages.)
    const gaByPath = {
      '/events/round-1.html': 'https://nitrousoutlet.com/products/general-admission?variant=45632043450508',
      '/events/round-4.html': 'https://nitrousoutlet.com/products/general-admission?variant=45632043548812',
      '/events/round-6.html': 'https://nitrousoutlet.com/products/general-admission?variant=45632043647116',
    };

    const path = base.pathname || '';
    const gaOverride = gaByPath[path] || '';

    const ga = gaOverride || '#';

    // Racer/Vendor passes: default to placeholder anchors until URLs are provided.
    const rvUrl = new URL(base.toString());
    rvUrl.hash = 'tickets-racer-vendor';

    return { ga, rv: rvUrl.toString() };
  }

  function setDisabled(aEl, disabled){
    if(disabled){
      aEl.setAttribute('aria-disabled', 'true');
      aEl.setAttribute('tabindex', '-1');
    }else{
      aEl.removeAttribute('aria-disabled');
      aEl.removeAttribute('tabindex');
    }
  }

  function getEventName(trigger){
    const item = trigger ? trigger.closest('.schedule-item') : null;
    const name = item ? (item.querySelector('.schedule-card .b700')?.textContent || '').trim() : '';
    return name;
  }

  function openFromTrigger(trigger){
    const { ga, rv } = deriveLinksFromTrigger(trigger);
    active.gaHref = ga;
    active.rvHref = rv;

    btnGa.setAttribute('href', ga);
    btnRv.setAttribute('href', rv);

    const gaDisabled = (!ga || ga === '#');
    const rvDisabled = (!rv || rv === '#');
    setDisabled(btnGa, gaDisabled);
    setDisabled(btnRv, rvDisabled);
    btnRv.textContent = rvDisabled ? 'Racer/Vendor Passes (coming soon)' : 'Racer/Vendor Passes';

    const name = getEventName(trigger);
    if(subtitle){
      subtitle.textContent = name ? ('Select a ticket type for ' + name + '.') : 'Select a ticket type.';
    }

    setOpen(true);
  }

  function close(){ setOpen(false); }

  // Open modal when clicking "Buy Tickets" in schedule
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('a.schedule-ticket-btn');
    if(!trigger) return;
    // Only intercept on the homepage schedule section
    if(!trigger.closest('#schedule')) return;
    e.preventDefault();
    openFromTrigger(trigger);
  });

  // Close / action handling inside modal
  modal.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    const action = actionEl ? actionEl.getAttribute('data-action') : null;
    if(action === 'close'){
      e.preventDefault();
      close();
      return;
    }

    // Clicking the dim backdrop closes (anywhere outside the dialog)
    if(e.target === modal.querySelector('.ticket-modal-backdrop')){
      e.preventDefault();
      close();
    }
  });

  // Navigate + close when choosing an option
  function bindNav(aEl, getHref){
    aEl.addEventListener('click', (e) => {
      if(aEl.getAttribute('aria-disabled') === 'true'){
        e.preventDefault();
        return;
      }
      const href = getHref();
      if(!href || href === '#') return;
      e.preventDefault();
      close();
      window.location.href = href;
    });
  }
  bindNav(btnGa, () => active.gaHref);
  bindNav(btnRv, () => active.rvHref);

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if(modal.hidden) return;
    if(e.key === 'Escape'){ e.preventDefault(); close(); }
  });
}

// External links: always open in a new tab (safely)
function initExternalLinksNewTab(){
  function ensureRelTokens(a){
    const tokens = String(a.getAttribute('rel') || '')
      .split(/\s+/)
      .map(s => s.trim())
      .filter(Boolean);

    if(!tokens.includes('noopener')) tokens.push('noopener');
    if(!tokens.includes('noreferrer')) tokens.push('noreferrer');
    a.setAttribute('rel', tokens.join(' '));
  }

  function shouldHandleAnchor(a){
    if(!a || a.tagName !== 'A') return false;
    if(a.hasAttribute('download')) return false;

    const href = (a.getAttribute('href') || '').trim();
    if(!href) return false;

    // Skip in-page anchors + special schemes
    const lower = href.toLowerCase();
    if(lower.startsWith('#')) return false;
    if(lower.startsWith('mailto:')) return false;
    if(lower.startsWith('tel:')) return false;
    if(lower.startsWith('javascript:')) return false;

    // Only treat absolute http(s) links as "external"
    let url;
    try{
      url = new URL(href, window.location.href);
    }catch(_e){
      return false;
    }
    if(url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    // If we can compare origins, do it. If opened as file://, treat all http(s) as external.
    const origin = (window.location && typeof window.location.origin === 'string') ? window.location.origin : '';
    if(origin && origin !== 'null'){
      return url.origin !== origin;
    }
    return true;
  }

  function apply(root){
    const anchors = (root && root.querySelectorAll)
      ? Array.from(root.querySelectorAll('a[href]'))
      : [];

    for(const a of anchors){
      // If author already set target, only ensure rel safety on _blank.
      const existingTarget = (a.getAttribute('target') || '').trim();
      if(existingTarget){
        if(existingTarget === '_blank') ensureRelTokens(a);
        continue;
      }

      if(!shouldHandleAnchor(a)) continue;

      a.setAttribute('target', '_blank');
      ensureRelTokens(a);
    }
  }

  // Initial pass
  apply(document);

  // Cover any dynamically inserted content (e.g., injected cards/links)
  if(typeof MutationObserver === 'undefined') return;
  const body = document.body;
  if(!body) return;

  const observer = new MutationObserver((mutations) => {
    for(const m of mutations){
      if(m.type !== 'childList') continue;
      for(const node of m.addedNodes){
        if(!node) continue;
        if(node.nodeType !== 1) continue; // ELEMENT_NODE
        if(node.tagName === 'A') apply(node.parentElement || document);
        else apply(node);
      }
    }
  });

  observer.observe(body, { childList: true, subtree: true });
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

function scrollToAnchorId(id){
  if(!id) return;
  const expander = window.__expandCollapsibleSection;
  const el = (typeof expander === 'function') ? expander(id) : document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Smooth anchor scrolling + expand target section on mobile
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    const id = href ? href.slice(1) : '';
    const el = document.getElementById(id);
    if(!el) return;
    e.preventDefault();
    scrollToAnchorId(id);
  });
});

// Initial + resize equal-height pass for class cards
scheduleEqualizeClassCardHeights();
window.addEventListener('resize', scheduleEqualizeClassCardHeights);

// Init hamburger nav after the DOM exists
initMobileNav();

// Mobile: collapse/expand sections (Classes stays open)
initMobileCollapsibleSections();

// If page loads with a hash, expand + scroll to it on mobile
if(window.location && window.location.hash && window.location.hash.length > 1){
  const id = window.location.hash.slice(1);
  // Defer a tick so collapsible structure/state is applied first.
  setTimeout(() => scrollToAnchorId(id), 0);
}

// Render current year (pre-season TBD) cards
renderCurrentYearTbdStandings();

// Render 2025 archive points table
render2025PointsFromXlsx();

// Past races photo galleries (thumb strip + lightbox)
initPastRacesPhotoGalleries();

// Schedule: ticket picker modal
initScheduleTicketModal();

// External links should open a new tab
initExternalLinksNewTab();
