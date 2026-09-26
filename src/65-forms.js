/* Forms library, templates + playbook, form editor, send for signature */
const Forms = {
  cat: 'All', q: '', showAll: false,
  library(app, q) {
    const main = $('main', app);
    if (q.q != null) this.q = q.q;
    const targetTx = q.tx && txOf(q.tx);
    const search = $('input[aria-label="Search forms"]', main); search.value = this.q; search.dataset.nopersist = '1';
    search.addEventListener('input', () => { this.q = search.value; this.grid(main, targetTx); });
    const h1 = $('h1', main);
    if (h1.nextElementSibling) h1.nextElementSibling.textContent = targetTx ? `Adding forms to ${txLabel(targetTx)}` : `${FORM_LIBRARY.length} C.A.R. forms in your library`;
    const secNav = $('nav[aria-label="Forms sections"]', main);
    $$('span', secNav)[0].textContent = FORM_LIBRARY.length; $$('span', secNav)[1].textContent = S.templates.length;
    const cats = $$('a', $('nav[aria-label="Form categories"]', main));
    const onS = cats[0].getAttribute('style'), offS = cats[1].getAttribute('style');
    cats.forEach((a) => { const c = text(a); a.setAttribute('style', c === this.cat ? onS : offS); onClick(a, () => { this.cat = c; Router.refresh(); }); });
    // Ask Sofia which form
    const askBar = main.children[1];
    const lbl = $('label', askBar); const inp = lbl && $('input', lbl);
    if (inp) inp.placeholder = 'Describe the situation. Sofia will pick the right packet…';
    const go = () => { const v = inp && inp.value.trim(); Chats.startFrom(v ? `Which form do I need? ${v}` : 'Which form do I need?', { tx: targetTx && targetTx.id }); };
    if (inp) { inp.dataset.nopersist = '1'; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); }
    onClick($('a[aria-label="Ask Sofia"]', askBar), go);
    this.grid(main, targetTx);
  },
  grid(main, targetTx) {
    const wrap = main.children[2];
    const grid = wrap.children[0];
    if (!this.cardP) this.cardP = grid.children[0].cloneNode(true);
    const q = this.q.toLowerCase();
    const list = FORM_LIBRARY.filter((f) => (this.cat === 'All' || f.cat === this.cat) && (!q || (f.code + ' ' + f.name).toLowerCase().includes(q)));
    const shown = this.showAll || q || this.cat !== 'All' ? list : list.slice(0, 12);
    grid.innerHTML = '';
    shown.forEach((f) => {
      const c = this.cardP.cloneNode(true);
      const b = c.children[1];
      b.children[0].textContent = f.code; b.children[1].textContent = f.name; b.children[2].textContent = `${f.pages} page${f.pages > 1 ? 's' : ''} · v12/24`;
      const add = b.children[3];
      const already = targetTx && S.docs.some((d) => d.txId === targetTx.id && d.code === f.code);
      add.textContent = already ? '✓ Added' : targetTx ? `Add to ${txLabel(targetTx)}` : 'Add to transaction';
      onClick(add, () => { if (already) return; this.addToTx(f, targetTx); });
      onClick(c, () => this.preview(f, targetTx));
      grid.appendChild(c);
    });
    if (!shown.length) grid.innerHTML = '<div class="empty-note" style="grid-column:1/-1">No forms match.</div>';
    const more = wrap.children[1];
    if (more) {
      if (shown.length >= list.length) hide(more); else { show(more); more.textContent = `Show all ${list.length} forms`; onClick(more, () => { this.showAll = true; this.grid(main, targetTx); }); }
    }
  },
  addToTx(f, t) {
    const doAdd = (tx) => {
      commit(() => { S.docs.push({ id: uid('d'), txId: tx.id, code: f.code, name: f.name, status: 'not-started', progress: 0, pages: f.pages, updated: D(0), source: 'Form' }); logActivity(tx.id, `${f.code} added from the forms library`, 'doc'); });
      toast(`${f.code} added to ${txLabel(tx)}`, { action: 'Open', onAction: () => Router.go(`#/form/${tx.id}/${f.code}`) });
    };
    if (t) return doAdd(t);
    openForm({ title: `Add ${f.code} to a transaction`, subtitle: f.name, fields: [{ name: 'tx', label: 'Transaction', type: 'select', options: S.tx.filter((x) => x.status === 'current' || x.status === 'pending').map((x) => [x.id, `${txLabel(x)} · ${x.phase}`]) }], submit: 'Add form', onSubmit: (d) => doAdd(txOf(d.tx)) });
  },
  preview(f, t) {
    openSheet({ title: `${f.code} · ${f.name}`, subtitle: `C.A.R. form · ${f.pages} pages · revised 12/24 · ${f.cat}`, width: 560,
      body: `<div style="display:flex;gap:18px"><div style="width:170px;height:220px;flex-shrink:0;border-radius:8px;background:#fff;box-shadow:0 0 0 1px #E2E8F0,0 6px 20px -6px rgba(2,6,23,.15);padding:14px;box-sizing:border-box"><div style="font-size:8px;font-weight:700;text-align:center;margin-bottom:8px">${esc(f.name.toUpperCase())}</div>${Array.from({ length: 9 }, (_, i) => `<div style="height:4px;border-radius:2px;background:#E2E8F0;margin:7px 0;width:${60 + ((i * 17) % 40)}%"></div>`).join('')}</div><div style="font-size:14px;color:#334155;line-height:1.6">Used on ${S.docs.filter((d) => d.code === f.code).length} transaction${S.docs.filter((d) => d.code === f.code).length === 1 ? '' : 's'}.<br>Sofia can fill this form by voice and knows which fields come from the transaction, the parties and your brokerage profile.</div></div>`,
      footer: `<button class="btn" data-close>Close</button><button class="btn btn-primary" data-add>${t ? 'Add to ' + esc(txLabel(t)) : 'Add to transaction'}</button>`,
      onMount: (el) => { $('[data-add]', el).onclick = () => { closeOverlays(); this.addToTx(f, t); }; $$('[data-close]', el).forEach((b) => (b.onclick = closeOverlays)); } });
  },
  // ---------- templates ----------
  tcat: 'All templates',
  templates(app) {
    const main = $('main', app);
    const secNav = $('nav[aria-label="Forms sections"]', main);
    $$('span', secNav)[0].textContent = FORM_LIBRARY.length; $$('span', secNav)[1].textContent = S.templates.length;
    onClick(byText(main, 'New template', { sel: 'a' }), () => this.newTemplate());
    const views = $$('a', $('nav[aria-label=Views]', main));
    const onS = views[0].getAttribute('style'), offS = views[1].getAttribute('style');
    views.forEach((a) => { a.setAttribute('style', text(a) === this.tcat ? onS : offS); onClick(a, () => { this.tcat = text(a); Router.refresh(); }); });
    const build = byText(main, 'Build from a closed transaction', { sel: 'a' }); if (build) build.setAttribute('href', '#/chat/new?q=' + encodeURIComponent('Build a template from a closed transaction'));
    const grid = main.children[2].children[0];
    const cards = [...grid.children];
    const sideOf = { 'buyer-standard': 'Buyer', 'seller-listing': 'Seller', 'counter-offer': 'Situational', 'contingency-removal': 'Situational' };
    const designedIds = Object.keys(sideOf);
    cards.forEach((c, i) => { const id = designedIds[i]; c.setAttribute('href', '#/templates/' + id); c.dataset.side = sideOf[id]; if (!byId('templates', id)) c.remove(); });
    // user-created templates: clone the counter-offer card
    S.templates.filter((t) => !designedIds.includes(t.id)).forEach((t) => {
      const c = cards[2].cloneNode(true); c.setAttribute('href', '#/templates/' + t.id); c.dataset.side = t.side;
      const title = $$('span,div', c).find((x) => ownText(x) === 'Counter offer'); if (title) title.textContent = t.name;
      const sub = $$('span,div', c).find((x) => ownText(x) === 'Single-form response packet'); if (sub) sub.textContent = t.desc || 'Custom template';
      const chips = byText(c, 'Counter Offer'); if (chips) { const box = chips.parentElement; const p = chips.cloneNode(true); box.innerHTML = ''; t.forms.forEach((f) => { const x = p.cloneNode(true); x.textContent = f; box.appendChild(x); }); }
      const used = $$('span', c).find((x) => /^Used by/.test(ownText(x))); if (used) used.textContent = 'Used by 0 transactions';
      const ed = $$('span', c).find((x) => /^Edited/.test(ownText(x))); if (ed) ed.textContent = 'Edited today';
      grid.appendChild(c);
    });
    let n = 0;
    [...grid.children].forEach((c) => { const ok = this.tcat === 'All templates' || c.dataset.side === this.tcat; c.style.display = ok ? '' : 'none'; if (ok) n++; });
    const cnt = $('nav[aria-label=Views]', main).nextElementSibling; if (cnt) cnt.textContent = `${n} template${n === 1 ? '' : 's'}`;
  },
  newTemplate(base) {
    openForm({ title: base ? 'Duplicate template' : 'New template', subtitle: 'Forms + playbook Sofia sets up when you start a transaction.', fields: [
      { name: 'name', label: 'Name', required: true, value: base ? base.name + ' (copy)' : '', placeholder: 'e.g. Buyer — new construction' },
      { name: 'side', label: 'Type', type: 'chips', options: ['Buyer', 'Seller', 'Situational'], value: base ? base.side : 'Buyer' },
      { name: 'forms', label: 'Forms (codes, comma separated)', value: base ? base.forms.join(', ') : 'RPA, AD, WFA' },
      { name: 'desc', label: 'Description', value: base ? base.desc || '' : '' },
    ], submit: base ? 'Duplicate' : 'Create template', onSubmit: (d) => {
      const t = { id: uid('tpl'), name: d.name, side: d.side, desc: d.desc, forms: d.forms.split(',').map((s) => s.trim()).filter(Boolean), items: base ? JSON.parse(JSON.stringify(base.items || [])) : [] };
      commit(() => S.templates.push(t), { rerender: false }); Router.go('#/templates/' + t.id); toast('Template created');
    } });
  },
  playbook(app, id) {
    const tpl = byId('templates', id) || S.templates[0];
    const main = $('main', app);
    const hdr = main.children[0];
    $('nav[aria-label=Breadcrumb]', hdr).lastElementChild.textContent = tpl.name;
    $('h1', hdr).textContent = tpl.name;
    const txCount = S.tx.filter((t) => t.template === tpl.id).length;
    const sub = $('h1', hdr).nextElementSibling;
    const items = tpl.items || [];
    if (tpl.id !== 'buyer-standard') { sub.textContent = `${tpl.side} · ${tpl.forms.length} forms · ${items.length} custom work items · used by ${txCount} transactions`; }
    else if (items.length) sub.textContent = sub.textContent.replace(/(\d+) tasks/, (m, n) => `${+n + items.length} tasks`);
    onClick(byText(hdr, 'Duplicate', { sel: 'button' }), () => this.newTemplate(tpl));
    onClick(byText(hdr, 'Use for new transaction', { sel: 'a' }), () => Tx.openCreate({ template: tpl.id, side: tpl.side === 'Seller' ? 'Seller' : 'Buyer' }));
    const tabs = $$('a', $('nav[aria-label="Template sections"]', hdr));
    const tab = Router.current.query.tab || 'Playbook';
    const onS = tabs[1].getAttribute('style'), offS = tabs[0].getAttribute('style');
    tabs.forEach((a) => { const k = ownText(a) || text(a).replace(/\d+$/, '').trim(); a.setAttribute('href', `#/templates/${tpl.id}?tab=${k}`); a.setAttribute('style', k === tab ? onS : offS); });
    $('span', tabs[0]).textContent = tpl.forms.length;
    const body = main.children[1];
    const sec = body.children[0].children[0];
    if (tab === 'Forms') {
      sec.innerHTML = `<div style="padding:16px 20px;font-size:16px;font-weight:600">Forms in this template</div>${tpl.forms.map((code) => { const f = FORM_LIBRARY.find((x) => x.code === code) || { code, name: code, pages: 1 }; return `<div class="row" style="display:flex;align-items:center;gap:12px;padding:10px 20px;border-top:1px solid #F1F5F9"><span style="font-family:'Geist Mono',monospace;font-size:12px;color:#034F9F;width:60px">${esc(f.code)}</span><span style="flex:1;font-size:14px">${esc(f.name)}</span><span style="font-size:12.5px;color:#64748B">${f.pages} pg</span><button class="icon-btn" data-rm="${esc(code)}" aria-label="Remove">${ICON.x}</button></div>`; }).join('')}<div style="padding:12px 20px;border-top:1px solid #F1F5F9"><a href="#" data-addform style="font-size:13.5px;font-weight:500">+ Add form</a></div>`;
      $$('[data-rm]', sec).forEach((b) => onClick(b, () => commit(() => (tpl.forms = tpl.forms.filter((c) => c !== b.dataset.rm)))));
      onClick($('[data-addform]', sec), () => openForm({ title: 'Add form to template', fields: [{ name: 'code', label: 'Form', type: 'select', options: FORM_LIBRARY.filter((f) => !tpl.forms.includes(f.code)).map((f) => [f.code, `${f.code} · ${f.name}`]) }], submit: 'Add', onSubmit: (d) => commit(() => tpl.forms.push(d.code)) }));
      return;
    }
    if (tab === 'Settings') {
      sec.innerHTML = `<div style="padding:18px 20px" class="fgrid">${fieldHTML({ name: 'name', label: 'Template name', value: tpl.name })}${fieldHTML({ name: 'side', label: 'Transaction type', type: 'select', options: ['Buyer', 'Seller', 'Situational'], value: tpl.side })}${fieldHTML({ name: 'desc', label: 'Description', type: 'textarea', rows: 3, value: tpl.desc || '' })}<div style="display:flex;gap:8px;width:100%"><button class="btn btn-primary" data-save>Save</button><button class="btn" data-del style="color:#B42318;margin-left:auto">Delete template</button></div></div>`;
      onClick($('[data-save]', sec), () => { commit(() => { tpl.name = $('[name=name]', sec).value; tpl.side = $('[name=side]', sec).value; tpl.desc = $('[name=desc]', sec).value; }); toast('Template saved'); });
      onClick($('[data-del]', sec), () => confirmDlg({ title: 'Delete template?', body: `${tpl.name} will be removed. Transactions created from it are not affected.`, ok: 'Delete', danger: true, onOk: () => { commit((s) => (s.templates = s.templates.filter((x) => x.id !== tpl.id)), { rerender: false }); Router.go('#/templates'); } }));
      return;
    }
    // Playbook tab
    sec.classList.add('playbook-work-items');
    sec.parentElement.classList.add('playbook-work-items-container');
    if (tpl.id !== 'buyer-standard') {
      // non-designed template: show its custom items only
      const head = sec.children[0].cloneNode(true); const grpP = sec.children[3].cloneNode(true); const rowP = sec.children[4].cloneNode(true);
      sec.innerHTML = ''; sec.appendChild(head);
      const g = grpP.cloneNode(true); $$('span', g)[0].textContent = 'Work items'; $$('span', g)[1].textContent = `${items.length} items`; sec.appendChild(g);
      items.forEach((it) => sec.appendChild(this.pbRow(rowP, it)));
      if (!items.length) sec.appendChild(html('<div class="empty-note">No work items yet. Add the tasks Sofia should create for this template.</div>'));
    } else {
      const rowP = sec.children[4];
      const firstGroupEnd = sec.children[7];
      items.forEach((it) => sec.insertBefore(this.pbRow(rowP, it), firstGroupEnd));
    }
    if (sec.children[2] && !sec.children[2].classList.contains('row')) sec.children[2].classList.add('playbook-columns');
    $$('.row', sec).filter((row) => row.parentElement === sec).forEach((row) => row.classList.add('playbook-item'));
    $$('button[aria-label^=Collapse]', sec).forEach((button) => button.parentElement.classList.add('playbook-group'));
    const addBtn = byText(sec, 'Add work item', { sel: 'button' });
    onClick(addBtn, () => openForm({ title: 'Add work item', subtitle: tpl.name, fields: [
      { name: 'title', label: 'Work item', required: true, placeholder: 'e.g. Order natural hazard report' },
      { name: 'type', label: 'Type', type: 'select', options: [...TASK_TYPES, 'Event', 'Key date'] },
      { name: 'when', label: 'Due', placeholder: 'e.g. Acceptance + 5d', value: 'On create', half: true },
      { name: 'owner', label: 'Owner', type: 'select', options: ['You', 'Sofia', 'TC'], half: true },
    ], submit: 'Add', onSubmit: (d) => commit(() => { tpl.items = tpl.items || []; tpl.items.push(d); }) }));
    // collapse groups
    $$('button[aria-label^=Collapse]', sec).forEach((b) => onClick(b, () => {
      const open = b.getAttribute('aria-expanded') !== 'false';
      b.setAttribute('aria-expanded', !open); b.style.transform = open ? 'rotate(-90deg)' : '';
      let e = b.parentElement.nextElementSibling;
      while (e && e.classList.contains('row')) { e.style.display = open ? 'none' : ''; e = e.nextElementSibling; }
    }));
    const showAll = byText(sec, 'Show all 20', { starts: true, sel: 'a' }); if (showAll) onClick(showAll, () => toast('Showing all work items'));
    // checklist aside
    const aside = $('aside[aria-label="Checklist and notes"]', app);
    if (aside) {
      const addC = byText(aside, 'Add checklist item', { sel: 'a' });
      const clSec = aside.children[0];
      (tpl.checklist || []).forEach((c) => { const r = clSec.children[2].cloneNode(true); const sp = $$('span', r); sp[1].textContent = c.title; sp[2].innerHTML = `<span style="font-family: 'Geist Mono', monospace;">${esc(c.code || '—')}</span> · <span style="color: #8A5A00; font-weight: 600;">Required</span>`; clSec.insertBefore(r, addC.parentElement === clSec ? addC : clSec.lastElementChild); });
      onClick(addC, () => openForm({ title: 'Add checklist item', fields: [{ name: 'title', label: 'Item', required: true }, { name: 'code', label: 'Form code' }], submit: 'Add', onSubmit: (d) => commit(() => { tpl.checklist = tpl.checklist || []; tpl.checklist.push(d); }) }));
      $$('.row, div', clSec).filter((r) => $('svg rect', r) && r.children.length === 2 && r.parentElement === clSec).forEach((r) => { r.style.cursor = 'pointer'; onClick(r, () => { const on = r.dataset.on !== '1'; r.dataset.on = on ? '1' : ''; const svg = $('svg', r); svg.innerHTML = on ? '<rect x="4" y="4" width="16" height="16" rx="4" fill="#0463CA" stroke="#0463CA"></rect><path d="m8 12.5 3 3 5-6" stroke="#fff"></path>' : '<rect x="4" y="4" width="16" height="16" rx="4"></rect>'; }); });
    }
  },
  pbRow(proto, it) {
    const r = proto.cloneNode(true);
    const name = $$('span', r.children[0]).find((x) => x.children.length === 0 && /Prepare RPA/.test(ownText(x))); if (name) name.textContent = it.title;
    const tags = $$('span', r.children[0]).filter((x) => /^(To-do|Task)$/.test(ownText(x)));
    if (tags[0]) tags[0].textContent = it.type; if (tags[1]) tags[1].textContent = /Event|Key date/.test(it.type) ? it.type === 'Event' ? 'Event' : 'Key date' : 'Task';
    const due = r.children[1]; due.children[0].textContent = it.when || 'On create'; due.children[1].textContent = /Acceptance|COE|Listing/i.test(it.when) ? 'Relative' : 'When transaction starts';
    const ow = r.children[2]; setOwn(ow, it.owner || 'You'); const av = $('span', ow); if (av) av.textContent = it.owner === 'Sofia' ? 'S' : it.owner === 'TC' ? 'TC' : initials(S.user.first + ' ' + S.user.last);
    return r;
  },
};

/** Form editor */
const RPA_FIELDS = [
  { key: 'buyer', label: 'Buyer name', section: 'Parties', doc: 'BUYER' },
  { key: 'seller', label: 'Seller name', section: 'Parties', doc: 'SELLER' },
  { key: 'address', label: 'Street address', section: 'Property', doc: 'PROPERTY ADDRESS' },
  { key: 'city', label: 'City', section: 'Property', doc: 'CITY' },
  { key: 'county', label: 'County', section: 'Property', doc: 'COUNTY' },
  { key: 'price', label: 'Purchase price', section: 'Offer terms', doc: 'PURCHASE PRICE' },
  { key: 'expiration', label: 'Offer expiration', section: 'Offer terms', doc: 'OFFER EXPIRATION' },
  { key: 'down', label: 'Down payment', section: 'Financing' },
  { key: 'loan', label: 'Loan contingency', section: 'Financing' },
];
/* Sections & fields rail — what a user scans for: what's left, what's required, where am I */
const REQUIRED_FIELDS = ['city', 'county', 'expiration'];
const FX_ICON = {
  done: '<svg class="fx-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  active: '<svg class="fx-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  required: '<svg class="fx-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>',
  empty: '<svg class="fx-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 3" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/></svg>',
};
const fieldPreview = (x) => { const s = String(x || ''); if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return relWhen(s.slice(0, 10), s.slice(11, 16)); if (/^\d+(\.\d+)?$/.test(s) && +s > 999) return money(+s); return s.length > 18 ? s.slice(0, 17) + '…' : s; };

const FormEditor = {
  zoom: 100, active: 'expiration',
  values(t, doc) {
    const offer = S.tasks.find((w) => w.txId === t.id && /offer expires/i.test(w.title) && w.due);
    const c = clientOf(t);
    const party = (role) => (t.parties || []).find((p) => new RegExp(role, 'i').test(p[1]));
    return {
      buyer: t.side === 'Buyer' ? (c ? c.name : '') : (party('^buyer') || [])[0] || doc.fields?.buyer || '',
      seller: t.side === 'Seller' ? (c ? c.name : '') : t.sellerName || doc.fields?.seller || '',
      address: t.address || '', city: t.city || '', county: t.county || '',
      price: t.price ? money(t.price) : '',
      expiration: offer && (doc.fields?.expirationSet || S.ui['rpa-exp-filled:' + t.id]) ? relWhen(offer.due, offer.time) : '',
      down: doc.fields?.down || '', loan: doc.fields?.loan || '',
    };
  },
  progress(vals) { const keys = RPA_FIELDS.map((f) => f.key); const n = keys.filter((k) => vals[k]).length; return Math.round((n / keys.length) * 100); },
  save(t, doc, key, value) {
    doc.fields = doc.fields || {};
    if (key === 'address') { t.address = value; if (value) t.title = value; }
    else if (key === 'city') t.city = value;
    else if (key === 'county') t.county = value;
    else if (key === 'price') t.price = Number(String(value).replace(/[^0-9.]/g, '')) * (/m$/i.test(value) ? 1e6 : /k$/i.test(value) ? 1e3 : 1) || null;
    else if (key === 'seller') { if (t.side === 'Seller') { const c = clientOf(t); if (c) c.name = value; } else { t.sellerName = value; const p = (t.parties || []).find((x) => /^Seller/.test(x[1])); if (p) p[0] = value; else (t.parties = t.parties || []).push([value, 'Seller']); } }
    else if (key === 'buyer') { const c = clientOf(t); if (c && t.side === 'Buyer') c.name = value; }
    else if (key === 'expiration') {
      const m = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
      if (m) Sofia.apply({ kind: 'expiry', data: { txId: t.id, date: m[1], time: m[2] } }, {});
      S.ui['rpa-exp-filled:' + t.id] = true; doc.fields.expirationSet = true;
    } else doc.fields[key] = value;
    const vals = this.values(t, doc);
    doc.progress = Math.max(doc.progress || 0, this.progress(vals)); if (doc.status === 'not-started') doc.status = 'draft';
    doc.updated = D(0); doc.updatedTime = fmtTimeFull(new Date().toTimeString().slice(0, 5));
    const w = S.tasks.find((x) => x.txId === t.id && /RPA blanks/.test(x.title));
    const left = ['city', 'county', 'expiration'].filter((k) => !vals[k]).length;
    if (w) { if (!left) w.status = 'done'; else w.title = `Fill ${left} RPA blank${left > 1 ? 's' : ''}`; }
    const ny = S.tasks.find((x) => x.txId === t.id && /offer expires/i.test(x.title)); if (ny && ny.meta) ny.meta = left ? `RPA has ${left} blank${left > 1 ? 's' : ''}` : 'RPA filled';
    logActivity(t.id, `${doc.code}: ${RPA_FIELDS.find((f) => f.key === key)?.label || key} filled`, 'form');
    saveDB();
  },
  ctrl(app, t, code) {
    let doc = S.docs.find((d) => d.txId === t.id && d.code === code);
    if (!doc) { const f = FORM_LIBRARY.find((x) => x.code === code) || { code, name: code, pages: 1 }; doc = { id: uid('d'), txId: t.id, code, name: f.name, status: 'draft', progress: 0, pages: f.pages, updated: D(0), source: 'Form' }; S.docs.push(doc); saveDB(); }
    const root = app.firstElementChild;
    const hdr = root.children[0];
    const back = hdr.children[0]; back.setAttribute('href', '#/tx/' + t.id); setOwn(back, txLabel(t));
    hdr.children[2].children[0].textContent = doc.code; hdr.children[2].children[1].textContent = doc.name;
    const saved = hdr.children[3];
    const zoomLbl = $('span', hdr.children[5]);
    const [zOut, zIn] = $$('button', hdr.children[5]);
    const docEl = root.children[1].children[1].children[0];
    const applyZoom = () => { zoomLbl.textContent = this.zoom + '%'; docEl.style.transform = `scale(${this.zoom / 100})`; docEl.style.transformOrigin = 'top center'; };
    onClick(zOut, () => { this.zoom = Math.max(50, this.zoom - 10); applyZoom(); }); onClick(zIn, () => { this.zoom = Math.min(200, this.zoom + 10); applyZoom(); }); applyZoom();
    onClick(byText(hdr, 'Preview', { sel: 'a' }), () => { const w = window.open('', '_blank'); if (w) { w.document.write(`<title>${esc(doc.code)} preview</title><body style="font-family:Onest,'Avenir Next','Segoe UI',sans-serif;background:#F2F2F2;padding:40px">${docEl.outerHTML.replace(/<input[^>]*value="([^"]*)"[^>]*>/g, '<b>$1</b>')}</body>`); w.document.close(); } else toast('Allow pop-ups to preview'); });
    byText(hdr, 'Send for signature', { sel: 'a' }).setAttribute('href', `#/send/${t.id}?doc=${doc.code}`);
    const isRPA = doc.code === 'RPA';
    const docTitle = docEl.children[0].children[0];
    if (!isRPA) { docTitle.textContent = `CALIFORNIA ${doc.name.toUpperCase()}`; const sub = docEl.children[0].children[1]; if (sub) sub.textContent = `(C.A.R. Form ${doc.code}, Revised 12/24)`; }
    // document fields → real inputs
    const vals = this.values(t, doc);
    const docSpans = {};
    const findVal = (label) => { const l = $$('span', docEl).find((s) => new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$').test(ownText(s))); return l ? l.nextElementSibling : null; };
    const map = { buyer: findVal('BUYER'), seller: findVal('SELLER'), address: findVal('PROPERTY ADDRESS'), city: findVal('CITY'), county: findVal('COUNTY'), price: findVal('PURCHASE PRICE'), expiration: findVal('OFFER EXPIRATION') };
    if (!map.buyer) { const lab = $$('label', docEl)[0]; map.buyer = lab && lab.children[1]; }
    if (!map.price) { const lab = $$('label', docEl).find((l) => /\$/.test(text(l))); map.price = lab && lab.children[1]; }
    const inputs = {};
    Object.entries(map).forEach(([k, span]) => {
      if (!span) return;
      const st = (span.getAttribute('style') || '').replace(/color: #(94A3B8|B42318|8A5A00);?/g, 'color: #020617;').replace(/background: #(FEF3F2|FCE9E7|FFF7E6|FBF1DC)[^;]*;?/g, '');
      const inp = document.createElement('input');
      inp.type = k === 'expiration' ? 'datetime-local' : 'text';
      inp.value = k === 'expiration' ? (() => { const o = S.tasks.find((w) => w.txId === t.id && /offer expires/i.test(w.title) && w.due); return vals.expiration && o ? `${o.due}T${o.time || '17:00'}` : ''; })() : vals[k];
      inp.placeholder = { city: 'Required', county: 'Required', seller: 'Not yet named', expiration: 'Waiting for your answer' }[k] || '';
      inp.setAttribute('style', st + '; outline: none; font-family: inherit; width: 100%; box-sizing: border-box;');
      inp.dataset.nopersist = '1'; inp.dataset.field = k;
      const mark = () => { const empty = !inp.value; inp.style.boxShadow = empty && ['city', 'county', 'expiration'].includes(k) ? 'inset 0 0 0 1.5px #F4B4AE' : ''; inp.style.background = empty && ['city', 'county', 'expiration'].includes(k) ? '#FFFBFA' : '#FFFFFF'; };
      inp.addEventListener('focus', () => { this.active = k; Object.values(inputs).forEach((x) => x.__mark && x.__mark()); paintList(); });
      inp.addEventListener('change', () => { this.save(t, doc, k, inp.value.trim()); saved.textContent = 'Saved'; toast(`${RPA_FIELDS.find((f) => f.key === k).label} saved`); paintList(); mark(); });
      inp.__mark = mark; mark();
      span.replaceWith(inp); inputs[k] = inp; docSpans[k] = inp;
    });
    // left rail: sections & fields
    const rail = root.children[1].children[0];
    const thumbs = rail.children[0];
    $$('div', thumbs).forEach((th, i) => { th.style.cursor = 'pointer'; onClick(th, () => { rail.children[1].textContent = `Page ${i + 1} of ${doc.pages || 10}`; $$('div', thumbs).forEach((x, j) => (x.style.outline = j === i ? '2px solid #0463CA' : 'none')); }); });
    rail.children[1].textContent = `Page 1 of ${doc.pages || 10}`;
    const list = rail.children[4];
    const secP = list.children[0].cloneNode(true), okP = list.children[1].cloneNode(true), blankP = list.children[5].cloneNode(true), actP = list.children[9].cloneNode(true), emptyP = list.children[11].cloneNode(true);
    const paintList = () => {
      const v = this.values(t, doc);
      list.innerHTML = '';
      ['Parties', 'Property', 'Offer terms', 'Financing'].forEach((sec) => {
        const fs = RPA_FIELDS.filter((f) => f.section === sec);
        const done = fs.filter((f) => v[f.key]).length;
        const missingReq = fs.filter((f) => !v[f.key] && REQUIRED_FIELDS.includes(f.key)).length;
        list.appendChild(html(`<div class="fx-sec"><span>${esc(sec)}</span><span class="fx-count${missingReq ? ' warn' : done === fs.length ? ' ok' : ''}">${done}/${fs.length}</span></div>`));
        fs.forEach((f) => {
          const required = REQUIRED_FIELDS.includes(f.key);
          const state = this.active === f.key ? 'active' : v[f.key] ? 'done' : required ? 'required' : 'empty';
          const meta = state === 'active' ? 'Editing' : state === 'done' ? fieldPreview(v[f.key]) : state === 'required' ? 'Required' : 'Optional';
          const el = html(`<button type="button" class="fx-row" data-state="${state}" ${state === 'active' ? 'aria-current="true"' : ''}>${FX_ICON[state]}<span class="fx-label">${esc(f.label)}</span><span class="fx-meta">${esc(meta)}</span></button>`);
          onClick(el, () => { const i = inputs[f.key]; if (i) { i.focus(); i.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else openForm({ title: f.label, fields: [{ name: 'v', label: f.label, value: v[f.key] }], submit: 'Save', onSubmit: (d) => { this.save(t, doc, f.key, d.v); paintList(); } }); });
          list.appendChild(el);
        });
      });
    };
    paintList();
    // Sofia side panel
    const side = root.children[1].children[2];
    const thread = side.children[1];
    const first = thread.children[0].children[1];
    const missing = ['city', 'county', 'expiration'].filter((k) => !vals[k]);
    first.textContent = missing.length ? `${missing.includes('city') || missing.includes('county') ? 'City and county are still blank' : 'Almost done'}${missing.includes('expiration') ? `, and ${(clientName(t) || 'the buyer').split(' ')[0]}'s offer window needs a time. What's the offer expiration?` : '.'}` : `Every required field on the ${doc.code} is filled. Only initials and signatures are left — want me to prepare the envelope?`;
    const quick = thread.children[1];
    const [todayBtn, customBtn] = $$('button', quick);
    if (!missing.includes('expiration')) hide(quick);
    onClick(todayBtn, () => { this.save(t, doc, 'expiration', `${D(0)}T17:00`); this.sofiaSay(t, doc, `Set: offer expires today, 5:00 PM.`); });
    onClick(customBtn, () => { const i = inputs.expiration; if (i) { i.focus(); try { i.showPicker && i.showPicker(); } catch (e) { /* ignore */ } } });
    // designed follow-up turns only while city/county blank
    if (!missing.includes('city') && !missing.includes('county')) { hide(thread.children[2]); hide(thread.children[3]); }
    (doc.chat || []).forEach((m) => thread.appendChild(this.bubble(thread, m)));
    const inp = $('input', side.children[2]); inp.dataset.nopersist = '1';
    const send = () => {
      const v = inp.value.trim(); if (!v) return; inp.value = '';
      doc.chat = doc.chat || []; doc.chat.push({ role: 'user', text: v });
      const l = v.toLowerCase(); const done = [];
      const cityM = v.match(/city(?: of| is|:)?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/) || (/irvine/i.test(v) && ['', 'Irvine']);
      const countyM = v.match(/([A-Z][a-z]+) county/i) || v.match(/county(?: is|:)?\s+([A-Z][a-z]+)/i);
      const priceM = v.match(/\$?\s?([\d.,]+)\s?(m|k|million)?\b/i);
      const sellerM = v.match(/seller(?: is|:)?\s+([A-Z][\w'-]+(?:\s[A-Z][\w'-]+)?)/);
      if (cityM) { this.save(t, doc, 'city', titleCase(cityM[1])); done.push(`City: ${titleCase(cityM[1])}`); }
      if (countyM) { this.save(t, doc, 'county', titleCase(countyM[1])); done.push(`County: ${titleCase(countyM[1])}`); }
      if (sellerM) { this.save(t, doc, 'seller', sellerM[1]); done.push(`Seller: ${sellerM[1]}`); }
      if (/price|offer at|\$/.test(l) && priceM) { const n = parseFloat(priceM[1].replace(/,/g, '')) * (/m/i.test(priceM[2] || '') ? 1e6 : /k/i.test(priceM[2] || '') ? 1e3 : 1); this.save(t, doc, 'price', String(n)); done.push(`Purchase price: ${money(n)}`); }
      if (/expir|expires/.test(l)) { const d = parseDue(v) || D(0), tm = parseTime(v) || '17:00'; this.save(t, doc, 'expiration', `${d}T${tm}`); done.push(`Offer expiration: ${relWhen(d, tm)}`); }
      doc.chat.push({ role: 'sofia', text: done.length ? `Got it — ${done.join(', ')}. Filled on the form.` : 'Tell me a field and a value, for example “city Irvine, county Orange” or “offer expires Friday 5 PM”.' });
      saveDB(); Router.refresh();
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    onClick($('[aria-label="Send to Sofia"]', side), send);
    saved.textContent = doc.updatedTime ? `Saved ${doc.updatedTime}` : 'Saved';
  },
  sofiaSay(t, doc, textMsg) { doc.chat = doc.chat || []; doc.chat.push({ role: 'sofia', text: textMsg }); saveDB(); Router.refresh(); toast(textMsg); },
  bubble(thread, m) {
    const proto = (m.role === 'user' ? thread.children[2] : thread.children[3]).cloneNode(true);
    proto.style.display = '';
    const b = proto.lastElementChild; b.textContent = m.text;
    if (m.role === 'user') { const av = proto.children[0]; if (av) av.textContent = initials(S.user.first + ' ' + S.user.last); }
    return proto;
  },
};

/** Send for signature */
const SendSig = {
  ctrl(app, t, q) {
    const root = app.firstElementChild;
    const hdr = root.children[0];
    hdr.children[0].setAttribute('href', '#/tx/' + t.id);
    hdr.children[2].textContent = `Send for signature · ${txLabel(t)}`;
    const st = this.state && this.state.txId === t.id ? this.state : (this.state = this.initState(t, q.doc));
    const body = root.children[1].children[0];
    const left = body.children[0], right = body.children[1];
    // documents
    const docsBox = left.children[0].children[1];
    const chipP = docsBox.children[0].cloneNode(true);
    const edit = docsBox.lastElementChild; edit.setAttribute('href', '#');
    [...docsBox.children].slice(0, -1).forEach((x) => x.remove());
    st.docs.forEach((code) => {
      const d = S.docs.find((x) => x.txId === t.id && x.code === code); if (!d) return;
      const c = chipP.cloneNode(true); const sp = c.children;
      sp[1].textContent = d.code; sp[2].textContent = d.name; sp[3].textContent = `${d.pages} pg`;
      c.title = 'Click to remove from envelope'; onClick(c, () => { st.docs = st.docs.filter((x) => x !== code); Router.refresh(); });
      docsBox.insertBefore(c, edit);
    });
    onClick(edit, (e, a) => openMenu(a, S.docs.filter((d) => d.txId === t.id && d.code && d.status !== 'signed').map((d) => ({ label: `${d.code} · ${d.name}`, checked: st.docs.includes(d.code), onClick: () => { st.docs = st.docs.includes(d.code) ? st.docs.filter((x) => x !== d.code) : [...st.docs, d.code]; Router.refresh(); } })), { width: 320 }));
    // recipients
    const rBox = left.children[1];
    const rowNamed = rBox.children[2].cloneNode(true), rowBlank = rBox.children[3].cloneNode(true);
    const addWrap = rBox.children[6];
    [...rBox.children].slice(2, 6).forEach((x) => x.remove());
    st.recips.forEach((r, i) => {
      const el = (r.name ? rowNamed : rowBlank).cloneNode(true);
      el.children[0].textContent = r.role === 'CC' ? String(i + 1) : String(i + 1);
      el.children[1].textContent = r.role;
      if (r.name) { const nm = el.children[2]; nm.innerHTML = `<span style="width: 24px; height: 24px; border-radius: 50%; background: #F1E6FB; color: #5B2E91; font-size: 10px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">${esc(initials(r.name))}</span>${esc(r.name)}`; nm.style.display = 'flex'; nm.style.alignItems = 'center'; nm.style.gap = '8px'; }
      else onClick(el.children[2], () => this.fillParty(t, r));
      const em = el.children[3]; em.value = r.email || ''; em.dataset.nopersist = '1'; em.addEventListener('input', () => { r.email = em.value; });
      el.children[4].textContent = r.auth;
      onClick(el.children[4], () => { const opts = ['Email only', 'Email + access code', 'SMS code']; r.auth = opts[(opts.indexOf(r.auth) + 1) % opts.length]; Router.refresh(); });
      el.children[4].style.cursor = r.role === 'CC' ? '' : 'pointer';
      onClick(el.children[5], () => { st.recips.splice(i, 1); Router.refresh(); });
      rBox.insertBefore(el, addWrap);
    });
    onClick($('button', addWrap), () => openForm({ title: 'Add recipient', fields: [
      { name: 'who', label: 'From contacts & parties', type: 'select', options: [['', '— New person —'], ...[...(t.parties || []).map((p) => p[0]), ...S.contacts.map((c) => c.name)].filter((v, i, a) => a.indexOf(v) === i).map((n) => [n, n])] },
      { name: 'name', label: 'Or name', half: true }, { name: 'email', label: 'Email', type: 'email', half: true },
      { name: 'role', label: 'Role', type: 'chips', options: ['Signer', 'CC'], value: 'Signer' },
    ], submit: 'Add', onSubmit: (d) => { const n = d.who || d.name; if (!n) return false; const k = S.contacts.find((c) => c.name === n); st.recips.push({ name: n, email: d.email || (k && k.email) || '', role: d.role, auth: d.role === 'CC' ? '—' : 'Email only' }); Router.refresh(); } }));
    // routing
    const rg = $('[aria-label="Routing order"]', rBox);
    $$('button', rg).forEach((b) => { UI.press(b, text(b) === st.routing, false); onClick(b, () => { st.routing = text(b); Router.refresh(); }); });
    // warning
    const warn = left.children[2];
    const blank = st.recips.find((r) => r.role !== 'CC' && (!r.name || !r.email));
    if (!blank) hide(warn);
    else { warn.children[1].textContent = `${blank.name || 'The ' + (t.side === 'Buyer' ? 'seller' : 'buyer')} still needs ${blank.name ? 'an email' : 'a name and email'} before this envelope can go out${S.tasks.some((w) => w.txId === t.id && /offer expires/i.test(w.title) && w.due === D(0)) ? ' — the offer expires today.' : '.'}`; const a = warn.children[2]; a.setAttribute('href', '#'); onClick(a, () => this.fillParty(t, blank)); }
    // email
    const em = right.children[0];
    const subj = $('input[aria-label="Email subject"]', em); subj.dataset.nopersist = '1';
    subj.value = st.subject; subj.addEventListener('input', () => (st.subject = subj.value));
    const msgSpan = em.children[2].children[1];
    const ta = html(`<textarea data-nopersist rows="6" style="${esc((msgSpan.getAttribute('style') || '') + ';width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;outline:none;border:0')}"></textarea>`);
    ta.value = st.message; ta.addEventListener('input', () => (st.message = ta.value));
    msgSpan.replaceWith(ta);
    onClick($('a', em.children[3]), () => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
    // delivery
    const del = right.children[1];
    [['Remind every', 'remind', ['1 day', '2 days', '3 days', '1 week', 'Never']], ['Envelope expires', 'expires', ['7 days', '14 days', '30 days', '60 days']]].forEach(([label, key, opts]) => {
      const lab = byText(del, label).parentElement; const span = lab.children[1];
      const sel = html(`<select data-nopersist style="${esc(span.getAttribute('style') || '')};border:0;font-family:inherit">${opts.map((o) => `<option ${o === st[key] ? 'selected' : ''}>${o}</option>`).join('')}</select>`);
      sel.onchange = () => (st[key] = sel.value); span.replaceWith(sel);
    });
    // continue → review
    const cont = right.children[2];
    const steps = $$('li', $('ol[aria-label=Steps]', hdr));
    if (st.step === 3) {
      cont.textContent = 'Send envelope';
      right.children[3].textContent = `${st.docs.length} document${st.docs.length === 1 ? '' : 's'} · ${st.recips.filter((r) => r.role !== 'CC').length} signers · ${st.routing.toLowerCase()} · via DocuSign`;
      const s3 = steps[4]; if (s3) { css(s3.children[0], { background: '#0463CA', color: '#fff' }); s3.children[1].style.color = '#020617'; s3.children[1].style.fontWeight = '600'; }
      left.style.opacity = 0.6; left.style.pointerEvents = 'none';
      const backB = html('<a href="#" style="display:block;text-align:center;margin-top:8px;font-size:13px">← Back to recipients</a>'); right.insertBefore(backB, right.children[3]); onClick(backB, () => { st.step = 2; Router.refresh(); });
    }
    onClick(cont, () => {
      if (!st.docs.length) { toast('Add at least one document'); return; }
      const miss = st.recips.find((r) => r.role !== 'CC' && (!r.name || !/@/.test(r.email || '')));
      if (miss) { toast(`${miss.name || 'A signer'} needs a name and a valid email`); if (!miss.name) this.fillParty(t, miss); return; }
      if (st.step !== 3) { st.step = 3; Router.refresh(); return; }
      this.send(t, st);
    });
  },
  initState(t, docCode) {
    const drafts = S.docs.filter((d) => d.txId === t.id && d.code && (d.status === 'draft' || d.status === 'not-started'));
    const docs = docCode ? [docCode] : drafts.slice(0, 2).map((d) => d.code);
    const me = `${S.user.first} ${S.user.last}`;
    const c = clientOf(t);
    const other = (t.parties || []).find((p) => /listing agent|buyer's agent/i.test(p[1]) && p[0] !== me && p[0] !== 'Chinh Le');
    const counter = t.side === 'Buyer' ? 'Seller' : 'Buyer';
    const cp = t.side === 'Buyer' ? t.sellerName : null;
    const recips = [
      { name: c ? c.name : clientName(t), email: c ? c.email : '', role: 'Signer', auth: 'Email + access code' },
      { name: cp || '', email: '', role: 'Signer', auth: 'Email only', party: counter },
      { name: me, email: S.user.email, role: 'Signer', auth: 'Email only' },
    ];
    if (other) { const k = S.contacts.find((x) => x.name === other[0]); recips.push({ name: other[0], email: k ? k.email : '', role: 'CC', auth: '—' }); }
    const first = (c ? c.name : clientName(t) || 'there').replace(/^The /, '').split(' ')[0];
    const names = docs.map((cd) => (FORM_LIBRARY.find((f) => f.code === cd) || { name: cd }).name);
    const offer = S.tasks.find((w) => w.txId === t.id && /offer expires/i.test(w.title) && w.due);
    return { txId: t.id, step: 2, docs, recips, routing: 'Sequential', remind: '2 days', expires: '30 days',
      subject: `Please sign: ${names[0] || 'documents'} for ${txLabel(t)}`,
      message: `Hi ${first}, attached is the ${names.join(' and ')} for ${txLabel(t)}. Please review and sign at your earliest convenience${offer ? ` — this offer expires ${relWhen(offer.due, offer.time).toLowerCase().replace('today', 'today at')}` : ''}.` };
  },
  fillParty(t, r) {
    openForm({ title: `${r.party || 'Recipient'} details`, subtitle: 'Sofia also fills these on the forms.', fields: [{ name: 'name', label: 'Name', required: true, value: r.name }, { name: 'email', label: 'Email', type: 'email', required: true, value: r.email }], submit: 'Save', onSubmit: (d) => {
      r.name = d.name; r.email = d.email;
      if (r.party === 'Seller') { t.sellerName = d.name; t.parties = t.parties || []; if (!t.parties.some((p) => p[0] === d.name)) t.parties.push([d.name, 'Seller']); saveDB(); }
      Router.refresh();
    } });
  },
  send(t, st) {
    commit(() => {
      st.docs.forEach((code) => {
        const d = S.docs.find((x) => x.txId === t.id && x.code === code); if (d) { d.status = 'out'; d.updated = D(0); d.source = 'Envelope'; }
        const signers = st.recips.filter((r) => r.role !== 'CC');
        S.envelopes.push({ id: uid('v'), txId: t.id, code, name: d ? d.name : code, sent: D(0), by: `${S.user.first} ${S.user.last}`, status: 'out', routing: st.routing, recipients: signers.map((r, i) => ({ name: r.name, role: r.role, status: i === 0 || st.routing === 'Parallel' ? 'Delivered' : 'Waiting', note: i === 0 ? 'Sent just now' : st.routing === 'Parallel' ? 'Sent just now' : 'Receives it after the previous signer' })) });
        S.tasks.push({ id: uid('w'), txId: t.id, title: `${code} out for signature`, meta: `${signers[0].name} · sent ${shortDate(D(0))}`, type: 'Signature request', due: D(2), status: 'in-progress', needsYou: false, badge: `0 of ${signers.length} signed`, link: 'documents' });
        const k = S.checklist.find((c) => c.txId === t.id && c.code === code); if (k) k.note = `Out for signature · 0 of ${signers.length} signed`;
      });
      logActivity(t.id, `Envelope sent via DocuSign: ${st.docs.join(', ')} to ${st.recips.map((r) => r.name).join(', ')}`, 'signing');
      notify('Envelope sent', `${st.docs.join(', ')} · ${txLabel(t)}`, `#/tx/${t.id}/documents`);
    }, { rerender: false });
    this.state = null;
    Router.go(`#/tx/${t.id}/documents`);
    toast('Envelope sent via DocuSign');
  },
};
