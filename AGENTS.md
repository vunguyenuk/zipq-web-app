# ZipQ agent instructions

Before changing any product UI, read [the design-system contract](design-system/CONTRACT.md), [the detailed specification](design-system/SPEC.md), [the live catalog](design-system/index.html), and `.impeccable.md`. This is mandatory for Codex and any other coding agent. Reuse the existing component and token first; never ship a visually similar one-off implementation. Apply the contract's typography, contrast, spacing, four-sided padding, font family, color, border, radius, alignment, responsive, keyboard, focus and regression requirements to every new screen and state.

Build the generated app with `node build.mjs`; do not hand-edit `index.html`. Run `node scripts/check-design-system.mjs` and `git diff --check`. For current known failures, read `FEEDBACK-AUDIT.md` and `ACCESSIBILITY-AUDIT.md`. If browser verification is blocked, report it rather than claiming pixel verification.
