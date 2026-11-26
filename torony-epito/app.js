/**
 * Torony-Építő — Hanoi-torony & Kombinatorikus toronyépítés
 */
(() => {
  'use strict';

  const STAR_KEY = 'torony_stars';

  const RING_COLORS = [
    '#D95338', // size 1 (smallest) - ember red
    '#2D5F9A', // size 2 - cobalt blue
    '#E09F3E', // size 3 - amber gold
    '#387D5A', // size 4 (largest) - sage green
  ];

  const BLOCK_COLORS = [
    { id: 'R', name: 'Piros', hex: '#D95338' },
    { id: 'B', name: 'Kék', hex: '#2D5F9A' },
    { id: 'Y', name: 'Sárga', hex: '#E09F3E' },
  ];

  const els = {
    starValue: document.getElementById('star-count-value'),
    btnInfinite: document.getElementById('btn-infinite-mode'),
    btnReplay: document.getElementById('btn-replay-voice'),
    btnSound: document.getElementById('btn-toggle-sound'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    diffBtns: document.querySelectorAll('#difficulty-bar .diff-btn'),
    levelBadge: document.getElementById('level-badge'),
    promptInstruction: document.getElementById('prompt-instruction'),
    stage: document.getElementById('game-stage'),
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackText: document.getElementById('feedback-text'),
    actionButtons: document.getElementById('action-buttons'),
  };

  let soundEnabled = true;
  let audioCtx = null;

  const state = {
    mode: 'hanoi',
    difficulty: 'easy',
    infinite: false,
    round: 1,
    stars: Number(localStorage.getItem(STAR_KEY) || 0),
    solved: false,
    lastVoiceText: '',
    // Hanoi state
    pegs: [[], [], []],
    ringCount: 2,
    selectedPeg: null,
    moves: 0,
    history: [],
    // Combo state
    comboCfg: null,
    currentStack: [],
    foundTowers: [],
    // Match state
    matchPuzzle: null,
  };

  function ensureAudioCtx() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  function playTone(freq, dur = 0.13, type = 'sine', delay = 0) {
    if (!soundEnabled) return;
    try {
      ensureAudioCtx();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = audioCtx.currentTime + delay;
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (_) {}
  }

  function playSuccessSound() {
    playTone(523.25, 0.12, 'triangle', 0);
    playTone(659.25, 0.12, 'triangle', 0.1);
    playTone(783.99, 0.22, 'triangle', 0.2);
  }

  function playErrorSound() {
    playTone(230, 0.16, 'sawtooth', 0);
    playTone(185, 0.2, 'sawtooth', 0.14);
  }

  function speakHu(text) {
    state.lastVoiceText = text;
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'hu-HU';
      u.rate = 0.94;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function addStar() {
    state.stars += 1;
    localStorage.setItem(STAR_KEY, String(state.stars));
    els.starValue.textContent = String(state.stars);
    if (state.stars > 0 && state.stars % 5 === 0) {
      speakHu(`Fantasztikus! Már ${state.stars} csillagod van a Torony-Építőben!`);
    }
  }

  function setFeedback(text, type = 'neutral') {
    els.feedbackText.textContent = text;
    els.feedbackBanner.classList.remove('is-success', 'is-error');
    if (type === 'success') els.feedbackBanner.classList.add('is-success');
    if (type === 'error') els.feedbackBanner.classList.add('is-error');
  }

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /* ========================================================================
     1. BŰVÖS TORONY (TOWER OF HANOI)
     ======================================================================== */
  function initHanoi() {
    state.ringCount = state.difficulty === 'easy' ? 2 : state.difficulty === 'medium' ? 3 : 4;
    const initial = [];
    for (let size = state.ringCount; size >= 1; size--) {
      initial.push(size);
    }
    state.pegs = [initial, [], []];
    state.selectedPeg = null;
    state.moves = 0;
    state.history = [];
    renderHanoi();
    const msg = `Rakd át a ${state.ringCount} gyűrűt a jobb szélső célrúdra!`;
    els.promptInstruction.textContent = msg;
    setFeedback('Koppints egy rúdra a felső gyűrű felemeléséhez!');
    speakHu(msg);
  }

  function renderHanoi() {
    const optimal = Math.pow(2, state.ringCount) - 1;
    const pegNames = ['1. Kezdőrúd', '2. Segédrúd', '3. Célrúd 🎯'];

    const pegsHtml = state.pegs.map((peg, idx) => {
      const isSelected = state.selectedPeg === idx;
      const isGoal = idx === 2;
      const ringsHtml = peg.map((size) => {
        const widthPct = 36 + size * 14;
        const color = RING_COLORS[(size - 1) % RING_COLORS.length];
        return `<div class="hanoi-ring" style="width:${widthPct}%; background:${color};"></div>`;
      }).join('');

      return `
        <button type="button" class="hanoi-peg ${isSelected ? 'is-selected' : ''} ${isGoal ? 'is-goal' : ''}" data-peg="${idx}" aria-label="${pegNames[idx]}">
          <div class="peg-rod"></div>
          <div class="peg-rings">${ringsHtml}</div>
          <div class="peg-base"></div>
          <span class="peg-label">${pegNames[idx]}</span>
        </button>
      `;
    }).join('');

    els.stage.innerHTML = `
      <div class="hanoi-meta">
        <span class="card-star-pill">Lépések: <strong>${state.moves}</strong></span>
        <span class="card-star-pill">Legjobb cél: <strong>${optimal}</strong> lépés</span>
      </div>
      <div class="hanoi-pegs">${pegsHtml}</div>
    `;

    els.stage.querySelectorAll('.hanoi-peg').forEach((btn) => {
      btn.addEventListener('click', () => handlePegClick(Number(btn.dataset.peg)));
    });
  }

  function handlePegClick(pegIdx) {
    if (state.solved) return;

    if (state.selectedPeg === null) {
      if (state.pegs[pegIdx].length === 0) {
        playErrorSound();
        setFeedback('Ez a rúd üres! Válassz olyan rudat, amin van gyűrű.', 'error');
        return;
      }
      state.selectedPeg = pegIdx;
      playTone(440, 0.08, 'sine');
      renderHanoi();
      setFeedback('Most koppints arra a rúdra, ahová leteszed a gyűrűt!');
      return;
    }

    if (state.selectedPeg === pegIdx) {
      state.selectedPeg = null;
      playTone(350, 0.07, 'sine');
      renderHanoi();
      return;
    }

    const fromPeg = state.pegs[state.selectedPeg];
    const toPeg = state.pegs[pegIdx];
    const movingRing = fromPeg[fromPeg.length - 1];
    const targetTop = toPeg[toPeg.length - 1];

    if (targetTop !== undefined && movingRing > targetTop) {
      playErrorSound();
      setFeedback('Hoppá! Nagyobb gyűrűt nem tehetsz kisebb gyűrű tetejére!', 'error');
      speakHu('Nagyobb gyűrűt nem tehetsz kisebb tetejére!');
      state.selectedPeg = null;
      renderHanoi();
      return;
    }

    state.history.push(state.pegs.map((p) => [...p]));
    fromPeg.pop();
    toPeg.push(movingRing);
    state.moves += 1;
    state.selectedPeg = null;
    playTone(540, 0.09, 'triangle');
    renderHanoi();
    renderActionButtons();

    if (state.pegs[2].length === state.ringCount) {
      state.solved = true;
      addStar();
      playSuccessSound();
      setFeedback(`Bravó! ${state.moves} lépésből átraktad a tornyot! ⭐ +1 csillag`, 'success');
      speakHu('Bravó! Sikeresen átraktad a bűvös tornyot!');
      renderActionButtons();
    } else {
      setFeedback('Szuper lépés! Folytasd a célrúd felé.');
    }
  }

  /* ========================================================================
     2. ÖSSZES TORONY (COMBINATORICS BUILDER)
     ======================================================================== */
  function generateAllTowers(colors, height, allowRepeats) {
    const results = [];
    function backtrack(curr) {
      if (curr.length === height) {
        results.push(curr.join(''));
        return;
      }
      for (const c of colors) {
        if (!allowRepeats && curr.includes(c.id)) continue;
        curr.push(c.id);
        backtrack(curr);
        curr.pop();
      }
    }
    backtrack([]);
    return results;
  }

  function getComboConfig() {
    if (state.difficulty === 'easy') {
      return {
        colors: BLOCK_COLORS.slice(0, 2),
        height: 2,
        allowRepeats: true,
        prompt: 'Építsd meg mind a 4 különböző 2 emeletes tornyot!',
      };
    }
    if (state.difficulty === 'medium') {
      return {
        colors: BLOCK_COLORS.slice(0, 3),
        height: 3,
        allowRepeats: false,
        prompt: 'Építsd meg mind a 6 tornyot úgy, hogy minden színt egyszer használsz!',
      };
    }
    return {
      colors: BLOCK_COLORS.slice(0, 3),
      height: 2,
      allowRepeats: true,
      prompt: 'Építsd meg mind a 9 különböző 2 emeletes tornyot a 3 színből!',
    };
  }

  function initCombo() {
    state.comboCfg = getComboConfig();
    state.comboCfg.allTowers = generateAllTowers(
      state.comboCfg.colors,
      state.comboCfg.height,
      state.comboCfg.allowRepeats
    );
    state.currentStack = [];
    state.foundTowers = [];
    renderCombo();
    els.promptInstruction.textContent = state.comboCfg.prompt;
    setFeedback('Koppints a színes kockákra a torony összeállításához!');
    speakHu(state.comboCfg.prompt);
  }

  function colorById(id) {
    return BLOCK_COLORS.find((c) => c.id === id) || BLOCK_COLORS[0];
  }

  function renderCombo() {
    const cfg = state.comboCfg;
    const targetCount = cfg.allTowers.length;

    const previewHtml = state.currentStack.length === 0
      ? `<span style="color:var(--ink-muted); font-weight:700; font-size:0.86rem; margin:auto;">Rakj ide ${cfg.height} kockát!</span>`
      : state.currentStack.map((id) => `<div class="tower-block" style="background:${colorById(id).hex};"></div>`).join('');

    const paletteHtml = cfg.colors.map((c) => {
      const disabled = state.solved
        || state.currentStack.length >= cfg.height
        || (!cfg.allowRepeats && state.currentStack.includes(c.id));
      return `
        <button type="button" class="color-block-btn" data-color="${c.id}" style="background:${c.hex};" ${disabled ? 'disabled' : ''}>
          ${c.name}
        </button>
      `;
    }).join('');

    const shelfSlots = [];
    for (let i = 0; i < targetCount; i++) {
      const code = state.foundTowers[i];
      if (code) {
        const blocks = code.split('').map((id) => `<div class="mini-block" style="background:${colorById(id).hex};"></div>`).join('');
        shelfSlots.push(`<div class="mini-tower-card">${blocks}</div>`);
      } else {
        shelfSlots.push(`<div class="mini-tower-card is-empty">${i + 1}.</div>`);
      }
    }

    els.stage.innerHTML = `
      <div class="combo-layout">
        <div class="builder-box">
          <strong style="font-family:var(--font-display);">Építőpad</strong>
          <div class="builder-preview">${previewHtml}</div>
          <div class="palette-row">${paletteHtml}</div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">
            <button type="button" class="btn btn-secondary" id="btn-clear-stack" ${state.currentStack.length === 0 || state.solved ? 'disabled' : ''}>Törlés</button>
            <button type="button" class="btn btn-primary" id="btn-add-tower" ${state.currentStack.length < cfg.height || state.solved ? 'disabled' : ''}>Kész ✓</button>
          </div>
        </div>
        <div class="collection-box">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-family:var(--font-display);">Gyűjtemény</strong>
            <span class="card-star-pill">${state.foundTowers.length} / ${targetCount} egyedi torony</span>
          </div>
          <div class="collection-grid">${shelfSlots.join('')}</div>
        </div>
      </div>
    `;

    els.stage.querySelectorAll('.color-block-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.currentStack.length < cfg.height && !state.solved) {
          state.currentStack.push(btn.dataset.color);
          playTone(460 + state.currentStack.length * 60, 0.08, 'sine');
          renderCombo();
        }
      });
    });

    const clearBtn = document.getElementById('btn-clear-stack');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.currentStack = [];
        renderCombo();
      });
    }

    const addBtn = document.getElementById('btn-add-tower');
    if (addBtn) {
      addBtn.addEventListener('click', submitComboTower);
    }
  }

  function submitComboTower() {
    const cfg = state.comboCfg;
    if (state.currentStack.length !== cfg.height || state.solved) return;
    const code = state.currentStack.join('');

    if (state.foundTowers.includes(code)) {
      playErrorSound();
      setFeedback('Ilyen tornyod már van a gyűjteményben! Próbálj másik sorrendet.', 'error');
      speakHu('Ilyen tornyod már van! Próbálj egy újat.');
      state.currentStack = [];
      renderCombo();
      return;
    }

    state.foundTowers.push(code);
    state.currentStack = [];
    playTone(580, 0.1, 'triangle');

    if (state.foundTowers.length === cfg.allTowers.length) {
      state.solved = true;
      addStar();
      playSuccessSound();
      setFeedback('Mindet megtaláltad! Igazi kombinatorika-bajnok vagy! ⭐ +1 csillag', 'success');
      speakHu('Mindet megtaláltad! Ügyes vagy!');
      renderCombo();
      renderActionButtons();
    } else {
      setFeedback(`Új torony! Még ${cfg.allTowers.length - state.foundTowers.length} hiányzik.`);
      renderCombo();
    }
  }

  /* ========================================================================
     3. MELYIK HIÁNYZIK? (DEDUCTION)
     ======================================================================== */
  function initMatch() {
    const cfg = getComboConfig();
    const all = generateAllTowers(cfg.colors, cfg.height, cfg.allowRepeats);
    const missingIdx = Math.floor(Math.random() * all.length);
    const missingCode = all[missingIdx];
    const shown = all.filter((_, i) => i !== missingIdx);
    const distractors = shuffle(shown).slice(0, 3);
    const options = shuffle([missingCode, ...distractors]);

    state.matchPuzzle = {
      shown,
      missingCode,
      options,
      prompt: 'Melyik egyedi torony hiányzik a gyűjteményből?',
    };

    renderMatch();
    els.promptInstruction.textContent = state.matchPuzzle.prompt;
    setFeedback('Hasonlítsd össze a meglévő tornyokat, és válaszd ki a hiányzót!');
    speakHu(state.matchPuzzle.prompt);
  }

  function renderMatch() {
    const p = state.matchPuzzle;
    const shelfHtml = p.shown.map((code) => {
      const blocks = code.split('').map((id) => `<div class="mini-block" style="background:${colorById(id).hex};"></div>`).join('');
      return `<div class="mini-tower-card">${blocks}</div>`;
    }).join('') + (state.solved
      ? `<div class="mini-tower-card" style="border-color:var(--sage-green); background:var(--sage-green-soft);">${p.missingCode.split('').map((id) => `<div class="mini-block" style="background:${colorById(id).hex};"></div>`).join('')}</div>`
      : '<div class="mini-tower-card is-target">❓</div>');

    const choicesHtml = p.options.map((code) => {
      const blocks = code.split('').map((id) => `<div class="mini-block" style="background:${colorById(id).hex};"></div>`).join('');
      return `<button type="button" class="tower-choice-btn" data-code="${code}">${blocks}</button>`;
    }).join('');

    els.stage.innerHTML = `
      <div class="collection-box">
        <div class="collection-grid">${shelfHtml}</div>
      </div>
      <div class="match-choices">${choicesHtml}</div>
    `;

    els.stage.querySelectorAll('.tower-choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const picked = btn.dataset.code;
        if (picked === p.missingCode) {
          state.solved = true;
          addStar();
          playSuccessSound();
          setFeedback('Pontos megfigyelés! Pont ez a torony hiányzott! ⭐ +1 csillag', 'success');
          speakHu('Pontos megfigyelés! Eltaláltad!');
          renderMatch();
          const winBtn = els.stage.querySelector(`.tower-choice-btn[data-code="${picked}"]`);
          if (winBtn) winBtn.classList.add('is-correct');
          renderActionButtons();
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          playErrorSound();
          setFeedback('Ilyen torony már szerepel fent! Keress olyat, ami még nincs ott.', 'error');
          speakHu('Ilyen torony már van fent! Keress másikat.');
        }
      });
    });
  }

  /* ========================================================================
     KÖZÖS VEZÉRLÉS
     ======================================================================== */
  function renderActionButtons() {
    els.actionButtons.innerHTML = '';

    if (state.mode === 'hanoi' && !state.solved) {
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'btn btn-secondary';
      undoBtn.textContent = '↺ Vissza';
      undoBtn.disabled = state.history.length === 0;
      undoBtn.addEventListener('click', () => {
        if (state.history.length > 0) {
          state.pegs = state.history.pop();
          state.selectedPeg = null;
          state.moves = Math.max(0, state.moves - 1);
          renderHanoi();
          renderActionButtons();
        }
      });

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn-secondary';
      resetBtn.textContent = 'Újrakezdés';
      resetBtn.addEventListener('click', initHanoi);

      els.actionButtons.append(undoBtn, resetBtn);
      return;
    }

    if (state.solved) {
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'btn btn-primary';
      nextBtn.textContent = 'Következő feladat →';
      nextBtn.addEventListener('click', () => {
        state.round += 1;
        loadPuzzle();
      });
      els.actionButtons.append(nextBtn);
    }
  }

  function loadPuzzle() {
    state.solved = false;
    els.levelBadge.textContent = state.infinite
      ? `∞ Gyakorlás · ${state.round}. kör`
      : `${state.round}. feladat`;

    if (state.mode === 'hanoi') {
      initHanoi();
    } else if (state.mode === 'combo') {
      initCombo();
    } else {
      initMatch();
    }
    renderActionButtons();
  }

  els.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      els.modeTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      state.mode = tab.dataset.mode;
      state.round = 1;
      loadPuzzle();
    });
  });

  els.diffBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.diffBtns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.difficulty = btn.dataset.diff;
      loadPuzzle();
    });
  });

  els.btnInfinite.addEventListener('click', () => {
    state.infinite = !state.infinite;
    els.btnInfinite.setAttribute('aria-pressed', String(state.infinite));
    els.btnInfinite.classList.toggle('is-infinite', state.infinite);
    loadPuzzle();
  });

  els.btnReplay.addEventListener('click', () => {
    if (state.lastVoiceText) speakHu(state.lastVoiceText);
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

  els.starValue.textContent = String(state.stars);
  loadPuzzle();
})();
