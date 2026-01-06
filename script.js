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
