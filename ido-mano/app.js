/**
 * Idő-Manó — Időrend, hét napjai, óra-leolvasás és történet-sorrend
 */
(() => {
  'use strict';

  const STAR_KEY = 'mano_stars';

  const DAYS = [
    { name: 'Hétfő', short: 'Hétfő', emoji: '1️⃣' },
    { name: 'Kedd', short: 'Kedd', emoji: '2️⃣' },
    { name: 'Szerda', short: 'Szerda', emoji: '3️⃣' },
    { name: 'Csütörtök', short: 'Csüt.', emoji: '4️⃣' },
    { name: 'Péntek', short: 'Péntek', emoji: '5️⃣' },
    { name: 'Szombat', short: 'Szom.', emoji: '6️⃣' },
    { name: 'Vasárnap', short: 'Vas.', emoji: '7️⃣' },
  ];

  const DAY_PARTS = [
    { name: 'Reggel', emoji: '🌅' },
    { name: 'Délelőtt', emoji: '🌤️' },
    { name: 'Dél', emoji: '☀️' },
    { name: 'Délután', emoji: '⛅' },
    { name: 'Este', emoji: '🌆' },
    { name: 'Éjszaka', emoji: '🌙' },
  ];

  const STORIES = [
    {
      title: 'A kis virág élete',
      steps: [
        { emoji: '🌱', label: 'Elültetjük a magot' },
        { emoji: '💧', label: 'Meglocsoljuk vízzel' },
        { emoji: '🌿', label: 'Kibújik a kis hajtás' },
        { emoji: '🌻', label: 'Kinyílik a szép virág' },
      ],
    },
    {
      title: 'Reggeli indulás',
      steps: [
        { emoji: '⏰', label: 'Csörög az ébresztő' },
        { emoji: '🪥', label: 'Megmossuk a fogunkat' },
        { emoji: '🎒', label: 'Bepakolunk a táskába' },
        { emoji: '🏫', label: 'Elindulunk az iskolába' },
      ],
    },
    {
      title: 'Hóember építés',
      steps: [
        { emoji: '❄️', label: 'Hullik a friss hó' },
        { emoji: '⚪', label: 'Nagy hógolyót görgetünk' },
        { emoji: '⛄', label: 'Összerakjuk a hóembert' },
        { emoji: '🥕', label: 'Felkerül a répaorr' },
      ],
    },
    {
      title: 'A kiscsirke meséje',
      steps: [
        { emoji: '🥚', label: 'Tojás a fészekben' },
        { emoji: '🐣', label: 'Repedezik a tojáshéj' },
        { emoji: '🐤', label: 'Kikel a sárga kiscsirke' },
        { emoji: '🐓', label: 'Nagy kakassá cseperedik' },
      ],
    },
    {
      title: 'Sütemény sütés',
      steps: [
        { emoji: '🥣', label: 'Összekeverjük a tésztát' },
        { emoji: '🍪', label: 'Kiszaggatjuk a formákat' },
        { emoji: '🔥', label: 'Megsütjük a sütőben' },
        { emoji: '😋', label: 'Megesszük a finom sütit' },
      ],
    },
    {
      title: 'Az almafa éve',
      steps: [
        { emoji: '🌸', label: 'Virágba borul a fa' },
        { emoji: '🍏', label: 'Zöld kis almák nőnek' },
        { emoji: '🍎', label: 'Pirosra érik az alma' },
        { emoji: '🧺', label: 'Kosárba szedjük őket' },
      ],
    },
    {
      title: 'Kézmosás festés után',
      steps: [
        { emoji: '🎨', label: 'Festékes lett a kezünk' },
        { emoji: '🧼', label: 'Beszappanozzuk alaposan' },
        { emoji: '🚿', label: 'Leöblítjük tiszta vízzel' },
        { emoji: '🧻', label: 'Szárazra töröljük' },
      ],
    },
    {
      title: 'Esti készülődés',
      steps: [
        { emoji: '🛁', label: 'Meleg habfürdőt veszünk' },
        { emoji: '👕', label: 'Felvesszük a pizsamát' },
        { emoji: '📖', label: 'Meghallgatjuk az esti mesét' },
        { emoji: '😴', label: 'Édesen elalszunk' },
      ],
    },
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
    mode: 'calendar',
    difficulty: 'easy',
    infinite: false,
    round: 1,
    stars: Number(localStorage.getItem(STAR_KEY) || 0),
    solved: false,
    lastVoiceText: '',
    puzzle: null,
    storySlots: [],
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

  function playTone(freq, dur = 0.14, type = 'sine', delay = 0) {
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
    playTone(240, 0.16, 'sawtooth', 0);
    playTone(190, 0.2, 'sawtooth', 0.14);
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
      speakHu(`Szuper! Már ${state.stars} csillagod van az Idő-Manóban!`);
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

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ========================================================================
     1. NAPOK & NAPSZAKOK MÓD
     ======================================================================== */
  function buildCalendarPuzzle() {
    const useDayParts = state.difficulty !== 'easy' && Math.random() < 0.35;

    if (useDayParts) {
      const idx = Math.floor(Math.random() * (DAY_PARTS.length - 1));
      const askNext = Math.random() < 0.6;
      const anchorIdx = askNext ? idx : idx + 1;
      const targetIdx = askNext ? idx + 1 : idx;
      const anchor = DAY_PARTS[anchorIdx];
      const target = DAY_PARTS[targetIdx];

      const question = askNext
        ? `Melyik napszak jön közvetlenül a(z) ${anchor.name.toLowerCase()} után?`
        : `Melyik napszak van közvetlenül a(z) ${anchor.name.toLowerCase()} előtt?`;

      const distractors = shuffle(DAY_PARTS.filter((_, i) => i !== targetIdx)).slice(0, 3);
      const options = shuffle([target, ...distractors]);

      return {
        kind: 'dayparts',
        items: DAY_PARTS,
        anchorIdx,
        targetIdx,
        question,
        answer: target.name,
        options: options.map((o) => ({ label: o.name, emoji: o.emoji, value: o.name })),
      };
    }

    // Days of the week
    const offset = state.difficulty === 'hard'
      ? pickRandom([-2, -1, 1, 2])
      : pickRandom([-1, 1]);

    const anchorIdx = Math.floor(Math.random() * 7);
    const targetIdx = (anchorIdx + offset + 7) % 7;
    const anchor = DAYS[anchorIdx];
    const target = DAYS[targetIdx];

    let question = '';
    if (offset === 1) {
      question = state.difficulty === 'easy'
        ? `Melyik nap jön közvetlenül ${anchor.name} után?`
        : `Ha ma ${anchor.name} van, milyen nap lesz holnap?`;
    } else if (offset === -1) {
      question = state.difficulty === 'easy'
        ? `Melyik nap van közvetlenül ${anchor.name} előtt?`
        : `Ha ma ${anchor.name} van, milyen nap volt tegnap?`;
    } else if (offset === 2) {
      question = `Ha ma ${anchor.name} van, milyen nap lesz holnapután?`;
    } else {
      question = `Ha ma ${anchor.name} van, milyen nap volt tegnapelőtt?`;
    }

    const distractors = shuffle(DAYS.filter((_, i) => i !== targetIdx)).slice(0, 3);
    const options = shuffle([target, ...distractors]);

    return {
      kind: 'days',
      items: DAYS,
      anchorIdx,
      targetIdx,
      question,
      answer: target.name,
      options: options.map((o) => ({ label: o.name, emoji: o.emoji, value: o.name })),
    };
  }

  function renderCalendarStage(puzzle) {
    const stripHtml = puzzle.items.map((item, idx) => {
      const isAnchor = idx === puzzle.anchorIdx;
      const isTarget = idx === puzzle.targetIdx && !state.solved;
      const isRevealed = idx === puzzle.targetIdx && state.solved;
      const cls = isTarget ? 'is-target' : isAnchor ? 'is-anchor' : '';
      return `
        <div class="seq-chip ${cls}">
          <span class="seq-chip-emoji">${isTarget ? '❓' : item.emoji}</span>
          <span>${isTarget ? '?' : isRevealed ? `✅ ${item.short || item.name}` : (item.short || item.name)}</span>
        </div>
      `;
    }).join('');

    const choicesHtml = puzzle.options.map((opt) => `
      <button type="button" class="choice-btn" data-val="${opt.value}">
        <span>${opt.emoji} ${opt.label}</span>
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="seq-strip" aria-label="Időrendi sor">${stripHtml}</div>
      <div class="choices-grid">${choicesHtml}</div>
    `;

    els.stage.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleChoiceAnswer(btn, btn.dataset.val, puzzle.answer));
    });
  }

  /* ========================================================================
     2. ÓRA-LEOLVASÁS MÓD
     ======================================================================== */
  function formatHungarianClock(hour, minute) {
    const nextHour = (hour % 12) + 1;
    const digital = `${hour}:${String(minute).padStart(2, '0')}`;
    if (minute === 0) return { spoken: `${hour} óra`, sub: digital };
    if (minute === 30) return { spoken: `fél ${nextHour}`, sub: digital };
    if (minute === 15) return { spoken: `negyed ${nextHour}`, sub: digital };
    if (minute === 45) return { spoken: `háromnegyed ${nextHour}`, sub: digital };
    return { spoken: digital, sub: digital };
  }

  function buildClockSvg(hour, minute) {
    const minuteAngle = minute * 6;
    const hourAngle = (hour % 12) * 30 + minute * 0.5;

    let nums = '';
    for (let n = 1; n <= 12; n++) {
      const rad = ((n * 30 - 90) * Math.PI) / 180;
      const x = 120 + Math.cos(rad) * 86;
      const y = 120 + Math.sin(rad) * 86;
      nums += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Baloo 2, sans-serif" font-weight="800" font-size="18" fill="#2B1E16">${n}</text>`;
    }

    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const rad = ((i * 30 - 90) * Math.PI) / 180;
      const x1 = 120 + Math.cos(rad) * 102;
      const y1 = 120 + Math.sin(rad) * 102;
      const x2 = 120 + Math.cos(rad) * 110;
      const y2 = 120 + Math.sin(rad) * 110;
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#B8A99A" stroke-width="2.5" stroke-linecap="round"/>`;
    }

    return `
      <svg class="clock-svg" viewBox="0 0 240 240" role="img" aria-label="Analóg óra">
        <circle cx="120" cy="120" r="114" fill="#FFFDF8" stroke="#D9C8B2" stroke-width="4"/>
        ${ticks}
        ${nums}
        <g transform="rotate(${hourAngle} 120 120)">
          <line x1="120" y1="124" x2="120" y2="66" stroke="#D95338" stroke-width="8" stroke-linecap="round"/>
        </g>
        <g transform="rotate(${minuteAngle} 120 120)">
          <line x1="120" y1="128" x2="120" y2="38" stroke="#2D5F9A" stroke-width="5" stroke-linecap="round"/>
        </g>
        <circle cx="120" cy="120" r="7" fill="#2B1E16"/>
      </svg>
    `;
  }

  function buildClockPuzzle() {
    const allowedMins = state.difficulty === 'easy'
      ? [0]
      : state.difficulty === 'medium'
        ? [0, 30]
        : [0, 15, 30, 45];

    const hour = Math.floor(Math.random() * 12) + 1;
    const minute = pickRandom(allowedMins);
    const askFuture = state.difficulty === 'hard' && Math.random() < 0.35;

    const targetHour = askFuture ? (hour % 12) + 1 : hour;
    const targetFmt = formatHungarianClock(targetHour, minute);

    const question = askFuture
      ? 'Mennyi lesz az idő pontosan 1 óra múlva?'
      : 'Hány óra van ezen az órán?';

    const used = new Set([`${targetHour}:${minute}`]);
    const options = [{ label: targetFmt.spoken, sub: targetFmt.sub, value: `${targetHour}:${minute}` }];

    while (options.length < 4) {
      const h = Math.floor(Math.random() * 12) + 1;
      const m = pickRandom(allowedMins);
      const key = `${h}:${m}`;
      if (!used.has(key)) {
        used.add(key);
        const fmt = formatHungarianClock(h, m);
        options.push({ label: fmt.spoken, sub: fmt.sub, value: key });
      }
    }

    return {
      hour,
      minute,
      question,
      answer: `${targetHour}:${minute}`,
      options: shuffle(options),
    };
  }

  function renderClockStage(puzzle) {
    const choicesHtml = puzzle.options.map((opt) => `
      <button type="button" class="choice-btn" data-val="${opt.value}">
        <span>🕒 ${opt.label}</span>
        <span class="choice-sub">${opt.sub}</span>
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="clock-stage">
        <div class="clock-wrap">${buildClockSvg(puzzle.hour, puzzle.minute)}</div>
        <div class="clock-legend">
          <span><span class="legend-dot" style="background:#D95338;"></span>Piros rövid mutató: óra</span>
          <span><span class="legend-dot" style="background:#2D5F9A;"></span>Kék hosszú mutató: perc</span>
        </div>
      </div>
      <div class="choices-grid">${choicesHtml}</div>
    `;

    els.stage.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleChoiceAnswer(btn, btn.dataset.val, puzzle.answer));
    });
  }

  /* ========================================================================
     3. TÖRTÉNET-SORREND MÓD
     ======================================================================== */
  function buildStoryPuzzle() {
    const story = pickRandom(STORIES);
    const stepCount = state.difficulty === 'easy' ? 3 : 4;
    const steps = story.steps.slice(0, stepCount).map((s, idx) => ({
      id: idx,
      emoji: s.emoji,
      label: s.label,
    }));

    // Ensure shuffled order is not already sorted
    let shuffled = shuffle(steps);
    if (shuffled.every((s, i) => s.id === i)) {
      shuffled = [...shuffled.slice(1), shuffled[0]];
    }

    state.storySlots = new Array(steps.length).fill(null);

    return {
      title: story.title,
      steps,
      shuffled,
      question: `Rakd időrendbe: ${story.title}!`,
    };
  }

  function renderStoryStage(puzzle) {
    const slotsHtml = state.storySlots.map((step, idx) => {
      if (!step) {
        return `
          <button type="button" class="story-slot" data-slot="${idx}">
            <span class="slot-num">${idx + 1}.</span>
            <span style="font-size:1.4rem; opacity:0.5;">❔</span>
            <span style="font-size:0.82rem; color:var(--ink-muted); font-weight:700;">Koppints ide</span>
          </button>
        `;
      }
      return `
        <button type="button" class="story-slot is-filled" data-slot="${idx}">
          <span class="slot-num">${idx + 1}.</span>
          <span class="story-emoji">${step.emoji}</span>
          <span style="font-size:0.86rem; font-weight:800;">${step.label}</span>
        </button>
      `;
    }).join('');

    const placedIds = new Set(state.storySlots.filter(Boolean).map((s) => s.id));
    const trayHtml = puzzle.shuffled.map((step) => `
      <button type="button" class="story-card" data-step-id="${step.id}" ${placedIds.has(step.id) ? 'disabled' : ''}>
        <span class="story-emoji">${step.emoji}</span>
        <span>${step.label}</span>
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="story-board">
        <div class="story-slots">${slotsHtml}</div>
        <div class="story-tray">${trayHtml}</div>
      </div>
    `;

    els.stage.querySelectorAll('.story-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const id = Number(btn.dataset.stepId);
        const step = puzzle.steps.find((s) => s.id === id);
        const emptyIdx = state.storySlots.findIndex((s) => s === null);
        if (step && emptyIdx !== -1) {
          state.storySlots[emptyIdx] = step;
          playTone(440 + emptyIdx * 60, 0.09, 'sine');
          renderStoryStage(puzzle);
        }
      });
    });

    els.stage.querySelectorAll('.story-slot.is-filled').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const slotIdx = Number(btn.dataset.slot);
        state.storySlots[slotIdx] = null;
        playTone(330, 0.08, 'sine');
        renderStoryStage(puzzle);
      });
    });
  }

  function checkStoryOrder() {
    if (state.solved) return;
    if (state.storySlots.some((s) => s === null)) {
      setFeedback('Előbb töltsd ki az összes üres helyet 1-től a végéig!', 'error');
      speakHu('Előbb töltsd ki az összes helyet!');
      playErrorSound();
      return;
    }

    const slotEls = els.stage.querySelectorAll('.story-slot');
    let allOk = true;
    state.storySlots.forEach((step, idx) => {
      const ok = step.id === idx;
      if (!ok) allOk = false;
      slotEls[idx].classList.remove('is-correct', 'is-wrong');
      slotEls[idx].classList.add(ok ? 'is-correct' : 'is-wrong');
    });

    if (allOk) {
      state.solved = true;
      addStar();
      playSuccessSound();
      setFeedback('Ügyes vagy! Tökéletes az időrend! ⭐ +1 csillag', 'success');
      speakHu('Ügyes vagy! Tökéletes az időrend!');
      renderActionButtons();
    } else {
      playErrorSound();
      setFeedback('Valami felcserélődött! Koppints a piros kártyákra, és próbáld újra!', 'error');
      speakHu('Valami felcserélődött! Nézd meg, mi történt előbb.');
    }
  }

  /* ========================================================================
     KÖZÖS KEZELŐK
     ======================================================================== */
  function handleChoiceAnswer(btn, selected, answer) {
    if (state.solved) return;
    if (selected === answer) {
      state.solved = true;
      btn.classList.add('is-correct');
      addStar();
      playSuccessSound();
      setFeedback('Nagyszerű! Pontosan eltaláltad! ⭐ +1 csillag', 'success');
      speakHu('Nagyszerű! Pontosan eltaláltad!');
      if (state.mode === 'calendar') {
        renderCalendarStage(state.puzzle);
        const match = Array.from(els.stage.querySelectorAll('.choice-btn'))
          .find((b) => b.dataset.val === answer);
        if (match) match.classList.add('is-correct');
      }
      renderActionButtons();
    } else {
      btn.classList.add('is-wrong');
      btn.disabled = true;
      playErrorSound();
      setFeedback('Majdnem! Gondold át még egyszer, mi következik!', 'error');
      speakHu('Majdnem! Gondold át még egyszer!');
    }
  }

  function renderActionButtons() {
    els.actionButtons.innerHTML = '';

    if (state.mode === 'story' && !state.solved) {
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn-secondary';
      resetBtn.textContent = '↺ Újrakezdés';
      resetBtn.addEventListener('click', () => {
        state.storySlots.fill(null);
        renderStoryStage(state.puzzle);
        setFeedback('Rakd sorba a történet képeit 1-től kezdve!');
      });

      const checkBtn = document.createElement('button');
      checkBtn.type = 'button';
      checkBtn.className = 'btn btn-primary';
      checkBtn.textContent = 'Ellenőrzés ✓';
      checkBtn.addEventListener('click', checkStoryOrder);

      els.actionButtons.append(resetBtn, checkBtn);
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

    if (state.mode === 'calendar') {
      state.puzzle = buildCalendarPuzzle();
      renderCalendarStage(state.puzzle);
      setFeedback('Figyeld meg az időrendi sort, és válassz egy választ!');
    } else if (state.mode === 'clock') {
      state.puzzle = buildClockPuzzle();
      renderClockStage(state.puzzle);
      setFeedback('Nézd meg a piros óramutatót és a kék percmutatót!');
    } else {
      state.puzzle = buildStoryPuzzle();
      renderStoryStage(state.puzzle);
      setFeedback('Koppints a képekre az események sorrendjében!');
    }

    els.promptInstruction.textContent = state.puzzle.question;
    renderActionButtons();
    speakHu(state.puzzle.question);
  }

  /* ========================================================================
     ESEMÉNYEK
     ======================================================================== */
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
