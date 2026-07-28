/* ===========================================================
   GROWN FOR YOU — Hand Gesture Garden
   ===========================================================
   A peony-style flower that opens in layered rings and grows
   a stem, controlled by pinch gestures tracked with MediaPipe
   Hands. A vine-shaped rail traces the whole journey, and a
   quiet love note appears once the flower is in full bloom.
   =========================================================== */

// -------------------------------------------------------------
// Personalize this before you deploy — no code-diving required.
// -------------------------------------------------------------
const CONFIG = {
    loveNote: "Every flower here grew because of you. Same goes for us.",
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

// -------------------------------------------------------------
// Mobile detection — used to scale camera resolution and
// MediaPipe model complexity down so phones don't choke.
// -------------------------------------------------------------
const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || window.innerWidth < 768;

// -------------------------------------------------------------
// Fix for mobile viewport height: 100vh on phones includes the
// area the browser chrome (address bar) can cover, which causes
// visible layout jumps as it shows/hides. We measure the real
// visible height with JS and expose it as --app-height instead.
// -------------------------------------------------------------
function setAppHeight() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
}
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 100));
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppHeight);
}

// -------------------------------------------------------------
// One entry = one full plant (stem + branches + flowers), each
// with its own screen position, color (hue, 0-360), and size.
// Add, remove, or edit entries to change how many plants grow
// and what color each one is. hue reference: 0/360=red,
// 30=orange, 50=gold, 140=green, 200=sky blue, 260=violet,
// 300=magenta, 342=rose.
// -------------------------------------------------------------
const PLANTS = [
    { xRatio: 0.78, hue: 342, sizeMult: 1.00, branchCount: 3 }, // rose
    { xRatio: 0.55, hue: 40,  sizeMult: 0.88, branchCount: 2 }, // gold/peach
    { xRatio: 0.92, hue: 265, sizeMult: 0.82, branchCount: 2 }, // violet
    { xRatio: 0.34, hue: 200, sizeMult: 0.78, branchCount: 2 }, // sky blue
];

// =============================================================
// NOISE — Organic movement via layered sine waves
// =============================================================
class OrganicNoise {
    constructor() {
        this.seeds = Array.from({ length: 8 }, () => Math.random() * 1000);
    }
    get(t, channel = 0) {
        const s = this.seeds[channel % this.seeds.length];
        return (
            Math.sin(t * 0.7 + s) * 0.4 +
            Math.sin(t * 1.3 + s * 1.7) * 0.3 +
            Math.sin(t * 2.1 + s * 0.3) * 0.2 +
            Math.sin(t * 3.7 + s * 2.1) * 0.1
        );
    }
}

// =============================================================
// PARTICLE — Floating warm pollen / dust motes
// =============================================================
class Particle {
    constructor(cw, ch) {
        this.cw = cw;
        this.ch = ch;
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * this.cw;
        this.y = initial ? Math.random() * this.ch : this.ch + Math.random() * 40;
        this.radius = Math.random() * 2 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = -(Math.random() * 0.5 + 0.12);
        this.life = Math.random() * 320 + 180;
        this.maxLife = this.life;
        // Warm gold-to-rose range instead of hot pink
        this.hue = 24 + Math.random() * 20;
        this.sat = 70 + Math.random() * 15;
        this.brightness = 65 + Math.random() * 20;
        this.flickerPhase = Math.random() * Math.PI * 2;
    }

    update(windForce, dt) {
        this.x += this.vx + windForce * 1.6;
        this.y += this.vy;
        this.life -= dt;
        if (this.life <= 0 || this.y < -20 || this.x < -20 || this.x > this.cw + 20) {
            this.reset();
        }
    }

    draw(ctx) {
        const t = this.life / this.maxLife;
        const flicker = 0.5 + 0.5 * Math.sin(this.life * 0.07 + this.flickerPhase);
        const alpha = t * 0.6 * flicker;
        if (alpha < 0.02) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${this.hue}, ${this.sat}%, ${this.brightness}%, 0.7)`;
        ctx.fillStyle = `hsla(${this.hue}, ${this.sat}%, ${this.brightness}%, 1)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// =============================================================
// SOUND — a few soft ambient tones on bloom milestones
// =============================================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.lastMilestone = -1;
        this.milestones = [0.25, 0.5, 0.75, 0.98];
        // Pentatonic-ish, gentle intervals so overlapping notes stay consonant
        this.notes = [329.63, 392.0, 440.0, 587.33]; // E4, G4, A4, D5
    }

    ensureContext() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    playTone(freq) {
        if (!this.enabled || !this.ctx) return;
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.06, t0 + 0.4);
        gain.gain.linearRampToValueAtTime(0, t0 + 2.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 2.7);
    }

    onBloomUpdate(bloom) {
        for (let i = 0; i < this.milestones.length; i++) {
            if (bloom >= this.milestones[i] && this.lastMilestone < i) {
                this.playTone(this.notes[i]);
                this.lastMilestone = i;
            }
        }
        if (bloom < 0.05) this.lastMilestone = -1; // reset after full close
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// =============================================================
// MAIN APPLICATION
// =============================================================
class GardenApp {
    constructor() {
        // DOM
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.video = document.getElementById('webcam');
        this.veilEl = document.getElementById('veil');
        this.beginBtn = document.getElementById('begin-btn');
        this.veilHint = document.getElementById('veil-hint');
        this.loadingEl = document.getElementById('loading');
        this.vineRailEl = document.getElementById('vine-rail');
        this.vineFillEl = document.getElementById('vine-fill');
        this.controlsEl = document.getElementById('controls');
        this.soundToggleBtn = document.getElementById('sound-toggle');
        this.soundIcon = document.getElementById('sound-icon');
        this.statBloomEl = document.getElementById('stat-bloom');
        this.statGrowEl = document.getElementById('stat-grow');
        this.hintLeftEl = document.getElementById('hint-left');
        this.hintRightEl = document.getElementById('hint-right');
        this.revealEl = document.getElementById('reveal');
        this.revealNoteEl = document.getElementById('reveal-note');
        this.saveBtn = document.getElementById('save-btn');
        this.closeRevealBtn = document.getElementById('close-reveal-btn');
        this.useSlidersBtn = document.getElementById('use-sliders-btn');
        this.touchControlsEl = document.getElementById('touch-controls');
        this.bloomSlider = document.getElementById('bloom-slider');
        this.growthSlider = document.getElementById('growth-slider');

        this.revealNoteEl.textContent = CONFIG.loveNote;

        // Noise & sound
        this.noise = new OrganicNoise();
        this.sound = new SoundEngine();

        // Time
        this.time = 0;
        this.lastTimestamp = 0;

        // Whether we're driving bloom/growth from touch sliders
        // instead of the camera + hand tracking.
        this.usingTouchControls = false;

        // Gesture state (smoothed)
        this.bloom = 0;
        this.growth = 0;
        this.windForce = 0;

        // Gesture targets (raw)
        this.targetBloom = 0;
        this.targetGrowth = 0;
        this.targetWindForce = 0;

        // Previous hand X, tracked per-hand so losing/regaining a hand
        // between frames never produces a fake velocity spike.
        this.prevHandX = { Left: null, Right: null };

        // Hand landmarks
        this.handLandmarks = [];
        this.handHandedness = [];
        this.handsDetected = 0;

        // Particles
        this.particles = [];
        this.particleCount = CONFIG.reducedMotion ? 24 : (IS_MOBILE ? 30 : 55);

        // Full-bloom reveal tracking
        this.fullBloomTimer = 0;
        this.revealShown = false;
        this.revealDismissed = false;

        // Vine rail geometry
        this.vinePathLength = 900; // matches stroke-dasharray in the SVG

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initParticles();
        this.bindUI();
    }

    // ---------------------------------------------------------
    // UI wiring
    // ---------------------------------------------------------
    bindUI() {
        this.beginBtn.addEventListener('click', () => this.begin());

        this.soundToggleBtn.addEventListener('click', () => {
            const enabled = this.sound.toggle();
            this.soundIcon.textContent = enabled ? '♪' : '✕';
            this.soundToggleBtn.setAttribute('aria-pressed', String(enabled));
        });

        this.saveBtn.addEventListener('click', () => this.saveSnapshot());
        this.closeRevealBtn.addEventListener('click', () => {
            this.revealEl.classList.add('hidden');
            this.revealDismissed = true;
        });

        // Touch-control fallback: for phones without a usable camera,
        // or when hand tracking is too unreliable at arm's length on
        // a small screen. Sliders drive bloom/growth directly.
        if (this.useSlidersBtn) {
            this.useSlidersBtn.addEventListener('click', () => this.beginWithTouchControls());
        }
        if (this.bloomSlider) {
            this.bloomSlider.addEventListener('input', (e) => {
                this.targetBloom = Number(e.target.value) / 100;
            });
        }
        if (this.growthSlider) {
            this.growthSlider.addEventListener('input', (e) => {
                this.targetGrowth = Number(e.target.value) / 100;
            });
        }
    }

    // Camera + audio permission are requested from this direct click,
    // which keeps the browser's permission prompt reliable (some
    // browsers suppress prompts that aren't tied to a user gesture).
    begin() {
        this.sound.ensureContext();
        this.veilEl.classList.add('hidden');
        this.loadingEl.classList.remove('hidden');
        this.initHandTracking();
        requestAnimationFrame((ts) => this.animate(ts));
    }

    // Skips the camera entirely and drives the flower from the two
    // on-screen sliders. Used as a manual fallback on phones.
    beginWithTouchControls() {
        this.usingTouchControls = true;
        this.sound.ensureContext();
        this.veilEl.classList.add('hidden');
        this.touchControlsEl.classList.remove('hidden');
        this.controlsEl.classList.remove('hidden');
        requestAnimationFrame((ts) => this.animate(ts));
    }

    // ---------------------------------------------------------
    // Setup
    // ---------------------------------------------------------
    resize() {
        // Match the CSS --app-height fix: use visualViewport height
        // where available so the canvas doesn't fall out of sync with
        // the actual visible area as mobile browser chrome resizes.
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        for (const p of this.particles) {
            p.cw = this.canvas.width;
            p.ch = this.canvas.height;
        }
    }

    initParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new Particle(this.canvas.width, this.canvas.height));
        }
    }

    initHandTracking() {
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
        });

        // Mobile phones have far less spare CPU than a laptop. Model
        // complexity 1 + two-hand tracking + a 720p feed is enough to
        // make a mid-range phone drop frames badly, so we scale both
        // the model and the camera resolution down on mobile.
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: IS_MOBILE ? 0 : 1,
            minDetectionConfidence: 0.65,
            minTrackingConfidence: 0.5,
        });

        hands.onResults((r) => this.onHandResults(r));

        const cam = new Camera(this.video, {
            onFrame: async () => { await hands.send({ image: this.video }); },
            width: IS_MOBILE ? 480 : 1280,
            height: IS_MOBILE ? 640 : 720,
            // Explicitly request the front (selfie) camera. Without
            // this, some Android browsers default to the rear camera,
            // which makes gesture control impossible to use.
            facingMode: 'user',
        });

        // Camera permission requires a secure context (HTTPS or
        // localhost). If the page is served over plain HTTP on a
        // phone, getUserMedia will reject before this even runs.
        if (!window.isSecureContext) {
            this.loadingEl.innerHTML =
                '<div class="loading-text">This page needs to be loaded over HTTPS for the camera to work.</div>';
            this.offerTouchFallback();
            return;
        }

        cam.start().then(() => {
            this.loadingEl.classList.add('hidden');
            this.vineRailEl.classList.remove('hidden');
            this.controlsEl.classList.remove('hidden');
        }).catch((err) => {
            console.error('Camera failed to start:', err);
            this.loadingEl.innerHTML =
                '<div class="loading-text">Camera access was blocked or unavailable.</div>';
            this.offerTouchFallback();
        });
    }

    // Shown when the camera can't be used at all — swaps in the
    // touch sliders so the experience still works.
    offerTouchFallback() {
        setTimeout(() => {
            this.loadingEl.classList.add('hidden');
            this.usingTouchControls = true;
            this.touchControlsEl.classList.remove('hidden');
            this.controlsEl.classList.remove('hidden');
        }, 1800);
    }

    // ---------------------------------------------------------
    // Hand results
    // ---------------------------------------------------------
    onHandResults(results) {
        this.handLandmarks = results.multiHandLandmarks || [];
        this.handHandedness = results.multiHandedness || [];
        this.handsDetected = this.handLandmarks.length;

        let leftPinch = 0, rightPinch = 0, hasLeft = false, hasRight = false;
        let windSum = 0, windCount = 0;

        if (this.handsDetected > 0) {
            for (let i = 0; i < this.handsDetected; i++) {
                const hand = this.handLandmarks[i];
                const handedness = this.handHandedness[i];
                const label = handedness && handedness.label === 'Left' ? 'Left' : 'Right';
                const isLeft = label === 'Left';
                const pinch = this.calcPinchDistance(hand);

                if (isLeft) { leftPinch = pinch; hasLeft = true; }
                else { rightPinch = pinch; hasRight = true; }

                const c = this.palmCenter(hand);
                const prevX = this.prevHandX[label];
                if (prevX !== null) {
                    windSum += (c.x - prevX);
                    windCount++;
                }
                this.prevHandX[label] = c.x;
            }

            if (windCount > 0) this.targetWindForce = (windSum / windCount) * 12;

            // Pinch distance is 0 when fingers touch, 1 when spread — invert
            // so a closed pinch (matching the on-screen instructions) drives
            // bloom/growth up.
            this.targetBloom = hasLeft ? (1 - leftPinch) : 0;
            this.targetGrowth = hasRight ? (1 - rightPinch) : 0;

            if (!hasLeft) this.prevHandX.Left = null;
            if (!hasRight) this.prevHandX.Right = null;

            this.hintLeftEl.classList.toggle('hidden', !hasLeft);
            this.hintRightEl.classList.toggle('hidden', !hasRight);
        } else {
            this.targetBloom *= 0.94;
            this.targetGrowth *= 0.94;
            this.targetWindForce *= 0.9;
            this.prevHandX.Left = null;
            this.prevHandX.Right = null;
            this.hintLeftEl.classList.add('hidden');
            this.hintRightEl.classList.add('hidden');
        }
    }

    /** 0 (pinched/touching) → 1 (fully spread), normalized by hand size */
    calcPinchDistance(lm) {
        const thumb = lm[4];
        const index = lm[8];
        const wrist = lm[0];
        const mcp = lm[9];
        const ref = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        if (ref < 0.01) return 0;
        const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        return Math.min(1, Math.max(0, (dist / ref - 0.15) * 1.6));
    }

    palmCenter(lm) {
        const ids = [0, 5, 9, 13, 17];
        let x = 0, y = 0;
        for (const i of ids) { x += lm[i].x; y += lm[i].y; }
        return { x: x / ids.length, y: y / ids.length };
    }

    // =============================================================
    // RENDERING
    // =============================================================

    drawStem(baseX, baseY, height, windAngle) {
        const ctx = this.ctx;
        const segs = 24;
        const segH = height / segs;
        const pts = [{ x: baseX, y: baseY }];

        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const windBend = windAngle * t * t * 40;
            const sway = this.noise.get(this.time * 0.55 + i * 0.25, 0) * 9 * t;
            pts.push({ x: baseX + windBend + sway, y: baseY - segH * i });
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(127, 166, 107, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(127, 166, 107, 0.25)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.lineWidth = 3.2;
        ctx.strokeStyle = '#4d7a3f';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        this.drawLeaves(pts);
        ctx.restore();

        return { tip: pts[pts.length - 1], pts };
    }

    drawLeaves(stemPts) {
        const ctx = this.ctx;
        const positions = [0.28, 0.5, 0.7];

        for (let li = 0; li < positions.length; li++) {
            const idx = Math.floor(positions[li] * (stemPts.length - 1));
            const pt = stemPts[idx];
            const side = li % 2 === 0 ? 1 : -1;
            const len = 20 + this.growth * 16;
            const angle = side * (0.45 + this.noise.get(this.time * 0.55 + li * 3, 2) * 0.2);

            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(angle);
            const grad = ctx.createLinearGradient(0, 0, len, 0);
            grad.addColorStop(0, 'rgba(77, 122, 63, 0.85)');
            grad.addColorStop(1, 'rgba(127, 166, 107, 0.4)');
            ctx.fillStyle = grad;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(127, 166, 107, 0.2)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(len * 0.5, -9, len, -1);
            ctx.quadraticCurveTo(len * 0.5, 9, 0, 0);
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * Peony-style head: concentric rings of petals opening around a
     * full circle (rather than a single upward tulip shape), with
     * outer rings opening before inner ones for a layered bloom.
     */
    drawFlowerHead(cx, cy, bloom, windAngle, scale, hue = 342) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(cx, cy);

        // Ambient glow (tinted to this plant's hue)
        const glowR = (55 + bloom * 130) * scale;
        if (bloom > 0.02) {
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            glow.addColorStop(0, `hsla(${hue}, 75%, 68%, ${0.35 * bloom})`);
            glow.addColorStop(0.55, `hsla(${hue + 40}, 80%, 62%, ${0.14 * bloom})`);
            glow.addColorStop(1, `hsla(${hue}, 75%, 68%, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Unopened bud, fades out as petals take over
        if (bloom < 0.35) {
            const budAlpha = 1 - bloom / 0.35;
            const budR = 14 * scale;
            ctx.save();
            ctx.globalAlpha = budAlpha;
            const bg = ctx.createRadialGradient(0, -budR * 0.3, 0, 0, 0, budR);
            bg.addColorStop(0, `hsla(${hue}, 45%, 55%, 0.9)`);
            bg.addColorStop(1, `hsla(${hue}, 40%, 32%, 0.9)`);
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.ellipse(0, 0, budR * 0.75, budR, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const maxPetalLen = 78 * scale;
        const rings = [
            { count: 10, lenMul: 1.00, widMul: 0.40, startAt: 0.00, hueShift: -6, lightShift: -4, rot: 0 },
            { count: 8,  lenMul: 0.76, widMul: 0.36, startAt: 0.18, hueShift: 4,  lightShift: 3,  rot: Math.PI / 8 },
            { count: 6,  lenMul: 0.52, widMul: 0.32, startAt: 0.38, hueShift: 12, lightShift: 9,  rot: Math.PI / 6 },
            { count: 5,  lenMul: 0.30, widMul: 0.30, startAt: 0.6,  hueShift: 20, lightShift: 15, rot: Math.PI / 5 },
        ];

        const baseHue = hue; // this plant's color, warmed/cooled slightly ring to ring

        for (const ring of rings) {
            const ringBloom = Math.min(1, Math.max(0, (bloom - ring.startAt) / (1 - ring.startAt)));
            if (ringBloom <= 0.001) continue;
            const len = maxPetalLen * ring.lenMul * ringBloom;
            const wid = len * (ring.widMul / ring.lenMul) * (0.55 + ringBloom * 0.6);

            for (let i = 0; i < ring.count; i++) {
                const baseAngle = (i / ring.count) * Math.PI * 2 + ring.rot;
                const flutter = this.noise.get(this.time * 1.1 + baseAngle * 3, (i + ring.count) % 8) * 0.05;
                const finalAngle = baseAngle + flutter + windAngle * 0.06;

                this.drawPeonyPetal(
                    ctx, finalAngle, len, wid,
                    baseHue + ring.hueShift, 72, 58 + ring.lightShift,
                    ringBloom
                );
            }
        }

        // Center stamens once mostly open
        if (bloom > 0.45) {
            const a = (bloom - 0.45) / 0.55;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = 'rgba(232, 196, 104, 0.95)';
            const count = 6;
            for (let i = 0; i < count; i++) {
                const ang = (i / count) * Math.PI * 2 + this.time * 0.4;
                const r = 6 * scale;
                ctx.beginPath();
                ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, 2.2 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(0, 0, 3.5 * scale, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200, 220, 140, 0.9)';
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    drawPeonyPetal(ctx, angle, length, width, hue, sat, light, alpha) {
        ctx.save();
        ctx.rotate(angle);

        const grad = ctx.createLinearGradient(0, 0, length, 0);
        grad.addColorStop(0, `hsla(${hue + 12}, ${sat}%, ${light - 10}%, ${0.85 * alpha})`);
        grad.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${light}%, ${0.85 * alpha})`);
        grad.addColorStop(1, `hsla(${hue - 8}, ${sat + 8}%, ${light + 14}%, ${0.9 * alpha})`);

        ctx.fillStyle = grad;
        ctx.shadowBlur = 10 + alpha * 12;
        ctx.shadowColor = `hsla(${hue}, 90%, 70%, ${0.2 * alpha})`;

        // Petal points outward from center (+X direction after rotation)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(length * 0.3, -width, length * 0.85, -width * 0.7, length, 0);
        ctx.bezierCurveTo(length * 0.85, width * 0.7, length * 0.3, width, 0, 0);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = `hsla(${hue + 10}, ${sat}%, ${light + 16}%, ${0.2 * alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length * 0.82, 0);
        ctx.stroke();

        ctx.restore();
    }

    drawBranch(startX, startY, baseAngle, length, windAngle, scale) {
        const ctx = this.ctx;
        const segs = 12;
        const segL = length / segs;
        const pts = [{ x: startX, y: startY }];

        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const windBend = windAngle * t * t * 15;
            const sway = this.noise.get(this.time * 0.75 + i * 0.3, 5) * 4 * t;
            const angle = baseAngle + windBend * 0.02 + sway * 0.01;
            pts.push({
                x: pts[pts.length - 1].x + Math.cos(angle) * segL + windBend * 0.3,
                y: pts[pts.length - 1].y + Math.sin(angle) * segL,
            });
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4 * scale;
        ctx.strokeStyle = 'rgba(127, 166, 107, 0.18)';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(127, 166, 107, 0.2)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.lineWidth = 2.3 * scale;
        ctx.strokeStyle = '#4d7a3f';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();

        return pts[pts.length - 1];
    }

    /**
     * Auto-generates evenly spaced side-branch positions for a stem,
     * alternating left/right, tapering size toward the top. Used so
     * each PLANTS entry only needs a branchCount, not manual coords.
     */
    getBranchLayout(count) {
        const layout = [];
        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            layout.push({
                heightRatio: 0.24 + t * 0.56,
                direction: i % 2 === 0 ? -1 : 1,
                lengthFactor: 0.16 - t * 0.05,
                scaleFactor: 0.46 - t * 0.08,
            });
        }
        return layout;
    }

    // =============================================================
    // VINE RAIL — signature progress element
    // =============================================================
    updateVineRail(progress) {
        const offset = this.vinePathLength * (1 - progress);
        this.vineFillEl.style.strokeDashoffset = String(Math.max(0, offset));
    }

    // =============================================================
    // FULL-BLOOM REVEAL
    // =============================================================
    updateReveal(dt) {
        const inFullBloom = this.bloom > 0.92 && this.growth > 0.85;
        if (inFullBloom && !this.revealShown && !this.revealDismissed) {
            this.fullBloomTimer += dt * 0.016;
            if (this.fullBloomTimer > 1.6) {
                this.revealEl.classList.remove('hidden');
                this.revealShown = true;
            }
        } else if (!inFullBloom) {
            this.fullBloomTimer = 0;
            if (this.revealShown && (this.bloom < 0.6 || this.growth < 0.5)) {
                this.revealShown = false;
                this.revealDismissed = false;
                this.revealEl.classList.add('hidden');
            }
        }
    }

    // =============================================================
    // SAVE SNAPSHOT
    // =============================================================
    saveSnapshot() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const octx = out.getContext('2d');

        // Both the video and the on-screen canvas are unmirrored pixel
        // buffers (the mirroring is a CSS transform), so mirror both
        // here identically to match what's actually seen on screen.
        // When using touch controls there's no video feed to draw.
        octx.save();
        octx.translate(w, 0);
        octx.scale(-1, 1);
        if (!this.usingTouchControls && this.video.readyState >= 2) {
            octx.drawImage(this.video, 0, 0, w, h);
        }
        octx.drawImage(this.canvas, 0, 0, w, h);
        octx.restore();

        out.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bloom-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    // =============================================================
    // ANIMATION LOOP
    // =============================================================
    animate(timestamp) {
        const dt = this.lastTimestamp ? (timestamp - this.lastTimestamp) / 16.67 : 1;
        this.lastTimestamp = timestamp;
        this.time += 0.016 * dt;

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        const lerpSpeed = 0.07 * dt;
        this.bloom += (this.targetBloom - this.bloom) * lerpSpeed;
        this.growth += (this.targetGrowth - this.growth) * 0.05 * dt;
        this.windForce += (this.targetWindForce - this.windForce) * 0.06 * dt;

        const naturalWind = CONFIG.reducedMotion ? 0 : this.noise.get(this.time * 0.6, 1) * 0.1;
        const totalWind = naturalWind + this.windForce * 0.18;

        ctx.clearRect(0, 0, cw, ch);

        for (const p of this.particles) {
            p.update(totalWind, dt);
            p.draw(ctx);
        }

        if (this.growth > 0.005) {
            for (const plant of PLANTS) {
                const stemBaseX = cw * plant.xRatio;
                const stemBaseY = ch * 0.95;
                const stemH = ch * 0.44 * this.growth * plant.sizeMult;
                const flowerScale = 1.55 * this.growth * plant.sizeMult;

                const stemData = this.drawStem(stemBaseX, stemBaseY, stemH, totalWind);
                const tip = stemData.tip;
                const pts = stemData.pts;

                const branchConfigs = this.getBranchLayout(plant.branchCount);
                for (const config of branchConfigs) {
                    const idx = Math.floor(pts.length * config.heightRatio);
                    if (idx > 0 && idx < pts.length) {
                        const pt = pts[idx];
                        const prevPt = pts[idx - 1] || pt;
                        const tangent = Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x);
                        const branchAngle = tangent + (config.direction * 0.75);
                        const branchLength = ch * config.lengthFactor * this.growth * plant.sizeMult;
                        const branchTip = this.drawBranch(pt.x, pt.y, branchAngle, branchLength, totalWind, this.growth);
                        this.drawFlowerHead(branchTip.x, branchTip.y, this.bloom, totalWind, flowerScale * config.scaleFactor, plant.hue);
                    }
                }

                this.drawFlowerHead(tip.x, tip.y, this.bloom, totalWind, flowerScale, plant.hue);
            }
        }

        // Vine rail tracks overall journey (growth gets to the top,
        // bloom fills in the color along the way)
        const progress = Math.min(1, this.growth * 0.55 + this.bloom * 0.45);
        this.updateVineRail(progress);

        // Live stat readout
        this.statBloomEl.textContent = `${Math.round(this.bloom * 100)}%`;
        this.statGrowEl.textContent = `${Math.round(this.growth * 100)}%`;

        // Sound + reveal
        this.sound.onBloomUpdate(this.bloom);
        this.updateReveal(dt);

        requestAnimationFrame((ts) => this.animate(ts));
    }
}

// =============================================================
// BOOT
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    new GardenApp();
});
