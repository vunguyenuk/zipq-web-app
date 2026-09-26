/* Transactions — grouped list / board */
const STAR = '<svg width="13" height="13" viewBox="0 0 24 24" fill="#E0A100" stroke="#E0A100" stroke-width="1.5" stroke-linejoin="round" aria-label="Pinned"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"></path></svg>';
const LOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>';
const CHEV_DOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';
const sideBadge = (side) => `<span style="font-size:12px;color:#5D5D5D;white-space:nowrap">${esc(side)}</span>`;
const phasePill = (p) => `<span style="font-size:12px;color:#5D5D5D;white-space:nowrap">${esc(p)}</span>`;
const TX_GRID = 'display:grid;grid-template-columns:minmax(220px,1.15fr) minmax(220px,1fr) 160px 16px;column-gap:20px;align-items:center;';

function txRowHTML(t, i) {
  const c = clientName(t);
  const nu = nextUp(t);
  const kd = nextKeyDate(t);
  const overdueDate = kd && diffDays(kd.due) < 0;
  const soonDate = kd && diffDays(kd.due) <= 2;
  const overdueNu = nu && nu.due && diffDays(nu.due) < 0;
  const context = [c, t.side, t.phase].filter(Boolean).join(' · ');
  return `<a href="#/tx/${t.id}" class="row transaction-row" data-tx="${t.id}" style="${TX_GRID}background:#FFFFFF;min-height:66px;padding:10px 18px;box-sizing:border-box;border-top:1px solid #0000001A;text-decoration:none;color:inherit;">
<span style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:#0D0D0D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(txLabel(t))}${t.pinned ? STAR : ''}</span><span style="font-size:12px;color:#5D5D5D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(context)}</span></span>
<span style="display:flex;flex-direction:column;gap:3px;min-width:0"><span style="font-size:13.5px;font-weight:500;color:#0D0D0D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nu ? esc(nu.title) : 'No next step'}</span><span style="font-size:12px;color:${overdueNu ? '#E02E2A' : '#5D5D5D'}">${nu ? `${nu.suggested ? 'Suggested by Sofia · ' : ''}${esc(nu.type)}${overdueNu ? ' · overdue' : ''}` : 'Add a next step'}</span></span>
${kd ? `<span style="display:flex;flex-direction:column;gap:3px"><span style="font-size:13px;font-weight:600;color:${overdueDate ? '#E02E2A' : soonDate ? '#E25507' : '#0D0D0D'};white-space:nowrap">${esc(relWhen(kd.due, kd.time))}</span><span style="font-size:12px;color:${overdueDate ? '#E02E2A' : soonDate ? '#916F00' : '#5D5D5D'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(kd.title)}</span></span>` : '<span style="color:#8F8F8F">—</span>'}
<span style="color: #334155; display: flex; justify-content: flex-end;">${ICON.chev}</span>
</a>`;
}
function groupHeaderHTML(phase, n, collapsed) {
  return `<div data-group="${esc(phase)}" style="display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 18px 0 14px; background: #FBFCFE; border-top: 1px solid #F1F5F9;">
<button aria-label="Collapse ${esc(phase.toUpperCase())}" aria-expanded="${!collapsed}" style="width: 20px; height: 20px; border: 0; background: transparent; padding: 0; color: #64748B; display: flex; align-items: center; justify-content: center; transform: rotate(${collapsed ? -90 : 0}deg); transition: transform .15s;">${CHEV_DOWN}</button>
<span style="width: 7px; height: 7px; border-radius: 50%; background: ${PHASE_COLOR[phase]};"></span>
<span style="font-size: 11.5px; font-weight: 600; letter-spacing: 0.08em; color: #334155;">${esc(phase.toUpperCase())}</span><span style="display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; box-sizing: border-box; padding: 0 6px; border-radius: 999px; background: #F1F5F9; color: #334155; font-size: 11.5px; font-weight: 600; line-height: 1;">${n}</span></div>`;
}

const TxList = {
  state: { quick: 'All', side: null, stage: null, q: '', view: 'List', sort: 'deadline' },
  ctrl(app, params, query) {
    const st = this.state;
    const tab = query.tab || 'current';
    if (query.q != null) st.q = query.q;
    const counts = TX_COUNTS();
    const main = $('main', app);
    // header subtitle
    const h1 = byText(main, 'Transactions', { sel: 'h1' });
    const sub = h1 && h1.nextElementSibling; if (sub) sub.textContent = `${counts.current} current · ${counts.pending} pending`;
    // status tabs
    const nav = $('nav[aria-label="Transaction status"]', main);
    const tabs = $$('a', nav);
    const tabStyle = { on: tabs[0].getAttribute('style'), off: tabs[1].getAttribute('style'), onK: $$('*', tabs[0]).map((e) => e.getAttribute('style')), offK: $$('*', tabs[1]).map((e) => e.getAttribute('style')) };
    tabs.forEach((a) => {
      const k = ownText(a).toLowerCase() || text(a.firstChild).toLowerCase();
      const key = ['current', 'pending', 'closed', 'archived'].find((x) => text(a).toLowerCase().startsWith(x));
      a.setAttribute('href', '#/transactions?tab=' + key);
      const on = key === tab;
      a.setAttribute('style', on ? tabStyle.on : tabStyle.off);
      $$('*', a).forEach((e, i) => { const s = (on ? tabStyle.onK : tabStyle.offK)[i]; if (s != null) e.setAttribute('style', s); });
      const cnt = $('span', a); if (cnt) cnt.textContent = counts[key];
    });
    // search
    const search = $('input[aria-label="Search transactions"]', main);
    search.value = st.q; search.dataset.nopersist = '1';
    search.addEventListener('input', () => { st.q = search.value; this.renderRows(app, tab); });
    // sort
    const sortBtn = byText(main, 'Sort:', { sel: 'button' });
    const sortLbl = { deadline: 'Next deadline', updated: 'Recently opened', az: 'Address A–Z' };
    if (sortBtn) { $('span', sortBtn).textContent = sortLbl[st.sort]; onClick(sortBtn, () => openMenu(sortBtn, Object.entries(sortLbl).map(([k, l]) => ({ label: l, checked: st.sort === k, onClick: () => { st.sort = k; Router.refresh(); } })), { align: 'right' })); }
    const newBtn = byText(main, 'New transaction', { sel: 'a' });
    onClick(newBtn, () => Tx.openCreate());
    // quick filters
    const list = this.baseList(tab);
    const attention = list.filter((t) => needsYouCount(t.id) || t.blocked || openTasks(t.id).some((w) => w.due && diffDays(w.due) < 0));
    const awaiting = list.filter((t) => S.envelopes.some((e) => e.txId === t.id && e.status === 'out'));
    const gaps = list.filter((t) => { const c = checklistStats(t.id); return c.total && c.done < c.total; });
    const qf = $('[aria-label="Quick filters"]', main);
    qf.innerHTML = `<button type="button" class="filter-chip ${st.quick === 'All' ? 'on' : ''}" data-quick="All">All</button><button type="button" class="filter-chip ${st.quick === 'Needs attention' ? 'on' : ''}" data-quick="Needs attention">Needs attention${attention.length ? ` <span>${attention.length}</span>` : ''}</button><button type="button" class="filter-chip ${st.side ? 'on' : ''}" data-side>Side${st.side ? `: ${esc(st.side)}` : ''}${CHEV_DOWN}</button><button type="button" class="filter-chip ${st.stage ? 'on' : ''}" data-stage>Stage${st.stage ? `: ${esc(st.stage)}` : ''}${CHEV_DOWN}</button>`;
    $$('[data-quick]', qf).forEach((b) => onClick(b, () => { st.quick = b.dataset.quick; Router.refresh(); }));
    const side = $('[data-side]', qf);
    onClick(side, () => openMenu(side, [{ label: 'Any side', checked: !st.side, onClick: () => { st.side = null; Router.refresh(); } }, '-', ...['Buyer', 'Seller'].map((v) => ({ label: v, checked: st.side === v, onClick: () => { st.side = v; Router.refresh(); } }))]));
    const stage = $('[data-stage]', qf);
    onClick(stage, () => openMenu(stage, [{ label: 'Any stage', checked: !st.stage, onClick: () => { st.stage = null; Router.refresh(); } }, '-', ...PHASES.map((v) => ({ label: v, checked: st.stage === v, onClick: () => { st.stage = v; Router.refresh(); } }))]));
    // board / list
    const vg = $('[aria-label="Board or list view"]', main);
    if (vg) hide(vg);
    st.view = 'List';
    this.filters = { attention, awaiting, gaps };
    this.renderRows(app, tab);
    // pending footer
    const foot = $$('p', main).find((p) => /Pending ·/.test(text(p)));
    if (foot) {
      hide(foot);
    }
    // bottom Sofia bar
    const ask = $('input[aria-label="Ask Sofia about your pipeline"]', main);
    if (ask) {
      hide(ask.closest('div[style*="position: sticky"]') || ask.parentElement.parentElement);
      ask.dataset.nopersist = '1';
      const send = ask.parentElement.querySelector('a[aria-label=Send]');
      const go = () => { if (ask.value.trim()) Chats.startFrom(ask.value.trim()); };
      ask.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      onClick(send, go);
      onClick(ask.parentElement.querySelector('[aria-label="Talk to Sofia"]'), () => Voice.open());
    }
  },
  baseList(tab) { return S.tx.filter((t) => t.status === tab && !(t.phase === 'Prospect' && !t.address)); },
  filtered(tab) {
    const st = this.state;
    let list = this.baseList(tab);
    if (st.quick === 'Needs attention') list = list.filter((t) => this.filters.attention.includes(t));
    if (st.quick === 'Awaiting signature') list = list.filter((t) => this.filters.awaiting.includes(t));
    if (st.quick === 'Checklist gaps') list = list.filter((t) => this.filters.gaps.includes(t));
    if (st.side) list = list.filter((t) => t.side === st.side);
    if (st.stage) list = list.filter((t) => t.phase === st.stage);
    if (st.q) { const q = st.q.toLowerCase(); list = list.filter((t) => (txLabel(t) + ' ' + clientName(t) + ' ' + (t.city || '')).toLowerCase().includes(q)); }
    const key = (t) => { const k = nextKeyDate(t); return k ? k.due + (k.time || '') : '9999'; };
    if (st.sort === 'deadline') list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || key(a).localeCompare(key(b)));
    if (st.sort === 'updated') list.sort((a, b) => (b.opened || '').localeCompare(a.opened || ''));
    if (st.sort === 'az') list.sort((a, b) => txLabel(a).localeCompare(txLabel(b)));
    return list;
  },
  renderRows(app, tab) {
    const sec = $('section[aria-label="Current transactions"], section[aria-label="Transactions"]', app);
    const header = sec.children[0];
    [...sec.children].slice(1).forEach((c) => c.remove());
    sec.setAttribute('aria-label', 'Transactions');
    const list = this.filtered(tab);
    if (this.state.view === 'Board') { header.style.display = 'none'; sec.appendChild(this.board(list)); return; }
    header.style.display = 'grid';
    header.setAttribute('style', TX_GRID + 'padding:0 18px;height:42px;align-items:center;border-bottom:1px solid #0000001A;color:#5D5D5D;font-size:12px');
    header.innerHTML = '<span>Transaction</span><span>Next step</span><span>Next date</span><span></span>';
    if (!list.length) { sec.insertAdjacentHTML('beforeend', `<div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">No transactions match.<br><button class="btn btn-primary" style="margin-top:14px" data-new>New transaction</button></div>`); onClick($('[data-new]', sec), () => Tx.openCreate()); return; }
    const html = list.map(txRowHTML).join('');
    sec.insertAdjacentHTML('beforeend', html);
  },
  board(list) {
    const cols = PHASES.slice(0, 5);
    const wrap = html(`<div style="display: grid; grid-template-columns: repeat(${cols.length}, minmax(200px, 1fr)); gap: 12px; padding: 14px; overflow-x: auto;"></div>`);
    cols.forEach((ph) => {
      const items = list.filter((t) => t.phase === ph);
      const col = html(`<div data-col="${ph}" style="background: #F8FAFC; border-radius: 12px; padding: 10px; min-height: 240px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:600;letter-spacing:.08em;color:#334155;padding:2px 4px 6px"><span style="width:7px;height:7px;border-radius:50%;background:${PHASE_COLOR[ph]}"></span>${ph.toUpperCase()}<span style="margin-left:auto;color:#64748B">${items.length}</span></div></div>`);
      items.forEach((t) => {
        const nu = nextUp(t); const kd = nextKeyDate(t);
        const card = html(`<a href="#/tx/${t.id}" draggable="true" data-tx="${t.id}" class="card" style="display:block;background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;text-decoration:none;color:inherit">
          <div style="font-size:13.5px;font-weight:600;color:#020617">${esc(txLabel(t))}${t.pinned ? ' ' + STAR : ''}</div>
          <div style="font-size:12px;color:#64748B;margin-top:3px;display:flex;gap:6px;align-items:center">${sideBadge(t.side)} ${esc(t.city || '')}</div>
          ${nu ? `<div style="font-size:12.5px;color:#334155;margin-top:8px">${esc(nu.title)}</div>` : ''}
          ${kd ? `<div style="font-size:11.5px;color:${kd.contract && diffDays(kd.due) <= 0 ? '#B42318' : '#64748B'};margin-top:4px">${esc(kd.title)} · ${esc(relWhen(kd.due, kd.time))}</div>` : ''}</a>`);
        card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', t.id));
        col.appendChild(card);
      });
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.style.background = '#EEF4FB'; });
      col.addEventListener('dragleave', () => (col.style.background = '#F8FAFC'));
      col.addEventListener('drop', (e) => { e.preventDefault(); const t = txOf(e.dataTransfer.getData('text/plain')); if (t && t.phase !== ph) commit(() => { Tx.setPhase(t, ph); toast(`${txLabel(t)} moved to ${ph}`); }); });
      wrap.appendChild(col);
    });
    wrap.appendChild(html('<div style="grid-column:1/-1;font-size:12px;color:#94A3B8;padding:4px">Drag a card to another column to change its phase.</div>'));
    return wrap;
  },
};
