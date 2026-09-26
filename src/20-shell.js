/* App shell: sidebars, top bar, search, notifications, profile menu */

const ACTIVE_NAV_BG = '#E3F0FC';
function isActiveStyle(el) { return /background: #E3F0FC/i.test(el.getAttribute('style') || ''); }
function navStylePair(els) {
  const a = els.find(isActiveStyle), i = els.find((e) => !isActiveStyle(e));
  return { on: a && a.getAttribute('style'), off: i && i.getAttribute('style'), onKids: a && $$('*', a).map((x) => x.getAttribute('style')), offKids: i && $$('*', i).map((x) => x.getAttribute('style')) };
}
function setNavActive(el, on, pair) {
  if (!pair.on || !pair.off) return;
  el.setAttribute('style', on ? pair.on : pair.off);
  const kids = $$('*', el); const src = on ? pair.onKids : pair.offKids;
  if (src && src.length === kids.length) kids.forEach((k, i) => { if (src[i] == null || /border-radius: 50%/.test(k.getAttribute('style') || '')) return; k.setAttribute('style', src[i]); });
  if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
}

const TX_COUNTS = () => ({
  current: S.tx.filter((t) => t.status === 'current').length,
  pending: S.tx.filter((t) => t.status === 'pending').length,
  closed: S.tx.filter((t) => t.status === 'closed').length,
  archived: S.tx.filter((t) => t.status === 'archived').length,
});
const txLabel = (t) => t.title || t.address;
function txKeyShort(t) {
  if (t.blocked) return 'Blocked';
  const k = nextKeyDate(t);
  return k ? relWhen(k.due, k.time) : '';
}
function overdueCount() { return S.tasks.filter((w) => w.status !== 'done' && w.due && diffDays(w.due) < 0).length; }
function followUpsDue() { return S.followUps.filter((f) => !f.done && diffDays(f.due) <= 0).length; }

const Shell = {
  apply(app, key) {
    let aside = $('aside', app);
    // Contacts belongs to Transactions > Resources. Reuse the transaction rail
    // on the Contacts screen so the information architecture stays visible.
    if (key === 'contacts' && aside) {
      const txAside = document.querySelector('template[data-screen="transactions"]')?.content.querySelector('aside');
      if (txAside) {
        const replacement = txAside.cloneNode(true);
        aside.replaceWith(replacement);
        aside = replacement;
      }
    }
    if (!aside || !$('[aria-label=Sections]', aside)) { this.topbar(app); return; }
    aside.classList.add('app-navigation-sidebar');
    this.user(aside);
    this.sectionTabs(aside);
    onClick($('[aria-label="Collapse sidebar"]', aside), () => { S.session.sidebarCollapsed = !S.session.sidebarCollapsed; saveDB(); this.collapse(aside); });
    this.collapse(aside);
    const label = text($('a', aside.children[2]) || aside.children[2]);
    if (/New chat/.test(text(aside.children[2]))) this.sofiaNav(aside, key);
    else if (/New transaction/.test(text(aside.children[2]))) this.txNav(aside, key);
    else if (/Add client/.test(text(aside.children[2]))) this.relNav(aside, key);
    this.globalSearch(aside);
    this.sidebarChrome(aside, key);
    this.designSystemNav(aside);
    this.topbar(app);
    return label;
  },
  after(app) {
    this.oneTabBar(app);
    if (!$('.m-menu') && document.body) { const b = html(`<button class="m-menu" aria-label="Menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>`); b.onclick = () => openMenu(b, [{ label: 'Home', onClick: () => Router.go('#/home') }, { label: 'Agenda', onClick: () => Router.go('#/agenda') }, { label: 'Transactions', onClick: () => Router.go('#/transactions') }, { label: 'Clients', onClick: () => Router.go('#/clients') }, { label: 'Follow-ups', onClick: () => Router.go('#/follow-ups') }, { label: 'Partners', onClick: () => Router.go('#/contacts') }, { label: 'Forms', onClick: () => Router.go('#/forms') }, { label: 'Settings', onClick: () => Router.go('#/settings') }, { label: 'Design system', onClick: () => location.assign('design-system/index.html') }, '-', { label: 'New chat', onClick: () => Router.go('#/chat/new') }, { label: 'Sign out', danger: true, onClick: () => Auth.signOut() }], { width: 220 }); document.body.appendChild(b); }
    const mm = $('.m-menu'); if (mm) mm.style.visibility = /^(signin|signup|onb|phoneHome)/.test(app.firstElementChild.dataset.screen) ? 'hidden' : 'visible';
    // Ask Sofia floating buttons → open a chat scoped to what is on screen
    $$('a[href="#/chat"]', app).forEach((a) => {
      if (!/Ask Sofia/.test(text(a)) && !a.hasAttribute('data-sofia-fab')) return;
      const ctx = Router.current && Router.current.params && Router.current.params.id;
      a.setAttribute('href', ctx && byId('tx', ctx) ? `#/chat/new?tx=${ctx}` : '#/chat/new');
    });
  },
  // Product areas use the same names everywhere, including compact navigation.
  sectionTabs(aside) {
    const SPARK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9-4.9-1.9 4.9-1.9z"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>';
    const short = { '#/home': ['Sofia', 'Sofia'], '#/transactions': ['Transactions', 'Transactions'], '#/clients': ['Clients', 'Clients'] };
    $$('[aria-label="Sections"] > a', aside).forEach((a) => {
      const m = short[a.getAttribute('href')]; if (!m) return;
      const lab = a.querySelector('span'); if (lab) lab.textContent = m[0];
      a.setAttribute('title', m[1]); a.setAttribute('aria-label', m[1]);
      const img = a.querySelector('img'); if (img) img.outerHTML = SPARK;
    });
  },
  globalSearch(aside) {
    if ($('.sidebar-search', aside)) return;
    const action = [...aside.children].find((el) => /New chat|New transaction|Add client/.test(text(el)));
    if (!action) return;
    action.classList.add('sidebar-primary-action');
    const button = html(`<button type="button" class="sidebar-search sidebar-head-action" aria-label="Global search" title="Search"><span>${ICON.search}</span><span class="sidebar-head-action-label">Search</span><kbd>⌘K</kbd></button>`);
    const header = aside.firstElementChild;
    const collapse = $('[aria-label="Collapse sidebar"]', header);
    header.insertBefore(button, collapse || null);
    onClick(button, () => Search.open());
    if (!window.__zipqSearchKey) {
      window.__zipqSearchKey = true;
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); Search.open(); }
      });
    }
  },
  sidebarChrome(aside, key) {
    const root = aside.parentElement;
    if (!root || $('.app-rail', root)) return;

    // The narrow rail owns product-level navigation; the open panel is contextual.
    // This mirrors ChatGPT's desktop menu and avoids repeating the same areas twice.
    const area = /^(home|homeFirstWeek|chat)$/.test(key) ? 'sofia'
      : /^agenda/.test(key) ? 'agenda'
        : key === 'transactions' || /^tx/.test(key) ? 'transactions'
          : /^(clients|clientsTable|followUps|contacts)$/.test(key) ? 'clients'
            : /^(forms|templates|templatePlaybook|formEditor|sendSignature)$/.test(key) ? 'forms'
              : 'more';
    aside.dataset.sidebarArea = area;

    const icons = {
      home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v9a2 2 0 0 1-2 2h-4.2v-6.5h-4.6V21H5.5a2 2 0 0 1-2-2z"/></svg>',
      agenda: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l-3 2"/></svg>',
      transactions: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4l2 2h7A1.5 1.5 0 0 1 20 7.5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>',
      clients: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3.4 2.8-5.3 5.5-5.3s4.8 1.9 5.5 5.3M15.5 5.7a3 3 0 0 1 0 5.8M16.5 14c2.2.5 3.5 2.1 4 5"/></svg>',
      forms: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="12.5" height="17" rx="2"/><path d="M8.5 8h5.5M8.5 12h5.5M8.5 16h3.5M17.5 7.5H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19h-1.5"/></svg>',
      more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
      help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.6 2.6 0 1 1 4.5 1.8c-1 .9-2.1 1.3-2.1 3M12 17.5h.01"/></svg>',
    };
    const items = [
      ['sofia', 'Sofia', '#/home', icons.home],
      ['agenda', 'Agenda', '#/agenda', icons.agenda],
      ['transactions', 'Transactions', '#/transactions', icons.transactions],
      ['clients', 'Clients', '#/clients', icons.clients],
      ['forms', 'Forms', '#/forms', icons.forms],
    ];
    const itemHTML = ([id, label, href, icon]) => `<a class="app-rail-item" href="${href}" aria-label="${label}" data-area="${id}" data-tooltip="${label}"${area === id ? ' aria-current="page"' : ''}>${icon}</a>`;
    const rail = html(`<nav class="app-rail" aria-label="Primary navigation">
      <div class="app-rail-main">${items.map(itemHTML).join('')}<button class="app-rail-item app-rail-more" type="button" aria-label="More" data-tooltip="More">${icons.more}</button></div>
      <div class="app-rail-bottom"><button class="app-rail-item app-rail-help" type="button" aria-label="Help" data-tooltip="Help">${icons.help}</button><a class="app-rail-avatar" href="#/settings" aria-label="Profile and settings" data-tooltip="Profile and settings">${esc(initials(S.user.first + ' ' + S.user.last))}</a></div>
    </nav>`);
    aside.insertAdjacentElement('beforebegin', rail);
    rail.classList.toggle('panel-collapsed', !!S.session.sidebarCollapsed);
    $$('.app-rail-item[href]', rail).forEach((link) => link.addEventListener('click', (event) => {
      if (link.dataset.area === area) {
        event.preventDefault();
        S.session.sidebarCollapsed = !S.session.sidebarCollapsed;
        saveDB();
        this.collapse(aside);
        return;
      }
      if (S.session.sidebarCollapsed) {
        S.session.sidebarCollapsed = false;
        saveDB();
        this.collapse(aside);
      }
    }));
    onClick($('.app-rail-more', rail), (e, button) => openMenu(button, [
      { label: 'Follow-ups', onClick: () => Router.go('#/follow-ups') },
      { label: 'Partners', onClick: () => Router.go('#/contacts') },
      { label: 'Templates', onClick: () => Router.go('#/templates') },
      '-',
      { label: 'Settings', onClick: () => Router.go('#/settings') },
      { label: 'Design system', onClick: () => location.assign('design-system/index.html') },
    ], { align: 'after', width: 200 }));
    onClick($('.app-rail-help', rail), () => toast('Help center is coming soon'));

    const header = aside.firstElementChild;
    const collapse = $('[aria-label="Collapse sidebar"]', header);
    const search = $('.sidebar-head-action', header);
    if (!$('.sidebar-head-notifications', header)) {
      const notifications = html(`<button type="button" class="sidebar-head-action sidebar-head-notifications" aria-label="Notifications" title="Notifications">${ICON.bell}</button>`);
      header.insertBefore(notifications, collapse || null);
      onClick(notifications, (e, button) => Notifs.open(button));
    }
    if (search) search.setAttribute('aria-keyshortcuts', 'Meta+K Control+K');

    const duplicateRoutes = new Set(['#/home', '#/agenda', '#/transactions', '#/clients', '#/forms', '#/settings?section=integrations']);
    $$('a.nav', aside).forEach((link) => { if (duplicateRoutes.has(link.getAttribute('href'))) link.classList.add('rail-duplicate'); });
  },
  designSystemNav(aside) {
    if ($('.sidebar-design-system-link', aside)) return;
    const footer = aside.lastElementChild;
    if (!footer || !$('a[href="#/settings"]', footer)) return;
    const link = html(`<a class="nav sidebar-design-system-link" href="design-system/index.html">${ICON.doc}<span>Design system</span></a>`);
    aside.insertBefore(link, footer);
  },
  // UX rule: one tab bar per area. Keep aria-current in sync with the visual state,
  // and demote secondary view switches (Group by) to a menu button.
  // a composer = a box with one text field and a Send action; its field must not look like a separate input
  markComposers(root) {
    $$('textarea, input[type="text"], input:not([type])', root).forEach((f) => {
      const box = f.closest('form, .chat-input-shell, .sofia-composer, div[style*="border-radius"]');
      if (!box || box === f) return;
      const send = [...box.querySelectorAll('button, a')].some((b) => /^(send|ask)$/i.test((b.getAttribute('aria-label') || b.textContent || '').trim().split(/\s/)[0]) || (/background: (#2C67C5|rgb\(44, 103, 197\))/i.test(b.getAttribute('style') || '') && !b.textContent.trim()));
      if (!send) return;
      box.classList.add('composer'); f.classList.add('composer-input');
    });
  },
  // first line of every page head sits on the same 64px band as the sidebar brand (center y = 32)
  alignHead(app) {
    const h = $('main > header', app); if (!h || !h.querySelector('h1, .page-title')) return;
    requestAnimationFrame(() => {
      const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); let n, first = null;
      while ((n = w.nextNode())) { if (n.textContent.trim()) { first = n; break; } }
      if (!first) return;
      const rg = document.createRange(); rg.selectNodeContents(first); const r = rg.getBoundingClientRect();
      const top = h.getBoundingClientRect().top; const cur = parseFloat(getComputedStyle(h).paddingTop) || 0;
      const want = Math.max(8, Math.round(cur + (32 - (r.top + r.height / 2 - top))));
      h.style.setProperty('padding-top', want + 'px', 'important');
    });
  },
  oneTabBar(app) {
    this.markComposers(app);
    this.alignHead(app);
    $$('nav, [role="tablist"]', app).forEach((n) => {
      const kids = [...n.children].filter((k) => /^(A|BUTTON)$/.test(k.tagName));
      const under = kids.filter((k) => /-2px 0px inset|inset 0 -2px/.test(k.getAttribute('style') || ''));
      if (under.length === 1) kids.forEach((k) => { if (k === under[0]) k.setAttribute('aria-current', 'page'); else if (k.getAttribute('aria-current') === 'page') k.removeAttribute('aria-current'); });
    });
    const gb = $('[role="group"][aria-label="Group list by"]', app);
    if (gb) {
      const opts = $$('a', gb);
      const cur = opts.find((a) => a.getAttribute('aria-current') === 'page') || opts.find((a) => /background: (#FFFFFF|rgb\(255, 255, 255\))/i.test(a.getAttribute('style') || '')) || opts[0];
      const btn = html(`<button type="button" class="group-menu" aria-haspopup="menu" title="Group the agenda"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span>Group by <b>${esc(text(cur).replace(/\s*\(CRM\)/, ''))}</b></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`);
      btn.onclick = (e) => { e.stopPropagation(); openMenu(btn, opts.map((a) => ({ label: text(a), checked: a === cur, onClick: () => Router.go(a.getAttribute('href')) })), { width: 210 }); };
      gb.replaceWith(btn);
    }
  },
  collapse(aside) {
    const c = !!S.session.sidebarCollapsed;
    aside.classList.toggle('collapsed', c);
    const rail = aside.previousElementSibling;
    if (rail && rail.classList.contains('app-rail')) rail.classList.toggle('panel-collapsed', c);
  },
  user(aside) {
    const u = S.user;
    const card = $$('a[href="#/settings"]', aside).find((a) => /Owner|Agent|Broker/.test(text(a)) || a.querySelector('span span'));
    if (!card) return;
    const spans = $$('span', card);
    setOwn(spans[0], initials(u.first + ' ' + u.last));
    const nm = spans.find((s) => ownText(s) === 'Chinh Le'); if (nm) nm.textContent = `${u.first} ${u.last}`;
    const org = spans.find((s) => /· Owner/.test(ownText(s))); if (org) org.textContent = `${u.org} · ${u.role}`;
    onClick(card, () => openMenu(card, [
      { header: `${u.first} ${u.last} · ${u.email}` },
      { label: 'Settings', onClick: () => Router.go('#/settings') },
      { label: 'Security', onClick: () => Router.go('#/settings/security') },
      { label: 'Notifications', onClick: () => Router.go('#/settings/notifications') },
      '-',
      { label: 'Reset demo data', onClick: () => confirmDlg({ title: 'Reset demo data?', body: 'All changes you made in this browser will be replaced with the original sample workspace.', ok: 'Reset', danger: true, onOk: () => { const s = S.session.signedIn; resetDB(); S.session.signedIn = s; saveDB(); Router.go('#/home'); toast('Demo data reset'); } }) },
      { label: 'Sign out', danger: true, onClick: () => Auth.signOut() },
    ], { width: 250 }));
  },
  sofiaNav(aside, key) {
    const newChat = aside.children[2];
    newChat.setAttribute('href', '#/chat/new');
    const navs = $$('a.nav', aside);
    const agenda = navs.find((a) => text(a).startsWith('Agenda'));
    const n = overdueCount(); const cnt = agenda && agenda.children[2]; if (cnt) { cnt.textContent = n || ''; }
    const con = navs.find((a) => text(a).startsWith('Connections') || text(a).startsWith('Settings'));
    if (con && con.children[2]) con.children[2].textContent = '';
    if (con) con.setAttribute('href', '#/settings?section=integrations');
    // recent chats
    const hdr = byText(aside, 'Recent chats');
    const items = []; let e = hdr && hdr.nextElementSibling;
    while (e && e.tagName === 'A' && !/View all chats/.test(text(e))) { items.push(e); e = e.nextElementSibling; }
    const viewAll = e;
    if (!items.length) return;
    const pair = navStylePair(items);
    if (!pair.on) { pair.on = items[0].getAttribute('style').replace('color: #334155;', 'background: #E3F0FC; color: #034F9F; font-weight: 600;'); pair.off = items[0].getAttribute('style'); }
    if (!pair.off) pair.off = items[1].getAttribute('style');
    const proto = items[0].cloneNode(true);
    items.forEach((i) => i.remove());
    const chats = [...S.chats].sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 5);
    const curChat = Router.current && Router.current.params && Router.current.params.chat;
    chats.forEach((c) => {
      const a = proto.cloneNode(true);
      a.textContent = c.title; a.setAttribute('href', '#/chat/' + c.id); a.title = c.title;
      a.setAttribute('style', (curChat === c.id && key === 'chat') ? pair.on : pair.off);
      aside.insertBefore(a, viewAll);
    });
    onClick(viewAll, () => Chats.openAll());
  },
  txNav(aside, key) {
    const newTx = aside.children[2];
    onClick(newTx, () => Tx.openCreate());
    const cur = Router.current || {};
    // pinned
    const hdr = byText(aside, 'Pinned');
    const pins = []; let e = hdr.nextElementSibling;
    while (e && e.tagName === 'A') { pins.push(e); e = e.nextElementSibling; }
    const pair = navStylePair(pins);
    if (!pair.on) { const b = pins[0].getAttribute('style'); pair.off = b; pair.on = b + ' background: #E3F0FC; color: #034F9F; font-weight: 600;'; pair.onKids = $$('*', pins[0]).map((x) => x.getAttribute('style')); pair.offKids = pair.onKids; }
    const proto = pins[0].cloneNode(true); pins.forEach((p) => p.remove());
    const pinned = S.tx.filter((t) => t.pinned && t.status !== 'archived');
    const afterEl = e;
    pinned.forEach((t) => {
      const a = proto.cloneNode(true);
      a.setAttribute('href', '#/tx/' + t.id);
      a.children[0].textContent = txLabel(t);
      a.children[1].textContent = txKeyShort(t);
      setNavActive(a, cur.params && cur.params.id === t.id, pair);
      a.children[1].style.color = t.blocked ? '#64748B' : (a.children[1].textContent.startsWith('Today') ? '#B42318' : '#64748B');
      aside.insertBefore(a, afterEl);
    });
    if (!pinned.length) aside.insertBefore(html('<div style="font-size:12.5px;color:#94A3B8;padding:4px 12px 8px">Star a transaction to pin it</div>'), afterEl);
    // Status belongs in the page tabs, not a second navigation system.
    const statusLinks = $$('a.nav', aside).filter((a) => /^(Current|Pending|Closed|Archived)/.test(text(a)));
    const sp = navStylePair(statusLinks);
    statusLinks.forEach((a) => a.remove());
    [...aside.children].filter((el) => ownText(el) === 'Transactions').forEach((el) => el.remove());
    const forms = $$('a.nav', aside).find((a) => text(a).startsWith('Forms'));
    if (forms && forms.children[2]) forms.children[2].textContent = '';
    if (forms) forms.toggleAttribute('aria-current', key === 'forms' || key === 'templates' || key === 'templatePlaybook');
    if (forms) {
      let contacts = $$('a.nav', aside).find((a) => text(a).startsWith('Contacts') || text(a).startsWith('Partners'));
      if (!contacts) {
        contacts = html(`<a href="#/contacts" class="nav" style="display:flex;align-items:center;gap:10px;height:36px;padding:0 12px;border-radius:8px;color:#424242;text-decoration:none;font-size:14px">${ICON.user}<span style="flex-grow:1">Partners</span><span style="font-size:12px;color:#5D5D5D"></span></a>`);
        forms.insertAdjacentElement('afterend', contacts);
      }
      if (contacts.children[1]) contacts.children[1].textContent = 'Partners';
      if (contacts.children[2]) contacts.children[2].textContent = '';
      contacts.toggleAttribute('aria-current', key === 'contacts');
      if (key === 'contacts') contacts.setAttribute('aria-current', 'page');
    }
  },
  relNav(aside, key) {
    const add = aside.children[2];
    onClick(add, () => Clients.openCreate());
    const navs = $$('a.nav', aside);
    const set = (label, n) => { const a = navs.find((x) => text(x).startsWith(label)); if (a && a.children[2]) a.children[2].textContent = n; };
    set('Clients', ''); set('Follow-ups', followUpsDue() || '');
    const contacts = navs.find((x) => text(x).startsWith('Contacts'));
    if (contacts) contacts.remove();
    // needs a check-in
    const hdr = byText(aside, 'Needs a check-in');
    if (!hdr) return;
    const rows = []; let e = hdr.nextElementSibling;
    while (e && e.tagName === 'A') { rows.push(e); e = e.nextElementSibling; }
    const proto = rows[0].cloneNode(true); rows.forEach((r) => r.remove());
    const quiet = S.clients.filter((c) => diffDays(c.lastTouch) <= -5).sort((a, b) => a.lastTouch.localeCompare(b.lastTouch)).slice(0, 4);
    quiet.forEach((c) => {
      const a = proto.cloneNode(true); a.setAttribute('href', '#/clients/' + c.id);
      a.children[0].textContent = c.name;
      const fu = S.followUps.find((f) => f.clientId === c.id && !f.done && f.draft);
      a.children[1].textContent = fu && diffDays(c.lastTouch) > -9 ? 'Draft ready' : `${-diffDays(c.lastTouch)} days`;
      aside.insertBefore(a, e);
    });
    // coming up
    const hdr2 = byText(aside, 'Coming up');
    const rows2 = []; e = hdr2.nextElementSibling;
    while (e && e.tagName === 'A') { rows2.push(e); e = e.nextElementSibling; }
    const proto2 = rows2[0].cloneNode(true); rows2.forEach((r) => r.remove());
    S.followUps.filter((f) => !f.done && diffDays(f.due) >= 0).sort((a, b) => (a.due + (a.time || '')).localeCompare(b.due + (b.time || ''))).slice(0, 3).forEach((f) => {
      const a = proto2.cloneNode(true); a.setAttribute('href', '#/follow-ups');
      a.children[0].textContent = `${f.name.replace(/^The /, '')} · ${f.title.toLowerCase().replace(/^call about the /, '').replace(/^home /, '')}`;
      a.children[1].textContent = diffDays(f.due) === 0 && f.time ? fmtTime(f.time) : relDay(f.due);
      aside.insertBefore(a, e);
    });
    // These dynamic buckets duplicate the Clients and Follow-ups screens.
    let cursor = hdr.nextElementSibling;
    while (cursor && cursor !== hdr2) { const next = cursor.nextElementSibling; cursor.remove(); cursor = next; }
    cursor = hdr2 && hdr2.nextElementSibling;
    while (cursor && cursor.tagName === 'A') { const next = cursor.nextElementSibling; cursor.remove(); cursor = next; }
    hdr.remove(); if (hdr2) hdr2.remove();
  },
  topbar(app) {
    // today's date labels
    $$('span,div', app).forEach((s) => { if (/^(Wednesday|WEDNESDAY), (September|SEPTEMBER) 23$/.test(ownText(s))) setOwn(s, /^W/.test(ownText(s)) && ownText(s) === ownText(s).toUpperCase() ? longToday().toUpperCase() : longToday()); });
    const sb = $$('button', app).find((b) => /^Search transactions, people, forms/.test(text(b)));
    if (sb) onClick(sb, () => Search.open());
    const nb = $('button[aria-label=Notifications]', app);
    if (nb) {
      const unread = S.notifications.filter((n) => !n.read).length;
      nb.style.position = 'relative';
      if (unread) nb.appendChild(html(`<span class="dot-badge">${unread}</span>`));
      onClick(nb, () => Notifs.open(nb));
    }
  },
};

const Notifs = {
  open(anchor) {
    const items = S.notifications.slice(0, 8);
    const m = openMenu(anchor, [{ header: 'Notifications' }, ...(items.length ? items.map((n) => ({ label: n.title, meta: n.read ? '' : '•', onClick: () => { n.read = true; saveDB(); if (n.link) Router.go(n.link); } })) : [{ label: 'You are all caught up' }]), '-', { label: 'Mark all as read', onClick: () => commit((s) => s.notifications.forEach((n) => (n.read = true))) }, { label: 'Notification settings', onClick: () => Router.go('#/settings/notifications') }], { align: 'right', width: 320 });
    $$('.menu-i', m).forEach((b, i) => { const n = items[i]; if (n) b.insertAdjacentHTML('beforeend', `<span class="menu-sub">${esc(n.body)}</span>`); });
  },
};

const Search = {
  open() {
    const el = openSheet({
      title: 'Search', width: 620,
      body: `<div class="search-box">${ICON.search}<input class="search-in" style="border: 0; box-shadow: none; background: transparent;" placeholder="Search transactions, people, forms" data-nopersist></div><div class="search-res"></div>`,
      onMount: (m) => {
        const inp = $('.search-in', m); const res = $('.search-res', m);
        const run = () => {
          const q = inp.value.trim().toLowerCase();
          const groups = [
            ['Transactions', S.tx.filter((t) => !q || (txLabel(t) + ' ' + (t.city || '') + ' ' + clientName(t)).toLowerCase().includes(q)).slice(0, 6).map((t) => [txLabel(t), `${t.city || ''} · ${t.side} · ${t.phase}`, '#/tx/' + t.id, ICON.folder])],
            ['Clients', S.clients.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 5).map((c) => [c.name, `${c.type} · ${c.stage}`, '#/clients/' + c.id, ICON.user])],
            ['Contacts', S.contacts.filter((c) => q && (c.name + ' ' + c.company).toLowerCase().includes(q)).slice(0, 5).map((c) => [c.name, `${c.company} · ${c.type}`, '#/contacts?q=' + encodeURIComponent(c.name), ICON.user])],
            ['Forms', FORM_LIBRARY.filter((f) => q && (f.code + ' ' + f.name).toLowerCase().includes(q)).slice(0, 5).map((f) => [f.code + ' · ' + f.name, `${f.pages} pages · ${f.cat}`, '#/forms?q=' + encodeURIComponent(f.code), ICON.doc])],
            ['Work items', S.tasks.filter((w) => q && w.status !== 'done' && w.title.toLowerCase().includes(q)).slice(0, 5).map((w) => [w.title, `${w.type} · ${relDay(w.due) || 'no date'}`, w.txId ? '#/tx/' + w.txId : '#/agenda', ICON.cal])],
          ].filter((g) => g[1].length);
          res.innerHTML = groups.length ? groups.map(([g, rows]) => `<div class="sr-g">${g}</div>` + rows.map(([t, s, h, ic]) => `<a class="sr-i" href="${h}">${ic}<span><b>${esc(t)}</b><small>${esc(s)}</small></span></a>`).join('')).join('')
            : `<div class="sr-empty">No matches. <a href="#/chat/new?q=${encodeURIComponent(inp.value)}">Ask Sofia about “${esc(inp.value)}”</a></div>`;
          $$('a', res).forEach((a) => a.addEventListener('click', () => closeOverlays()));
        };
        inp.addEventListener('input', run);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = $('a', res); if (a) { closeOverlays(); location.hash = a.getAttribute('href'); } } });
        run();
      },
    });
    return el;
  },
};

const Auth = {
  open: ['/signin', '/signup'],
  guard(path) {
    if (!S.session.signedIn && !this.open.includes(path)) return '#/signin';
    if (S.session.signedIn && this.open.includes(path)) return '#/home';
    if (S.session.signedIn && !S.session.onboarded && !path.startsWith('/onboarding')) return '#/onboarding/about';
    return null;
  },
  signIn(email) {
    S.session.signedIn = true; S.session.onboarded = true;
    if (email && email.includes('@')) S.user.email = email;
    saveDB(); Router.go('#/home'); toast(`Welcome back, ${S.user.first}`);
  },
  signUp({ name, email }) {
    // new workspace: start from a fresh, empty account but keep the sample library data available
    const parts = norm(name).split(' ');
    S.user.first = parts[0] || 'there'; S.user.last = parts.slice(1).join(' ');
    if (email) S.user.email = email;
    S.session.signedIn = true; S.session.onboarded = false; S.session.firstWeek = true;
    saveDB(); Router.go('#/onboarding/about');
  },
  signOut() { S.session.signedIn = false; saveDB(); Router.go('#/signin'); },
};
