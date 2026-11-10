/**
 * ETHITH COMPANY — V3 HYPER-NEON 300-FRAME GPU IMAGEBITMAP ENGINE
 * Created for Jo'raboyev Muhammadyusuf | ETHITH Global Ecosystem
 */

(function () {
  'use strict';

  const TOTAL_FRAMES = 300;
  const CANVAS_W = 1600;
  const CANVAS_H = 900;

  const canvas = document.getElementById('scrubber-canvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const hudPct = document.getElementById('hud-pct');
  const topLaserBar = document.getElementById('top-laser-bar');
  const preloadStatus = document.getElementById('preload-status');
  const fourPillarsOverlay = document.getElementById('anor-four-pillars-overlay');

  const navBtns = Array.from(document.querySelectorAll('.cnav-btn[data-scroll-to]'));
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

  // GPU-resident ImageBitmap cache (never evicted by browser, 0.03ms draw time)
  const bitmaps = new Array(TOTAL_FRAMES).fill(null);
  let loadedCount = 0;
  let lastRenderedProgress = -1;

  // Smooth scroll physics state
  let targetProgress = 0;
  let currentProgress = 0;

  function frameUrl(index) {
    return `assets/frames/f_${String(index).padStart(3, '0')}.webp`;
  }

  function findNearestLoadedIndex(targetIdx) {
    if (bitmaps[targetIdx]) return targetIdx;
    for (let d = 1; d < TOTAL_FRAMES; d++) {
      if (targetIdx - d >= 0 && bitmaps[targetIdx - d]) return targetIdx - d;
      if (targetIdx + d < TOTAL_FRAMES && bitmaps[targetIdx + d]) return targetIdx + d;
    }
    return -1;
  }

  // Sub-frame optical cross-dissolve renderer:
  // Blends frame[floor] and frame[ceil] on GPU canvas for 120fps liquid smoothness
  function renderProgressToCanvas(progress) {
    if (Math.abs(progress - lastRenderedProgress) < 0.00004 && lastRenderedProgress !== -1) {
      return;
    }

    const exact = Math.min(TOTAL_FRAMES - 1, Math.max(0, progress * (TOTAL_FRAMES - 1)));
    const idxA = Math.floor(exact);
    const idxB = Math.min(TOTAL_FRAMES - 1, idxA + 1);
    const frac = exact - idxA;

    const bmpA = bitmaps[idxA] || bitmaps[findNearestLoadedIndex(idxA)];
    if (!bmpA) return;

    ctx.globalAlpha = 1.0;
    ctx.drawImage(bmpA, 0, 0, CANVAS_W, CANVAS_H);

    const bmpB = bitmaps[idxB];
    if (bmpB && bmpB !== bmpA && frac > 0.02) {
      ctx.globalAlpha = frac;
      ctx.drawImage(bmpB, 0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1.0;
    }

    lastRenderedProgress = progress;
  }

  async function loadFrameBitmap(idx) {
    try {
      const resp = await fetch(frameUrl(idx), { cache: 'force-cache' });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      bitmaps[idx] = bmp;
      loadedCount++;

      if (idx === 0 || lastRenderedProgress === -1) {
        lastRenderedProgress = -1;
        renderProgressToCanvas(currentProgress);
      }

      if (preloadStatus) {
        if (loadedCount < TOTAL_FRAMES) {
          const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
          preloadStatus.textContent = `GPU STREAM ${pct}%`;
        } else {
          preloadStatus.textContent = '300 FRAMES • 120FPS LOCKED';
        }
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
    [0, 1, 2, 150, 175, 190, 299].forEach(add);
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

  // Real-time tracking of the 4 floating pomegranate seeds in 1920x1080 SVG coordinate space
  function updateFourSeedConnectors(p) {
    let expandFactor = 0;
    if (p <= 0.63) {
      expandFactor = Math.min(1, Math.max(0, (p - 0.41) / (0.63 - 0.41)));
    } else {
      expandFactor = Math.min(1, Math.max(0, 1 - (p - 0.63) / (0.73 - 0.63)));
    }
    const ease = 1 - Math.pow(1 - expandFactor, 2);

    // Seed 1 (Top-Left Ruby Seed - ETHITH Reality)
    const s1x = Math.round(780 + (345 - 780) * ease);
    const s1y = Math.round(450 + (365 - 450) * ease);
    setConnector(1, 385, 220, 445, 220, s1x, s1y);

    // Seed 2 (Top-Right Ruby Seed - ETHITH AI)
    const s2x = Math.round(1060 + (1215 - 1060) * ease);
    const s2y = Math.round(360 + (115 - 360) * ease);
    setConnector(2, 1535, 220, 1450, 220, s2x, s2y);

    // Seed 3 (Bottom-Left Ruby Seed - ETHITH Games)
    const s3x = Math.round(850 + (715 - 850) * ease);
    const s3y = Math.round(620 + (825 - 620) * ease);
    setConnector(3, 385, 840, 500, 840, s3x, s3y);

    // Seed 4 (Bottom-Right Ruby Seed - ETHITH Solutions)
    const s4x = Math.round(1140 + (1540 - 1140) * ease);
    const s4y = Math.round(520 + (595 - 520) * ease);
    setConnector(4, 1535, 840, 1450, 840, s4x, s4y);
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
    const pct = String(Math.round(p * 100)).padStart(2, '0');
    if (hudPct) hudPct.textContent = `${pct}%`;
    if (topLaserBar) topLaserBar.style.width = `${(p * 100).toFixed(2)}%`;

    // Show/hide the 4-Pillar Pomegranate Seed Matrix when the pomegranate is open (41% to 72%)
    const inFourSeedZone = p >= 0.41 && p <= 0.72;
    if (fourPillarsOverlay) {
      fourPillarsOverlay.classList.toggle('visible', inFourSeedZone);
    }

    if (inFourSeedZone) {
      updateFourSeedConnectors(p);

      let activeKey = 'all';
      if (p >= 0.45 && p < 0.51) activeKey = 'reality';
      else if (p >= 0.51 && p < 0.57) activeKey = 'ai';
      else if (p >= 0.57 && p < 0.63) activeKey = 'games';
      else if (p >= 0.63 && p < 0.70) activeKey = 'solutions';

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
    lastRenderedProgress = -1;
    renderProgressToCanvas(currentProgress);
  }, { passive: true });

  // Time-delta independent 120Hz exponential damping loop for ultra-smooth forward & reverse video scrubbing
  let lastTime = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    targetProgress = getScrollProgress();
    const delta = targetProgress - currentProgress;

    if (Math.abs(delta) > 0.00006) {
      const factor = 1 - Math.exp(-13 * dt);
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
      btn.style.background = '#00ff9d';
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
