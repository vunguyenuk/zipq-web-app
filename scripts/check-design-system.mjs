import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const system = read('src/system.css');
const readability = read('src/readability.css');
const catalog = read('design-system/index.html');
const contract = read('design-system/CONTRACT.md');
const specification = read('design-system/SPEC.md');
const app = read('index.html');
const relationships = read('src/60-relationships.js');

function color(name, source = system) {
  const match = source.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert(match, `Missing hex token --${name}`);
  return match[1];
}
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((x) => Number.parseInt(x, 16) / 255);
  const [r, g, b] = channels.map((x) => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

const lightSurfaces = [color('canvas'), color('surface-raised'), color('sidebar-bg', readability)];
for (const token of ['ink', 'ink-2', 'ink-3', 'danger', 'warning', 'success', 'link']) {
  for (const surface of lightSurfaces) {
    const ratio = contrast(color(token), surface);
    assert(ratio >= 4.5, `--${token} contrast ${ratio.toFixed(2)}:1 on ${surface} is below 4.5:1`);
  }
}
assert(readability.includes("html[data-text-scale='comfortable']"), 'Comfortable type mode missing');
assert(readability.includes('.app-navigation-sidebar'), 'Sidebar surface contract missing');
assert(!readability.includes('main :is(p, li, dd)'), 'Do not enlarge every paragraph/list/detail value indiscriminately');
assert(readability.includes('.follow-up-title'), 'Primary follow-up text role missing');
assert(system.includes('--type-section-title: 1rem;'), 'Section titles must use the 16/24 title role');
assert(system.includes('--type-page-title: 1.5rem;'), 'Page headings must use the 24px type token');
assert(system.includes('.type-page-title {\n  font-size: var(--type-page-title) !important;\n  line-height: 1.25 !important;\n  font-weight: 500 !important;'), 'Page headings must use medium weight and 30px leading');
assert(!system.includes("main h1:not(#_t) { font-size: 28px"), 'Home headings must not retain the old 28px override');
assert(system.includes(".sidebar-primary-action > span[style*='flex-grow'] {\n  font-size: var(--type-action) !important;"), 'Sidebar action labels must use the 14px token, including nested text');
assert(system.includes('--type-action: 0.875rem;'), 'Shared action text token must match Ask Sofia at 14px');
assert(system.includes('--type-message: 0.9375rem;'), 'Chat and message text must use the 15px message role');
assert(readability.includes('--type-message: 1.125rem;'), 'Comfortable message text must remain 18px');
for (const role of ['.msg-s .bd', '.msg-u', '.channel-mail-body', '.channel-sms-bubble']) {
  assert(readability.includes(role), `Message text role is missing ${role}`);
}
assert(catalog.includes('<code>--type-message</code>'), 'Catalog must document message typography');
assert(specification.includes('| Message body |'), 'Detailed specification must distinguish messages from long-form reading copy');
assert(readability.includes("html[data-text-scale='comfortable'] {\n  --type-action: 1rem;"), 'Action labels must grow in Comfortable mode');
assert(readability.includes('.ui-button--primary {\n  font-size: var(--type-action)'), 'Primary action labels must use the shared action token');
assert(readability.includes('.ui-action-label {\n  font-size: var(--type-action)'), 'Text-bearing buttons need the action typography role');
assert(readability.includes('#app .estio-screen :is(button:not(.ui-icon-button):not(.icon-btn), a.ui-action-label, input:not('), 'All app buttons and text inputs need the shared control size');
assert(readability.includes('select, textarea),\n#overlay-root'), 'Selects, textareas and dynamic dialogs need the shared control size');
assert(readability.includes('button:not(:has(> div)), a.ui-action-label) > :is(span, b, strong)'), 'Simple button labels must not retain larger inline sizes');
assert(system.includes('.ui-input:not(.ui-input--multiline):not(.ui-input--compact):not(.cs-native) {\n  min-height: var(--control-field) !important;\n  height: var(--control-field) !important;\n  border-radius: var(--radius-input) !important;\n  font-size: var(--type-action)'), 'Field primitive must match Ask Sofia label size');
assert(read('src/25-design-system.js').includes("control.classList.add('ui-action-label')"), 'Action label classification is missing');
assert(system.includes('[data-sofia-fab] { height: 44px !important; padding: 0 16px 0 4px !important; font-size: var(--type-action)'), 'Sofia FAB must be the action-size reference');
assert(system.includes('align-items: baseline !important;\n  column-gap: var(--space-sm)'), 'Client timeline date and description must share a baseline');
assert(system.includes('padding-top: 0 !important;\n  white-space: nowrap'), 'Client timeline dates retain an offset');
assert(readability.includes('.transaction-log-row {\n  align-items: baseline;'), 'Transaction log dates must share the description baseline');
assert(read('src/70-settings.js').includes('Display & readability'), 'Readable text setting missing');
assert(read('src/20-shell.js').includes("aside.classList.add('app-navigation-sidebar')"), 'Sidebar class hook missing');
assert(app.includes('id="zipq-readability"'), 'Generated app is stale: run node build.mjs');
assert(relationships.includes("$('svg', start)?.remove()"), 'Viewing a transaction must not retain the create plus icon');
assert(relationships.includes('rail.children[1].remove()'), 'Duplicate follow-up draft actions remain in Sofia rail');
assert(system.includes('width: min(620px, calc(100vw - 72px))'), 'Client panel width needs room for padded actions');
assert(system.includes('padding-inline: var(--space-sm) !important;'), 'Client actions need horizontal padding');
assert(readability.includes('.client-detail-start-transaction) {\n  font-size: var(--type-action) !important;'), 'Client detail actions must share the action label token');
assert(relationships.includes("if (k === 'Type' || k === 'Stage') b.classList.add('client-filter-control')"), 'Client Type/Stage filters need the shared compact hook');
assert(readability.includes('.client-filter-control {\n  font-size: var(--type-action) !important;'), 'Client Type/Stage filters need the shared action token');
for (const id of ['overview', 'foundations', 'specifications', 'components', 'states', 'patterns', 'templates', 'rules']) {
  assert(catalog.includes(`id="${id}"`), `Catalog section #${id} missing`);
}
for (const heading of ['Decision order', 'Foundations', 'Component contracts', 'Pattern contracts', 'State and accessibility matrix', 'Implementation and acceptance']) {
  assert(specification.includes(heading), `Detailed specification section ${heading} missing`);
}
for (const token of ['--type-action', '--type-page-title', '--page-rail', '--control-touch', '--radius-control', '--sidebar-bg']) {
  assert(specification.includes(token), `Detailed specification omits ${token}`);
}
assert(catalog.includes('href="SPEC.md"'), 'Catalog must link its detailed specification');
assert(contract.includes('SPEC.md'), 'Implementation contract must require the detailed specification');
const componentCount = [...catalog.matchAll(/data-searchable="/g)].length;
assert(componentCount >= 20, `Only ${componentCount} catalog component families; expected 20 or more`);
for (const file of ['AGENTS.md', 'CLAUDE.md']) {
  assert(read(file).includes('design-system/CONTRACT.md'), `${file} must require the contract`);
  assert(read(file).includes('design-system/SPEC.md'), `${file} must require the detailed specification`);
}
for (const name of ['padding', 'font-size', 'font-family', 'color', 'border', 'radius', 'alignment']) {
  assert(contract.toLowerCase().includes(name), `Contract does not cover ${name}`);
}

console.log(`PASS design-system catalog (${componentCount} component families)`);
console.log('PASS detailed specifications, state matrix and agent reading requirements');
console.log('PASS live app stylesheet linkage and agent contracts');
console.log('PASS semantic text contrast ≥ 4.5:1 on canvas, raised and sidebar surfaces');
console.log('PASS selective type hierarchy, client action spacing and follow-up action deduplication');
