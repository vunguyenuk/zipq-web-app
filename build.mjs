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

// The first-week board owns the current Home hero and composer. Reuse it for
// the everyday Home too, while retaining the latter's operational work area.
// This removes the superseded greeting/composer markup from the shipped page.
const homeHeroStart = '<div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center;';
const workAreaStart = '<section aria-label="Today\'s Work Items"';
const setupAreaStart = '<section aria-label="Get started"';
const currentHero = screens.homeFirstWeek.indexOf(homeHeroStart);
const currentWork = screens.homeFirstWeek.indexOf(setupAreaStart);
const legacyHero = screens.home.indexOf(homeHeroStart);
const operationalWork = screens.home.indexOf(workAreaStart);
if ([currentHero, currentWork, legacyHero, operationalWork].some((index) => index < 0) || currentHero >= currentWork || legacyHero >= operationalWork) {
  throw new Error('Cannot compose Home: source templates changed');
}
screens.home = screens.homeFirstWeek.slice(0, currentWork)
  .replace('Welcome to Estio. Let\'s get your first transaction moving.', 'Your transactions and priorities are ready below.')
  + screens.home.slice(operationalWork);
// The phone controller supplies a live daily summary; the old demo sentence
// must not remain in the template as a flash of stale content before mount.
screens.phoneHome = screens.phoneHome.replace(
  'Five things need you today, and the offer on 123 ABC Street expires at 5 PM.',
  'Sofia is checking your work and deadlines.'
);

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
const systemCss = fs.readFileSync(path.join(ROOT, 'src/system.css'), 'utf8');
const readabilityCss = fs.readFileSync(path.join(ROOT, 'src/readability.css'), 'utf8');
const appJsParts = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => f.endsWith('.js')).sort();
const appJs = appJsParts.map((f) => `// ---- ${f} ----\n` + fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
const templates = Object.entries(screens).map(([k, v]) => `<template data-screen="${k}">${v}</template>`).join('\n');

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ZipQ</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230D0D0D'/%3E%3Cpath d='M8 9h16L12 23h12' fill='none' stroke='%23FCFCFC' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
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
const themed = applyTheme(applyProductLanguage(out)).replace('<html lang="en">', '<html lang="en-US">');
fs.writeFileSync(OUT, themed.replace('</head>', `<style id="zipq-system">${systemCss}</style>\n<style id="zipq-readability">${readabilityCss}</style>\n</head>`));

/* The imported design file remains untouched as the visual source of truth.
 * Product naming and the approved information architecture are applied to every
 * generated screen here so onboarding, mobile and edge-state templates cannot
 * drift back to legacy labels. */
function applyProductLanguage(s) {
  return s
    .replace(/\bEstio\b/g, 'ZipQ')
    .replace(/\bDeals\b/g, 'Transactions')
    .replace(/\bPeople\b/g, 'Clients')
    .replace(/Search transactions, people, forms/gi, 'Search transactions, clients, forms')
    .replace(/Contacts & Relationships/g, 'clients and contacts')
    .replace(/Contacts &amp; Relationships/g, 'clients and contacts')
    .replace(/Clients live in <a([^>]*)>Relationships<\/a>\./g, 'Clients have their own workspace.')
    .replace(/Clients live in Relationships\. This list is for the professionals who help close the transaction\./g, 'Clients have their own workspace. This list is for the professionals who help close the transaction.')
    .replace(/\bRelationships\b/g, 'Clients')
    .replace(/\bContacts\b/g, 'Partners')
    .replace(/professional contacts/gi, 'professional partners')
    .replace(/Search contacts/gi, 'Search partners')
    .replace(/from clients and contacts/gi, 'from clients and partners')
    .replace(/From contacts & parties/gi, 'From partners & parties')
    .replace(/From contacts/gi, 'From partners')
    .replace(/your contacts and forms/gi, 'your partners and forms')
    .replace(/quiet contacts/gi, 'quiet clients')
    .replace(/No contacts match/gi, 'No partners match')
    .replace(/Import contacts/gi, 'Import partners')
    .replace(/\bPhase\b/g, 'Stage')
    .replace(/\bPHASE\b/g, 'STAGE')
    .replace(/\bNext up\b/g, 'Next step')
    .replace(/\bNEXT UP\b/g, 'NEXT STEP')
    .replace(/\bNext action\b/g, 'Next step')
    .replace(/\bSofia suggested\b/g, 'Suggested by Sofia')
    .replace(/\bSofia suggests\b/g, 'Suggested by Sofia')
    .replace(/\bAwaiting signature\b/g, 'Out for signature')
    .replace(/\bChecklist gaps\b/g, 'Missing documents')
    .replace(/\bRequired missing\b/g, 'Missing documents')
    .replace(/Title (?:workstream|work item) blocked/gi, 'Title report blocked')
    .replace(/\bout to sign\b/gi, 'out for signature')
    .replace(/\bworkstream\b/gi, 'work item')
    .replace(/Sofia(?:'s)? morning scan added/gi, 'Suggested by Sofia ·')
    .replace(/\bMorning scan\b/gi, 'Suggested by Sofia')
    .replace(/\bSofia check\b/gi, 'Suggested by Sofia')
    .replace(/Checklist auto-tick · real-time/gi, 'Updates automatically')
    .replace(/\bChecklist auto-tick\b/gi, 'Checklist updates')
    .replace(/Items tick themselves when the matching field is filled/gi, 'Completed items update automatically')
    .replace(/all fields auto-checked · awaiting signatures/gi, 'All fields complete · Out for signature')
    .replace(/\bawaiting signatures\b/gi, 'Out for signature')
    .replace(/\bno envelopes out\b/gi, 'no signature requests')
    .replace(/\breal-time\b/gi, 'automatic')
    .replace(/\bConnections\b/g, 'Settings');
}

/* ---------- Theme: ZipQ structure + ChatGPT light palette ----------
 * ChatGPT light neutrals: foreground #0D0D0D · secondary #5D5D5D · muted #8F8F8F
 *                         canvas #FCFCFC · elevated #FFFFFF · tertiary #F9F9F9
 * Primary action: #0D0D0D · active #414141 · link #0169CC · focus #3A83F7
 * Context:        green #00A240 · warning #E25507/#FFC300 · danger #E02E2A/#BA2623
 * Discovery/decorative: #924FF7 · chat accent #3566F0/#FA70AB
 * Borders:        #0000001A default · #00000026 input/strong
 * The legacy palette is deliberately not emitted. */
/* Blue is reserved for filled buttons (and toggles / focus rings).
 * Everything else that used the primary scale — text, links, icons, soft
 * active fills, tints and borders — moves to ChatGPT's neutral scale. */
function neutralizeBlue(s) {
  const BLUE_INK = '#2C67C5|#2459AB|#173E7A|#7EA3DC|#034F9F|#0463CA';
  s = s.replace(new RegExp(`(^|[\\s;"'{(])(color|fill|stroke)(\\s*:\\s*)(${BLUE_INK})`, 'gi'), '$1$2$3#0D0D0D');
  const soft = { '#F3F7FD': '#F0F0F0', '#F8FAFE': '#F9F9F9', '#EAEFF7': '#EDEDED', '#EAF1FB': '#F0F0F0', '#D8E4F7': '#E8E8E8' };
  s = s.replace(/(background(?:-color)?\s*:\s*)(#F3F7FD|#F8FAFE|#EAEFF7|#EAF1FB|#D8E4F7)/gi, (m, a, c) => a + soft[c.toUpperCase()]);
  s = s.replace(/#B9CDEE|#D8E4F7|#7EA3DC/gi, '#E3E3E3');
  s = s.replace(/#E4EAF3/gi, '#EDEDED');
  s = s.replace(/#F3F7FD/gi, '#F0F0F0').replace(/#F8FAFE/gi, '#F9F9F9');
  s = s.replace(/rgba\((44|3|4), ?(103|79|99), ?(197|159|202), ?/g, 'rgba(13,13,13,');
  s = s.replace(/inset 0 -2px 0 #2C67C5/g, 'inset 0 -2px 0 #0D0D0D');
  // icons, JS tone palettes, selection outlines, quote bars
  s = s.replace(/(stroke|fill)="(#2C67C5|#2459AB)"/gi, '$1="#0D0D0D"');
  s = s.replace(/'#2459AB'/gi, "'#0D0D0D'");
  s = s.replace(/(?<!background: ?)'#2C67C5'/gi, "'#0D0D0D'");
  s = s.replace(/(border(?:-left|-top|-right|-bottom)?: ?(?:1\.5|2)px solid )#2C67C5/gi, '$1#0D0D0D');
  s = s.replace(/'2px solid #2C67C5'/g, "'2px solid #0D0D0D'").replace(/inset 3px 0 0 #2C67C5/g, 'inset 3px 0 0 #0D0D0D');
  return s;
}

function applyTheme(s) {
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
    'rgba(3,79,159,0.28)': 'rgba(44,103,197,0.25)', 'rgba(3,79,159,.28)': 'rgba(44,103,197,.25)',
    'rgba(4,99,202,': 'rgba(44,103,197,', 'rgba(2,6,23,0.35)': 'rgba(15,15,15,0.7)', 'rgba(246,248,255,0)': 'rgba(250,250,250,0)',
    // legacy product blue → exact ChatGPT primary/neutral action scale
    '#0463CA': '#0D0D0D', '#0463ca': '#0D0D0D', '#034F9F': '#414141', '#034f9f': '#414141',
    '#E3F0FC': '#F3F3F3', '#EEF4FF': '#F9F9F9', '#EEF4FB': '#F9F9F9', '#F3F9FF': '#F9F9F9', '#F8FAFF': '#FCFCFC',
    '#D6E4FA': '#EDEDED', '#DCE7F7': '#F3F3F3', '#DCEAFB': '#F3F3F3',
    '#9CC3EE': '#AFAFAF', '#9DC2ED': '#AFAFAF', '#A9CBF1': '#AFAFAF',
    // neutrals (slate → ChatGPT light scale)
    '#020617': '#0D0D0D', '#1E293B': '#262626', '#334155': '#414141', '#64748B': '#5D5D5D', '#94A3B8': '#8F8F8F',
    '#8A93A2': '#8F8F8F', '#9AA7B7': '#8F8F8F', '#8F8F8F': '#8F8F8F', '#8f8f8f': '#8F8F8F', '#A7B1BF': '#AFAFAF', '#CBD5E1': '#DFDFDF', '#B9C6D6': '#DFDFDF',
    '#E2E8F0': '#0000001A', '#DFDFDF': '#EDEDED', '#E9EEF5': '#EDEDED', '#EEF2F6': '#F3F3F3', '#EEF1F6': '#F3F3F3', '#F1F5F9': '#F3F3F3',
    '#F8FAFC': '#FCFCFC', '#FBFCFE': '#FCFCFC', '#FCFDFF': '#FCFCFC', '#F6F8FF': '#FCFCFC',
    // Retire the original Estio purple/pink accents. Product colour now stays
    // neutral, with blue reserved for primary actions and semantic colours.
    '#E8619A': '#0D0D0D', '#e8619a': '#0D0D0D', '#FCEAF2': '#F0F0F0', '#fceaf2': '#F0F0F0',
    '#FBE4EC': '#F0F0F0', '#fbe4ec': '#F0F0F0', '#9A2D5C': '#5D5D5D', '#9a2d5c': '#5D5D5D',
    '#7C5CD6': '#5D5D5D', '#7c5cd6': '#5D5D5D', '#8B5CF6': '#424242', '#8b5cf6': '#424242',
    '#F6E8FB': '#F0F0F0', '#f6e8fb': '#F0F0F0', '#F1E6FB': '#F0F0F0', '#f1e6fb': '#F0F0F0',
    '#E8DDF5': '#E6E6E6', '#e8ddf5': '#E6E6E6', '#7A2E8E': '#5D5D5D', '#7a2e8e': '#5D5D5D',
    '#5E2270': '#5D5D5D', '#5e2270': '#5D5D5D', '#5B2E91': '#5D5D5D', '#5b2e91': '#5D5D5D',
    // semantic colours → exact ChatGPT light-theme context tokens
    '#1F9D6B': '#00A240', '#1F7A3A': '#00A240', '#1F7A55': '#00A240',
    '#E4F5EC': '#B8EBCC', '#E5F3E8': '#B8EBCC',
    '#B42318': '#BA2623', '#D92D20': '#E02E2A', '#912018': '#BA2623', '#8F2F25': '#BA2623',
    '#FCE9E7': '#FFD9D9', '#D9897F': '#FF8583',
    '#B25E09': '#E25507', '#E0A100': '#FFC300', '#E0AC00': '#FFC300',
    '#8A5A00': '#916F00', '#FBF1DC': '#FFF6D9', '#C99A43': '#FFC300',
    '#8E3A86': '#924FF7', '#279141': '#00A240', '#2E7D4F': '#00A240', '#155C2C': '#00A240',
    '#0E7490': '#0285FF', '#FDEAF2': '#F3F3F3', '#A3245E': '#5D5D5D',
    '#424242': '#414141', '#F0F0F0': '#F3F3F3', '#E3E3E3': '#EDEDED', '#E7E7E7': '#EDEDED', '#BDBDBD': '#00000026',
    // active tab underline → primary (kit tab indicator)
    'inset 0 -2px 0 #020617': 'inset 0 -2px 0 #0D0D0D',
  };
  const keys = Object.keys(map).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  s = s.replace(new RegExp(keys.join('|'), 'g'), (m) => map[m]);
  s = neutralizeBlue(s);
  const css = `<style id="segment-theme">
:root { --seg-primary: #0D0D0D; --seg-primary-600: #414141; --seg-link: #0169CC; --seg-focus: #3A83F7; --seg-border: #0000001A; --seg-bg: #FCFCFC; }
body { background: #FCFCFC; }
/* Buttons — current ChatGPT light theme: black primary, quiet neutral secondary */
a[style*="background: #0D0D0D"]:not([role=switch]):hover, button[style*="background: #0D0D0D"]:not([role=switch]):hover { background: #414141 !important; }
.btn { border-radius: 12px; font-weight: 500; box-shadow: inset 0 0 0 1px #0000001A; color: #0D0D0D; }
.btn:hover { background: #F9F9F9; }
.btn-primary { background: #0D0D0D; box-shadow: none; color: #fff; }
.btn-primary:hover { background: #414141; }
.btn-danger { box-shadow: none; }
/* Inputs — r8, inset 1px #E3E3E3, focus inset primary */
.input { border: 0; border-radius: 8px; box-shadow: inset 0 0 0 1px #00000026; color: #0D0D0D; }
.input:focus { box-shadow: inset 0 0 0 1px #0D0D0D, 0 0 0 3px #3A83F733; }
.flabel { font-weight: 500; font-size: 14px; color: #5D5D5D; }
input:not([type=checkbox]):not([type=radio]):focus, textarea:focus, select:focus { outline: none; }
/* Pills / tabs — blue active state */
.chip-b { border-color: #EDEDED; color: #414141; font-weight: 400; }
.chip-b.on { background: #F3F3F3; border-color: #0000001A; color: #0D0D0D; }
/* Hover states */
.card:hover, .chip:hover { border-color: #00000026 !important; }
.row:hover { background: #F9F9F9 !important; }
.nav:hover, .subnav:hover { background: #F9F9F9 !important; }
/* Dropdown — white, 1px #EDEDED, r12, shadow 0 0 10px -4px, items r10 */
.menu { border-radius: 12px; padding: 4px; box-shadow: 0 0 0 1px #0000001A, rgba(0,0,0,0.08) 0px 0px 10px -4px !important; }
.menu-i { border-radius: 10px; padding: 8px 12px; font-size: 14px; color: #414141; }
.menu-i:hover { background: #F9F9F9; }
.menu-i.checked { color: #0D0D0D; }
.modal { border-radius: 16px; box-shadow: ${SEG_CARD_SHADOW} !important; }
.drawer { box-shadow: -1px 0 0 #EDEDED, rgba(0,0,0,0.08) -10px 0 30px -4px !important; }
.scrim { background: #0002; }
/* Tooltip / toast — #0D0D0D, r12 */
.toast { background: #0D0D0D; border-radius: 12px; font-weight: 400; font-size: 14px; }
.toast-dot { background: #00A240; }
.dot-badge { background: #E02E2A; }
/* Headings — Inter 600, tight tracking like the kit */
h1 { letter-spacing: -0.03em !important; }
h2 { letter-spacing: -0.015em; }
/* Sofia avatar orb → primary hue */
img[data-asset="2141beaaf5"], img[src^="data:image/jpeg"] { filter: hue-rotate(22deg) saturate(1.05); }
::selection { background: #EDEDED; }
/* Toggle — kit: 48×24 track, 4px padding, 16px knob with layered shadow; off #E3E3E3, on primary */
[role=switch] { width: 44px !important; height: 24px !important; border-radius: 1000px !important; flex-shrink: 0; transition: background .15s; }
[role=switch][aria-checked="false"] { background: #EDEDED !important; }
[role=switch][aria-checked="true"] { background: #0D0D0D !important; }
[role=switch] > span { width: 16px !important; height: 16px !important; top: 4px !important; border-radius: 1999px !important; transition: left .15s !important;
  box-shadow: rgba(0,0,0,0.18) 0px 0.6px 0.24px -1.25px, rgba(0,0,0,0.16) 0px 2.29px 0.92px -2.5px, rgba(0,0,0,0.063) 0px 10px 4px -3.75px; }
[role=switch][aria-checked="true"] > span { left: 24px !important; }
[role=switch][aria-checked="false"] > span { left: 4px !important; }
/* Checkbox — r4, 1px #BDBDBD, checked primary */
[role=checkbox] { border-radius: 4px !important; }
[role=checkbox][aria-checked="false"] { box-shadow: inset 0 0 0 1px #00000026 !important; background: #FFFFFF !important; }
[role=checkbox][aria-checked="true"] { background: #0D0D0D !important; box-shadow: none !important; }
/* Pressed chips (drawer types, filters) — kit pill active state */
button[aria-pressed="true"]:not([data-mode-btn]):not([aria-label*="mode" i] > *) { background: #F3F3F3 !important; box-shadow: inset 0 0 0 1px #0000001A !important; color: #0D0D0D !important; }
</style>`;
  return s.replace('</head>', css + '\n</head>');
}

if (process.argv.includes('--dump')) {
  fs.mkdirSync(path.join(ROOT, '.screens'), { recursive: true });
  for (const [k, v] of Object.entries(screens)) fs.writeFileSync(path.join(ROOT, '.screens', k + '.html'), v);
}
console.log('Built', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + ' MB,', Object.keys(screens).length, 'screens');
