# ZipQ — web app

ZipQ is an AI transaction operator for residential real estate: it handles deadlines and paperwork with a trustworthy, fast and lean product experience.

`index.html` is the whole app in one file. Double-click it to open it in a browser. You don't need a server or `npm install`.

The live [design-system catalog](design-system/index.html) documents foundations, exact specifications, components, states, patterns and templates. The [detailed specification](design-system/SPEC.md) defines token values, anatomy, variants, responsive behavior and acceptance criteria. For AI-assisted UI work, [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) require both it and the shared [implementation contract](design-system/CONTRACT.md).

## What's in it
- All 33 screens from the design, running as one app with navigation between them (hash routes like `#/home`, `#/tx/t1/checklist`, `#/agenda/calendar`).
- A complete demo workspace is written to the browser's `localStorage` on first load, including the signed-in Home state, expanded navigation and Standard text size. Changes persist after reload. Incompatible schema updates reset the demo once so local and deployed builds start from the same canonical state. To start over manually, click the avatar in the bottom-left corner and choose **Reset demo data**.
- Sofia runs on scripted responses, not a real AI. She can create transactions, fill form fields, move the offer expiration, add tasks and events, draft texts and emails, and answer questions about what's due, follow-ups and compliance. In Agent mode, every change waits on an approval card before it's saved.
- The demo sign-in accepts any email and any password.

## Editing
The design markup is pulled straight from `Estio — Sofia-first redesign.html`. The app logic lives in `src/`:

| File | Contents |
|---|---|
| `00-core.js` | store, router, generic controls (switch, checkbox, chips), modal / drawer / menu / toast |
| `10-data.js` | seed data |
| `15-model.js` | shared data helpers, create/edit transaction |
| `20-shell.js` | sidebar, search (⌘/), notifications, sign-in guard |
| `25-design-system.js` | semantic screen hooks, accessibility enhancements and responsive behavior |
| `30-components.js` | Needs you, Today, Sofia suggests, work item drawer, voice |
| `35-sofia.js` | Sofia engine + chat screen |
| `40-transactions.js` | Transactions list / board |
| `45-home.js` | Home (desktop, first week, phone) |
| `50-txdetail.js` | Transaction detail: Overview, Timeline, Checklist, Documents, Communication log, Transaction log |
| `55-agenda.js` | Agenda: by transaction, People, Calendar week/month, task and event drawers |
| `60-relationships.js` | Clients (split/table), Follow-ups, Contacts |
| `65-forms.js` | Forms library, Templates + playbook, Form editor, Send for signature |
| `70-settings.js` | Settings, Security, Notifications, Routines, Sign in / Sign up / Onboarding |
| `app.css` | modal, toast and menu styles; responsive rules |
| `system.css` | ZipQ design tokens and the final visual/responsive system layer |
| `readability.css` | readable text scale, accessible contrast and gray navigation surface |

After you edit anything, rebuild with:

```
node build.mjs
```

That produces a new `index.html`. It needs Node 18 or newer and has no dependencies.

Run `node scripts/check-design-system.mjs` and `node scripts/check-ui-regressions.mjs` after a UI change to check the catalog contract, semantic text contrast, Follow-up tabs and keyboard-action behavior.

## Theme
The app uses a tailored **Segment UI / Mega UI Kit** direction rather than copying showcase screens literally. `system.css` is the final override layer and keeps the interface operational, compact and accessible:

- **Type:** Onest for the product UI and Geist Mono for codes, dates and compact metadata.
- **Color:** ChatGPT-like light neutrals (`#FCFCFC` canvas, clearly gray `#F3F3F3` navigation, `#0D0D0D` foreground). Primary actions are black; blue is reserved for links, information and focus. Risk, caution and success text use darker, higher-contrast semantic colors.
- **Components:** crisp 1px borders, restrained radii and shadows, with flat workspace surfaces instead of nested card stacks.
- **Responsive:** full desktop workspace, compact tablet navigation and decision-oriented mobile lists/cards.

`applyTheme()` in `build.mjs` applies the light palette at build time. `src/readability.css` is loaded after the imported prototype and product system styles so the navigation and readable text contract cannot be silently undone by legacy inline styles.
