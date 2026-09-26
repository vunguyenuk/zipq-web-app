/* Domain helpers shared by all screens */
const PHASES = ['Prospect', 'Touring', 'Offer Prep', 'Under Contract', 'Closing', 'Closed'];
// Workflow phases are neutral, like ChatGPT navigation. Color is reserved for
// meaning: green for completed progress, amber for waiting, red for risk.
const PHASE_COLOR = { Prospect: '#8F8F8F', Touring: '#5D5D5D', 'Offer Prep': '#0D0D0D', 'Under Contract': '#424242', Closing: '#2E7D4F', Closed: '#8F8F8F' };
const TASK_TYPES = ['To-do', 'Follow-up', 'Document request', 'Payment', 'Signature request', 'Compliance action'];
const EVENT_TYPES = ['Showing', 'Open house', 'Inspection', 'Appraisal', 'Walkthrough', 'Meeting', 'Call', 'Time block', 'Other'];
const EVENT_COLOR = { Showing: '#5D5D5D', 'Open house': '#5D5D5D', Inspection: '#2E7D4F', Appraisal: '#2E7D4F', Walkthrough: '#2E7D4F', Meeting: '#424242', Call: '#424242', 'Time block': '#8F8F8F', Other: '#8F8F8F', 'Contract deadline': '#B42318' };

const clientOf = (t) => t && t.clientId && byId('clients', t.clientId);
const clientName = (t) => (clientOf(t) || {}).name || (t && t.clientName) || '';
const txOf = (id) => byId('tx', id);
const openTasks = (txId) => S.tasks.filter((w) => w.txId === txId && w.status !== 'done');
const sortByDue = (a, b) => ((a.due || '9999') + (a.time || '')).localeCompare((b.due || '9999') + (b.time || ''));

function nextKeyDate(t) {
  const ks = openTasks(t.id).filter((w) => (w.keyDate || w.contract) && w.due).sort(sortByDue);
  const fut = ks.find((w) => diffDays(w.due) >= 0) || ks[0];
  if (fut) return { due: fut.due, time: fut.time, title: fut.title, contract: !!fut.contract };
  if (t.keyDate) return { due: t.keyDate, time: t.keyTime, title: t.keyLabel, contract: !!t.keyContract, past: t.keyPast };
  return null;
}
function nextUp(t) {
  const ts = openTasks(t.id).filter((w) => !w.keyDate && w.type !== 'Milestone').sort((a, b) => (b.suggested ? 1 : 0) - (a.suggested ? 1 : 0) || sortByDue(a, b));
  return ts[0] || null;
}
function checklistStats(txId) {
  const items = S.checklist.filter((c) => c.txId === txId && c.level === 'transaction');
  return { done: items.filter((c) => c.done).length, total: items.length, items };
}
function signingInfo(t) {
  const env = S.envelopes.find((e) => e.txId === t.id && e.status === 'out');
  if (env) {
    const signed = env.recipients.filter((r) => r.status === 'Signed').length;
    return { label: `${env.code} out · ${signed} of ${env.recipients.length} signed`, sub: 'Sent ' + shortDate(env.sent), tone: 'amber' };
  }
  if (t.signingDone) return { label: 'All signed', sub: t.phase === 'Closing' ? 'Closing docs' : 'Envelopes complete', tone: 'green' };
  const draft = S.docs.find((d) => d.txId === t.id && d.status === 'draft' && d.progress >= 75);
  if (draft) return { label: `${draft.code} draft`, tone: 'grey' };
  return null;
}
function needsYouCount(txId) { return S.tasks.filter((w) => w.txId === txId && w.needsYou && w.status !== 'done').length; }
function taskMetaLine(w) {
  const bits = [w.type];
  if (w.due) bits.push(w.time ? `${relDay(w.due)} ${fmtTime(w.time)}` : wdDate(w.due));
  return bits.join(' · ');
}

/** Transactions — creation + common actions */
const Tx = {
  openCreate(prefill = {}) {
    openForm({
      title: 'New transaction',
      subtitle: 'Sofia sets up forms and the playbook from the template you pick.',
      fields: [
        { name: 'address', label: 'Property address', placeholder: 'e.g. 48 Sycamore Lane (leave empty for a prospect)', value: prefill.address || '' },
        { name: 'city', label: 'City', placeholder: 'Irvine', half: true, value: prefill.city || '' },
        { name: 'county', label: 'County', placeholder: 'Orange', half: true, value: prefill.county || '' },
        { name: 'side', label: 'Side', type: 'chips', options: ['Buyer', 'Seller'], value: prefill.side || 'Buyer' },
        { name: 'client', label: 'Client', type: 'select', options: [['', '— New client —'], ...S.clients.map((c) => [c.id, c.name])], value: prefill.clientId || '' },
        { name: 'newClient', label: 'New client name', placeholder: 'First and last name', value: prefill.clientName || '' },
        { name: 'phase', label: 'Phase', type: 'select', options: PHASES.slice(0, 5), value: prefill.phase || 'Offer Prep', half: true },
        { name: 'template', label: 'Template', type: 'select', options: [['', 'None'], ...S.templates.map((t) => [t.id, t.name])], value: prefill.template || 'buyer-standard', half: true },
        { name: 'price', label: 'Price', placeholder: '$', half: true, value: prefill.price || '' },
        { name: 'keyDate', label: 'Offer expires / key date', type: 'date', half: true, value: prefill.keyDate || '' },
      ],
      submit: 'Create transaction',
      onSubmit: (d) => {
        if (!d.address && !d.client && !d.newClient) { toast('Add an address or a client'); return false; }
        const id = Tx.create(d);
        Router.go('#/tx/' + id);
        toast('Transaction created — Sofia queued the forms from the template');
      },
    });
  },
  create(d) {
    let clientId = d.client;
    if (!clientId && d.newClient) {
      clientId = uid('c');
      S.clients.unshift({ id: clientId, name: d.newClient, type: d.side || 'Buyer', stage: d.phase || 'Prospect', priority: 'Warm', source: 'Direct', email: '', phone: '', area: d.address || d.city || '', lastTouch: D(0), notes: '', timeline: [[D(0), 'Client added']] });
    }
    const c = clientId && byId('clients', clientId);
    const id = uid('t');
    const title = d.address || (c ? c.name : 'New transaction');
    const t = { id, title, address: d.address || '', city: d.city || '', county: d.county || '', side: d.side || 'Buyer', clientId, phase: d.phase || 'Offer Prep', status: 'current', pinned: false, opened: D(0), price: Number(String(d.price || '').replace(/[^0-9]/g, '')) || null, template: d.template || '', parties: [[c ? c.name : '—', d.side || 'Buyer'], [`${S.user.first} ${S.user.last}`, d.side === 'Seller' ? 'Listing agent' : "Buyer's agent"]] };
    if (d.keyDate) { t.keyDate = d.keyDate; t.keyLabel = d.side === 'Seller' ? 'Key date' : 'Offer expires'; t.keyContract = true; }
    S.tx.unshift(t);
    const tpl = d.template && byId('templates', d.template);
    if (tpl) {
      tpl.forms.forEach((code, i) => {
        const f = FORM_LIBRARY.find((x) => x.code === code) || { code, name: code, pages: 1 };
        S.docs.push({ id: uid('d'), txId: id, code, name: f.name, status: 'not-started', progress: 0, pages: f.pages, updated: D(0), source: 'Form' });
        if (i < 4) S.checklist.push({ id: uid('k'), txId: id, level: 'transaction', title: f.name, code, due: d.keyDate || D(7), owner: `${S.user.first} ${S.user.last}`, link: 'Signature request', done: false });
      });
      const main = tpl.forms[0];
      S.tasks.push({ id: uid('w'), txId: id, title: `Prepare ${main}`, type: 'To-do', due: D(0), status: 'todo', priority: 'High', suggested: true, link: 'form' });
      S.tasks.push({ id: uid('w'), txId: id, title: `Send ${tpl.forms[1] || main} for signature`, type: 'Signature request', due: D(1), status: 'todo', priority: 'Medium' });
    }
    if (d.keyDate) S.tasks.push({ id: uid('w'), txId: id, title: t.keyLabel, type: 'Contract deadline', contract: true, keyDate: true, due: d.keyDate, time: '17:00', status: 'todo', needsYou: diffDays(d.keyDate) <= 2 });
    logActivity(id, `Transaction opened${tpl ? ' from template “' + tpl.name + '”' : ''}`, 'create');
    S.lastTx = id;
    saveDB();
    return id;
  },
  setPhase(t, phase) {
    t.phase = phase;
    if (phase === 'Closed') { t.status = 'closed'; t.closed = D(0); t.pinned = false; }
    else if (t.status === 'closed') t.status = 'current';
    logActivity(t.id, `Phase changed to ${phase}`, 'phase');
    const c = clientOf(t); if (c && phase !== 'Closed') c.stage = phase;
  },
  moreMenu(anchor, t) {
    openMenu(anchor, [
      { label: t.pinned ? 'Unpin' : 'Pin to sidebar', onClick: () => commit(() => { t.pinned = !t.pinned; t.starred = t.pinned; }) },
      { label: 'Edit details', onClick: () => Tx.openEdit(t) },
      { label: 'Add work item', onClick: () => Agenda.openTask({ txId: t.id }) },
      { label: 'Add event', onClick: () => Agenda.openEvent({ txId: t.id }) },
      { label: 'Ask Sofia about this transaction', onClick: () => Router.go('#/chat/new?tx=' + t.id) },
      '-',
      t.status === 'pending' ? { label: 'Mark as current', onClick: () => commit(() => { t.status = 'current'; t.blocked = null; logActivity(t.id, 'Moved back to current'); }) } : { label: 'Mark as pending', onClick: () => commit(() => { t.status = 'pending'; logActivity(t.id, 'Marked pending'); }) },
      t.status === 'archived' ? { label: 'Restore', onClick: () => commit(() => { t.status = 'current'; }) } : { label: 'Archive', onClick: () => commit(() => { t.status = 'archived'; t.pinned = false; logActivity(t.id, 'Archived'); toast('Archived', { action: 'Undo', onAction: () => commit(() => (t.status = 'current')) }); }) },
      { label: 'Delete transaction', danger: true, onClick: () => confirmDlg({ title: 'Delete transaction?', body: `${txLabel(t)} and its work items, documents and checklist will be removed.`, ok: 'Delete', danger: true, onOk: () => { commit((s) => { s.tx = s.tx.filter((x) => x.id !== t.id); s.tasks = s.tasks.filter((x) => x.txId !== t.id); s.docs = s.docs.filter((x) => x.txId !== t.id); s.checklist = s.checklist.filter((x) => x.txId !== t.id); s.events = s.events.filter((x) => x.txId !== t.id); if (s.lastTx === t.id) s.lastTx = s.tx[0] && s.tx[0].id; }, { rerender: false }); Router.go('#/transactions'); toast('Transaction deleted'); } }) },
    ], { align: 'right', width: 240 });
  },
  openEdit(t) {
    openForm({
      title: 'Edit transaction', subtitle: txLabel(t),
      fields: [
        { name: 'address', label: 'Property address', value: t.address },
        { name: 'city', label: 'City', value: t.city, half: true },
        { name: 'county', label: 'County', value: t.county, half: true },
        { name: 'side', label: 'Side', type: 'chips', options: ['Buyer', 'Seller'], value: t.side },
        { name: 'phase', label: 'Phase', type: 'select', options: PHASES, value: t.phase, half: true },
        { name: 'price', label: 'Purchase price', value: t.price ? money(t.price) : '', half: true },
        { name: 'coe', label: 'Close of escrow', type: 'date', value: t.coe || '', half: true },
      ],
      submit: 'Save changes',
      onSubmit: (d) => commit(() => {
        const changed = [];
        if (d.address !== t.address) { changed.push('address'); if (d.address) t.title = d.address; }
        if (d.city !== t.city) changed.push('city'); if (d.county !== t.county) changed.push('county');
        Object.assign(t, { address: d.address, city: d.city, county: d.county, side: d.side, coe: d.coe || t.coe, price: Number(d.price.replace(/[^0-9]/g, '')) || t.price });
        if (d.phase !== t.phase) Tx.setPhase(t, d.phase);
        logActivity(t.id, 'Details updated' + (changed.length ? ': ' + changed.join(', ') : ''));
        toast('Saved');
      }),
    });
  },
};
