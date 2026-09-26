/* Clients — split + table, follow-ups, contacts */
const PRIO_STYLE = { Hot: ['#FCE9E7', '#B42318'], Warm: ['#FBF1DC', '#8A5A00'], Cold: ['#F0F0F0', '#5D5D5D'] };
const AV_STYLE = [['#F0F0F0', '#424242'], ['#EDEDED', '#0D0D0D'], ['#FCE9E7', '#8F2F25'], ['#E5F3E8', '#1F7A3A'], ['#FBF1DC', '#8A5A00'], ['#F2F2F2', '#5D5D5D']];
const avStyle = (name) => AV_STYLE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_STYLE.length];
const prioPill = (p, bg) => { const [b, c] = PRIO_STYLE[p] || PRIO_STYLE.Warm; return `<span style="display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px; border-radius: 999px; background: ${bg || b}; color: ${c}; font-size: 12px; font-weight: 500; white-space: nowrap; flex-shrink: 0;"><span style="width: 6px; height: 6px; border-radius: 50%; background: ${c};"></span>${esc(p)}</span>`; };
const clientTx = (c) => S.tx.filter((t) => t.clientId === c.id);
const clientSub = (c) => { const t = clientTx(c).find((x) => x.status !== 'closed' && x.status !== 'archived'); return `${c.type}${c.stage === 'Prospect' ? ' prospect' : ''} · ${t && t.address ? t.address : c.area || '—'}`; };
function clientNext(c) {
  const f = S.followUps.filter((x) => x.clientId === c.id && !x.done).sort((a, b) => a.due.localeCompare(b.due))[0];
  const w = S.tasks.filter((x) => x.status !== 'done' && (x.clientId === c.id || (x.txId && clientTx(c).some((t) => t.id === x.txId)))).sort(sortByDue)[0];
  const cand = [f && { title: f.title, type: f.type, due: f.due, time: f.time }, w && { title: w.title, type: w.type, due: w.due, time: w.time }].filter((x) => x && x.due).sort((a, b) => a.due.localeCompare(b.due));
  return cand[0] || null;
}

const Clients = {
  filters: { q: '', type: null, stage: null, priority: null, source: null },
  filtered() {
    const f = this.filters;
    return S.clients.filter((c) => (!f.q || (c.name + ' ' + c.area + ' ' + c.email).toLowerCase().includes(f.q.toLowerCase())) && (!f.type || c.type === f.type) && (!f.stage || c.stage === f.stage) && (!f.priority || c.priority === f.priority) && (!f.source || c.source === f.source));
  },
  header(main, view) {
    const h1 = $('h1', main); const sub = h1.nextElementSibling;
    const quiet = S.clients.filter((c) => diffDays(c.lastTouch) <= -5).length;
    sub.textContent = quiet ? `${quiet} ${quiet === 1 ? 'client needs' : 'clients need'} a check-in` : 'No follow-ups need attention';
    onClick(byText(main, 'Add client', { sel: 'button' }), () => this.openCreate());
    const ask = byText(main, 'Ask Sofia', { sel: 'a' }); if (ask) ask.remove();
    const search = $('input[aria-label="Search clients"]', main); search.value = this.filters.q; search.dataset.nopersist = '1';
    search.addEventListener('input', () => { this.filters.q = search.value; this.renderList(); });
    const bar = search.closest('label').parentElement;
    const opts = { Type: ['Buyer', 'Seller'], Stage: PHASES.slice(0, 5), Priority: ['Hot', 'Warm', 'Cold'], Source: [...new Set(S.clients.map((c) => c.source))] };
    $$('button', bar).forEach((b) => {
      const k = ownText(b) || text(b);
      if (/Priority|Source|More filters/.test(k)) { hide(b); return; }
      if (opts[k]) {
        if (k === 'Type' || k === 'Stage') b.classList.add('client-filter-control');
        const key = k.toLowerCase(); const cur = this.filters[key];
        if (cur) { setOwn(b, `${k}: ${cur}`); css(b, { background: '#E3F0FC', color: '#034F9F' }); }
        onClick(b, () => openMenu(b, [{ label: `Any ${key}`, checked: !cur, onClick: () => { this.filters[key] = null; Router.refresh(); } }, '-', ...opts[k].map((o) => ({ label: o, checked: cur === o, onClick: () => { this.filters[key] = o; Router.refresh(); } }))]));
      }
      if (/More filters/.test(text(b))) onClick(b, () => openMenu(b, [{ label: 'Needs a check-in (5+ days)', onClick: () => { this.filters.q = ''; this.quietOnly = !this.quietOnly; Router.refresh(); }, checked: this.quietOnly }, { label: 'Clear all filters', onClick: () => { this.filters = { q: '', type: null, stage: null, priority: null, source: null }; this.quietOnly = false; Router.refresh(); } }]));
    });
    const vg = $('[aria-label=View]', main);
    if (vg) vg.style.setProperty('display', 'none', 'important');
  },
  split(app, cid) {
    const main = $('main', app);
    this.header(main, 'split');
    this.sel = cid || this.sel || (S.clients[0] && S.clients[0].id);
    if (!byId('clients', this.sel)) this.sel = S.clients[0] && S.clients[0].id;
    this.app = app;
    const list = $('[aria-label="Client list"]', main);
    this.protos = { on: list.children[0].cloneNode(true), off: list.children[1].cloneNode(true), cold: list.children[6].cloneNode(true) };
    this.renderList();
    const panel = list.nextElementSibling;
    const c = byId('clients', this.sel);
    if (c) this.detail(panel, c); else panel.innerHTML = '<div class="empty-note" style="padding:60px">Add your first client to see details here.</div>';
  },
  renderList() {
    const list = $('[aria-label="Client list"]', this.app);
    if (!list) return;
    list.innerHTML = ''; list.dataset.dyn = '1';
    let items = this.filtered(); if (this.quietOnly) items = items.filter((c) => diffDays(c.lastTouch) <= -5);
    items.forEach((c, i) => {
      const quiet = diffDays(c.lastTouch) <= -9;
      const el = (c.id === this.sel ? this.protos.on : quiet ? this.protos.cold : this.protos.off).cloneNode(true);
      el.setAttribute('href', '#/clients/' + c.id);
      if (i === items.length - 1) el.style.borderBottom = '0';
      const [bg, fg] = avStyle(c.name);
      const av = el.children[0]; av.textContent = initials(c.name); if (!quiet) css(av, { background: bg, color: fg });
      const mid = el.children[1];
      mid.children[0].innerHTML = `<span style="font-size: 14px; font-weight: 500;">${esc(c.name)}</span>${c.priority === 'Hot' ? prioPill('Hot', c.id === this.sel ? '#FFFFFF' : '#FCE9E7') : ''}`;
      mid.children[1].textContent = clientSub(c);
      const right = el.children[2];
      const tag = right.children[0];
      tag.textContent = c.flag && c.stage === 'Prospect' ? (quiet ? `No contact ${-diffDays(c.lastTouch)}d` : c.flag) : c.stage;
      if (c.flag && !quiet && c.stage === 'Prospect') css(tag, { background: '#FBF1DC', color: '#8A5A00', borderRadius: '999px', padding: '1px 7px' });
      right.children[1].textContent = ago(c.lastTouch);
      list.appendChild(el);
    });
    if (!items.length) list.innerHTML = '<div class="empty-note" style="padding:40px">No clients match.</div>';
  },
  /** fill a client detail container (split panel or table overlay body) */
  detail(panel, c) {
    panel.setAttribute('aria-label', c.name);
    const head = panel.children[0];
    const av = head.children[0].children[0]; av.textContent = initials(c.name); const [bg, fg] = avStyle(c.name); css(av, { background: bg, color: fg });
    const nm = head.children[0].children[1];
    nm.children[0].innerHTML = `<span style="font-size: 20px; font-weight: 600; letter-spacing: -0.015em;">${esc(c.name)}</span>${prioPill(c.priority)}`;
    nm.children[1].textContent = `${c.type} · ${c.stage} · ${c.source}`;
    onClick(nm, () => this.openEdit(c)); nm.title = 'Edit client';
    const ask = head.children[0].children[2];
    if (ask) {
      ask.classList.add('client-detail-ai-link');
      ask.setAttribute('href', '#/chat/new?q=' + encodeURIComponent(`Tell me about ${c.name}`));
    }
    const acts = head.children[1];
    acts.classList.add('client-detail-actions');
    const [call, email, msg] = $$('button', acts);
    [call, email, msg].forEach((button) => button.classList.add('client-detail-action'));
    onClick(call, () => this.logTouch(c, 'Call'));
    onClick(email, () => this.compose(c, 'Email'));
    onClick(msg, () => this.compose(c, 'SMS'));
    const start = $('a', acts);
    start.classList.add('client-detail-start-transaction');
    const openTx = clientTx(c).find((t) => t.status === 'current' || t.status === 'pending');
    if (openTx) {
      setOwn(start, 'View transaction');
      $('svg', start)?.remove(); // A plus denotes creation, not opening an existing record.
      start.classList.add('client-detail-view-transaction');
      start.setAttribute('href', '#/tx/' + openTx.id);
    }
    else { setOwn(start, 'Start transaction'); onClick(start, () => Tx.openCreate({ clientId: c.id, side: c.type, phase: c.stage === 'Prospect' ? 'Prospect' : 'Offer Prep' })); }
    // next action
    const na = head.children[2];
    const nx = clientNext(c);
    if (nx) {
      na.setAttribute('href', '#/agenda/people');
      const t = na.children[1]; t.children[0] ? (t.children[0].textContent = `Next action · ${nx.type}`) : null;
      if (t.children[1]) { t.children[1].textContent = nx.title; t.children[1].classList.add('client-detail-next-title'); }
      na.children[2].textContent = relWhen(nx.due, nx.time);
      na.children[2].style.color = diffDays(nx.due) < 0 ? '#B42318' : '';
    } else { na.removeAttribute('href'); na.children[1].innerHTML = '<span style="font-size:13px;color:#64748B">No next action</span><span class="client-detail-next-title" style="font-size:14px;font-weight:500">Add a follow-up</span>'; na.children[2].textContent = ''; onClick(na, () => FollowUps.openCreate({ clientId: c.id })); }
    // tabs
    const tabs = $$('[role=tab]', panel.children[1]);
    const tab = this.tab || 'Overview';
    const tasks = S.tasks.filter((w) => w.status !== 'done' && (w.clientId === c.id || clientTx(c).some((t) => t.id === w.txId)));
    const docs = S.docs.filter((d) => clientTx(c).some((t) => t.id === d.txId));
    // Keep the tab counts aligned with the records each tab actually renders.
    // Include completed/closed records too, matching the established client view.
    const counts = { Transactions: clientTx(c).length, Tasks: tasks.length, Documents: docs.length };
    const onS = tabs[0].getAttribute('style'), offS = tabs[1].getAttribute('style');
    tabs.forEach((a) => { const k = ownText(a) || text(a).replace(/\d+$/, '').trim(); a.setAttribute('style', k === tab ? onS : offS); a.setAttribute('aria-selected', k === tab); const sp = $('span', a); if (sp && counts[k] != null) sp.textContent = counts[k]; onClick(a, () => { this.tab = k; Router.refresh(); }); });
    const details = panel.children[2];
    const tlBox = byText(panel, 'Follow-up timeline').parentElement;
    tlBox.classList.add('client-followup-timeline');
    const notesBox = $$('span', panel).find((x) => ownText(x) === 'Notes' && !x.closest('[role=tablist]')).parentElement;
    const cols = tlBox.parentElement === panel ? null : tlBox.parentElement;
    const sofia = [...panel.children].find((x) => $('img', x) && /Draft a check-in/.test(text(x)));
    if (tab === 'Overview') {
      const cells = details.children[1].children;
      const vals = [['Email', c.email || '—'], ['Phone', c.phone || '—'], ['Type', c.type], ['Stage', c.stage], ['Source', c.source], ['Area', c.area || '—']];
      vals.forEach(([k, v], i) => { if (!cells[i]) return; cells[i].children[0].textContent = k; cells[i].children[1].textContent = v; });
      onClick(details, () => this.openEdit(c)); details.title = 'Edit details';
      const tl = tlBox; const rowP = tl.children[1].cloneNode(true);
      [...tl.children].slice(1).forEach((x) => x.remove());
      (c.timeline || []).slice(0, 5).forEach(([d, s]) => { const r = rowP.cloneNode(true); r.children[0].textContent = shortDate(d); r.children[1].textContent = s; tl.appendChild(r); });
      const nt = notesBox.children[1];
      const ta = html(`<textarea data-nopersist style="border:0;outline:none;resize:vertical;min-height:84px;font:inherit;font-size:13.5px;line-height:1.5;color:#334155;background:transparent;padding:0" placeholder="Add a note…">${esc(c.notes || '')}</textarea>`);
      nt.replaceWith(ta);
      ta.addEventListener('change', () => { c.notes = ta.value; saveDB(); toast('Note saved'); });
    } else {
      hide(cols || tlBox); if (!cols) hide(notesBox);
      const body = details.children[1];
      details.children[0].textContent = tab;
      body.style.display = 'block';
      if (tab === 'Transactions') body.innerHTML = clientTx(c).map((t) => `<a href="#/tx/${t.id}" class="row" style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;text-decoration:none;color:#020617"><span style="min-width:0;text-align:left"><b style="font-weight:500">${esc(txLabel(t))}</b><br><small style="color:#64748B">${esc(t.side)} · ${esc(t.city || '')}</small></span>${phasePill(t.phase)}</a>`).join('') || `<div class="empty-note">No transactions yet.</div>`;
      if (tab === 'Tasks') { body.innerHTML = `<div data-dyn="1" class="client-detail-tasks">${tasks.map((w) => taskLineHTML(w, { showTx: true })).join('') || '<div class="empty-note">No open tasks.</div>'}</div>`; bindTaskLines(body); }
      if (tab === 'Documents') body.innerHTML = docs.map((d) => `<a href="#/tx/${d.txId}/documents" class="row" style="display:flex;gap:10px;align-items:center;padding:9px 8px;border-radius:10px;text-decoration:none;color:#020617">${ICON.doc}<span style="flex:1">${esc(d.code ? d.code + ' · ' : '')}${esc(d.name)}</span><small style="color:#64748B">${esc(d.status)}</small></a>`).join('') || '<div class="empty-note">No documents.</div>';
      if (tab === 'Notes') { body.innerHTML = `<textarea class="input" data-nopersist rows="8" placeholder="Notes about ${esc(c.name)}">${esc(c.notes || '')}</textarea><div style="margin-top:8px;text-align:right"><button class="btn btn-primary btn-sm" data-save>Save notes</button></div>`; onClick($('[data-save]', body), () => { c.notes = $('textarea', body).value; saveDB(); toast('Notes saved'); }); }
    }
    // Sofia nudge (quietest other client)
    if (sofia) {
      const quiet = S.clients.filter((x) => diffDays(x.lastTouch) <= -7).sort((a, b) => a.lastTouch.localeCompare(b.lastTouch))[0];
      if (!quiet) hide(sofia);
      else {
        sofia.children[1].innerHTML = `Draft a check-in text to <strong>${esc(quiet.name)}</strong> — no contact in ${-diffDays(quiet.lastTouch)} days.`;
        const a = sofia.children[2] || $('a,button', sofia);
        if (a) onClick(a, () => this.compose(quiet, 'SMS', `Hi ${quiet.name.split(' ')[0]}, checking in — anything I can help with this week? Happy to share a quick market update for your area.`));
      }
    }
  },
  table(app) {
    const main = $('main', app);
    this.header(main, 'table');
    const tbl = $('[aria-label=Clients][role=table]', main);
    const tableHead = tbl.children[0];
    tableHead.classList.add('clients-six-columns');
    ['Client', 'Type', 'Stage', 'Temp', 'Last touch', 'Next step'].forEach((label, i) => { if (tableHead.children[i]) tableHead.children[i].textContent = label; });
    [...tableHead.children].slice(6).forEach((cell) => hide(cell));
    const protoOn = tbl.children[1].cloneNode(true), protoOff = tbl.children[2].cloneNode(true);
    [...tbl.children].slice(1).forEach((x) => x.remove());
    let items = this.filtered(); if (this.quietOnly) items = items.filter((c) => diffDays(c.lastTouch) <= -5);
    const overlayOpen = Router.current.query.c;
    items.forEach((c) => {
      const el = (overlayOpen === c.id ? protoOn : protoOff).cloneNode(true);
      el.classList.add('clients-six-columns');
      el.setAttribute('href', `#/clients/table?c=${c.id}`);
      const [bg, fg] = avStyle(c.name);
      const n = el.children[0]; n.children[0].textContent = initials(c.name); css(n.children[0], { background: bg, color: fg }); n.children[1].textContent = c.name;
      el.children[1].textContent = c.type;
      el.children[2].textContent = c.stage;
      el.children[3].textContent = c.priority;
      el.children[4].textContent = diffDays(c.lastTouch) <= -9 ? `No contact ${-diffDays(c.lastTouch)}d` : ago(c.lastTouch);
      el.children[4].style.color = diffDays(c.lastTouch) <= -9 ? '#E02E2A' : '';
      const nx = clientNext(c);
      el.children[5].textContent = nx ? `${nx.title} · ${relWhen(nx.due, nx.time)}` : '—';
      [...el.children].slice(6).forEach((cell) => hide(cell));
      tbl.appendChild(el);
    });
    // overlay detail
    const root = app.firstElementChild;
    const scrim = $(':scope > div[aria-hidden="true"]', root);
    const dlg = $(':scope > [role="dialog"]', root);
    const c = overlayOpen && byId('clients', overlayOpen);
    if (!c) { root.classList.remove('client-detail-open'); hide(scrim); hide(dlg); return; }
    root.classList.add('client-detail-open');
    // This is a side panel, not a full-page modal: keep the client list visible
    // and remove the overlay that obscured the left navigation and table.
    hide(scrim);
    scrim.classList.add('client-detail-scrim');
    dlg.classList.add('client-detail-modal');
    dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'false'); dlg.setAttribute('aria-label', `Client details: ${c.name}`);
    onClick(scrim, () => Router.go('#/clients/table'));
    const idx = items.indexOf(c);
    dlg.children[0].children[0].textContent = `${idx + 1} of ${items.length}`;
    const [open, close] = $$('a', dlg.children[0]);
    const prev = items[(idx - 1 + items.length) % items.length]; const nextClient = items[(idx + 1) % items.length];
    open.setAttribute('href', '#/clients/table?c=' + prev.id); open.setAttribute('aria-label', 'Previous client'); open.innerHTML = '←';
    const next = open.cloneNode(true); next.setAttribute('href', '#/clients/table?c=' + nextClient.id); next.setAttribute('aria-label', 'Next client'); next.innerHTML = '→'; open.insertAdjacentElement('afterend', next);
    close.setAttribute('href', '#/clients/table');
    this.detail(dlg.children[1], c);
  },
  openCreate(prefill = {}) {
    openForm({ title: 'Add client', subtitle: 'Clients are buyers and sellers you represent.', fields: [
      { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Jordan Lee or the Kim family', value: prefill.name || '' },
      { name: 'type', label: 'Type', type: 'chips', options: ['Buyer', 'Seller'], value: 'Buyer' },
      { name: 'email', label: 'Email', type: 'email', half: true }, { name: 'phone', label: 'Phone', type: 'tel', half: true },
      { name: 'stage', label: 'Stage', type: 'select', options: PHASES.slice(0, 5), value: 'Prospect', half: true },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Hot', 'Warm', 'Cold'], value: 'Warm', half: true },
      { name: 'source', label: 'Source', type: 'select', options: ['Referral', 'Website', 'Open house', 'Sign call', 'Past client', 'Social', 'Other'], half: true },
      { name: 'area', label: 'Area / property', placeholder: 'e.g. Irvine', half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ], submit: 'Add client', onSubmit: (d) => {
      const c = { id: uid('c'), name: d.name, type: d.type, stage: d.stage, priority: d.priority, source: d.source, email: d.email, phone: d.phone, area: d.area, notes: d.notes, lastTouch: D(0), timeline: [[D(0), 'Client added']] };
      commit(() => S.clients.unshift(c), { rerender: false });
      Router.go('#/clients/' + c.id); toast(`${c.name} added`);
    } });
  },
  openEdit(c) {
    openForm({ title: 'Edit client', subtitle: c.name, fields: [
      { name: 'name', label: 'Name', value: c.name, required: true },
      { name: 'type', label: 'Type', type: 'chips', options: ['Buyer', 'Seller'], value: c.type },
      { name: 'email', label: 'Email', value: c.email, half: true }, { name: 'phone', label: 'Phone', value: c.phone, half: true },
      { name: 'stage', label: 'Stage', type: 'select', options: PHASES, value: c.stage, half: true },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Hot', 'Warm', 'Cold'], value: c.priority, half: true },
      { name: 'source', label: 'Source', value: c.source, half: true }, { name: 'area', label: 'Area', value: c.area, half: true },
    ], submit: 'Save', extra: '<div style="margin-top:14px"><a href="#" data-del style="color:#B42318;font-size:13px">Delete client</a></div>', onSubmit: (d) => commit(() => Object.assign(c, d)) });
    const del = $('#overlay-root [data-del]');
    if (del) del.onclick = (e) => { e.preventDefault(); closeOverlays(); confirmDlg({ title: `Delete ${c.name}?`, body: 'Their follow-ups are removed. Transactions stay, without a linked client.', ok: 'Delete', danger: true, onOk: () => { commit((s) => { s.clients = s.clients.filter((x) => x.id !== c.id); s.followUps = s.followUps.filter((f) => f.clientId !== c.id); s.tx.forEach((t) => { if (t.clientId === c.id) { t.clientName = c.name; t.clientId = null; } }); }, { rerender: false }); this.sel = null; Router.go('#/clients'); } }); };
  },
  logTouch(c, kind) {
    openForm({ title: `Log ${kind.toLowerCase()} with ${c.name}`, subtitle: c.phone ? `${c.phone}` : '', fields: [{ name: 'summary', label: 'Summary', type: 'textarea', rows: 3, placeholder: 'What did you talk about?' }, { name: 'next', label: 'Next follow-up', type: 'date', value: D(7) }], submit: 'Save', onSubmit: (d) => commit(() => {
      c.lastTouch = D(0); c.timeline.unshift([D(0), `${kind}${d.summary ? ': ' + d.summary : ''}`]);
      if (d.next) S.followUps.push({ id: uid('f'), clientId: c.id, name: c.name, title: 'Check in', type: 'Follow-up', due: d.next });
      const t = clientTx(c).find((x) => x.status === 'current'); if (t) S.messages.push({ id: uid('m'), txId: t.id, day: D(0), time: fmtTimeFull(new Date().toTimeString().slice(0, 5)), from: `${S.user.first} ${S.user.last}`, role: 'You', channel: 'Call', body: `Call with ${c.name}${d.summary ? ' — ' + d.summary : ''}`, added: true });
      toast('Call logged');
    }) });
    if (c.phone) { try { const a = document.createElement('a'); a.href = 'tel:' + c.phone.replace(/[^0-9+]/g, ''); void a; } catch (e) { /* ignore */ } }
  },
  compose(c, channel, body = '') {
    openForm({ title: `${channel === 'SMS' ? 'Text' : 'Email'} ${c.name}`, subtitle: channel === 'SMS' ? c.phone : c.email, fields: [
      ...(channel === 'Email' ? [{ name: 'subject', label: 'Subject', value: '' }] : []),
      { name: 'body', label: 'Message', type: 'textarea', rows: 5, value: body, placeholder: 'Write a message… or ask Sofia to draft one' },
    ], extra: '<button type="button" class="btn btn-sm" data-draft style="margin-top:10px">✨ Draft with Sofia</button>', submit: 'Send', onSubmit: (d) => {
      if (!d.body) return false;
      commit(() => {
        c.lastTouch = D(0); c.timeline.unshift([D(0), `${channel} sent: ${d.body.slice(0, 50)}${d.body.length > 50 ? '…' : ''}`]);
        const t = clientTx(c).find((x) => x.status === 'current' || x.status === 'pending');
        if (t) S.messages.push({ id: uid('m'), txId: t.id, day: D(0), time: fmtTimeFull(new Date().toTimeString().slice(0, 5)), from: `${S.user.first} ${S.user.last}`, role: 'You', channel, subject: d.subject, body: d.body, added: true });
        S.followUps.filter((f) => f.clientId === c.id && !f.done && diffDays(f.due) <= 0).forEach((f) => { f.done = true; f.doneAt = D(0); });
      });
      toast(`${channel === 'SMS' ? 'Text' : 'Email'} sent to ${c.name}`);
    } });
    const b = $('#overlay-root [data-draft]');
    if (b) b.onclick = () => { const ta = $('#overlay-root textarea[name=body]'); const t = clientTx(c).find((x) => x.status === 'current'); ta.value = `Hi ${c.name.replace(/^The /, '').split(' ')[0]}, ${t ? `quick update on ${txLabel(t)} — ${nextUp(t) ? nextUp(t).title.toLowerCase() + ' is next on our list' : 'everything is on track'}.` : 'just checking in — anything I can help with this week?'} Let me know a good time to connect.`; };
  },
};

const FollowUps = {
  tab: 'Due',
  ctrl(app, q) {
    const main = $('main', app);
    if (q.tab) this.tab = q.tab;
    const due = S.followUps.filter((f) => !f.done && diffDays(f.due) <= 7);
    const upcoming = S.followUps.filter((f) => !f.done && diffDays(f.due) > 7);
    const done = S.followUps.filter((f) => f.done);
    const drafts = S.followUps.filter((f) => !f.done && f.draft);
    const h1 = $('h1', main); h1.nextElementSibling.textContent = `${due.length} due · ${due.filter((f) => diffDays(f.due) < 0).length} overdue · ${drafts.length} draft${drafts.length === 1 ? '' : 's'} from Sofia`;
    onClick(byText(main, 'New follow-up', { sel: 'button' }), () => this.openCreate());
    // Sofia remains available in the navigation. Keep this page header focused
    // on its single creation action.
    const ask = byText(main, 'Ask Sofia', { sel: 'a' }); if (ask) ask.remove();
    const nav = $('nav[aria-label="Follow-up status"]', main);
    const tabs = $$('a', nav); const onS = tabs[0].getAttribute('style'), offS = tabs[1].getAttribute('style');
    const counts = { Due: due.length, Upcoming: upcoming.length, Done: done.length };
    tabs.forEach((a) => { const k = ownText(a) || text(a).replace(/\d+$/, '').trim(); a.setAttribute('href', '#/follow-ups?tab=' + k); a.setAttribute('style', k === this.tab ? onS : offS); if (k === this.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); const sp = $('span', a); if (sp) sp.textContent = counts[k]; });
    const list = $('[aria-label="Follow-up list"]', main);
    const secP = list.children[0].cloneNode(true); const rowP = list.children[1].children[1].children[0].cloneNode(true); const rowDraftP = list.children[0].children[1].children[0].cloneNode(true);
    list.innerHTML = ''; list.dataset.dyn = '1';
    const src = this.tab === 'Due' ? due : this.tab === 'Upcoming' ? upcoming : done;
    // The status tabs already name the buckets; one continuous list avoids
    // repeating uppercase section labels and keeps every row on one rail.
    if (src.length) {
      const sec = secP.cloneNode(true);
      sec.classList.add('follow-up-results');
      sec.children[0].remove();
      const box = sec.children[0]; box.innerHTML = '';
      const ordered = [...src].sort((a, b) => this.tab === 'Done'
        ? b.due.localeCompare(a.due)
        : (a.due + (a.time || '')).localeCompare(b.due + (b.time || '')));
      ordered.forEach((f, i) => box.appendChild(this.row(f, f.draft ? rowDraftP : rowP, i)));
      list.appendChild(sec);
    }
    if (!src.length) list.innerHTML = `<div class="empty-note" style="background:#fff;border-radius:16px;padding:40px">${this.tab === 'Done' ? 'Nothing completed yet.' : 'You are all caught up.'}</div>`;
    // The list already exposes Review draft beside the relevant follow-up.
    // Do not repeat the same drafts with competing Send/Edit actions in the rail.
    const rail = $('[aria-label="Sofia rail"]', main);
    const radar = rail.children[0];
    radar.children[1].classList.add('follow-up-radar-description');
    const runBtn = html('<button class="btn btn-sm" style="margin-top:6px;align-self:flex-start">Run now</button>');
    radar.appendChild(runBtn);
    onClick(runBtn, () => this.runRadar());
    rail.children[1].remove();
  },
  row(f, proto, i) {
    const r = proto.cloneNode(true); r.dataset.fu = f.id;
    if (i > 0) r.style.borderTop = '1px solid #F1F5F9';
    const btn = r.children[0];
    if (f.done) css(btn, { background: '#1F7A3A', borderColor: '#1F7A3A' });
    btn.innerHTML = f.done ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12.5 4 4 8-9"/></svg>' : '';
    css(btn, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
    onClick(btn, () => this.toggle(f));
    const [bg, fg] = diffDays(f.due) < 0 && !f.done ? ['#FCE9E7', '#B42318'] : avStyle(f.name);
    css(r.children[1], { background: bg, color: fg }); r.children[1].textContent = initials(f.name);
    const mid = r.children[2];
    mid.children[0].classList.add('follow-up-title');
    mid.children[0].innerHTML = `<strong style="font-weight: 600;">${esc(f.name)}</strong><span style="color: #64748B;"> — </span>${esc(f.title)}`;
    if (f.done) mid.children[0].style.textDecoration = 'line-through';
    const meta = mid.children[1];
    const whenTxt = diffDays(f.due) === 0 && f.time ? fmtTime(f.time) : diffDays(f.due) < 0 || diffDays(f.due) > 6 ? shortDate(f.due) : relDay(f.due);
    const t = f.txId && txOf(f.txId);
    meta.innerHTML = `<span style="color: ${diffDays(f.due) < 0 && !f.done ? '#B42318' : '#334155'}; font-weight: 500;">${esc(whenTxt)}</span><span>·</span><span style="display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 6px; background: #F1F5F9; color: #334155; font-size: 12px; font-weight: 500;">${esc(f.type)}</span>${t ? `<span>·</span><a href="#/tx/${t.id}">${esc(txLabel(t))}</a>` : ''}${f.tag ? `<span>·</span><span>${esc(f.tag)}</span>` : ''}${f.repeats ? `<span>·</span><span>↻ repeats ${esc(f.repeats)}</span>` : ''}`;
    const draftLine = mid.children[2];
    if (draftLine) { if (f.draft) setOwn(draftLine, `Sofia drafted ${f.draft.channel === 'Email' ? 'an email' : 'a text'}`); else draftLine.remove(); }
    const act = r.children[3];
    if (act && act.tagName === 'A') { if (f.draft && !f.done) { onClick(act, () => this.review(f)); } else act.remove(); }
    onClick(mid, () => this.open(f));
    return r;
  },
  toggle(f) {
    commit(() => { f.done = !f.done; f.doneAt = f.done ? D(0) : null; const c = f.clientId && byId('clients', f.clientId); if (f.done && c) { c.lastTouch = D(0); c.timeline.unshift([D(0), `Follow-up done: ${f.title}`]); } if (f.done && f.repeats === 'yearly') { const d = pd(f.due); d.setFullYear(d.getFullYear() + 1); S.followUps.push({ ...f, id: uid('f'), due: iso(d), done: false, doneAt: null }); } });
    toast(f.done ? `Done: ${f.name} — ${f.title}` : 'Reopened', f.done ? { action: 'Undo', onAction: () => this.toggle(f) } : {});
  },
  review(f) {
    openForm({ title: `Review ${f.draft.channel.toLowerCase()} to ${f.name}`, subtitle: 'Written by Sofia — edit anything before sending.', fields: [{ name: 'text', label: 'Message', type: 'textarea', rows: 5, value: f.draft.text }], submit: `Send ${f.draft.channel.toLowerCase()}`, onSubmit: (d) => { f.draft.text = d.text; this.send(f); } });
  },
  send(f) {
    commit(() => { f.done = true; f.doneAt = D(0); const c = f.clientId && byId('clients', f.clientId); if (c) { c.lastTouch = D(0); c.flag = null; c.timeline.unshift([D(0), `${f.draft.channel} sent: ${f.draft.text.slice(0, 50)}…`]); } });
    toast(`${f.draft.channel} sent to ${f.name}`);
  },
  open(f) {
    openForm({ title: 'Follow-up', subtitle: f.name, fields: [
      { name: 'title', label: 'What', value: f.title, required: true },
      { name: 'type', label: 'Type', type: 'chips', options: ['Follow-up', 'Call', 'Meeting', 'To-do'], value: f.type },
      { name: 'due', label: 'Due', type: 'date', value: f.due, half: true }, { name: 'time', label: 'Time', type: 'time', value: f.time || '', half: true },
      { name: 'repeats', label: 'Repeats', type: 'select', options: [['', 'Never'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']], value: f.repeats || '' },
    ], submit: 'Save', extra: `<div style="display:flex;gap:10px;margin-top:14px"><button type="button" class="btn btn-sm" data-done>${f.done ? 'Reopen' : 'Mark done'}</button><button type="button" class="btn btn-sm" data-del style="color:#B42318">Delete</button></div>`, onSubmit: (d) => commit(() => Object.assign(f, d)) });
    $('#overlay-root [data-done]').onclick = () => { closeOverlays(); this.toggle(f); };
    $('#overlay-root [data-del]').onclick = () => { closeOverlays(); commit((s) => (s.followUps = s.followUps.filter((x) => x.id !== f.id))); toast('Follow-up deleted'); };
  },
  openCreate(prefill = {}) {
    openForm({ title: 'New follow-up', fields: [
      { name: 'client', label: 'Client', type: 'select', options: [['', '— Choose —'], ...S.clients.map((c) => [c.id, c.name]), ...S.contacts.map((c) => ['k:' + c.name, c.name + ' (contact)'])], value: prefill.clientId || '' },
      { name: 'title', label: 'What', required: true, placeholder: 'e.g. Send 3 new listings' },
      { name: 'type', label: 'Type', type: 'chips', options: ['Follow-up', 'Call', 'Meeting', 'To-do'], value: 'Follow-up' },
      { name: 'due', label: 'Due', type: 'date', value: D(1), half: true }, { name: 'time', label: 'Time', type: 'time', half: true },
      { name: 'draft', label: 'Ask Sofia to draft a message', type: 'checkbox', text: 'Draft a text I can review', value: false },
    ], submit: 'Add follow-up', onSubmit: (d) => {
      const c = d.client && !d.client.startsWith('k:') && byId('clients', d.client);
      const name = c ? c.name : d.client.startsWith('k:') ? d.client.slice(2) : 'Someone';
      const f = { id: uid('f'), clientId: c ? c.id : null, name, title: d.title, type: d.type, due: d.due || D(0), time: d.time || null };
      if (d.draft) f.draft = { channel: 'Text', text: `Hi ${name.replace(/^The /, '').split(' ')[0]}, ${d.title.charAt(0).toLowerCase() + d.title.slice(1)} — do you have a few minutes this week?` };
      commit(() => S.followUps.push(f));
      toast('Follow-up added');
    } });
  },
  runRadar() {
    const quiet = S.clients.filter((c) => diffDays(c.lastTouch) <= -5 && !S.followUps.some((f) => f.clientId === c.id && !f.done));
    commit(() => quiet.forEach((c) => S.followUps.push({ id: uid('f'), clientId: c.id, name: c.name, title: 'Check in', type: 'Follow-up', due: D(0), draft: { channel: 'Text', text: `Hi ${c.name.replace(/^The /, '').split(' ')[0]}, just checking in — anything I can help with this week?` } })));
    toast(quiet.length ? `Follow-up radar drafted ${quiet.length} check-in${quiet.length > 1 ? 's' : ''}` : 'Follow-up radar ran — everyone is up to date');
  },
};

const CONTACT_TYPES = ['Broker / Brokerage', 'Transaction coordinator', 'Escrow', 'Lender', 'Inspector', 'Appraiser', 'Other'];
const Contacts = {
  filter: 'All', q: '',
  ctrl(app, q) {
    const main = $('main', app);
    if (q.q != null) this.q = q.q;
    const search = $('input[aria-label="Search contacts"]', main); search.value = this.q; search.dataset.nopersist = '1';
    search.addEventListener('input', () => { this.q = search.value; this.rows(main); });
    const chipsRow = main.children[1];
    const chips = $$('button.chip', chipsRow);
    const on = chips[0].getAttribute('style'), off = chips[1].getAttribute('style');
    chips.forEach((b) => { b.setAttribute('style', text(b) === this.filter ? on : off); onClick(b, () => { this.filter = text(b); Router.refresh(); }); });
    const fb = byText(main, 'Filter by type', { sel: 'button' });
    onClick(fb, () => openMenu(fb, ['All', ...CONTACT_TYPES].map((t) => ({ label: t, checked: this.filter === t, onClick: () => { this.filter = t; Router.refresh(); } }))));
    onClick(byText(main, 'Add contact', { sel: 'a' }), () => this.openEdit());
    const tbl = main.children[3];
    this.proto = tbl.children[3].cloneNode(true); // row with sub-line
    this.protoPlain = tbl.children[1].cloneNode(true);
    this.rows(main);
  },
  rows(main) {
    const tbl = main.children[3];
    [...tbl.children].slice(1).forEach((x) => x.remove());
    const q = this.q.toLowerCase();
    const list = S.contacts.filter((c) => (this.filter === 'All' || c.type === this.filter) && (!q || (c.name + ' ' + c.company + ' ' + c.email).toLowerCase().includes(q)));
    list.forEach((c) => {
      const el = (c.sub ? this.proto : this.protoPlain).cloneNode(true);
      el.children[0].textContent = c.name; el.children[1].textContent = c.company;
      const tp = el.children[2];
      if (tp.children[0]) { tp.children[0].textContent = c.type; if (tp.children[1]) tp.children[1].textContent = c.sub; }
      el.children[3].textContent = c.license; el.children[4].textContent = c.phone;
      el.children[5].textContent = c.email; el.children[5].title = c.email;
      el.children[6].textContent = S.tx.filter((t) => (t.parties || []).some((p) => p[0] === c.name)).length || c.txCount;
      onClick(el, () => this.openEdit(c));
      tbl.appendChild(el);
    });
    if (!list.length) tbl.appendChild(html('<div class="empty-note" style="padding:30px">No contacts match.</div>'));
  },
  openEdit(c) {
    const isNew = !c;
    openForm({ title: isNew ? 'Add contact' : c.name, subtitle: isNew ? 'Professionals who help close the transaction.' : `${c.type} · ${c.company}`, fields: [
      { name: 'name', label: 'Name', value: c ? c.name : '', required: true, half: true }, { name: 'company', label: 'Company', value: c ? c.company : '', half: true },
      { name: 'type', label: 'Type', type: 'select', options: CONTACT_TYPES, value: c ? c.type : 'Lender', half: true }, { name: 'sub', label: 'Role', value: c ? c.sub : '', placeholder: 'e.g. Title officer', half: true },
      { name: 'license', label: 'License / DRE', value: c ? c.license : '', half: true }, { name: 'phone', label: 'Phone', value: c ? c.phone : '', half: true },
      { name: 'email', label: 'Email', type: 'email', value: c ? c.email : '' },
      ...(isNew ? [] : [{ name: 'addTo', label: 'Add to transaction', type: 'select', options: [['', '—'], ...S.tx.filter((t) => t.status === 'current' || t.status === 'pending').map((t) => [t.id, txLabel(t)])] }]),
    ], submit: isNew ? 'Add contact' : 'Save', extra: isNew ? '' : '<div style="margin-top:14px;display:flex;gap:14px"><a href="#" data-mail style="font-size:13px">Email</a><a href="#" data-del style="font-size:13px;color:#B42318">Delete contact</a></div>', onSubmit: (d) => {
      commit(() => {
        if (isNew) S.contacts.unshift({ id: uid('k'), txCount: 0, ...d });
        else { const addTo = d.addTo; delete d.addTo; Object.assign(c, d); if (addTo) { const t = txOf(addTo); t.parties = t.parties || []; if (!t.parties.some((p) => p[0] === c.name)) t.parties.push([c.name, `${c.type} · ${c.company}`]); logActivity(t.id, `${c.name} added as participant`); } }
      });
      toast(isNew ? 'Contact added' : 'Saved');
    } });
    if (!isNew) {
      $('#overlay-root [data-del]').onclick = (e) => { e.preventDefault(); closeOverlays(); commit((s) => (s.contacts = s.contacts.filter((x) => x.id !== c.id))); toast('Contact deleted', { action: 'Undo', onAction: () => commit((s) => s.contacts.push(c)) }); };
      $('#overlay-root [data-mail]').onclick = (e) => { e.preventDefault(); location.href = 'mailto:' + c.email; };
    }
  },
  openImport(done) {
    openSheet({ title: 'Import contacts', subtitle: 'Bring clients and professionals in from a CSV or your CRM.', width: 520,
      body: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${['Upload CSV', 'Google Contacts', 'Follow Up Boss', 'kvCORE', 'Lofty', 'BoldTrail'].map((s, i) => `<button class="btn" data-src="${s}" style="height:52px;justify-content:flex-start" ${i > 1 ? 'disabled title="Coming soon"' : ''}>${s}${i > 1 ? ' <small style="color:#94A3B8;margin-left:auto">Soon</small>' : ''}</button>`).join('')}</div><p class="fhint" style="margin-top:12px">CSV columns: name, email, phone, type (buyer/seller/lender/escrow…), company.</p>`,
      onMount: (el) => {
        $('[data-src="Upload CSV"]', el).onclick = () => {
          const i = document.createElement('input'); i.type = 'file'; i.accept = '.csv,text/csv';
          i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const n = Contacts.importCSV(String(r.result)); closeOverlays(); toast(`Imported ${n} contact${n === 1 ? '' : 's'}`); done && done(); Router.refresh(); }; r.readAsText(f); };
          i.click();
        };
        $('[data-src="Google Contacts"]', el).onclick = () => { closeOverlays(); commit(() => { S.contacts.push({ id: uid('k'), name: 'Hannah Cole', company: 'Evergreen Escrow', type: 'Escrow', sub: '', license: 'CEO-66120', phone: '(949) 555-0170', email: 'hannah@evergreenescrow.com', txCount: 0 }); }); toast('Imported 1 new contact from Google'); done && done(); };
      } });
  },
  importCSV(textIn) {
    const lines = textIn.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return 0;
    const head = lines[0].toLowerCase().split(',').map((s) => s.trim());
    const idx = (k) => head.findIndex((h) => h.includes(k));
    let n = 0;
    lines.slice(1).forEach((l) => {
      const c = l.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
      const name = c[idx('name')] || c[0]; if (!name) return;
      const type = (c[idx('type')] || '').toLowerCase();
      if (/buyer|seller|client/.test(type)) S.clients.push({ id: uid('c'), name, type: /seller/.test(type) ? 'Seller' : 'Buyer', stage: 'Prospect', priority: 'Warm', source: 'Import', email: c[idx('email')] || '', phone: c[idx('phone')] || '', area: '', lastTouch: D(0), notes: '', timeline: [[D(0), 'Imported from CSV']] });
      else S.contacts.push({ id: uid('k'), name, company: c[idx('company')] || '', type: CONTACT_TYPES.find((t) => t.toLowerCase().includes(type)) || 'Other', sub: '', license: '', phone: c[idx('phone')] || '', email: c[idx('email')] || '', txCount: 0 });
      n++;
    });
    saveDB();
    return n;
  },
};
