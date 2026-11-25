/**
 * Tükör-Vár — Térbeli gondolkodás, szimmetria, mentális forgatás és árnyjáték
 * 1. osztályos magyar kisiskolásoknak
 */

(() => {
  'use strict';

  const GEMS = {
    0: { name: 'Üres', hex: '#FFFFFF', border: '#C9D8E8' },
    1: { name: 'Kék', hex: '#2D5F9A', border: '#1B3F6B' },
    2: { name: 'Arany', hex: '#E8A825', border: '#B47C0E' },
    3: { name: 'Piros', hex: '#D94336', border: '#9E261C' },
  };

  /* ========================================================================
     1. Hang & Motivációs Magyar Beszéd
     ======================================================================== */
  let soundEnabled = true;
  let audioCtx = null;

  function ensureAudioCtx() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  function playTone(type) {
    if (!soundEnabled) return;
    try {
      ensureAudioCtx();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'tap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.06);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'fanfare') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + i * 0.09);
          g.gain.setValueAtTime(0.16, now + i * 0.09);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.28);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(now + i * 0.09);
          o.stop(now + i * 0.09 + 0.3);
        });
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(210, now);
        osc.frequency.linearRampToValueAtTime(145, now + 0.16);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (_) {
      // Néma fallback
    }
  }

  function speakHu(text) {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'hu-HU';
      utter.rate = 0.94;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    } catch (_) {
      // Néma fallback
    }
  }

  const MOTIVATIONAL_SUCCESS = [
    'Tökéletes szimmetria! Igazi várépítő mester vagy!',
    'Bravó! Fejben is pontosan el tudtad forgatni!',
    'Fantasztikus térlátás! Minden részlet a helyén van!',
    'Szuper megfigyelés! Pontosan láttad a tükörképet!',
  ];

  const MOTIVATIONAL_RETRY = [
    'Nézd meg újra a tükörhöz közelebbi és távolabbi kockákat!',
    'Majdnem jó! Figyeld meg, merre néz az alakzat csúcsa!',
    'Semmi gond, próbáld meg még egyszer figyelmesen!',
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function speakMotivationalSuccess() {
    if (state.stars > 0 && state.stars % 5 === 0) {
      playTone('fanfare');
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél a Tükör-Várban!`);
    } else {
      playTone('success');
      speakHu(pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Mátrix & SVG Segédfüggvények
     ======================================================================== */
  function rotateMatrix90(mat) {
    const n = mat.length;
    const res = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        res[c][n - 1 - r] = mat[r][c];
      }
    }
    return res;
  }

  function flipMatrixH(mat) {
    return mat.map((row) => row.slice().reverse());
  }

  function matrixSig(mat) {
    return mat.map((row) => row.join(',')).join('|');
  }

  function renderCrestSVG(mat, sizePx = 96) {
    const n = mat.length;
    const pad = 6;
    const cellSize = (100 - pad * 2) / n;
    let rects = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = mat[r][c];
        const fill = v ? GEMS[v].hex : '#F1E9DA';
        const stroke = v ? GEMS[v].border : '#DFD2BE';
        rects += `<rect x="${pad + c * cellSize + 1.5}" y="${pad + r * cellSize + 1.5}" width="${cellSize - 3}" height="${cellSize - 3}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      }
    }
    return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 100 100" aria-hidden="true">${rects}</svg>`;
  }

  function renderShadowSVG(heights, maxH = 3, sizePx = 96) {
    const cols = heights.length;
    const pad = 8;
    const w = (100 - pad * 2) / cols;
    const h = (100 - pad * 2) / maxH;
    let blocks = '';
    for (let c = 0; c < cols; c++) {
      for (let level = 0; level < heights[c]; level++) {
        const y = 100 - pad - (level + 1) * h;
        blocks += `<rect x="${pad + c * w + 2}" y="${y + 1.5}" width="${w - 4}" height="${h - 3}" rx="3" fill="#3B281E" stroke="#20150F" stroke-width="1.5"/>`;
      }
    }
    return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 100 100" aria-hidden="true">
      <rect x="4" y="4" width="92" height="92" rx="10" fill="#F4EFE4" stroke="#D8C9B2" stroke-width="2"/>
      ${blocks}
    </svg>`;
  }

  function renderTopDownTowerSVG(grid, sizePx = 126) {
    // 2.5D oszlopok felülnézetből, magasság-pöttyökkel és tetejükön árnyékolással
    const n = grid.length;
    const pad = 8;
    const cell = (100 - pad * 2) / n;
    let elsStr = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const ht = grid[r][c];
        const x = pad + c * cell + 2;
        const y = pad + r * cell + 2;
        const s = cell - 4;
        if (ht === 0) {
          elsStr += `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="4" fill="#EFE7D6" stroke="#D5C6AE" stroke-width="1.5"/>`;
        } else {
          const colors = ['#FFFFFF', '#5BA4E6', '#E8A825', '#D95338'];
          const fill = colors[ht] || '#D95338';
          elsStr += `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="4" fill="${fill}" stroke="#2B1E16" stroke-width="2"/>`;
          elsStr += `<text x="${x + s / 2}" y="${y + s / 2 + 4}" text-anchor="middle" font-size="${s * 0.48}" font-weight="800" fill="#FFFFFF">${ht}</text>`;
        }
      }
    }
    return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 100 100" aria-hidden="true">${elsStr}</svg>`;
  }

  /* ========================================================================
     3. Pályagenerálás (3 Mód × 3 Nehézségi Szint)
     ======================================================================== */
  function generateMirrorLevel() {
    const diff = state.difficulty;
    const rows = diff === 'easy' ? 3 : 4;
    const cols = diff === 'hard' ? 4 : 3;
    const palette = diff === 'easy' ? [1] : diff === 'medium' ? [1, 2] : [1, 2, 3];

    const leftGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
    let filled = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.52) {
          leftGrid[r][c] = pickRandom(palette);
          filled++;
        }
      }
    }
    if (filled < 2) {
      leftGrid[0][0] = palette[0];
      leftGrid[rows - 1][cols - 1] = palette[0];
    }

    return {
      rows,
      cols,
      palette,
      leftGrid,
      rightGrid: Array.from({ length: rows }, () => Array(cols).fill(0)),
      speech: 'Építsd meg a bal oldali ablak pontos tükörképét a jobb oldalon!',
    };
  }

  function generateRotateLevel() {
    const diff = state.difficulty;
    const n = diff === 'hard' ? 4 : 3;
    const colors = diff === 'easy' ? [1] : [1, 2];

    // Aszimmetrikus címer generálása
    let base = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const cand = Array.from({ length: n }, () => Array(n).fill(0));
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (Math.random() < 0.45) cand[r][c] = pickRandom(colors);
        }
      }
      cand[0][0] = colors[0];
      const s0 = matrixSig(cand);
      const s90 = matrixSig(rotateMatrix90(cand));
      const sFlip = matrixSig(flipMatrixH(cand));
      if (s0 !== s90 && s0 !== sFlip && s90 !== sFlip) {
        base = cand;
        break;
      }
    }
    if (!base) {
      base = [
        [1, 1, 0],
        [1, 0, 0],
        [0, 2, 0],
      ];
    }

    // Forgatás 90, 180 vagy 270 fokkal
    const steps = pickRandom([1, 2, 3]);
    let target = base;
    for (let i = 0; i < steps; i++) target = rotateMatrix90(target);
    const targetSig = matrixSig(target);

    const validRotationSigs = new Set();
    let rot = base;
    for (let i = 0; i < 4; i++) {
      rot = rotateMatrix90(rot);
      validRotationSigs.add(matrixSig(rot));
    }

    const distractors = [];
    const needCount = diff === 'hard' ? 3 : 2;

    // 1. Tükrözött változat
    let flipped = flipMatrixH(target);
    if (!validRotationSigs.has(matrixSig(flipped))) {
      distractors.push(flipped);
    }

    // További módosított zavaró képek
    let guard = 0;
    while (distractors.length < needCount && guard < 50) {
      guard++;
      const mut = target.map((r) => r.slice());
      const rr = Math.floor(Math.random() * n);
      const cc = Math.floor(Math.random() * n);
      mut[rr][cc] = mut[rr][cc] === 0 ? colors[0] : 0;
      const mSig = matrixSig(mut);
      if (!validRotationSigs.has(mSig) && !distractors.some((d) => matrixSig(d) === mSig)) {
        distractors.push(mut);
      }
    }

    const choices = [target, ...distractors].sort(() => Math.random() - 0.5);
    const correctIndex = choices.indexOf(target);

    return {
      base,
      choices,
      correctIndex,
      speech: 'Melyik címer ugyanaz, csak elforgatva? Figyeld meg a sarkokat!',
    };
  }

  function generateShadowLevel() {
    const diff = state.difficulty;
    const n = diff === 'hard' ? 4 : 3;
    const maxH = diff === 'easy' ? 2 : 3;

    const grid = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (Math.random() < 0.55) {
          grid[r][c] = 1 + Math.floor(Math.random() * maxH);
        }
      }
    }
    // Legalább egy oszlop ne legyen üres
    grid[0][0] = maxH;

    // Elölnézeti árnyék: minden oszlopban a legnagyobb toronymagasság
    const targetHeights = [];
    for (let c = 0; c < n; c++) {
      let mx = 0;
      for (let r = 0; r < n; r++) {
        if (grid[r][c] > mx) mx = grid[r][c];
      }
      targetHeights.push(mx);
    }

    const distractors = [];
    const needCount = diff === 'hard' ? 3 : 2;
    let guard = 0;
    while (distractors.length < needCount && guard < 60) {
      guard++;
      const cand = targetHeights.slice();
      const idx = Math.floor(Math.random() * n);
      cand[idx] = Math.floor(Math.random() * (maxH + 1));
      if (
        cand.join(',') !== targetHeights.join(',') &&
        !distractors.some((d) => d.join(',') === cand.join(','))
      ) {
        distractors.push(cand);
      }
    }

    const choices = [targetHeights, ...distractors].sort(() => Math.random() - 0.5);
    const correctIndex = choices.indexOf(targetHeights);

    return {
      grid,
      maxH,
      choices,
      correctIndex,
      speech: 'Nézd meg a tornyok magasságát! Milyen árnyékot vetnek elölről?',
    };
  }

  /* ========================================================================
     4. Játékállapot & DOM
     ======================================================================== */
  const state = {
    mode: 'mirror', // 'mirror' | 'rotate' | 'shadow'
    difficulty: 'easy', // 'easy' | 'medium' | 'hard'
    roundNum: 1,
    infiniteMode: false,
    stars: Number(localStorage.getItem('tukor_stars') || 0),
    selectedGem: 1,
    selectedChoice: null,
    currentLevel: null,
    levelCompleted: false,
  };

  const els = {
    starCount: document.getElementById('star-count-value'),
    btnInfiniteMode: document.getElementById('btn-infinite-mode'),
    btnReplayVoice: document.getElementById('btn-replay-voice'),
    btnToggleSound: document.getElementById('btn-toggle-sound'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    levelBadge: document.getElementById('level-badge'),
    promptInstruction: document.getElementById('prompt-instruction'),
    gameStage: document.getElementById('game-stage'),
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackText: document.getElementById('feedback-text'),
    actionButtons: document.getElementById('action-buttons'),
  };

  function addStars(n) {
    state.stars += n;
    localStorage.setItem('tukor_stars', String(state.stars));
    els.starCount.textContent = String(state.stars);
  }

  function setFeedback(text, kind = 'neutral') {
    els.feedbackText.textContent = text;
    els.feedbackBanner.className = 'feedback-banner';
    if (kind === 'success') els.feedbackBanner.classList.add('is-success');
    if (kind === 'warn') els.feedbackBanner.classList.add('is-warn');
  }

  /* ========================================================================
     5. Szint Betöltése & Renderelés
     ======================================================================== */
  function loadLevel() {
    state.levelCompleted = false;
    state.selectedChoice = null;
    state.selectedGem = 1;

    if (state.mode === 'mirror') {
      state.currentLevel = generateMirrorLevel();
    } else if (state.mode === 'rotate') {
      state.currentLevel = generateRotateLevel();
    } else {
      state.currentLevel = generateShadowLevel();
    }

    const prefix = state.infiniteMode ? '∞ ' : '';
    if (state.mode === 'mirror') {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. ablak — Varázstükör`;
      els.promptInstruction.textContent = 'Építsd meg a bal oldal pontos tükörképét a jobb oldalon!';
    } else if (state.mode === 'rotate') {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. címer — Forgatott Címer`;
      els.promptInstruction.textContent = 'Melyik címer ugyanaz, csak elforgatva?';
    } else {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. torony — Árnyjáték`;
      els.promptInstruction.textContent = 'Milyen árnyékot vet ez a vártorony elölről nézve?';
    }

    renderStage();
    renderActionButtons();
    setFeedback('Figyeld meg alaposan az alakzatot, és oldd meg a feladatot!');
    speakHu(state.currentLevel.speech);
  }

  function renderStage() {
    const lvl = state.currentLevel;

    if (state.mode === 'mirror') {
      const gemButtons = lvl.palette
        .map(
          (g) => `
          <button type="button" class="gem-btn ${state.selectedGem === g ? 'is-active' : ''}" data-gem="${g}">
            <span class="gem-swatch" style="background:${GEMS[g].hex}"></span>
            <span>${GEMS[g].name}</span>
          </button>
        `
        )
        .join('');

      let leftCells = '';
      let rightCells = '';
      for (let r = 0; r < lvl.rows; r++) {
        for (let c = 0; c < lvl.cols; c++) {
          const lv = lvl.leftGrid[r][c];
          leftCells += `<div class="mosaic-cell" style="background:${GEMS[lv].hex}; border-color:${GEMS[lv].border};"></div>`;

          const rv = lvl.rightGrid[r][c];
          rightCells += `<button type="button" class="mosaic-cell is-editable" data-r="${r}" data-c="${c}" style="background:${GEMS[rv].hex}; border-color:${GEMS[rv].border};" aria-label="${r + 1}. sor ${c + 1}. oszlop"></button>`;
        }
      }

      els.gameStage.innerHTML = `
        <div class="mirror-workspace">
          <div class="gem-palette" id="gem-palette">${gemButtons}</div>
          <div class="mirror-frame">
            <div class="mirror-half" style="grid-template-columns: repeat(${lvl.cols}, 1fr);">${leftCells}</div>
            <div class="mirror-axis" aria-hidden="true"></div>
            <div class="mirror-half" id="mirror-right-half" style="grid-template-columns: repeat(${lvl.cols}, 1fr);">${rightCells}</div>
          </div>
        </div>
      `;

      document.querySelectorAll('#gem-palette .gem-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.selectedGem = Number(btn.dataset.gem);
          playTone('tap');
          renderStage();
        });
      });

      document.querySelectorAll('#mirror-right-half .mosaic-cell').forEach((cell) => {
        cell.addEventListener('click', () => {
          if (state.levelCompleted) return;
          const r = Number(cell.dataset.r);
          const c = Number(cell.dataset.c);
          lvl.rightGrid[r][c] = lvl.rightGrid[r][c] === state.selectedGem ? 0 : state.selectedGem;
          playTone('tap');
          renderStage();
        });
      });
      return;
    }

    if (state.mode === 'rotate') {
      const choicesHTML = lvl.choices
        .map(
          (mat, idx) => `
          <button type="button" class="spatial-choice-btn ${state.selectedChoice === idx ? 'is-selected' : ''}" data-choice-idx="${idx}">
            ${renderCrestSVG(mat, 88)}
            <span class="target-label">${idx + 1}. címer</span>
          </button>
        `
        )
        .join('');

      els.gameStage.innerHTML = `
        <div class="spatial-stage">
          <div class="target-showcase">
            <span class="target-label">🛡️ Eredeti címer</span>
            ${renderCrestSVG(lvl.base, 112)}
          </div>
          <div class="choices-row">${choicesHTML}</div>
        </div>
      `;
    } else {
      const choicesHTML = lvl.choices
        .map(
          (heights, idx) => `
          <button type="button" class="spatial-choice-btn ${state.selectedChoice === idx ? 'is-selected' : ''}" data-choice-idx="${idx}">
            ${renderShadowSVG(heights, lvl.maxH, 88)}
            <span class="target-label">${idx + 1}. árnyék</span>
          </button>
        `
        )
        .join('');

      els.gameStage.innerHTML = `
        <div class="spatial-stage">
          <div class="target-showcase">
            <span class="target-label">🧱 Tornyok felülnézetből (szám = emelet)</span>
            ${renderTopDownTowerSVG(lvl.grid, 126)}
            <span style="font-size:0.82rem; font-weight:800; color:var(--cobalt-blue-dark);">⬆️ Innen világít a lámpa (elölről)</span>
          </div>
          <div class="choices-row">${choicesHTML}</div>
        </div>
      `;
    }

    document.querySelectorAll('.spatial-choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.levelCompleted) return;
        state.selectedChoice = Number(btn.dataset.choiceIdx);
        playTone('tap');
        renderStage();
      });
    });
  }

  function renderActionButtons() {
    if (state.levelCompleted) {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-success" id="btn-next-level">
          Következő feladat →
        </button>
      `;
      document.getElementById('btn-next-level').addEventListener('click', () => {
        state.roundNum++;
        loadLevel();
      });
      return;
    }

    els.actionButtons.innerHTML = `
      <button type="button" class="btn btn-secondary" id="btn-reset-level">🔄 Újra</button>
      <button type="button" class="btn btn-primary" id="btn-check-spatial">✨ Ellenőrzés!</button>
    `;
    document.getElementById('btn-reset-level').addEventListener('click', () => {
      if (state.mode === 'mirror') {
        const lvl = state.currentLevel;
        lvl.rightGrid = Array.from({ length: lvl.rows }, () => Array(lvl.cols).fill(0));
        renderStage();
      } else {
        state.selectedChoice = null;
        renderStage();
      }
    });
    document.getElementById('btn-check-spatial').addEventListener('click', checkSolution);
  }

  /* ========================================================================
     6. Ellenőrzés
     ======================================================================== */
  function checkSolution() {
    if (state.levelCompleted) return;
    const lvl = state.currentLevel;

    if (state.mode === 'mirror') {
      let errors = 0;
      const wrongCoords = [];
      for (let r = 0; r < lvl.rows; r++) {
        for (let c = 0; c < lvl.cols; c++) {
          const expected = lvl.leftGrid[r][lvl.cols - 1 - c];
          if (lvl.rightGrid[r][c] !== expected) {
            errors++;
            wrongCoords.push(`${r},${c}`);
          }
        }
      }

      if (errors === 0) {
        addStars(1);
        state.levelCompleted = true;
        setFeedback('Tökéletes tükörkép! Minden kocka a pontos helyére került!', 'success');
        speakMotivationalSuccess();
        renderActionButtons();
      } else {
        playTone('error');
        document.querySelectorAll('#mirror-right-half .mosaic-cell').forEach((cell) => {
          if (wrongCoords.includes(`${cell.dataset.r},${cell.dataset.c}`)) {
            cell.classList.add('is-wrong');
          }
        });
        setFeedback(`Még ${errors} kocka eltér a tükörképtől (pirossal keretezve).`, 'warn');
        speakHu(pickRandom(MOTIVATIONAL_RETRY));
      }
      return;
    }

    if (state.selectedChoice === null) {
      setFeedback('Előbb koppints az egyik megoldásra fent!', 'warn');
      speakHu('Előbb válassz egy megoldást!');
      return;
    }

    if (state.selectedChoice === lvl.correctIndex) {
      addStars(1);
      state.levelCompleted = true;
      const chosen = document.querySelector(`.spatial-choice-btn[data-choice-idx="${state.selectedChoice}"]`);
      if (chosen) chosen.classList.add('is-correct');
      setFeedback('Szuper térlátás! Pontosan eltaláltad!', 'success');
      speakMotivationalSuccess();
      renderActionButtons();
    } else {
      playTone('error');
      const chosen = document.querySelector(`.spatial-choice-btn[data-choice-idx="${state.selectedChoice}"]`);
      if (chosen) chosen.classList.add('is-wrong');
      setFeedback('Ez most nem pontosan egyezik! Nézd meg még egyszer az eredetit!', 'warn');
      speakHu(pickRandom(MOTIVATIONAL_RETRY));
    }
  }

  /* ========================================================================
     7. Eseménykezelők & Indítás
     ======================================================================== */
  els.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.mode;
      if (nextMode === state.mode) return;
      state.mode = nextMode;
      state.roundNum = 1;
      els.modeTabs.forEach((t) => t.classList.toggle('is-active', t.dataset.mode === nextMode));
      loadLevel();
    });
  });

  document.querySelectorAll('#difficulty-bar .diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextDiff = btn.dataset.diff;
      if (nextDiff === state.difficulty) return;
      state.difficulty = nextDiff;
      document.querySelectorAll('#difficulty-bar .diff-btn').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.diff === nextDiff);
      });
      loadLevel();
    });
  });

  els.btnInfiniteMode.addEventListener('click', () => {
    state.infiniteMode = !state.infiniteMode;
    els.btnInfiniteMode.classList.toggle('is-active', state.infiniteMode);
    els.btnInfiniteMode.setAttribute('aria-pressed', String(state.infiniteMode));
    loadLevel();
  });

  els.btnReplayVoice.addEventListener('click', () => {
    speakHu(state.currentLevel.speech);
  });

  els.btnToggleSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    els.btnToggleSound.textContent = soundEnabled ? '🔊' : '🔇';
    els.btnToggleSound.setAttribute('aria-pressed', String(soundEnabled));
    els.btnToggleSound.classList.toggle('is-muted', !soundEnabled);
    if (!soundEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  });

  els.starCount.textContent = String(state.stars);
  loadLevel();
})();
