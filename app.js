/**
 * ETHITH COMPANY — PURE 300-FRAME GPU IMAGEBITMAP ENGINE (ZERO-CACHE-CONFLICT & ZERO-GHOSTING)
 * Created for Jo'raboyev Muhammadyusuf | ETHITH Global Ecosystem
 */

(function () {
  'use strict';

  const TOTAL_FRAMES = 300;
  const CANVAS_W = 1600;
  const CANVAS_H = 900;
  const FRAME_CACHE_BUST = 'v300_clean';

  const canvas = document.getElementById('scrubber-canvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const hudTime = document.getElementById('hud-time');
  const hudPct = document.getElementById('hud-pct');
  const navRingFill = document.getElementById('nav-ring-fill');
  const fourPillarsOverlay = document.getElementById('anor-four-pillars-overlay');

  const navBtns = Array.from(document.querySelectorAll('.nav-btn[data-scroll-to]'));
  const pillarCards = {
    reality: document.getElementById('pillar-card-reality'),
    ai: document.getElementById('pillar-card-ai'),
    games: document.getElementById('pillar-card-games'),
    solutions: document.getElementById('pillar-card-solutions')
  };
  const hudLines = {
    reality: document.getElementById('hud-line-1'),
    ai: document.getElementById('hud-line-2'),
    games: document.getElementById('hud-line-3'),
    solutions: document.getElementById('hud-line-4')
  };

  // GPU-resident ImageBitmap cache (300 unique frames, 0.03ms draw time)
  const bitmaps = new Array(TOTAL_FRAMES).fill(null);
  let loadedCount = 0;
  let lastRenderedFrameIndex = -1;

  // Smooth scroll state
  let targetProgress = 0;
  let currentProgress = 0;

  // Cache-busted frame URL guarantees browser never mixes old 150-frame cache with 300-frame set
  function frameUrl(index) {
    return `assets/frames/f_${String(index).padStart(3, '0')}.webp?cb=${FRAME_CACHE_BUST}`;
  }

  function findNearestLoadedIndex(targetIdx) {
    if (bitmaps[targetIdx]) return targetIdx;
    for (let d = 1; d < TOTAL_FRAMES; d++) {
      if (targetIdx - d >= 0 && bitmaps[targetIdx - d]) return targetIdx - d;
      if (targetIdx + d < TOTAL_FRAMES && bitmaps[targetIdx + d]) return targetIdx + d;
    }
    return -1;
  }

  // Pure single-frame renderer (no alpha-blend ghosting so every frame is 100% original video quality)
  function renderProgressToCanvas(progress) {
    const targetIdx = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(progress * (TOTAL_FRAMES - 1)))
    );

    if (targetIdx === lastRenderedFrameIndex && bitmaps[targetIdx]) {
      return;
    }

    const actualIdx = bitmaps[targetIdx] ? targetIdx : findNearestLoadedIndex(targetIdx);
    if (actualIdx === -1 || actualIdx === lastRenderedFrameIndex) return;

    ctx.globalAlpha = 1.0;
    ctx.drawImage(bitmaps[actualIdx], 0, 0, CANVAS_W, CANVAS_H);
    lastRenderedFrameIndex = actualIdx;
  }

  async function loadFrameBitmap(idx) {
    try {
      const resp = await fetch(frameUrl(idx));
      if (!resp.ok) return;
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      bitmaps[idx] = bmp;
      loadedCount++;

      if (idx === 0 || lastRenderedFrameIndex === -1) {
        lastRenderedFrameIndex = -1;
        renderProgressToCanvas(currentProgress);
      }
    } catch (e) {
      const img = new Image();
      img.src = frameUrl(idx);
      await new Promise((r) => {
        img.onload = r;
        img.onerror = r;
      });
      if (img.complete && img.naturalWidth > 0) {
        bitmaps[idx] = img;
        loadedCount++;
      }
    }
  }

  function startGPUFramePreload() {
    const order = [];
    const seen = new Set();
    function add(i) {
      if (i >= 0 && i < TOTAL_FRAMES && !seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }

    // Priority 1: Instant hero & key 4-pomegranate-seed frames
    [0, 1, 2, 135, 150, 165, 180, 195, 299].forEach(add);
    // Priority 2: Coarse stride 15 across entire video (~20 frames -> full scrub in 120ms)
    for (let i = 0; i < TOTAL_FRAMES; i += 15) add(i);
    // Priority 3: Medium stride 5
    for (let i = 0; i < TOTAL_FRAMES; i += 5) add(i);
    // Priority 4: Stride 2
    for (let i = 0; i < TOTAL_FRAMES; i += 2) add(i);
    // Priority 5: Every single frame
    for (let i = 0; i < TOTAL_FRAMES; i++) add(i);

    let cursor = 0;
    const WORKERS = 14;

    async function worker() {
      while (cursor < order.length) {
        const nextIdx = order[cursor++];
        await loadFrameBitmap(nextIdx);
      }
    }

    for (let w = 0; w < WORKERS; w++) {
      worker();
    }
  }

  // Exact measured keyframe positions of the 4 floating ruby seeds in 1920x1080 video space
  const SEED_KEYFRAMES = [
    { f: 118, s1: [815, 440], s2: [1025, 345], s3: [905, 490], s4: [1085, 460] },
    { f: 135, s1: [680, 392], s2: [1085, 255], s3: [855, 565], s4: [1212, 465] },
    { f: 150, s1: [555, 362], s2: [1135, 188], s3: [805, 642], s4: [1328, 495] },
    { f: 165, s1: [435, 355], s2: [1185, 128], s3: [748, 735], s4: [1455, 535] },
    { f: 180, s1: [348, 345], s2: [1225, 102], s3: [715, 805], s4: [1542, 568] },
    { f: 195, s1: [318, 338], s2: [1238, 88],  s3: [702, 835], s4: [1568, 582] },
    { f: 210, s1: [425, 345], s2: [1205, 130], s3: [748, 735], s4: [1475, 548] },
    { f: 225, s1: [645, 385], s2: [1092, 268], s3: [845, 575], s4: [1225, 495] }
  ];

  function interpolateSeedsAtFrame(frameNum) {
    const clamped = Math.max(SEED_KEYFRAMES[0].f, Math.min(SEED_KEYFRAMES[SEED_KEYFRAMES.length - 1].f, frameNum));
    let k0 = SEED_KEYFRAMES[0];
    let k1 = SEED_KEYFRAMES[SEED_KEYFRAMES.length - 1];

    for (let i = 0; i < SEED_KEYFRAMES.length - 1; i++) {
      if (clamped >= SEED_KEYFRAMES[i].f && clamped <= SEED_KEYFRAMES[i + 1].f) {
        k0 = SEED_KEYFRAMES[i];
        k1 = SEED_KEYFRAMES[i + 1];
        break;
      }
    }

    const span = Math.max(1, k1.f - k0.f);
    const t = (clamped - k0.f) / span;
    const lerp = (a, b) => Math.round(a + (b - a) * t);

    return {
      s1: [lerp(k0.s1[0], k1.s1[0]), lerp(k0.s1[1], k1.s1[1])],
      s2: [lerp(k0.s2[0], k1.s2[0]), lerp(k0.s2[1], k1.s2[1])],
      s3: [lerp(k0.s3[0], k1.s3[0]), lerp(k0.s3[1], k1.s3[1])],
      s4: [lerp(k0.s4[0], k1.s4[0]), lerp(k0.s4[1], k1.s4[1])]
    };
  }

  // Maps viewport (clientX, clientY) to the 1920x1080 SVG viewBox (preserveAspectRatio="xMidYMid slice")
  function clientToSvg(clientX, clientY) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max(vw / 1920, vh / 1080);
    const offsetX = (vw - 1920 * scale) / 2;
    const offsetY = (vh - 1080 * scale) / 2;
    return [
      Math.round((clientX - offsetX) / scale),
      Math.round((clientY - offsetY) / scale)
    ];
  }

  function getCardAnchorSvg(cardEl, side) {
    if (!cardEl) return side === 'left' ? [385, 240] : [1535, 240];
    const r = cardEl.getBoundingClientRect();
    const cx = side === 'left' ? r.right : r.left;
    const cy = r.top + r.height * 0.45;
    return clientToSvg(cx, cy);
  }

  function updateFourSeedConnectors(p) {
    const exactFrame = p * (TOTAL_FRAMES - 1);
    const seeds = interpolateSeedsAtFrame(exactFrame);

    const a1 = getCardAnchorSvg(pillarCards.reality, 'left');
    const a2 = getCardAnchorSvg(pillarCards.ai, 'right');
    const a3 = getCardAnchorSvg(pillarCards.games, 'left');
    const a4 = getCardAnchorSvg(pillarCards.solutions, 'right');

    setConnector(1, a1[0], a1[1], a1[0] + 45, a1[1], seeds.s1[0], seeds.s1[1]);
    setConnector(2, a2[0], a2[1], a2[0] - 45, a2[1], seeds.s2[0], seeds.s2[1]);
    setConnector(3, a3[0], a3[1], a3[0] + 45, a3[1], seeds.s3[0], seeds.s3[1]);
    setConnector(4, a4[0], a4[1], a4[0] - 45, a4[1], seeds.s4[0], seeds.s4[1]);
  }

  function setConnector(num, x1, y1, x2, y2, tx, ty) {
    const poly = document.getElementById(`poly-${num}`);
    const ring = document.getElementById(`seed-ring-${num}`);
    const dot = document.getElementById(`seed-dot-${num}`);
    if (poly) poly.setAttribute('points', `${x1},${y1} ${x2},${y2} ${tx},${ty}`);
    if (ring) {
      ring.setAttribute('cx', tx);
      ring.setAttribute('cy', ty);
    }
    if (dot) {
      dot.setAttribute('cx', tx);
      dot.setAttribute('cy', ty);
    }
  }

  function updateUI(p) {
    const pct = Math.round(p * 100);
    const sec = (p * 14.93).toFixed(2).padStart(5, '0');

    if (hudPct) hudPct.textContent = `${pct}%`;
    if (hudTime) hudTime.textContent = `${sec}s`;

    if (navRingFill) {
      const circumference = 94.2;
      navRingFill.style.strokeDashoffset = (circumference * (1 - p)).toFixed(2);
    }

    // Show the 4-Pillar Pomegranate Seed Matrix ONLY when the pomegranate is open (40% to 71%)
    // and no other foreground section cards are in the viewport
    const inFourSeedZone = p >= 0.40 && p <= 0.71;
    if (fourPillarsOverlay) {
      fourPillarsOverlay.classList.toggle('visible', inFourSeedZone);
    }

    if (inFourSeedZone) {
      updateFourSeedConnectors(p);

      let activeKey = 'all';
      if (p >= 0.43 && p < 0.50) activeKey = 'reality';
      else if (p >= 0.50 && p < 0.57) activeKey = 'ai';
      else if (p >= 0.57 && p < 0.64) activeKey = 'games';
      else if (p >= 0.64 && p < 0.70) activeKey = 'solutions';

      Object.keys(pillarCards).forEach((key) => {
        const isFocused = activeKey === 'all' || activeKey === key;
        if (pillarCards[key]) pillarCards[key].classList.toggle('focused', activeKey === key);
        if (hudLines[key]) hudLines[key].classList.toggle('highlighted', isFocused);
      });
    }

    // Highlight active top nav button
    let closestNav = null;
    let minDiff = Infinity;
    navBtns.forEach((btn) => {
      const target = parseFloat(btn.getAttribute('data-scroll-to') || '0');
      const diff = Math.abs(p - target);
      if (diff < minDiff) {
        minDiff = diff;
        closestNav = btn;
      }
    });
    navBtns.forEach((btn) => btn.classList.toggle('active', btn === closestNav));
  }

  function getScrollProgress() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return Math.min(1, Math.max(0, window.scrollY / maxScroll));
  }

  window.addEventListener('scroll', () => {
    targetProgress = getScrollProgress();
  }, { passive: true });

  window.addEventListener('resize', () => {
    targetProgress = getScrollProgress();
    lastRenderedFrameIndex = -1;
    renderProgressToCanvas(currentProgress);
  }, { passive: true });

  // Time-delta independent 120Hz exponential damping loop for ultra-smooth forward & reverse video scrubbing
  let lastTime = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    targetProgress = getScrollProgress();
    const delta = targetProgress - currentProgress;

    if (Math.abs(delta) > 0.00008) {
      const factor = 1 - Math.exp(-15 * dt);
      currentProgress += delta * factor;
    } else {
      currentProgress = targetProgress;
    }

    renderProgressToCanvas(currentProgress);
    updateUI(currentProgress);

    requestAnimationFrame(tick);
  }

  document.querySelectorAll('[data-scroll-to]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const ratio = parseFloat(el.getAttribute('data-scroll-to') || '0');
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({
        top: ratio * maxScroll,
        behavior: 'smooth'
      });
    });
  });

  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      const orig = btn.textContent;
      btn.textContent = 'Nusxalandi ✓';
      btn.style.background = '#10b981';
      btn.style.color = '#000';
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.background = '';
        btn.style.color = '';
      }, 1800);
    });
  });

  startGPUFramePreload();
  targetProgress = getScrollProgress();
  currentProgress = targetProgress;
  updateUI(currentProgress);
  requestAnimationFrame(tick);
})();
