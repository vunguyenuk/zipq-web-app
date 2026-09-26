/* Agenda — list by transaction, people (CRM), calendar (week / month), task + event drawers */
function toInput(div, { type = 'text', value = '', placeholder = '', name, options } = {}) {
  if (!div) return null;
  const st = (div.getAttribute('style') || '').replace(/color: #94A3B8;?/, 'color: #020617;');
  let el;
  if (type === 'select') {
    el = document.createElement('select');
    (options || []).forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; if (String(v) === String(value)) o.selected = true; el.appendChild(o); });
  } else { el = document.createElement('input'); el.type = (type === 'date' || type === 'time') ? 'text' : type; el.value = type === 'date' ? usDateValue(value) : type === 'time' ? fmtTimeFull(value) : value || ''; el.placeholder = type === 'date' ? 'MM/DD/YYYY' : type === 'time' ? 'h:mm AM' : placeholder; if (type === 'date') { el.inputMode = 'numeric'; el.dataset.dateInput = '1'; } if (type === 'time') { el.inputMode = 'numeric'; el.dataset.timeInput = '1'; } }
  el.setAttribute('style', st + '; border: 0; outline: none; font-family: inherit;' + (/(^|;)\s*width:/.test(st) ? '' : ' width: 100%;'));
  if (name) el.name = name;
  el.dataset.nopersist = '1';
  div.replaceWith(el);
  return el;
}
const pressedIn = (grp) => $$('[aria-pressed="true"]', grp).map((b) => ownText(b) || text(b).replace(/^\+ /, ''));

const Agenda = {
  highOnly: false,
  ctrl(app, view, q = {}) {
    const main = $('main', app);
    this.header(main);
    const hi = byText(main, 'High priority only', { sel: 'button' });
    if (hi) { if (this.highOnly) css(hi, { background: '#E3F0FC', color: '#034F9F' }); onClick(hi, () => { this.highOnly = !this.highOnly; Router.refresh(); }); }
    const list = $('[aria-label="Agenda list"]', main);
    this.byTx(main, list, q);
    const side = $('aside[aria-label="Today and suggestions"]', main);
    if (side) { renderToday(side.children[0]); if (side.children[1]) hide(side.children[1]); }
  },
  header(main) {
    const head = main.children[0];
    const overdue = S.tasks.filter((w) => w.status !== 'done' && w.due && diffDays(w.due) < 0).length;
    const mirroredByEvent = (w) => w.contract && S.events.some((e) => e.date === w.due && e.title === w.title && e.txId === w.txId);
    const dueToday = S.tasks.filter((w) => w.status !== 'done' && w.due === D(0) && !mirroredByEvent(w)).length
      + S.events.filter((e) => e.date === D(0)).length;
    head.classList.add('agenda-top');
    head.style.setProperty('display', 'flex', 'important');
    head.style.setProperty('flex-direction', window.innerWidth < 760 ? 'column' : 'row', 'important');
    head.style.setProperty('align-items', window.innerWidth < 760 ? 'flex-start' : 'center', 'important');
    head.style.setProperty('justify-content', 'space-between', 'important');
    head.innerHTML = `<div class="agenda-heading-group"><div><h1>Agenda</h1><p><strong>${overdue}</strong> overdue <span>·</span> <strong>${dueToday}</strong> today</p></div><nav class="agenda-view-tabs" aria-label="Agenda views"><a href="#/agenda" aria-current="page"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>List</a><a href="#/agenda/calendar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>Calendar</a></nav></div><div class="agenda-actions"><button type="button" class="btn" data-agenda-view>View: <span>List</span>${CHEV_DOWN}</button><button type="button" class="btn" data-agenda-filter>Filter${this.highOnly ? ': High priority' : ''}</button><button type="button" class="btn btn-primary" data-agenda-new>+ New${CHEV_DOWN}</button></div>`;
    const view = $('[data-agenda-view]', head);
    onClick(view, () => openMenu(view, [
      { label: 'List', checked: /^#\/agenda(?:\?|$)/.test(location.hash), onClick: () => Router.go('#/agenda') },
      { label: 'Week', checked: /view=week/.test(location.hash), onClick: () => Router.go('#/agenda/calendar?view=week') },
      { label: 'Month', checked: /view=month/.test(location.hash), onClick: () => Router.go('#/agenda/calendar?view=month') },
    ]));
    const filter = $('[data-agenda-filter]', head);
    onClick(filter, () => { this.highOnly = !this.highOnly; Router.refresh(); });
    const add = $('[data-agenda-new]', head);
    onClick(add, () => openMenu(add, [{ label: 'Task', onClick: () => Router.go('#/agenda/new-task') }, { label: 'Event', onClick: () => Router.go('#/agenda/event') }], { align: 'right' }));
  },
  byTx(main, list, q) {
    list.innerHTML = '';
    list.classList.add('agenda-time-list');
    const mirroredByEvent = (w) => w.contract && S.events.some((e) => e.date === w.due && e.title === w.title && e.txId === w.txId);
    const tasks = S.tasks.filter((w) => w.status !== 'done' && !mirroredByEvent(w) && (!this.highOnly || w.priority === 'High')).map((w) => ({ kind: w.keyDate || w.contract ? 'Key date' : 'Task', date: w.due, time: w.time, item: w }));
    const events = S.events.filter((e) => diffDays(e.date) >= 0 && (!this.highOnly || e.priority === 'High')).map((e) => ({ kind: e.contract ? 'Key date' : 'Event', date: e.date, time: e.start, item: e }));
    const items = [...tasks, ...events].sort((a, b) => ((a.date || '9999') + (a.time || '')).localeCompare((b.date || '9999') + (b.time || '')));
    const groups = [
      ['Overdue', (x) => x.date && diffDays(x.date) < 0],
      ['Today', (x) => x.date === D(0)],
      ['This week', (x) => x.date && diffDays(x.date) > 0 && diffDays(x.date) <= 7],
      ['Later', (x) => !x.date || diffDays(x.date) > 7],
    ];
    groups.forEach(([label, test]) => {
      const group = items.filter(test);
      if (!group.length) return;
      const section = html(`<section class="agenda-time-group"><header><h2>${label}</h2><span>${group.length}</span></header></section>`);
      group.forEach((x) => {
        const w = x.item; const t = w.txId && txOf(w.txId); const c = !t && w.clientId && byId('clients', w.clientId);
        const blocked = w.status === 'blocked' || /blocked/i.test(w.type || '');
        const urgent = blocked || (x.date && diffDays(x.date) < 0);
        const row = html(`<div class="agenda-flat-row" data-kind="${x.kind}" data-id="${w.id}"><button type="button" class="agenda-check" role="checkbox" aria-checked="false" aria-label="Mark ${esc(w.title)} complete">${x.kind === 'Event' ? svgI('clock', 14) : ''}</button><button type="button" class="agenda-row-main"><span class="agenda-row-title${blocked ? ' is-blocked' : ''}">${esc(w.title)}</span><span class="agenda-row-context">${esc(t ? txLabel(t) : c ? c.name : x.kind)}</span></button><span class="agenda-row-type">${x.kind}</span><time class="${urgent ? 'is-overdue' : ''}">${esc(x.date ? relWhen(x.date, x.time) : 'No date')}</time></div>`);
        const check = $('.agenda-check', row);
        if (x.kind === 'Event') { check.disabled = true; check.setAttribute('aria-label', 'Event'); }
        else onClick(check, () => { commit(() => { w.status = 'done'; w.doneAt = D(0); }); toast('Marked complete'); });
        onClick($('.agenda-row-main', row), () => x.kind === 'Event' ? this.openEvent({ id: w.id }) : WorkItem.open(w.id));
        section.appendChild(row);
      });
      list.appendChild(section);
    });
    const suggestion = S.suggestions.items[0];
    if (suggestion) {
      const inline = html(`<button type="button" class="sofia-inline-suggestion agenda-suggestion"><span aria-hidden="true">✦</span><span><strong>Suggested by Sofia</strong> · ${esc(suggestion.title)}</span><span aria-hidden="true">→</span></button>`);
      onClick(inline, () => Chats.startFrom(`Help me with ${suggestion.title}`)); list.appendChild(inline);
    }
    if (!items.length) list.appendChild(html('<div class="empty-note">Your Agenda is clear. Add a task or event to get started.</div>'));
  },
  txCard(proto, t, expandDefault) {
    const art = proto.cloneNode(true);
    art.dataset.txcard = t.id; art.setAttribute('aria-label', txLabel(t));
    const [head, nyBox, tasksRow, tasksList, clRow, kdRow, evRow] = [...art.children];
    // header
    const title = head.children[1].children[0]; title.textContent = txLabel(t); title.setAttribute('href', '#/tx/' + t.id);
    head.children[1].children[1].innerHTML = `${esc(t.city || '—')}<span>·</span>${esc(t.side)}<span>·</span><span style="display: inline-flex; align-items: center; gap: 6px; color: #334155;"><span style="width: 7px; height: 7px; border-radius: 50%; background: ${PHASE_COLOR[t.phase]};"></span>${esc(t.phase === 'Under Contract' ? 'Under contract' : t.phase)}</span>`;
    const kb = head.children[2]; const kd = nextKeyDate(t);
    if (kd) {
      // one readable line: [icon] what · when — no all-caps label, no progress bar
      const n = diffDays(kd.due); const hot = kd.contract && n <= 1; const soon = n <= 2;
      const when = n <= 1 && n >= 0 ? `${relDay(kd.due)}${kd.time ? ' · ' + fmtTime(kd.time) : ''}` : n < 0 ? `${-n}d overdue` : `${shortDate(kd.due)} · in ${n}d`;
      const ico = kd.contract ? LOCK : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
      kb.className = 'kd-chip' + (hot || n < 0 ? ' hot' : soon ? ' soon' : '');
      kb.setAttribute('style', '');
      kb.title = `${kd.title || 'Key date'} — ${when}${kd.contract ? ' (contract deadline)' : ''}`;
      kb.innerHTML = `<span class="kd-ico">${ico}</span><span class="kd-label">${esc(kd.title || 'Key date')}</span><span class="kd-when">${esc(when)}</span>`;
    } else hide(kb);
    const collapsed = !!S.collapsed['ag:' + t.id];
    const [colBtn, hideBtn] = $$('button', head.children[3]);
    onClick(colBtn, () => { S.collapsed['ag:' + t.id] = !collapsed; saveDB(); Router.refresh(); });
    const expKey = 'agt:' + t.id;
    const expanded = S.collapsed[expKey] == null ? expandDefault : S.collapsed[expKey];
    hideBtn.style.transform = expanded ? '' : 'rotate(-90deg)';
    onClick(hideBtn, () => { S.collapsed[expKey] = !expanded; saveDB(); Router.refresh(); });
    if (collapsed) { [nyBox, tasksRow, tasksList, clRow, kdRow, evRow].forEach((x) => x && x.remove()); colBtn.style.transform = 'rotate(180deg)'; return art; }
    // needs you (tasks + today's events for the tx)
    const ny = openTasks(t.id).filter((w) => w.needsYou && (!this.highOnly || w.priority === 'High')).sort(sortByDue);
    const evToday = S.events.filter((e) => e.txId === t.id && e.date === D(0) && !e.contract);
    [...nyBox.children].slice(1).forEach((x) => x.remove());
    nyBox.dataset.dyn = '1';
    if (!ny.length && !evToday.length) hide(nyBox);
    nyBox.insertAdjacentHTML('beforeend', ny.map(workRowHTML).join('') + evToday.map((e) => `<a href="#/agenda/event/${e.id}" class="row" style="display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 10px 0 8px; border-radius: 8px; text-decoration: none; color: inherit;">${svgI('clock')}<span class="wi-main" style="display: flex; align-items: center; gap: 8px; flex: 0 1 auto; min-width: 0; white-space: nowrap; overflow: hidden;"><span style="font-size: 14px; font-weight: 500; color: #020617; flex-shrink: 0;">${esc(e.title)}</span><span class="wi-status" style="display: inline-flex; flex-shrink: 0;">${badge(`${fmtTime(e.start)}–${fmtTime(e.end)}`, 'grey')}</span><span style="font-size: 13px; color: #64748B; overflow: hidden; text-overflow: ellipsis;">${esc(e.type)} · ${esc(txLabel(t))}</span></span></a>`).join(''));
    bindWorkRows(nyBox);
    // tasks
    const open = openTasks(t.id).filter((w) => !w.keyDate && !w.needsYou && (!this.highOnly || w.priority === 'High')).sort(sortByDue);
    const nx = open[0];
    const ovd = open.filter((w) => w.due && diffDays(w.due) < 0).length, blk = open.filter((w) => w.status === 'blocked').length;
    tasksRow.children[2].innerHTML = nx ? `Next: <span style="color: #020617; font-weight: 500;">${esc(nx.title)}</span> · ${esc(nx.time ? relWhen(nx.due, nx.time) : nx.due ? (Math.abs(diffDays(nx.due)) > 1 ? shortDate(nx.due) : relDay(nx.due)) : 'no date')}` : 'No open tasks';
    tasksRow.children[3].innerHTML = `${ovd ? badge(`${ovd} overdue`, 'red') : ''}${blk ? badge(`${blk} blocked`, 'purple') : ''}<span>${open.length} open</span>`;
    const tBtn = tasksRow.children[4]; if (tBtn) tBtn.style.transform = expanded ? '' : 'rotate(-90deg)';
    onClick(tasksRow, () => { S.collapsed[expKey] = !expanded; saveDB(); Router.refresh(); });
    tasksList.dataset.dyn = '1';
    if (!expanded) hide(tasksList);
    else {
      tasksList.innerHTML = open.slice(0, 6).map((w) => taskLineHTML(w)).join('') + `<div style="display:flex;gap:16px;padding:4px 18px 10px 48px">${open.length > 6 ? `<a href="#/tx/${t.id}" style="font-size:13.5px;font-weight:500">See all ${open.length} tasks →</a>` : ''}<a href="#" data-add style="font-size:13.5px;font-weight:500">+ Add task</a></div>`;
      onClick($('[data-add]', tasksList), () => this.openTask({ txId: t.id }));
    }
    // checklist
    const cl = checklistStats(t.id); const fo = cl.items.find((c) => !c.done);
    clRow.children[2].innerHTML = fo ? `Next: <span style="color: #020617; font-weight: 500;">${esc(fo.title)}${fo.code ? ` (${esc(fo.code)})` : ''}</span> · ${esc(relDay(fo.due))}` : cl.total ? '<span style="color:#1F7A3A">Complete</span>' : 'No checklist';
    clRow.children[3].innerHTML = `<span>${cl.total - cl.done} open</span>`;
    onClick(clRow, () => Router.go(`#/tx/${t.id}/checklist`));
    // key dates
    const kds = openTasks(t.id).filter((w) => (w.keyDate || w.contract) && w.due).sort(sortByDue);
    kdRow.children[2].innerHTML = kds[0] ? `Next: <span style="color: #020617; font-weight: 500;">${esc(kds[0].title)}</span> · ${esc(relWhen(kds[0].due, kds[0].time))}` : 'No key dates';
    kdRow.children[3].innerHTML = `<span>${kds.length} open</span>`;
    onClick(kdRow, () => Router.go(`#/tx/${t.id}/timeline`));
    // next upcoming event
    const ev = S.events.filter((e) => e.txId === t.id && (diffDays(e.date) > 0 || (e.date === D(0) && e.contract))).sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')))[0];
    if (evRow) {
      if (!ev) evRow.remove();
      else {
        evRow.children[1].textContent = ev.type; evRow.children[2].innerHTML = `<span style="color: #020617;">${esc(ev.title)}</span>`;
        evRow.children[3].innerHTML = `<span>${esc(relDay(ev.date))}${ev.start && !ev.allDay ? ' · ' + esc(fmtTime(ev.start)) : ''}</span>`;
        onClick(evRow, () => Router.go('#/agenda/event/' + ev.id));
      }
    }
    return art;
  },
  people(list) {
    const art = list.children[0];
    const hdrP = art.children[2].cloneNode(true); // TODAY header style
    const hdrOver = art.children[0].cloneNode(true);
    const rowCb = art.children[1].cloneNode(true);
    const rowMeet = art.children[3].cloneNode(true);
    art.innerHTML = ''; art.dataset.dyn = '1';
    const items = S.followUps.filter((f) => !f.done && (!this.highOnly || diffDays(f.due) <= 0));
    const groups = [['OVERDUE', (f) => diffDays(f.due) < 0, hdrOver], ['TODAY', (f) => diffDays(f.due) === 0, hdrP], ['THIS WEEK', (f) => diffDays(f.due) > 0 && diffDays(f.due) <= 7, hdrP], ['LATER', (f) => diffDays(f.due) > 7, hdrP]];
    let first = true;
    groups.forEach(([label, pred, hp]) => {
      const g = items.filter(pred).sort((a, b) => (a.due + (a.time || '')).localeCompare(b.due + (b.time || '')));
      if (!g.length) return;
      const h = hp.cloneNode(true); h.children[0].textContent = label; h.children[1].textContent = `· ${g.length}`; h.style.display = 'flex'; h.style.alignItems = 'center'; h.style.gap = '6px'; h.style.whiteSpace = 'nowrap'; h.style.flexDirection = 'row'; h.style.gridColumn = '1 / -1';
      if (label === 'THIS WEEK' || label === 'LATER') { h.children[0].style.color = '#64748B'; h.children[1].style.color = '#64748B'; }
      if (first) h.style.borderTop = '0'; first = false;
      art.appendChild(h);
      g.forEach((f) => art.appendChild(followRow(f, f.type === 'Meeting' ? rowMeet : rowCb)));
    });
    if (!items.length) art.appendChild(html('<div class="empty-note" style="padding:40px">No follow-ups due. Sofia\'s Follow-up radar will add them as clients go quiet.</div>'));
  },

  // ---------------- calendar ----------------
  calendar(app, q) {
    const main = $('main', app);
    this.header(main);
    const anchor = q.d || D(0);
    const mode = q.view || 'week';
    // Controllers run before design-system classes are assigned.
    const modeTabs = $('[role="tablist"]', main);
    const modeToolbar = modeTabs.parentElement;
    const tabs = $$('a', modeTabs);
    if (modeTabs) {
      modeTabs.classList.add('agenda-calendar-mode-tabs');
      modeTabs.setAttribute('aria-label', 'Calendar view mode');
    }
    tabs.forEach((a) => { const m = text(a).toLowerCase(); a.setAttribute('href', `#/agenda/calendar?view=${m}&d=${anchor}`); UI.swapActive && null; });
    if (mode === 'month') { const [w, m] = tabs; const s = w.getAttribute('style'); w.setAttribute('style', m.getAttribute('style')); m.setAttribute('style', s); w.setAttribute('aria-selected', 'false'); m.setAttribute('aria-selected', 'true'); }
    const sec = $('section', main);
    sec.classList.add('agenda-calendar-grid');
    const bar = sec.children[0];
    bar.classList.add('agenda-calendar-controlbar');
    const [prev, next] = $$('button[aria-label]', bar);
    const todayB = byText(bar, 'Today', { sel: 'button' });
    todayB.classList.add('agenda-calendar-today');
    if (modeTabs) todayB.insertAdjacentElement('afterend', modeTabs);
    // Keep the header navigation; remove the duplicate row from the template.
    $(':scope > nav[aria-label="Agenda views"]', main)?.remove();
    modeToolbar.remove();
    $$('.agenda-view-tabs a', main).forEach((link) => {
      if (link.getAttribute('href') === '#/agenda/calendar') link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    prev.setAttribute('aria-label', `Previous ${mode}`);
    next.setAttribute('aria-label', `Next ${mode}`);
    const a = pd(anchor);
    const monday = new Date(a); monday.setDate(a.getDate() - ((a.getDay() + 6) % 7));
    const step = mode === 'month' ? 30 : 7;
    const shift = (n) => { const d = new Date(a); if (mode === 'month') d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + n * 7); Router.go(`#/agenda/calendar?view=${mode}&d=${iso(d)}`); };
    onClick(prev, () => shift(-1)); onClick(next, () => shift(1)); onClick(todayB, () => Router.go(`#/agenda/calendar?view=${mode}`));
    void step;
    const h2 = $('h2', bar);
    const syncBadge = bar.lastElementChild;
    syncBadge.classList.add('agenda-calendar-sync');
    onClick(syncBadge, () => toast('Google Calendar synced just now'));
    if (mode === 'month') { this.month(sec, a, h2); return; }
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return iso(d); });
    const sun = pd(days[6]);
    h2.textContent = monday.getMonth() === sun.getMonth() ? `${MONTHS_L[monday.getMonth()]} ${monday.getDate()} – ${sun.getDate()}` : `${MONTHS[monday.getMonth()]} ${monday.getDate()} – ${MONTHS[sun.getMonth()]} ${sun.getDate()}`;
    // day header row
    const dh = sec.children[1];
    const todayCell = dh.children[3].cloneNode(true), plainCell = dh.children[2].cloneNode(true);
    days.forEach((d, i) => {
      const cell = (d === D(0) ? todayCell : plainCell).cloneNode(true);
      cell.children[0].textContent = WD[pd(d).getDay()]; cell.children[1].textContent = pd(d).getDate();
      cell.style.cursor = 'pointer'; onClick(cell, () => this.openEvent({ date: d }));
      dh.children[i + 1].replaceWith(cell);
    });
    // all-day row
    const ad = sec.children[2];
    const chipTask = ad.children[10] ? ad.children[10].cloneNode(true) : null; // blue dot chip
    const chipLock = ad.children[8].cloneNode(true);
    const chipRed = ad.children[9].cloneNode(true);
    [...ad.children].slice(8).forEach((x) => x.remove());
    // today's column shading in all-day row
    [...ad.children].slice(1, 8).forEach((c, i) => { c.style.background = days[i] === D(0) ? '#F8FAFF' : ''; });
    const rowsUsed = {};
    const place = (el, col) => { rowsUsed[col] = (rowsUsed[col] || 0) + 1; el.style.gridColumn = `${col + 2} / span 1`; el.style.gridRow = String(rowsUsed[col]); ad.appendChild(el); };
    days.forEach((d, i) => {
      S.tasks.filter((w) => w.status !== 'done' && w.due === d && !(w.time && S.events.some((e) => e.date === d && e.title === w.title))).forEach((w) => {
        const el = (w.contract ? (diffDays(d) <= 0 ? chipRed : chipLock) : chipTask || chipLock).cloneNode(true);
        const lbl = `${w.title}${w.time ? ' ' + fmtTime(w.time) : ''}`; el.title = lbl; el.lastElementChild.textContent = lbl;
        el.style.cursor = 'pointer'; onClick(el, () => WorkItem.open(w.id)); place(el, i);
      });
      S.events.filter((e) => e.date === d && e.allDay).forEach((e) => {
        const el = (chipTask || chipLock).cloneNode(true); el.lastElementChild.textContent = e.title; el.title = e.title;
        const col = EVENT_COLOR[e.type] || '#0463CA'; if (el.firstElementChild) el.firstElementChild.style.background = col;
        el.style.cursor = 'pointer'; onClick(el, () => this.openEvent({ id: e.id })); place(el, i);
      });
    });
    Object.entries(rowsUsed).forEach(([col, n]) => { if (n > 4) { const els = [...ad.children].filter((x) => x.style.gridColumn === `${+col + 2} / span 1`); els.slice(3).forEach((x) => x.remove()); const more = html(`<div style="grid-column:${+col + 2} / span 1;grid-row:4;margin:0 4px;font-size:12px;color:#64748B;padding:4px 8px;cursor:pointer">+${n - 3} more</div>`); onClick(more, () => Router.go(`#/agenda/calendar?view=month&d=${days[col]}`)); ad.appendChild(more); rowsUsed[col] = 4; } });
    const maxRows = Math.max(1, ...Object.values(rowsUsed));
    const sep = [...ad.children].slice(1, 8); sep.forEach((s) => (s.style.gridRow = `1 / span ${maxRows}`));
    // time grid
    const grid = sec.children[3];
    const evs = S.events.filter((e) => days.includes(e.date) && !e.allDay && e.start);
    let h0 = 8, h1 = 18;
    evs.forEach((e) => { const s = +e.start.slice(0, 2), en = Math.ceil(+(e.end || e.start).slice(0, 2) + (+(e.end || e.start).slice(3) > 0 ? 1 : 0)); h0 = Math.min(h0, s); h1 = Math.max(h1, en + (en === s ? 1 : 0)); });
    const nh = h1 - h0; const PX = 50;
    grid.style.height = nh * PX + 20 + 'px';
    const labels = grid.children[0];
    labels.innerHTML = Array.from({ length: nh }, (_, i) => `<span style="position: absolute; right: 10px; top: ${3 + i * PX}px; font-size: 11px; color: #64748B;">${fmtTime(String(h0 + i).padStart(2, '0') + ':00')}</span>`).join('');
    const colProto = grid.children[1].cloneNode(false);
    const colToday = grid.children[3].cloneNode(false);
    const tones = { grey: ['#F2F2F2', '#D0D0D0', '#424242'], green: ['#E5F3E8', '#73A884', '#155C2C'], amber: ['#FBF1DC', '#C99A43', '#8A5A00'], red: ['#FCE9E7', '#D9897F', '#912018'] };
    const toneOf = (e) => e.contract ? 'red' : ({ 'Time block': e.txId ? 'amber' : 'grey', Inspection: 'green', Appraisal: 'green', Walkthrough: 'green', Meeting: 'grey', Call: 'grey', Showing: 'grey', 'Open house': 'grey' }[e.type] || 'grey');
    const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    days.forEach((d, i) => {
      const col = (d === D(0) ? colToday : colProto).cloneNode(false);
      col.style.backgroundSize = `100% ${nh * PX + 1}px`;
      S.events.filter((e) => e.date === d && !e.allDay && e.start).forEach((e) => {
        const top = 11 + ((mins(e.start) - h0 * 60) / 60) * PX;
        const dur = Math.max(30, mins(e.end || e.start) - mins(e.start));
        const [bg, bd, fg] = tones[toneOf(e)];
        const el = html(`<a href="#/agenda/event/${e.id}" style="position: absolute; top: ${top}px; left: 4px; right: 4px; height: ${(dur / 60) * PX - 3}px; box-sizing: border-box; padding: 3px 8px; border-radius: 6px; background: ${bg}; border: 1px solid ${bd}; display: flex; flex-direction: column; gap: 1px; overflow: hidden; text-decoration: none; z-index: 1;"><span style="font-size: 12px; line-height: 14px; font-weight: 600; color: ${fg}; overflow: hidden; flex-shrink: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${esc(e.title)}</span><span style="font-size: 11px; line-height: 13px; color: ${fg}; opacity: 0.75; white-space: nowrap; flex-shrink: 0;">${esc(fmtTime(e.start))}${e.end && e.end !== e.start ? ' – ' + esc(fmtTime(e.end)) : ''}</span></a>`);
        onClick(el, () => this.openEvent({ id: e.id }));
        col.appendChild(el);
      });
      if (d === D(0)) {
        const n = new Date(); const m = n.getHours() * 60 + n.getMinutes();
        if (m >= h0 * 60 && m <= h1 * 60) col.appendChild(html(`<div aria-label="Now" style="position: absolute; left: -1px; right: 0; top: ${11 + ((m - h0 * 60) / 60) * PX}px; height: 2px; background: #D92D20; z-index: 2;"><span style="position: absolute; left: -4px; top: -4px; width: 10px; height: 10px; border-radius: 50%; background: #D92D20;"></span></div>`));
      }
      col.addEventListener('dblclick', (ev) => { if (ev.target !== col) return; const y = ev.offsetY - 11; const h = Math.max(h0, Math.min(h1 - 1, h0 + Math.floor(y / PX))); this.openEvent({ date: d, start: String(h).padStart(2, '0') + ':00' }); });
      col.title = 'Double-click to add an event';
      grid.children[i + 1].replaceWith(col);
    });
  },
  month(sec, a, h2) {
    h2.textContent = `${MONTHS_L[a.getMonth()]} ${a.getFullYear()}`;
    const first = new Date(a.getFullYear(), a.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    [...sec.children].slice(1).forEach((x) => x.remove());
    const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return iso(d); });
    const g = html(`<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid #F1F5F9"></div>`);
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((w) => g.appendChild(html(`<div style="padding:10px 12px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#64748B;border-left:1px solid #F1F5F9">${w}</div>`)));
    cells.forEach((d) => {
      const inMonth = pd(d).getMonth() === a.getMonth();
      const items = [...S.events.filter((e) => e.date === d).map((e) => ({ t: e.title, c: e.contract ? '#B42318' : EVENT_COLOR[e.type] || '#0463CA', h: '#/agenda/event/' + e.id })), ...S.tasks.filter((w) => w.status !== 'done' && w.due === d && w.contract).map((w) => ({ t: w.title, c: '#B42318', id: w.id }))];
      const cell = html(`<div style="min-height:96px;padding:6px 8px;border-left:1px solid #F1F5F9;border-top:1px solid #F1F5F9;background:${d === D(0) ? '#F8FAFF' : '#fff'};opacity:${inMonth ? 1 : 0.45};display:flex;flex-direction:column;gap:3px;cursor:pointer"><span style="font-size:13px;font-weight:${d === D(0) ? 700 : 500};color:${d === D(0) ? '#0463CA' : '#020617'}">${pd(d).getDate()}</span>${items.slice(0, 3).map((x) => `<a ${x.h ? `href="${x.h}"` : `data-w="${x.id}"`} style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:#334155;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="width:6px;height:6px;border-radius:50%;background:${x.c};flex-shrink:0"></span>${esc(x.t)}</a>`).join('')}${items.length > 3 ? `<span style="font-size:11px;color:#64748B">+${items.length - 3} more</span>` : ''}</div>`);
      $$('a[href^="#/agenda/event/"]', cell).forEach((link) => onClick(link, () => this.openEvent({ id: link.getAttribute('href').split('/').pop() })));
      $$('[data-w]', cell).forEach((x) => onClick(x, () => WorkItem.open(x.dataset.w)));
      cell.addEventListener('click', (e) => { if (e.target === cell || (e.target.tagName === 'SPAN' && e.target.parentElement === cell)) Router.go(`#/agenda/calendar?view=week&d=${d}`); });
      g.appendChild(cell);
    });
    sec.appendChild(g);
  },

  // ---------------- drawers ----------------
  drawer(tplKey) {
    const tpl = document.querySelector(`template[data-screen="${tplKey}"]`).content;
    const aside = tpl.querySelector('aside[role=dialog]').cloneNode(true);
    $$('img[data-asset]', aside).forEach((i) => (i.src = window.ASSETS[i.dataset.asset] || ''));
    aside.style.position = 'fixed'; aside.style.zIndex = 1001; aside.style.maxWidth = '100vw';
    return aside;
  },
  mountDrawer(aside, opts) {
    const close = () => { closeOverlays(); if (opts.fromRoute) Router.go(Router.lastAgenda || '#/agenda'); };
    closeOverlays();
    const root = $('#overlay-root');
    const scrim = html('<div class="scrim"></div>'); scrim.onclick = close;
    aside.classList.add('agenda-editor-modal');
    aside.setAttribute('aria-modal', 'true');
    root.appendChild(scrim); root.appendChild(aside);
    document.addEventListener('keydown', escClose);
    $$('a[aria-label=Close]', aside).forEach((a) => onClick(a, close));
    const closeBtn = byText(aside, 'Close', { sel: 'a' }); if (closeBtn) onClick(closeBtn, close);
    // chips inside the drawer (overlay root isn't #app, so wire them here)
    aside.addEventListener('click', (e) => {
      const b = e.target.closest('[aria-pressed]'); if (!b || !aside.contains(b)) return;
      e.preventDefault(); e.stopPropagation();
      const multi = /one or more/i.test(text(b.parentElement.parentElement)) || /^\+ /.test(text(b));
      UI.press(b, multi ? b.getAttribute('aria-pressed') !== 'true' : true, multi);
    });
    return close;
  },
  openTask(opts = {}) {
    const aside = this.drawer('agendaTask');
    const close = this.mountDrawer(aside, opts);
    const tabs = $$('[role=tab]', aside); onClick(tabs[1], () => this.openEvent({ ...opts, fromRoute: false }));
    onClick(tabs[0], () => {});
    const body = aside.children[1];
    const title = toInput(body.children[0], { placeholder: 'What needs doing?', value: opts.title || '' });
    title.setAttribute('style', 'font-size: 24px; font-weight: 600; letter-spacing: -0.025em; color: #020617; padding: 2px 0 4px; border: 0; outline: none; background: transparent; font-family: inherit; width: 100%;');
    const rows = [...body.children];
    const rowBy = (label) => rows.find((r) => r.children[0] && ownText(r.children[0]) === label || (r.children[0] && text(r.children[0]) === label));
    const whenRow = rowBy('When');
    const dates = whenRow.children[1].children[1];
    const dIn = toInput(dates.children[0], { type: 'date', value: opts.due || D(0) });
    const tIn = toInput(dates.children[1], { type: 'time', value: opts.time || '' });
    const txRow = rowBy('Transaction');
    const txSel = toInput(txRow.children[1].children[0], { type: 'select', value: opts.txId || '', options: [['', 'None'], ...S.tx.filter((t) => t.status === 'current' || t.status === 'pending').map((t) => [t.id, `${txLabel(t)} · ${t.side}`])] });
    const pRow = rowBy('People');
    const pIn = toInput(pRow.children[1].children[0], { placeholder: 'Add people from clients and contacts' });
    const recent = pRow.children[1].children[2];
    const names = [...S.clients.slice(0, 3).map((c) => c.name), ...S.contacts.slice(0, 2).map((c) => c.name)];
    const cp = recent.children[0].cloneNode(true); recent.innerHTML = '';
    names.forEach((n) => { const b = cp.cloneNode(true); b.textContent = '+ ' + n; b.setAttribute('aria-pressed', 'false'); recent.appendChild(b); });
    const notes = $('textarea', body); notes.dataset.nopersist = '1';
    const typeGrp = rowBy('Type').children[1].children[0];
    const taskTypes = $$('button', typeGrp).map((b) => text(b)).filter(Boolean);
    const typeSel = toInput(typeGrp, { type: 'select', value: opts.type || 'To-do', options: taskTypes.map((v) => [v, v]) });
    const optionalRows = ['Status', 'Priority', 'Remind me', 'Notes'].map(rowBy).filter(Boolean);
    if (optionalRows.length) {
      const more = html('<details class="agenda-more-options"><summary>More options</summary><div></div></details>');
      pRow.after(more);
      optionalRows.forEach((row) => more.children[1].appendChild(row));
    }
    const create = byText(aside, 'Create task', { sel: 'a' });
    onClick(create, () => {
      const t = title.value.trim(); if (!t) { title.focus(); title.style.borderLeftColor = '#B42318'; return; }
      const type = typeSel.value || 'To-do';
      const statusMap = { 'To do': 'todo', 'In progress': 'in-progress', Blocked: 'blocked', Done: 'done' };
      const status = statusMap[pressedIn(rowBy('Status').children[1].children[0])[0]] || 'todo';
      const range = pressedIn(whenRow.children[1].children[0])[0] === 'Date range';
      const people = [...pressedIn(recent), ...(pIn.value ? pIn.value.split(',').map((s) => s.trim()).filter(Boolean) : [])];
      const w = { id: uid('w'), txId: txSel.value || null, title: t, type, due: parseUSDateValue(dIn.value) || null, time: parseUSTimeValue(tIn.value) || null, status, priority: pressedIn(rowBy('Priority').children[1].children[0])[0] || 'Medium', remind: pressedIn(rowBy('Remind me').children[1].children[0]), people, notes: notes.value, range };
      const c = people.map((n) => S.clients.find((x) => x.name === n)).find(Boolean); if (c) w.clientId = c.id;
      commit(() => { S.tasks.push(w); logActivity(w.txId, `Task added: ${w.title}`); if (type === 'Follow-up' && c) S.followUps.push({ id: uid('f'), clientId: c.id, name: c.name, title: t, type: 'Follow-up', due: w.due || D(0), time: w.time }); }, { rerender: false });
      close(); Router.refresh(); toast(`Task created${w.due ? ' · ' + relWhen(w.due, w.time) : ''}`);
    });
  },
  openEvent(opts = {}) {
    const e = opts.id ? byId('events', opts.id) : null;
    const aside = this.drawer('agendaEvent');
    const close = this.mountDrawer(aside, opts);
    const t0 = e && e.txId && txOf(e.txId);
    const head = aside.children[0].children[0];
    head.innerHTML = e ? `Event · <span style="color:#020617">${esc(t0 ? txLabel(t0) : e.type)}</span>` : '';
    if (!e) {
      head.innerHTML = `<div role="tablist" style="display: flex; gap: 2px; padding: 3px; background: #EEF1F6; border-radius: 11px;"><a href="#" data-tab="task" style="display: flex; align-items: center; height: 30px; padding: 0 12px; border-radius: 8px; font-size: 13px; text-decoration: none; background: transparent; color: #64748B;">Task</a><a href="#" style="display: flex; align-items: center; height: 30px; padding: 0 12px; border-radius: 8px; font-size: 13px; text-decoration: none; background: #FFFFFF; color: #020617; font-weight: 500; box-shadow: 0 1px 2px rgba(2,6,23,0.12);">Event</a></div>`;
      onClick($('[data-tab=task]', head), () => this.openTask({ fromRoute: opts.fromRoute }));
    }
    const body = aside.children[1];
    const title = toInput(body.children[0], { value: e ? e.title : '', placeholder: 'Event title' });
    title.setAttribute('style', 'font-size: 24px; font-weight: 600; letter-spacing: -0.025em; color: #020617; padding: 2px 0 4px; border: 0; outline: none; background: transparent; font-family: inherit; width: 100%;');
    const rows = [...body.children];
    const rowBy = (label) => rows.find((r) => r.children[0] && text(r.children[0]) === label);
    const ty = (e && e.type) || opts.type || 'Meeting';
    const typeGrp = rowBy('Type').children[1].children[0];
    const eventTypes = $$('button', typeGrp).map((b) => text(b)).filter(Boolean);
    const typeSel = toInput(typeGrp, { type: 'select', value: ty, options: eventTypes.map((v) => [v, v]) });
    const when = rowBy('When').children[1];
    const d1 = toInput(when.children[0].children[0], { type: 'date', value: (e && e.date) || opts.date || D(0) });
    const s1 = toInput(when.children[0].children[1], { type: 'time', value: (e && e.start) || opts.start || '10:00' });
    const d2 = toInput(when.children[1].children[0], { type: 'date', value: (e && (e.endDate || e.date)) || opts.date || D(0) });
    const s2 = toInput(when.children[1].children[1], { type: 'time', value: (e && e.end) || (opts.start ? String(+opts.start.slice(0, 2) + 1).padStart(2, '0') + ':00' : '11:00') });
    const allDayRow = when.children[2]; const sw = allDayRow.children[0];
    let allDay = !!(e && e.allDay);
    const paintAD = () => { css(sw, { background: allDay ? '#0463CA' : '#CBD5E1' }); const k = sw.children[0]; if (k) k.style.left = allDay ? '16px' : '2px'; s1.style.opacity = s2.style.opacity = allDay ? 0.4 : 1; };
    paintAD(); onClick(allDayRow, () => { allDay = !allDay; paintAD(); });
    d1.addEventListener('change', () => { const a = parseUSDateValue(d1.value), b = parseUSDateValue(d2.value); if (a && (!b || b < a)) d2.value = usDateValue(a); });
    const txSel = toInput(rowBy('Transaction').children[1].children[0], { type: 'select', value: (e && e.txId) || opts.txId || '', options: [['', 'None'], ...S.tx.filter((t) => t.status !== 'archived').map((t) => [t.id, `${txLabel(t)} · ${t.side}`])] });
    const pc = rowBy('People').children[1];
    const chipP = pc.children[0].cloneNode(true);
    const people = [...((e && e.people) || [])];
    const paintPeople = () => {
      [...pc.children].filter((x) => x.dataset.person).forEach((x) => x.remove());
      people.forEach((n) => { const c = chipP.cloneNode(true); c.dataset.person = n; c.children[0].textContent = initials(n); c.children[1].textContent = n; const x = c.children[3]; if (x) onClick(x, () => { people.splice(people.indexOf(n), 1); paintPeople(); }); pc.insertBefore(c, pIn); });
    };
    pc.children[0].remove();
    const pIn = toInput(pc.children[0], { placeholder: 'Add people from clients and contacts' });
    pIn.setAttribute('list', 'people-dl');
    const dl = html(`<datalist id="people-dl">${[...S.clients.map((c) => c.name), ...S.contacts.map((c) => c.name)].map((n) => `<option value="${esc(n)}">`).join('')}</datalist>`); aside.appendChild(dl);
    pIn.addEventListener('change', () => { if (pIn.value.trim()) { people.push(pIn.value.trim()); pIn.value = ''; paintPeople(); } });
    const fromLbl = pc.children[1]; const sugg = pc.children[2];
    const refreshSugg = () => {
      const t = txSel.value && txOf(txSel.value);
      if (!t) { hide(fromLbl); hide(sugg); return; }
      show(fromLbl); show(sugg); fromLbl.textContent = `From ${txLabel(t)}`;
      const proto = sugg.children[0] ? sugg.children[0].cloneNode(true) : null; if (!proto) return;
      sugg.innerHTML = '';
      (t.parties || []).filter(([n]) => !people.includes(n) && n !== `${S.user.first} ${S.user.last}`).forEach(([n, r]) => { const b = proto.cloneNode(true); b.setAttribute('aria-pressed', 'false'); b.innerHTML = `+ ${esc(n)} <span style="color:#94A3B8;font-size:11.5px">${esc(r.split(' · ')[0])}</span>`; onClick(b, () => { people.push(n); paintPeople(); refreshSugg(); }); sugg.appendChild(b); });
    };
    txSel.addEventListener('change', refreshSugg);
    paintPeople(); refreshSugg();
    const loc = toInput(rowBy('Location').children[1].children[0], { value: (e && e.location) || '', placeholder: 'Address or place' });
    const link = toInput(rowBy('Meeting link').children[1].children[0], { value: (e && e.link) || '', placeholder: 'https://meet.google.com/…' });
    const remGrp = rowBy('Remind me').children[1].children[0];
    $$('button', remGrp).forEach((b) => { b.dataset.multi = '1'; UI.press(b, !!(e ? (e.remind || []).includes(text(b)) : text(b) === '1 hour before'), true); });
    const optionalRows = ['Location', 'Meeting link', 'Remind me'].map(rowBy).filter(Boolean);
    if (optionalRows.length) {
      const more = html('<details class="agenda-more-options"><summary>More options</summary><div></div></details>');
      optionalRows[0].before(more);
      optionalRows.forEach((row) => more.children[1].appendChild(row));
    }
    const save = byText(aside, 'Save changes', { sel: 'a' });
    if (!e) save.textContent = 'Create event';
    if (e) { const del = html(`<a href="#" style="margin-right:auto;font-size:14px;color:#B42318;text-decoration:none;display:flex;align-items:center">Delete event</a>`); save.parentElement.prepend(del); onClick(del, () => { close(); commit((s) => (s.events = s.events.filter((x) => x.id !== e.id))); toast('Event deleted', { action: 'Undo', onAction: () => commit((s) => s.events.push(e)) }); }); }
    onClick(save, () => {
      const tt = title.value.trim(); if (!tt) { title.focus(); return; }
      const data = { title: tt, type: typeSel.value || 'Meeting', date: parseUSDateValue(d1.value) || D(0), endDate: parseUSDateValue(d2.value), start: allDay ? null : parseUSTimeValue(s1.value), end: allDay ? null : parseUSTimeValue(s2.value), allDay, txId: txSel.value || null, people, location: loc.value, link: link.value, remind: pressedIn(remGrp) };
      commit(() => { if (e) Object.assign(e, data); else S.events.push({ id: uid('e'), ...data }); logActivity(data.txId, `${e ? 'Event updated' : 'Event scheduled'}: ${tt}`); }, { rerender: false });
      close(); Router.refresh(); toast(e ? 'Event saved' : `Event added · ${wdDate(data.date)}${data.start ? ' ' + fmtTime(data.start) : ''}`);
    });
  },
};
window.addEventListener('hashchange', () => { if (/^#\/agenda(\/people|\/calendar)?(\?|$)/.test(location.hash)) Router.lastAgenda = location.hash; });

/** follow-up row (People view + Follow-ups page) */
function followRow(f, proto) {
  const r = proto.cloneNode(true); r.dataset.fu = f.id;
  const cb = r.children[0];
  if (cb.getAttribute('role') === 'checkbox') { UI.setCheck(cb, !!f.done); onClick(cb, () => FollowUps.toggle(f)); }
  const who = r.children[1];
  const av = who.children[0]; av.textContent = initials(f.name);
  const nm = who.children[1]; nm.innerHTML = `${esc(f.name)}${f.tag ? ` <span style="font-size:12px;font-weight:400;color:#64748B">${esc(f.tag.toLowerCase())}</span>` : ''}`;
  r.children[2].textContent = f.title;
  if (f.repeats) r.children[2].insertAdjacentHTML('beforeend', ` <span title="Repeats ${esc(f.repeats)}" style="color:#64748B">↻</span>`);
  const tg = r.children[3].children[0]; if (tg) tg.textContent = f.type;
  const due = r.children[4];
  due.textContent = diffDays(f.due) === 0 && f.time ? fmtTime(f.time) : diffDays(f.due) < 0 || diffDays(f.due) > 6 ? shortDate(f.due) : relDay(f.due);
  due.style.color = diffDays(f.due) < 0 ? '#B42318' : diffDays(f.due) === 0 ? '#020617' : '#64748B';
  onClick(r.children[2], () => FollowUps.open(f));
  onClick(who, () => { if (f.clientId) Router.go('#/clients/' + f.clientId); });
  return r;
}
