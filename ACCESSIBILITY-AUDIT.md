# ZipQ accessibility and UI-quality audit

Audit date: 2026-09-26. Scope: the checked-in 33-screen prototype, generated `index.html`, shared CSS, design-system catalog, and the interaction paths covered by the DOM regression suite. This is a code/DOM audit, not a claim of independent WCAG certification or pixel verification in a live browser.

## Health score after this pass

| Dimension | Score / 4 | Evidence |
| --- | ---: | --- |
| Accessibility | 3 | Semantic ink/status tokens reach ≥4.5:1 on white, canvas, and sidebar surfaces. Body/supporting text is 16/14px; Comfortable is 18/16px. Focus, skip link, labels, radio-key navigation and touch sizing exist. Imported literal styles still need full visual/assistive-technology testing. |
| Performance | 2 | Single-file 2.96 MB app has no install step, but 33 screens and assets ship together. Runtime semantic classification adds work on each route. |
| Responsive | 2 | Container rules and mobile adaptations exist; fixed-width legacy markup and 200% zoom have not been visually verified in a real browser. |
| Theming | 2 | Semantic light tokens are in use, but the imported prototype still contains many hard-coded values and there is no dark theme. |
| Anti-patterns | 3 | Flat operational hierarchy and restrained accent usage are mostly consistent; legacy overrides and some nested surfaces remain. |
| **Total** | **12/20** | **Acceptable; continue focused verification and cleanup before production.** |

Anti-pattern verdict: not an AI-slop gallery. The main risk is accumulated screenshot-specific CSS, not gratuitous gradients or decorative metrics.

## Resolved in this pass

- **[P1 · Accessibility] Low-contrast supporting text.** `--ink-3: #8f8f8f` had 3.23:1 contrast on white. It is now `#666666` (5.74:1 on white, 5.17:1 on the sidebar gray). Semantic risk text was darkened: `--danger` 6.20:1, `--warning` 6.25:1, `--success` 5.59:1 on white. `scripts/check-design-system.mjs` checks the tokens on three light surfaces.
- **[P1 · Accessibility] Tiny text in imported screens.** Hundreds of inline 10–13.5px labels existed in `.screens` and the generated app. `DesignSystem.classifyReadableText()` marks meaningful inline text below 14px; `src/readability.css` raises it to the supporting scale, including overlays and menus. Work-item and long-form reading copy remain at least 16px; chat and message bodies use the user-requested 15px role. Buttons, selects, inputs and textareas use the shared 14px Ask Sofia control role. Settings provides 18px messages/reading copy and 16px controls in Comfortable mode. The earlier blanket `p/li/dd` enlargement was removed after it flattened the visual hierarchy. Real-browser 200% zoom testing remains important for users who need larger editable text.
- **[P1 · Cognitive load] Duplicate follow-up actions.** One draft previously had Review in its list row plus Review & send/Edit in a second rail card. The row now owns the approval path; editing happens in the review form. Follow-ups keeps one page-level creation action instead of a competing Ask Sofia button.
- **[P1 · UX] Side menu not visibly gray.** Both the product rail and contextual navigation panel now share explicit `--sidebar-bg: #f3f3f3`, independent of the imported white template. Active navigation is still a distinct lighter surface.
- **[P2 · Responsive] Legacy 900px list minimums.** Narrow-width overrides prevent the transaction, client and Agenda list containers from forcing a 900px minimum width.
- **[P2 · Consistency] Future-agent drift.** The catalog and `design-system/CONTRACT.md` document components, patterns and regressions. Root `AGENTS.md` and `CLAUDE.md` require both Codex and Claude to follow them.

## Remaining verification and technical debt

- **[P1 · Accessibility / verification] Real 200% zoom and screen-reader pass unavailable in this task environment.** Code and in-memory DOM cannot prove absence of clipped text, logical spoken order, or focus trapping in every overlay. Before production, test Home, Agenda week/month, client detail, transaction detail, Communication log, Playbook and Settings at 200% zoom with VoiceOver/NVDA. Fix any clipping found rather than relaxing text size.
- **[P2 · Theming] Hard-coded imported colors and type remain.** Runtime normalization covers meaningful small text and known pale grays, but the 33 imported templates still contain literal legacy values. Migrate repeatedly used patterns to semantic classes incrementally; do not perform an unreviewed mass rewrite of the source bundle.
- **[P2 · Performance] Large single-file output.** The standalone delivery model intentionally embeds all screens/assets. If the prototype becomes a deployed product, split route assets and lazy-load non-current screens. Preserve the offline single-file build until that migration is authorized.
- **[P2 · Responsive] Some old layouts rely on inline grids.** The Playbook and major lists have container adaptations, but every narrow drawer/zoom state still needs a visual pass.

## Positive findings

- A skip link, consistent focus-visible outline, labels for most inputs, keyboard tab navigation and independently scrolling detail panels already exist. The shared action helper now gives non-native clickable targets button semantics and Enter/Space activation without duplicating native button or checkbox behavior; `scripts/check-ui-regressions.mjs` checks this contract.
- Risk and completion states use text plus color. Sofia distinguishes extracted facts, suggestions and approval-gated changes.
- The catalog imports the app's own CSS files, so component examples inherit live tokens instead of duplicating a second palette.

## Next production checks

1. **[P1] `/audit` + `/typeset`** — Run a real-browser 200% zoom and screen-reader pass; repair any clipped text or order defects.
2. **[P2] `/adapt`** — Verify drawer and table container widths on phone/tablet.
3. **[P2] `/polish`** — Migrate repeated inline type/color values to named roles and remove obsolete CSS overrides, with visual comparison.

The user can request these checks individually or together. Re-run `/audit` after a real-browser pass to update the score. No item above is being represented as visually verified when only source/DOM evidence exists.
