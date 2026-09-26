/* Custom select: replaces the OS popup (which covers the field) with a
 * listbox that opens *below* the field — or above when there is no room —
 * and never overlaps the value being edited. The native <select> stays in
 * the DOM (visually hidden) so existing change handlers and form reads work. */
const CSelect = (() => {
  let open = null; // { sel, trigger, menu, idx }
  const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const CHEV = '<svg class="cs-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  let uid = 0;

  const label = (sel) => { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; };
  function sync(sel) {
    const t = sel._csTrigger; if (!t) return;
    t.querySelector('.cs-value').textContent = label(sel);
    t.disabled = sel.disabled;
  }

  function enhance(sel) {
    if (sel._csTrigger || sel.multiple || sel.closest('.cs-skip')) return;
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'cs-trigger' + (sel.classList.contains('input') ? ' input' : '');
    const st = sel.getAttribute('style') || '';
    const w = st.match(/(?:^|;)\s*(width|flex(?:-grow)?|grid-column|min-width|max-width|justify-self)\s*:[^;]+/g);
    if (w) t.setAttribute('style', w.join(';'));
    t.setAttribute('aria-haspopup', 'listbox');
    t.setAttribute('aria-expanded', 'false');
    const lab = sel.getAttribute('aria-label') || (sel.labels && sel.labels[0] && sel.labels[0].textContent.trim());
    if (lab) t.setAttribute('aria-label', lab);
    t.innerHTML = `<span class="cs-value"></span>${CHEV}`;
    sel.classList.add('cs-native');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    sel.after(t);
    sel._csTrigger = t;
    sync(sel);
    sel.addEventListener('change', () => sync(sel));
    t.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open && open.sel === sel ? close() : show(sel); });
    t.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key) && !open) { e.preventDefault(); show(sel); }
    });
  }

  function place() {
    if (!open) return;
    const { trigger, menu } = open;
    const r = trigger.getBoundingClientRect();
    const w = Math.max(r.width, 180);
    menu.style.minWidth = w + 'px';
    const h = menu.offsetHeight;
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const top = (h + 6 <= below || below >= above) ? r.bottom + 6 : r.top - 6 - Math.min(h, above);
    menu.style.maxHeight = Math.max(160, (h + 6 <= below || below >= above) ? below - 6 : above - 6) + 'px';
    let left = r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - menu.offsetWidth - 8));
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
  }

  function focusIdx(i) {
    if (!open) return;
    const items = [...open.menu.querySelectorAll('.cs-opt:not([aria-disabled="true"])')];
    if (!items.length) return;
    open.idx = (i + items.length) % items.length;
    items.forEach((b, j) => b.classList.toggle('active', j === open.idx));
    items[open.idx].scrollIntoView({ block: 'nearest' });
  }

  function choose(sel, i) {
    if (sel.selectedIndex !== i) {
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sync(sel);
    const t = sel._csTrigger; close(); t && t.focus();
  }

  function show(sel) {
    close();
    const trigger = sel._csTrigger; if (!trigger || sel.disabled) return;
    const id = 'cs-list-' + (++uid);
    const menu = document.createElement('div');
    menu.className = 'cs-menu';
    menu.id = id;
    menu.setAttribute('role', 'listbox');
    [...sel.options].forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cs-opt' + (i === sel.selectedIndex ? ' selected' : '');
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(i === sel.selectedIndex));
      if (o.disabled) b.setAttribute('aria-disabled', 'true');
      b.innerHTML = `<span>${o.textContent.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>${i === sel.selectedIndex ? CHECK : ''}`;
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', (e) => { e.stopPropagation(); if (!o.disabled) choose(sel, i); });
      menu.appendChild(b);
    });
    menu.addEventListener('mousedown', (e) => e.stopPropagation());
    document.body.appendChild(menu);
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', id);
    trigger.classList.add('open');
    open = { sel, trigger, menu, idx: 0 };
    place();
    const enabled = [...sel.options].filter((o) => !o.disabled);
    focusIdx(Math.max(0, enabled.indexOf(sel.options[sel.selectedIndex])));
    requestAnimationFrame(() => menu.classList.add('in'));
  }

  function close() {
    if (!open) return;
    open.menu.remove();
    open.trigger.setAttribute('aria-expanded', 'false');
    open.trigger.classList.remove('open');
    open = null;
  }

  document.addEventListener('mousedown', (e) => { if (open && !open.trigger.contains(e.target) && !open.menu.contains(e.target)) close(); }, true);
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    const items = [...open.menu.querySelectorAll('.cs-opt:not([aria-disabled="true"])')];
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); const t = open.trigger; close(); t.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx(open.idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx(open.idx - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); const b = items[open.idx]; b && b.click(); }
    else if (e.key === 'Tab') close();
  }, true);
  window.addEventListener('resize', close);
  document.addEventListener('scroll', (e) => { if (open && !open.menu.contains(e.target)) place(); }, true);

  function scan(root = document) {
    root.querySelectorAll && root.querySelectorAll('select:not(.cs-native)').forEach(enhance);
    document.querySelectorAll('select.cs-native').forEach(sync);
  }
  let queued = false;
  new MutationObserver(() => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; scan(); if (open && !document.body.contains(open.trigger)) close(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => scan());
  return { scan, close };
})();
