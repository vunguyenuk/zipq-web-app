/* Home — Sofia first */
const NUMW = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
function homeSummary() {
  const n = S.tasks.filter((w) => w.needsYou && w.status !== 'done').length;
  const hot = S.tasks.filter((w) => w.status !== 'done' && w.contract && w.due === D(0) && w.time).sort(sortByDue)[0];
  const lead = n ? `${NUMW[n] || n} item${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} you today` : 'Nothing needs you right now';
  if (hot) return `Sofia checked your deadlines and documents. ${lead}; the ${hot.title.toLowerCase().replace(' expires', '')} on ${txLabel(txOf(hot.txId))} ${/expires/i.test(hot.title) ? 'expires' : 'is due'} at ${fmtTime(hot.time)}.`;
  return `Sofia checked your deadlines and documents. ${lead}.`;
}
function bindComposer(root, { onSend } = {}) {
  const ta = $('textarea[aria-label="Message Sofia"]', root) || $('input[aria-label="Message Sofia"]', root);
  if (!ta) return;
  ta.dataset.nopersist = '1';
  const send = () => { const v = ta.value.trim(); if (!v) { ta.focus(); return; } ta.value = ''; (onSend || ((x) => Chats.startFrom(x)))(v); };
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const box = ta.closest('div').parentElement;
  const sendBtn = $('a[aria-label=Send]', box) || $('a[aria-label=Send]', root);
  onClick(sendBtn, send);
  // "/" actions
  ta.addEventListener('input', () => {
    if (ta.value === '/') openMenu(ta, [
      { header: 'Actions' },
      { label: '/new — Start a transaction', onClick: () => { ta.value = 'Start a new transaction '; ta.focus(); } },
      { label: '/task — Add a work item', onClick: () => { ta.value = 'Remind me to '; ta.focus(); } },
      { label: '/schedule — Add an event', onClick: () => { ta.value = 'Schedule a call with '; ta.focus(); } },
      { label: '/draft — Draft a text', onClick: () => { ta.value = 'Draft a text to '; ta.focus(); } },
      { label: '/due — What’s due today', onClick: () => Chats.startFrom('What’s due today?') },
    ], { width: 300 });
  });
  const scope = $$('button', box).find((b) => /Entire organization/.test(text(b)));
  if (scope) {
    const paint = () => { const t = S.session.homeScope && txOf(S.session.homeScope); setOwn(scope, t ? txLabel(t) : 'Entire organization'); };
    paint();
    onClick(scope, () => openMenu(scope, [{ label: 'Entire organization', checked: !S.session.homeScope, onClick: () => { S.session.homeScope = null; saveDB(); paint(); } }, '-', ...S.tx.filter((t) => t.status === 'current' || t.status === 'pending').map((t) => ({ label: txLabel(t), checked: S.session.homeScope === t.id, onClick: () => { S.session.homeScope = t.id; saveDB(); paint(); } }))], { width: 260 }));
  }
  onClick($('[aria-label="Attach documents"]', box), () => pickFiles((files) => {
    const t = S.session.homeScope && txOf(S.session.homeScope);
    if (t) { commit(() => fileDocs(t.id, files)); toast(`Filed ${files.length} file${files.length > 1 ? 's' : ''} to ${txLabel(t)}`); }
    else Chats.startFrom(`I uploaded ${files.map((f) => f.name).join(', ')}. Which transaction should these go to?`);
  }));
  onClick($('[aria-label="Talk to Sofia"]', box), () => Voice.open());
  ModeToggle.bind(box.parentElement);
}

const Home = {
  ctrl(app) {
    const main = $('main', app);
    const c = main.children[1];
    const title = $('h1', c);
    if (title) title.textContent = `${greeting()}, ${S.user.first}.`;
    bindComposer(c, { onSend: (v) => Chats.startFrom(v, { tx: S.session.homeScope || null }) });
    // prompt chips
    $$('a.chip', c).forEach((a) => {
      const label = text(a);
      onClick(a, () => Chats.startFrom(label, { tx: /123 ABC/.test(label) ? 't1' : null }));
    });
    $$('a.chip', c).slice(3).forEach(hide);
    const firstChip = $$('a.chip', c)[0];
    const hotTx = S.tx.find((t) => t.status === 'current' && S.docs.some((d) => d.txId === t.id && d.code === 'RPA' && d.status === 'draft'));
    if (firstChip) { if (hotTx) { const n = [...firstChip.childNodes].reverse().find((x) => x.nodeType === 3 && x.nodeValue.trim()); if (n) n.nodeValue = `Have Sofia finish the RPA for ${txLabel(hotTx)}`; onClick(firstChip, () => Chats.startFrom(`Finish the RPA for ${txLabel(hotTx)}`, { tx: hotTx.id })); } else hide(firstChip); }
    // work items
    const wi = $('section[aria-label="Today\'s Work Items"]', c);
    hide(wi.children[0]);
    const needs = wi.children[1].children[0];
    const ny = needsYouHTML();
    needs.children[0].children[0].children[0].textContent = ny.count;
    [...needs.children].slice(1).forEach((x) => x.remove());
    needs.insertAdjacentHTML('beforeend', ny.html);
    bindWorkRows(needs);
    const inlineSuggestion = $('[data-sofia-suggestion]', needs);
    if (inlineSuggestion) onClick(inlineSuggestion, () => Chats.startFrom(S.suggestions.items[0]?.prompt || S.suggestions.items[0]?.title || 'Show me the next best action'));
    const side = wi.children[1].children[1];
    renderToday(side.children[0], { compact: true });
    const suggestionCard = $('section[aria-label="Sofia suggests"]', side);
    if (suggestionCard) hide(suggestionCard);
  },
  firstWeek(app) {
    const main = $('main', app);
    const c = main.children[1];
    byText(c, 'Good morning, Chinh.', { sel: 'h1' }).textContent = `${greeting()}, ${S.user.first}.`;
    bindComposer(c);
    $$('a.chip', c).forEach((a) => onClick(a, () => Chats.startFrom(text(a))));
    const sec = $('section[aria-label="Get started"]', c);
    const card = sec.children[1].children[0];
    const steps = card.children[2];
    const done = {
      0: true,
      1: !!S.user.dre,
      2: !!S.integrations.docusign,
      3: !!S.integrations.gmail,
      4: !!S.session.importedContacts,
      5: !!S.session.routinesVisited,
      6: !!S.session.triedVoice,
    };
    const checkIcon = steps.children[0].children[0].outerHTML;
    const openIcon = steps.children[3].children[0].outerHTML;
    [...steps.children].forEach((row, i) => {
      const ok = done[i];
      row.children[0].outerHTML = ok ? checkIcon : openIcon;
      const act = row.children[2];
      if (act) { if (ok) hide(act); }
      const title = $('span', row.children[1]) || row.children[1];
      if (ok) title.style.color = '#64748B';
    });
    const nDone = Object.values(done).filter(Boolean).length;
    const lbl = card.children[0].children[0];
    $('span', lbl).textContent = `${nDone} of 7 done`;
    css(card.children[1].children[0], { width: Math.round((nDone / 7) * 100) + '%' });
    const connect = byText(steps, 'Connect', { sel: 'a' });
    onClick(connect, () => { commit(() => (S.integrations.gmail = true)); toast('Google Workspace connected'); });
    onClick(byText(steps, 'Import', { sel: 'a' }), () => Contacts.openImport(() => { S.session.importedContacts = true; saveDB(); }));
    const setUp = byText(steps, 'Set up', { sel: 'a' }); if (setUp) setUp.addEventListener('click', () => { S.session.routinesVisited = true; saveDB(); });
    const tryIt = byText(steps, 'Try it', { sel: 'a' }); onClick(tryIt, () => { S.session.triedVoice = true; saveDB(); Voice.open(); });
    onClick(byText(card, 'Hide', { sel: 'button' }), () => { commit(() => (S.session.firstWeek = false)); toast('Setup checklist hidden — your full Home is ready'); });
    const start = sec.children[1].children[1].children[1];
    onClick(start.children[0], () => { S.session.triedVoice = true; saveDB(); Voice.open(); });
    onClick(start.children[1], () => pickFiles((files) => Chats.startFrom(`I uploaded a contract: ${files.map((f) => f.name).join(', ')}. Start a new transaction from it.`), '.pdf'));
    onClick(start.children[2], () => Contacts.openImport());
  },
  phone(app) {
    const root = app.firstElementChild;
    css(root, { width: '100%', minHeight: '100vh' });
    byText(root, 'Good morning, Chinh.', { sel: 'h1' }).textContent = `${greeting()}, ${S.user.first}.`;
    const p = $('p', root); if (p) p.textContent = homeSummary();
    const sec = $('section[aria-label="Needs you"]', root);
    const ny = needsYouHTML();
    $('span', sec.children[0].children[0]).textContent = ny.count;
    [...sec.children].slice(1).forEach((x) => x.remove());
    sec.insertAdjacentHTML('beforeend', ny.html);
    $$('[data-wi] span[style*="font-size: 13px; color: #64748B"]', sec).forEach((s) => (s.style.display = 'none'));
    bindWorkRows(sec);
    // today (phone)
    const today = $('section[aria-label=Today]', root);
    if (today) {
      [...today.children].slice(1).forEach((x) => x.remove());
      today.appendChild(html('<div class="today-list"></div>'));
      renderToday(today, { compact: true });
    }
    const sug = $('a[aria-label^="Sofia suggests"]', root);
    if (sug) { const n = S.suggestions.items.length; if (!n) hide(sug); else { sug.children[1].children[0].textContent = `Sofia suggests · ${n}`; sug.children[1].children[1].textContent = S.suggestions.source; } }
    $$('a', root).filter((a) => /^(Finish the RPA|New transaction|Follow-ups)$/.test(text(a))).forEach((a) => onClick(a, () => { const l = text(a); if (l === 'New transaction') Tx.openCreate(); else Chats.startFrom(l === 'Follow-ups' ? 'Who should I follow up with?' : 'Finish the RPA for 123 ABC Street'); }));
    const acct = $('[aria-label=Account]', root);
    setOwn($('span', acct), initials(S.user.first + ' ' + S.user.last));
    onClick(acct, () => openMenu(acct, [{ label: 'Settings', onClick: () => Router.go('#/settings') }, { label: 'Sign out', danger: true, onClick: () => Auth.signOut() }], { align: 'right' }));
    onClick($('[aria-label="Open menu"]', root), (e, b) => openMenu(b, [{ label: 'Home', onClick: () => Router.go('#/home') }, { label: 'Agenda', onClick: () => Router.go('#/agenda') }, { label: 'Transactions', onClick: () => Router.go('#/transactions') }, { label: 'Clients', onClick: () => Router.go('#/clients') }, { label: 'Chats', onClick: () => Chats.openAll() }]));
    const inp = $('input[aria-label="Message Sofia"]', root);
    if (inp) { inp.dataset.nopersist = '1'; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) Chats.startFrom(inp.value.trim()); }); }
    $$('button', root).filter((b) => /Talk|mic|voice/i.test(b.getAttribute('aria-label') || '')).forEach((b) => onClick(b, () => Voice.open()));
  },
};
