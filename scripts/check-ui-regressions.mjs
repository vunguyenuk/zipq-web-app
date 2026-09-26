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
const followUps = read('src/60-relationships.js');
const agenda = read('src/55-agenda.js');
const css = read('src/system.css');
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
console.log('PASS Calendar padding and in-place week/month event editing');
console.log('PASS delegated actions: Enter, Space, native controls and nested targets');
console.log('PASS canonical demo state is persisted to localStorage');
