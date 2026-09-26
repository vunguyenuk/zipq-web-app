// Build: unpack the Claude Design bundle -> normalized screen templates -> single-file web app (index.html)
// Usage: node build.mjs            (writes index.html)
//        node build.mjs --dump     (also writes .screens/*.html for inspection)
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SEG_CARD_SHADOW = '0 0 0 1px #E3E3E3, rgba(0,0,0,0.14) 0px 0.3px 1.5px -1.5px, rgba(0,0,0,0.114) 0px 1.14px 5.72px -3px, rgba(0,0,0,0.016) 0px 5px 25px -4.5px';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'Estio — Sofia-first redesign.html');
const OUT = path.join(ROOT, 'index.html');

function readBundle(html) {
  const get = (t) => {
    const m = html.match(new RegExp('<script type="__bundler/' + t + '">([\\s\\S]*?)</script>'));
    return m ? m[1] : null;
  };
  const manifest = JSON.parse(get('manifest'));
  const template = JSON.parse(get('template'));
  const res = {};
  for (const [k, v] of Object.entries(manifest)) {
    let d = Buffer.from(v.data, 'base64');
    if (v.compressed) d = zlib.gunzipSync(d);
    res[k] = { mime: v.mime, data: d };
  }
  return { template, res };
}

// Screen key for every board title in the design file
const TITLE_TO_KEY = {
  '1 · Home — Sofia first': 'home',
  '2 · Sofia conversation': 'chat',
  'Web · phone Home': 'phoneHome',
  '3 · Transactions (grouped list)': 'transactions',
  '4 · Transaction detail': 'txOverview',
  '5 · Form editor': 'formEditor',
  '6 · Send for signature': 'sendSignature',
  '4c · Transaction — Documents &amp; signing': 'txDocuments',
  '8 · Agenda — by transaction': 'agenda',
  '9 · Clients — Split view': 'clients',
  '4d · Transaction — Checklist (transaction + form level)': 'txChecklist',
  '11 · Forms — Library': 'forms',
  '12 · Forms — Templates (forms + playbook)': 'templates',
  '13 · Contacts': 'contacts',
  '14 · Settings': 'settings',
  '15 · Sign in': 'signin',
  '16 · Create account': 'signup',
  '17 · Onboarding with Sofia': 'onbBrokerage',
  '18 · Settings — Security': 'settingsSecurity',
  '19 · Settings › Sofia routines (real-time + scheduled)': 'routines',
  '17b · Onboarding — connect tools': 'onbConnect',
  '1b · Home — first week': 'homeFirstWeek',
  '4b · Transaction — Timeline': 'txTimeline',
  '16b · Onboarding — about you': 'onbAbout',
  '8b · Agenda — People (CRM)': 'agendaPeople',
  '8c · Agenda — Calendar': 'agendaCalendar',
  '8d · Agenda — edit event': 'agendaEvent',
  '8e · Agenda — new task': 'agendaTask',
  '4e · Transaction — Communication log (group chat)': 'txLog',
  '12b · Forms — Template playbook': 'templatePlaybook',
  '18b · Settings — Notifications': 'settingsNotifications',
  '9b · Clients — Table (detail as overlay)': 'clientsTable',
  '9c · Relationships — Follow-ups': 'followUps',
};

// Links in the design point at "<Name>.dc.html" — map them to app routes.
// "@tx" is resolved at runtime to the current / default transaction id.
const DC_TO_ROUTE = {
  Main: '#/home', MainFirstWeek: '#/home', Conversation: '#/chat', IOSVoice: '#/voice',
  Workspace: '#/transactions', Transaction: '#/tx/@tx', TransactionTimeline: '#/tx/@tx/timeline',
  TransactionChecklist: '#/tx/@tx/checklist', TransactionDocuments: '#/tx/@tx/documents', TransactionCommLog: '#/tx/@tx/log',
  FormEditor: '#/form/@tx/RPA', SendSignature: '#/send/@tx',
  Agenda: '#/agenda', AgendaCRM: '#/agenda/people', AgendaCalendar: '#/agenda/calendar',
  AgendaEvent: '#/agenda/event', AgendaNewTask: '#/agenda/new-task',
  Relationships: '#/clients', RelationshipsTable: '#/clients/table', RelationshipsFollowUps: '#/follow-ups', Contacts: '#/contacts',
  Forms: '#/forms', Templates: '#/templates', TemplatePlaybook: '#/templates/buyer-standard',
  Settings: '#/settings', SettingsSecurity: '#/settings/security', SettingsNotifications: '#/settings/notifications', Routines: '#/settings/routines',
  Login: '#/signin', SignUp: '#/signup', OnboardingAbout: '#/onboarding/about', Onboarding: '#/onboarding/brokerage', OnboardingConnect: '#/onboarding/connect',
};

const root = readBundle(fs.readFileSync(SRC, 'utf8'));
const boards = [...root.template.matchAll(/<h2>(.*?)<\/h2>\s*<iframe src="about:blank#([0-9a-f-]+)"/g)].map((m) => ({ title: m[1], id: m[2] }));

const assets = new Map(); // hash -> {mime, b64}
const screens = {};
const extraCss = new Set();
let fontCss = '';

for (const b of boards) {
  const key = TITLE_TO_KEY[b.title];
  if (!key) throw new Error('Unknown board: ' + b.title);
  const page = readBundle(root.res[b.id].data.toString('utf8'));
  let html = page.template;
  for (const [k, r] of Object.entries(page.res)) {
    const h = crypto.createHash('md5').update(r.data).digest('hex').slice(0, 10);
    if (!assets.has(h)) assets.set(h, { mime: r.mime, b64: r.data.toString('base64') });
    html = html.split(k).join('asset:' + h);
  }
  const helmet = html.slice(html.indexOf('<helmet>') + 8, html.indexOf('</helmet>'));
  for (const st of helmet.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    if (st[1].includes('@font-face')) { if (!fontCss) fontCss = st[1]; continue; }
    st[1].trim().split('\n').forEach((l) => extraCss.add(l.trim()));
  }
  let body = html.slice(html.indexOf('</helmet>') + 9, html.indexOf('</x-dc>'));
  screens[key] = normalize(body, key);
}

function normalize(s, key) {
  s = s.replace(/sc-camel-view-box=/g, 'viewBox=');
  s = s.replace(/<sc-raw-select/g, '<select').replace(/<\/sc-raw-select>/g, '</select>');
  s = s.replace(/aria-pressed="\{\{isAsk\}\}" sc-camel-on-click="\{\{setAsk\}\}"/g, 'data-mode-btn="ask"');
  s = s.replace(/aria-pressed="\{\{isAgent\}\}" sc-camel-on-click="\{\{setAgent\}\}"/g, 'data-mode-btn="agent"');
  s = s.replace(/ \{\{askStyle\}\}| \{\{agentStyle\}\}/g, '');
  s = s.replace(/<sc-if value="\{\{isAgent\}\}"[^>]*>/g, '<span data-mode-hint="agent">').replace(/<sc-if value="\{\{isAsk\}\}"[^>]*>/g, '<span data-mode-hint="ask">').replace(/<\/sc-if>/g, '</span>');
  s = s.replace(/href="([A-Za-z]+)\.dc\.html"/g, (m, n) => `href="${DC_TO_ROUTE[n] || '#/home'}"`);
  if (key !== 'phoneHome') {
    s = s.replace(/width: 1440px; height: 960px;/, 'width: 100%; height: 100vh;');
    s = s.replace(/height: 960px;/g, 'height: 100vh;');
    s = s.replace(/width: 1440px;/g, 'width: 100%;');
  }
  // images: reference shared asset map instead of inlining the same jpeg 60x
  s = s.replace(/src="asset:([0-9a-f]+)"/g, 'data-asset="$1" src=""');
  return s.trim();
}

const css = [...extraCss].join('\n');
const assetCss = fontCss.replace(/url\("asset:([0-9a-f]+)"\)/g, (m, h) => `url(data:${assets.get(h).mime};base64,${assets.get(h).b64})`);
const imageAssets = Object.fromEntries([...assets.entries()].filter(([, a]) => a.mime.startsWith('image/')).map(([h, a]) => [h, `data:${a.mime};base64,${a.b64}`]));

const appCss = fs.readFileSync(path.join(ROOT, 'src/app.css'), 'utf8');
const appJsParts = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => f.endsWith('.js')).sort();
const appJs = appJsParts.map((f) => `// ---- ${f} ----\n` + fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
const templates = Object.entries(screens).map(([k, v]) => `<template data-screen="${k}">${v}</template>`).join('\n');

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Estio</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23020617'/%3E%3Ctext x='16' y='22' font-size='17' font-family='Arial' font-weight='700' fill='white' text-anchor='middle'%3EE%3C/text%3E%3C/svg%3E">
<style>${assetCss}</style>
<style>${css}</style>
<style>${appCss}</style>
</head>
<body>
<div id="app"></div>
<div id="overlay-root"></div>
<div id="toast-root"></div>
${templates}
<script>window.ASSETS = ${JSON.stringify(imageAssets)};</script>
<script>
${appJs}
</script>
</body>
</html>`;
fs.writeFileSync(OUT, applyTheme(out));

/* ---------- Theme: Segment UI (exact tokens from megauikit.framer.website) ----------
 * Dark (neutral): 900 #0F0F0F · 800 #1A1A1A · 700 #1C1C1C · 600 #2E2E2E · 500 #424242 · 400 #636363
 *                 300 #878787 · 200 #BDBDBD · 100 #E3E3E3 · 50 #EDEDED · 25 #FAFAFA · 0 #FFFFFF
 * Primary:        900 #130051 · 800 #240081 · 700 #3800BC · 600 #4A2BE4 · 500 #594FEE · 400 #7072FF
 *                 300 #8D96FF · 200 #ADB7FF · 100 #CFD6FF · 50 #F3F4FF · 25 #FAFAFF
 * Auxiliary:      green #00C22A · orange #FFAE00 · red #F06837 · overlay #0F0F0FB3 · overlay white #FFFFFF80
 * Buttons r12 (primary flat #594FEE / secondary white + 1px #E3E3E3) · inputs r8 inset 1px #E3E3E3 · cards r8–16
 * Build with `node build.mjs --theme=original` to keep the original Estio palette. */
function applyTheme(s) {
  if (process.argv.includes('--theme=original')) return s;
  const map = {
    // shadows (whole strings)
    '0 0 0 1px rgba(2,6,23,0.05), 0 1px 2px rgba(2,6,23,0.05), 0 6px 20px -6px rgba(2,6,23,0.08)': SEG_CARD_SHADOW,
    '0 0 0 1px rgba(2,6,23,0.08), 0 1px 2px rgba(2,6,23,0.08)': '0 0 0 1px #E3E3E3',
    '0 1px 2px rgba(2,6,23,0.12)': 'rgba(52,58,75,0.16) 0px 1px 3px 0px',
    '0 1px 2px rgba(2,6,23,0.14)': 'rgba(52,58,75,0.16) 0px 1px 3px 0px',
    '0 10px 28px -6px rgba(4,99,202,0.55), 0 2px 6px rgba(2,6,23,0.12)': 'rgba(0,0,0,0.12) 0px 0.3px 1.5px -1.33px, rgba(0,0,0,0.106) 0px 1.14px 5.72px -2.67px, rgba(0,0,0,0.03) 0px 5px 25px -4px',
    '-24px 0 48px -12px rgba(2,6,23,0.22), 0 0 0 1px rgba(2,6,23,0.06)': '-1px 0 0 #EDEDED, rgba(0,0,0,0.08) -10px 0 30px -4px',
    '0 1px 2px rgba(2,6,23,0.04), 0 12px 32px rgba(2,6,23,0.06)': SEG_CARD_SHADOW,
    '0 8px 24px rgba(2,6,23,0.05)': SEG_CARD_SHADOW,
    'rgba(3,79,159,0.28)': 'rgba(89,79,238,0.25)', 'rgba(3,79,159,.28)': 'rgba(89,79,238,.25)',
    'rgba(4,99,202,': 'rgba(89,79,238,', 'rgba(2,6,23,0.35)': 'rgba(15,15,15,0.7)', 'rgba(246,248,255,0)': 'rgba(250,250,250,0)',
    // primary (blue → Segment primary scale)
    '#0463CA': '#594FEE', '#0463ca': '#594FEE', '#034F9F': '#4A2BE4', '#034f9f': '#4A2BE4',
    '#E3F0FC': '#F3F4FF', '#EEF4FF': '#FAFAFF', '#EEF4FB': '#FAFAFF', '#F3F9FF': '#FAFAFF', '#F8FAFF': '#FAFAFF',
    '#D6E4FA': '#CFD6FF', '#DCE7F7': '#F3F4FF', '#DCEAFB': '#F3F4FF',
    '#9CC3EE': '#ADB7FF', '#9DC2ED': '#ADB7FF', '#A9CBF1': '#ADB7FF',
    // neutrals (slate → Segment dark scale)
    '#020617': '#0F0F0F', '#1E293B': '#1C1C1C', '#334155': '#424242', '#64748B': '#636363', '#94A3B8': '#878787',
    '#8A93A2': '#878787', '#9AA7B7': '#878787', '#A7B1BF': '#BDBDBD', '#CBD5E1': '#BDBDBD', '#B9C6D6': '#BDBDBD',
    '#E2E8F0': '#E3E3E3', '#E9EEF5': '#EDEDED', '#EEF2F6': '#EDEDED', '#EEF1F6': '#EDEDED', '#F1F5F9': '#EDEDED',
    '#F8FAFC': '#FAFAFA', '#FBFCFE': '#FAFAFA', '#FCFDFF': '#FFFFFF', '#F6F8FF': '#FAFAFA',
    // auxiliary accents (dots, progress) → Segment green / orange
    '#1F9D6B': '#00C22A', '#E0A100': '#FFAE00',
    // active tab underline → primary (kit tab indicator)
    'inset 0 -2px 0 #020617': 'inset 0 -2px 0 #594FEE',
  };
  const keys = Object.keys(map).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  s = s.replace(new RegExp(keys.join('|'), 'g'), (m) => map[m]);
  const css = `<style id="segment-theme">
:root { --seg-primary: #594FEE; --seg-primary-600: #4A2BE4; --seg-border: #E3E3E3; --seg-bg: #FAFAFA; }
body { background: #FAFAFA; }
/* Buttons — Segment UI: r12, 500 weight, primary flat #594FEE, secondary white + 1px #E3E3E3 */
a[style*="background: #594FEE"]:not([role=switch]):hover, button[style*="background: #594FEE"]:not([role=switch]):hover { background: #4A2BE4 !important; }
.btn { border-radius: 12px; font-weight: 500; box-shadow: inset 0 0 0 1px #E3E3E3; color: #0F0F0F; }
.btn:hover { background: #FAFAFA; }
.btn-primary { background: #594FEE; box-shadow: none; color: #fff; }
.btn-primary:hover { background: #4A2BE4; }
.btn-danger { box-shadow: none; }
/* Inputs — r8, inset 1px #E3E3E3, focus inset primary */
.input { border: 0; border-radius: 8px; box-shadow: inset 0 0 0 1px #E3E3E3; color: #0F0F0F; }
.input:focus { box-shadow: inset 0 0 0 1px #594FEE, 0 0 0 3px #F3F4FF; }
.flabel { font-weight: 500; font-size: 14px; color: #636363; }
input:not([type=checkbox]):not([type=radio]):focus, textarea:focus, select:focus { outline: none; }
/* Pills / tabs — active #FAFAFF + #ADB7FF border + #3800BC text */
.chip-b { border-color: #E3E3E3; color: #424242; font-weight: 400; }
.chip-b.on { background: #FAFAFF; border-color: #ADB7FF; color: #3800BC; }
/* Hover states */
.card:hover, .chip:hover { border-color: #BDBDBD !important; }
.row:hover { background: #FAFAFA !important; }
.nav:hover, .subnav:hover { background: #FAFAFF !important; }
/* Dropdown — white, 1px #EDEDED, r12, shadow 0 0 10px -4px, items r10 */
.menu { border-radius: 12px; padding: 4px; box-shadow: 0 0 0 1px #EDEDED, rgba(0,0,0,0.08) 0px 0px 10px -4px !important; }
.menu-i { border-radius: 10px; padding: 8px 12px; font-size: 14px; color: #424242; }
.menu-i:hover { background: #FAFAFA; }
.menu-i.checked { color: #4A2BE4; }
.modal { border-radius: 16px; box-shadow: ${SEG_CARD_SHADOW} !important; }
.drawer { box-shadow: -1px 0 0 #EDEDED, rgba(0,0,0,0.08) -10px 0 30px -4px !important; }
.scrim { background: rgba(15,15,15,0.7); }
/* Tooltip / toast — #0F0F0F, r12 */
.toast { background: #0F0F0F; border-radius: 12px; font-weight: 400; font-size: 14px; }
.toast-dot { background: #00C22A; }
.dot-badge { background: #F06837; }
/* Headings — Inter 600, tight tracking like the kit */
h1 { letter-spacing: -0.03em !important; }
h2 { letter-spacing: -0.015em; }
/* Sofia avatar orb → primary hue */
img[data-asset="2141beaaf5"], img[src^="data:image/jpeg"] { filter: hue-rotate(22deg) saturate(1.05); }
::selection { background: #CFD6FF; }
/* Toggle — kit: 48×24 track, 4px padding, 16px knob with layered shadow; off #E3E3E3, on primary */
[role=switch] { width: 44px !important; height: 24px !important; border-radius: 1000px !important; flex-shrink: 0; transition: background .15s; }
[role=switch][aria-checked="false"] { background: #E3E3E3 !important; }
[role=switch][aria-checked="true"] { background: #594FEE !important; }
[role=switch] > span { width: 16px !important; height: 16px !important; top: 4px !important; border-radius: 1999px !important; transition: left .15s !important;
  box-shadow: rgba(0,0,0,0.18) 0px 0.6px 0.24px -1.25px, rgba(0,0,0,0.16) 0px 2.29px 0.92px -2.5px, rgba(0,0,0,0.063) 0px 10px 4px -3.75px; }
[role=switch][aria-checked="true"] > span { left: 24px !important; }
[role=switch][aria-checked="false"] > span { left: 4px !important; }
/* Checkbox — r4, 1px #BDBDBD, checked primary */
[role=checkbox] { border-radius: 4px !important; }
[role=checkbox][aria-checked="false"] { box-shadow: inset 0 0 0 1px #BDBDBD !important; background: #FFFFFF !important; }
[role=checkbox][aria-checked="true"] { background: #594FEE !important; box-shadow: none !important; }
/* Pressed chips (drawer types, filters) — kit pill active state */
button[aria-pressed="true"]:not([data-mode-btn]):not([aria-label*="mode" i] > *) { background: #FAFAFF !important; box-shadow: inset 0 0 0 1px #ADB7FF !important; color: #3800BC !important; }
</style>`;
  return s.replace('</head>', css + '\n</head>');
}

if (process.argv.includes('--dump')) {
  fs.mkdirSync(path.join(ROOT, '.screens'), { recursive: true });
  for (const [k, v] of Object.entries(screens)) fs.writeFileSync(path.join(ROOT, '.screens', k + '.html'), v);
}
console.log('Built', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + ' MB,', Object.keys(screens).length, 'screens');
