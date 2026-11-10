/**
 * ETHITH COMPANY — ULTRA-FAST 1080P SCROLL-SCRUBBED VIDEO & 4 POMEGRANATE PILLARS ENGINE
 * Created for ETHITH Company (Reality • AI • Games • Solutions)
 */

(function () {
  'use strict';

  const TOTAL_FRAMES = 150;
  const VIDEO_DURATION = 14.93;

  const canvas = document.getElementById('scrubber-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const hudTime = document.getElementById('hud-time');
  const hudPct = document.getElementById('hud-pct');
  const navRingFill = document.getElementById('nav-ring-fill');
  const railFill = document.getElementById('rail-fill');
  const fourPillarsOverlay = document.getElementById('anor-four-pillars-overlay');

  const navBtns = Array.from(document.querySelectorAll('.nav-btn[data-scroll-to]'));
  const railDots = Array.from(document.querySelectorAll('.rail-dot[data-scroll-to]'));
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

  // Frame cache array
  const frames = new Array(TOTAL_FRAMES).fill(null);
  let lastDrawnFrameIndex = -1;

  // Scroll interpolation state
  let targetProgress = 0;
  let currentProgress = 0;

  function frameUrl(index) {
    const padded = String(index).padStart(3, '0');
    return `assets/frames/f_${padded}.webp`;
  }

  // Draw the closest available loaded frame so scrubbing NEVER blanks out or stutters
  function drawFrameForProgress(progress) {
    const exactIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(progress * (TOTAL_FRAMES - 1))));
    let bestIndex = exactIndex;

    if (!frames[bestIndex]) {
      // Find nearest loaded frame within distance
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        if (exactIndex - offset >= 0 && frames[exactIndex - offset]) {
          bestIndex = exactIndex - offset;
          break;
        }
        if (exactIndex + offset < TOTAL_FRAMES && frames[exactIndex + offset]) {
          bestIndex = exactIndex + offset;
          break;
        }
      }
    }

    const img = frames[bestIndex];
    if (img && bestIndex !== lastDrawnFrameIndex) {
      ctx.drawImage(img, 0, 0, 1920, 1080);
      lastDrawnFrameIndex = bestIndex;
    }
  }

  // Priority-ordered progressive frame loader:
  // Loads frame 0 immediately, then coarse keyframes, then all remaining frames in parallel
  function startProgressivePreload() {
    const priorityOrder = [];
    const seen = new Set();

    function enqueue(idx) {
      if (idx >= 0 && idx < TOTAL_FRAMES && !seen.has(idx)) {
        seen.add(idx);
        priorityOrder.push(idx);
      }
    }

    // 1. First frame & key 4-pomegranate-seed frames for instant response
    [0, 1, 75, 90, 95, 102, 149].forEach(enqueue);

    // 2. Stride 10 across full timeline
    for (let i = 0; i < TOTAL_FRAMES; i += 10) enqueue(i);
    // 3. Stride 3 across full timeline
    for (let i = 0; i < TOTAL_FRAMES; i += 3) enqueue(i);
    // 4. Every single frame
    for (let i = 0; i < TOTAL_FRAMES; i++) enqueue(i);

    let cursor = 0;
    const CONCURRENCY = 8;

    function loadNext() {
      if (cursor >= priorityOrder.length) return;
      const frameIdx = priorityOrder[cursor++];
      const img = new Image();
      img.decoding = 'async';
      img.src = frameUrl(frameIdx);
      img.onload = () => {
        frames[frameIdx] = img;
        if (frameIdx === 0 || lastDrawnFrameIndex === -1) {
          drawFrameForProgress(currentProgress);
        }
        loadNext();
      };
      img.onerror = () => {
        loadNext();
      };
    }

    for (let w = 0; w < CONCURRENCY; w++) {
      loadNext();
    }
  }

  // Dynamic coordinate tracking for the 4 floating pomegranate seeds (anor donalari)
  // in 1920x1080 space across scroll progress 0.38 -> 0.77
  function updateFourSeedConnectors(p) {
    // Normalize t within [0.38, 0.76]
    // From 0.38 to 0.65 seeds expand outward from center (960, 520) to outer positions;
    // From 0.65 to 0.76 seeds contract back toward center
    let expandFactor = 0;
    if (p <= 0.65) {
      expandFactor = Math.min(1, Math.max(0, (p - 0.38) / (0.65 - 0.38)));
    } else {
      expandFactor = Math.min(1, Math.max(0, 1 - (p - 0.65) / (0.77 - 0.65)));
    }
    // Smooth ease out
    const ease = 1 - Math.pow(1 - expandFactor, 2);

    // Seed 1 (Top-Left Ruby Seed - ETHITH Reality)
    const s1x = Math.round(780 + (345 - 780) * ease);
    const s1y = Math.round(450 + (365 - 450) * ease);
    setConnector(1, 430, 235, 510, 235, s1x, s1y);

    // Seed 2 (Top-Right Ruby Seed - ETHITH AI)
    const s2x = Math.round(1060 + (1215 - 1060) * ease);
    const s2y = Math.round(360 + (115 - 360) * ease);
    setConnector(2, 1490, 235, 1380, 235, s2x, s2y);

    // Seed 3 (Bottom-Left Ruby Seed - ETHITH Games)
    const s3x = Math.round(850 + (715 - 850) * ease);
    const s3y = Math.round(620 + (825 - 620) * ease);
    setConnector(3, 430, 845, 540, 845, s3x, s3y);

    // Seed 4 (Bottom-Right Ruby Seed - ETHITH Solutions)
    const s4x = Math.round(1140 + (1540 - 1140) * ease);
    const s4y = Math.round(520 + (595 - 520) * ease);
    setConnector(4, 1490, 845, 1390, 845, s4x, s4y);
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
    const timeSec = (p * VIDEO_DURATION).toFixed(2).padStart(5, '0');

    if (hudTime) hudTime.textContent = `${timeSec}s`;
    if (hudPct) hudPct.textContent = `${pct}%`;

    if (navRingFill) {
      const circumference = 94.2;
      navRingFill.style.strokeDashoffset = (circumference * (1 - p)).toFixed(2);
    }

    if (railFill) {
      railFill.style.height = `${(p * 100).toFixed(1)}%`;
    }

    // Show/hide the 4-Pillar Pomegranate Seed Overlay when the pomegranate is open (36% to 77%)
    const inFourSeedZone = p >= 0.36 && p <= 0.77;
    if (fourPillarsOverlay) {
      fourPillarsOverlay.classList.toggle('visible', inFourSeedZone);
    }

    if (inFourSeedZone) {
      updateFourSeedConnectors(p);

      // Highlight individual pillar cards sequentially as user scrolls through the 4 seeds,
      // while keeping all 4 visible on the edges
      let activeKey = 'all';
      if (p >= 0.43 && p < 0.51) activeKey = 'reality';
      else if (p >= 0.51 && p < 0.59) activeKey = 'ai';
      else if (p >= 0.59 && p < 0.67) activeKey = 'games';
      else if (p >= 0.67 && p < 0.75) activeKey = 'solutions';

      Object.keys(pillarCards).forEach((key) => {
        const isFocused = activeKey === 'all' || activeKey === key;
        if (pillarCards[key]) pillarCards[key].classList.toggle('focused', activeKey === key);
        if (hudLines[key]) hudLines[key].classList.toggle('highlighted', isFocused);
      });
    }

    // Update active state on top nav buttons
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

    // Update active state on right timeline rail dots
    let closestDot = null;
    let minDotDiff = Infinity;
    railDots.forEach((dot) => {
      const target = parseFloat(dot.getAttribute('data-scroll-to') || '0');
      const diff = Math.abs(p - target);
      if (diff < minDotDiff) {
        minDotDiff = diff;
        closestDot = dot;
      }
    });
    railDots.forEach((dot) => dot.classList.toggle('active', dot === closestDot));
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
  }, { passive: true });

  // Smooth 60-120fps animation loop for forward & reverse video scrubbing
  function tick() {
    targetProgress = getScrollProgress();
    const delta = targetProgress - currentProgress;

    if (Math.abs(delta) > 0.0005) {
      currentProgress += delta * 0.24;
    } else {
      currentProgress = targetProgress;
    }

    drawFrameForProgress(currentProgress);
    updateUI(currentProgress);

    requestAnimationFrame(tick);
  }

  // Smooth scroll navigation for all [data-scroll-to] buttons
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

  // Copy to clipboard buttons for Phone numbers & Gmail addresses
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
      btn.style.color = '#10b981';
      btn.style.borderColor = '#10b981';
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 1800);
    });
  });

  // Initialize immediately
  startProgressivePreload();
  targetProgress = getScrollProgress();
  currentProgress = targetProgress;
  updateUI(currentProgress);
  requestAnimationFrame(tick);
})();
