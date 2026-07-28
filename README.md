# Grown For You 🌸

A hand-gesture-controlled garden: pinch with your left hand to open a
peony's petals, pinch with your right to grow its stem. Sway either hand
to stir a soft wind through the whole scene. Reach full bloom and a
private note quietly appears — with a button to save the moment as an
image.

Built with [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html),
a canvas renderer, and no backend at all.

## Files

```
grown-for-you/
├── index.html   # page structure: onboarding, vine rail, controls, reveal
├── style.css    # the twilight-garden visual system
├── app.js       # hand tracking, gesture logic, flower + vine rendering
└── README.md    # this file
```

No build step, no npm install. MediaPipe loads from a CDN in `index.html`.

## What's different from a basic version

- **Peony instead of tulip** — the flower opens in layered rings all
  the way around, not just upward, so it reads as a fuller, lusher bloom.
- **The vine rail** (left edge) is a single continuous visual thread for
  the whole experience — it fills with color as the flower grows and
  blooms, so there's always a sense of overall progress, not just numbers.
- **Onboarding screen** ties the camera permission request to a real
  button click ("Begin"), which is both a better first impression and
  more reliable across browsers than requesting camera access the
  instant the page loads.
- **Full-bloom reveal** — hold a full bloom for about 1.5 seconds and a
  note fades in over everything, with a "Save this moment" button that
  downloads a PNG of the flower composited over your webcam frame.
- **Soft ambient chimes** — four gentle tones play as the flower crosses
  bloom milestones (25/50/75/100%), with a mute toggle in the corner.
- **Per-hand wind tracking** — the wind signal is computed separately
  for each hand, so losing/regaining a hand between frames never causes
  a sudden fake gust.
- Respects `prefers-reduced-motion` (fewer particles, no ambient sway)
  and has visible keyboard focus on every button.

## Personalizing it

Open `app.js` and edit the `CONFIG` object near the top:

```javascript
const CONFIG = {
    loveNote: "Every flower here grew because of you. Same goes for us.",
    ...
};
```

Change `loveNote` to whatever you want the full-bloom message to say —
that's the only line you need to touch.

### Adding, removing, or recoloring plants

Just below `CONFIG` is a `PLANTS` array — one entry per plant:

```javascript
const PLANTS = [
    { xRatio: 0.78, hue: 342, sizeMult: 1.00, branchCount: 3 }, // rose
    { xRatio: 0.55, hue: 40,  sizeMult: 0.88, branchCount: 2 }, // gold/peach
    { xRatio: 0.92, hue: 265, sizeMult: 0.82, branchCount: 2 }, // violet
    { xRatio: 0.34, hue: 200, sizeMult: 0.78, branchCount: 2 }, // sky blue
];
```

- `xRatio` — horizontal position, 0 (left edge) to 1 (right edge).
- `hue` — the plant's color, 0–360 on the color wheel (0/360 red,
  30 orange, 50 gold, 140 green, 200 sky blue, 260 violet, 300 magenta,
  342 rose).
- `sizeMult` — scales that plant's stem and flowers up or down
  relative to the base size (1.0 = normal).
- `branchCount` — how many side-flowers that plant grows, on top of
  its one main flower.

To add a 5th plant, just add another object to the array. To make a
plant bigger, raise its `sizeMult`. All plants bloom and grow together,
driven by the same two hands — only their color, position, and size differ.

## Running it locally

Browsers block camera access on plain `file://` pages, so serve the
folder over `http://localhost` (or HTTPS):

```bash
cd grown-for-you
python3 -m http.server 8000
```
Then open **http://localhost:8000**.

## Deploying with GitHub Pages

1. Create a repo (e.g. `grown-for-you`) and push these four files to it.
2. In the repo: **Settings → Pages** → Source: `Deploy from a branch`,
   branch `main`, folder `/ (root)` → Save.
3. Wait a minute, then open the URL GitHub gives you, something like
   `https://<your-username>.github.io/grown-for-you/`.

GitHub Pages serves over HTTPS automatically, so camera access works
without any extra hosting step — you don't need Vercel, Netlify, etc.
on top of it.

```bash
cd grown-for-you
git init
git add .
git commit -m "Initial commit: grown for you"
git branch -M main
git remote add origin https://github.com/<your-username>/grown-for-you.git
git push -u origin main
```

## Controls recap

- **Left hand pinch** → bloom (open the petals)
- **Right hand pinch** → grow (stem height)
- **Sway hands** → wind
- **Sound icon** (bottom-left, once running) → mute/unmute the ambient chimes
- **Hold full bloom** → a note appears, with the option to save a snapshot

## Notes on browser support

Works in current Chrome, Edge, and Safari (desktop and mobile). Needs a
working camera and reasonably even lighting — hand tracking gets shaky
in very dim rooms. If the onboarding screen's "Begin" button doesn't
lead to a camera prompt, camera access was likely already denied for
the site — check the permissions icon in the address bar and reload.
