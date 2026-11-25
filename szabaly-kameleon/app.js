/**
 * Szabály-Kaméleon — Végrehajtó funkció (Executive Function) fejlesztő
 * Rugalmas szabályváltás (WCST), induktív szabálykeresés és gátlás-kontroll
 */

(() => {
  'use strict';

  const COLORS = {
    red: { label: 'Piros', hex: '#D94336', stroke: '#A5281E' },
    green: { label: 'Zöld', hex: '#387D5A', stroke: '#23553C' },
    yellow: { label: 'Sárga', hex: '#E8A825', stroke: '#B47C0E' },
  };

  const SHAPES = {
    circle: { label: 'Kör' },
    triangle: { label: 'Háromszög' },
    square: { label: 'Négyzet' },
  };

  // A 3 klasszikus WCST referenciakosár: mindegyik egyedi színnel, formával és darabszámmal bír
  const BASKETS = [
    { color: 'red', shape: 'circle', count: 1 },
    { color: 'green', shape: 'triangle', count: 2 },
    { color: 'yellow', shape: 'square', count: 3 },
  ];

  const OPPOSITE_BASKETS = [
    { color: 'red', shape: 'circle', count: 1, label: 'Piros kosár' },
    { color: 'green', shape: 'triangle', count: 1, label: 'Zöld kosár' },
  ];

  function createSymbolSVG(colorKey, shapeKey, sizePx = 30) {
    const c = COLORS[colorKey];
    let el = '';
    if (shapeKey === 'circle') {
      el = `<circle cx="50" cy="50" r="38" fill="${c.hex}" stroke="${c.stroke}" stroke-width="5"/>`;
    } else if (shapeKey === 'triangle') {
      el = `<polygon points="50,12 88,84 12,84" stroke-linejoin="round" fill="${c.hex}" stroke="${c.stroke}" stroke-width="5"/>`;
    } else {
      el = `<rect x="14" y="14" width="72" height="72" rx="12" fill="${c.hex}" stroke="${c.stroke}" stroke-width="5"/>`;
    }
    return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 100 100" aria-hidden="true">${el}</svg>`;
  }

  function renderCardSymbolsHTML(card, sizePx = 30) {
    const svgs = [];
    for (let i = 0; i < card.count; i++) {
      svgs.push(createSymbolSVG(card.color, card.shape, sizePx));
    }
    return `<div class="card-symbols">${svgs.join('')}</div>`;
  }

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

      if (type === 'ding') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'shift') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.08);
        osc.frequency.setValueAtTime(554, now + 0.16);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
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
      utter.rate = 0.95;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    } catch (_) {
      // Néma fallback
    }
  }

  const MOTIVATIONAL_SUCCESS = [
    'Villámgyorsan rájöttél a szabályra! Szuper figyelem!',
    'Bravó! Ügyesen alkalmazkodtál a kaméleon törvényéhez!',
    'Fantasztikus! Igazi dzsungel-detektív vagy!',
    'Szuper önkontroll! Nem hagytad magad megtéveszteni!',
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function speakMotivationalSuccess() {
    if (state.stars > 0 && state.stars % 5 === 0) {
      playTone('fanfare');
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél a dzsungelben!`);
    } else {
      playTone('success');
      speakHu(pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Kártyagenerálás & Szabály-ellenőrzés
     ======================================================================== */
  const RULES = ['color', 'shape', 'count'];

  function generateCardForWCST() {
    const color = pickRandom(Object.keys(COLORS));
    const shape = pickRandom(Object.keys(SHAPES));
    const count = pickRandom([1, 2, 3]);
    return { color, shape, count, inverted: false };
  }

  function generateCardForOpposite(roundInvertedRatio) {
    const color = Math.random() < 0.5 ? 'red' : 'green';
    const shape = color === 'red' ? 'circle' : 'triangle';
    const inverted = Math.random() < roundInvertedRatio;
    return { color, shape, count: 1, inverted };
  }

  function checkBasketMatch(card, basketIdx) {
    if (state.mode === 'opposite') {
      const targetColor = card.inverted
        ? card.color === 'red'
          ? 'green'
          : 'red'
        : card.color;
      return OPPOSITE_BASKETS[basketIdx].color === targetColor;
    }

    const basket = BASKETS[basketIdx];
    return card[state.activeRule] === basket[state.activeRule];
  }

  /* ========================================================================
     3. Játékállapot & DOM
     ======================================================================== */
  const state = {
    mode: 'discover', // 'discover' | 'switch' | 'opposite'
    difficulty: 'easy', // 'easy' | 'medium' | 'hard'
    roundNum: 1,
    infiniteMode: false,
    stars: Number(localStorage.getItem('kameleon_stars') || 0),
    activeRule: 'color',
    totalCards: 6,
    doneCards: 0,
    streakInRule: 0,
    missesOnCurrent: 0,
    currentCard: null,
    roundCompleted: false,
    isLocked: false,
  };

  const els = {
    starCount: document.getElementById('star-count-value'),
    btnInfiniteMode: document.getElementById('btn-infinite-mode'),
    btnReplayVoice: document.getElementById('btn-replay-voice'),
    btnToggleSound: document.getElementById('btn-toggle-sound'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    chameleonAvatar: document.getElementById('chameleon-avatar'),
    levelBadge: document.getElementById('level-badge'),
    promptInstruction: document.getElementById('prompt-instruction'),
    progressDots: document.getElementById('progress-dots'),
    ruleShiftAlert: document.getElementById('rule-shift-alert'),
    cardPromptLabel: document.getElementById('card-prompt-label'),
    incomingCard: document.getElementById('incoming-card'),
    basketsGrid: document.getElementById('baskets-grid'),
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackText: document.getElementById('feedback-text'),
    actionButtons: document.getElementById('action-buttons'),
  };

  function addStars(n) {
    state.stars += n;
    localStorage.setItem('kameleon_stars', String(state.stars));
    els.starCount.textContent = String(state.stars);
  }

  function setFeedback(text, kind = 'neutral') {
    els.feedbackText.textContent = text;
    els.feedbackBanner.className = 'feedback-banner';
    if (kind === 'success') els.feedbackBanner.classList.add('is-success');
    if (kind === 'warn') els.feedbackBanner.classList.add('is-warn');
  }

  function getRoundConfig() {
    if (state.difficulty === 'easy') {
      return { totalCards: 6, switchEvery: 3, invertRatio: 0.35 };
    }
    if (state.difficulty === 'hard') {
      return { totalCards: 12, switchEvery: 3, invertRatio: 0.65 };
    }
    return { totalCards: 9, switchEvery: 3, invertRatio: 0.5 };
  }

  function getSpeechForMode() {
    if (state.mode === 'discover') {
      return 'A kaméleon kigondolt egy titkos válogatási szabályt! Próbáld ki a kosarakat, és találd ki, szín, forma vagy darabszám szerint válogat!';
    }
    if (state.mode === 'switch') {
      return 'Figyelj! A kaméleon néha megváltoztatja a szabályt! Ha nem fogadja el a kosarat, válts gyorsan másik szabályra!';
    }
    return 'Fordított törvény! Ha a kártyán a fordított jel van, tedd a másik színű kosárba!';
  }

  /* ========================================================================
     4. Kör Betöltése & Renderelés
     ======================================================================== */
  function startRound() {
    const cfg = getRoundConfig();
    state.totalCards = cfg.totalCards;
    state.doneCards = 0;
    state.streakInRule = 0;
    state.missesOnCurrent = 0;
    state.roundCompleted = false;
    state.isLocked = false;
    state.activeRule = pickRandom(RULES);

    const prefix = state.infiniteMode ? '∞ ' : '';
    if (state.mode === 'discover') {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. kör — Szabálykeresés`;
      els.promptInstruction.textContent = 'Találd ki a visszajelzésekből, mi alapján válogat a kaméleon!';
    } else if (state.mode === 'switch') {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. kör — Kaméleon-Váltás`;
      els.promptInstruction.textContent = 'A szabály bármikor megváltozhat! Figyeld a kaméleont!';
    } else {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. kör — Fordított Törvény`;
      els.promptInstruction.textContent = 'Sima kártya = saját szín · 🔄 Fordítva = másik kosár!';
    }

    els.ruleShiftAlert.style.display = 'none';
    nextCard();
    renderBaskets();
    renderProgressDots();
    renderActionButtons();
    setFeedback('Koppints arra a kosárra, amelyikbe szerinted a kártya való!');
    speakHu(getSpeechForMode());
  }

  function nextCard() {
    const cfg = getRoundConfig();
    if (state.mode === 'opposite') {
      state.currentCard = generateCardForOpposite(cfg.invertRatio);
    } else {
      state.currentCard = generateCardForWCST();
    }
    state.missesOnCurrent = 0;
    renderCurrentCard();
  }

  function renderCurrentCard() {
    const card = state.currentCard;
    els.incomingCard.className = 'incoming-card';

    if (state.mode === 'opposite') {
      els.cardPromptLabel.textContent = card.inverted
        ? '🔄 FORDÍTVA! Tedd a másik színű kosárba!'
        : '➡️ SIMA! Tedd a saját színű kosarába!';
      els.incomingCard.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          <span style="font-size:1.15rem; font-weight:800;">${card.inverted ? '🔄' : '➡️'}</span>
          ${renderCardSymbolsHTML(card, 44)}
        </div>
      `;
    } else {
      els.cardPromptLabel.textContent = 'Hová illik ez a kártya?';
      els.incomingCard.innerHTML = renderCardSymbolsHTML(card, 32);
    }
  }

  function renderBaskets() {
    if (state.mode === 'opposite') {
      els.basketsGrid.className = 'baskets-grid is-two-cols';
      els.basketsGrid.innerHTML = OPPOSITE_BASKETS.map(
        (b, idx) => `
        <button type="button" class="basket-btn" data-basket-idx="${idx}">
          ${renderCardSymbolsHTML(b, 36)}
          <span class="basket-label">${b.label}</span>
        </button>
      `
      ).join('');
    } else {
      els.basketsGrid.className = 'baskets-grid';
      els.basketsGrid.innerHTML = BASKETS.map(
        (b, idx) => `
        <button type="button" class="basket-btn" data-basket-idx="${idx}">
          ${renderCardSymbolsHTML(b, 26)}
          <span class="basket-label">${idx + 1}. kosár</span>
        </button>
      `
      ).join('');
    }

    els.basketsGrid.querySelectorAll('.basket-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.roundCompleted || state.isLocked) return;
        handleBasketPick(Number(btn.dataset.basketIdx));
      });
    });
  }

  function renderProgressDots() {
    const dots = [];
    for (let i = 0; i < state.totalCards; i++) {
      let cls = 'p-dot';
      if (i < state.doneCards) cls += ' is-done';
      else if (i === state.doneCards && !state.roundCompleted) cls += ' is-current';
      dots.push(`<span class="${cls}"></span>`);
    }
    els.progressDots.innerHTML = dots.join('');
  }

  function renderActionButtons() {
    if (state.roundCompleted) {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-success" id="btn-next-round">
          Következő kör →
        </button>
      `;
      document.getElementById('btn-next-round').addEventListener('click', () => {
        state.roundNum++;
        startRound();
      });
      return;
    }

    els.actionButtons.innerHTML = `
      <button type="button" class="btn btn-secondary" id="btn-restart-round">🔄 Újrakezdem</button>
    `;
    document.getElementById('btn-restart-round').addEventListener('click', startRound);
  }

  /* ========================================================================
     5. Kártya Kiértékelés & Szabályváltás
     ======================================================================== */
  function handleBasketPick(basketIdx) {
    const ok = checkBasketMatch(state.currentCard, basketIdx);

    if (ok) {
      state.isLocked = true;
      els.incomingCard.classList.add('is-correct');
      playTone('ding');
      state.doneCards++;
      state.streakInRule++;
      renderProgressDots();

      if (state.doneCards >= state.totalCards) {
        addStars(1);
        state.roundCompleted = true;
        state.isLocked = false;
        setFeedback('Szuper figyelem! Minden kártyát ügyesen szétválogattál!', 'success');
        speakMotivationalSuccess();
        renderActionButtons();
        return;
      }

      const cfg = getRoundConfig();
      if (state.mode === 'switch' && state.streakInRule >= cfg.switchEvery) {
        // Kaméleon szabályt vált!
        const others = RULES.filter((r) => r !== state.activeRule);
        state.activeRule = pickRandom(others);
        state.streakInRule = 0;
        els.chameleonAvatar.classList.add('is-switching');
        els.ruleShiftAlert.style.display = 'inline-block';
        playTone('shift');
        setFeedback('✨ A kaméleon színt váltott! Új szabály érvényes!', 'warn');
        speakHu('Figyelem! A kaméleon megváltoztatta a szabályt!');
        setTimeout(() => {
          els.chameleonAvatar.classList.remove('is-switching');
        }, 700);
      } else {
        els.ruleShiftAlert.style.display = 'none';
        setFeedback('Helyes! Pontosan ez a szabály!', 'success');
      }

      setTimeout(() => {
        state.isLocked = false;
        nextCard();
      }, 420);
    } else {
      state.missesOnCurrent++;
      els.incomingCard.classList.remove('is-wrong');
      void els.incomingCard.offsetWidth;
      els.incomingCard.classList.add('is-wrong');
      playTone('error');

      if (state.mode === 'opposite') {
        setFeedback(
          state.currentCard.inverted
            ? 'Hoppá! Itt a 🔄 fordított jel van, válaszd a másik kosarat!'
            : 'Hoppá! Ez sima kártya, a saját színű kosárba való!',
          'warn'
        );
      } else if (state.difficulty === 'easy' && state.missesOnCurrent >= 2) {
        const hintName =
          state.activeRule === 'color'
            ? 'a SZÍNRE'
            : state.activeRule === 'shape'
              ? 'a FORMÁRA'
              : 'a DARABSZÁMRA';
        setFeedback(`Segítség: most figyelj ${hintName}!`, 'warn');
        speakHu(`Segítség: most figyelj ${hintName}!`);
      } else {
        setFeedback('A kaméleon megrázta a fejét! Próbálj egy másik kosarat!', 'warn');
      }
    }
  }

  /* ========================================================================
     6. Eseménykezelők & Indítás
     ======================================================================== */
  els.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.mode;
      if (nextMode === state.mode) return;
      state.mode = nextMode;
      state.roundNum = 1;
      els.modeTabs.forEach((t) => t.classList.toggle('is-active', t.dataset.mode === nextMode));
      startRound();
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
      startRound();
    });
  });

  els.btnInfiniteMode.addEventListener('click', () => {
    state.infiniteMode = !state.infiniteMode;
    els.btnInfiniteMode.classList.toggle('is-active', state.infiniteMode);
    els.btnInfiniteMode.setAttribute('aria-pressed', String(state.infiniteMode));
    startRound();
  });

  els.btnReplayVoice.addEventListener('click', () => {
    speakHu(getSpeechForMode());
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
  startRound();
})();
