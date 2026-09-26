# ZipQ UI rules for Claude

Read and obey `design-system/CONTRACT.md`, `design-system/SPEC.md`, `.impeccable.md`, `design-system/index.html`, `FEEDBACK-AUDIT.md`, and `ACCESSIBILITY-AUDIT.md` before changing UI. The contract and detailed specification are mandatory, not inspiration. Use the components and CSS tokens already shipped by ZipQ; preserve their spacing, padding on all four sides, font size/family, semantic colors, borders, radii, alignment, scroll behavior, interaction states and accessibility. Never introduce a near-duplicate component or a screen-specific visual patch when a shared primitive/pattern exists.

Make durable changes in `src/`, not generated `index.html`. Then run `node build.mjs`, `node scripts/check-design-system.mjs`, and `git diff --check`; inspect relevant states and disclose any unavailable browser verification.
