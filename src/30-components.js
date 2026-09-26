/* Shared, data-driven fragments rendered in the design's own styles */
const WI_ICON = {
  flag: ['#E25507', '<path d="M5 21V4M5 4h11l-2 4 2 4H5"></path>'],
  blocked: ['#E02E2A', '<circle cx="12" cy="12" r="8.5"></circle><path d="M6 6l12 12"></path>'],
  pen: ['#5D5D5D', '<path d="M4 20h4L19 9l-4-4L4 16z"></path>'],
  chat: ['#5D5D5D', '<path d="M5 5h14v10H9l-4 4z"></path>'],
  doc: ['#5D5D5D', '<path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"></path><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4"></path>'],
  clock: ['#5D5D5D', '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path>'],
  warn: ['#E25507', '<path d="M12 4 3 20h18z"></path><path d="M12 10v4M12 17h.01"></path>'],
  todo: ['#334155', '<rect x="4.5" y="4.5" width="15" height="15" rx="3"></rect><path d="m8.5 12 2.5 2.5 4.5-5"></path>'],
};
const svgI = (k, size = 15) => { const [c, p] = WI_ICON[k] || WI_ICON.todo; return `<span style="width: 22px; display: flex; justify-content: center; color: ${c}; flex-shrink: 0;"><svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg></span>`; };
function wiIcon(w) {
  if (w.status === 'blocked') return 'blocked';
  if (w.contract || w.type === 'Contract deadline' || w.type === 'Contingency removal') return 'flag';
  if (w.type === 'Signature request') return 'pen';
  if (w.type === 'Follow-up' || w.type === 'Call') return 'chat';
  if (w.type === 'Form completion' || w.type === 'Document request') return 'doc';
  if (EVENT_TYPES.includes(w.type) || w.type === 'Meeting') return 'clock';
  if (w.type === 'Compliance action') return 'warn';
  return 'todo';
}
const badge = (label, tone) => {
  const t = { red: ['#FCE9E7', '#B42318'], purple: ['#FBF1DC', '#8A5A00'], grey: ['#F1F5F9', '#334155'], amber: ['#FBF1DC', '#8A5A00'], blue: ['#F0F0F0', '#0D0D0D'], green: ['#E4F5EC', '#1F7A55'] }[tone] || ['#F1F5F9', '#334155'];
  return `<span style="display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 6px; background: ${t[0]}; color: ${t[1]}; font-size: 12px; font-weight: 500; white-space: nowrap; flex-shrink: 0;">${esc(label)}</span>`;
};
function wiBadge(w) {
  if (w.status === 'blocked') return badge('Blocked', 'red');
  if (w.badge) {
    const signing = String(w.badge).match(/^(\d+) of (\d+) signed$/i);
    if (signing) {
      if (signing[1] === signing[2]) return badge('Signed', 'green');
      return badge(signing[1] === '0' ? 'Out for signature' : `Out for signature · ${w.badge}`, 'amber');
    }
    return badge(w.badge, 'grey');
  }
  if (!w.due) return '';
  const n = diffDays(w.due);
  if (n < 0) return badge(`Overdue ${-n} day${n === -1 ? '' : 's'}`, 'red');
  const lbl = n === 0 ? (w.time ? `Today ${fmtTime(w.time)}` : 'Due today') : n < 7 ? `Due ${WD[pd(w.due).getDay()]}` : `Due ${shortDate(w.due)}`;
  return (w.contract ? `<span title="Set by the contract" style="color: ${n < 0 ? '#E02E2A' : '#E25507'}; display: flex;">${LOCK}</span>` : '') + badge(lbl, n <= 2 || w.contract ? 'amber' : 'grey');
}
function wiMeta(w) {
  if (w.meta && w.type === 'Contract deadline') return `${w.type} · ${w.meta}`;
  if (w.meta) return w.type === 'Blocked' || w.meta.startsWith(w.type) ? w.meta : `${w.type} · ${w.meta}`;
  return w.due ? `${w.type} · ${wdDate(w.due)}${w.time ? ' ' + fmtTime(w.time) : ''}` : w.type;
}
function workRowHTML(w) {
  // status sits right after the title so the eye reads "what + state" together;
  // the last child stays an (initially empty) actions slot pinned to the right.
  const st = wiBadge(w);
  return `<div class="row wi-row" data-wi="${w.id}" style="display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 10px 0 8px; border-radius: 8px; cursor: pointer;">${svgI(wiIcon(w))}<span class="wi-main" style="display: flex; align-items: center; gap: 8px; flex: 0 1 auto; min-width: 0; white-space: nowrap; overflow: hidden;"><span style="font-size: 14px; font-weight: 500; color: #020617; flex-shrink: 0;">${esc(w.title)}</span>${st ? `<span class="wi-status" style="display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;">${st}</span>` : ''}<span style="font-size: 13px; color: #64748B; overflow: hidden; text-overflow: ellipsis;">${esc(wiMeta(w))}</span></span><span class="row-actions" style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: auto;"></span></div>`;
}
const HOUSE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11 12 4l8 7"></path><path d="M6 10v10h12V10"></path></svg>';
const PEOPLE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"></path><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.7 3 2.5 3.5 5.2"></path></svg>';
function txSummary(t) {
  const bits = [t.city, t.side, t.phase === 'Under Contract' ? 'Under contract' : t.phase];
  if (t.coe && t.status !== 'closed') bits.push('COE ' + shortDate(t.coe));
  return bits.filter(Boolean).join(' · ');
}
/** Home queue: a single urgency-sorted list, capped to keep the decision surface calm. */
function needsYouHTML() {
  const items = S.tasks.filter((w) => w.needsYou && w.status !== 'done')
    .sort((a, b) => (a.status === 'blocked' ? -1 : 0) - (b.status === 'blocked' ? -1 : 0) || sortByDue(a, b));
  const rows = items.slice(0, 5).map((w) => {
    const t = w.txId && txOf(w.txId);
    const context = [t && txLabel(t), w.meta].filter(Boolean).join(' · ');
    return workRowHTML(context ? { ...w, meta: context } : w);
  });
  const suggestion = S.suggestions.items[0];
  if (suggestion) rows.push(`<button type="button" class="sofia-inline-suggestion" data-sofia-suggestion><span aria-hidden="true">✦</span><span><strong>Suggested by Sofia</strong> · ${esc(suggestion.title || suggestion.label || S.suggestions.source || 'Review the next best action')}</span><span aria-hidden="true">→</span></button>`);
  if (!rows.length) rows.push(`<div class="empty-note">Nothing needs you right now. Sofia will flag deadlines, blocks and signatures here.</div>`);
  return { html: rows.join(''), count: items.length };
}
function bindWorkRows(root) {
  $$('[data-wi]', root).forEach((r) => onClick(r, () => WorkItem.open(r.dataset.wi)));
}

/** Today card on Home / Agenda */
function todayEvents() {
  const d = D(0);
  const ev = S.events.filter((e) => e.date === d && !e.allDay).map((e) => ({ ...e, kind: 'event' }));
  S.tasks.filter((w) => w.status !== 'done' && w.due === d && w.time && w.contract && !ev.some((e) => e.title === w.title && e.start === w.time)).forEach((w) => ev.push({ id: w.id, title: w.title, type: 'Contract deadline', start: w.time, txId: w.txId, contract: true, kind: 'task' }));
  return ev.sort((a, b) => a.start.localeCompare(b.start));
}
function renderToday(section, { compact = false } = {}) {
  if (!section) return;
  const evs = todayEvents();
  const link = $('a', section.firstElementChild); if (link) link.textContent = `${evs.length} scheduled`;
  const list = section.children[1];
  const nowT = new Date(); const nowS = `${String(nowT.getHours()).padStart(2, '0')}:${String(nowT.getMinutes()).padStart(2, '0')}`;
  let out = '<span style="position: absolute; left: 64px; top: 8px; bottom: 8px; width: 1px; background: #E2E8F0;"></span>';
  let nowDone = false;
  const nowLine = `<div style="display: grid; grid-template-columns: 50px minmax(0, 1fr); column-gap: 9px; align-items: center; position: relative;"><span style="font-size: 12px; font-weight: 600; color: #B42318; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums;">${fmtTimeFull(nowS)}</span><span style="display: flex; align-items: center;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #B42318; margin-left: 3px; flex-shrink: 0;"></span><span style="flex-grow: 1; height: 2px; background: #B42318;"></span></span></div>`;
  evs.forEach((e) => {
    if (!nowDone && e.start > nowS) { out += nowLine; nowDone = true; }
    const past = e.start < nowS;
    const t = e.txId && txOf(e.txId);
    const col = e.contract ? '#E25507' : EVENT_COLOR[e.type] || '#94A3B8';
    const sub = compact ? '' : (e.contract ? `Contract deadline${t ? ' · ' + txLabel(t) : ''}` : `${e.type}${t ? ' · ' + txLabel(t) : ''}`);
    const title = e.contract
      ? `<span style="display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; font-weight: 500; color: ${past ? '#64748B' : '#020617'}; white-space: nowrap;">${esc(e.title)}<span style="color: #E25507; display: flex;">${LOCK}</span><span style="font-weight: 400; color: #E25507; overflow: hidden; text-overflow: ellipsis;">${t ? esc(txLabel(t).replace(/ Street$| Avenue$/, '')) : ''}</span></span>`
      : `<span style="font-size: 13px; font-weight: 500; color: ${past ? '#64748B' : '#020617'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(e.title)} <span style="font-weight: 400; color: #64748B;">· ${esc(t ? txLabel(t).replace(/ Avenue$/, '') : e.type)}</span></span>`;
    out += `<a href="${e.kind === 'event' ? '#/agenda/event/' + e.id : '#/tx/' + e.txId}" style="display: grid; grid-template-columns: 50px 12px minmax(0, 1fr); column-gap: 9px; align-items: center; text-decoration: none; color: inherit;"><span style="font-size: 12px; color: #64748B; text-align: right; font-variant-numeric: tabular-nums;">${fmtTime(e.start)}</span><span style="width: 10px; height: 10px; margin: 0 auto; border-radius: 50%; background: ${col}; box-shadow: 0 0 0 3px #FFFFFF; position: relative;"></span>${title}</a>`;
    void sub;
  });
  if (!nowDone) out += nowLine;
  if (!evs.length) out += '<div style="font-size:13px;color:#64748B;padding-left:73px">Nothing scheduled today.</div>';
  list.innerHTML = out;
}

/** Sofia suggests card (Home + Agenda) */
function renderSuggestions(section) {
  if (!section) return;
  const sg = S.suggestions;
  const items = sg.items;
  if (!items.length) {
    section.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><img src="${window.ASSETS['2141beaaf5']}" style="width:22px;height:22px;border-radius:50%;box-shadow:0 0 0 1px rgba(3,79,159,.28)"><h2 style="margin:0;font-size:14.5px;font-weight:600;color:#034F9F">Sofia suggests</h2></div><span style="font-size:12.5px;color:#64748B;line-height:1.5">You're all caught up. New suggestions from Sofia's routines will show up here.</span><button class="btn btn-sm" data-scan style="align-self:flex-start">Run a scan now</button>`;
    onClick($('[data-scan]', section), () => Sofia.runScan());
    return;
  }
  const head = section.children[0];
  const rowProto = section.children[1].cloneNode(true);
  const btns = section.lastElementChild;
  [...section.children].forEach((c) => { if (c !== head && c !== btns) c.remove(); });

  const srcEl = head.children[1]; if (srcEl) srcEl.textContent = sg.source;
  items.forEach((it) => {
    const r = rowProto.cloneNode(true);
    r.dataset.dyn = '1';
    const cb = r.children[0]; UI.setCheck(cb, it.checked);
    onClick(cb, () => { it.checked = !it.checked; saveDB(); UI.setCheck(cb, it.checked); updateBtn(); });
    const body = r.children[1];
    body.children[0].textContent = it.title;
    body.children[1].innerHTML = it.contract ? `<span style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"><span style="display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 5px; background: #FCE9E7; color: #B42318; font-size: 11px; font-weight: 500;">Contract</span><span style="font-size: 12px; color: #64748B;">${esc(it.meta)}</span></span>` : esc(it.meta);
    section.insertBefore(r, btns);
  });
  const [dismiss, add] = $$('button', btns);
  const updateBtn = () => { const n = items.filter((i) => i.checked).length; add.textContent = n ? `Add ${n} item${n > 1 ? 's' : ''}` : 'Add items'; add.style.opacity = n ? 1 : 0.5; };
  updateBtn();
  onClick(dismiss, () => { const old = JSON.stringify(sg.items); commit((s) => (s.suggestions.items = [])); toast('Suggestions dismissed', { action: 'Undo', onAction: () => commit((s) => (s.suggestions.items = JSON.parse(old))) }); });
  onClick(add, () => { const n = Sofia.applySuggestions(); if (n) toast(`Added ${n} item${n > 1 ? 's' : ''} to your Agenda`); });
  // "3 suggestions" links on the page
}

/** Work item detail / edit */
const WorkItem = {
  open(id) {
    const w = byId('tasks', id); if (!w) return;
    const t = w.txId && txOf(w.txId);
    openDrawer({
      title: w.title, subtitle: `${w.type}${t ? ' · ' + txLabel(t) : ''}`, width: 460,
      body: `<div class="fgrid" style="margin-top:6px">
        ${fieldHTML({ name: 'title', label: 'Title', value: w.title })}
        ${fieldHTML({ name: 'status', label: 'Status', type: 'chips', options: [['todo', 'To do'], ['in-progress', 'In progress'], ['blocked', 'Blocked'], ['done', 'Done']], value: w.status })}
        ${fieldHTML({ name: 'due', label: 'Due', type: 'date', value: w.due || '', half: true })}
        ${fieldHTML({ name: 'time', label: 'Time', type: 'time', value: w.time || '', half: true })}
        ${fieldHTML({ name: 'priority', label: 'Priority', type: 'chips', options: ['High', 'Medium', 'Low'], value: w.priority || 'Medium' })}
        ${fieldHTML({ name: 'notes', label: 'Notes', type: 'textarea', value: w.notes || w.meta || '', rows: 3 })}
        ${w.contract ? '<div class="fhint" style="display:flex;gap:6px;align-items:center;color:#B42318">' + LOCK + ' Set by the contract — changing it here doesn\'t amend the contract.</div>' : ''}
        ${t ? `<a class="chip-link" href="#/tx/${t.id}">${ICON.folder} Open ${esc(txLabel(t))}</a>` : ''}
      </div>`,
      footer: `<button class="btn" data-del style="margin-right:auto;color:#B42318">Delete</button><button class="btn" data-done>${w.status === 'done' ? 'Reopen' : 'Mark done'}</button><button class="btn btn-primary" data-save>Save</button>`,
      onMount: (el) => {
        $$('.chips', el).forEach((g) => g.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', g).forEach((x) => x.classList.remove('on')); b.classList.add('on'); }));
        const val = (n) => { const g = $(`.chips[data-name="${n}"] .on`, el); return g ? g.dataset.v : $(`[name="${n}"]`, el).value; };
        $('[data-save]', el).onclick = () => { commit(() => { Object.assign(w, { title: $('[name=title]', el).value || w.title, status: val('status'), due: parseUSDateValue($('[name=due]', el).value) || null, time: parseUSTimeValue($('[name=time]', el).value) || null, priority: val('priority'), notes: $('[name=notes]', el).value }); if (w.status === 'done') w.needsYou = false; logActivity(w.txId, `Work item updated: ${w.title}`); }); closeOverlays(); toast('Saved'); };
        $('[data-done]', el).onclick = () => { WorkItem.toggleDone(w); closeOverlays(); };
        $('[data-del]', el).onclick = () => { closeOverlays(); commit((s) => (s.tasks = s.tasks.filter((x) => x.id !== w.id))); toast('Work item deleted', { action: 'Undo', onAction: () => commit((s) => s.tasks.push(w)) }); };
      },
    });
  },
  toggleDone(w, silent) {
    commit(() => {
      w.status = w.status === 'done' ? 'todo' : 'done';
      if (w.status === 'done') { w.doneAt = D(0); logActivity(w.txId, `Completed: ${w.title}`, 'done'); }
    });
    if (!silent) toast(w.status === 'done' ? `Done: ${w.title}` : `Reopened: ${w.title}`, w.status === 'done' ? { action: 'Undo', onAction: () => WorkItem.toggleDone(w, true) } : {});
  },
};

/** Voice capture (browser speech API when available, typed fallback) */
const Voice = {
  open(onText) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const el = openSheet({
      title: 'Talk to Sofia', subtitle: SR ? 'Listening… speak naturally, e.g. “Start an offer for 12 Pine Street, buyer is Jordan Lee.”' : 'Voice input is not available in this browser — type what you would say.',
      width: 480,
      body: `<div class="voice-orb"></div><div data-heard style="min-height:44px;text-align:center;font-size:16px;color:#020617;padding:0 8px"></div><input class="input" data-typed placeholder="Or type here…" style="margin-top:12px" data-nopersist>`,
      footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-send>Send to Sofia</button>`,
    });
    $$('[data-close]', el).forEach((b) => (b.onclick = () => { rec && rec.stop(); closeOverlays(); }));
    let rec = null; let heard = '';
    if (SR) {
      try {
        rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
        rec.onresult = (e) => { heard = [...e.results].map((r) => r[0].transcript).join(' '); $('[data-heard]', el).textContent = heard; $('[data-typed]', el).value = heard; };
        rec.onerror = () => { $('.voice-orb', el).style.animation = 'none'; };
        rec.onend = () => { $('.voice-orb', el).style.animation = 'none'; };
        rec.start();
      } catch (e) { /* ignore */ }
    }
    $('[data-send]', el).onclick = () => {
      const v = ($('[data-typed]', el).value || heard).trim();
      rec && rec.stop(); closeOverlays();
      if (!v) return;
      if (onText) onText(v, true); else Chats.startFrom(v, { voice: true });
    };
    $('[data-typed]', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('[data-send]', el).click(); });
  },
};

/** Attach files (kept as metadata; filed to a transaction's Documents) */
function pickFiles(cb, accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg') {
  const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = accept;
  i.onchange = () => cb([...i.files].map((f) => ({ name: f.name, size: f.size })));
  i.click();
}
function fileDocs(txId, files, from = 'Uploaded by you') {
  files.forEach((f) => S.docs.push({ id: uid('d'), txId, code: '', name: f.name, status: 'filed', pages: Math.max(1, Math.round(f.size / 60000)), updated: D(0), source: 'Upload', filedBy: 'You', from }));
  logActivity(txId, `${files.length} file${files.length > 1 ? 's' : ''} uploaded: ${files.map((f) => f.name).join(', ')}`, 'doc');
}
