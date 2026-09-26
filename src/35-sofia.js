/* Sofia — scripted assistant. Reads the store to answer; in Agent mode proposes changes as approval cards. */
const ADDR_RE = /(\d{1,6}[a-z]?\s+(?:[A-Z0-9][\w'.-]*\s+){0,4}(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Court|Ct|Drive|Dr|Way|Boulevard|Blvd|Place|Pl|Circle|Cir|Terrace|Ter|Trail|Parkway|Pkwy)\b\.?(?:\s*(?:#|Unit|Apt)\s*\w+)?)/i;
const NUM_WORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
function spokenNumbers(s) { return s.replace(/\b((?:zero|one|two|three|four|five|six|seven|eight|nine)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine))+)\b/gi, (m) => m.split(/\s+/).map((w) => NUM_WORDS[w.toLowerCase()]).join('')); }
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
function parseDue(s) {
  const l = s.toLowerCase();
  if (/\btoday\b|\btonight\b/.test(l)) return D(0);
  if (/\btomorrow\b/.test(l)) return D(1);
  if (/next week/.test(l)) return D(7);
  for (let i = 0; i < 7; i++) { const name = WD_L[i].toLowerCase(); if (new RegExp('\\b(' + name + '|' + WD[i].toLowerCase() + ')\\b').test(l)) { let n = (i - today0().getDay() + 7) % 7; if (n === 0) n = 7; return D(n); } }
  const m = l.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/);
  if (m) { const y = today0().getFullYear(); const d = new Date(y, MONTHS.findIndex((x) => x.toLowerCase() === m[1]), +m[2]); return iso(d); }
  const r = l.match(/in (\d+) days?/); if (r) return D(+r[1]);
  return null;
}
function parseTime(s) {
  const m = s.toLowerCase().match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (!m) return /\bnoon\b/i.test(s) ? '12:00' : null;
  let h = +m[1] % 12; if (m[3] === 'pm') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
}
function findTxIn(s) {
  const l = s.toLowerCase();
  return S.tx.filter((t) => t.status !== 'archived').find((t) => {
    const a = txLabel(t).toLowerCase();
    return l.includes(a) || (t.address && l.includes(t.address.toLowerCase().split(' ').slice(0, 2).join(' '))) || (clientName(t) && l.includes(clientName(t).toLowerCase().replace(/^the /, '')));
  });
}
function findClientIn(s) { const l = s.toLowerCase(); return S.clients.find((c) => l.includes(c.name.toLowerCase().replace(/^the /, '')) || l.includes(c.name.split(' ')[0].toLowerCase() + ' ') && c.name.split(' ').length > 1 && l.includes(c.name.split(' ')[1].toLowerCase())); }

const Sofia = {
  /** returns array of sofia messages; may set chat.pending */
  reply(chat, textIn) {
    const s = spokenNumbers(textIn.trim());
    const l = s.toLowerCase();
    const agent = S.session.mode !== 'ask';
    const scopeTx = chat.txId && txOf(chat.txId);
    const tx = findTxIn(s) || scopeTx;
    const out = [];
    const say = (text, extra = {}) => out.push({ role: 'sofia', text, ...extra });
    const askOnly = (what) => say(`I'm in **Ask** mode, so I won't change anything. Switch to **Agent** and I'll ${what}.`, { chips: ['Switch to Agent'] });

    if (/^switch to agent$/i.test(s)) { S.session.mode = 'agent'; say('Agent mode is on. I can create transactions, fill forms and prepare envelopes — nothing is saved or sent until you approve it.'); return out; }
    if (/^switch to ask$/i.test(s)) { S.session.mode = 'ask'; say('Ask mode is on. I will only read and answer.'); return out; }

    // --- pending question from a previous turn (e.g. property address)
    if (chat.pending && chat.pending.intent === 'create-tx' && !chat.pending.data.address) {
      const m = s.match(ADDR_RE);
      if (m) { chat.pending.data.address = titleCase(m[1]); return this.proposeCreate(chat, chat.pending.data, out, `I heard **${chat.pending.data.address}**. Here's the transaction. I'll create it once you approve.`); }
    }

    // --- create a transaction / offer
    if (/\b(start|create|open|new|set up)\b.*\b(offer|transaction|listing|deal)\b|^start a new transaction/i.test(s)) {
      const m = s.match(ADDR_RE);
      const who = s.match(/\b(?:buyer|seller|client) is ([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?)/) || s.match(/\bfor (?:the )?([A-Z][\w'-]+(?:\s+(?:family|[A-Z][\w'-]+))?)\b/);
      const existing = m && S.tx.find((t) => t.address && t.address.toLowerCase() === titleCase(m[1]).toLowerCase());
      if (existing) { say(`**${txLabel(existing)}** already exists (${existing.phase}, ${clientName(existing) || 'no client'}). Want me to open it?`, { actions: [['Open transaction', '#/tx/' + existing.id]] }); return out; }
      if (!agent) { askOnly('set up the transaction, link the client and queue the forms'); return out; }
      const data = { address: m ? titleCase(m[1]) : '', side: /\bseller|listing\b/i.test(s) ? 'Seller' : 'Buyer', clientName: who ? who[1].replace(/^(the|an?)$/i, '') : '', city: /irvine/i.test(s) ? 'Irvine' : '' };
      if (data.clientName && /^(a|an|the|my|this)$/i.test(data.clientName)) data.clientName = '';
      if (!data.address) {
        chat.pending = { intent: 'create-tx', data };
        say(`Sure. ${data.clientName ? `I'll link **${data.clientName}** as the ${data.side.toLowerCase()}. ` : ''}What's the property address?`, { chips: ['It’s a prospect — no address yet'] });
        return out;
      }
      return this.proposeCreate(chat, data, out, 'Here is the transaction I will set up. Approve and I will create it and queue the forms from the template.');
    }
    if (chat.pending && /prospect|no address/i.test(s)) { const d = chat.pending.data; d.address = ''; d.phase = 'Prospect'; return this.proposeCreate(chat, d, out, 'Got it — I will set it up as a prospect.'); }

    // --- follow-ups
    if (/follow.?up|check.?in|who should i (call|text|contact)/i.test(s)) {
      const due = S.followUps.filter((f) => !f.done && diffDays(f.due) <= 7).sort((a, b) => a.due.localeCompare(b.due));
      const over = due.filter((f) => diffDays(f.due) < 0);
      const drafts = due.filter((f) => f.draft);
      say(due.length ? `${due.length} follow-up${due.length > 1 ? 's are' : ' is'} due this week${over.length ? `, ${over.length} overdue` : ''}:\n${due.slice(0, 6).map((f) => `• **${f.name}** — ${f.title} (${diffDays(f.due) < 0 ? `overdue ${-diffDays(f.due)}d` : relWhen(f.due, f.time)})`).join('\n')}${drafts.length ? `\n\nI already drafted messages for ${drafts.map((f) => f.name).join(' and ')}.` : ''}` : 'Nobody is due for a follow-up this week. 🎉', { actions: [['Open follow-ups', '#/follow-ups']], chips: drafts.length ? [`Send the draft to ${drafts[0].name}`] : [] });
      return out;
    }
    if (/^send the draft to (.+)$/i.test(s)) {
      const name = s.match(/^send the draft to (.+)$/i)[1];
      const f = S.followUps.find((x) => !x.done && x.draft && x.name.toLowerCase() === name.toLowerCase());
      if (!f) { say(`I can't find a draft for ${name}.`); return out; }
      if (!agent) { askOnly(`send the ${f.draft.channel.toLowerCase()} to ${f.name}`); return out; }
      say(`Here's the ${f.draft.channel.toLowerCase()} for **${f.name}**. I'll send it once you approve.`, { card: { kind: 'message', title: `Send ${f.draft.channel.toLowerCase()} to ${f.name}`, tag: f.draft.channel, rows: [['To', '', f.name], ['Message', '', f.draft.text]], data: { followUpId: f.id } } });
      return out;
    }

    // --- compliance / checklist / missing
    if (/missing|compliance|checklist|required/i.test(s)) {
      const txs = tx ? [tx] : S.tx.filter((t) => t.status === 'current' || t.status === 'pending');
      const lines = [];
      txs.forEach((t) => {
        const open = S.checklist.filter((c) => c.txId === t.id && !c.done);
        const blanks = S.docs.filter((d) => d.txId === t.id && d.status === 'draft');
        if (open.length || blanks.length) lines.push(`• **${txLabel(t)}** — ${[...open.map((c) => c.title + (c.code ? ` (${c.code})` : '')), ...blanks.map((d) => `${d.code} draft ${d.progress}%`)].join(', ')}`);
      });
      say(lines.length ? `Here's what's still open for compliance:\n${lines.join('\n')}` : 'Every required item is in. Nothing is missing for compliance.', { actions: tx ? [['Open checklist', `#/tx/${tx.id}/checklist`]] : [['Open transactions', '#/transactions?tab=current']] });
      return out;
    }

    // --- city / county updates
    if (/city|county|pull the rest from the listing|from the listing/i.test(s) && tx) {
      const cityM = s.match(/city(?: of| is|:)?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/) || s.match(/in ([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),/);
      const countyM = s.match(/([A-Z][a-z]+) county/i) || s.match(/county(?: is|:)?\s+([A-Z][a-z]+)/);
      const city = cityM ? cityM[1] : tx.city || (tx.id === 't1' ? 'Irvine' : '');
      const county = countyM ? titleCase(countyM[1]) : tx.county || 'Orange';
      if (!agent) { say(`From the listing, ${txLabel(tx)} is in **${city || 'an unknown city'}**, **${county} County**.`); askOnly('fill those in'); return out; }
      const rows = [];
      if (city && city !== tx.city) rows.push(['City', tx.city || 'Empty', city]);
      if (county && county !== tx.county) rows.push(['County', tx.county || 'Empty', county]);
      if (/listing/i.test(s) && !tx.price) rows.push(['List price', 'Empty', '$1,195,000']);
      if (!rows.length) { say(`City and county are already set on ${txLabel(tx)} (${tx.city}, ${tx.county} County).`); return out; }
      say(`${/listing/i.test(s) ? 'I pulled these from the MLS listing' : 'Here are the changes'}. I'll save them once you approve.`, { card: { kind: 'update', title: 'Update transaction details', tag: 'Field update', rows, fills: this.fillsFor(tx), data: { txId: tx.id, set: Object.fromEntries(rows.map(([f, , v]) => [f === 'City' ? 'city' : f === 'County' ? 'county' : 'price', f === 'List price' ? 1195000 : v])) } }, chips: ['What’s still missing?'] });
      return out;
    }

    // --- offer expiration / counter
    if (/counter/i.test(s)) {
      const t = tx || txOf('t1');
      say(`Lena Brooks (listing agent) countered **${txLabel(t)}** at **${money(t.counter || 1265000)}** and asked to extend the offer window to ${WD_L[pd(D(1)).getDay()]} 5 PM. Maria is pre-approved to $1.3M, so the counter is inside her range.`, { chips: [`Move offer expiration to ${WD[pd(D(1)).getDay()]} 5 PM`, 'Draft a text to Maria about the counter'] });
      return out;
    }
    if (/(move|extend|change|set).*(offer )?expir/i.test(s)) {
      const t = tx || txOf('t1');
      const due = parseDue(s) || D(1); const time = parseTime(s) || '17:00';
      if (!agent) { askOnly('move the offer expiration'); return out; }
      const cur = S.tasks.find((w) => w.txId === t.id && /offer expires/i.test(w.title));
      say('This changes a contract date, so it needs your confirmation.', { card: { kind: 'expiry', title: 'Change offer expiration', tag: 'Contract change', rows: [['Offer expiration', cur && cur.due ? relWhen(cur.due, cur.time) : 'Not set', relWhen(due, time)]], data: { txId: t.id, date: due, time } } });
      return out;
    }

    // --- RPA / form completion
    if (/\b(rpa|finish|fill|complete)\b.*\b(form|rpa|blanks?)?/i.test(s) && /rpa|form|blank|finish/i.test(s)) {
      const t = tx || txOf('t1');
      const d = S.docs.find((x) => x.txId === t.id && x.code === 'RPA') || S.docs.find((x) => x.txId === t.id && x.status === 'draft');
      if (!d) { say(`${txLabel(t)} has no draft forms right now.`, { actions: [['Add a form', '#/forms']] }); return out; }
      const missing = [!t.city && 'city', !t.county && 'county', !S.tasks.some((w) => w.txId === t.id && /offer expires/i.test(w.title) && w.due) && 'offer expiration'].filter(Boolean);
      say(`The ${d.code} for **${txLabel(t)}** is ${d.progress || 0}% done.${missing.length ? ` Still blank: ${missing.join(', ')}.` : ' All required fields are filled — only initials and signatures are left.'} ${missing.length ? 'Want me to fill them from the listing?' : ''}`, { actions: [['Open form editor', `#/form/${t.id}/${d.code}`]], chips: missing.length ? ['Also set city and county', 'Pull the rest from the listing'] : ['Send it for signature'] });
      chat.txId = chat.txId || t.id;
      return out;
    }
    if (/send .*for signature|send it for signature/i.test(s)) {
      const t = tx || txOf(S.lastTx);
      say(`I'll prepare the envelope for **${txLabel(t)}**. Review the recipients and routing, then send.`, { actions: [['Review envelope', `#/send/${t.id}`]] });
      return out;
    }
    if (/remind.*sign|nudge/i.test(s)) {
      const env = S.envelopes.find((e) => e.status === 'out' && (!tx || e.txId === tx.id));
      if (!env) { say('There are no envelopes waiting on signatures.'); return out; }
      if (!agent) { askOnly('send the reminder'); return out; }
      const waiting = env.recipients.filter((r) => r.status !== 'Signed');
      say(`${waiting.length} signer${waiting.length > 1 ? 's haven\'t' : ' hasn\'t'} signed the ${env.code} yet.`, { card: { kind: 'remind', title: `Remind ${env.code} signers`, tag: 'Signing chaser', rows: waiting.map((r) => [r.name, r.status, 'Reminder email']), data: { envId: env.id } } });
      return out;
    }

    // --- drafts
    const draftM = s.match(/(?:draft|write|send)\s+(?:a|an)?\s*(text|sms|email|message)\s+to\s+(.+?)(?:\s+about\s+(.+))?$/i);
    if (draftM) {
      const c = findClientIn(draftM[2]) || { name: titleCase(draftM[2]) };
      const about = draftM[3] || (tx ? `${txLabel(tx)}` : 'next steps');
      const ch = /email/i.test(draftM[1]) ? 'Email' : 'SMS';
      const body = /counter/i.test(about) ? `Hi ${c.name.split(' ')[0]}, the seller countered at ${money((tx || txOf('t1')).counter || 1265000)} and asked to extend the offer to ${WD_L[pd(D(1)).getDay()]} 5 PM. Do you have 10 minutes to talk it through today?` : `Hi ${c.name.split(' ')[0]}, quick update on ${about}. Do you have a few minutes to connect today?`;
      if (!agent) { say(`Here's a draft you can copy:\n\n“${body}”`); return out; }
      say(`Here's a draft. I'll send it once you approve — you can edit it first.`, { card: { kind: 'message', title: `Send ${ch === 'SMS' ? 'text' : 'email'} to ${c.name}`, tag: ch, rows: [['To', '', c.name], ['Message', '', body]], data: { clientId: c.id, name: c.name, channel: ch, text: body, txId: tx && tx.id } } });
      return out;
    }

    // --- tasks / reminders
    const taskM = s.match(/(?:remind me to|add (?:a )?(?:task|to-?do)(?: to)?|create (?:a )?task(?: to)?|todo:?)\s+(.+)/i);
    if (taskM) {
      let title = taskM[1].replace(/\b(today|tomorrow|next week|on \w+day|by \w+day|at \d.*|in \d+ days?)\b.*$/i, '').trim();
      title = title.charAt(0).toUpperCase() + title.slice(1);
      const due = parseDue(s) || D(0); const time = parseTime(s);
      if (!agent) { askOnly('add it to your Agenda'); return out; }
      say('I\'ll add this to your Agenda once you approve.', { card: { kind: 'task', title: 'Add work item', tag: 'To-do', rows: [['Title', '', title], ['Due', '', relWhen(due, time)], ['Transaction', '', tx ? txLabel(tx) : 'None']], data: { title, due, time, txId: tx && tx.id, type: /call|text|email|follow/i.test(title) ? 'Follow-up' : 'To-do' } } });
      return out;
    }
    const evM = s.match(/(?:schedule|book|set up|add)\s+(?:a|an)?\s*(call|meeting|showing|inspection|appraisal|walkthrough|open house)(.*)/i);
    if (evM) {
      const type = titleCase(evM[1]).replace('Call', 'Call');
      const date = parseDue(s) || D(1); const start = parseTime(s) || '10:00';
      const c = findClientIn(s);
      const title = `${type}${c ? ' with ' + c.name : tx ? ' · ' + txLabel(tx) : ''}`;
      if (!agent) { askOnly('put it on your calendar'); return out; }
      const [h, m] = start.split(':').map(Number); const end = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      say('Here is the event. Approve and I\'ll add it to your calendar (and Google Calendar).', { card: { kind: 'event', title: 'Add event', tag: type, rows: [['Title', '', title], ['When', '', `${wdDate(date)} · ${fmtTime(start)}–${fmtTime(end)}`], ['Transaction', '', tx ? txLabel(tx) : 'None']], data: { title, type: EVENT_TYPES.includes(type) ? type : 'Meeting', date, start, end, txId: tx && tx.id, people: c ? [c.name] : [] } } });
      return out;
    }

    // --- today / what's due
    if (/today|due|deadline|agenda|schedule|what('s| is) (next|up)|priorit|morning|brief/i.test(s)) {
      const needs = S.tasks.filter((w) => w.needsYou && w.status !== 'done');
      const evs = todayEvents();
      say(`**${needs.length} thing${needs.length === 1 ? '' : 's'} need you:**\n${needs.slice(0, 6).map((w) => `• ${w.title}${w.txId ? ' — ' + txLabel(txOf(w.txId)) : ''} (${w.status === 'blocked' ? 'blocked' : relWhen(w.due, w.time)})`).join('\n')}\n\n**Today:** ${evs.length ? evs.map((e) => `${fmtTime(e.start)} ${e.title}`).join(' · ') : 'nothing scheduled'}.`, { actions: [['Open Agenda', '#/agenda']] });
      return out;
    }

    // --- transaction status question
    if (tx && /status|how is|where are we|summary|update on|tell me about/i.test(s) || (tx && findTxIn(s) && s.split(' ').length < 6)) {
      const nu = nextUp(tx); const kd = nextKeyDate(tx); const cl = checklistStats(tx.id); const sg = signingInfo(tx);
      say(`**${txLabel(tx)}** — ${tx.side} side, ${tx.phase}${clientName(tx) ? ', client ' + clientName(tx) : ''}.\n• Next up: ${nu ? nu.title : 'nothing open'}\n• Key date: ${kd ? `${kd.title} ${relWhen(kd.due, kd.time)}` : 'none set'}\n• Checklist: ${cl.done}/${cl.total}\n• Signing: ${sg ? sg.label : 'no envelopes out'}${tx.blocked ? `\n• ⚠ Blocked: ${tx.blocked}` : ''}`, { actions: [['Open transaction', '#/tx/' + tx.id]] });
      return out;
    }

    if (/template.*closed|build .*template/i.test(s)) {
      const closed = S.tx.filter((t) => t.status === 'closed');
      say(`I can build a template from any of your ${closed.length} closed transactions — I'll keep the forms that got used and the tasks you actually did. Which one? For example **${txLabel(closed[0])}**.`, { actions: [['Open templates', '#/templates']] });
      return out;
    }
    if (/routine/i.test(s)) { say('Routines are my background jobs. You can turn each one on or off, or ask me to suggest a new one — for example “every Friday, send clients under contract a status text”.', { actions: [['Open Sofia routines', '#/settings/routines']] }); return out; }
    if (/^(hi|hello|hey)\b/i.test(s)) { say(`Hi ${S.user.first}! What should we work on?`, { chips: this.defaultChips() }); return out; }
    if (/thank/i.test(s)) { say('Anytime.'); return out; }

    say(`I can help with that. Here's what I can do right now:\n• start a transaction (“Start an offer for 12 Pine Street, buyer is Jordan Lee”)\n• fill forms and move contract dates\n• add tasks and events (“Remind me to order HOA docs Friday”)\n• draft texts and emails to clients\n• check compliance and follow-ups`, { chips: this.defaultChips() });
    return out;
  },
  defaultChips() { return ['What’s due today?', 'Who should I follow up with?', 'What’s missing for compliance?']; },
  fillsFor(t) { return S.docs.filter((d) => d.txId === t.id && d.source === 'Form').map((d) => d.code).filter(Boolean).slice(0, 4); },
  proposeCreate(chat, data, out, lead) {
    const tpl = data.side === 'Seller' ? 'seller-listing' : 'buyer-standard';
    const t = byId('templates', tpl);
    out.push({ role: 'sofia', text: lead, card: { kind: 'create-tx', title: 'Create transaction', tag: 'New transaction', rows: [['Property address', '', data.address || '— (prospect)'], ['Client', '', data.clientName || '—'], ['Side', '', data.side], ['Template', '', t.name]], fills: t.forms.slice(0, 3), data: { ...data, template: tpl } } });
    chat.pending = null;
    return out;
  },
  /** apply an approval card */
  apply(card, chat) {
    const d = card.data;
    switch (card.kind) {
      case 'create-tx': {
        const existing = S.clients.find((c) => d.clientName && c.name.toLowerCase() === d.clientName.toLowerCase());
        const id = Tx.create({ address: d.address, city: d.city, side: d.side, client: existing ? existing.id : '', newClient: existing ? '' : d.clientName, phase: d.phase || (d.address ? 'Offer Prep' : 'Prospect'), template: d.template });
        chat.txId = id; card.result = { txId: id };
        const t = txOf(id);
        if (chat.title === 'New chat') chat.title = `${txLabel(t)} — ${t.phase.toLowerCase()}`;
        return { receipt: `Created transaction · linked ${clientName(t) || 'no client'} · queued ${S.docs.filter((x) => x.txId === id).length} forms`, text: `Done. **${txLabel(t)}** is set up${clientName(t) ? ` with ${clientName(t)} as the ${t.side.toLowerCase()}` : ''}, and I queued the forms from “${byId('templates', d.template).name}”.`, actions: [['Open transaction', '#/tx/' + id]], chips: t.city ? ['Fill the RPA'] : ['Also set city and county'] };
      }
      case 'update': {
        const t = txOf(d.txId);
        Object.assign(t, d.set);
        const doc = S.docs.find((x) => x.txId === t.id && x.code === 'RPA');
        if (doc && doc.status === 'draft') doc.progress = Math.min(95, doc.progress + 8 * Object.keys(d.set).length);
        const w = S.tasks.find((x) => x.txId === t.id && /RPA blanks/.test(x.title));
        if (w) { const left = [!t.city, !t.county, !S.tasks.some((x) => x.txId === t.id && /offer expires/i.test(x.title) && x.due)].filter(Boolean).length; if (!left) w.status = 'done'; else { w.title = `Fill ${left} RPA blank${left > 1 ? 's' : ''}`; } }
        logActivity(t.id, `Sofia updated ${Object.keys(d.set).join(', ')} (approved by you)`, 'update');
        return { receipt: `Updated ${Object.keys(d.set).join(', ')} · ${txLabel(t)}`, text: 'Saved. I also filled those fields on the forms.' };
      }
      case 'expiry': {
        const t = txOf(d.txId);
        let w = S.tasks.find((x) => x.txId === t.id && /offer expires/i.test(x.title));
        if (!w) { w = { id: uid('w'), txId: t.id, title: 'Offer expires', type: 'Contract deadline', contract: true, keyDate: true, status: 'todo', needsYou: true }; S.tasks.push(w); }
        w.due = d.date; w.time = d.time;
        const ev = S.events.find((e) => e.txId === t.id && /offer expires/i.test(e.title)); if (ev) { ev.date = d.date; ev.start = d.time; ev.end = d.time; }
        t.keyDate = d.date; t.keyTime = d.time;
        logActivity(t.id, `Offer expiration moved to ${wdDate(d.date)} ${fmtTime(d.time)}`, 'contract');
        return { receipt: `Offer expiration → ${relWhen(d.date, d.time)}`, text: 'Done. I moved the offer expiration and updated the calendar. The counter still needs signatures before it’s binding.' };
      }
      case 'task': {
        const w = { id: uid('w'), txId: d.txId || null, title: d.title, type: d.type || 'To-do', due: d.due, time: d.time, status: 'todo', priority: 'Medium' };
        S.tasks.push(w); logActivity(w.txId, `Task added: ${w.title}`);
        return { receipt: `Added to Agenda · ${relWhen(d.due, d.time)}`, text: `Added **${d.title}** to your Agenda.`, actions: [['Open Agenda', '#/agenda']] };
      }
      case 'event': {
        S.events.push({ id: uid('e'), ...d }); logActivity(d.txId, `Event scheduled: ${d.title}`);
        return { receipt: `Event added · ${wdDate(d.date)} ${fmtTime(d.start)}`, text: `**${d.title}** is on your calendar.`, actions: [['Open calendar', '#/agenda/calendar?d=' + d.date]] };
      }
      case 'remind': {
        const env = byId('envelopes', d.envId); env.lastReminder = new Date().toISOString();
        logActivity(env.txId, `Reminder sent to ${env.code} signers`, 'signing');
        return { receipt: `Reminder sent · ${env.code}`, text: 'Reminders are out. I\'ll let you know as soon as someone signs.' };
      }
      case 'message': {
        const text = (card.rows.find((r) => r[0] === 'Message') || [])[2] || d.text;
        if (d.followUpId) { const f = byId('followUps', d.followUpId); f.done = true; f.doneAt = D(0); const c = f.clientId && byId('clients', f.clientId); if (c) c.lastTouch = D(0); if (f.txId) S.messages.push({ id: uid('m'), txId: f.txId, day: D(0), time: fmtTimeFull(new Date().toTimeString().slice(0, 5)), from: `${S.user.first} ${S.user.last}`, role: 'You', channel: f.draft.channel === 'Text' ? 'SMS' : 'Email', body: text }); return { receipt: `Sent to ${f.name}`, text: `Sent. I marked the follow-up with ${f.name} as done.` }; }
        const c = d.clientId && byId('clients', d.clientId); if (c) { c.lastTouch = D(0); c.timeline.unshift([D(0), `${d.channel} sent: ${text.slice(0, 60)}…`]); }
        if (d.txId) S.messages.push({ id: uid('m'), txId: d.txId, day: D(0), time: fmtTimeFull(new Date().toTimeString().slice(0, 5)), from: `${S.user.first} ${S.user.last}`, role: 'You', channel: d.channel, body: text });
        return { receipt: `${d.channel} sent to ${d.name}`, text: `Sent to ${d.name}.${d.txId ? ' It’s logged in the Communication log.' : ''}` };
      }
    }
    return { text: 'Done.' };
  },
  applySuggestions() {
    const items = S.suggestions.items.filter((i) => i.checked);
    commit((s) => {
      items.forEach((it) => {
        const p = it.payload;
        if (it.kind === 'event') s.events.push({ id: uid('e'), ...p });
        if (it.kind === 'task') s.tasks.push({ id: uid('w'), status: 'todo', priority: 'Medium', ...p });
        if (it.kind === 'contract') Sofia.apply({ kind: 'expiry', data: p }, {});
      });
      s.suggestions.items = s.suggestions.items.filter((i) => !i.checked);
    });
    return items.length;
  },
  runScan() {
    const t = S.tx.find((x) => x.status === 'current' && x.phase !== 'Prospect');
    commit((s) => {
      s.suggestions.source = `Morning scan · ${fmtTimeFull(new Date().toTimeString().slice(0, 5))}`;
      s.suggestions.items = [
        { id: uid('s'), title: `Check in with ${clientName(t) || 'your client'}`, meta: `Follow-up · ${txLabel(t)} · tomorrow`, kind: 'task', checked: true, payload: { title: `Check in with ${clientName(t)}`, type: 'Follow-up', due: D(1), txId: t.id } },
        { id: uid('s'), title: 'Prospecting block', meta: `Event · ${wdDate(D(1))} · 8 AM`, kind: 'event', checked: true, payload: { title: 'Prospecting block', type: 'Time block', date: D(1), start: '08:00', end: '09:00' } },
      ];
    });
    toast('Sofia found 2 suggestions');
  },
};

/** Chat screen + chat list */
const Chats = {
  create(q = {}) {
    const t = q.tx && txOf(q.tx);
    const c = { id: uid('ch'), title: 'New chat', txId: t ? t.id : null, updated: new Date().toISOString(), messages: [] };
    S.chats.unshift(c); saveDB();
    if (q.q) setTimeout(() => this.send(c.id, q.q), 50);
    return c.id;
  },
  startFrom(textIn, opts = {}) {
    const t = opts.tx || (Router.current && Router.current.params && Router.current.params.id && txOf(Router.current.params.id) ? Router.current.params.id : null) || (findTxIn(textIn) || {}).id || null;
    const c = { id: uid('ch'), title: textIn.length > 44 ? textIn.slice(0, 42).trim() + '…' : textIn, txId: t, updated: new Date().toISOString(), messages: [] };
    S.chats.unshift(c); saveDB();
    Router.go('#/chat/' + c.id);
    setTimeout(() => this.send(c.id, textIn, opts), 30);
  },
  send(chatId, textIn, opts = {}) {
    const chat = byId('chats', chatId); if (!chat || !textIn.trim()) return;
    chat.messages.push({ role: 'user', text: textIn.trim(), voice: !!opts.voice });
    if (chat.title === 'New chat') chat.title = textIn.length > 44 ? textIn.slice(0, 42).trim() + '…' : textIn;
    chat.updated = new Date().toISOString();
    chat.typing = true;
    chat.typingAt = Date.now();
    saveDB(); this.rerender(chatId);
    setTimeout(() => {
      chat.typing = false;
      delete chat.typingAt;
      const res = Sofia.reply(chat, textIn);
      if (!chat.txId) { const t = findTxIn(textIn); if (t) chat.txId = t.id; }
      res.forEach((m) => chat.messages.push(m));
      chat.updated = new Date().toISOString();
      saveDB(); this.rerender(chatId);
    }, 2400);
  },
  rerender(chatId) { if (Router.current && Router.current.screen === 'chat' && Router.current.params.chat === chatId) Router.refresh(); },
  seedDesigned(chat) {
    if (chat.messages.length || !chat.designed) return;
    chat.messages = [
      { role: 'user', text: 'Start an offer for 123 ABC Street. The buyer is Maria Tran.' },
      { role: 'sofia', receipt: 'Created transaction · linked Maria Tran · queued 3 forms', text: "Done. The transaction is set up, Maria is linked as the buyer, and I've queued the RPA, the AD and the BIA. What's the property address?" },
      { role: 'user', text: 'The address is one two three ABC Street.', voice: true },
      { role: 'sofia', text: "I heard **123 ABC Street**. Here's the change. I'll save it once you approve.", card: { kind: 'update', title: 'Update transaction details', tag: 'Field update', rows: [['Property address', 'Empty', '123 ABC Street']], fills: ['RPA', 'AD', 'BIA'], data: { txId: 't1', set: { address: '123 ABC Street' } } }, chips: ['Also set city and county', 'Pull the rest from the listing'] },
    ];
  },
  ctrl(app, chatId) {
    const chat = byId('chats', chatId);
    this.seedDesigned(chat);
    const main = $('main', app);
    const header = main.children[0];
    const thread = main.children[1].children[0];
    const composer = main.children[2];
    const ctxPanel = $('aside[aria-label="Transaction context"]', app);
    const t = chat.txId && txOf(chat.txId);
    // header
    const titleEl = header.children[0].children[0]; titleEl.textContent = chat.title;
    onClick(titleEl, () => this.rename(chat));
    const scopeBtn = header.children[0].children[1];
    setOwn(scopeBtn, t ? `Scoped to ${txLabel(t)}` : 'Entire organization');
    if (!t) { const dot = $('span', scopeBtn); if (dot) dot.style.background = '#94A3B8'; }
    onClick(scopeBtn, () => openMenu(scopeBtn, [{ label: 'Entire organization', checked: !t, onClick: () => commit(() => (chat.txId = null)) }, '-', ...S.tx.filter((x) => x.status === 'current' || x.status === 'pending').map((x) => ({ label: txLabel(x), checked: t && t.id === x.id, onClick: () => commit(() => (chat.txId = x.id)) }))], { width: 260 }));
    onClick(byText(header, 'Share', { sel: 'button' }), () => { try { navigator.clipboard.writeText(location.href).catch(() => {}); } catch (e) { /* ignore */ } toast('Link to this chat copied'); });
    onClick($('[aria-label="More options"]', header), (e, b) => openMenu(b, [
      { label: 'Rename chat', onClick: () => this.rename(chat) },
      { label: 'All chats', onClick: () => this.openAll() },
      '-',
      { label: 'Delete chat', danger: true, onClick: () => { commit((s) => (s.chats = s.chats.filter((c) => c.id !== chat.id)), { rerender: false }); Router.go('#/home'); toast('Chat deleted'); } },
    ], { align: 'right' }));
    // thread
    this.renderThread(thread, chat);
    requestAnimationFrame(() => { const sc = main.children[1]; sc.scrollTop = sc.scrollHeight; });
    // The conversation and composer provide enough direction; don't append
    // suggested next prompts below Sofia's answer.
    const chipRow = composer.children[0].children[0];
    chipRow.innerHTML = '';
    // composer
    const box = composer.children[0].children[1];
    const ta = $('textarea', box); ta.dataset.nopersist = '1';
    const draftKey = 'draft:' + chat.id; ta.value = S.ui[draftKey] || '';
    ta.addEventListener('input', () => { S.ui[draftKey] = ta.value; saveDB(); });
    const send = () => { const v = ta.value.trim(); if (!v) return; S.ui[draftKey] = ''; ta.value = ''; this.send(chat.id, v); };
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    onClick($('button[aria-label=Send]', box), send);
    onClick($('[aria-label="Talk to Sofia"]', box), () => Voice.open((v) => this.send(chat.id, v, { voice: true })));
    const filesLbl = byText(box, 'Files go to 123 ABC Street'); if (filesLbl) filesLbl.textContent = t ? `Files go to ${txLabel(t)}` : 'Files stay in this chat';
    onClick($('[aria-label="Attach documents"]', box), () => pickFiles((files) => { if (t) { commit(() => fileDocs(t.id, files, 'Attached in chat')); } chat.messages.push({ role: 'user', text: `📎 ${files.map((f) => f.name).join(', ')}` }); chat.messages.push({ role: 'sofia', text: t ? `Filed ${files.length} document${files.length > 1 ? 's' : ''} to **${txLabel(t)}**.` : 'Got the files. Scope this chat to a transaction and I\'ll file them there.', actions: t ? [['View documents', `#/tx/${t.id}/documents`]] : [] }); saveDB(); this.rerender(chat.id); }));
    ModeToggle.bind(box);
    // context panel
    this.renderContext(ctxPanel, chat, t);
  },
  renderThread(thread, chat) {
    const P = {
      user: thread.children[0].cloneNode(true),
      userVoice: thread.children[2].cloneNode(true),
      sofia: thread.children[1].cloneNode(true),
      card: thread.children[3].children[1].children[1].cloneNode(true),
      p: thread.children[1].children[1].children[1].cloneNode(true),
      receipt: thread.children[1].children[1].children[0].cloneNode(true),
    };
    thread.innerHTML = '';
    if (!chat.messages.length) {
      const m = P.sofia.cloneNode(true); const body = m.children[1]; body.innerHTML = '';
      m.classList.add('msg-s'); body.classList.add('bd');
      const p = P.p.cloneNode(true); p.innerHTML = md(`Hi ${S.user.first}, what should we work on? Ask me anything about your transactions, or tell me what to do — for example “Start an offer for 12 Pine Street, buyer is Jordan Lee.”`); body.appendChild(p);
      thread.appendChild(m);
    }
    chat.messages.forEach((msg, idx) => {
      if (msg.role === 'user') {
        const el = (msg.voice ? P.userVoice : P.user).cloneNode(true);
        el.classList.add('msg-u');
        (msg.voice ? el.children[0] : el).textContent = msg.text;
        thread.appendChild(el); return;
      }
      const el = P.sofia.cloneNode(true); const body = el.children[1]; body.innerHTML = '';
      el.classList.add('msg-s'); body.classList.add('bd');
      if (msg.receipt) { const r = P.receipt.cloneNode(true); setOwn(r, msg.receipt); body.appendChild(r); onClick(r, () => { if (chat.txId) Router.go('#/tx/' + chat.txId + '/activity'); }); }
      if (msg.text) { const p = P.p.cloneNode(true); p.innerHTML = md(msg.text); body.appendChild(p); }
      if (msg.card) body.appendChild(this.cardEl(P.card, msg.card, chat, idx));
      if (msg.actions && msg.actions.length) body.appendChild(html(`<div class="msg-acts">${msg.actions.map(([l, h]) => `<a class="chip-link" href="${h}">${esc(l)} ${ICON.chev}</a>`).join('')}</div>`));
      thread.appendChild(el);
    });
    if (chat.typing) {
      const startedAt = chat.typingAt || Date.now();
      const thinking = html(`
        <div class="sofia-thinking" role="status" aria-live="polite" aria-label="Sofia is thinking">
          <span class="sofia-thinking-mark" aria-hidden="true">
            <svg viewBox="32 32 128 128" focusable="false">
              <defs>
                <linearGradient id="zipq-thinking-sweep" gradientUnits="userSpaceOnUse" x1="32" y1="32" x2="160" y2="32">
                  <stop offset="0" stop-color="currentColor"/>
                  <stop offset=".4" stop-color="#FA70AB"/>
                  <stop offset=".5" stop-color="#924FF7"/>
                  <stop offset=".6" stop-color="#FA70AB"/>
                  <stop offset="1" stop-color="currentColor"/>
                  <animateTransform class="sofia-thinking-sweep" attributeName="gradientTransform" type="translate" from="-128 0" to="128 0" dur="1.8s" repeatCount="indefinite"/>
                </linearGradient>
              </defs>
              <g class="zipq-thinking-path" fill="url(#zipq-thinking-sweep)">
                <path d="M88.6332 94.337H89.3283V94.313L88.753 93.7618L59.6816 64.6904L59.6097 64.5945L56.0626 61.0714L59.6816 57.4285L63.8997 53.2344H48.2256V75.9786V79.6215V83.2405V94.337H84.9902H88.6332Z"/>
                <path d="M89.3289 87.0512L91.8933 89.6156L92.3966 90.1189V48.0815V43.0965H103.469L92.3966 32L76.2911 48.0815L73.7267 50.67L71.1623 53.2344L63.3252 61.0714L89.3289 87.0512Z"/>
                <path d="M97.5254 84.9874V88.6063V89.3014L98.1007 88.7502L127.172 59.6788L127.244 59.6068L130.791 56.0597L134.41 59.6788L138.628 63.8969V48.2227H115.884H112.241H108.598H97.5254V84.9874Z"/>
                <path d="M159.863 92.3717L143.782 76.2902L141.193 73.7258L138.629 71.1614L130.792 63.3242L104.788 89.3279L102.224 91.8925L101.721 92.3717H143.782H148.767V103.468L159.863 92.3717Z"/>
                <path d="M103.228 97.5234H102.533L132.252 127.242L135.799 130.789L132.18 134.408L127.962 138.626H143.635V115.882V112.239V108.596V97.5234H106.871H103.228Z"/>
                <path d="M102.532 104.763L99.9674 102.198L99.4641 101.719V143.756V148.765H88.3916L99.4641 159.862L115.57 143.756L118.134 141.192L120.698 138.628L128.536 130.79L102.532 104.763Z"/>
                <path d="M44.7023 112.165L61.0714 128.535L69.316 120.29L87.0751 102.531L89.6395 99.9664L90.1428 99.4631H90.1189H43.0965V88.3906L32 99.4631L44.7023 112.165Z"/>
                <path d="M94.3361 106.845V103.226V102.531L64.6175 132.25L61.0705 135.797L53.2334 127.96V143.634H75.9776H79.6206H83.2395H94.3361V106.845Z"/>
              </g>
            </svg>
          </span>
          <span class="sofia-thinking-label">Thinking (1s)</span>
        </div>
      `);
      thread.appendChild(thinking);
      const label = $('.sofia-thinking-label', thinking);
      const updateElapsed = () => {
        if (!thinking.isConnected || !chat.typing) { clearInterval(timer); return; }
        label.textContent = `Thinking (${Math.max(1, Math.floor((Date.now() - startedAt) / 1000) + 1)}s)`;
      };
      const timer = setInterval(updateElapsed, 250);
      updateElapsed();
    }
  },
  cardEl(proto, card, chat, idx) {
    const c = proto.cloneNode(true);
    c.classList.add('act-card');
    const head = c.children[0];
    head.children[0].children[0].textContent = card.title;
    head.children[0].children[1].textContent = card.tag;
    const status = head.children[1];
    const st = card.state || 'pending';
    status.textContent = st === 'approved' ? 'Saved' : st === 'discarded' ? 'Discarded' : 'Waiting for you';
    if (st === 'approved') css(status, { background: '#E4F5EC', color: '#1F7A55' });
    if (st === 'discarded') css(status, { background: '#F1F5F9', color: '#64748B' });
    const colHead = c.children[1]; const rowProto = c.children[2];
    const noNow = card.rows.every((r) => !r[1]);
    if (noNow) {
      c.classList.add('act-card-simple');
      colHead.children[1].textContent = ''; colHead.children[2].textContent = ''; colHead.children[0].textContent = 'Detail';
      colHead.style.gridTemplateColumns = 'minmax(120px, 160px) minmax(0, 1fr)';
    }
    const fills = c.children[3]; const btns = c.children[4];
    rowProto.remove();
    card.rows.forEach((r, ri) => {
      const row = rowProto.cloneNode(true);
      row.children[0].textContent = r[0];
      row.children[1].textContent = r[1] || (noNow ? '' : '—');
      const after = row.children[2];
      if (r[0] === 'Message' && st === 'pending') {
        after.textContent = '';
        const ta = html(`<textarea class="input" rows="3" style="font-size:13.5px;min-width:260px" data-nopersist>${esc(r[2])}</textarea>`);
        ta.oninput = () => { card.rows[ri][2] = ta.value; saveDB(); };
        after.replaceWith(ta);
        row.style.gridTemplateColumns = row.style.gridTemplateColumns || '';
      } else after.textContent = r[2];
      if (noNow) {
        row.children[1].style.display = 'none';
        row.style.gridTemplateColumns = 'minmax(120px, 160px) minmax(0, 1fr)';
      }
      c.insertBefore(row, fills);
    });
    if (card.fills && card.fills.length) { const chipP = fills.children[0].cloneNode(true); [...fills.children].forEach((x) => x.remove()); card.fills.forEach((f) => { const x = chipP.cloneNode(true); x.textContent = f; fills.appendChild(x); }); } else fills.style.display = 'none';
    if (st !== 'pending') {
      const doneLabel = card.kind === 'message' || card.kind === 'remind' ? 'Confirmed and sent' : card.kind === 'create-tx' ? 'Confirmed and created' : card.kind === 'task' || card.kind === 'event' ? 'Confirmed and added' : 'Confirmed and saved';
      btns.innerHTML = st === 'approved' ? `<span style="font-size:13px;color:#1F7A55;display:flex;align-items:center;gap:6px">${ICON.check} ${doneLabel}</span>${card.result && card.result.txId ? `<a class="chip-link" style="margin-left:auto" href="#/tx/${card.result.txId}">Open transaction ${ICON.chev}</a>` : ''}` : '<span style="font-size:13px;color:#64748B">Declined — nothing was changed.</span>';
    } else {
      // One confirmation pattern for every consequential action in chat.
      // The preview above answers "what will change"; this footer asks for the decision.
      const questions = {
        'create-tx': 'Create this transaction?',
        update: 'Save these changes?',
        expiry: 'Apply this contract date change?',
        task: 'Add this work item?',
        event: 'Add this event?',
        remind: 'Send this reminder?',
        message: 'Send this message?',
      };
      const question = questions[card.kind] || 'Continue with this action?';
      btns.innerHTML = '';
      btns.classList.add('chat-confirm-wrap');
      const confirm = html(`
        <section class="chat-confirm" aria-label="Confirmation required">
          <div class="chat-confirm-head">
            <h3>${esc(question)}</h3>
            <button class="chat-confirm-toggle" type="button" aria-label="Collapse confirmation" aria-expanded="true">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>
            </button>
          </div>
          <div class="chat-confirm-body">
            <div class="chat-confirm-choices" role="group" aria-label="${esc(question)}">
              <button class="chat-confirm-yes" type="button">Yes</button>
              <button class="chat-confirm-no" type="button">No</button>
            </div>
            <form class="chat-confirm-reply">
              <button type="button" aria-label="Edit proposal" title="Edit proposal">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
              </button>
              <input data-nopersist aria-label="Reply with details" autocomplete="off" placeholder="Reply with details, or use Yes / No" />
              <button class="chat-confirm-send" type="submit" aria-label="Send details" disabled>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7M12 19V5"/></svg>
              </button>
            </form>
          </div>
        </section>
      `);
      btns.appendChild(confirm);
      const yes = $('.chat-confirm-yes', confirm);
      const no = $('.chat-confirm-no', confirm);
      const toggle = $('.chat-confirm-toggle', confirm);
      const body = $('.chat-confirm-body', confirm);
      const reply = $('.chat-confirm-reply', confirm);
      const input = $('input', reply);
      const sendDetails = $('.chat-confirm-send', reply);

      onClick(yes, () => {
        if (S.session.mode === 'ask') { toast('Switch to Agent mode to approve changes'); return; }
        const res = Sofia.apply(card, chat);
        card.state = 'approved';
        chat.messages.push({ role: 'sofia', receipt: res.receipt, text: res.text, actions: res.actions, chips: res.chips });
        chat.updated = new Date().toISOString();
        saveDB(); Router.refresh(); toast(res.receipt || 'Saved');
      });
      onClick(no, () => { card.state = 'discarded'; chat.messages.push({ role: 'sofia', text: 'OK, I discarded that. Nothing was changed.' }); saveDB(); Router.refresh(); });
      onClick($('[aria-label="Edit proposal"]', confirm), () => this.editCard(card));
      onClick(toggle, () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        toggle.setAttribute('aria-label', expanded ? 'Expand confirmation' : 'Collapse confirmation');
        body.hidden = expanded;
      });
      input.addEventListener('input', () => { sendDetails.disabled = !input.value.trim(); });
      reply.addEventListener('submit', (e) => {
        e.preventDefault();
        const details = input.value.trim();
        if (!details) return;
        this.send(chat.id, details);
      });
    }
    return c;
  },
  editCard(card) {
    const editable = card.rows.map((r, i) => ({ name: 'r' + i, label: r[0], value: r[2], type: r[0] === 'Message' ? 'textarea' : 'text' }));
    openForm({ title: 'Edit before saving', subtitle: card.title, fields: editable, submit: 'Update', onSubmit: (d) => {
      card.rows.forEach((r, i) => { r[2] = d['r' + i]; });
      const map = { 'Property address': 'address', City: 'city', County: 'county', Title: 'title', 'Client': 'clientName' };
      card.rows.forEach((r) => { const k = map[r[0]]; if (!k) return; if (card.kind === 'update') card.data.set[k] = r[2]; else card.data[k] = r[2]; });
      saveDB(); Router.refresh();
    } });
  },
  renderContext(panel, chat, t) {
    if (!panel) return;
    if (S.session.hideCtx) { panel.style.display = 'none'; const hdr = $('header', panel.parentElement); if (hdr && !$('[data-showctx]', hdr)) { const b = html('<button class="btn btn-sm" data-showctx>Show context</button>'); onClick(b, () => { S.session.hideCtx = false; saveDB(); Router.refresh(); }); hdr.children[1].prepend(b); } return; }
    onClick($('[aria-label="Close panel"]', panel), () => { S.session.hideCtx = true; saveDB(); Router.refresh(); });
    const body = panel.children[1];
    body.classList.add('chat-context-body');
    const open = $('a', panel.children[3]);
    if (!t) {
      body.innerHTML = `<div style="padding: 8px 2px; display: flex; flex-direction: column; gap: 12px;"><div style="font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">Entire organization</div><div style="font-size: 13.5px; color: #64748B; line-height: 1.5;">This chat isn't scoped to a transaction. Sofia reads across all ${S.tx.filter((x) => x.status === 'current').length} current transactions, your contacts and forms.</div>
        <div style="font-size: 11.5px; font-weight: 600; letter-spacing: .08em; color: #64748B; margin-top: 10px;">CURRENT TRANSACTIONS</div>${S.tx.filter((x) => x.status === 'current').slice(0, 6).map((x) => `<a href="#" data-scope="${x.id}" style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;font-size:13.5px;color:#020617;text-decoration:none;padding:4px 0"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(txLabel(x))}</span><span style="color:#64748B">${esc(x.phase)}</span></a>`).join('')}</div>`;
      $$('[data-scope]', body).forEach((a) => onClick(a, () => commit(() => (chat.txId = a.dataset.scope))));
      if (open) { open.textContent = 'Open transactions'; open.setAttribute('href', '#/transactions'); }
      return;
    }
    const head = body.children[0];
    head.classList.add('chat-context-summary');
    head.children[0].classList.add('chat-context-title');
    head.children[0].textContent = txLabel(t);
    const meta = head.children[1];
    meta.classList.add('chat-context-meta');
    const phase = meta.children[0];
    phase.classList.add('chat-context-phase');
    setOwn(phase, t.phase); phase.children[0].style.background = PHASE_COLOR[t.phase];
    let party = $('.chat-context-party', meta);
    if (!party) {
      party = document.createElement('span');
      party.className = 'chat-context-party';
      const source = [...meta.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim());
      if (source) source.replaceWith(party); else meta.appendChild(party);
    }
    party.textContent = `${t.side} side · ${clientName(t)}`;
    party.title = party.textContent;
    const alert = body.children[1];
    const kd = nextKeyDate(t);
    if (kd && diffDays(kd.due) >= 0 && diffDays(kd.due) <= 3) $('strong', alert).textContent = `${kd.title} ${relWhen(kd.due, kd.time).replace(/^Today/, 'today,').replace(/^Tomorrow/, 'tomorrow,')}`;
    else hide(alert);
    // forms
    const forms = body.children[2]; const fp = forms.children[1].cloneNode(true);
    forms.classList.add('chat-context-section');
    [...forms.children].slice(1).forEach((x) => x.remove());
    const docs = S.docs.filter((d) => d.txId === t.id && d.code && d.source !== 'Call').slice(0, 5);
    docs.forEach((d) => {
      const r = fp.cloneNode(true); r.children[0].textContent = d.code;
      const bar = r.children[1].children[0];
      let pct = d.progress || 0, lbl = `${pct}%`, col = '#0463CA';
      if (d.status === 'out') { const env = S.envelopes.find((e) => e.txId === t.id && e.code === d.code); const signed = env ? env.recipients.filter((x) => x.status === 'Signed').length : 0; pct = 100; lbl = `${signed}/${env ? env.recipients.length : 3} signed`; col = '#E0A100'; }
      if (d.status === 'signed') { pct = 100; lbl = 'Signed'; col = '#1F9D6B'; }
      if (d.status === 'not-started') { pct = 0; lbl = 'Not started'; }
      css(bar, { width: pct + '%', background: col }); r.children[2].textContent = lbl;
      forms.appendChild(r);
    });
    if (!docs.length) forms.appendChild(html('<div class="chat-context-empty">No forms yet.</div>'));
    // still needed
    const need = body.children[3];
    need.classList.add('chat-context-section');
    const missing = [!t.city && 'City', !t.county && 'County', t.side === 'Buyer' && t.phase === 'Offer Prep' && !S.tasks.some((w) => w.txId === t.id && /offer expires/i.test(w.title) && w.due) && 'Offer expiration', !t.address && 'Property address'].filter(Boolean);
    if (!missing.length) hide(need); else {
      const cp = need.children[1].children[0].cloneNode(true); need.children[1].innerHTML = '';
      missing.forEach((m) => { const x = cp.cloneNode(true); x.textContent = m; need.children[1].appendChild(x); });
    }
    // parties
    const parties = body.children[4]; const pp = parties.children[1].cloneNode(true);
    parties.classList.add('chat-context-section', 'chat-context-parties');
    [...parties.children].slice(1).forEach((x) => x.remove());
    (t.parties || []).slice(0, 4).forEach(([n, r]) => { const el = pp.cloneNode(true); el.children[0].textContent = initials(n); el.children[1].children[0].textContent = n; el.children[1].children[1].textContent = r.split(' · ')[0]; parties.appendChild(el); });
    if (open) open.setAttribute('href', '#/tx/' + t.id);
  },
  rename(chat) { openForm({ title: 'Rename chat', fields: [{ name: 'title', label: 'Title', value: chat.title, required: true }], submit: 'Rename', onSubmit: (d) => commit(() => (chat.title = d.title)) }); },
  openAll() {
    const list = [...S.chats].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    openSheet({ title: 'All chats', subtitle: `${list.length} conversations with Sofia`, width: 560,
      body: `<div style="display:flex;flex-direction:column;gap:2px">${list.map((c) => `<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px" class="row"><a href="#/chat/${c.id}" style="flex:1;text-decoration:none;color:#020617;font-size:14px">${esc(c.title)}<div style="font-size:12px;color:#64748B">${c.txId && txOf(c.txId) ? esc(txLabel(txOf(c.txId))) + ' · ' : ''}${c.messages.length || (c.designed ? 4 : 0)} messages</div></a><button class="icon-btn" data-del="${c.id}" aria-label="Delete">${ICON.x}</button></div>`).join('')}</div>`,
      footer: '<a class="btn btn-primary" href="#/chat/new">New chat</a>',
      onMount: (el) => { $$('a', el).forEach((a) => a.addEventListener('click', closeOverlays)); $$('[data-del]', el).forEach((b) => (b.onclick = () => { S.chats = S.chats.filter((c) => c.id !== b.dataset.del); saveDB(); b.closest('.row').remove(); Router.refresh(); })); } });
  },
};
function md(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

/** Ask / Agent segmented control (Home, chat, settings) */
const ModeToggle = {
  bind(root) {
    const grp = $('[aria-label="Sofia mode"]', root) || $$('[role=group]', root).find((g) => /^AskAgent$/.test(text(g).replace(/\s/g, '')));
    if (!grp) return;
    const [ask, agent] = $$('button', grp);
    const onStyle = 'background: #FFFFFF; color: #020617; box-shadow: 0 1px 2px rgba(2,6,23,0.14);';
    const offStyle = 'background: transparent; color: #64748B; box-shadow: none;';
    const base = (b) => (b.getAttribute('style') || '').replace(/background:[^;]*;|color:[^;]*;|box-shadow:[^;]*;/g, '');
    const paint = () => {
      const m = S.session.mode;
      ask.setAttribute('style', base(ask) + (m === 'ask' ? onStyle : offStyle)); agent.setAttribute('style', base(agent) + (m !== 'ask' ? onStyle : offStyle));
      ask.setAttribute('aria-pressed', m === 'ask'); agent.setAttribute('aria-pressed', m !== 'ask');
      $$('[data-mode-hint]').forEach((h) => (h.style.display = h.dataset.modeHint === (m === 'ask' ? 'ask' : 'agent') ? '' : 'none'));
    };
    onClick(ask, () => { S.session.mode = 'ask'; saveDB(); paint(); });
    onClick(agent, () => { S.session.mode = 'agent'; saveDB(); paint(); });
    paint();
  },
};
