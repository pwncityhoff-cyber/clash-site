// Tabs logic (generic)
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
