/**
 * Mérleg-Vásár — Varga Tamás felfedeztető matematikája
 * Kétkarú mérleges egyenértékűség, lánc-következtetés és ismeretlen megfejtése
 */

(() => {
  'use strict';

  const ITEMS = {
    hazelnut: { emoji: '🌰', name: 'Mogyoró' },
    apple: { emoji: '🍎', name: 'Alma' },
    honey: { emoji: '🍯', name: 'Méz' },
    owl: { emoji: '🦉', name: 'Bagoly' },
    egg: { emoji: '🥚', name: 'Tojás' },
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

      if (type === 'place') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
        gain.gain.setValueAtTime(0.13, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.11);
      } else if (type === 'remove') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.11);
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
        osc.frequency.linearRampToValueAtTime(150, now + 0.18);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.24);
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
    'Tökéletes egyensúly! Ügyesen kiszámoltad a cserét!',
    'Bravó! Pontosan annyit tettél a serpenyőbe, amennyi kell!',
    'Fantasztikus következtetés! Igazi vásári mester vagy!',
    'Szuper! Átláttad az összefüggést számok nélkül is!',
    'Remek munka! A mérleg nyelve pontosan középen áll!',
  ];

  const MOTIVATIONAL_RETRY = [
    'Nézd meg, merre billen a mérleg! Tegyél hozzá vagy vegyél le!',
    'Majdnem egyensúlyban van! Figyeld a fenti csere-szabályt!',
    'Semmi gond, próbáld meg másképp kiegyensúlyozni!',
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function speakMotivationalSuccess() {
    if (state.stars > 0 && state.stars % 5 === 0) {
      playTone('fanfare');
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél a vásárban!`);
    } else {
      playTone('success');
      speakHu(pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Pályák (3 Játékmód)
     ======================================================================== */
  const BALANCE_LEVELS = [
    {
      title: '1. vásár — Almák és mogyorók',
      prompt: 'Egyensúlyozd ki a mérleget mogyorókkal!',
      speech: 'Nézd meg a szabályt: egy alma két mogyorót ér. Egyensúlyozd ki a két almát!',
      weights: { hazelnut: 1, apple: 2 },
      clues: [{ left: ['apple'], right: ['hazelnut', 'hazelnut'] }],
      leftItems: ['apple', 'apple'],
      shelf: ['hazelnut'],
    },
    {
      title: '2. vásár — Mézes cserék',
      prompt: 'Mennyi alma vagy mogyoró ér fel egy mézzel?',
      speech: 'Egy méz két almát ér, egy alma pedig két mogyorót. Tegyél ugyanannyit a jobb serpenyőbe!',
      weights: { hazelnut: 1, apple: 2, honey: 4 },
      clues: [
        { left: ['apple'], right: ['hazelnut', 'hazelnut'] },
        { left: ['honey'], right: ['apple', 'apple'] },
      ],
      leftItems: ['honey', 'apple'],
      shelf: ['apple', 'hazelnut'],
    },
    {
      title: '3. vásár — A bölcs bagoly',
      prompt: 'Vásárolj egy baglyot! Használd a csereszabályokat!',
      speech: 'Egy bagoly két mézet ér! Hány almát vagy mogyorót kell tenned a mérlegre?',
      weights: { hazelnut: 1, apple: 2, honey: 4, owl: 8 },
      clues: [
        { left: ['owl'], right: ['honey', 'honey'] },
        { left: ['honey'], right: ['apple', 'apple'] },
        { left: ['apple'], right: ['hazelnut', 'hazelnut'] },
      ],
      leftItems: ['owl'],
      shelf: ['honey', 'apple', 'hazelnut'],
    },
    {
      title: '4. vásár — Vegyes kosár',
      prompt: 'A bal serpenyőben egy bagoly és egy alma van. Kiegyensúlyozod?',
      speech: 'A bal serpenyőben egy bagoly és egy alma van. Tegyél ugyanannyit a másik oldalra!',
      weights: { hazelnut: 1, apple: 3, honey: 6 },
      clues: [
        { left: ['apple'], right: ['hazelnut', 'hazelnut', 'hazelnut'] },
        { left: ['honey'], right: ['apple', 'apple'] },
      ],
      leftItems: ['honey', 'hazelnut', 'hazelnut'],
      shelf: ['apple', 'hazelnut'],
    },
    {
      title: '5. vásár — Sárkánytojás ára',
      prompt: 'Egy sárkánytojás egy baglyot és egy almát ér!',
      speech: 'Egy sárkánytojás egy baglyot és egy almát ér. Fizess érte mézzel és mogyoróval!',
      weights: { hazelnut: 1, apple: 2, honey: 4, owl: 6, egg: 8 },
      clues: [
        { left: ['egg'], right: ['owl', 'apple'] },
        { left: ['owl'], right: ['honey', 'apple'] },
        { left: ['honey'], right: ['apple', 'apple'] },
      ],
      leftItems: ['egg'],
      shelf: ['honey', 'apple', 'hazelnut'],
    },
  ];

  const CHAIN_LEVELS = [
    {
      title: '1. lánc — Alma helyett mogyoró',
      prompt: 'Csak mogyoróval fizethetsz! Hány mogyoró ér fel egy mézzel?',
      speech: 'Egy méz két almát ér, egy alma három mogyorót. Hány mogyoró egy méz?',
      weights: { hazelnut: 1, apple: 3, honey: 6 },
      clues: [
        { left: ['honey'], right: ['apple', 'apple'] },
        { left: ['apple'], right: ['hazelnut', 'hazelnut', 'hazelnut'] },
      ],
      leftItems: ['honey'],
      shelf: ['hazelnut'],
    },
    {
      title: '2. lánc — Bagoly mogyoróban',
      prompt: 'Hány mogyoró egy bagoly? Kövesd végig a láncot!',
      speech: 'Kövesd a láncot! Egy bagoly két alma, egy alma két mogyoró.',
      weights: { hazelnut: 1, apple: 2, owl: 4 },
      clues: [
        { left: ['owl'], right: ['apple', 'apple'] },
        { left: ['apple'], right: ['hazelnut', 'hazelnut'] },
      ],
      leftItems: ['owl', 'hazelnut'],
      shelf: ['hazelnut'],
    },
    {
      title: '3. lánc — Háromlépcsős csere',
      prompt: 'Csak almával egyensúlyozz! Mennyi alma egy sárkánytojás?',
      speech: 'Egy sárkánytojás két méz, egy méz két alma. Hány alma egy tojás?',
      weights: { apple: 1, honey: 2, egg: 4 },
      clues: [
        { left: ['egg'], right: ['honey', 'honey'] },
        { left: ['honey'], right: ['apple', 'apple'] },
      ],
      leftItems: ['egg', 'honey'],
      shelf: ['apple'],
    },
    {
      title: '4. lánc — Dupla méz és bagoly',
      prompt: 'Hány mogyorót kell tenned a két méz helyett?',
      speech: 'Egy méz két alma, egy alma két mogyoró. Hány mogyoró a két méz?',
      weights: { hazelnut: 1, apple: 2, honey: 4 },
      clues: [
        { left: ['honey'], right: ['apple', 'apple'] },
        { left: ['apple'], right: ['hazelnut', 'hazelnut'] },
      ],
      leftItems: ['honey', 'honey'],
      shelf: ['hazelnut'],
    },
  ];

  const MYSTERY_LEVELS = [
    {
      title: '1. kendő — Mi bújt a kendő alá?',
      prompt: 'A mérleg egyensúlyban van! Mit rejt a 🎭 kendő?',
      speech: 'A mérleg egyensúlyban van! Találd ki, mit rejt a kendő, és tedd a válasz kosárba!',
      weights: { hazelnut: 1, apple: 2, honey: 4 },
      clues: [{ left: ['apple'], right: ['hazelnut', 'hazelnut'] }],
      leftVisible: ['apple'],
      rightKnown: ['apple', 'hazelnut', 'hazelnut'],
      hiddenWeight: 2,
      shelf: ['hazelnut', 'apple'],
    },
    {
      title: '2. kendő — Mézes rejtély',
      prompt: 'Egy méz annyit ér, mint két alma. Mi van a kendő alatt?',
      speech: 'Egy méz két almát ér. Ha a bal oldalon egy alma és a kendő van, mi rejtőzik alatta?',
      weights: { hazelnut: 1, apple: 2, honey: 4 },
      clues: [
        { left: ['honey'], right: ['apple', 'apple'] },
        { left: ['apple'], right: ['hazelnut', 'hazelnut'] },
      ],
      leftVisible: ['apple'],
      rightKnown: ['honey'],
      hiddenWeight: 2,
      shelf: ['apple', 'hazelnut'],
    },
    {
      title: '3. kendő — A bagoly titka',
      prompt: 'Találd ki, mennyi az értéke a kendő alatti meglepetésnek!',
      speech: 'A jobb oldalon egy bagoly van, ami két mézet ér. Mi hiányzik a bal oldalról?',
      weights: { hazelnut: 1, apple: 2, honey: 4, owl: 8 },
      clues: [
        { left: ['owl'], right: ['honey', 'honey'] },
        { left: ['honey'], right: ['apple', 'apple'] },
      ],
      leftVisible: ['honey'],
      rightKnown: ['owl'],
      hiddenWeight: 4,
      shelf: ['honey', 'apple', 'hazelnut'],
    },
    {
      title: '4. kendő — Két mogyorónyi különbség',
      prompt: 'Nézd meg jól a két serpenyőt! Mi hiányzik a kendő alól?',
      speech: 'Nézd meg a két serpenyőt, és tedd a válaszba, ami a kendő alatt van!',
      weights: { hazelnut: 1, apple: 3, honey: 6 },
      clues: [
        { left: ['apple'], right: ['hazelnut', 'hazelnut', 'hazelnut'] },
        { left: ['honey'], right: ['apple', 'apple'] },
      ],
      leftVisible: ['apple', 'hazelnut'],
      rightKnown: ['honey'],
      hiddenWeight: 2,
      shelf: ['apple', 'hazelnut'],
    },
  ];

  /* ========================================================================
     3. Végtelen Generátor
     ======================================================================== */
  function generateInfiniteLevel(mode, roundNum) {
    const diff = state.difficulty || 'medium';
    const baseRatio = diff === 'easy' ? 2 : diff === 'medium' ? (Math.random() < 0.5 ? 2 : 3) : (Math.random() < 0.5 ? 3 : 4);
    const midRatio = 2; // 1 méz = 2 alma
    const weights = {
      hazelnut: 1,
      apple: baseRatio,
      honey: baseRatio * midRatio,
      owl: baseRatio * midRatio * 2,
    };

    const appleClueRight = Array(baseRatio).fill('hazelnut');
    const clues = [
      { left: ['apple'], right: appleClueRight },
      { left: ['honey'], right: ['apple', 'apple'] },
    ];
    if (diff === 'hard') {
      clues.push({ left: ['owl'], right: ['honey', 'honey'] });
    }

    if (mode === 'balance') {
      const leftPool =
        diff === 'easy'
          ? ['apple', 'hazelnut']
          : diff === 'medium'
            ? ['honey', 'apple', 'hazelnut']
            : ['owl', 'honey', 'apple'];
      const count = diff === 'easy' ? 2 : diff === 'medium' ? 3 : 3;
      const leftItems = [];
      for (let i = 0; i < count; i++) {
        leftItems.push(pickRandom(leftPool));
      }
      return {
        title: `∞ Végtelen Vásár — ${roundNum}. kör`,
        prompt: 'Egyensúlyozd ki a mérleget a jobb serpenyővel!',
        speech: 'Új vásári feladat! Egyensúlyozd ki a két serpenyőt!',
        weights,
        clues,
        leftItems,
        shelf: diff === 'easy' ? ['apple', 'hazelnut'] : ['honey', 'apple', 'hazelnut'],
      };
    }

    if (mode === 'chain') {
      const leftItems =
        diff === 'easy' ? ['honey'] : diff === 'medium' ? ['honey', 'apple'] : ['owl'];
      return {
        title: `∞ Végtelen Lánc — ${roundNum}. kör`,
        prompt: 'Csak mogyoróval fizethetsz! Hány mogyoró ér fel vele?',
        speech: 'Végtelen lánc! Számold ki, hány mogyoró egyensúlyozza ki!',
        weights,
        clues,
        leftItems,
        shelf: ['hazelnut'],
      };
    }

    // Mystery mode
    const hiddenPool =
      diff === 'easy'
        ? [1, 2]
        : diff === 'medium'
          ? [1, 2, baseRatio, baseRatio + 1]
          : [baseRatio, baseRatio + 1, weights.honey];
    const hiddenWeight = pickRandom(hiddenPool);
    const leftVisible =
      diff === 'hard'
        ? [pickRandom(['apple', 'hazelnut']), 'hazelnut']
        : [pickRandom(['apple', 'hazelnut'])];
    const totalNeeded = sumWeight(leftVisible, weights) + hiddenWeight;

    const rightKnown = [];
    let rem = totalNeeded;
    while (rem >= weights.honey) {
      rightKnown.push('honey');
      rem -= weights.honey;
    }
    while (rem >= weights.apple) {
      rightKnown.push('apple');
      rem -= weights.apple;
    }
    while (rem > 0) {
      rightKnown.push('hazelnut');
      rem--;
    }

    return {
      title: `∞ Végtelen Kendő — ${roundNum}. kör`,
      prompt: 'A mérleg egyensúlyban van! Mit rejt a 🎭 kendő?',
      speech: 'Új rejtély! Mit rejt a kendő a mérlegen?',
      weights,
      clues,
      leftVisible,
      rightKnown,
      hiddenWeight,
      shelf: diff === 'easy' ? ['apple', 'hazelnut'] : ['honey', 'apple', 'hazelnut'],
    };
  }

  /* ========================================================================
     4. Játékállapot & DOM
     ======================================================================== */
  const state = {
    mode: 'balance', // 'balance' | 'chain' | 'mystery'
    levelIdx: { balance: 0, chain: 0, mystery: 0 },
    infiniteMode: false,
    infiniteRound: { balance: 1, chain: 1, mystery: 1 },
    generatedLevel: null,
    stars: Number(localStorage.getItem('merleg_stars') || 0),
    rightItems: [], // A játékos által berakott áruk
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
    cluesRow: document.getElementById('clues-row'),
    scaleStatusPill: document.getElementById('scale-status-pill'),
    scaleBeam: document.getElementById('scale-beam'),
    leftPanTitle: document.getElementById('left-pan-title'),
    leftPanItems: document.getElementById('left-pan-items'),
    rightPanTitle: document.getElementById('right-pan-title'),
    rightPanItems: document.getElementById('right-pan-items'),
    shelfTitle: document.getElementById('shelf-title'),
    marketShelf: document.getElementById('market-shelf'),
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackText: document.getElementById('feedback-text'),
    actionButtons: document.getElementById('action-buttons'),
  };

  function addStars(n) {
    state.stars += n;
    localStorage.setItem('merleg_stars', String(state.stars));
    els.starCount.textContent = String(state.stars);
  }

  function setFeedback(text, kind = 'neutral') {
    els.feedbackText.textContent = text;
    els.feedbackBanner.className = 'feedback-banner';
    if (kind === 'success') els.feedbackBanner.classList.add('is-success');
    if (kind === 'warn') els.feedbackBanner.classList.add('is-warn');
  }

  function getCurrentLevel() {
    if (state.infiniteMode) return state.generatedLevel;
    if (state.mode === 'balance') return BALANCE_LEVELS[state.levelIdx.balance];
    if (state.mode === 'chain') return CHAIN_LEVELS[state.levelIdx.chain];
    return MYSTERY_LEVELS[state.levelIdx.mystery];
  }

  function sumWeight(itemList, weights) {
    return itemList.reduce((acc, key) => acc + (weights[key] || 0), 0);
  }

  /* ========================================================================
     5. Renderelés
     ======================================================================== */
  function loadLevel() {
    if (state.infiniteMode) {
      state.generatedLevel = generateInfiniteLevel(state.mode, state.infiniteRound[state.mode]);
    }
    const lvl = getCurrentLevel();
    state.rightItems = [];
    state.levelCompleted = false;

    els.levelBadge.textContent = lvl.title;
    els.promptInstruction.textContent = lvl.prompt;

    renderClues(lvl);
    renderScale(lvl);
    renderShelf(lvl);
    renderActionButtons();

    setFeedback(
      state.mode === 'mystery'
        ? 'Válaszd ki lentről, mi rejtőzik a 🎭 kendő alatt!'
        : 'Tegyél árukat a jobb serpenyőbe, amíg egyensúlyba nem kerül!'
    );

    speakHu(lvl.speech);
  }

  function renderClues(lvl) {
    els.cluesRow.innerHTML = lvl.clues
      .map(
        (clue) => `
        <div class="clue-card">
          <span class="clue-side">${clue.left.map((k) => ITEMS[k].emoji).join(' ')}</span>
          <span class="clue-eq">=</span>
          <span class="clue-side">${clue.right.map((k) => ITEMS[k].emoji).join(' ')}</span>
        </div>
      `
      )
      .join('');
  }

  function renderScale(lvl) {
    if (state.mode === 'mystery') {
      els.leftPanTitle.textContent = 'Egyensúlyban lévő mérleg';
      els.rightPanTitle.textContent = '🎭 Kendő alatti válaszod (koppints a kivételhez)';
      els.shelfTitle.textContent = '🧺 Szerinted mi van a kendő alatt? Koppints rá:';

      const leftHTML = [
        '<span class="pan-item-static" title="Titkos súly">🎭</span>',
        ...lvl.leftVisible.map((k) => `<span class="pan-item-static">${ITEMS[k].emoji}</span>`),
        '<span class="clue-eq">=</span>',
        ...lvl.rightKnown.map((k) => `<span class="pan-item-static">${ITEMS[k].emoji}</span>`),
      ].join('');
      els.leftPanItems.innerHTML = leftHTML;

      els.scaleBeam.style.transform = 'rotate(0deg)';
      els.scaleStatusPill.textContent = '⚖️ A mérleg már egyensúlyban van!';
      els.scaleStatusPill.className = 'scale-status-pill is-balanced';
    } else {
      els.leftPanTitle.textContent = 'Bal serpenyő (áru)';
      els.rightPanTitle.textContent = 'Jobb serpenyő (koppints a kivételhez)';
      els.shelfTitle.textContent = '🧺 Koppints egy árucikkre, hogy a jobb serpenyőbe tedd:';

      els.leftPanItems.innerHTML = lvl.leftItems
        .map((k) => `<span class="pan-item-static">${ITEMS[k].emoji}</span>`)
        .join('');

      const leftW = sumWeight(lvl.leftItems, lvl.weights);
      const rightW = sumWeight(state.rightItems, lvl.weights);

      if (rightW === leftW) {
        els.scaleBeam.style.transform = 'rotate(0deg)';
        els.scaleStatusPill.textContent = '⚖️ Egyensúlyban van!';
        els.scaleStatusPill.className = 'scale-status-pill is-balanced';
      } else if (leftW > rightW) {
        els.scaleBeam.style.transform = 'rotate(-5deg)';
        els.scaleStatusPill.textContent = '⬅️ A bal oldal nehezebb!';
        els.scaleStatusPill.className = 'scale-status-pill';
      } else {
        els.scaleBeam.style.transform = 'rotate(5deg)';
        els.scaleStatusPill.textContent = '➡️ A jobb oldal nehezebb!';
        els.scaleStatusPill.className = 'scale-status-pill';
      }
    }

    // Jobb serpenyő (játékos elemei)
    els.rightPanItems.innerHTML = '';
    if (state.rightItems.length === 0) {
      els.rightPanItems.innerHTML = '<span style="color:var(--ink-muted); font-size:0.85rem;">Üres</span>';
      return;
    }

    state.rightItems.forEach((key, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pan-item-btn';
      btn.textContent = ITEMS[key].emoji;
      btn.title = `${ITEMS[key].name} kivétele`;
      btn.addEventListener('click', () => {
        if (state.levelCompleted) return;
        state.rightItems.splice(idx, 1);
        playTone('remove');
        renderScale(lvl);
      });
      els.rightPanItems.appendChild(btn);
    });
  }

  function renderShelf(lvl) {
    els.marketShelf.innerHTML = '';
    lvl.shelf.forEach((key) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shelf-btn';
      btn.innerHTML = `<span class="shelf-emoji">${ITEMS[key].emoji}</span><span>+ ${ITEMS[key].name}</span>`;
      btn.addEventListener('click', () => {
        if (state.levelCompleted || state.rightItems.length >= 16) return;
        state.rightItems.push(key);
        playTone('place');
        renderScale(lvl);
      });
      els.marketShelf.appendChild(btn);
    });
  }

  function renderActionButtons() {
    if (state.levelCompleted) {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-success" id="btn-next-level">
          Következő feladat →
        </button>
      `;
      document.getElementById('btn-next-level').addEventListener('click', goNextLevel);
      return;
    }

    const checkLabel = state.mode === 'mystery' ? '🔓 Leleplezés!' : '⚖️ Ellenőrzés!';
    els.actionButtons.innerHTML = `
      <button type="button" class="btn btn-secondary" id="btn-clear-pan">🗑️ Ürítés</button>
      <button type="button" class="btn btn-primary" id="btn-check-scale">${checkLabel}</button>
    `;
    document.getElementById('btn-clear-pan').addEventListener('click', () => {
      state.rightItems = [];
      playTone('remove');
      renderScale(getCurrentLevel());
    });
    document.getElementById('btn-check-scale').addEventListener('click', checkSolution);
  }

  /* ========================================================================
     6. Ellenőrzés
     ======================================================================== */
  function checkSolution() {
    if (state.levelCompleted) return;
    const lvl = getCurrentLevel();

    if (state.rightItems.length === 0) {
      setFeedback('Először tegyél legalább egy árut a jobb serpenyőbe!', 'warn');
      speakHu('Először tegyél valamit a serpenyőbe!');
      return;
    }

    if (state.mode === 'mystery') {
      const guessW = sumWeight(state.rightItems, lvl.weights);
      if (guessW === lvl.hiddenWeight) {
        addStars(1);
        state.levelCompleted = true;
        setFeedback('Lehullt a lepel! Pontosan kitaláltad, mi rejtőzött a kendő alatt!', 'success');
        speakMotivationalSuccess();
        renderActionButtons();
      } else if (guessW < lvl.hiddenWeight) {
        playTone('error');
        setFeedback('Ennél egy kicsit több van a kendő alatt! Tegyél még hozzá!', 'warn');
        speakHu(pickRandom(MOTIVATIONAL_RETRY));
      } else {
        playTone('error');
        setFeedback('Ez már sok lett! Vegyél le egy keveset a válaszból!', 'warn');
        speakHu(pickRandom(MOTIVATIONAL_RETRY));
      }
      return;
    }

    const leftW = sumWeight(lvl.leftItems, lvl.weights);
    const rightW = sumWeight(state.rightItems, lvl.weights);

    if (leftW === rightW) {
      addStars(1);
      state.levelCompleted = true;
      setFeedback('Tökéletes egyensúly! Igazi vásári mester vagy!', 'success');
      speakMotivationalSuccess();
      renderActionButtons();
    } else if (rightW < leftW) {
      playTone('error');
      setFeedback('A bal oldal még nehezebb! Tegyél még a jobb serpenyőbe!', 'warn');
      speakHu(pickRandom(MOTIVATIONAL_RETRY));
    } else {
      playTone('error');
      setFeedback('A jobb oldal túl nehéz lett! Koppints egy árun a serpenyőben, hogy kivedd!', 'warn');
      speakHu(pickRandom(MOTIVATIONAL_RETRY));
    }
  }

  function syncInfiniteButtonUI() {
    els.btnInfiniteMode.classList.toggle('is-active', state.infiniteMode);
    els.btnInfiniteMode.setAttribute('aria-pressed', String(state.infiniteMode));
  }

  function goNextLevel() {
    if (state.infiniteMode) {
      state.infiniteRound[state.mode]++;
      loadLevel();
      return;
    }
    const lists = { balance: BALANCE_LEVELS, chain: CHAIN_LEVELS, mystery: MYSTERY_LEVELS };
    const list = lists[state.mode];
    if (state.levelIdx[state.mode] + 1 >= list.length) {
      state.infiniteMode = true;
      state.infiniteRound[state.mode] = 1;
      syncInfiniteButtonUI();
    } else {
      state.levelIdx[state.mode]++;
    }
    loadLevel();
  }

  /* ========================================================================
     7. Eseménykezelők & Indítás
     ======================================================================== */
  els.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.mode;
      if (nextMode === state.mode) return;
      state.mode = nextMode;
      els.modeTabs.forEach((t) => t.classList.toggle('is-active', t.dataset.mode === nextMode));
      loadLevel();
    });
  });

  els.btnInfiniteMode.addEventListener('click', () => {
    state.infiniteMode = !state.infiniteMode;
    syncInfiniteButtonUI();
    loadLevel();
  });

  els.btnReplayVoice.addEventListener('click', () => {
    speakHu(getCurrentLevel().speech);
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

  document.querySelectorAll('#difficulty-bar .diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextDiff = btn.dataset.diff;
      if (nextDiff === state.difficulty) return;
      state.difficulty = nextDiff;
      document.querySelectorAll('#difficulty-bar .diff-btn').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.diff === nextDiff);
      });
      if (!state.infiniteMode) {
        const lists = { balance: BALANCE_LEVELS, chain: CHAIN_LEVELS, mystery: MYSTERY_LEVELS };
        const len = lists[state.mode].length;
        state.levelIdx[state.mode] =
          nextDiff === 'easy' ? 0 : nextDiff === 'medium' ? Math.floor(len / 2) : len - 1;
      }
      loadLevel();
    });
  });

  state.difficulty = 'easy';
  els.starCount.textContent = String(state.stars);
  loadLevel();
})();
