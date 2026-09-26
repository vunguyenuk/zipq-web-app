# ZipQ UI implementation contract

This is normative for every new or edited ZipQ product screen, whether the work is done by a human, Claude, Codex, or another agent. The checked-in app—not the Spyy reference site—is the source of truth. The reference informs the documentation hierarchy only.

## Required reading order

1. Read `.impeccable.md` for the user, tone, and product constraints.
2. Open `design-system/index.html` for Foundations → Specifications → Components → States → Patterns → Templates and inspect the relevant examples.
3. Read the binding [detailed specification](SPEC.md), then `src/system.css`, `src/readability.css`, `src/25-design-system.js`, and the current screen's controller in `src/`.
4. Search for an existing implementation before inventing a new class, token, or component. Use `rg` on the component name and its visible label.
5. Read `FEEDBACK-AUDIT.md` and `ACCESSIBILITY-AUDIT.md` for known regressions and verification limits.

## Source of truth

| Level | Existing source | Rule |
| --- | --- | --- |
| Foundations | `src/system.css` `:root` and `src/readability.css` | Use semantic CSS variables; do not hard-code near-duplicates. |
| Primitives | `src/app.css`, `src/system.css`, `DesignSystem.classifyPrimitives()` | Reuse `.btn`, `.ui-button`, `.ui-icon-button`, `.ui-input`, `.ui-chip`, `.ui-panel`, `.data-grid` and purpose-built variants. |
| Patterns | `src/20-shell.js`, `30-components.js`, `35-sofia.js`, `50-txdetail.js`, `55-agenda.js`, `60-relationships.js`, `65-forms.js` | Preserve behavior, state semantics and accessibility with the visual pattern. |
| Templates | `.screens/*.html` through `build.mjs` | The imported design file is a template source. Make durable product changes in `src/` and rebuild. Do not manually edit generated `index.html`. |

`SPEC.md` is the detailed acceptance standard for tokens, anatomy, variants, states, responsive behavior and verification. This contract is the short mandatory entry point; the catalog is the visual reference. All three must agree. If they do not, inspect the code and audits, resolve the mismatch in the shared system, and update the documents together.

## Non-negotiable visual rules

For every component, verify the CSS properties `font-size`, `font-family`, `color`, `padding`, `gap`, `border`, `border-radius`, `align-items`, and `justify-content` against an existing component with the same intent. Alignment and justification are part of the component contract, not optional finishing touches.

- Font: Onest for UI; Geist Mono only for document codes and tabular metadata. Page-level headings use `--type-page-title: 1.5rem` (24px/30px) at weight 500; section subheadings and reading copy remain `1rem`/24px. Chat/Sofia/Communication log message bodies use `--type-message: .9375rem` (15px); Comfortable mode raises them to `1.125rem` (18px). Other long-form reading copy remains `1rem`/24px. Every text-bearing button, select, input and textarea uses the same `--type-action: .875rem` (14px) size as Ask Sofia, including nested button labels and dynamic dialogs; Comfortable mode raises controls to `1rem` (16px). Dates and metadata also use `.875rem`/20px. Do not turn every h2/h3 into a page heading. Keep touch targets spacious even when control text is 14px; never shrink button geometry to make text fit. Size by role; never enlarge every descendant of a page. Use `rem` for new text sizes.
- Text colors: `--ink`, `--ink-2`, `--ink-3`; do not use a pale gray for meaningful text. Normal text must reach 4.5:1 contrast; target 7:1 where practical. Placeholder text is meaningful text and has the same minimum. Use semantic danger/warning/success text plus a label, never color alone.
- Surfaces: `--canvas` for main work area, `--surface-raised` for elevated content, `--sidebar-bg` for the product rail and contextual side menu. The logo/Search/Notifications header has no separate background and lets the menu surface show through; its controls remain transparent until hover/focus. Active tabs use white within a muted track. Do not make the menu body white again.
- Spacing: use `--space-2xs` 4px, `--space-xs` 8px, `--space-sm` 12px, `--space-md` 16px, `--space-lg` 24px, `--space-xl` 32px, `--space-2xl` 48px. Use `gap` to group peers. Top/right/bottom/left padding must be optically balanced. Do not hide alignment problems with negative margins or positional nudges.
- Controls: use existing `--control-*` tokens. Button content (icon + label + arrow) aligns as one unit. A plus means create, never view. Related disclosure count and arrow stay adjacent. Keep enough inline padding for a touch target; widen a constrained detail panel or let controls wrap before shrinking padding or type.
- Action hierarchy: one primary action per area and at most two or three peer secondary actions. Do not duplicate a draft's Review/Send controls in both its list row and a side card; offer one approval path with editing inside review. Keep Sofia available contextually without repeating Ask Sofia beside every page title.
- Borders and shape: one 1px border around a field or data group, never a second border on the nested input. Use `--radius-control` 8px, `--radius-input` 10px, `--radius-panel` 12px, `--radius-card` 16px, `--radius-pill` for pills. Do not make table rows into individually rounded cards.
- Alignment: page title and primary view controls share the page header. Use Flexbox for one-dimensional groups and Grid for real two-dimensional data. Prefer container queries for a component constrained by a drawer/rail. Do not let text overlap, truncate without an accessible full value, or create accidental horizontal scroll.
- Interaction: every actionable element has visible hover, focus, active, disabled, loading/error/success where applicable. Keyboard operation and focus order must work. On touch devices, controls are at least 44×44px. Honor `prefers-reduced-motion` and 200% browser zoom.

## Component inventory and ownership

| Component | Reuse / owner |
| --- | --- |
| Primary, secondary, danger, icon button | `.btn`, `.btn-primary`, `.btn-danger`, `.icon-btn`; semantic `.ui-button`, `.ui-icon-button` |
| Field, label, hint, search, textarea, select | `.field`, `.flabel`, `.fhint`, `.input`, `.ui-input`, `.ui-input--compact`, `.ui-input--multiline`; Search in `src/20-shell.js` |
| Checkbox, radio, switch | `.cbx`, `[role=checkbox]`, `[role=switch]`, `UI.setSwitch()` |
| Tabs, segmented views, filter chips | `.page-tabs`, `.agenda-view-tabs`, `.agenda-calendar-mode-tabs`, `.chip-b`, `.filter-chip`, `.ui-chip` |
| Side menu, product rail, tooltip | `.app-navigation-sidebar`, `.app-rail`, `.app-rail-item[data-tooltip]`; `src/20-shell.js` |
| Data table, list row, card, panel | `.data-grid`, `.data-grid-row`, `.agenda-flat-row`, `.ui-card`, `.ui-panel`, `.content-section` |
| Menu, modal, drawer, toast, empty state | `.menu`, `.modal`, `.drawer`, `.toast`, `.empty-note`; base helpers in `src/00-core.js` |
| Calendar, task/event | `.agenda-calendar-controlbar`, `.agenda-calendar-mode-tabs`, `.agenda-time-group`; `src/55-agenda.js` |
| Client detail and follow-up | `.client-detail-modal`, `.client-detail-actions`, `.client-followup-timeline`; `src/60-relationships.js` |
| Transaction detail and DocuSign | `.tx-overview-summary-row`, `.channel-envelope`, `.channel-signer`; `src/50-txdetail.js` |
| Today timeline | `.today-card`, `.today-list`, `.today-event`, `.today-now`; `src/30-components.js` |
| Sofia chat, composer, approval, suggestion | `.chat-input-shell`, `.sofia-composer`, `.chat-confirm-reply`, `.sofia-inline-suggestion`; `src/35-sofia.js` |
| Forms and playbook | `.form-checklists`, `.form-disclosure-button`, `.template-card`, `.playbook-work-items`, `.playbook-group`, `.playbook-item`; `src/50-txdetail.js`, `src/65-forms.js` |

## Regression traps from previous feedback

1. Agenda: exactly one List/Calendar navigation belongs beside the Agenda title. Week/Month belongs beside Today inside the calendar, and Today is rounded. Do not duplicate these controls below the header or bring back the removed right-side toolbar labels.
2. Sidebar: selected product icon collapses/reopens its contextual panel. Product rail and contextual panel both have the gray navigation surface; the icons have hover/focus tooltips. Every New chat / New transaction / Add client label, including its inner span, uses the 14px action token. Search and notifications appear only once, and ⌘K opens Search only.
3. Home/chat: the composer has equal space left and right, one visible field border, and no redundant prompt suggestions beneath an ongoing AI conversation.
4. Clients: opening a client hides the duplicated left-side navigation, not the client list. The right detail panel scrolls. Call/Email/Message/View transaction use the shared 14px action-label token (16px in Comfortable mode) and stay on one line when the panel can fit them, with at least 12px inline button padding and 44px targets; View transaction has no plus and uses a secondary style, while Start transaction remains a creation action. The Type and Stage toolbar filters use the same 14px label as the Search field, with normal weight so they do not look larger; preserve their control heights. Selected detail tab has a white fill.
5. Transaction detail: the page and detail rail scroll; summary count and disclosure arrow are adjacent; timeline dates cannot touch their descriptions; task checkboxes follow the same left inset as top/right/bottom padding. Do not repeat uppercase Overdue/Later/Done headings under a tab bar that already identifies the state.
6. Communication log: Chat is the aggregate tab, not All. Email, SMS, Calls and DocuSign each use their own information architecture. Calls show start, end, duration. DocuSign shows actual envelope recipient status; never draw or imply a handwritten signature without data.
7. Forms and playbook: Template cards show decision-useful content only. Work item/Due/Owner/Reminder remain aligned until the container genuinely needs a compact second row. Every form and group arrow is a native, stateful disclosure button.
8. Borders: outer surfaces and controls use `--border`; passive dividers use `--border-subtle`. Both are neutral ChatGPT-light alpha borders. Do not add blue-gray one-off outlines or nested borders.
8. Tables: headers share the same light neutral surface, text role, and four-sided padding. Do not nest an input border inside a search-field border or crop the last row by mismatched bottom padding.
9. Sofia suggestions: the inline suggestion spans the same content width as its neighboring Agenda cards. Suggestions are not committed actions.
10. Typography: do not reintroduce 10–13px body/metadata text or `#8f8f8f` on light backgrounds. All button, select, input and textarea text, including Sort and New transaction, consumes `--type-action` (14px by default, 16px in Comfortable mode); icon-only controls retain their own icon geometry. Preserve accessible target sizes independently of label size. Keep reading copy distinct from controls; long paragraphs remain 16px by default. Keep long copy at a comfortable line length and allow text wrapping at zoom/comfortable size.

## Implementation and review checklist

- Keep edits in `src/` or the design-system documentation, then run `node build.mjs`. `index.html` is generated.
- Review Default, empty, long-content, loading, error, active, hover, focus and disabled states. Review desktop, constrained drawer, mobile and Comfortable text size.
- Run `node scripts/check-design-system.mjs`, `node scripts/check-ui-regressions.mjs`, and `git diff --check`. The checked-in regression script covers source and keyboard-action behavior; a separate real-browser pass is still required.
- Check text and UI contrast numerically. Do not claim WCAG conformance from visual inspection alone.
- If real-browser visual verification is unavailable, record that exact limitation. Do not invent pixel-perfect claims or bypass a blocked browser route.
- Update the catalog, this contract and `SPEC.md` when a genuinely reusable component/pattern is introduced; remove obsolete duplicate CSS. Do not add a new one-off variant to patch a single screenshot.
