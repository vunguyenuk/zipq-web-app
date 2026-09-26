import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const core = read('src/00-core.js');
const data = read('src/10-data.js');
const shell = read('src/20-shell.js');
const settings = read('src/70-settings.js');
const followUps = read('src/60-relationships.js');
const agenda = read('src/55-agenda.js');
const forms = read('src/65-forms.js');
const css = read('src/system.css');
const readability = read('src/readability.css');
const template = read('.screens/followUps.html');
const homeTemplate = read('.screens/home.html');
const firstWeekTemplate = read('.screens/homeFirstWeek.html');
const phoneHomeTemplate = read('.screens/phoneHome.html');
const built = read('index.html');

// Every origin receives the same complete demo workspace on first load. A
// schema bump intentionally replaces incompatible persisted demo state once,
// then boot writes the canonical seed back to localStorage.
assert(data.includes('const SEED_VERSION = 4;'), 'Demo storage schema version changed unexpectedly');
assert(/session:\s*\{[\s\S]*?signedIn:\s*true,[\s\S]*?sidebarCollapsed:\s*false,[\s\S]*?textScale:\s*'standard'/.test(data), 'Canonical demo session state is incomplete');
assert(/S = loadDB\(\);\s*saveDB\(\);/.test(core), 'Boot must persist the canonical seed to localStorage');

// Both desktop Home states share the current hero/composer. The old inline
// priority-count headline and demo deadline copy must not ship again.
const homeHero = homeTemplate.slice(0, homeTemplate.indexOf('<section aria-label="Today\'s Work Items"'));
const firstWeekHero = firstWeekTemplate.slice(0, firstWeekTemplate.indexOf('<section aria-label="Get started"'));
assert(homeHero.includes('Your transactions and priorities are ready below.'), 'Everyday Home is missing the current intro');
assert(firstWeekHero.includes('Welcome to Estio. Let\'s get your first transaction moving.'), 'First-week Home intro changed unexpectedly');
assert.equal((homeHero.match(/aria-label="Message Sofia"/g) || []).length, 1, 'Everyday Home must have one composer');
assert(!homeHero.includes('Five things need you today'), 'Legacy desktop Home hero returned');
assert(!phoneHomeTemplate.includes('Five things need you today'), 'Legacy phone Home demo copy returned');
assert(homeTemplate.includes('<section aria-label="Today\'s Work Items"'), 'Operational Home work area was lost');

// Keep the three status destinations visible. An earlier CSS override hid Done
// even though the controller still supported its route.
const statusNav = template.match(/<nav aria-label="Follow-up status"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert(statusNav, 'Follow-up status navigation is missing');
for (const label of ['Due', 'Upcoming', 'Done']) {
  assert(new RegExp(`>${label}<span`).test(statusNav), `${label} tab is missing`);
}
assert(followUps.includes("this.tab === 'Upcoming' ? upcoming : done"), 'Done tab has no list data');
assert(followUps.includes("'#/follow-ups?tab=' + k"), 'Status tabs lack distinct routes');
assert(!/data-screen=['"]followUps['"][^{]*Follow-up status[^\n]*nth-child\(3\)/.test(css), 'Done tab is hidden by CSS');
assert(built.includes('Follow-up status'), 'Generated app is missing Follow-ups');
assert(shell.includes('class="nav sidebar-design-system-link" href="design-system/index.html"'), 'Sidebar is missing its Design system link');
assert(shell.includes("{ label: 'Design system', onClick: () => location.assign('design-system/index.html') }"), 'Compact navigation is missing Design system');
assert(fs.existsSync(path.join(root, 'design-system/index.html')), 'Design system destination does not exist');

// The persistent rail owns the visible profile entry. It must open the same
// account menu as the full sidebar so users can reach auth again via Sign out.
assert(shell.includes('class="app-rail-avatar" type="button" aria-label="Open profile menu" aria-haspopup="menu"'), 'Rail avatar is not an accessible profile-menu button');
assert(shell.includes("onClick($('.app-rail-avatar', rail), (e, button) => this.profileMenu(button))"), 'Rail avatar does not open the profile menu');
assert(shell.includes("{ label: 'Sign out', danger: true, onClick: () => Auth.signOut() }"), 'Profile menu is missing Sign out');
assert(/\.settings-layout > :last-child\s*\{[\s\S]*?overflow-y:\s*auto !important;/.test(css), 'Settings content column is not vertically scrollable');

// Template summaries need explicit hooks and token spacing. Generic page-head
// rules previously overrode only the reuse banner's top padding, while a
// display:block card rule silently disabled its vertical gap.
assert(forms.includes("gridRegion.classList.add('template-grid-region')"), 'Templates grid region lacks its layout hook');
assert(forms.includes("grid.classList.add('template-grid')"), 'Templates grid lacks its layout hook');
assert(/data-screen='templates'[^}]*\.template-assist\s*\{[\s\S]*?padding:\s*var\(--space-md\)\s*!important;/.test(css), 'Reuse banner must have equal token padding');
assert(/\.template-grid\s*\{[^}]*gap:\s*var\(--space-lg\)\s*!important;/.test(css), 'Template grid gap is not tokenized');
assert(/\.template-card\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?gap:\s*var\(--space-md\)\s*!important;[\s\S]*?padding:\s*var\(--space-lg\)\s*!important;/.test(css), 'Template card stack spacing regressed');
assert(/\.template-card-preview > \*\s*\{[^}]*min-height:\s*32px\s*!important;/.test(css), 'Template preview rows are too compressed');

// Routine headers use a single sentence-case supporting-text role. The build
// language pass must preserve capitalization instead of flattening Automatic
// to lowercase while Scheduled remains tracked uppercase.
assert(settings.includes("group.classList.add('routine-group-header')"), 'Routine group headers lack semantic typography hooks');
assert(built.includes('>Automatic<span') && built.includes('>Scheduled<span'), 'Routine group labels are not title-cased consistently');
for (const label of ['Trigger · Last run', 'Schedule · Last run', 'Your call · Produces']) {
  assert(built.includes(`>${label}</span>`), `${label} is not sentence case`);
}
assert(!built.includes('>TRIGGER · LAST RUN</span>') && !built.includes('>YOUR CALL · PRODUCES</span>'), 'Tracked all-caps routine columns returned');
assert(/\.routine-group-columns,[\s\S]*?\.routine-group-count\s*\{[\s\S]*?font-size:\s*var\(--reading-support\)\s*!important;[\s\S]*?letter-spacing:\s*0\s*!important;/.test(readability), 'Routine header typography is not bound to the supporting-text token');

// Event links are kept for native keyboard semantics, while the controller
// opens their editor in place. Falling through to the href switches to List.
assert(agenda.includes('onClick(el, () => this.openEvent({ id: e.id }))'), 'Week events must open their editor in Calendar');
assert(agenda.includes('onClick(link, () => this.openEvent({ id: link.getAttribute(\'href\').split(\'/\').pop() }))'), 'Month events must open their editor in Calendar');
assert(agenda.includes("e.target.parentElement === cell"), 'Month event dots must not navigate to Week');
assert(/\.agenda-calendar-grid\s*\{\s*padding-top:\s*0\s*!important;/.test(css), 'Calendar has extra space above its control bar');

// Exercise the real helper against minimal DOM element doubles. This catches
// click-only cards/rows without adding a browser dependency to the prototype.
const helper = core.slice(core.indexOf('function onClick('), core.indexOf('function onText('));
assert(helper.startsWith('function onClick('), 'Cannot locate delegated action helper');
const onClick = vm.runInNewContext(`${helper}\nonClick`);
function element({ tag = 'DIV', role = null, parent = null, tabindex = false } = {}) {
  const attrs = new Map();
  if (role) attrs.set('role', role);
  if (tabindex) attrs.set('tabindex', '0');
  const listeners = new Map();
  const el = {
    tagName: tag,
    style: {},
    parentElement: parent,
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, String(value)),
    hasAttribute: (name) => attrs.has(name),
    matches: (selector) => selector === 'button, a[href], input, select, textarea, summary' && ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(tag),
    addEventListener: (name, fn) => listeners.set(name, [...(listeners.get(name) || []), fn]),
    click: () => { el.clicks += 1; },
    clicks: 0,
    listeners,
  };
  Object.defineProperty(el, 'tabIndex', { set: (value) => attrs.set('tabindex', String(value)), get: () => Number(attrs.get('tabindex') ?? -1) });
  return el;
}
function key(el, value, target = el) {
  let prevented = 0;
  for (const fn of el.listeners.get('keydown') || []) fn({ target, key: value, preventDefault: () => { prevented++; }, stopPropagation() {} });
  return prevented;
}
const card = element();
onClick(card, () => {});
onClick(card, () => {});
assert.equal(card.getAttribute('role'), 'button');
assert.equal(card.tabIndex, 0);
assert.equal(card.listeners.get('keydown').length, 1, 'Repeated binding should not duplicate keyboard activation');
assert.equal(key(card, 'Enter'), 1);
assert.equal(key(card, ' '), 1);
assert.equal(card.clicks, 2);
assert.equal(key(card, 'Escape'), 0);
assert.equal(key(card, 'Enter', {}), 0, 'Child controls must not activate the parent card');
const button = element({ tag: 'BUTTON' });
onClick(button, () => {});
assert.equal(button.listeners.has('keydown'), false, 'Native buttons already support keyboard activation');
const checkbox = element({ role: 'checkbox' });
onClick(checkbox, () => {});
assert.equal(checkbox.listeners.has('keydown'), false, 'Checkbox keyboard handling belongs to its own control');
const nested = element({ parent: { closest: () => ({ tagName: 'BUTTON' }) } });
onClick(nested, () => {});
assert.equal(nested.listeners.has('keydown'), false, 'Do not nest a focus stop inside a native control');

console.log('PASS Follow-ups Due / Upcoming / Done navigation and data');
console.log('PASS unified Home hero without legacy desktop and phone copy');
console.log('PASS Design system link in sidebar and compact navigation');
console.log('PASS template banner and card spacing contract');
console.log('PASS Sofia routines sentence-case typography contract');
console.log('PASS Calendar padding and in-place week/month event editing');
console.log('PASS delegated actions: Enter, Space, native controls and nested targets');
console.log('PASS canonical demo state is persisted to localStorage');
