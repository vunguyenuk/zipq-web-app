/* Transaction detail — header + Overview / Timeline / Checklist / Documents / Communication log / Transaction log */
const DESIGNED_TX = 't1'; // the transaction the design mocks were drawn for (keeps its rich static content)
const CH_BADGE = {
  Email: ['#E3F0FC', '#034F9F', '<path d="M4 6h16v12H4z"></path><path d="m4 7 8 6 8-6"></path>'],
  SMS: ['#E5F3E8', '#1F7A3A', '<path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z"></path><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01"></path>'],
  Call: ['#F6E8FB', '#7A2E8E', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"></path>'],
};
const chBadge = (ch) => { const [bg, c, p] = CH_BADGE[ch] || CH_BADGE.Email; return `<span style="display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border-radius: 6px; background: ${bg}; color: ${c}; font-size: 11.5px; font-weight: 500; white-space: nowrap;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>${ch}</span>`; };
function msgHTML(m) {
  const mine = m.role === 'You';
  const body = `${m.subject ? `<div style="font-weight: 600; margin-bottom: 2px;">${esc(m.subject)}</div>` : ''}${esc(m.body || '')}`;
  if (mine) return `<article class="comm-message comm-message-out" style="display:grid;grid-template-columns:minmax(0,1fr) 32px;gap:10px;align-items:start;flex-shrink:0"><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;min-width:0;max-width:72ch;justify-self:end"><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">${chBadge(m.channel)}<span style="font-size:12px;color:#64748B">${esc(m.time)}</span><span style="font-size:13px;font-weight:600;color:#020617">${esc(m.from)}</span><span style="font-size:12px;color:#64748B">You</span></div><div style="background:#0463CA;color:#FFFFFF;border-radius:16px 4px 16px 16px;padding:10px 14px;font-size:14px;line-height:1.45;white-space:pre-wrap">${body}</div></div><span aria-hidden="true" style="width:32px;height:32px;border-radius:50%;background:#0463CA;color:#FFFFFF;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initials(m.from)}</span></article>`;
  return `<article class="comm-message comm-message-in" style="display:grid;grid-template-columns:32px minmax(0,1fr);gap:10px;align-items:start;flex-shrink:0"><span aria-hidden="true" style="width:32px;height:32px;border-radius:50%;background:#E3F0FC;color:#034F9F;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initials(m.from)}</span><div style="display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:0;max-width:72ch"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;font-weight:600;color:#020617">${esc(m.from)}</span><span style="font-size:12px;color:#64748B">${esc(m.role || '')}</span>${chBadge(m.channel)}<span style="font-size:12px;color:#64748B">${esc(m.time)}</span></div><div style="background:#FFFFFF;border-radius:4px 16px 16px 16px;box-shadow:0 0 0 1px rgba(2,6,23,0.05),0 1px 2px rgba(2,6,23,0.05),0 6px 20px -6px rgba(2,6,23,0.08);padding:10px 14px;font-size:14px;line-height:1.45;color:#020617;align-self:flex-start">${body}</div></div></article>`;
}
const sepHTML = (label) => `<div role="separator" style="display: flex; align-items: center; gap: 12px; flex-shrink: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #64748B;"><span style="flex-grow: 1; height: 1px; background: #E2E8F0;"></span>${esc(label)}<span style="flex-grow: 1; height: 1px; background: #E2E8F0;"></span></div>`;
const dayLabel = (d) => (diffDays(d) === 0 ? 'TODAY' : diffDays(d) === -1 ? 'YESTERDAY' : wdDate2(d).toUpperCase());

// Keep the mixed Chat timeline intact, but give every channel its own readable record.
function logParty(name) {
  if (name === `${S.user.first} ${S.user.last}` || name === 'Chinh Le') return S.user;
  return S.clients.find((p) => p.name === name) || S.contacts.find((p) => p.name === name) || {};
}
const logWhen = (m) => [m.day && shortDate(m.day), m.time].filter(Boolean).join(' · ');
const logDetail = (value) => esc(value || 'Not recorded');
function channelMessages(t) {
  const messages = S.messages.filter((m) => m.txId === t.id).slice();
  // These two events exist in the designed Chat timeline, but not in the seed store.
  if (t.id === DESIGNED_TX) {
    messages.push({ id: 'designed-call-kevin', txId: t.id, day: D(-1), time: '4:05 PM', from: 'Chinh Le', role: 'You', channel: 'Call', to: 'Kevin Ortiz', duration: '6 min', endTime: '4:11 PM', body: 'Pre-approval raised to $1.3M; updated letter coming today.' });
    messages.push({ id: 'designed-email-counter', txId: t.id, day: D(0), time: '9:12 AM', from: 'Lena Brooks', role: 'Listing agent · Coast Realty', channel: 'Email', subject: 'Counter offer on 123 ABC Street', body: 'Seller counters at $1,265,000, asks to extend the offer window to Thursday.' });
  }
  return messages;
}
function channelView(t, filter) {
  const messages = channelMessages(t).filter((m) => m.channel === (filter === 'Calls' ? 'Call' : filter));
  const empty = (label) => `<div class="channel-empty">No ${label} recorded for this transaction yet.</div>`;
  if (filter === 'Email') return messages.length ? `<div class="channel-view channel-email" aria-label="Email correspondence">${messages.map((m) => {
    const from = logParty(m.from), toName = m.to || (m.role === 'You' ? clientName(t) : `${S.user.first} ${S.user.last}`), to = logParty(toName);
    return `<div class="channel-mail" aria-label="Email from ${esc(m.from)}"><div class="channel-mail-head"><span class="channel-avatar">${initials(m.from)}</span><div class="channel-mail-address"><strong>${esc(m.from)}</strong><span>${logDetail(from.email)}</span></div><time>${esc(logWhen(m))}</time></div><div class="channel-mail-meta"><span>To</span><span>${esc(toName)}${to.email ? ` · ${esc(to.email)}` : ''}</span></div><h3>${esc(m.subject || '(No subject)')}</h3><div class="channel-mail-body">${m.body ? esc(m.body) : '<span class="channel-muted">No message body captured.</span>'}</div></div>`;
  }).join('')}</div>` : empty('emails');
  if (filter === 'SMS') return messages.length ? `<div class="channel-view channel-sms" aria-label="SMS conversation"><div class="channel-view-heading">Text messages <span>${esc(clientName(t) || txLabel(t))}</span></div>${messages.map((m) => {
    const mine = m.role === 'You', from = logParty(m.from), toName = m.to || (mine ? clientName(t) : `${S.user.first} ${S.user.last}`), to = logParty(toName);
    return `<div class="channel-sms-row${mine ? ' is-out' : ''}"><div class="channel-sms-who"><strong>${esc(m.from)}</strong><span>${logDetail(from.phone)} → ${esc(toName)} · ${logDetail(to.phone)}</span></div><div class="channel-sms-bubble">${esc(m.body || '')}</div><time>${esc(logWhen(m))}</time></div>`;
  }).join('')}</div>` : empty('text messages');
  if (filter === 'Calls') return messages.length ? `<div class="channel-view channel-calls" aria-label="Call history">${messages.map((m) => {
    const mine = m.role === 'You', from = logParty(m.from), toName = m.to || (mine ? clientName(t) : `${S.user.first} ${S.user.last}`), to = logParty(toName);
    return `<div class="channel-call"><div class="channel-call-title"><span class="channel-call-icon" aria-hidden="true">☎</span><div><strong>${mine ? 'Outgoing call' : 'Incoming call'}</strong><span>${esc(m.from)} → ${esc(toName)}</span></div><time>${esc(m.day ? shortDate(m.day) : '')}</time></div><dl><div><dt>From</dt><dd>${esc(m.from)}<small>${logDetail(from.phone)}</small></dd></div><div><dt>To</dt><dd>${esc(toName)}<small>${logDetail(to.phone)}</small></dd></div><div><dt>Started</dt><dd>${logDetail(m.time)}</dd></div><div><dt>Ended</dt><dd>${logDetail(m.endTime)}</dd></div><div><dt>Duration</dt><dd>${logDetail(m.duration)}</dd></div></dl>${m.body ? `<div class="channel-call-note"><span>Call notes</span>${esc(m.body)}</div>` : ''}</div>`;
  }).join('')}</div>` : empty('calls');
  if (filter === 'DocuSign') {
    const envelopes = S.envelopes.filter((e) => e.txId === t.id);
    return envelopes.length ? `<div class="channel-view channel-sign" aria-label="DocuSign envelopes">${envelopes.map((env) => {
      const recipients = env.recipients || [];
      const signed = recipients.filter((r) => r.status === 'Signed').length;
      const status = env.status === 'out' ? 'Out for signature' : env.status === 'signed' ? 'Completed' : env.status;
      return `<section class="channel-envelope" aria-label="${esc(env.name)} envelope"><div class="channel-envelope-head"><div><span class="channel-kicker">${esc(env.code || env.id)} · DocuSign</span><h3>${esc(env.name)}</h3><span>Sent ${esc(shortDate(env.sent))} · ${esc(env.by || 'Unknown sender')}</span></div><span class="channel-status">${esc(status || 'Status unavailable')}</span></div><div class="channel-signers"><div class="channel-signers-heading"><span>${recipients.length} signer${recipients.length === 1 ? '' : 's'}</span><span>${signed} signed</span></div>${recipients.map((r, i) => `<div class="channel-signer"><span class="channel-step">${i + 1}</span><div class="channel-signer-name"><strong>${esc(r.name)}</strong><span>${esc(r.role || 'Signer')}</span></div><div class="channel-signature${r.status === 'Signed' ? ' is-signed' : ''}"><strong>${r.status === 'Signed' ? 'Signed' : 'Pending'}</strong><small>${esc(r.note || r.status || '')}</small></div></div>`).join('')}</div><div class="channel-envelope-foot"><a href="#/tx/${esc(t.id)}/documents">Open document →</a></div></section>`;
    }).join('')}</div>` : empty('DocuSign envelopes');
  }
  return '';
}

const TxDetail = {
  ctrl(app, t, tab) {
    this.header(app, t, tab);
    const designed = t.id === DESIGNED_TX;
    if (!designed) this.substitute(app, t);
    const fn = { overview: 'overview', timeline: 'timeline', checklist: 'checklist', documents: 'documents', log: 'log', activity: 'activity' }[tab];
    this[fn](app, t, designed);
  },
  /** swap the designed transaction's names for this one in static copy */
  substitute(app, t) {
    const main = $('main', app);
    const c = clientName(t) || '—';
    replaceTextIn(main.children[1] || main, {
      '123 ABC Street': txLabel(t), '123 ABC': txLabel(t), 'Maria Tran': c, "Maria's": c.split(' ')[0] + "'s", Maria: c.split(' ')[0],
      'Lena Brooks, Coast Realty': 'the other agent', 'Lena Brooks': (t.parties && t.parties[2] && t.parties[2][0]) || 'the other agent',
    });
  },
  header(app, t, tab) {
    const main = $('main', app);
    const hdr = main.children[0];
    const bc = $('nav[aria-label=Breadcrumb]', hdr);
    const tabName = { overview: '', timeline: 'Timeline', checklist: 'Checklist', documents: 'Documents', log: 'Communication log', activity: 'Transaction log' }[tab];
    if (bc) { const last = bc.lastElementChild; last.textContent = txLabel(t); if (tab === 'activity') last.textContent += ' · Transaction log'; }
    const h1 = $('h1', hdr); h1.textContent = txLabel(t);
    if (t.pinned) h1.insertAdjacentHTML('beforeend', ' ' + STAR.replace('width="13" height="13"', 'width="18" height="18"'));
    const sub = h1.nextElementSibling;
    const missing = [!t.city && 'city', !t.county && 'county'].filter(Boolean);
    const subBits = [`${t.side} side`, clientName(t), `opened ${shortDate(t.opened)}`];
    if (missing.length) subBits.push(`${missing.join(' and ')} not set`); else if (t.city) subBits.push(`${t.city}, ${t.county} County`);
    if (t.status === 'closed') subBits.push('closed ' + shortDate(t.closed || D(0)));
    if (t.status === 'archived') subBits.push('archived');
    sub.textContent = subBits.filter(Boolean).join(' · ');
    onClick(sub, () => Tx.openEdit(t)); sub.title = 'Edit details';
    const actions = h1.parentElement.nextElementSibling;
    const ask = $('a', actions); ask.setAttribute('href', `#/chat/new?tx=${t.id}`);
    const sendLink = $$('a', actions)[1];
    if (sendLink) {
      const unfinished = S.docs.find((d) => d.txId === t.id && d.code && (d.status === 'not-started' || (d.status === 'draft' && (d.progress || 0) < 100)));
      const next = nextUp(t);
      if (unfinished) { setOwn(sendLink, `Finish ${unfinished.code}`); sendLink.setAttribute('href', `#/form/${t.id}/${unfinished.code}`); }
      else if (next && next.link === 'documents') { setOwn(sendLink, next.title); sendLink.setAttribute('href', `#/tx/${t.id}/documents`); }
      else { setOwn(sendLink, 'Send for signature'); sendLink.setAttribute('href', `#/send/${t.id}`); }
      sendLink.classList.add('btn-primary');
    }
    onClick($('[aria-label="More actions"]', actions), (e, b) => Tx.moreMenu(b, t));
    // phase stepper
    const ol = $('ol[aria-label=Phase]', hdr);
    const lis = $$('li', ol);
    const idx = PHASES.indexOf(t.phase);
    const st = { done: lis[0].innerHTML, cur: lis[2].innerHTML, fut: lis[3].innerHTML };
    lis.forEach((li, i) => {
      const label = PHASES[i];
      li.innerHTML = (i < idx ? st.done : i === idx ? st.cur : st.fut);
      li.children[1].textContent = label;
      if (i === idx) li.children[0].style.background = 'linear-gradient(90deg, #0D0D0D 0 50%, #E3E3E3 50% 100%)';
      if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.title = i === idx ? 'Current phase' : `Move to ${label}`;
      onClick(li, () => { if (i === idx) return; confirmDlg({ title: `Move to ${label}?`, body: `${txLabel(t)} will move from ${t.phase} to ${label}. Sofia will recalculate the playbook for this phase.`, ok: `Move to ${label}`, onOk: () => commit(() => { Tx.setPhase(t, label); toast(`Phase: ${label}`); }) }); });
    });
    // tabs
    const nav = $('nav[aria-label="Transaction sections"]', hdr);
    const links = $$('a', nav);
    const tplIdx = { txOverview: 0, txTimeline: 1, txChecklist: 2, txDocuments: 3, txLog: 4 }[app.firstElementChild.dataset.screen] || 0;
    const on = links[tplIdx];
    const onS = on.getAttribute('style'); const offS = links[tplIdx === 0 ? 1 : 0].getAttribute('style');
    const keys = ['overview', 'timeline', 'checklist', 'documents', 'log', 'activity'];
    const openCl = S.checklist.filter((c) => c.txId === t.id && !c.done).length;
    const docs = S.docs.filter((d) => d.txId === t.id && ['not-started', 'draft', 'out'].includes(d.status)).length;
    const counts = [null, null, openCl, docs, null, null];
    links.forEach((a, i) => {
      a.setAttribute('href', `#/tx/${t.id}${i ? '/' + keys[i] : ''}`);
      a.setAttribute('style', keys[i] === tab ? onS : offS);
      const span = $('span', a);
      if (span && counts[i] != null) { span.textContent = counts[i]; if (!counts[i]) span.style.display = 'none'; }
    });
  },

  // ---------------- Overview ----------------
  overview(app, t, designed) {
    const ov = $('[aria-label=Overview]', app);
    const art = ov.children[0];
    art.classList.add('tx-overview-card');
    const [head, nyBox, tasksRow, clRow, clArea, kdRow] = [...art.children];
    [tasksRow, clRow, kdRow].forEach((row) => row.classList.add('tx-overview-summary-row'));
    const titleBox = head.children[1];
    const kd = nextKeyDate(t);
    const ny = S.tasks.filter((w) => w.txId === t.id && w.needsYou && w.status !== 'done').sort(sortByDue).slice(0, 3);
    titleBox.children[1].innerHTML = `${esc(t.city || '—')} <span style="color:#CBD5E1">·</span> ${esc(t.side)} <span style="color:#CBD5E1">·</span> <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:7px;height:7px;border-radius:50%;background:${PHASE_COLOR[t.phase]}"></span>${esc(t.phase)}</span>${ny.length ? ` <span style="color:#CBD5E1">·</span> ${ny.length} need you` : ''}`;
    titleBox.children[1].style.cssText += ';display:flex;align-items:center;gap:6px;font-size:13px;color:#64748B';
    const keyBox = head.children[2];
    if (kd) {
      const n = diffDays(kd.due); const hot = kd.contract && n <= 1;
      const when = n < 0 ? `${-n}d overdue` : relWhen(kd.due, kd.time);
      const ico = kd.contract ? LOCK : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
      keyBox.className = 'kd-chip' + (hot || n < 0 ? ' hot' : n <= 2 ? ' soon' : '');
      keyBox.setAttribute('style', '');
      keyBox.title = `${kd.title} — ${when}${kd.contract ? ' (contract deadline)' : ''}`;
      keyBox.innerHTML = `<span class="kd-ico">${ico}</span><span class="kd-label">${esc(kd.title)}</span><span class="kd-when">${esc(when)}</span>`;
    } else hide(keyBox);
    // needs you
    [...nyBox.children].slice(1).forEach((x) => x.remove());
    if (!ny.length) hide(nyBox);
    else {
      nyBox.insertAdjacentHTML('beforeend', ny.sort(sortByDue).map(workRowHTML).join(''));
      $$('[data-wi]', nyBox).forEach((r) => {
        const w = byId('tasks', r.dataset.wi);
        if (w.link === 'form' || /RPA/.test(w.meta || '')) { r.lastElementChild.insertAdjacentHTML('beforeend', `<a href="#/chat/new?tx=${t.id}&q=${encodeURIComponent('Finish the RPA for ' + txLabel(t))}" class="btn btn-sm btn-primary" style="height:28px">Fill with Sofia</a>`); }
        if (w.link === 'documents') onClick(r, () => Router.go(`#/tx/${t.id}/documents`)); else onClick(r, () => WorkItem.open(w.id));
      });
    }
    // Tasks row + expandable list
    const open = openTasks(t.id).filter((w) => !w.keyDate).sort(sortByDue);
    const nx = open[0];
    tasksRow.children[2].innerHTML = nx ? `Next: <span style="color: #020617; font-weight: 500;">${esc(nx.title)}</span> · ${esc(nx.time ? relWhen(nx.due, nx.time) : relDay(nx.due) || 'no date')}` : '<span>No open tasks</span>';
    tasksRow.children[3].innerHTML = `<span>${open.length} open</span>`;
    const tKey = 'ov-tasks:' + t.id;
    const expanded = !!S.collapsed[tKey];
    const tbtn = tasksRow.children[4];
    tbtn.type = 'button'; tbtn.setAttribute('aria-expanded', String(expanded));
    tbtn.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} tasks`);
    tbtn.style.transform = expanded ? 'rotate(90deg)' : ''; tbtn.style.transition = 'transform .15s';
    onClick(tbtn, (event) => { event?.stopPropagation(); S.collapsed[tKey] = !expanded; saveDB(); Router.refresh(); });
    if (expanded) {
      const list = html(`<div data-dyn="1" style="padding: 2px 0 8px"></div>`);
      list.innerHTML = open.map((w) => taskLineHTML(w)).join('') + `<div style="display:flex;gap:14px;padding:6px 18px 4px 48px"><a href="#" data-addtask style="font-size:13.5px;font-weight:500">+ Add task</a><a href="#/agenda?tx=${t.id}" style="font-size:13.5px;color:#64748B">Open in Agenda</a></div>`;
      tasksRow.after(list);
      bindTaskLines(list);
      onClick($('[data-addtask]', list), () => Agenda.openTask({ txId: t.id }));
    }
    // Checklist row + expanded area
    const cl = checklistStats(t.id);
    const firstOpen = cl.items.find((c) => !c.done);
    const draftDocs = S.docs.filter((d) => d.txId === t.id && (d.status === 'draft' || d.status === 'out' || d.status === 'not-started') && d.code);
    clRow.children[2].innerHTML = firstOpen ? `Next: <span style="color: #020617; font-weight: 500;">${esc(firstOpen.title)}${firstOpen.code ? ` (${esc(firstOpen.code)})` : ''}</span>${firstOpen.note ? ' · ' + esc(firstOpen.note.split(' · ').pop()) : ''}` : cl.total ? '<span style="color:#1F7A3A;font-weight:500">All required documents in</span>' : 'No checklist yet';
    const clInfo = clRow.children[3];
    clInfo.innerHTML = `<span>Transaction <span style="color:#020617;font-weight:600">${cl.done}/${cl.total}</span></span>${draftDocs.length ? ` <span>·</span> <span>Forms: <span style="color:#8A5A00;font-weight:500">${esc(draftDocs[0].code)} ${draftDocs[0].status === 'draft' ? draftDocs[0].progress + '%' : draftDocs[0].status === 'out' ? 'out for signature' : 'not started'}</span></span>` : ''}`;
    const cKey = 'ov-cl:' + t.id; const cCollapsed = !!S.collapsed[cKey];
    const clButton = clRow.children[4];
    clButton.type = 'button'; clButton.setAttribute('aria-expanded', String(!cCollapsed));
    clButton.setAttribute('aria-label', `${cCollapsed ? 'Expand' : 'Collapse'} checklist`);
    onClick(clButton, (event) => { event?.stopPropagation(); S.collapsed[cKey] = !cCollapsed; saveDB(); Router.refresh(); });
    clButton.style.transform = cCollapsed ? 'rotate(-90deg)' : '';
    if (cCollapsed) hide(clArea);
    else {
      clArea.classList.add('checklist-preview');
      clArea.children[0].classList.add('checklist-preview-heading');
      const rowP = clArea.children[1].cloneNode(true);
      rowP.classList.add('checklist-preview-row');
      const formHdr = clArea.children[2];
      formHdr.classList.add('checklist-preview-heading');
      const openLink = clArea.lastElementChild;
      openLink.classList.add('checklist-preview-link');
      openLink.setAttribute('href', `#/tx/${t.id}/checklist`);
      [...clArea.children].forEach((x) => { if (x !== clArea.children[0] && x !== formHdr && x !== openLink) x.remove(); });
      clArea.dataset.dyn = '1';
      const openItems = cl.items.filter((c) => !c.done);
      const doneNames = cl.items.filter((c) => c.done).map((c) => c.code || c.title.split(' ')[0]);
      (openItems.length ? openItems : []).forEach((c, i) => {
        const r = rowP.cloneNode(true);
        const cb = r.children[0]; UI.setCheck(cb, false);
        onClick(cb, () => { commit(() => { c.done = true; logActivity(t.id, `Checklist: ${c.title} marked received`); }); toast(`${c.title} checked`); });
        r.children[1].innerHTML = `${esc(c.title)}${c.code ? ` (${esc(c.code)})` : ''}<span style="display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 5px; background: #F1F5F9; color: #334155; font-size: 11px; font-weight: 500; white-space: nowrap;">${esc(c.link)}</span>`;
        r.children[2].textContent = i === 0 && doneNames.length ? `${doneNames.join(', ')} done · ${cl.done}/${cl.total}` : `Due ${relDay(c.due)}`;
        clArea.insertBefore(r, formHdr);
      });
      if (!openItems.length) clArea.insertBefore(html(`<div style="padding:6px 18px 6px 48px;font-size:13.5px;color:#1F7A3A">${cl.total ? 'All transaction-level items are complete.' : 'No transaction-level items.'}</div>`), formHdr);
      draftDocs.slice(0, 3).forEach((d) => {
        const r = rowP.cloneNode(true);
        UI.setCheck(r.children[0], false);
        onClick(r.children[0], () => Router.go(`#/form/${t.id}/${d.code}`));
        r.children[1].textContent = d.status === 'out' ? `${d.code} · ${(S.envelopes.find((e) => e.txId === t.id && e.code === d.code) || { recipients: [1, 2, 3] }).recipients.length} signatures pending` : d.status === 'not-started' ? `${d.code} · not started` : `${d.code} · blanks left`;
        r.children[2].textContent = d.status === 'out' ? 'Out for signature' : `${d.progress || 0}% complete`;
        r.children[2].style.color = d.status === 'draft' ? '#8A5A00' : '#64748B';
        clArea.insertBefore(r, openLink);
      });
      if (!draftDocs.length) hide(formHdr);
    }
    // Key dates row
    const kds = openTasks(t.id).filter((w) => w.keyDate || w.contract).filter((w) => w.due).sort(sortByDue);
    kdRow.children[2].innerHTML = kds[0] ? `Next: <span style="color: #020617; font-weight: 500;">${esc(kds[0].title)}</span> · <span style="color: ${diffDays(kds[0].due) <= 1 ? '#B42318' : '#64748B'};">${esc(relWhen(kds[0].due, kds[0].time))}</span>` : 'No key dates yet';
    kdRow.children[3].innerHTML = `<span>${kds.length} open</span>`;
    kdRow.children[4].setAttribute('href', `#/tx/${t.id}/timeline`);
    onClick(kdRow, () => Router.go(`#/tx/${t.id}/timeline`));
    // Key terms
    const terms = ov.children[1];
    const offer = S.tasks.find((w) => w.txId === t.id && /offer expires/i.test(w.title));
    const vals = [
      ['Purchase price', t.price ? money(t.price) : 'Not set', t.counter ? `from RPA p.1 · seller countered ${money(t.counter)}` : t.price ? 'from RPA p.1' : 'Add it on the RPA or here'],
      [t.side === 'Seller' ? 'Listing price' : 'Offer expires', offer && offer.due ? relWhen(offer.due, offer.time).replace(/^Today /, 'Today, ').replace(/ (\d+(:\d+)?) (AM|PM)$/, ' $1:00 $3').replace(/:(\d\d):00/, ':$1') : t.side === 'Seller' && t.price ? money(t.price) : 'Not set', 'from RPA p.1'],
      ['Financing', t.financing || 'Not set', t.financing ? 'from call with Kevin Ortiz, lender' : 'Sofia fills this from the pre-approval letter'],
      ['Contingencies', t.contingencies || 'Inspection, loan, appraisal (standard RPA)', 'from RPA p.1'],
      ['Close of escrow', t.coe ? `${wdDate(t.coe)} · ${diffDays(t.coe)}d` : 'Not set', t.coe ? 'Acceptance + 30 days' : 'from RPA p.1'],
    ];
    vals.forEach(([k, v, s], i) => {
      const row = terms.children[i + 1]; if (!row) return;
      row.children[0].children[0].textContent = k;
      const ve = row.children[0].children[1]; ve.textContent = v;
      ve.style.color = v === 'Not set' ? '#94A3B8' : (i === 1 && offer && diffDays(offer.due) <= 0 ? '#B42318' : '');
      row.children[1].textContent = s;
      onClick(row, () => Tx.openEdit(t)); row.title = 'Edit';
    });
    // Participants
    const side = ov.nextElementSibling || app.querySelector('[aria-label=Overview]').parentElement.children[1];
    const parts = side.children[0];
    const pp = parts.children[1].cloneNode(true);
    [...parts.children].slice(1).forEach((x) => x.remove());
    (t.parties || []).forEach(([n, r]) => { const el = pp.cloneNode(true); el.children[0].textContent = initials(n); el.children[1].children[0].textContent = n; el.children[1].children[1].textContent = r; parts.appendChild(el); onClick(el, () => { const k = S.contacts.find((c) => c.name === n); if (k) Router.go('#/contacts?q=' + encodeURIComponent(n)); else { const c = S.clients.find((c) => c.name === n); if (c) Router.go('#/clients/' + c.id); } }); });
    const addP = html(`<a href="#" style="font-size:13px;font-weight:500;padding-top:4px">+ Add participant</a>`);
    parts.appendChild(addP);
    onClick(addP, () => openForm({ title: 'Add participant', subtitle: txLabel(t), fields: [{ name: 'who', label: 'From contacts', type: 'select', options: [['', '— New person —'], ...S.contacts.map((c) => [c.name, `${c.name} · ${c.type}`])] }, { name: 'name', label: 'Or name', placeholder: 'Full name' }, { name: 'role', label: 'Role', placeholder: 'e.g. Escrow · Coastline Escrow' }], submit: 'Add', onSubmit: (d) => { const n = d.who || d.name; if (!n) return false; const k = S.contacts.find((c) => c.name === n); commit(() => { t.parties = t.parties || []; t.parties.push([n, d.role || (k ? `${k.type} · ${k.company}` : 'Participant')]); logActivity(t.id, `${n} added as participant`); }); } }));
    // Documents card
    const docsCard = side.children[1];
    const dHead = docsCard.children[0]; $('a', dHead).setAttribute('href', `#/tx/${t.id}/documents`);
    const protos = [docsCard.children[1], docsCard.children[2], docsCard.children[3]].map((x) => x && x.cloneNode(true));
    [...docsCard.children].slice(1).forEach((x) => x.remove());
    const list = S.docs.filter((d) => d.txId === t.id && d.code).slice(0, 4);
    list.forEach((d) => {
      const p = (d.status === 'out' ? protos[0] : d.status === 'draft' ? protos[1] : protos[2]).cloneNode(true);
      p.children[0].children[0].textContent = d.code;
      const st = p.children[0].children[1];
      if (d.status === 'out') { const env = S.envelopes.find((e) => e.txId === t.id && e.code === d.code); const sg = env ? env.recipients.filter((r) => r.status === 'Signed').length : 0; st.textContent = `Out for signature · ${sg}/${env ? env.recipients.length : 3}`; p.lastElementChild.textContent = env ? `${env.recipients.map((r) => r.name).join(', ')} · sent ${shortDate(env.sent)}` : ''; }
      else if (d.status === 'draft') { st.textContent = `Draft · ${d.progress}%`; css(p.children[1].children[0], { width: d.progress + '%' }); p.lastElementChild.textContent = d.progress >= 90 ? 'Ready to send' : 'Blanks left before it can go out'; }
      else { st.textContent = d.status === 'signed' ? 'Signed' : `Not started · 0/${d.pages}`; if (d.status === 'signed') css(st, { background: '#E4F5EC', color: '#1F7A55' }); p.lastElementChild.textContent = d.name; }
      p.style.cursor = 'pointer';
      onClick(p, () => Router.go(d.source === 'Form' || d.status === 'draft' ? `#/form/${t.id}/${d.code}` : `#/tx/${t.id}/documents`));
      docsCard.appendChild(p);
    });
    if (!list.length) docsCard.appendChild(html(`<div style="font-size:13px;color:#64748B;padding:8px 0">No forms yet. <a href="#/forms?tx=${t.id}">Add a form</a></div>`));
  },

  // ---------------- Timeline ----------------
  timeline(app, t) {
    const wrap = $('main', app).children[1];
    const list = wrap.children[0];
    const P = { done: list.children[0].cloneNode(true), prog: list.children[2].cloneNode(true), contract: list.children[3].cloneNode(true), fut: list.children[4].cloneNode(true), futC: list.children[5].cloneNode(true) };
    list.innerHTML = '';
    const items = [];
    items.push({ title: 'Transaction opened', type: 'Milestone', state: 'done', sub: `${wdDate(t.opened)} · done` });
    S.tasks.filter((w) => w.txId === t.id && w.status === 'done').forEach((w) => items.push({ w, title: w.title, type: w.type, state: 'done', sub: `${w.doneAt ? wdDate(w.doneAt) : w.due ? wdDate(w.due) : ''} · done`, sort: w.doneAt || w.due }));
    const open = openTasks(t.id).sort(sortByDue);
    open.forEach((w) => {
      let state = 'fut';
      if (w.status === 'in-progress') state = 'prog';
      else if (w.contract && w.due && diffDays(w.due) <= 2) state = 'contract';
      else if (w.contract) state = 'futC';
      items.push({ w, title: w.title, type: w.type, state, sub: w.due ? `${relWhen(w.due, w.time)}${w.due && diffDays(w.due) < 0 ? ' · overdue' : ''}` : 'Date set when the offer is accepted', sort: w.due || '9999' });
    });
    if (t.coe && !open.some((w) => /close of escrow/i.test(w.title))) items.push({ title: 'Close of escrow', type: 'Milestone', state: 'futC', sub: wdDate(t.coe), sort: t.coe });
    items.forEach((it) => {
      const el = P[it.state].cloneNode(true);
      const body = el.children[1];
      const tags = body.children[0];
      tags.children[0].textContent = it.title;
      if (tags.children[1]) tags.children[1].textContent = it.type;
      if (it.state === 'prog' && tags.children[2]) tags.children[2].textContent = 'In progress';
      body.children[1].textContent = it.sub;
      const sync = el.children[2]; if (sync) sync.title = 'Synced to Google Calendar';
      if (it.w) { el.style.cursor = 'pointer'; onClick(el, () => WorkItem.open(it.w.id)); }
      list.appendChild(el);
    });
    const add = html(`<div style="padding: 12px 0 0 32px"><button class="btn btn-sm" data-add>${ICON.plus} Add key date or task</button></div>`);
    list.appendChild(add);
    onClick($('[data-add]', add), () => Agenda.openTask({ txId: t.id }));
    // right column: next contingency
    const aside = wrap.children[1];
    if (aside) {
      const nextC = open.find((w) => /contingency/i.test(w.type) || /contingency/i.test(w.title));
      const lbl = byText(aside, 'Contingency removal (CR-B) due Acceptance + 17 days');
      if (lbl) lbl.textContent = nextC ? `${nextC.title} due ${nextC.due ? relWhen(nextC.due) : 'Acceptance + 17 days'}` : 'No contingencies pending';
      const sofiaNote = byText(aside, 'Sofia will recalculate every date once the offer is accepted.');
      if (sofiaNote && t.phase !== 'Offer Prep') sofiaNote.textContent = 'Dates follow the signed contract. Sofia recalculates them if a signed form changes a date.';
    }
  },

  // ---------------- Checklist ----------------
  checklist(app, t, designed) {
    const col = $('main', app).children[1].children[0];
    const sec = col.children[0];
    const openP = sec.children[2].cloneNode(true), doneP = sec.children[3].cloneNode(true);
    [...sec.children].slice(2).forEach((x) => x.remove());
    const cl = checklistStats(t.id);
    const bar = sec.children[0].children[1];
    css(bar.children[0].children[0], { width: (cl.total ? Math.round((cl.done / cl.total) * 100) : 0) + '%' });
    bar.children[1].textContent = `${cl.done} of ${cl.total} · ${cl.total - cl.done} open`;
    bar.children[1].style.color = cl.done === cl.total ? '#1F7A3A' : '#8A5A00';
    cl.items.forEach((c) => {
      const r = (c.done ? doneP : openP).cloneNode(true);
      const name = r.children[0].children[1];
      name.children[0].innerHTML = `${esc(c.title)} ${c.code ? `<span style="font-family: 'Geist Mono', monospace; font-size: 12px; color: #64748B; font-weight: 400;">${esc(c.code)}</span>` : ''}`;
      if (c.done) name.children[1].innerHTML = c.auto ? `<span style="color: #1F7A3A; font-weight: 500;">Auto-checked</span> ${esc(c.auto)}` : `<span style="color: #1F7A3A; font-weight: 500;">Checked</span> by ${esc(c.checkedBy || c.owner)}`;
      else name.children[1].innerHTML = esc(c.note || `Waiting · ${c.link.toLowerCase()}`);
      const due = r.children[1];
      due.children[0].innerHTML = c.done ? esc(shortDate(c.due)) : `${diffDays(c.due) <= 0 ? LOCK.replace('width="12" height="12"', 'width="11" height="11"') + ' ' : ''}${esc(relWhen(c.due, c.time))}`;
      due.children[0].style.color = !c.done && diffDays(c.due) <= 0 ? '#B42318' : '#334155';
      due.children[1].textContent = c.owner;
      r.children[2].children[0].textContent = c.link;
      const act = r.children[3];
      if (c.done) { const v = $('a', act); v.textContent = 'Undo'; onClick(v, () => commit(() => { c.done = false; logActivity(t.id, `Checklist: ${c.title} reopened`); })); }
      else {
        const env = S.envelopes.find((e) => e.txId === t.id && e.code === c.code && e.status === 'out');
        const b = $('button', act);
        if (env) onClick(b, () => { commit(() => { env.lastReminder = new Date().toISOString(); logActivity(t.id, `Reminder sent to ${c.code} signers`, 'signing'); }); toast(`Reminder sent to ${env.recipients.filter((x) => x.status !== 'Signed').map((x) => x.name.split(' ')[0]).join(', ')}`); });
        else { b.textContent = 'Mark received'; onClick(b, () => { commit(() => { c.done = true; c.checkedBy = `${S.user.first} ${S.user.last}`; logActivity(t.id, `Checklist: ${c.title} marked received`); }); toast(`${c.title} checked`); }); }
        if (!env) r.children[2].children[1].textContent = 'To do';
      }
      sec.appendChild(r);
    });
    const add = html(`<div style="padding: 10px 20px; border-top: 1px solid #F1F5F9;"><a href="#" data-add style="font-size: 13.5px; font-weight: 500;">+ Add checklist item</a></div>`);
    sec.appendChild(add);
    onClick($('[data-add]', add), () => openForm({ title: 'Add checklist item', subtitle: txLabel(t), fields: [{ name: 'title', label: 'Item', required: true, placeholder: 'e.g. HOA documents' }, { name: 'code', label: 'Form code', placeholder: 'optional', half: true }, { name: 'due', label: 'Due', type: 'date', value: D(3), half: true }, { name: 'link', label: 'Linked work item', type: 'select', options: ['Document request', 'Signature request', 'Compliance action'] }], submit: 'Add item', onSubmit: (d) => commit(() => S.checklist.push({ id: uid('k'), txId: t.id, level: 'transaction', title: d.title, code: d.code, due: d.due, owner: `${S.user.first} ${S.user.last}`, link: d.link, done: false })) }));
    // form checklists: keep designed RPA detail only for the designed transaction
    const forms = col.children[1];
    const docs = S.docs.filter((d) => d.txId === t.id && d.code && d.source !== 'Call');
    const summary = forms.children[0].children[1];
    const complete = docs.filter((d) => d.status === 'signed' || d.progress >= 100 || d.status === 'out').length;
    if (summary) summary.textContent = `${complete} of ${docs.length} complete`;
    if (!designed) {
      const rowP = forms.children[3].cloneNode(true);
      [...forms.children].slice(2).forEach((x) => x.remove());
      docs.forEach((d) => {
        const r = rowP.cloneNode(true);
        r.children[1].innerHTML = `<span style="font-size: 14px; font-weight: 500;"><span style="font-family: 'Geist Mono', monospace; font-size: 12px; color: #64748B; font-weight: 400;">${esc(d.code)}</span> ${esc(d.name)}</span><span style="font-size: 12.5px; color: #64748B;">${d.status === 'signed' ? 'Signed · all fields complete' : d.status === 'out' ? 'Complete · awaiting signatures' : d.status === 'draft' ? `${d.progress}% of fields filled` : 'Not started'}</span>`;
        const pct = d.status === 'signed' || d.status === 'out' ? 100 : d.progress || 0;
        css(r.children[2].children[0], { width: pct + '%', background: pct === 100 ? '#1F7A3A' : '#0463CA' });
        const b = r.children[3]; b.textContent = pct === 100 ? 'Complete' : pct ? 'In progress' : 'Not started';
        if (pct < 100) css(b, { background: pct ? '#E3F0FC' : '#F1F5F9', color: pct ? '#034F9F' : '#64748B' });
        onClick(r, () => Router.go(`#/form/${t.id}/${d.code}`));
        forms.appendChild(r);
      });
      if (!docs.length) forms.appendChild(html(`<div style="padding:14px 20px;font-size:13.5px;color:#64748B">No forms on this transaction yet. <a href="#/forms?tx=${t.id}">Add forms from the library</a></div>`));
    } else {
      // designed RPA field rows: Fill / Use buttons fill the value
      $$('button', forms).forEach((b) => {
        const lbl = text(b);
        if (lbl === 'Fill' || lbl === 'Use') onClick(b, () => {
          const row = b.closest('.row'); const field = text(row.children[1] || row).split(' ')[0];
          commit(() => {
            if (/City/.test(text(row))) t.city = 'Irvine';
            else if (/County/.test(text(row))) t.county = 'Orange';
            else Sofia.apply({ kind: 'expiry', data: { txId: t.id, date: D(0), time: '17:00' } }, {});
            const d = S.docs.find((x) => x.txId === t.id && x.code === 'RPA'); if (d) d.progress = Math.min(100, d.progress + 6);
            logActivity(t.id, `RPA field filled: ${field}`, 'form');
          });
          toast('Filled — checklist item auto-checked');
        });
      });
      if (t.city) $$('.row', forms).filter((r) => /^City/.test(text(r))).forEach((r) => markFilled(r, t.city));
      if (t.county) $$('.row', forms).filter((r) => /^County/.test(text(r))).forEach((r) => markFilled(r, t.county));
      const offerT = S.tasks.find((w) => w.txId === t.id && /offer expires/i.test(w.title));
      if (offerT && S.ui['rpa-exp-filled']) $$('.row', forms).filter((r) => /^Offer expiration/.test(text(r))).forEach((r) => markFilled(r, relWhen(offerT.due, offerT.time)));
    }
    bindFormDisclosures(forms, t, docs, designed);
    // Sofia check aside
    const aside = $('aside[aria-label="Checklist details"]', app);
    if (aside) {
      const blocking = cl.items.filter((c) => !c.done);
      const sofia = aside.children[0];
      if (!blocking.length && !docs.some((d) => d.status === 'draft')) { sofia.children[1].textContent = 'Checklist complete. Nothing is blocking this transaction.'; [...sofia.children].slice(2).forEach((x) => hide(x)); }
      const fillBtn = byText(aside, 'Fill RPA blanks', { sel: 'a' }); if (fillBtn) fillBtn.setAttribute('href', `#/chat/new?tx=${t.id}&q=${encodeURIComponent('Finish the RPA for ' + txLabel(t))}`);
      const remind = byText(aside, 'Remind AD signers', { sel: 'button' });
      if (remind) onClick(remind, () => { const env = S.envelopes.find((e) => e.txId === t.id && e.status === 'out'); if (!env) { toast('No envelopes are out for signature'); return; } commit(() => logActivity(t.id, `Reminder sent to ${env.code} signers`, 'signing')); toast(`Reminder sent to ${env.code} signers`); });
      const tplLink = $$('a', aside).find((a) => a.getAttribute('href') && a.getAttribute('href').startsWith('#/templates')); if (tplLink && t.template) tplLink.setAttribute('href', '#/templates/' + t.template);
    }
    function markFilled(r, v) {
      // locate cells by content, not position (row templates differ): keep the label, flip the status, swap the pin
      const status = [...r.querySelectorAll('*')].find((e) => !e.children.length && e.textContent.trim() === 'Blank');
      if (status) { status.textContent = 'Filled'; status.style.color = ''; }
      const b = $('button', r); if (b) b.style.display = 'none';
      const pin = [...r.querySelectorAll('svg')].find((x) => x.children.length === 1 && x.firstElementChild.tagName.toLowerCase() === 'circle');
      if (pin) pin.outerHTML = '<span style="width: 18px; height: 18px; border-radius: 50%; background: #E4F5EC; color: #1F7A55; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 12.5 4 4 8-9"/></svg></span>';
      void v;
    }

    function bindFormDisclosures(container, tx, formDocs, isDesigned) {
      S.ui = S.ui || {};
      const bind = (button, label, rows, defaultOpen) => {
        const key = `form-checklist:${tx.id}:${label}`;
        const open = Object.prototype.hasOwnProperty.call(S.ui, key) ? !!S.ui[key] : defaultOpen;
        const contentId = `form-checklist-${tx.id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        button.type = 'button';
        button.classList.add('form-disclosure-button');
        button.setAttribute('aria-controls', contentId);
        if (rows[0]) rows[0].id = contentId;
        const apply = (nextOpen) => {
          button.setAttribute('aria-expanded', String(nextOpen));
          button.setAttribute('aria-label', `${nextOpen ? 'Collapse' : 'Expand'} ${label}`);
          rows.forEach((row) => { row.hidden = !nextOpen; });
        };
        apply(open);
        onClick(button, (event) => {
          event?.stopPropagation();
          const nextOpen = button.getAttribute('aria-expanded') !== 'true';
          S.ui[key] = nextOpen;
          saveDB();
          apply(nextOpen);
        });
      };

      const primary = $('button[aria-expanded]', container);
      if (primary) {
        const summaryRow = primary.parentElement;
        const wrapper = summaryRow.parentElement;
        const code = ($('[style*="Geist Mono"]', summaryRow)?.textContent || 'RPA').trim();
        const detailRows = [...wrapper.children].filter((node) => node !== summaryRow && node.classList.contains('row'));
        wrapper.classList.add('form-checklist-group');
        summaryRow.classList.add('form-checklist-summary');
        bind(primary, code, detailRows, true);
      }

      [...container.children].filter((row) => row.classList.contains('row')).forEach((row) => {
        const code = ($('[style*="Geist Mono"]', row)?.textContent || '').trim();
        if (!code) return;
        row.classList.add('form-checklist-summary');
        const oldIcon = row.firstElementChild;
        const button = document.createElement('button');
        button.className = 'form-disclosure-button';
        button.innerHTML = CHEV_DOWN;
        oldIcon?.replaceWith(button);
        const doc = formDocs.find((item) => item.code === code) || {};
        const complete = doc.status === 'signed' || doc.status === 'out' || doc.progress >= 100;
        const detail = html(`<div class="form-checklist-detail"><span>${complete ? 'Fields complete' : `${doc.progress || 0}% of fields complete`}</span><span>${doc.status === 'out' ? 'Awaiting signatures' : doc.status === 'signed' ? 'Signed' : 'Open form to continue'}</span><a href="#/form/${esc(tx.id)}/${esc(code)}">Open form →</a></div>`);
        row.after(detail);
        bind(button, code, [detail], false);
      });
      container.classList.add('form-checklists');
      if (!isDesigned) container.classList.add('is-generated');
    }
  },

  // ---------------- Documents ----------------
  documents(app, t, designed) {
    const col = $('main', app).children[1].children[0];
    const signing = col.children[0];
    const all = col.children[1];
    const env = S.envelopes.find((e) => e.txId === t.id && e.status === 'out');
    // signing section
    const sHead = signing.children[0];
    const ready = S.docs.filter((d) => d.txId === t.id && d.status === 'draft');
    if (sHead.children[0]) { const s = $$('span', sHead.children[0]); if (s[1]) s[1].textContent = `${env ? 1 : 0} envelope out · ${ready.length} form${ready.length === 1 ? '' : 's'} ready to send`; }
    const envBox = signing.children[1];
    if (!env) envBox.innerHTML = `<div style="padding:18px 20px;font-size:13.5px;color:#64748B">No envelopes out for signature.</div>`;
    else {
      const ol = $('ol', envBox);
      const lis = $$('li', ol);
      env.recipients.forEach((r, i) => {
        const li = lis[i]; if (!li) return;
        const b = $$('span', li).find((s) => /^(Delivered|Waiting|Signed)$/.test(text(s)));
        if (b) { b.textContent = r.status; if (r.status === 'Signed') css(b, { background: '#E4F5EC', color: '#1F7A55' }); }
      });
      if (designed) {
        const [voidB, remindB] = $$('button', envBox).filter((b) => /Void|Remind signers/.test(text(b)));
        onClick(remindB, () => { commit(() => { env.lastReminder = new Date().toISOString(); logActivity(t.id, `Reminder sent to ${env.code} signers`, 'signing'); }); toast('Reminder sent to Maria Tran'); });
        onClick(voidB, () => confirmDlg({ title: 'Void envelope?', body: `The ${env.name} envelope will be cancelled in DocuSign and signers can no longer sign it.`, ok: 'Void envelope', danger: true, onOk: () => commit(() => { env.status = 'void'; const d = S.docs.find((x) => x.txId === t.id && x.code === env.code); if (d) { d.status = 'draft'; d.progress = 100; } const k = S.checklist.find((c) => c.txId === t.id && c.code === env.code); if (k) k.note = 'Envelope voided'; logActivity(t.id, `${env.code} envelope voided`, 'signing'); toast('Envelope voided'); }) }));
        const view = byText(envBox, 'View envelope', { sel: 'a' });
        onClick(view, () => this.envelopeSheet(t, env));
        // simulate signing for demo: click a signer
        $$('li', ol).forEach((li, i) => { li.style.cursor = 'pointer'; li.title = 'Demo: mark as signed'; onClick(li, () => { const r = env.recipients[i]; if (r.status === 'Signed') return; commit(() => { r.status = 'Signed'; r.note = 'Signed ' + fmtTimeFull(new Date().toTimeString().slice(0, 5)); logActivity(t.id, `${r.name} signed the ${env.code}`, 'signing'); if (env.recipients.every((x) => x.status === 'Signed')) { env.status = 'done'; const d = S.docs.find((x) => x.txId === t.id && x.code === env.code); if (d) d.status = 'signed'; const k = S.checklist.find((c) => c.txId === t.id && c.code === env.code); if (k) { k.done = true; k.auto = 'when signed via DocuSign'; } S.tasks.filter((w) => w.txId === t.id && /AD out (?:to sign|for signature)/.test(w.title)).forEach((w) => (w.status = 'done')); } else { const nx = env.recipients.find((x) => x.status === 'Waiting'); if (nx) nx.status = 'Delivered'; } const w = S.tasks.find((x) => x.txId === t.id && x.badge && x.title.includes(env.code)); if (w) w.badge = `${env.recipients.filter((x) => x.status === 'Signed').length} of ${env.recipients.length} signed`; }); toast(`${r.name} signed`); }); });
      }
    }
    const readyRow = signing.children[2];
    if (readyRow) {
      const d = ready[0];
      if (!d) hide(readyRow);
      else {
        const lbl = readyRow.children[1];
        lbl.children[0].innerHTML = `<span style="font-family: 'Geist Mono', monospace; font-size: 12px; color: #64748B; font-weight: 400;">${esc(d.code)}</span> ${esc(d.name)} · <span style="color: #034F9F;">Draft ${d.progress}%</span>`;
        lbl.children[1].textContent = d.progress >= 90 ? 'All fields filled — ready to send' : 'Blanks left before it can go out';
        const sendA = $$('a', readyRow)[1];
        $$('a', readyRow).forEach((a) => {
          if (/Fill/.test(text(a))) a.setAttribute('href', `#/form/${t.id}/${d.code}`);
          else if (d.progress >= 90) {
            a.removeAttribute('aria-disabled');
            a.setAttribute('href', `#/send/${t.id}`);
            css(a, { background: '#0463CA', color: '#FFFFFF' });
          } else {
            a.removeAttribute('href');
            a.setAttribute('aria-disabled', 'true');
            onClick(a, () => toast(`Finish the remaining ${d.code} fields before sending`));
          }
        });
      }
    }
    // all documents table
    const head = all.children[0];
    const docs = S.docs.filter((d) => d.txId === t.id);
    const forms = docs.filter((d) => !d.filedBy); const filed = docs.filter((d) => d.filedBy);
    const hs = head.children[0].children[1]; if (hs) hs.textContent = `${forms.length} forms · ${filed.length} filed`;
    const btns = $$('button,a', head);
    btns.forEach((b) => {
      if (/Upload/.test(text(b))) onClick(b, () => pickFiles((files) => { commit(() => fileDocs(t.id, files)); toast(`Uploaded ${files.length} file${files.length > 1 ? 's' : ''}`); }));
      if (/Add form/.test(text(b))) b.setAttribute('href', `#/forms?tx=${t.id}`);
      if (/Send for signature/.test(text(b))) b.setAttribute('href', `#/send/${t.id}`);
    });
    const P = { form: all.children[2].cloneNode(true), row: all.children[3].cloneNode(true), filedHdr: all.children[5].cloneNode(true), filed: all.children[6].cloneNode(true) };
    [...all.children].slice(2).forEach((x) => x.remove());
    const statusLabel = (d) => d.status === 'draft' ? `Draft ${d.progress}%` : d.status === 'out' ? (() => { const e = S.envelopes.find((x) => x.txId === t.id && x.code === d.code && x.status === 'out'); return `Out for signature ${e ? e.recipients.filter((r) => r.status === 'Signed').length : 0}/${e ? e.recipients.length : 3}`; })() : d.status === 'signed' ? 'Signed' : d.status === 'filed' ? 'Filed' : `Not started 0/${d.pages + 2}`;
    const tone = (d) => ({ draft: ['#E3F0FC', '#034F9F'], out: ['#FBF1DC', '#8A5A00'], signed: ['#E4F5EC', '#1F7A55'], filed: ['#E4F5EC', '#1F7A55'] }[d.status] || ['#F1F5F9', '#64748B']);
    const fill = (el, d) => {
      const c0 = el.children[0];
      if (d.code) c0.innerHTML = `<span style="font-family: 'Geist Mono', monospace; font-size: 12px; color: #64748B; width: 44px; display: inline-block;">${esc(d.code)}</span>${esc(d.name)}`;
      else c0.innerHTML = `<span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-size:14px;font-weight:500;color:#020617">${esc(d.name)}</span><span style="font-size:12px;color:#64748B">${esc(d.from || '')}</span></span>`;
      const st = el.children[1]; const [bg, fg] = tone(d); st.textContent = statusLabel(d); css(st, { background: bg, color: fg, padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: '500', justifySelf: 'start' });
      el.children[2].textContent = d.pages;
      el.children[3].textContent = `${relDay(d.updated)}${d.updatedTime ? ', ' + d.updatedTime : ''}`;
      el.children[4].textContent = d.source;
      el.style.cursor = 'pointer';
      onClick(el, (e) => { if (d.code && (d.source === 'Form' || d.status === 'draft' || d.status === 'not-started')) Router.go(`#/form/${t.id}/${d.code}`); else this.docMenu(el, t, d); });
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.docMenu(el, t, d); });
    };
    forms.forEach((d) => { const el = P.row.cloneNode(true); fill(el, d); all.appendChild(el); });
    if (filed.length) {
      const h = P.filedHdr.cloneNode(true); const s = $$('span', h).pop(); if (s) s.textContent = `Filed by Sofia or you · ${filed.length}`; all.appendChild(h);
      filed.forEach((d) => { const el = P.filed.cloneNode(true); fill(el, d); all.appendChild(el); });
    }
    if (!docs.length) all.appendChild(html(`<div class="empty-note">No documents yet. Add forms from the library or upload files.</div>`));
    // completed envelopes aside
    const aside = $('aside[aria-label="Signing details"]', app);
    if (aside && !designed) {
      const done = S.docs.filter((d) => d.txId === t.id && d.status === 'signed');
      const box = aside.children[0];
      $('span span', box).textContent = done.length;
      const p = box.children[1].cloneNode(true);
      [...box.children].slice(1).forEach((x) => x.remove());
      done.forEach((d) => { const el = p.cloneNode(true); const sp = $('span', el.children[1] || el); const inner = el.children[1]; if (inner) inner.innerHTML = `<span style="font-size:13.5px;font-weight:500;color:#020617"><span style="font-family:'Geist Mono',monospace;font-size:11.5px;color:#64748B">${esc(d.code)}</span> ${esc(d.name)}</span><span style="font-size:12px;color:#64748B">Signed ${shortDate(d.updated)}</span><a href="#" data-dl style="font-size:12px">Download signed PDF</a>`; void sp; box.appendChild(el); });
      if (!done.length) box.appendChild(html('<div style="font-size:13px;color:#64748B">None yet</div>'));
    }
    $$('a', aside || document.createElement('div')).forEach((a) => { if (/Download signed PDF/.test(text(a))) onClick(a, () => toast('Signed PDF downloaded')); });
  },
  docMenu(anchor, t, d) {
    openMenu(anchor, [
      d.code ? { label: 'Open in form editor', onClick: () => Router.go(`#/form/${t.id}/${d.code}`) } : { label: 'Preview', onClick: () => openSheet({ title: d.name, subtitle: d.from || d.source, body: `<div style="height:360px;border-radius:12px;background:#F8FAFC;border:1px dashed #CBD5E1;display:flex;align-items:center;justify-content:center;color:#64748B;font-size:14px">${ICON.doc}&nbsp; ${esc(d.name)} · ${d.pages} page${d.pages > 1 ? 's' : ''}</div>` }) },
      { label: 'Rename', onClick: () => openForm({ title: 'Rename document', fields: [{ name: 'name', label: 'Name', value: d.name, required: true }], onSubmit: (x) => commit(() => (d.name = x.name)) }) },
      d.code && d.status !== 'out' ? { label: 'Send for signature', onClick: () => Router.go(`#/send/${t.id}?doc=${d.code}`) } : null,
      { label: 'Download', onClick: () => toast(`${d.name} downloaded`) },
      '-',
      { label: 'Remove from transaction', danger: true, onClick: () => { commit((s) => (s.docs = s.docs.filter((x) => x.id !== d.id))); toast('Document removed', { action: 'Undo', onAction: () => commit((s) => s.docs.push(d)) }); } },
    ].filter(Boolean));
  },
  envelopeSheet(t, env) {
    openSheet({ title: `${env.name} envelope`, subtitle: `DocuSign · sent ${wdDate(env.sent)} by ${env.by}`, width: 520,
      body: `<div style="display:flex;flex-direction:column;gap:10px">${env.recipients.map((r, i) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid #E2E8F0;border-radius:12px"><span style="width:22px;height:22px;border-radius:50%;background:#F1F5F9;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">${i + 1}</span><span style="flex:1"><b style="font-weight:500">${esc(r.name)}</b><br><small style="color:#64748B">${esc(r.role)} · ${esc(r.note || '')}</small></span>${badge(r.status, r.status === 'Signed' ? 'green' : r.status === 'Delivered' ? 'blue' : 'grey')}</div>`).join('')}</div>${env.lastReminder ? `<p style="font-size:12.5px;color:#64748B;margin:12px 0 0">Last reminder sent ${new Date(env.lastReminder).toLocaleString()}</p>` : ''}` });
  },

  // ---------------- Communication log ----------------
  log(app, t, designed) {
    const sec = $('section[aria-label="Communication log"]', app);
    const list = $('[aria-label=Messages]', sec);
    const savedFilter = S.ui['logfilter:' + t.id];
    const filt = !savedFilter || savedFilter === 'All' ? 'Chat' : savedFilter;
    const added = S.messages.filter((m) => m.txId === t.id && (!designed || m.role === 'You' || m.added));
    if (!designed) {
      list.innerHTML = '';
      let lastDay = null;
      const ms = S.messages.filter((m) => m.txId === t.id).sort((a, b) => a.day.localeCompare(b.day));
      ms.forEach((m) => { if (m.day !== lastDay) { list.insertAdjacentHTML('beforeend', sepHTML(dayLabel(m.day))); lastDay = m.day; } list.insertAdjacentHTML('beforeend', msgHTML(m)); });
      if (!ms.length) list.innerHTML = `<div class="empty-note" style="padding:48px 18px">No messages captured yet. Emails, texts and calls with the parties land here automatically once Inbox capture sees them — or send the first one below.</div>`;
    } else {
      added.forEach((m) => list.insertAdjacentHTML('beforeend', msgHTML(m)));
      // Sofia extracted rows: Confirm / Dismiss
      $$('button', list).forEach((b) => {
        if (text(b) === 'Confirm') onClick(b, () => { Sofia.apply({ kind: 'expiry', data: { txId: t.id, date: D(1), time: '17:00' } }, {}); S.ui['log-confirmed'] = true; saveDB(); Router.refresh(); toast('Offer expiration moved — contract change confirmed'); });
        if (text(b) === 'Dismiss') onClick(b, () => { S.ui['log-dismissed'] = true; saveDB(); Router.refresh(); });
      });
      if (S.ui['log-confirmed'] || S.ui['log-dismissed']) {
        const row = $$('button', list).find((b) => text(b) === 'Confirm');
        if (row) { const r = row.parentElement; $$('button', r).forEach((x) => x.remove()); const st = [...r.children].reverse().find((x) => /Needs confirmation/.test(text(x))); if (st) { st.textContent = S.ui['log-confirmed'] ? 'Confirmed' : 'Dismissed'; css(st, { background: S.ui['log-confirmed'] ? '#E4F5EC' : '#F1F5F9', color: S.ui['log-confirmed'] ? '#1F7A55' : '#64748B' }); } }
      }
    }
    if (filt !== 'Chat') {
      list.innerHTML = channelView(t, filt);
      list.classList.add('channel-list');
    }
    requestAnimationFrame(() => { const sc = list.parentElement; sc.scrollTop = filt === 'Chat' ? sc.scrollHeight : 0; });
    // channel filter
    const tb = $('[aria-label="Filter by channel"]', sec);
    $$('button', tb).forEach((b) => {
      if (ownText(b) === 'All') setOwn(b, 'Chat');
      const ch = ownText(b) || text(b).replace(/\d+$/, '').trim();
      UI.press(b, ch === filt, false);
      onClick(b, () => { S.ui['logfilter:' + t.id] = ch; saveDB(); Router.refresh(); });
      const cnt = $('span', b);
      if (cnt) { const ms = channelMessages(t); const n = ch === 'DocuSign' ? S.envelopes.filter((e) => e.txId === t.id).length : ch === 'Chat' ? ms.length + S.envelopes.filter((e) => e.txId === t.id).length : ms.filter((m) => m.channel === (ch === 'Calls' ? 'Call' : ch)).length; cnt.textContent = n; }
    });
    // composer
    const form = $('form[aria-label="Message the group"]', sec);
    const ta = $('textarea', form); ta.dataset.nopersist = '1';
    const chBtns = $$('button', form).filter((b) => /^(Email|SMS)$/.test(text(b)));
    let channel = S.ui['logch'] || 'Email';
    const chOn = chBtns[0].getAttribute('style'), chOff = chBtns[1].getAttribute('style');
    chBtns.forEach((b) => { b.setAttribute('style', text(b) === channel ? chOn : chOff); onClick(b, () => { S.ui['logch'] = text(b); saveDB(); Router.refresh(); }); });
    const toLbl = byText(form, 'To Maria, Lena, Kevin, Priya', { starts: true }) || $$('span', form).find((s) => /^To /.test(text(s)));
    const recips = (t.parties || []).map((p) => p[0]).filter((n) => n !== `${S.user.first} ${S.user.last}` && n !== 'Chinh Le');
    if (toLbl) toLbl.textContent = recips.length ? `To ${recips.map((n) => n.replace(/^The /, '').split(' ')[0]).join(', ')}` : 'No recipients yet';
    const send = () => {
      const v = ta.value.trim(); if (!v) { ta.focus(); return; }
      commit(() => { S.messages.push({ id: uid('m'), txId: t.id, day: D(0), time: fmtTimeFull(new Date().toTimeString().slice(0, 5)), from: `${S.user.first} ${S.user.last}`, role: 'You', channel, body: v, added: true }); logActivity(t.id, `${channel} sent to ${recips.join(', ') || 'the group'}`, 'message'); const c = clientOf(t); if (c) c.lastTouch = D(0); });
      toast(`${channel} sent to ${recips.length} participant${recips.length === 1 ? '' : 's'}`);
    };
    form.onsubmit = (e) => { e.preventDefault(); send(); };
    onClick($('button[type=submit]', form), send);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); });
    onClick($('[aria-label="Attach a file"]', form), () => pickFiles((files) => { commit(() => fileDocs(t.id, files, 'Attached in Communication log')); ta.value += (ta.value ? '\n' : '') + `📎 ${files.map((f) => f.name).join(', ')}`; }));
    onClick(byText(form, 'Draft reply', { sel: 'button' }), () => {
      const last = S.messages.filter((m) => m.txId === t.id && m.role !== 'You').pop();
      const who = last ? last.from.split(' ')[0] : (clientName(t) || 'there').split(' ')[0];
      ta.value = /counter/i.test(last && (last.body + (last.subject || '')) || '') || t.id === DESIGNED_TX
        ? `Hi ${who}, thanks — we received the counter at ${money(t.counter || 1265000)}. I'm reviewing it with Maria this afternoon and will get back to you before 5 PM.`
        : `Hi ${who}, thanks for the update on ${txLabel(t)}. I'll follow up shortly with next steps.`;
      ta.focus(); toast('Sofia drafted a reply — review and send');
    });
    // participants aside
    const aside = $('aside[aria-label="Participants and sources"]', app);
    if (aside && !designed) {
      const ps = aside.children[0]; $('h2', ps).textContent = `Participants · ${(t.parties || []).length}`;
      const ul = $('ul', ps); const li = ul.children[0].cloneNode(true); ul.innerHTML = '';
      (t.parties || []).forEach(([n, r]) => { const x = li.cloneNode(true); const sp = $$('span', x); if (sp[0]) sp[0].textContent = initials(n); const nm = sp.find((s) => ownText(s) && !/^[A-Z]{1,2}$/.test(ownText(s))); if (nm) nm.textContent = n; const rl = sp[sp.length - 1]; if (rl && rl !== nm) rl.textContent = r.split(' · ')[0]; ul.appendChild(x); });
    }
  },

  // ---------------- Transaction log (activity) ----------------
  activity(app, t) {
    const wrap = $('main', app).children[1];
    const acts = S.activity.filter((a) => a.txId === t.id).sort((a, b) => b.at.localeCompare(a.at));
    wrap.classList.add('transaction-activity-layout');
    wrap.innerHTML = `<div class="transaction-activity-panel" style="background: #fff; border-radius: 16px; box-shadow: 0 0 0 1px rgba(2,6,23,0.05), 0 1px 2px rgba(2,6,23,0.05), 0 6px 20px -6px rgba(2,6,23,0.08); overflow: hidden;">
      <div class="transaction-activity-heading" style="padding: 16px 20px; display:flex; justify-content:space-between; align-items:baseline"><span style="font-size: 16px; font-weight: 600;">Transaction log</span><span style="font-size: 13px; color: #64748B;">Every change to ${esc(txLabel(t))}, by you or Sofia · ${acts.length} entries</span></div>
      ${acts.map((a) => { const d = new Date(a.at); return `<div class="row transaction-log-row" style="display:grid;grid-template-columns:max-content minmax(0,1fr);gap:16px;padding:12px 20px;border-top:1px solid #F1F5F9;font-size:14px"><span class="transaction-log-when" style="color:#64748B;font-size:12.5px;white-space:nowrap">${esc(wdDate(iso(d)))} · ${esc(fmtTimeFull(d.toTimeString().slice(0, 5)))}</span><span>${esc(a.text)}</span></div>`; }).join('') || '<div class="empty-note">No activity yet.</div>'}
    </div>`;
    wrap.style.padding = wrap.style.padding || '20px 28px';
  },
};

/** task line with checkbox (Overview expanded tasks, Agenda) */
function taskLineHTML(w, { showTx = false } = {}) {
  const n = w.due ? diffDays(w.due) : null;
  const dueCol = w.status === 'done' ? '#94A3B8' : n != null && n < 0 ? '#B42318' : '#64748B';
  const tag = w.status === 'blocked' ? '<span style="display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 5px; background: #FBF1DC; color: #8A5A00; font-size: 11px; font-weight: 500;">Blocked</span>' : w.yours ? '<span style="display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 5px; background: #F0F0F0; color: #0D0D0D; font-size: 11px; font-weight: 500;">Your task</span>' : '';
  const t = showTx && w.txId && txOf(w.txId);
  const due = w.due ? `<span class="wi-status" style="font-size: 13px; color: ${dueCol}; flex-shrink: 0;">${esc(n < -1 || n > 6 ? shortDate(w.due) : relDay(w.due))}</span>` : '';
  return `<div class="row ${w.status === 'done' ? 'done-row' : ''}" data-task="${w.id}" style="display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 0 18px 0 48px;">
    <span role="checkbox" tabindex="0" aria-label="Mark ${esc(w.title)} ${w.status === 'done' ? 'not done' : 'done'}" data-tcb aria-checked="${w.status === 'done'}" style="width: 16px; height: 16px; border-radius: 4px; box-shadow: inset 0 0 0 1.5px #CBD5E1; background: #FFFFFF; flex-shrink: 0; cursor: pointer;"></span>
    <span style="display: flex; align-items: center; gap: 8px; flex-grow: 1; min-width: 0; font-size: 14px; color: #1E293B;"><span class="t-strike" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(w.title)}</span>${tag}${due}${t ? `<span style="font-size:12px;color:#64748B">· ${esc(txLabel(t))}</span>` : ''}</span></div>`;
}
function bindTaskLines(root) {
  $$('[data-task]', root).forEach((r) => {
    const w = byId('tasks', r.dataset.task); if (!w) return;
    const cb = $('[data-tcb]', r); UI.setCheck(cb, w.status === 'done');
    onClick(cb, () => WorkItem.toggleDone(w));
    onClick(r, () => WorkItem.open(w.id));
  });
}
