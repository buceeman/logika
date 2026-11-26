/**
 * Varázsgép — Átalakító Gép és Vizuális Analógiák
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

      if (type === 'success') {
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
    'Szuper! Pontosan rájöttél, mit csinál a Varázsgép!',
    'Bravó! Igazi kis tudós vagy!',
    'Fantasztikus! Tökéletesen működik a géped!',
    'Ügyes megfigyelés! Pont ez lett az eredmény!',
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
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél a Varázsgéppel!`);
    } else {
      playTone('success');
      speakHu(customMsg || pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Formák & Átalakítási Szabályok
     ======================================================================== */
  const COLORS = [
    { id: 'red', name: 'piros', hex: '#D95338' },
    { id: 'blue', name: 'kék', hex: '#2D5F9A' },
    { id: 'green', name: 'zöld', hex: '#387D5A' },
    { id: 'gold', name: 'sárga', hex: '#D99226' },
  ];

  const SHAPES = [
    { id: 'circle', name: 'kör' },
    { id: 'square', name: 'négyzet' },
    { id: 'triangle', name: 'háromszög' },
    { id: 'star', name: 'csillag' },
  ];

  function tokenKey(t) {
    return `${t.shape}_${t.color}_${t.size}_${t.count}_${t.filled ? 'f' : 'o'}`;
  }

  function renderTokenHtml(t) {
    const colorObj = COLORS.find((c) => c.id === t.color) || COLORS[0];
    const px = t.size === 'big' ? 50 : 28;
    const fill = t.filled ? colorObj.hex : 'none';
    const stroke = t.filled ? '#2B1E16' : colorObj.hex;
    const sw = t.filled ? 2.5 : 4;

    let svg = '';
    if (t.shape === 'circle') {
      svg = `<svg width="${px}" height="${px}" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg>`;
    } else if (t.shape === 'square') {
      svg = `<svg width="${px}" height="${px}" viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="7" width="34" height="34" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg>`;
    } else if (t.shape === 'triangle') {
      svg = `<svg width="${px}" height="${px}" viewBox="0 0 48 48" aria-hidden="true"><polygon points="24,6 43,40 5,40" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
    } else {
      svg = `<svg width="${px}" height="${px}" viewBox="0 0 48 48" aria-hidden="true"><polygon points="24,5 29.5,17 42.5,18.5 32.8,27.5 35.4,40.5 24,34 12.6,40.5 15.2,27.5 5.5,18.5 18.5,17" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
    }

    return Array(t.count).fill(svg).join('');
  }

  const RULES = [
    {
      id: 'grow',
      icon: '🔍',
      label: 'Megnagyobbítja',
      canApply: (t) => t.size === 'small',
      apply: (t) => ({ ...t, size: 'big' }),
    },
    {
      id: 'shrink',
      icon: '🔎',
      label: 'Lekicsinyíti',
      canApply: (t) => t.size === 'big',
      apply: (t) => ({ ...t, size: 'small' }),
    },
    {
      id: 'recolor',
      icon: '🎨',
      label: 'Átszínezi',
      canApply: () => true,
      apply: (t) => {
        const idx = COLORS.findIndex((c) => c.id === t.color);
        return { ...t, color: COLORS[(idx + 1) % COLORS.length].id };
      },
    },
    {
      id: 'nextShape',
      icon: '🔄',
      label: 'Formát vált',
      canApply: () => true,
      apply: (t) => {
        const idx = SHAPES.findIndex((s) => s.id === t.shape);
        return { ...t, shape: SHAPES[(idx + 1) % SHAPES.length].id };
      },
    },
    {
      id: 'addOne',
      icon: '➕',
      label: '+1 darabot ad hozzá',
      canApply: (t) => t.count < 3,
      apply: (t) => ({ ...t, count: t.count + 1 }),
    },
    {
      id: 'toggleFill',
      icon: '⭕',
      label: 'Kilyukasztja / kitölti',
      canApply: () => true,
      apply: (t) => ({ ...t, filled: !t.filled }),
    },
  ];

  function randomToken(rule) {
    let attempts = 0;
    while (attempts < 40) {
      attempts += 1;
      const t = {
        shape: pickRandom(SHAPES).id,
        color: pickRandom(COLORS).id,
        size: Math.random() < 0.5 ? 'small' : 'big',
        count: Math.random() < 0.65 ? 1 : 2,
        filled: true,
      };
      if (!rule || rule.canApply(t)) return t;
    }
    return { shape: 'circle', color: 'red', size: 'small', count: 1, filled: true };
  }

  function makeDistractors(answer, input, countNeeded) {
    const out = [];
    const seen = new Set([tokenKey(answer)]);
    const candidates = [
      input,
      { ...answer, color: COLORS[(COLORS.findIndex((c) => c.id === answer.color) + 1) % COLORS.length].id },
      { ...answer, shape: SHAPES[(SHAPES.findIndex((s) => s.id === answer.shape) + 1) % SHAPES.length].id },
      { ...answer, size: answer.size === 'big' ? 'small' : 'big' },
      { ...answer, filled: !answer.filled },
      { ...answer, count: answer.count === 1 ? 2 : 1 },
    ];
    for (const c of shuffle(candidates)) {
      if (out.length >= countNeeded) break;
      const k = tokenKey(c);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
    }
    return out;
  }

  function generatePredictPuzzle(diff) {
    const easyRules = RULES.filter((r) => ['grow', 'shrink', 'recolor', 'addOne'].includes(r.id));
    const medRules = RULES;

    if (diff === 'hard') {
      const r1 = pickRandom(RULES.filter((r) => ['grow', 'shrink', 'toggleFill'].includes(r.id)));
      const r2 = pickRandom(RULES.filter((r) => ['recolor', 'nextShape'].includes(r.id)));
      const combined = {
        canApply: (t) => r1.canApply(t) && r2.canApply(t),
        apply: (t) => r2.apply(r1.apply(t)),
      };
      const ex1In = randomToken(combined);
      const ex2In = randomToken(combined);
      let qIn = randomToken(combined);
      if (tokenKey(qIn) === tokenKey(ex1In)) {
        qIn = { ...qIn, shape: SHAPES[(SHAPES.findIndex((s) => s.id === qIn.shape) + 2) % SHAPES.length].id };
      }
      const answer = combined.apply(qIn);
      const choices = shuffle([answer, ...makeDistractors(answer, qIn, 3)]);
      return {
        mode: 'predict',
        examples: [
          { input: ex1In, output: combined.apply(ex1In) },
          { input: ex2In, output: combined.apply(ex2In) },
        ],
        qIn,
        answer,
        choices,
        prompt: 'A Varázsgép egyszerre két dolgot is megváltoztat! Mi jön ki belőle?',
      };
    }

    const rule = pickRandom(diff === 'easy' ? easyRules : medRules);
    const exIn = randomToken(rule);
    let qIn = randomToken(rule);
    if (tokenKey(qIn) === tokenKey(exIn)) {
      qIn = { ...qIn, color: COLORS[(COLORS.findIndex((c) => c.id === qIn.color) + 1) % COLORS.length].id };
    }
    const answer = rule.apply(qIn);
    const numDistractors = diff === 'easy' ? 2 : 3;
    return {
      mode: 'predict',
      examples: [{ input: exIn, output: rule.apply(exIn) }],
      qIn,
      answer,
      choices: shuffle([answer, ...makeDistractors(answer, qIn, numDistractors)]),
      prompt: 'Nézd meg felül, mit csinál a gép! Mi lesz az eredmény lent?',
    };
  }

  function generateAnalogyPuzzle(diff) {
    const pool = diff === 'easy'
      ? RULES.filter((r) => ['grow', 'shrink', 'recolor', 'nextShape'].includes(r.id))
      : RULES;
    const rule = pickRandom(pool);
    const a = randomToken(rule);
    const b = rule.apply(a);
    let c = randomToken(rule);
    if (tokenKey(c) === tokenKey(a)) {
      c = { ...c, shape: SHAPES[(SHAPES.findIndex((s) => s.id === c.shape) + 1) % SHAPES.length].id };
    }
    const answer = rule.apply(c);
    const numDistractors = diff === 'easy' ? 2 : 3;

    return {
      mode: 'analogy',
      a,
      b,
      c,
      answer,
      choices: shuffle([answer, ...makeDistractors(answer, c, numDistractors)]),
      prompt: 'Ha az elsőből a második lett, akkor ugyanezzel a szabállyal mi lesz a harmadikból?',
    };
  }

  function generateRulePuzzle(diff) {
    const pool = diff === 'easy'
      ? RULES.filter((r) => ['grow', 'shrink', 'recolor', 'addOne'].includes(r.id))
      : RULES;
    const rule = pickRandom(pool);
    const input = randomToken(rule);
    const output = rule.apply(input);
    const others = shuffle(RULES.filter((r) => r.id !== rule.id)).slice(0, diff === 'easy' ? 2 : 3);

    return {
      mode: 'rule',
      input,
      output,
      answerRule: rule,
      choices: shuffle([rule, ...others]),
      prompt: 'Állítsd be a gépet! Mit csinált a Varázsgép a formával?',
    };
  }

  /* ========================================================================
     3. Állapot & DOM Kezelés
     ======================================================================== */
  const STAR_KEY = 'gep_stars';

  const state = {
    mode: 'predict',
    difficulty: 'easy',
    infiniteMode: false,
    stars: Number(localStorage.getItem(STAR_KEY) || 0),
    level: 1,
    puzzle: null,
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
     4. Renderelők
     ======================================================================== */
  function renderPredictStage(p) {
    const examplesHtml = p.examples.map((ex) => `
      <div class="machine-row">
        <div class="token-box">${renderTokenHtml(ex.input)}</div>
        <span class="machine-arrow" aria-hidden="true">➔</span>
        <div class="machine-box">⚙️ Varázsgép</div>
        <span class="machine-arrow" aria-hidden="true">➔</span>
        <div class="token-box">${renderTokenHtml(ex.output)}</div>
      </div>
    `).join('');

    const choicesHtml = p.choices.map((c, idx) => `
      <button type="button" class="choice-card" data-choice-idx="${idx}">
        ${renderTokenHtml(c)}
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="machine-stage">
        ${examplesHtml}
        <div class="machine-row is-question">
          <div class="token-box">${renderTokenHtml(p.qIn)}</div>
          <span class="machine-arrow" aria-hidden="true">➔</span>
          <div class="machine-box">⚙️ Varázsgép</div>
          <span class="machine-arrow" aria-hidden="true">➔</span>
          <div class="token-box is-missing" id="missing-output">?</div>
        </div>
      </div>
      <div style="margin-top:0.9rem;">
        <p class="choices-label">👇 Válaszd ki a végeredményt:</p>
        <div class="choices-grid" id="choices-grid">${choicesHtml}</div>
      </div>
    `;

    const grid = document.getElementById('choices-grid');
    grid.querySelectorAll('.choice-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const chosen = p.choices[Number(btn.dataset.choiceIdx)];
        if (tokenKey(chosen) === tokenKey(p.answer)) {
          state.solved = true;
          btn.classList.add('is-correct');
          const outBox = document.getElementById('missing-output');
          outBox.classList.remove('is-missing');
          outBox.classList.add('is-filled');
          outBox.innerHTML = renderTokenHtml(chosen);
          grid.querySelectorAll('.choice-card').forEach((b) => { b.disabled = true; });
          addStar();
          setFeedback('Szuper! Pontosan ez jött ki a Varázsgépből! ⭐', 'success');
          speakSuccess();
          renderNextButton();
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          playTone('error');
          setFeedback('Nem egészen! Hasonlítsd össze még egyszer a fenti példával!', 'error');
          speakHu('Nem egészen! Nézd meg újra a fenti példát!');
        }
      });
    });
  }

  function renderAnalogyStage(p) {
    const choicesHtml = p.choices.map((c, idx) => `
      <button type="button" class="choice-card" data-choice-idx="${idx}">
        ${renderTokenHtml(c)}
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="machine-stage">
        <div class="machine-row">
          <div class="token-box">${renderTokenHtml(p.a)}</div>
          <span class="machine-arrow" aria-hidden="true">➔</span>
          <div class="token-box">${renderTokenHtml(p.b)}</div>
        </div>
        <div class="machine-row is-question">
          <div class="token-box">${renderTokenHtml(p.c)}</div>
          <span class="machine-arrow" aria-hidden="true">➔</span>
          <div class="token-box is-missing" id="missing-analogy">?</div>
        </div>
      </div>
      <div style="margin-top:0.9rem;">
        <p class="choices-label">👇 Melyik illik a kérdőjel helyére?</p>
        <div class="choices-grid" id="choices-grid">${choicesHtml}</div>
      </div>
    `;

    const grid = document.getElementById('choices-grid');
    grid.querySelectorAll('.choice-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const chosen = p.choices[Number(btn.dataset.choiceIdx)];
        if (tokenKey(chosen) === tokenKey(p.answer)) {
          state.solved = true;
          btn.classList.add('is-correct');
          const outBox = document.getElementById('missing-analogy');
          outBox.classList.remove('is-missing');
          outBox.classList.add('is-filled');
          outBox.innerHTML = renderTokenHtml(chosen);
          grid.querySelectorAll('.choice-card').forEach((b) => { b.disabled = true; });
          addStar();
          setFeedback('Bravó! Megtaláltad a tökéletes párt! ⭐', 'success');
          speakSuccess();
          renderNextButton();
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          playTone('error');
          setFeedback('Nézd meg, mi változott meg az első párban!', 'error');
          speakHu('Figyeld meg, mi változott meg az első párban!');
        }
      });
    });
  }

  function renderRuleStage(p) {
    const choicesHtml = p.choices.map((r, idx) => `
      <button type="button" class="choice-card is-rule-btn" data-rule-idx="${idx}">
        <span style="font-size:1.7rem;">${r.icon}</span>
        <span>${r.label}</span>
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="machine-stage">
        <div class="machine-row is-question">
          <div class="token-box">${renderTokenHtml(p.input)}</div>
          <span class="machine-arrow" aria-hidden="true">➔</span>
          <div class="machine-box" id="mystery-machine">⚙️ ?</div>
          <span class="machine-arrow" aria-hidden="true">➔</span>
          <div class="token-box">${renderTokenHtml(p.output)}</div>
        </div>
      </div>
      <div style="margin-top:0.9rem;">
        <p class="choices-label">👇 Válaszd ki, mit csinált a Varázsgép:</p>
        <div class="choices-grid" id="choices-grid">${choicesHtml}</div>
      </div>
    `;

    const grid = document.getElementById('choices-grid');
    grid.querySelectorAll('.choice-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const chosen = p.choices[Number(btn.dataset.ruleIdx)];
        if (chosen.id === p.answerRule.id) {
          state.solved = true;
          btn.classList.add('is-correct');
          document.getElementById('mystery-machine').textContent = `${chosen.icon} ${chosen.label}`;
          grid.querySelectorAll('.choice-card').forEach((b) => { b.disabled = true; });
          addStar();
          setFeedback(`Ügyes vagy! A gép szabálya: ${chosen.label}! ⭐`, 'success');
          speakSuccess(`Szuper! A gép valóban ${chosen.label.toLowerCase()}!`);
          renderNextButton();
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          playTone('error');
          setFeedback('Hasonlítsd össze a bal és a jobb oldali képet!', 'error');
          speakHu('Hasonlítsd össze a két képet! Mi változott meg?');
        }
      });
    });
  }

  /* ========================================================================
     5. Játékciklus & Eseménykezelők
     ======================================================================== */
  function loadNewPuzzle() {
    state.solved = false;
    els.actionButtons.innerHTML = '';
    els.levelBadge.textContent = `${state.level}. kísérlet`;

    if (state.mode === 'predict') {
      state.puzzle = generatePredictPuzzle(state.difficulty);
      renderPredictStage(state.puzzle);
      setFeedback('Figyeld meg a példát, és válaszd ki a végeredményt!');
    } else if (state.mode === 'analogy') {
      state.puzzle = generateAnalogyPuzzle(state.difficulty);
      renderAnalogyStage(state.puzzle);
      setFeedback('Keresd meg a második pár hiányzó darabját!');
    } else {
      state.puzzle = generateRulePuzzle(state.difficulty);
      renderRuleStage(state.puzzle);
      setFeedback('Nézd meg a két képet, és találd ki a gép gombját!');
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
