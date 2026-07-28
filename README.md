# RedBloom
# Flower Bloom 🌸 — Hand Gesture Flower Controller

A webcam-based flower that blooms and grows in real time, controlled entirely
by your hand gestures. Built with [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)
and rendered on an HTML5 canvas.

## Files

```
flower-bloom/
├── index.html   # page structure, loads MediaPipe + app.js
├── style.css    # layout, loading screen, instructions overlay
├── app.js       # hand tracking, gesture logic, flower rendering
└── README.md    # this file
```

That's it — no build step, no npm install, no backend. MediaPipe is loaded
directly from a CDN in `index.html`.

## Controls

- **Left hand** — pinch your thumb and index finger together to make the
  flower **bloom** (open its petals).
- **Right hand** — pinch to make the flower **grow** (stem gets taller).
- **Sway either hand** left/right to create a gust of **wind** that bends the
  stem and stirs the floating pollen particles.

## Running it locally

Browsers block camera access on plain `file://` pages, so you need to serve
the folder over `http://localhost` (or HTTPS). Any of these work:

**Python (built-in, easiest):**
```bash
cd flower-bloom
python3 -m http.server 8000
```
Then open **http://localhost:8000** in your browser.

**Node (if you have it):**
```bash
npx serve .
```

**VS Code:** install the "Live Server" extension, right-click `index.html`,
choose "Open with Live Server."

## Deploying (so she can open it from a link)

The easiest option is **GitHub Pages**:

1. Create a new GitHub repo, e.g. `flower-bloom`.
2. Push these 4 files to the repo (see steps below).
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`. Save.
5. Wait a minute or two — GitHub gives you a URL like:
   `https://<your-username>.github.io/flower-bloom/`
6. Open that link on a phone/laptop with a camera and allow camera access.

GitHub Pages serves over HTTPS by default, so camera access will work fine.

### Pushing to GitHub from scratch

```bash
cd flower-bloom
git init
git add .
git commit -m "Initial commit: flower bloom gesture app"
git branch -M main
git remote add origin https://github.com/<your-username>/flower-bloom.git
git push -u origin main
```

## Browser/device notes

- Works in current Chrome, Edge, and Safari (desktop and mobile). Firefox
  support for MediaPipe's camera utils can be inconsistent.
- Needs a front-facing (or any) camera and good, even lighting — hand
  tracking gets shaky in very dim rooms.
- If the loading screen never disappears, camera permission was likely
  denied — check the site permissions in your browser's address bar and
  reload.

## How it works (quick tour)

- `OrganicNoise` layers a few sine waves together to make the stem sway and
  petals flutter in a way that doesn't look robotic/looped.
- `Particle` is the floating pollen — each one drifts upward, gets nudged by
  wind, and respawns once its lifespan runs out.
- `FlowerBloomApp` does everything else:
  - `initHandTracking()` wires up MediaPipe's `Hands` model to the webcam
    feed via `Camera`.
  - `onHandResults()` runs on every detected frame: it measures the
    thumb-to-index pinch distance per hand (normalized by hand size, so it
    works regardless of how close you are to the camera) and turns that into
    bloom/growth targets, plus a per-hand horizontal-velocity signal for wind.
  - `animate()` is the render loop — it smooths the raw gesture values,
    draws the stem, branches, tulip-style flower heads, particles, hand
    skeleton overlay, and a small HUD showing the live bloom/grow/wind
    numbers.

## Ideas for making it more personal

- Add a message or photo overlay that fades in once `bloom` passes ~0.9.
- Add a "save this bloom" button that calls `canvas.toDataURL()` to download
  a snapshot.
- Tie petal hue to the bloom percentage for a clearer sense of progression.
- Add a quiet ambient chime that swells in volume with bloom (Web Audio API).

Happy blooming. 🌷
