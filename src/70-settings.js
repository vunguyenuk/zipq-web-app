/* Settings (profile, security, notifications, routines, org, members) + sign in / sign up / onboarding */
const Settings = {
  nav(main, active) {
    const nav = $('nav[aria-label="Settings sections"]', main);
    if (!nav) return;
    const links = $$('a', nav);
    const routes = { Profile: '#/settings', Security: '#/settings/security', Organization: '#/settings/organization', Members: '#/settings/members', Integrations: '#/settings/integrations', Notifications: '#/settings/notifications', Preferences: '#/settings/preferences', 'Sofia routines': '#/settings/routines' };
    const on = links.find((a) => /background: #E3F0FC/.test(a.getAttribute('style') || '')); const off = links.find((a) => a !== on);
    const onS = on && on.getAttribute('style'), offS = off && off.getAttribute('style');
    links.forEach((a) => {
      const k = ownText(a) || text(a).replace(/\s*\d+ on$/, '');
      if (routes[k]) a.setAttribute('href', routes[k]);
      if (k === active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
      const cur = on && (ownText(on) || text(on).replace(/\s*\d+ on$/, ''));
      if (onS && cur !== active && (k === active || a === on)) { const keep = a.querySelector('span') ? 'justify-content: space-between;' : ''; a.setAttribute('style', (k === active ? onS : offS) + keep); }
      const cnt = $('span', a); if (cnt && /on$/.test(text(cnt))) cnt.textContent = `${Settings.routinesOn()} on`;
    });
    const sub = $('h1', main).nextElementSibling; if (sub) sub.textContent = `${S.user.org} · ${S.user.first} ${S.user.last}, ${S.user.role}`;
  },
  routinesOn() { const all = ['Inbox capture', 'Signing updates', 'Contract-change watch', 'Checklist auto-tick', 'Daily brief', 'Deadline watch', 'Follow-up radar', 'Signing chaser', 'Checklist check']; return all.filter((r) => S.routines[r] !== false).length; },
  profile(app, q = {}) {
    const main = $('main', app);
    const section = q.section || 'profile';
    this.nav(main, { profile: 'Profile', organization: 'Organization', members: 'Members', integrations: 'Integrations', preferences: 'Preferences' }[section] || 'Profile');
    const col = $('section[aria-label=Profile]', main).parentElement;
    const prof = $('section[aria-label=Profile]', main);
    const u = S.user;
    const val = { 'Full name': `${u.first} ${u.last}`, Email: u.email, Phone: u.phone, Brokerage: u.brokerage, 'DRE license': u.dre };
    Object.entries(val).forEach(([k, v]) => { const i = $(`input[aria-label="${k}"]`, prof); if (i) { i.value = v; i.dataset.nopersist = '1'; } });
    onClick(byText(prof, 'Save changes', { sel: 'button' }), () => {
      const g = (k) => $(`input[aria-label="${k}"]`, prof).value.trim();
      const dre = g('DRE license');
      if (dre && !/^\d{8}$/.test(dre)) { toast('DRE license must be 8 digits'); return; }
      const [first, ...rest] = g('Full name').split(' ');
      commit(() => Object.assign(S.user, { first: first || u.first, last: rest.join(' '), email: g('Email'), phone: g('Phone'), brokerage: g('Brokerage'), dre }));
      toast('Profile saved');
    });
    // integrations
    const integ = $('section[aria-label=Integrations]', main);
    const cards = [...integ.children[1].children];
    const keys = ['docusign', 'gmail', 'twilio'];
    const sub = { docusign: 'org account', gmail: u.email, twilio: u.phone };
    cards.forEach((c, i) => {
      const k = keys[i]; const on = !!S.integrations[k];
      const st = c.children[1]; setOwn(st, on ? `Connected · ${sub[k]}` : 'Not connected'); st.style.color = on ? '' : '#64748B'; const dot = $('span', st); if (dot) dot.style.background = on ? '#1F9D6B' : '#CBD5E1';
      const b = $('button', c); b.textContent = on ? 'Manage' : 'Connect';
      onClick(b, () => on ? openMenu(b, [{ header: text(c.children[0]) }, { label: 'Reconnect', onClick: () => toast('Reconnected') }, { label: 'Disconnect', danger: true, onClick: () => commit(() => { S.integrations[k] = false; toast('Disconnected'); }) }], { align: 'right' }) : commit(() => { S.integrations[k] = true; toast('Connected'); }));
    });
    const drive = byText(integ, 'Google Drive', { sel: 'a' }); if (drive) onClick(drive, () => commit(() => { S.integrations.drive = !S.integrations.drive; toast(S.integrations.drive ? 'Google Drive connected — Sofia can file documents there' : 'Google Drive disconnected'); }));
    // Sofia prefs
    const prefs = $('section[aria-label="Sofia preferences"]', main);
    if (prefs) {
      const reading = html(`<section class="readability-settings" aria-labelledby="readability-title"><div><h2 id="readability-title">Display & readability</h2><p>Choose a comfortable text size. Spacing adjusts with the text.</p></div><div class="readability-options" role="radiogroup" aria-label="Text size"><button type="button" role="radio" data-text-size="standard">Standard <span>16px body text</span></button><button type="button" role="radio" data-text-size="comfortable">Comfortable <span>18px body text</span></button></div></section>`);
      prefs.parentElement.insertBefore(reading, prefs);
      const choices = $$('[data-text-size]', reading);
      const setSize = (size) => {
        document.documentElement.dataset.textScale = size;
        choices.forEach((button) => {
          const selected = button.dataset.textSize === size;
          button.setAttribute('aria-checked', String(selected));
          button.tabIndex = selected ? 0 : -1;
        });
        S.session.textScale = size;
        saveDB();
      };
      setSize(S.session.textScale === 'comfortable' ? 'comfortable' : 'standard');
      choices.forEach((button) => onClick(button, () => setSize(button.dataset.textSize)));
      $('.readability-options', reading).addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = choices.findIndex((button) => button.getAttribute('aria-checked') === 'true');
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + choices.length) % choices.length;
        setSize(choices[next].dataset.textSize);
        choices[next].focus();
      });
    }
    const rcount = $$('span', prefs.children[1]).pop(); if (rcount) rcount.textContent = `${this.routinesOn()} on`;
    const voice = $('[aria-label=Voice][role=switch]', prefs); if (voice) { UI.setSwitch(voice, S.session.voice !== false); onClick(voice, () => { S.session.voice = !(S.session.voice !== false); saveDB(); UI.setSwitch(voice, S.session.voice); toast(S.session.voice ? 'Sofia will speak responses' : 'Voice responses off'); }); }
    const mg = $('[aria-label="Default Sofia mode"]', prefs);
    if (mg) $$('button', mg).forEach((b) => { UI.press(b, (text(b) === 'Ask') === (S.session.mode === 'ask'), false); onClick(b, () => { S.session.mode = text(b).toLowerCase(); saveDB(); Router.refresh(); toast(`Default mode: ${text(b)}`); }); });
    const brief = $('input[aria-label="Daily brief time"]', prefs); if (brief) { brief.dataset.nopersist = '1'; brief.value = S.session.briefTime || brief.value; brief.addEventListener('change', () => { S.session.briefTime = brief.value; saveDB(); toast(`Daily brief at ${brief.value}`); }); }
    // sub-sections
    if (section === 'integrations') setTimeout(() => integ.scrollIntoView({ behavior: 'smooth' }), 50);
    if (section === 'preferences') setTimeout(() => prefs.scrollIntoView({ behavior: 'smooth' }), 50);
    if (section === 'organization' || section === 'members') {
      [...col.children].forEach((x) => hide(x));
      col.appendChild(section === 'organization' ? this.orgCard(prof) : this.membersCard(prof));
    }
  },
  orgCard(tplSec) {
    const sec = tplSec.cloneNode(false); sec.setAttribute('aria-label', 'Organization'); sec.style.display = '';
    const o = S.org || (S.org = { name: S.user.org, license: '01234567', address: '17875 Von Karman Ave, Irvine, CA 92614', phone: '(949) 555-0100' });
    sec.innerHTML = `<h2 style="margin:0 0 14px;font-size:16px;font-weight:600">Organization</h2><div class="fgrid">${fieldHTML({ name: 'name', label: 'Brokerage name', value: o.name, half: true })}${fieldHTML({ name: 'license', label: 'Broker license #', value: o.license, half: true, hint: '8 digits — used on every form' })}${fieldHTML({ name: 'address', label: 'Office address', value: o.address })}${fieldHTML({ name: 'phone', label: 'Office phone', value: o.phone, half: true })}</div><div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-primary" data-save>Save changes</button></div>`;
    onClick($('[data-save]', sec), () => { commit(() => { ['name', 'license', 'address', 'phone'].forEach((k) => (o[k] = $(`[name=${k}]`, sec).value)); S.user.org = o.name; }); toast('Organization saved'); });
    return sec;
  },
  membersCard(tplSec) {
    const sec = tplSec.cloneNode(false); sec.setAttribute('aria-label', 'Members'); sec.style.display = '';
    const m = S.members || (S.members = [{ name: `${S.user.first} ${S.user.last}`, email: S.user.email, role: 'Owner' }, { name: 'Sara Patel', email: 'sara.patel@brightpath.com', role: 'Transaction coordinator' }]);
    sec.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h2 style="margin:0;font-size:16px;font-weight:600">Members · ${m.length}</h2><button class="btn btn-primary btn-sm" data-invite>${ICON.plus} Invite member</button></div>${m.map((x, i) => `<div class="row" style="display:flex;align-items:center;gap:12px;padding:10px 6px;border-top:1px solid #F1F5F9"><span style="width:32px;height:32px;border-radius:50%;background:#DCE7F7;color:#034F9F;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center">${esc(initials(x.name))}</span><span style="flex:1"><b style="font-weight:500">${esc(x.name)}</b>${x.pending ? ' <small style="color:#8A5A00">· invite pending</small>' : ''}<br><small style="color:#64748B">${esc(x.email)}</small></span><span style="font-size:13px;color:#334155">${esc(x.role)}</span>${i ? `<button class="icon-btn" data-rm="${i}" aria-label="Remove">${ICON.x}</button>` : '<span style="width:34px"></span>'}</div>`).join('')}`;
    onClick($('[data-invite]', sec), () => openForm({ title: 'Invite member', fields: [{ name: 'email', label: 'Email', type: 'email', required: true }, { name: 'role', label: 'Role', type: 'select', options: ['Agent', 'Transaction coordinator', 'Admin'] }], submit: 'Send invite', onSubmit: (d) => { commit(() => m.push({ name: d.email.split('@')[0], email: d.email, role: d.role, pending: true })); toast(`Invite sent to ${d.email}`); } }));
    $$('[data-rm]', sec).forEach((b) => onClick(b, () => commit(() => m.splice(+b.dataset.rm, 1))));
    return sec;
  },
  security(app) {
    const main = $('main', app);
    this.nav(main, 'Security');
    const sec = S.security || (S.security = { google: true, microsoft: false, twofa: true, codes: 8, devices: [['Chrome on Mac · this device', 'Irvine, CA · active now', true], ['ZipQ for iOS · iPhone', 'Irvine, CA · 2 hours ago · Face ID on', false]], pwChanged: '3 months ago' });
    const col = $('main', app).children[1].children[1];
    const btn = (label) => $$('button', col).find((b) => text(b) === label);
    const rows = $$('div', col).filter((d) => /^(Google|Microsoft)/.test(text(d.children[0] || d)) && $('button', d) && d.children.length === 2);
    // sign-in methods
    const gRow = byText(col, 'Google', { sel: 'div' }); const mRow = byText(col, 'Microsoft', { sel: 'div' });
    void rows;
    const rowOf = (el) => { let e = el; while (e && e.parentElement && !$('button', e)) e = e.parentElement; return e; };
    [[gRow, 'google', 'Google', S.user.email], [mRow, 'microsoft', 'Microsoft', S.user.email]].forEach(([r, k, name, mail]) => {
      if (!r) return; const row = rowOf(r);
      const b = $('button', row); if (!b) return;
      const subEl = $$('span', row).find((s) => /last used|Not connected/.test(ownText(s)));
      b.textContent = sec[k] ? 'Disconnect' : 'Connect';
      if (subEl) subEl.textContent = sec[k] ? `${mail} · last used today` : 'Not connected';
      onClick(b, () => { commit(() => (sec[k] = !sec[k])); toast(`${name} ${sec[k] ? 'connected' : 'disconnected'}`); });
    });
    const pwSub = $$('span', col).find((s) => /^Last changed/.test(ownText(s))); if (pwSub) pwSub.textContent = `Last changed ${sec.pwChanged}`;
    onClick(btn('Change password'), () => openForm({ title: 'Change password', fields: [{ name: 'cur', label: 'Current password', type: 'password', required: true }, { name: 'n1', label: 'New password', type: 'password', required: true, hint: 'At least 8 characters' }, { name: 'n2', label: 'Confirm new password', type: 'password', required: true }], submit: 'Update password', onSubmit: (d) => { if (d.n1.length < 8) { toast('Use at least 8 characters'); return false; } if (d.n1 !== d.n2) { toast('Passwords don’t match'); return false; } commit(() => (sec.pwChanged = 'just now')); toast('Password updated'); } }));
    // 2FA
    const onBadge = $$('span', col).find((s) => ownText(s) === 'On');
    const codesSub = $$('span', col).find((s) => /backup codes/.test(ownText(s)));
    if (codesSub) codesSub.textContent = sec.twofa ? `A 6-digit code is required on every new sign-in · backup codes: ${sec.codes} of 10 left` : 'Off — turn it on to protect client documents';
    if (onBadge && !sec.twofa) { onBadge.textContent = 'Off'; css(onBadge, { background: '#F1F5F9', color: '#64748B' }); }
    onClick(btn('View codes'), () => openSheet({ title: 'Backup codes', subtitle: 'Each code works once. Store them somewhere safe.', width: 420, body: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:'Geist Mono',monospace;font-size:15px">${Array.from({ length: sec.codes }, (_, i) => `<span style="padding:8px 10px;background:#F8FAFC;border-radius:8px">${String(48213 + i * 7919).slice(0, 4)}-${String(90127 - i * 3571).slice(0, 4)}</span>`).join('')}</div>`, footer: '<button class="btn" data-regen>Regenerate</button><button class="btn btn-primary" data-close>Done</button>', onMount: (el) => { $('[data-regen]', el).onclick = () => { sec.codes = 10; saveDB(); closeOverlays(); toast('New backup codes generated'); Router.refresh(); }; } }));
    const off = btn('Turn off'); if (off) { off.textContent = sec.twofa ? 'Turn off' : 'Turn on'; onClick(off, () => sec.twofa ? confirmDlg({ title: 'Turn off two-factor authentication?', body: 'Anyone with your password could sign in. Client documents will be less protected.', ok: 'Turn off', danger: true, onOk: () => commit(() => (sec.twofa = false)) }) : commit(() => { sec.twofa = true; toast('Two-factor authentication on'); })); }
    // devices
    const soBtns = $$('button', col).filter((b) => text(b) === 'Sign out');
    soBtns.forEach((b, i) => onClick(b, () => { const row = b.closest('div'); commit(() => sec.devices.splice(i + 1, 1)); toast('Signed out of that device'); void row; }));
    if (sec.devices.length < 2) { const r = soBtns[0] && soBtns[0].parentElement; if (r) hide(r.closest('div[style]') === r ? r : r); }
    onClick(btn('Sign out of all other devices'), () => confirmDlg({ title: 'Sign out of all other devices?', body: 'Every other session will need to sign in again.', ok: 'Sign out others', onOk: () => { commit(() => (sec.devices = sec.devices.slice(0, 1))); toast('Signed out of all other devices'); } }));
    onClick(btn('Delete account'), () => openForm({ title: 'Delete account', subtitle: 'This removes your profile and personal data from this browser. Type DELETE to confirm.', fields: [{ name: 'c', label: 'Confirm', placeholder: 'DELETE', required: true }], submit: 'Delete account', danger: true, onSubmit: (d) => { if (d.c !== 'DELETE') { toast('Type DELETE to confirm'); return false; } resetDB(); S.session.signedIn = false; saveDB(); Router.go('#/signin'); toast('Account deleted'); } }));
  },
  notifications(app) {
    const main = $('main', app);
    this.nav(main, 'Notifications');
    const rb = byText(main, `9 on`); if (rb) rb.textContent = `${this.routinesOn()} on`;
    // channel availability: SMS needs Twilio
    if (!S.integrations.twilio) $$('[role=switch][aria-label$="by SMS"]', main).forEach((s) => { s.style.opacity = 0.4; s.title = 'Connect SMS in Integrations'; });
    const where = $$('div', main).filter((d) => /^(Push|Email|SMS)$/.test(text(d.children[0] || document.createElement('i'))));
    where.forEach((d) => { const v = d.children[1]; if (!v) return; if (text(d.children[0]) === 'Email') v.textContent = S.user.email; if (text(d.children[0]) === 'SMS') v.textContent = S.user.phone; });
  },
  routines(app) {
    const main = $('main', app);
    this.nav(main, 'Sofia routines');
    $$('div', main).filter((group) => {
      if (group.classList.contains('rrow') || group.children.length !== 3) return false;
      return /^(Automatic|Scheduled)\b/.test(text(group));
    }).forEach((group) => {
      group.classList.add('routine-group-header');
      const [lead, output, count] = group.children;
      lead.classList.add('routine-group-lead');
      lead.children[0]?.classList.add('routine-group-icon');
      lead.children[1]?.classList.add('routine-group-description');
      lead.children[2]?.classList.add('routine-group-columns');
      output.classList.add('routine-group-columns');
      count.classList.add('routine-group-count');
    });
    $$('[role=switch]', main).forEach((sw) => {
      const name = (sw.getAttribute('aria-label') || '').replace(/ routine$/, '');
      UI.setSwitch(sw, S.routines[name] !== false);
      onClick(sw, () => { S.routines[name] = !(S.routines[name] !== false); saveDB(); UI.setSwitch(sw, S.routines[name]); toast(`${name} ${S.routines[name] ? 'on' : 'paused'}`); this.counts(main); this.nav(main, 'Sofia routines'); });
      const row = sw.closest('.row') || sw.parentElement.parentElement;
      const nameEl = row && byText(row, name);
      if (nameEl) { nameEl.style.cursor = 'pointer'; onClick(nameEl, () => this.runNow(name)); nameEl.title = 'Run now'; }
    });
    this.counts(main);
    const sug = byText(main, 'Suggest a routine', { sel: 'a' }); if (sug) sug.setAttribute('href', '#/chat/new?q=' + encodeURIComponent('Suggest a routine for me'));
  },
  counts(main) {
    const rt = ['Inbox capture', 'Signing updates', 'Contract-change watch', 'Checklist auto-tick'];
    const sc = ['Daily brief', 'Deadline watch', 'Follow-up radar', 'Signing chaser', 'Checklist check'];
    const lbls = $$('span', main).filter((s) => /^\d+ on$/.test(ownText(s)));
    const n1 = rt.filter((r) => S.routines[r] !== false).length, n2 = sc.filter((r) => S.routines[r] !== false).length;
    const sectionCounts = lbls.filter((l) => !l.closest('nav'));
    if (sectionCounts[0]) sectionCounts[0].textContent = `${n1} on`; if (sectionCounts[1]) sectionCounts[1].textContent = `${n2} on`;
  },
  runNow(name) {
    if (name === 'Follow-up radar') return FollowUps.runRadar();
    if (name === 'Daily brief' || name === 'Deadline watch') { Sofia.runScan(); return; }
    if (name === 'Signing chaser') { const env = S.envelopes.filter((e) => e.status === 'out'); commit(() => env.forEach((e) => logActivity(e.txId, `Signing chaser nudged ${e.code} signers`, 'signing'))); toast(env.length ? `Nudged signers on ${env.length} envelope${env.length > 1 ? 's' : ''}` : 'No envelopes waiting'); return; }
    toast(`${name} ran just now — nothing new`);
  },
};

const Onboarding = {
  signin(app) {
    const f = app.firstElementChild;
    const email = $('input[type=email]', f), pw = $('input[type=password]', f);
    [email, pw].forEach((i) => (i.dataset.nopersist = '1'));
    email.value = S.user.email;
    const go = () => {
      if (!/@/.test(email.value)) { email.focus(); email.style.boxShadow = '0 0 0 3px rgba(180,35,24,.15)'; toast('Enter your work email'); return; }
      if (!pw.value) { pw.focus(); toast('Enter your password (any password works in this demo)'); return; }
      Auth.signIn(email.value.trim());
    };
    onClick(byText(f, 'Sign in', { sel: 'a' }), go);
    [email, pw].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));
    $$('button.oauth', f).forEach((b) => onClick(b, () => { toast(`Signed in with ${text(b).replace('Continue with ', '')}`); Auth.signIn(); }));
    onClick(byText(f, 'Forgot password?', { sel: 'a' }), () => openForm({ title: 'Reset password', subtitle: 'We’ll email you a link to set a new password.', fields: [{ name: 'email', label: 'Work email', type: 'email', value: email.value, required: true }], submit: 'Send reset link', onSubmit: (d) => toast(`Reset link sent to ${d.email}`) }));
    $$('a', f).filter((a) => /Terms of Service|Privacy Policy/.test(text(a))).forEach((a) => onClick(a, () => toast('Opens in a new tab in production')));
  },
  signup(app) {
    const f = app.firstElementChild;
    const name = $('input[placeholder="First and last name"]', f), email = $('input[type=email]', f), pw = $('input[type=password]', f);
    [name, email, pw].forEach((i) => (i.dataset.nopersist = '1'));
    const go = () => {
      if (!name.value.trim()) { name.focus(); toast('Add your name'); return; }
      if (!/@/.test(email.value)) { email.focus(); toast('Enter your work email'); return; }
      if (pw.value.length < 8) { pw.focus(); toast('Password needs at least 8 characters'); return; }
      Auth.signUp({ name: name.value, email: email.value });
    };
    onClick(byText(f, 'Create account', { sel: 'a' }), go);
    $$('a.oauth', f).forEach((a) => onClick(a, () => Auth.signUp({ name: 'Chinh Le', email: S.user.email })));
  },
  about(app) {
    const f = app.firstElementChild;
    onClick(byText(f, 'Skip for now', { sel: 'a' }), () => this.finish());
    const inputs = $$('input', f); const sels = $$('select', f);
    inputs[0].value = S.user.first; inputs[1].value = S.user.last; if (inputs[2]) inputs[2].value = S.user.dre || '';
    inputs.forEach((i) => (i.dataset.nopersist = '1'));
    const roles = $$('[aria-pressed]', f); roles.forEach((b) => UI.press(b, text(b) === S.user.agentRole, false));
    onClick(byText(f, 'Continue', { sel: 'a' }), () => {
      const dre = inputs[2].value.trim();
      if (!/^\d{8}$/.test(dre)) { inputs[2].focus(); inputs[2].style.boxShadow = '0 0 0 3px rgba(180,35,24,.15)'; toast('DRE license # is 8 digits — keep the leading zero'); return; }
      commit(() => Object.assign(S.user, { first: inputs[0].value.trim() || S.user.first, last: inputs[1].value.trim(), dre, state: sels[0] ? sels[0].value : 'California', agentRole: (roles.find((b) => b.getAttribute('aria-pressed') === 'true') || { textContent: 'Agent' }).textContent.trim() }), { rerender: false });
      Router.go('#/onboarding/brokerage');
    });
  },
  brokerage(app) {
    const f = app.firstElementChild;
    onClick(byText(f, 'Skip for now', { sel: 'a' }), () => this.finish());
    const title = $('h1', f) || byText(f, 'Hi Chinh, I\'m Sofia.'); if (title) title.textContent = `Hi ${S.user.first}, I'm Sofia.`;
    const who = $$('span,div', f).find((x) => /^Agent · DRE/.test(ownText(x))); if (who) who.textContent = `${S.user.agentRole} · DRE ${S.user.dre}`;
    const [bn, bl] = $$('input', f); [bn, bl].forEach((i) => (i.dataset.nopersist = '1'));
    bn.value = S.user.brokerage === 'Org 1' ? '' : S.user.brokerage; bl.value = (S.org && S.org.license) || '';
    const opts = $$('[aria-pressed]', f);
    const paint = () => { const join = opts[1].getAttribute('aria-pressed') === 'true'; $$('span', bn.parentElement).forEach((s) => { if (/Brokerage name|Invite code/.test(ownText(s))) s.textContent = join ? 'Invite code or link' : 'Brokerage name'; }); bn.placeholder = join ? 'Paste the code your broker sent' : '[Your brokerage]'; bl.parentElement.style.display = join ? 'none' : ''; };
    opts.forEach((b) => b.addEventListener('click', () => setTimeout(paint, 0)));
    paint();
    onClick(byText(f, 'Continue', { sel: 'a' }), () => {
      const join = opts[1].getAttribute('aria-pressed') === 'true';
      if (!bn.value.trim()) { bn.focus(); toast(join ? 'Paste your invite code' : 'Add your brokerage name'); return; }
      if (!join && bl.value && !/^\d{8}$/.test(bl.value.trim())) { bl.focus(); toast('Broker license # is 8 digits'); return; }
      commit(() => { if (join) { S.user.org = 'Brokerage (invited)'; S.user.role = 'Agent'; } else { S.user.brokerage = bn.value.trim(); S.user.org = bn.value.trim(); S.user.role = 'Owner'; S.org = { name: bn.value.trim(), license: bl.value.trim(), address: '', phone: '' }; } }, { rerender: false });
      Router.go('#/onboarding/connect');
    });
  },
  connect(app) {
    const f = app.firstElementChild;
    const title = byText(f, 'Last step, Chinh.'); if (title) title.textContent = `Last step, ${S.user.first}.`;
    $$('a', f).filter((a) => text(a) === 'Skip for now').forEach((a) => onClick(a, () => this.finish()));
    const btns = $$('button', f);
    const manage = btns.find((b) => text(b) === 'Manage'); if (manage) onClick(manage, () => openMenu(manage, [{ label: 'Reconnect DocuSign', onClick: () => toast('DocuSign reconnected') }, { label: 'Disconnect', danger: true, onClick: () => { S.integrations.docusign = false; saveDB(); toast('DocuSign disconnected'); } }]));
    const conn = btns.find((b) => text(b) === 'Connect');
    if (conn) { if (S.integrations.gmail && S.session.onbGmail) { conn.textContent = 'Connected'; conn.disabled = true; } onClick(conn, () => { S.integrations.gmail = true; S.session.onbGmail = true; saveDB(); conn.textContent = 'Connected'; css(conn, { color: '#1F7A3A' }); toast('Google Workspace connected'); }); }
    btns.filter((b) => /Follow Up Boss|kvCORE|Lofty|BoldTrail/.test(text(b))).forEach((b) => onClick(b, () => toast(`${text(b)} import is coming soon`)));
    const csv = btns.find((b) => /Upload CSV/.test(text(b))); if (csv) onClick(csv, () => Contacts.openImport(() => { S.session.importedContacts = true; saveDB(); }));
    const phone = $('input', f); if (phone) { phone.dataset.nopersist = '1'; phone.value = S.user.phone || ''; }
    onClick(byText(f, 'Finish setup', { sel: 'a' }), () => { if (phone && phone.value) S.user.phone = phone.value; this.finish(true); });
  },
  finish(done) {
    S.session.onboarded = true; S.session.firstWeek = true; saveDB();
    Router.go('#/home'); toast(done ? `You're all set, ${S.user.first}. Sofia is ready.` : 'You can finish setup any time from Home');
  },
};
