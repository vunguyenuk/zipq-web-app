/* Routes → screen template + controller */
const isPhone = () => window.innerWidth < 760;
const ctl = (name, fn) => (app, p, q) => { try { fn(app, p, q); } catch (e) { console.error('[' + name + ']', e); } };

Router.add('/signin', () => ({ screen: 'signin', ctrl: ctl('signin', (a) => Onboarding.signin(a)) }));
Router.add('/signup', () => ({ screen: 'signup', ctrl: ctl('signup', (a) => Onboarding.signup(a)) }));
Router.add('/onboarding/about', () => ({ screen: 'onbAbout', ctrl: ctl('onbAbout', (a) => Onboarding.about(a)) }));
Router.add('/onboarding/brokerage', () => ({ screen: 'onbBrokerage', ctrl: ctl('onbBrokerage', (a) => Onboarding.brokerage(a)) }));
Router.add('/onboarding/connect', () => ({ screen: 'onbConnect', ctrl: ctl('onbConnect', (a) => Onboarding.connect(a)) }));

Router.add('/home', () => {
  if (isPhone()) return { screen: 'phoneHome', ctrl: ctl('phoneHome', (a) => Home.phone(a)) };
  return S.session.firstWeek ? { screen: 'homeFirstWeek', ctrl: ctl('homeFirstWeek', (a) => Home.firstWeek(a)) } : { screen: 'home', ctrl: ctl('home', (a) => Home.ctrl(a)) };
});
Router.add('/voice', () => ({ screen: 'home', ctrl: ctl('home', (a) => Home.ctrl(a)), after: () => Voice.open() }));
Router.add('/chat', () => ({ redirect: '#/chat/' + ((S.chats[0] && S.chats[0].id) || 'new') }));
Router.add('/chat/:chat', (p, q) => {
  if (p.chat === 'new') { const id = Chats.create(q); return { redirect: '#/chat/' + id }; }
  if (!byId('chats', p.chat)) return { redirect: '#/chat/new' };
  return { screen: 'chat', ctrl: ctl('chat', (a) => Chats.ctrl(a, p.chat)) };
});

Router.add('/transactions', () => ({ screen: 'transactions', ctrl: ctl('transactions', (a, p, q) => TxList.ctrl(a, p, q)) }));
Router.add('/tx/:id', (p) => txRoute(p, 'txOverview', 'overview'));
Router.add('/tx/:id/timeline', (p) => txRoute(p, 'txTimeline', 'timeline'));
Router.add('/tx/:id/checklist', (p) => txRoute(p, 'txChecklist', 'checklist'));
Router.add('/tx/:id/documents', (p) => txRoute(p, 'txDocuments', 'documents'));
Router.add('/tx/:id/log', (p) => txRoute(p, 'txLog', 'log'));
Router.add('/tx/:id/activity', (p) => txRoute(p, 'txTimeline', 'activity'));
function txRoute(p, screen, tab) {
  if (!txOf(p.id)) return { redirect: '#/transactions' };
  S.lastTx = p.id; saveDB();
  return { screen, ctrl: ctl(screen, (a) => TxDetail.ctrl(a, txOf(p.id), tab)) };
}
Router.add('/form/:id/:code', (p) => (txOf(p.id) ? { screen: 'formEditor', ctrl: ctl('formEditor', (a) => FormEditor.ctrl(a, txOf(p.id), p.code)) } : { redirect: '#/transactions' }));
Router.add('/send/:id', (p, q) => (txOf(p.id) ? { screen: 'sendSignature', ctrl: ctl('sendSignature', (a) => SendSig.ctrl(a, txOf(p.id), q)) } : { redirect: '#/transactions' }));

Router.add('/agenda', () => ({ screen: 'agenda', ctrl: ctl('agenda', (a, p, q) => Agenda.ctrl(a, 'tx', q)) }));
Router.add('/agenda/people', () => ({ redirect: '#/agenda' }));
Router.add('/agenda/calendar', () => ({ screen: 'agendaCalendar', ctrl: ctl('agendaCalendar', (a, p, q) => Agenda.calendar(a, q)) }));
Router.add('/agenda/new-task', (p, q) => ({ screen: 'agenda', ctrl: ctl('agenda', (a) => Agenda.ctrl(a, 'tx', q)), after: () => Agenda.openTask({ ...q, fromRoute: true }) }));
Router.add('/agenda/event', (p, q) => ({ screen: 'agenda', ctrl: ctl('agenda', (a) => Agenda.ctrl(a, 'tx', q)), after: () => Agenda.openEvent({ ...q, fromRoute: true }) }));
Router.add('/agenda/event/:eid', (p, q) => ({ screen: 'agenda', ctrl: ctl('agenda', (a) => Agenda.ctrl(a, 'tx', q)), after: () => Agenda.openEvent({ id: p.eid, fromRoute: true }) }));

Router.add('/clients', (p, q) => ({ screen: 'clientsTable', ctrl: ctl('clientsTable', (a) => Clients.table(a, q)) }));
Router.add('/clients/table', (p, q) => ({ screen: 'clientsTable', ctrl: ctl('clientsTable', (a) => Clients.table(a, q)) }));
Router.add('/clients/:cid', (p, q) => {
  if (!byId('clients', p.cid)) return { redirect: '#/clients' };
  return { redirect: '#/clients/table?c=' + p.cid };
});
Router.add('/follow-ups', (p, q) => ({ screen: 'followUps', ctrl: ctl('followUps', (a) => FollowUps.ctrl(a, q)) }));
Router.add('/contacts', (p, q) => ({ screen: 'contacts', ctrl: ctl('contacts', (a) => Contacts.ctrl(a, q)) }));

Router.add('/forms', (p, q) => ({ screen: 'forms', ctrl: ctl('forms', (a) => Forms.library(a, q)) }));
Router.add('/templates', (p, q) => ({ screen: 'templates', ctrl: ctl('templates', (a) => Forms.templates(a, q)) }));
Router.add('/templates/:tid', (p, q) => ({ screen: 'templatePlaybook', ctrl: ctl('templatePlaybook', (a) => Forms.playbook(a, p.tid, q)) }));

Router.add('/settings', (p, q) => ({ screen: 'settings', ctrl: ctl('settings', (a) => Settings.profile(a, q)) }));
Router.add('/settings/security', () => ({ screen: 'settingsSecurity', ctrl: ctl('settingsSecurity', (a) => Settings.security(a)) }));
Router.add('/settings/notifications', () => ({ screen: 'settingsNotifications', ctrl: ctl('settingsNotifications', (a) => Settings.notifications(a)) }));
Router.add('/settings/routines', () => ({ screen: 'routines', ctrl: ctl('routines', (a) => Settings.routines(a)) }));
Router.add('/settings/:section', (p) => ({ screen: 'settings', ctrl: ctl('settings', (a) => Settings.profile(a, { section: p.section })) }));

document.addEventListener('DOMContentLoaded', boot);
