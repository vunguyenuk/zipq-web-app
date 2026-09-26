# ZipQ Design System

Open `design-system/index.html` in a browser. It is a static catalog with no build step and imports the product's checked-in CSS directly:

```html
<link rel="stylesheet" href="../src/app.css">
<link rel="stylesheet" href="../src/system.css">
<link rel="stylesheet" href="../src/readability.css">
```

The catalog uses the same four-level information architecture as the [Spyy reference](https://spyy-design-system.vercel.app/) requested by the product owner: Foundations → Components → Patterns → Templates. Its visual values, naming, and examples belong to ZipQ; no Spyy CSS or product assets were copied.

## Provenance

| Material | Status | Source |
| --- | --- | --- |
| Color, typography, spacing, radius and control tokens | Confirmed in code | `src/system.css`, `src/readability.css` |
| 23 component families and state examples | Confirmed classes / illustrative sample data | `src/app.css`, `src/system.css`, controllers in `src/` |
| Eight workflow patterns | Confirmed behavior in code and DOM regression tests | `src/20-shell.js` through `src/70-settings.js` |
| Eight template wireframes | Schematic, not pixel captures | Routes in `build.mjs` and `.screens/` |
| Browser pixel consistency at every width/zoom | Not yet verified | See `ACCESSIBILITY-AUDIT.md` |

`CONTRACT.md` is the normative implementation rulebook. Root `AGENTS.md` and `CLAUDE.md` require coding agents to read it. Update the catalog, rulebook and tests whenever a shared component or pattern changes. The docs' `docs.css` may style documentation chrome only; product UI styling remains in `src/`.
