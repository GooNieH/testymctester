# Snubbing Calculator App

This is a mobile-friendly PWA prototype. It reads the Google Sheet data from these tabs:

- `TubingCatalog`
- `UnsupportedColumn`

The Google Sheet ID is currently set in `app.js`:

```js
const SHEET_ID = '1cv8JvmglnVXYJduC_93VQrqJjom5CIbe';
```

## How to test locally

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How calculations work

- Snub force uses `OD² × 0.7854 × pressure`, rounded up.
- Friction factor uses `× 1.2`, rounded up.
- Annular force uses `Coupling OD² × 0.7854 × pressure`.
- Annular sections show when Ram to Ram = No or pressure is under 2500 psi.
- Unsupported length lookup uses the longest length where the table force is greater than or equal to the calculated force.
- Transition uses no-friction snub force divided by effective pipe weight, then joint count is rounded up.
