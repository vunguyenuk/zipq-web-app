/* Estio web app — core runtime
 * Screens come from the design (as <template data-screen>). Controllers add data + behaviour.
 */
'use strict';

// ---------- DOM helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const text = (el) => norm(el && el.textContent);
const ownText = (el) => norm([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' '));
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };
const frag = (s) => { const t = document.createElement('template'); t.innerHTML = s; return t.content; };

/** deepest element whose own text (or full text) equals `t` */
function byText(root, t, opts = {}) {
  const want = norm(t);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const v = norm(n.nodeValue);
    if (!v) continue;
    if (opts.starts ? v.startsWith(want) : v === want) {
      const el = n.parentElement;
      if (opts.sel) { const c = el.closest(opts.sel); if (c && root.contains(c)) return c; continue; }
      return el;
    }
  }
  // fall back: full textContent match on elements
  if (!opts.noFull) {
    const cands = $$(opts.sel || '*', root).filter((e) => text(e) === want);
    return cands.length ? cands[cands.length - 1] : null;
  }
  return null;
}
const allByText = (root, t, sel) => $$(sel || '*', root).filter((e) => ownText(e) === norm(t));
/** element by child-index path relative to root, e.g. "0.1.3" */
function at(root, p) {
  let e = root;
  for (const i of String(p).split('.')) { if (!e) return null; e = e.children[+i]; }
  return e;
}
/** replace the first non-empty direct text node (keeps icons / child spans) */
function setOwn(el, v) {
  if (!el) return;
  const n = [...el.childNodes].find((c) => c.nodeType === 3 && c.nodeValue.trim());
  if (n) n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, String(v));
  else el.insertBefore(document.createTextNode(String(v)), el.firstChild);
}
/** replace text everywhere in subtree (text nodes + some attributes) */
function replaceTextIn(root, map) {
  const keys = Object.keys(map).filter((k) => k && map[k] != null && k !== map[k]).sort((a, b) => b.length - a.length);
  if (!keys.length) return;
  const re = new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; const nodes = [];
  while ((n = tw.nextNode())) nodes.push(n);
  nodes.forEach((n) => { if (re.test(n.nodeValue)) { re.lastIndex = 0; n.nodeValue = n.nodeValue.replace(re, (m) => map[m]); } re.lastIndex = 0; });
  $$('[aria-label],[placeholder],[title]', root).forEach((e) => ['aria-label', 'placeholder', 'title'].forEach((a) => {
    const v = e.getAttribute(a); if (v && re.test(v)) { re.lastIndex = 0; e.setAttribute(a, v.replace(re, (m) => map[m])); } re.lastIndex = 0;
  }));
}
function hide(el) { if (el) el.style.display = 'none'; }
function show(el, d = '') { if (el) el.style.display = d; }
function css(el, o) { if (el) Object.assign(el.style, o); return el; }
/** clone a row prototype n times into its parent (removing all siblings that match `sameAs`) */
function renderList(container, proto, items, fill, { keep = [] } = {}) {
  const tpl = proto.cloneNode(true);
  [...container.children].forEach((c) => { if (!keep.includes(c)) c.remove(); });
  items.forEach((it, i) => { const el = tpl.cloneNode(true); fill(el, it, i); container.appendChild(el); });
}
/** Register a delegated action and make non-native action targets keyboard operable. */
function onClick(el, fn) {
  if (!el) return el;
  el.__h = fn;
  el.style.cursor = 'pointer';
  const role = el.getAttribute('role');
  const native = el.matches('button, a[href], input, select, textarea, summary');
  const separatelyManaged = role && !['button', 'link'].includes(role);
  const nestedInControl = el.parentElement?.closest('button, a[href], [role="checkbox"], [role="switch"]');
  if (!native && !separatelyManaged && !nestedInControl) {
    if (!role) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (!el.__keyboardClickBound) {
      el.addEventListener('keydown', (e) => {
        if (e.target !== el || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        e.stopPropagation();
        el.click();
      });
      el.__keyboardClickBound = true;
    }
  }
  return el;
}
function onText(root, t, fn, sel) { const e = byText(root, t, { sel: sel || 'button,a,[role=button],[role=checkbox]' }); if (e) onClick(e, fn); return e; }

// ---------- dates ----------
const DAY = 864e5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function today0() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const D = (n) => iso(new Date(today0().getTime() + n * DAY)); // date n days from today
const pd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const diffDays = (s) => Math.round((pd(s) - today0()) / DAY);
function fmtTime(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return m ? `${h}:${String(m).padStart(2, '0')} ${ap}` : `${h} ${ap}`;
}
const fmtTimeFull = (t) => { if (!t) return ''; let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };
const parseUSTimeValue = (s) => {
  if (!s) return '';
  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)) return s;
  const m = String(s).trim().match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)$/i);
  if (!m) return '';
  let hour = +m[1]; if (hour < 1 || hour > 12) return '';
  const ap = m[3].toUpperCase(); hour = hour % 12 + (ap === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${m[2] || '00'}`;
};
const usDateValue = (s) => { if (!s) return ''; const d = pd(s); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`; };
const parseUSDateValue = (s) => {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const month = +m[1], day = +m[2], year = +m[3]; const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
};
const shortDate = (s) => usDateValue(s);
const wdDate = (s) => { const d = pd(s); return `${WD[d.getDay()]}, ${usDateValue(s)}`; };
const wdDate2 = (s) => { const d = pd(s); return `${WD[d.getDay()]} ${usDateValue(s)}`; };
const longToday = () => { const d = today0(); return `${WD_L[d.getDay()]}, ${MONTHS_L[d.getMonth()]} ${d.getDate()}`; };
/** "Today" / "Tomorrow" / "Yesterday" / "Fri" / "Sep 22" */
function relDay(s) {
  if (!s) return '';
  const n = diffDays(s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return WD[pd(s).getDay()];
  return shortDate(s);
}
function relWhen(s, t) { const r = relDay(s); return t ? `${r} ${fmtTime(t)}` : r; }
function ago(s) { const n = -diffDays(s); return n <= 0 ? 'Today' : n === 1 ? '1d ago' : `${n}d ago`; }
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US');
const initials = (name) => norm(String(name).replace(/^the\s+/i, '')).split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// ---------- store ----------
// Keep the legacy storage key so existing local demos migrate without data loss.
const DB_KEY = 'estio.db.v1';
let S;
function migrateProductCopy(value) {
  if (typeof value === 'string') return value
    .replace(/Title (?:workstream|work item) blocked/gi, 'Title report blocked')
    .replace(/\bout to sign\b/gi, 'out for signature')
    .replace(/\bworkstream\b/gi, 'work item')
    .replace(/\bMorning scan\b/gi, 'Suggested by Sofia')
    .replace(/\bSofia check\b/gi, 'Suggested by Sofia')
    .replace(/\bawaiting signatures\b/gi, 'Out for signature')
    .replace(/\bno envelopes out\b/gi, 'no signature requests');
  if (Array.isArray(value)) { value.forEach((v, i) => { value[i] = migrateProductCopy(v); }); return value; }
  if (value && typeof value === 'object') { Object.keys(value).forEach((k) => { value[k] = migrateProductCopy(value[k]); }); }
  return value;
}
function loadDB() {
  try { const raw = localStorage.getItem(DB_KEY); if (raw) { const db = JSON.parse(raw); if (db && db.version === SEED_VERSION) return migrateProductCopy(db); } } catch (e) { /* ignore */ }
  return seedDB();
}
function saveDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
/** mutate + persist + re-render current screen (keeps scroll) */
function commit(fn, { rerender = true } = {}) { fn(S); saveDB(); if (rerender) Router.refresh(); }
function resetDB() { localStorage.removeItem(DB_KEY); S = seedDB(); saveDB(); }
const byId = (list, id) => (S[list] || []).find((x) => x.id === id);
function logActivity(txId, textMsg, kind = 'update') { if (!txId) return; S.activity.unshift({ id: uid('a'), txId, text: textMsg, kind, at: new Date().toISOString() }); }
function notify(title, body, link) { S.notifications.unshift({ id: uid('n'), title, body, link, at: new Date().toISOString(), read: false }); }

// ---------- toast ----------
function toast(msg, opts = {}) {
  const root = $('#toast-root');
  const el = html(`<div class="toast">${opts.icon === false ? '' : '<span class="toast-dot"></span>'}<span>${esc(msg)}</span>${opts.action ? `<button class="toast-act">${esc(opts.action)}</button>` : ''}</div>`);
  if (opts.action) $('.toast-act', el).onclick = () => { opts.onAction && opts.onAction(); el.remove(); };
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); }, opts.ms || 2800);
}

// ---------- overlays: modal / drawer / menu ----------
let overlayReturnFocus = null;
function closeOverlays() {
  $('#overlay-root').innerHTML = '';
  document.removeEventListener('keydown', escClose);
  document.removeEventListener('keydown', trapOverlayFocus);
  const target = overlayReturnFocus;
  overlayReturnFocus = null;
  if (target && target.isConnected) target.focus();
}
function escClose(e) { if (e.key === 'Escape') closeOverlays(); }
function trapOverlayFocus(e) {
  if (e.key === 'Escape') { closeOverlays(); return; }
  if (e.key !== 'Tab') return;
  const layer = $('#overlay-root');
  const focusable = $$('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])', layer).filter((el) => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function openLayer(el, { scrim = true, onClose } = {}) {
  closeOverlays();
  overlayReturnFocus = document.activeElement;
  const root = $('#overlay-root');
  if (scrim) { const s = html('<div class="scrim"></div>'); s.onclick = () => { closeOverlays(); onClose && onClose(); }; root.appendChild(s); }
  root.appendChild(el);
  if (window.DesignSystem) window.DesignSystem.classifyReadableText(el);
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  const title = $('.modal-t', el);
  if (title) {
    if (!title.id) title.id = 'dialog-title-' + Math.random().toString(36).slice(2, 8);
    el.setAttribute('aria-labelledby', title.id);
  }
  document.addEventListener('keydown', trapOverlayFocus);
  requestAnimationFrame(() => el.classList.add('in'));
  const f = $('input:not([type=hidden]),textarea,select', el); if (f) setTimeout(() => f.focus(), 30);
  return el;
}
/**
 * fields: [{name,label,type:text|email|tel|date|time|select|textarea|chips, options, value, placeholder, required, hint, half}]
 */
function openForm({ title, subtitle, fields = [], submit = 'Save', onSubmit, danger, extra = '', width = 520 }) {
  const f = html(`<form class="modal" style="width:${width}px">
    <div class="modal-h"><div><div class="modal-t">${esc(title)}</div>${subtitle ? `<div class="modal-s">${esc(subtitle)}</div>` : ''}</div>
    <button type="button" class="icon-btn" data-close aria-label="Close">${ICON.x}</button></div>
    <div class="modal-b"><div class="fgrid">${fields.map(fieldHTML).join('')}</div>${extra}</div>
    <div class="modal-f"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(submit)}</button></div>
  </form>`);
  $$('[data-close]', f).forEach((b) => (b.onclick = closeOverlays));
  $$('.chips', f).forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; e.preventDefault();
    if (g.dataset.multi) b.classList.toggle('on'); else { $$('button', g).forEach((x) => x.classList.remove('on')); b.classList.add('on'); }
  }));
  f.onsubmit = (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach((fd) => {
      if (fd.type === 'chips') { const on = $$(`.chips[data-name="${fd.name}"] button.on`, f).map((b) => b.dataset.v); data[fd.name] = fd.multi ? on : on[0] || ''; }
      else if (fd.type === 'checkbox') data[fd.name] = f.elements[fd.name].checked;
      else if (fd.type === 'date') data[fd.name] = parseUSDateValue(f.elements[fd.name].value.trim());
      else if (fd.type === 'time') data[fd.name] = parseUSTimeValue(f.elements[fd.name].value.trim());
      else if (fd.name) data[fd.name] = f.elements[fd.name].value.trim();
    });
    const miss = fields.find((fd) => fd.required && !data[fd.name]);
    if (miss) { const el = f.elements[miss.name]; el && el.focus(); el && el.classList.add('err'); return; }
    const r = onSubmit && onSubmit(data, f);
    if (r !== false) closeOverlays();
  };
  return openLayer(f);
}
function fieldHTML(fd) {
  const lab = fd.label ? `<label class="flabel">${esc(fd.label)}${fd.required ? ' <span style="color:#B42318">*</span>' : ''}</label>` : '';
  const hint = fd.hint ? `<div class="fhint">${esc(fd.hint)}</div>` : '';
  const v = fd.value ?? '';
  let ctl;
  if (fd.type === 'select') ctl = `<select class="input" name="${fd.name}">${(fd.options || []).map((o) => { const [val, lbl] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lbl)}</option>`; }).join('')}</select>`;
  else if (fd.type === 'textarea') ctl = `<textarea class="input" name="${fd.name}" rows="${fd.rows || 4}" placeholder="${esc(fd.placeholder || '')}">${esc(v)}</textarea>`;
  else if (fd.type === 'chips') ctl = `<div class="chips" data-name="${fd.name}" ${fd.multi ? 'data-multi="1"' : ''}>${fd.options.map((o) => { const [val, lbl] = Array.isArray(o) ? o : [o, o]; const on = fd.multi ? (v || []).includes(val) : val === v; return `<button type="button" class="chip-b ${on ? 'on' : ''}" data-v="${esc(val)}">${esc(lbl)}</button>`; }).join('')}</div>`;
  else if (fd.type === 'checkbox') ctl = `<label class="cbx"><input type="checkbox" name="${fd.name}" ${v ? 'checked' : ''}> ${esc(fd.text || '')}</label>`;
  else if (fd.type === 'static') ctl = `<div class="fstatic">${fd.html || esc(v)}</div>`;
  else if (fd.type === 'date') ctl = `<input class="input" name="${fd.name}" type="text" inputmode="numeric" value="${esc(usDateValue(v))}" placeholder="MM/DD/YYYY" data-date-input>`;
  else if (fd.type === 'time') ctl = `<input class="input" name="${fd.name}" type="text" inputmode="numeric" value="${esc(fmtTimeFull(v))}" placeholder="h:mm AM" data-time-input>`;
  else ctl = `<input class="input" name="${fd.name}" type="${fd.type || 'text'}" value="${esc(v)}" placeholder="${esc(fd.placeholder || '')}" ${fd.autocomplete ? `autocomplete="${fd.autocomplete}"` : ''}>`;
  return `<div class="field ${fd.half ? 'half' : ''}">${lab}${ctl}${hint}</div>`;
}
function confirmDlg({ title, body, ok = 'Confirm', danger, onOk }) {
  return openForm({ title, fields: [{ type: 'static', html: `<div style="font-size:14px;color:#334155;line-height:1.5">${esc(body)}</div>` }], submit: ok, danger, onSubmit: () => onOk && onOk(), width: 440 });
}
/** simple content modal */
function openSheet({ title, subtitle, body, footer, width = 560, onMount }) {
  const el = html(`<div class="modal" style="width:${width}px">
    <div class="modal-h"><div><div class="modal-t">${esc(title)}</div>${subtitle ? `<div class="modal-s">${esc(subtitle)}</div>` : ''}</div>
    <button type="button" class="icon-btn" data-close aria-label="Close">${ICON.x}</button></div>
    <div class="modal-b">${body}</div>${footer ? `<div class="modal-f">${footer}</div>` : ''}</div>`);
  $$('[data-close]', el).forEach((b) => (b.onclick = closeOverlays));
  openLayer(el);
  onMount && onMount(el);
  return el;
}
/** popover menu anchored to an element */
function openMenu(anchor, items, { align = 'left', width = 220 } = {}) {
  const r = anchor.getBoundingClientRect();
  const m = html(`<div class="menu" style="width:${width}px"></div>`);
  items.forEach((it) => {
    if (it === '-') { m.appendChild(html('<div class="menu-sep"></div>')); return; }
    if (it.header) { m.appendChild(html(`<div class="menu-h">${esc(it.header)}</div>`)); return; }
    const b = html(`<button class="menu-i ${it.danger ? 'danger' : ''} ${it.checked ? 'checked' : ''}">${it.checked ? ICON.check : ''}<span>${esc(it.label)}</span>${it.meta ? `<span class="menu-m">${esc(it.meta)}</span>` : ''}</button>`);
    b.onclick = (e) => { e.stopPropagation(); closeOverlays(); it.onClick && it.onClick(); };
    m.appendChild(b);
  });
  const layer = html('<div class="menu-layer"></div>');
  layer.onclick = closeOverlays;
  layer.appendChild(m);
  closeOverlays();
  $('#overlay-root').appendChild(layer);
  if (window.DesignSystem) window.DesignSystem.classifyReadableText(layer);
  document.addEventListener('keydown', escClose);
  const menuHeight = Math.min(items.length * 36 + 12, 400);
  const top = align === 'after' ? Math.min(r.top, window.innerHeight - 20 - menuHeight) : Math.min(r.bottom + 6, window.innerHeight - 20 - menuHeight);
  let left = align === 'right' ? r.right - width : align === 'after' ? r.right + 8 : r.left;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  css(m, { top: top + 'px', left: left + 'px' });
  m.onclick = (e) => e.stopPropagation();
  return m;
}
/** right-side drawer */
function openDrawer({ title, subtitle, body, footer, width = 480, onMount }) {
  const el = html(`<aside class="drawer" style="width:${width}px">
    <div class="drawer-h"><div><div class="modal-s" style="margin:0 0 2px">${esc(subtitle || '')}</div><div class="modal-t">${esc(title)}</div></div>
    <button type="button" class="icon-btn" data-close aria-label="Close">${ICON.x}</button></div>
    <div class="drawer-b">${body}</div>${footer ? `<div class="modal-f">${footer}</div>` : ''}</aside>`);
  $$('[data-close]', el).forEach((b) => (b.onclick = closeOverlays));
  openLayer(el);
  onMount && onMount(el);
  return el;
}

const ICON = {
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  checkW: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 12.5 4 4 8-9"></path></svg>',
  search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  mic: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  doc: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5"/></svg>',
  user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5"/></svg>',
  folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>',
  cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  chat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z"/></svg>',
};

// ---------- generic design-control behaviour ----------
const UI = {
  key(el) {
    const scr = Router.current && Router.current.screen;
    const lab = el.getAttribute('aria-label');
    if (lab) return scr + '|' + lab + '|' + text(el).slice(0, 30);
    const p = []; let e = el;
    while (e && e.id !== 'app') { p.unshift([...e.parentElement.children].indexOf(e)); e = e.parentElement; }
    return scr + '|' + p.join('.');
  },
  setSwitch(el, on) {
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    el.style.background = on ? '#0463CA' : '#CBD5E1';
    const k = el.firstElementChild;
    if (k) { const w = parseFloat(el.style.width) || 38; const kw = parseFloat(k.style.width) || 18; k.style.left = on ? w - kw - 2 + 'px' : '2px'; k.style.transition = 'left .15s'; }
    el.style.transition = 'background .15s';
  },
  setCheck(el, on) {
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    if (on) { el.style.background = '#0463CA'; el.style.boxShadow = 'none'; el.style.color = '#FFFFFF'; el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.justifyContent = 'center'; el.innerHTML = ICON.checkW; }
    else { el.style.background = '#FFFFFF'; el.style.boxShadow = 'inset 0 0 0 1.5px #CBD5E1'; el.innerHTML = ''; }
  },
  pressedStyle(btn) {
    let scope = btn.parentElement;
    for (let i = 0; i < 5 && scope; i++, scope = scope.parentElement) {
      const p = $$('[aria-pressed="true"]', scope).find((x) => x !== btn && x.tagName === btn.tagName);
      if (p) return p.getAttribute('style');
    }
    return 'background:#E3F0FC;color:#034F9F;border:1px solid #9CC3EE;';
  },
  unpressedStyle(btn) {
    let scope = btn.parentElement;
    for (let i = 0; i < 5 && scope; i++, scope = scope.parentElement) {
      const p = $$('[aria-pressed="false"]', scope).find((x) => x !== btn && x.tagName === btn.tagName);
      if (p) return p.getAttribute('style');
    }
    return btn.getAttribute('style');
  },
  press(btn, on, multi) {
    if (!multi && on) {
      [...btn.parentElement.children].filter((s) => s !== btn && s.getAttribute('aria-pressed') === 'true').forEach((s) => {
        const st = btn.getAttribute('style'); s.setAttribute('style', st); s.setAttribute('aria-pressed', 'false');
      });
    }
    const cur = btn.getAttribute('aria-pressed') === 'true';
    if (cur === on) return;
    btn.setAttribute('style', on ? UI.pressedStyle(btn) : UI.unpressedStyle(btn));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  },
  /** segmented tab/button groups without aria: swap style with the active sibling */
  swapActive(btn, isActive) {
    const sibs = [...btn.parentElement.children].filter((s) => s.tagName === btn.tagName);
    const active = sibs.find(isActive);
    if (!active || active === btn) return;
    const a = active.getAttribute('style'); active.setAttribute('style', btn.getAttribute('style')); btn.setAttribute('style', a);
    const ai = active.innerHTML; // keep inner (counts) but swap inner styles of children spans too
    const sa = $$('*', active).map((e) => e.getAttribute('style')); const sb = $$('*', btn).map((e) => e.getAttribute('style'));
    if (sa.length === sb.length) { $$('*', active).forEach((e, i) => sb[i] != null && e.setAttribute('style', sb[i])); $$('*', btn).forEach((e, i) => sa[i] != null && e.setAttribute('style', sa[i])); }
    return ai;
  },
  restore(root) {
    const st = S.ui || {};
    $$('[role=switch]', root).forEach((el) => { if (el.dataset.dyn) return; const k = UI.key(el); if (k in st) UI.setSwitch(el, st[k]); });
    $$('[role=checkbox]', root).forEach((el) => { if (el.closest('[data-dyn]')) return; const k = UI.key(el); if (k in st) UI.setCheck(el, st[k]); });
    $$('input,textarea,select', root).forEach((el) => { if (el.closest('[data-dyn]') || el.dataset.nopersist) return; const k = 'v:' + UI.key(el); if (k in st) { if (el.type === 'checkbox') el.checked = st[k]; else el.value = st[k]; } });
    $$('[aria-pressed]', root).forEach((el) => { if (el.closest('[data-dyn]')) return; const k = 'p:' + UI.key(el); if (k in st) UI.press(el, st[k], true); });
  },
};

// ---------- click dispatcher ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  // explicit handlers
  let el = t;
  while (el && el !== document.body) {
    if (el.__h) { e.preventDefault(); e.stopPropagation(); el.__h(e, el); return; }
    el = el.parentElement;
  }
  if (!t.closest('#app')) return;
  const sw = t.closest('[role=switch]');
  if (sw) { e.preventDefault(); const on = sw.getAttribute('aria-checked') !== 'true'; UI.setSwitch(sw, on); S.ui[UI.key(sw)] = on; saveDB(); Hooks.emit('switch', sw, on); return; }
  const cb = t.closest('[role=checkbox]');
  if (cb) { e.preventDefault(); const on = cb.getAttribute('aria-checked') !== 'true'; UI.setCheck(cb, on); if (!cb.closest('[data-dyn]')) { S.ui[UI.key(cb)] = on; saveDB(); } Hooks.emit('check', cb, on); return; }
  const pr = t.closest('[aria-pressed]');
  if (pr && pr.tagName !== 'A') {
    e.preventDefault();
    const group = pr.parentElement;
    const multi = /one or more/i.test(text(group.parentElement)) || pr.dataset.multi || /^\+ /.test(text(pr));
    const on = multi ? pr.getAttribute('aria-pressed') !== 'true' : true;
    UI.press(pr, on, multi);
    if (!pr.closest('[data-dyn]')) { [...group.children].forEach((s) => { if (s.hasAttribute('aria-pressed')) S.ui['p:' + UI.key(s)] = s.getAttribute('aria-pressed') === 'true'; }); saveDB(); }
    Hooks.emit('press', pr, on);
    return;
  }
  const a = t.closest('a[href]');
  if (a) {
    const h = a.getAttribute('href');
    if (h === '#' || h === '') { e.preventDefault(); Fallback.run(a); return; }
    return; // normal hash navigation
  }
  const b = t.closest('button');
  if (b && !b.closest('form')) { e.preventDefault(); Fallback.run(b); }
});
// persist free inputs in static screens
document.addEventListener('change', (e) => {
  const el = e.target;
  if (!el.closest || !el.closest('#app') || el.closest('[data-dyn]') || el.dataset.nopersist) return;
  S.ui['v:' + UI.key(el)] = el.type === 'checkbox' ? el.checked : el.value; saveDB();
});

const Hooks = {
  map: {},
  on(ev, fn) { (this.map[ev] = this.map[ev] || []).push(fn); },
  emit(ev, ...a) { (this.map[ev] || []).forEach((f) => f(...a)); },
};

/** Buttons/links nobody wired explicitly: give meaningful feedback based on their label */
const Fallback = {
  rules: [],
  add(re, fn) { this.rules.push([re, fn]); },
  run(el) {
    const label = text(el) || el.getAttribute('aria-label') || '';
    for (const [re, fn] of this.rules) if (re.test(label)) { fn(el, label); return; }
    if (!label) return;
    toast(`${label.replace(/\s*\d+$/, '')} — done`);
  },
};

// ---------- router ----------
const Router = {
  routes: [],
  current: null,
  add(pattern, handler) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (m, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ re, keys, handler });
  },
  go(h) { if (location.hash === h) this.refresh(); else location.hash = h; },
  parse() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, '')) || '/home';
    const [p, q] = raw.split('?');
    const query = Object.fromEntries(new URLSearchParams(q || ''));
    for (const r of this.routes) {
      const m = p.match(r.re);
      if (m) { const params = {}; r.keys.forEach((k, i) => (params[k] = m[i + 1])); return { r, params, query, path: p }; }
    }
    return null;
  },
  refresh() { this.render(true); },
  render(keepScroll) {
    const hit = this.parse();
    if (!hit) { location.hash = '#/home'; return; }
    const guard = Auth.guard(hit.path);
    if (guard) { location.hash = guard; return; }
    const scrollers = keepScroll ? $$('#app *').filter((e) => e.scrollTop > 0).map((e) => [UI.key(e), e.scrollTop]) : [];
    const out = hit.r.handler(hit.params, hit.query) || {};
    if (out.redirect) { location.hash = out.redirect; return; }
    this.current = { ...out, params: hit.params, query: hit.query, path: hit.path };
    mountScreen(out.screen, (root) => { out.ctrl && out.ctrl(root, hit.params, hit.query); });
    if (!keepScroll) { $('#app').scrollTop = 0; closeOverlays(); } else scrollers.forEach(([k, v]) => { const e = $$('#app *').find((x) => UI.key(x) === k); if (e) e.scrollTop = v; });
    out.after && out.after();
  },
};
window.addEventListener('hashchange', () => Router.render(false));

function mountScreen(key, ctrl) {
  const tpl = document.querySelector(`template[data-screen="${key}"]`);
  const app = $('#app');
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));
  const root = app.firstElementChild;
  root.dataset.screen = key;
  $$('img[data-asset]', app).forEach((i) => (i.src = window.ASSETS[i.dataset.asset] || ''));
  const tx = (Router.current && Router.current.params && Router.current.params.id && S.tx.find((t) => t.id === Router.current.params.id)) ? Router.current.params.id : (S.lastTx || (S.tx[0] && S.tx[0].id));
  $$('a[href*="@tx"]', app).forEach((a) => a.setAttribute('href', a.getAttribute('href').replace('@tx', tx)));
  Shell.apply(app, key);
  ctrl && ctrl(app);
  UI.restore(app);
  Shell.after(app, key);
  if (window.DesignSystem) window.DesignSystem.enhance(app, key);
}

// ---------- boot ----------
function boot() {
  S = loadDB();
  saveDB();
  if (!location.hash) location.hash = S.session.signedIn ? '#/home' : '#/signin';
  Router.render(false);
  window.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') {
      if (e.defaultPrevented) return;
      e.preventDefault(); Search.open();
    }
    if (mod && e.key === '/') { e.preventDefault(); Search.open(); }
  });
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => { const w = window.innerWidth; if ((w < 760) !== (lastW < 760)) Router.refresh(); lastW = w; });
}
