# ZipQ design-system specification

This is the detailed, normative companion to [CONTRACT.md](CONTRACT.md). It describes the product UI that exists in `src/`; it is not a second theme or permission to add screenshot-specific CSS. If a documented rule and the app disagree, inspect the source and the relevant audit, then fix the discrepancy in the shared primitive or update this specification with evidence. Do not silently copy the discrepancy into a new screen.

## 1. Decision order

For every new UI element, decide in this order:

1. **Job:** What decision or action must the agent/broker complete? Identify the object (transaction, client, work item, document, communication or Sofia proposal).
2. **Pattern:** Find the closest existing pattern in the [catalog](index.html) and the owner in the table below. Preserve its information order and behavior.
3. **Component:** Reuse the component with the same intent. A new visual variant requires a distinct semantic purpose, not a different page or screenshot.
4. **Token:** Use the semantic CSS variables from `src/system.css` and `src/readability.css`. The component owns its geometry; a screen does not redefine its font, border or radius.
5. **States:** Specify default, hover, focus, pressed/selected, disabled and relevant loading, empty, error or success behavior before implementation.
6. **Verification:** Build, run checks, and inspect the actual screen at ordinary, narrow and Comfortable text sizes. Record what could not be verified.

### Source hierarchy

| Concern | Canonical source | Do not do |
| --- | --- | --- |
| Values and primitives | `src/system.css`, `src/readability.css` | Hard-code a near-duplicate value in a screen. |
| Semantic role assignment | `src/25-design-system.js` | Add a class only to one imported screen when the role repeats. |
| Interactions and composition | `src/20-shell.js`, `30-components.js`, `35-sofia.js`, `50-txdetail.js`, `55-agenda.js`, `60-relationships.js`, `65-forms.js` | Draw a working-looking but inert copy. |
| Template markup | `.screens/*.html`, assembled by `build.mjs` | Hand-edit generated `index.html`. |
| Product rules | `CONTRACT.md` and this file | Treat catalog prose as optional inspiration. |

## 2. Foundations

### Typography

| Role | Default | Weight | Use | Comfortable |
| --- | --- | --- | --- | --- |
| Page title | `--type-page-title` = `1.5rem` / 30px line | 500 | One primary `h1` per view, including Home and onboarding | Remains a page role; do not enlarge all headings together. |
| Section title | `--type-section-title` = `1rem` / 24px line | 600 | `h2`/`h3` for a named content group | `1.125rem` via `src/readability.css`. |
| Reading content | `--type-body` / `--reading-body` = `1rem`, 1.5 line-height | 400–500 | Work-item titles, explanation and long copy | `1.125rem`, 1.55 line-height. |
| Message body | `--type-message` = `.9375rem` (15px), 1.55–1.6 line-height | 400–500 | Sofia/user chat, Communication log Chat, SMS and email bodies; not controls or metadata | `1.125rem` (18px). |
| Control label | `--type-action` = `.875rem` / 20px line | 400–600 by hierarchy | Every text-bearing button, link styled as button, select, input and textarea—including Sort, New transaction and Ask Sofia | `1rem`. |
| Supporting text | `--type-label`, `--type-caption`, `--reading-support` = `.875rem` / 20px line | 400–500 | Dates, metadata, hints and labels | `1rem`. |

Use `--font-ui` (Onest) for product text. Use `--font-code` (Geist Mono) only for codes, keyboard hints and tabular metadata. Use `rem` for new text sizes. A 14px control label is **not** permission to shrink its click target. Do not let a global button selector shrink the 16px content inside an interactive work-item card. Do not create a 28px page-title override or use fluid `clamp()` for app headings.

### Color and contrast

| Intent | Token | Current value | Rule |
| --- | --- | --- | --- |
| Canvas / raised / navigation | `--canvas` / `--surface-raised` / `--sidebar-bg` | `#fcfcfc` / `#ffffff` / `#f3f3f3` | The rail and menu share one gray surface; the logo/actions header is transparent. Active tabs are white in a muted track. |
| Primary / secondary / supporting ink | `--ink` / `--ink-2` / `--ink-3` | `#0d0d0d` / `#5d5d5d` / `#666666` | Meaningful text reaches at least 4.5:1 on its real surface. |
| Primary action / link / focus | `--primary` / `--link` / `--focus-ring` | `#0d0d0d` / `#0169cc` / `#3a83f7` | One primary action per area; never use link blue for generic decoration. |
| Overdue / needs attention / done | `--danger` / `--warning` / `--success` | `#ba2623` / `#a83e08` / `#08783a` | Always pair tone with a word, date or icon. Stage and Sofia provenance stay neutral. |

Contrast is a measurable requirement, not a visual guess. `scripts/check-design-system.mjs` checks semantic text colors against canvas, raised and sidebar surfaces. Check any new combination separately, including placeholder text and disabled-state distinguishability. Never use color alone to indicate a contract deadline or signature status.

### Space, geometry and alignment

| Purpose | Token / value | Binding use |
| --- | --- | --- |
| Micro / tight / inline | `--space-2xs` 4px, `--space-xs` 8px, `--space-sm` 12px | Icon–label and label–arrow gaps, compact rows. |
| Component / section | `--space-md` 16px, `--space-lg` 24px, `--space-xl` 32px | Field groups, card interiors, separation between sections. |
| Large separation | `--space-2xl` 48px, `--space-3xl` 64px | Only for distinct regions, never a substitute for missing structure. |
| Page rail | `--page-rail` 32px, tablet 24px, mobile 16px | Page title, tabs, main content and table edge share the same rail. |
| Control height | `--control-compact` 32px, `--control-default` 36px, `--control-field` 40px, `--control-touch` 44px | Geometry is independent of the 14px text role; coarse-pointer targets are at least 44px. |
| Radius | `--radius-control` 8px, `--radius-input` 10px, `--radius-panel` 12px, `--radius-card` 16px, `--radius-pill` 9999px | Use the radius that matches the component role; do not round every table row. |
| Icon | `--icon-inline` 16px, `--icon-control` 18px, `--icon-feature` 20px | Preserve stroke and optical alignment from the reused icon. |

Padding is a **four-sided property**. Define top/right/bottom/left or an intentional block/inline pair, then verify the visible result. A row with a checkbox must have the same left inset as its right and vertical insets unless a documented grid column accounts for the difference. Use `gap` for peers; do not use margins or `position` nudges to fake icon/arrow alignment. A label, count and disclosure arrow stay in one alignment group. Long labels wrap or the container adapts before padding or font size is reduced.

### Responsive and motion

- Desktop uses a 56px product rail and a contextual side panel. The panel and rail use `--sidebar-bg`; the active product icon does not create a second navigation list.
- At narrower widths, use the existing 1080px/900px/760px page adaptations and container queries for drawer/card internals. Playbook work items switch from one grid line to a compact second line at a **600px container width**, not merely at a viewport breakpoint. Transaction summary rows adapt at a **680px container width**.
- A drawer/panel must scroll independently with `min-height: 0` on its flex child, no accidental horizontal scroll and reachable close controls. At small screens, the client detail becomes a bottom sheet according to the existing 760px rule.
- Use `--ease-out` and short transitions for color/surface/focus feedback. Never make comprehension depend on motion. Honor `prefers-reduced-motion` and avoid layout-property animations.
- Verify 200% zoom, Comfortable text, keyboard-only navigation and touch/coarse-pointer operation. Do not hide a critical deadline or action just to make a narrow screenshot look neat.

## 3. Component contracts

### Buttons and action hierarchy

| Variant | Reuse | Anatomy and use | Required states |
| --- | --- | --- | --- |
| Primary | `.btn.btn-primary.ui-button` | One per decision area; black surface, white label, 14px text, icon/label grouped with 8px gap. Plus icon only for create. | Hover, focus-visible, pressed, disabled, loading. |
| Secondary / neutral | `.btn.ui-button` | Peer or cancel action; neutral surface and one border. View/open actions have no plus. | Hover, focus-visible, pressed, disabled. |
| Danger | `.btn.btn-danger.ui-button` | Destructive action only; confirm consequence in copy or a dialog when appropriate. | Hover, focus-visible, disabled, confirmation. |
| Icon-only | `.icon-btn.ui-icon-button` | One accessible name via `aria-label`; icon centered, no invisible text used as layout. | Tooltip where meaning is not obvious, focus-visible, disabled. |
| Sidebar creation | `.sidebar-primary-action` | New chat/transaction/add client in the gray side panel; 14px nested label, 44px row, equal four-sided spacing. | Hover, focus-visible, keyboard, collapsed panel behavior. |

Do not put two equivalent approval paths on one screen. Do not place Ask Sofia next to every heading if the contextual Sofia affordance is already visible. If a control is visually a button but implemented as a link, its destination must be real and its semantics remain navigation; use a button for in-place mutation.

### Form controls

| Component | Reuse | Contract |
| --- | --- | --- |
| Text/select/textarea | `.field`, `.flabel`, `.input`, `.ui-input`, modifiers | One visible outer border; a persistent accessible label; 14px input value/placeholder text; 40px standard field; hint/error associated with the control. Multiline text can grow vertically. |
| Search | `.sidebar-search`, `.search-box`, `.ui-input--compact` | One search surface and focus ring, not an extra bordered input inside a bordered shell. ⌘K opens Search only. Results identify entity and context. |
| Checkbox/radio/switch | `.cbx`, native input or declared ARIA role | Use the native control when possible; label has a click target; state is visible in more than color. Custom role requires Space/Enter and correct state attributes. |
| Filter chip/select | `.filter-chip`, `.ui-chip--filter`, existing toolbar control | 14px label, selected state visibly distinct; do not confuse a filter with a status badge. |

Validation: leave the entered value intact; show the error next to the field; set `aria-invalid` and `aria-describedby`; keep focus visible; do not rely on red border alone. Placeholder is an example, not a substitute for a label. Disabled controls must not look active or receive a misleading click action.

### Navigation and data display

| Component | Reuse | Contract |
| --- | --- | --- |
| Product rail / side menu | `.app-rail`, `.app-navigation-sidebar`, `[data-tooltip]` | One gray surface shared by rail, menu and transparent logo/actions header; 56px rail, visible active item, hover/focus tooltip, a single Search/notification entry. |
| Tabs / segmented view | `.page-tabs`, `.agenda-view-tabs`, `.ui-chip` | One navigation bar per content area; active item is white on muted track. Use `role=tablist`, `aria-selected`, and Left/Right/Home/End keys for real tabs. |
| Data grid / row | `.data-grid`, `.data-grid-row` | One outer boundary, light header, equal four-sided cell padding, one divider per row, no independently rounded row cards. Headers and cells align to the same column grid. |
| Interactive work row | `.agenda-flat-row`, `.playbook-item`, `.interactive-row` | Title remains readable at the body role, metadata uses supporting role, checkbox column matches the row inset. Whole-row navigation must not hijack an embedded checkbox/button. |
| Timeline | `.client-followup-timeline`, `.transaction-log-row` | Date and description share a baseline; date column is max-content or stable-width, tabular numerals; neither column overlaps. |
| Drawer / modal / menu | `.client-detail-modal`, `.drawer`, `.modal`, `.menu` | Menu for small choices, drawer for context-preserving detail, modal only for a decision. Focus enters and returns predictably; content scrolls without trapping the page. |
| Toast / empty state | `.toast`, `.empty-note` | State what happened and the next available action; temporary feedback does not replace persistent status. |

## 4. Pattern contracts

- **Home / Sofia:** Conversation and one composer are primary. Keep equal breathing room on both sides; use a single field border. Sofia provenance distinguishes extracted fact, suggestion, prepared draft and committed change. No repeated prompt suggestions below an ongoing chat. A consequential save/send requires human approval.
- **Agenda:** One List/Calendar switch by the page title. Week/Month stays beside Today inside Calendar. Urgent work remains visible. Do not repeat uppercase Overdue/Later/Done headings under tabs that already express state.
- **Transaction dossier:** Main work column plus contextual participants/documents rail. Tasks, checklist and documents disclose in flow. Count sits beside its arrow. Both the page and long detail content scroll; deadlines remain recognizable without relying only on color.
- **Clients / Follow-ups:** Client list remains visible behind an independently scrolling detail panel. Call/Email/Message/View transaction are peers, fit one line when space permits and retain 12px inline padding/44px targets. View transaction is navigation (no plus). Draft approval has one path; Review may open an editable draft before send.
- **Communication log:** Aggregate tab is **Chat**, not All. Email shows sender, recipients, subject, timestamp and body; SMS shows directional bubbles, sender/phone and time; Calls show participant, start, end and duration; DocuSign shows envelope, recipient and verified status. Never fabricate a handwritten signature.
- **Playbook:** Work item, Due, Owner and Reminder align on one grid. At a constrained container, title occupies the first row and metadata moves together to the second. Group arrow and label remain adjacent.

## 5. State and accessibility matrix

| State | Visual requirement | Semantic / interaction requirement |
| --- | --- | --- |
| Default | Clear label, role and hierarchy | Accessible name matches visible purpose. |
| Hover | Subtle surface/ink change | Never the only way to discover a critical action. |
| Focus-visible | 2px `--focus-ring`, 3px offset | Reachable in logical order; keyboard activation works. |
| Selected / pressed | White active tab or distinct selected surface | `aria-selected`, `aria-pressed` or current-page state reflects the UI. |
| Disabled | Clearly unavailable without low-contrast meaningful copy | Native `disabled` or `aria-disabled`, no mutation on activation. |
| Loading | Stable geometry; progress visible | Prevent duplicate action and announce outcome when relevant. |
| Error | Message adjacent to the affected field/action | `aria-invalid`, associated error, recoverable value. |
| Empty | Explain why empty and offer the next meaningful action | No fake data or dead CTA. |
| Success | State the result, not just a green decoration | Toast/status live region where appropriate; undo if recoverable. |
| Long text / zoom | Wrap or reflow without overlap or clipped last row | Full accessible value remains available; 200% zoom supported. |

## 6. Implementation and acceptance

Before editing, search the catalog and code: `rg -n "visible label|component class" src .screens design-system`. Reuse an existing semantic class. If a truly new component is needed, document its purpose, anatomy, variants, states, accessibility and source owner in the catalog and here; add a regression assertion. Do not add a token for a one-off value. If the same semantic intent occurs at least three times, consider extracting a reusable primitive and migrating all instances.

Required checks after a product change:

```sh
node build.mjs
node scripts/check-design-system.mjs
node scripts/check-ui-regressions.mjs
git diff --check
```

Then inspect the changed route in a real browser at desktop and constrained widths, including a long-value and empty state, keyboard focus, Comfortable text and 200% zoom. Use `FEEDBACK-AUDIT.md` and `ACCESSIBILITY-AUDIT.md` as the known-debt register. If a browser check is unavailable, name the exact gap; passing static checks is not pixel or WCAG verification.
