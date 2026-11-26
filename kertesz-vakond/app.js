/**
 * Kertész Vakond — Mini-Sudoku (3×3, 4×4) és Kincs-térkép (Rács-logika)
 * 1. osztályos magyar kisiskolásoknak
 */

(() => {
  'use strict';

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

      if (type === 'plant') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.06);
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
    'Szuper! Vakond nagyon büszke a gyönyörű kertedre!',
    'Bravó! Egyetlen sorban és oszlopban sincs ismétlődés!',
    'Fantasztikus! Igazi kis kertészmester vagy!',
    'Ügyes munka! Minden a tökéletes helyére került!',
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function speakSuccess(customMsg) {
    if (state.stars > 0 && state.stars % 5 === 0) {
      playTone('fanfare');
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél Kertész Vakonddal!`);
    } else {
      playTone('success');
      speakHu(customMsg || pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Sudoku & Térkép Generátorok
     ======================================================================== */
  const FLOWER_THEMES = [
    ['🌻', '🌷', '🌼'],
    ['🥕', '🍅', '🌽'],
    ['🍓', '🍎', '🍐'],
  ];

  const ZOO_THEMES = [
    ['🦊', '🐰', '🦔', '🦉'],
    ['🐶', '🐱', '🐸', '🐻'],
    ['🥕', '🍅', '🌽', '🍆'],
  ];

  function generateLatin3x3(diff) {
    const symbols = shuffle(pickRandom(FLOWER_THEMES));
    const base = [
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1],
    ];
    const rowOrder = shuffle([0, 1, 2]);
    const colOrder = shuffle([0, 1, 2]);
    const solution = rowOrder.map((r) => colOrder.map((c) => base[r][c]));

    const givenCount = diff === 'easy' ? 5 : diff === 'medium' ? 4 : 3;
    const allCoords = shuffle([
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2],
    ]);

    const fixed = Array.from({ length: 3 }, () => [false, false, false]);
    const board = Array.from({ length: 3 }, () => [null, null, null]);
    for (let i = 0; i < givenCount; i++) {
      const [r, c] = allCoords[i];
      fixed[r][c] = true;
      board[r][c] = solution[r][c];
    }

    return {
      mode: 'sudoku3',
      size: 3,
      useBoxes: false,
      symbols,
      solution,
      fixed,
      board,
      prompt: 'Ültesd be a 3×3-as ágyást úgy, hogy minden sorban és oszlopban mindegyik virág egyszer szerepeljen!',
    };
  }

  function generateSudoku4x4(diff) {
    const symbols = shuffle(pickRandom(ZOO_THEMES));
    const base = [
      [0, 1, 2, 3],
      [2, 3, 0, 1],
      [1, 0, 3, 2],
      [3, 2, 1, 0],
    ];

    // Sor- és oszlopcsere 2×2-es blokkokon belül + blokkcsere
    const rBands = shuffle([0, 1]);
    const cBands = shuffle([0, 1]);
    const rowOrder = [
      ...shuffle([0, 1]).map((i) => rBands[0] * 2 + i),
      ...shuffle([0, 1]).map((i) => rBands[1] * 2 + i),
    ];
    const colOrder = [
      ...shuffle([0, 1]).map((i) => cBands[0] * 2 + i),
      ...shuffle([0, 1]).map((i) => cBands[1] * 2 + i),
    ];

    const solution = rowOrder.map((r) => colOrder.map((c) => base[r][c]));

    const givenCount = diff === 'easy' ? 11 : diff === 'medium' ? 8 : 6;
    const allCoords = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) allCoords.push([r, c]);
    }
    const picked = shuffle(allCoords);

    const fixed = Array.from({ length: 4 }, () => [false, false, false, false]);
    const board = Array.from({ length: 4 }, () => [null, null, null, null]);
    for (let i = 0; i < givenCount; i++) {
      const [r, c] = picked[i];
      fixed[r][c] = true;
      board[r][c] = solution[r][c];
    }

    return {
      mode: 'sudoku4',
      size: 4,
      useBoxes: true,
      symbols,
      solution,
      fixed,
      board,
      prompt: 'Töltsd ki a 4×4-es állatkertet! Minden sorban, oszlopban és 2×2-es sarokban legyen mindegyik állatból egy!',
    };
  }

  function generateMapPuzzle(diff) {
    const size = diff === 'easy' ? 3 : diff === 'medium' ? 4 : 5;
    const decorIcons = ['🌱', '🍄', '🪨', '🌿', '🌼'];
    const grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => (Math.random() < 0.35 ? pickRandom(decorIcons) : ''))
    );

    if (diff === 'easy' || Math.random() < 0.5) {
      const tr = Math.floor(Math.random() * size);
      const tc = Math.floor(Math.random() * size);
      grid[tr][tc] = '';
      return {
        mode: 'map',
        size,
        grid,
        mole: null,
        target: { r: tr, c: tc },
        prompt: `A kincs a ${tr + 1}. sor, ${tc + 1}. oszlopban van! Koppints oda!`,
      };
    }

    // Lépéses feladat Vakondtól indulva
    const mr = Math.floor(Math.random() * size);
    const mc = Math.floor(Math.random() * size);
    let tr = mr;
    let tc = mc;
    while (tr === mr && tc === mc) {
      tr = Math.floor(Math.random() * size);
      tc = Math.floor(Math.random() * size);
    }

    const dr = tr - mr;
    const dc = tc - mc;
    const parts = [];
    if (dc > 0) parts.push(`${dc} lépést jobbra`);
    if (dc < 0) parts.push(`${Math.abs(dc)} lépést balra`);
    if (dr > 0) parts.push(`${dr} lépést lefelé`);
    if (dr < 0) parts.push(`${Math.abs(dr)} lépést felfelé`);

    grid[mr][mc] = '🦡';
    grid[tr][tc] = '';

    return {
      mode: 'map',
      size,
      grid,
      mole: { r: mr, c: mc },
      target: { r: tr, c: tc },
      prompt: `Indulj Vakondtól! Menj ${parts.join(' és ')}! Hol van a répa?`,
    };
  }

  /* ========================================================================
     3. Állapot & DOM Kezelés
     ======================================================================== */
  const STAR_KEY = 'vakond_stars';

  const state = {
    mode: 'sudoku3',
    difficulty: 'easy',
    infiniteMode: false,
    stars: Number(localStorage.getItem(STAR_KEY) || 0),
    level: 1,
    puzzle: null,
    selectedSymbolIdx: 0,
    solved: false,
  };

  const els = {
    starValue: document.getElementById('star-count-value'),
    levelBadge: document.getElementById('level-badge'),
    promptText: document.getElementById('prompt-instruction'),
    stage: document.getElementById('game-stage'),
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackText: document.getElementById('feedback-text'),
    actionButtons: document.getElementById('action-buttons'),
    btnSound: document.getElementById('btn-toggle-sound'),
    btnReplay: document.getElementById('btn-replay-voice'),
    btnInfinite: document.getElementById('btn-infinite-mode'),
  };

  function setFeedback(text, kind = '') {
    els.feedbackText.textContent = text;
    els.feedbackBanner.className = 'feedback-banner';
    if (kind === 'success') els.feedbackBanner.classList.add('is-success');
    if (kind === 'error') els.feedbackBanner.classList.add('is-error');
  }

  function addStar() {
    state.stars += 1;
    localStorage.setItem(STAR_KEY, String(state.stars));
    els.starValue.textContent = String(state.stars);
  }

  function renderNextButton() {
    els.actionButtons.innerHTML = '';
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'action-btn action-btn-primary';
    nextBtn.textContent = state.infiniteMode ? 'Következő feladat →' : 'Tovább →';
    nextBtn.addEventListener('click', () => {
      state.level += 1;
      loadNewPuzzle();
    });
    els.actionButtons.appendChild(nextBtn);
  }

  /* ========================================================================
     4. Sudoku Ellenőrzés & Renderelés
     ======================================================================== */
  function findSudokuConflicts(puzzle) {
    const n = puzzle.size;
    const conflicts = Array.from({ length: n }, () => Array(n).fill(false));

    // Sorok
    for (let r = 0; r < n; r++) {
      const seen = {};
      for (let c = 0; c < n; c++) {
        const val = puzzle.board[r][c];
        if (val === null) continue;
        if (seen[val] !== undefined) {
          conflicts[r][c] = true;
          conflicts[r][seen[val]] = true;
        } else {
          seen[val] = c;
        }
      }
    }

    // Oszlopok
    for (let c = 0; c < n; c++) {
      const seen = {};
      for (let r = 0; r < n; r++) {
        const val = puzzle.board[r][c];
        if (val === null) continue;
        if (seen[val] !== undefined) {
          conflicts[r][c] = true;
          conflicts[seen[val]][c] = true;
        } else {
          seen[val] = r;
        }
      }
    }

    // 2x2 blokkok (4x4 esetén)
    if (puzzle.useBoxes) {
      for (let br = 0; br < 2; br++) {
        for (let bc = 0; bc < 2; bc++) {
          const seen = {};
          for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              const r = br * 2 + dr;
              const c = bc * 2 + dc;
              const val = puzzle.board[r][c];
              if (val === null) continue;
              if (seen[val]) {
                conflicts[r][c] = true;
                conflicts[seen[val][0]][seen[val][1]] = true;
              } else {
                seen[val] = [r, c];
              }
            }
          }
        }
      }
    }

    return conflicts;
  }

  function isBoardFull(puzzle) {
    return puzzle.board.every((row) => row.every((cell) => cell !== null));
  }

  function hasAnyConflict(conflicts) {
    return conflicts.some((row) => row.some(Boolean));
  }

  function renderSudokuStage() {
    const p = state.puzzle;
    const conflicts = findSudokuConflicts(p);
    const full = isBoardFull(p);
    const anyConflict = hasAnyConflict(conflicts);

    if (full && !anyConflict && !state.solved) {
      state.solved = true;
      addStar();
      setFeedback('Szuper! Minden sor és oszlop tökéletes! ⭐', 'success');
      speakSuccess();
      renderNextButton();
    }

    let cellsHtml = '';
    for (let r = 0; r < p.size; r++) {
      for (let c = 0; c < p.size; c++) {
        const val = p.board[r][c];
        const isFixed = p.fixed[r][c];
        const classes = ['garden-cell'];
        if (isFixed) classes.push('is-fixed');
        else if (val === null) classes.push('is-empty');
        if (conflicts[r][c]) classes.push('is-conflict');
        if (state.solved) classes.push('is-solved');
        if (p.useBoxes && c === 1) classes.push('box-right');
        if (p.useBoxes && r === 1) classes.push('box-bottom');

        const content = val !== null ? p.symbols[val] : '';
        cellsHtml += `
          <button type="button" class="${classes.join(' ')}" data-r="${r}" data-c="${c}" ${isFixed || state.solved ? 'disabled' : ''}>
            ${content}
          </button>
        `;
      }
    }

    const trayHtml = p.symbols.map((sym, idx) => `
      <button type="button" class="seed-btn ${state.selectedSymbolIdx === idx ? 'is-active' : ''}" data-sym-idx="${idx}">
        ${sym}
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="garden-board-wrap">
        <div class="sudoku-grid size-${p.size}" id="sudoku-grid">${cellsHtml}</div>
        <div class="seed-tray-wrap">
          <p class="seed-tray-label">👇 Válaszd ki, mit ültetsz, majd koppints egy üres mezőre:</p>
          <div class="seed-tray" id="seed-tray">${trayHtml}</div>
        </div>
      </div>
    `;

    document.getElementById('seed-tray').querySelectorAll('.seed-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        state.selectedSymbolIdx = Number(btn.dataset.symIdx);
        renderSudokuStage();
      });
    });

    document.getElementById('sudoku-grid').querySelectorAll('.garden-cell').forEach((cellBtn) => {
      cellBtn.addEventListener('click', () => {
        if (state.solved) return;
        const r = Number(cellBtn.dataset.r);
        const c = Number(cellBtn.dataset.c);
        if (p.fixed[r][c]) return;

        if (p.board[r][c] === state.selectedSymbolIdx) {
          p.board[r][c] = null;
        } else {
          p.board[r][c] = state.selectedSymbolIdx;
        }
        playTone('plant');

        const nextConflicts = findSudokuConflicts(p);
        if (hasAnyConflict(nextConflicts)) {
          setFeedback('Hoppá! A piros mezőknél két egyforma került egy sorba, oszlopba vagy sarokba!', 'error');
        } else if (!isBoardFull(p)) {
          setFeedback('Szépen haladsz! Folytasd az üres mezőkkel!');
        }
        renderSudokuStage();
      });
    });
  }

  /* ========================================================================
     5. Kincs-Térkép Renderelése
     ======================================================================== */
  function renderMapStage() {
    const p = state.puzzle;
    const cols = p.size + 1;
    let html = `<div class="map-board-wrap"><div class="map-grid-outer" id="map-grid" style="grid-template-columns: auto repeat(${p.size}, auto);">`;

    // Felső oszlopfejléc
    html += `<div class="map-axis-label"></div>`;
    for (let c = 0; c < p.size; c++) {
      html += `<div class="map-axis-label">${c + 1}.</div>`;
    }

    for (let r = 0; r < p.size; r++) {
      html += `<div class="map-axis-label">${r + 1}.</div>`;
      for (let c = 0; c < p.size; c++) {
        const isMole = p.mole && p.mole.r === r && p.mole.c === c;
        const content = p.grid[r][c];
        html += `
          <button type="button" class="map-cell ${isMole ? 'is-mole' : ''}" data-r="${r}" data-c="${c}" aria-label="${r + 1}. sor ${c + 1}. oszlop">
            ${content}
          </button>
        `;
      }
    }

    html += `</div></div>`;
    els.stage.innerHTML = html;

    document.getElementById('map-grid').querySelectorAll('.map-cell').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const r = Number(btn.dataset.r);
        const c = Number(btn.dataset.c);
        if (r === p.target.r && c === p.target.c) {
          state.solved = true;
          btn.classList.add('is-found');
          btn.textContent = p.mole ? '🥕' : '💎';
          document.getElementById('map-grid').querySelectorAll('.map-cell').forEach((b) => { b.disabled = true; });
          addStar();
          setFeedback('Megtaláltad! Pontosan jó helyre kattintottál! ⭐', 'success');
          speakSuccess('Ügyes vagy! Pontosan megtaláltad a helyet a térképen!');
          renderNextButton();
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          playTone('error');
          setFeedback(`Ez a ${r + 1}. sor, ${c + 1}. oszlop. Próbáld újra!`, 'error');
          speakHu(`Ez a ${r + 1}. sor, ${c + 1}. oszlop. Keresd tovább!`);
        }
      });
    });
  }

  /* ========================================================================
     6. Játékciklus & Eseménykezelők
     ======================================================================== */
  function loadNewPuzzle() {
    state.solved = false;
    state.selectedSymbolIdx = 0;
    els.actionButtons.innerHTML = '';
    els.levelBadge.textContent = `${state.level}. feladat`;

    if (state.mode === 'sudoku3') {
      state.puzzle = generateLatin3x3(state.difficulty);
      renderSudokuStage();
      setFeedback('Válassz egy virágot lent, és ültesd az üres mezőre!');
    } else if (state.mode === 'sudoku4') {
      state.puzzle = generateSudoku4x4(state.difficulty);
      renderSudokuStage();
      setFeedback('Ültesd be az állatokat ismétlődés nélkül!');
    } else {
      state.puzzle = generateMapPuzzle(state.difficulty);
      renderMapStage();
      setFeedback('Figyeld a sorok és oszlopok számát, és koppints a jó mezőre!');
    }

    els.promptText.textContent = state.puzzle.prompt;
    speakHu(state.puzzle.prompt);
  }

  document.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mode-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      state.mode = tab.dataset.mode;
      state.level = 1;
      loadNewPuzzle();
    });
  });

  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.difficulty = btn.dataset.diff;
      loadNewPuzzle();
    });
  });

  els.btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    els.btnSound.textContent = soundEnabled ? '🔊' : '🔇';
    els.btnSound.setAttribute('aria-pressed', String(soundEnabled));
    els.btnSound.classList.toggle('is-muted', !soundEnabled);
    if (!soundEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  });

  els.btnReplay.addEventListener('click', () => {
    if (state.puzzle) speakHu(state.puzzle.prompt);
  });

  els.btnInfinite.addEventListener('click', () => {
    state.infiniteMode = !state.infiniteMode;
    els.btnInfinite.classList.toggle('is-active', state.infiniteMode);
    els.btnInfinite.setAttribute('aria-pressed', String(state.infiniteMode));
  });

  els.starValue.textContent = String(state.stars);
  loadNewPuzzle();
})();
