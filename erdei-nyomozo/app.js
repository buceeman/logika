/**
 * Erdei Nyomozó — Kizárásos logika, igazmondó-füllentő következtetés és ülésrend
 * 1. osztályos magyar kisiskolásoknak
 */

(() => {
  'use strict';

  const ANIMALS = [
    { id: 'fox', name: 'Róka', emoji: '🦊' },
    { id: 'bear', name: 'Maci', emoji: '🐻' },
    { id: 'bunny', name: 'Nyuszi', emoji: '🐰' },
    { id: 'owl', name: 'Bagoly', emoji: '🦉' },
    { id: 'hedgehog', name: 'Süni', emoji: '🦔' },
  ];

  const GEAR = [
    { id: 'hat', emoji: '🎩', label: 'kalapot' },
    { id: 'scarf', emoji: '🧣', label: 'sálat' },
    { id: 'glasses', emoji: '👓', label: 'szemüveget' },
    { id: 'bag', emoji: '🎒', label: 'hátizsákot' },
  ];

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
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(590, now + 0.06);
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
    'Zseniális nyomozás! Pontosan kizártad az ártatlanokat!',
    'Bravó, főnyomozó! Minden nyomot ügyesen összeraktál!',
    'Szuper következtetés! Megtaláltad a méztolvajt!',
    'Fantasztikus! Egyetlen apró részlet sem kerülte el a figyelmed!',
  ];

  const MOTIVATIONAL_RETRY = [
    'Olvasd vagy hallgasd meg újra a nyomokat, valaki még gyanús!',
    'Majdnem megvan! Nézd meg, kire illik minden egyes nyom!',
    'Semmi gond, egy igazi nyomozó többször is ellenőrzi a nyomokat!',
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

  function speakMotivationalSuccess() {
    if (state.stars > 0 && state.stars % 5 === 0) {
      playTone('fanfare');
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél erdei nyomozóként!`);
    } else {
      playTone('success');
      speakHu(pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Ügyek Generálása (Matematikailag egyértelmű megoldással!)
     ======================================================================== */
  function generateElimCase() {
    const count = state.difficulty === 'easy' ? 3 : state.difficulty === 'medium' ? 4 : 5;
    const suspects = shuffle(ANIMALS).slice(0, count).map((a) => ({
      ...a,
      gear: [],
      clueText: '',
      clueIcons: '',
      eliminated: false,
    }));

    // Adjunk mindenkinek 2 kiegészítőt
    suspects.forEach((s) => {
      const g = shuffle(GEAR).slice(0, 2);
      s.gear = g.map((x) => x.id);
    });

    const culpritIdx = Math.floor(Math.random() * count);
    const culprit = suspects[culpritIdx];

    // Állítsunk elő egyértelmű nyomokat:
    // 1) A tettesnél legyen egy kiegészítő-nyom, ami szűkíti a kört
    // 2) Az ártatlanok egy része mondja meg, hogy ő nem volt, vagy mi nincs a tettesen
    const targetGear = GEAR.find((g) => g.id === culprit.gear[0]);
    const notGear = GEAR.find((g) => !culprit.gear.includes(g.id));

    suspects.forEach((s, idx) => {
      if (idx === culpritIdx) {
        s.clueText = 'Én egész nap aludtam a fán!';
        s.clueIcons = '😴';
      } else if (idx === (culpritIdx + 1) % count) {
        s.clueText = `A tettes ${targetGear.label} visel!`;
        s.clueIcons = `🕵️ ➡️ ${targetGear.emoji}`;
      } else if (idx === (culpritIdx + 2) % count && notGear) {
        s.clueText = `A tettesen NINCS ${notGear.label.replace('ot', '').replace('et', '').replace('at', '')}!`;
        s.clueIcons = `🚫 ${notGear.emoji}`;
      } else {
        s.clueText = `Én biztosan nem voltam!`;
        s.clueIcons = `🙅 ${s.emoji}`;
      }
    });

    // Ellenőrizzük, hányan felelnek meg az összes igaz nyomnak (kivéve a tettes saját alibijét?
    // A Nyomkereső módban mindenki igazat mond a külső nyomokról, a tettes csak nem vallja be!)
    // Garantáljuk, hogy pontosan 1 gyanúsított feleljen meg a kiegészítő + ártatlan-kizárás nyomoknak:
    suspects.forEach((s, idx) => {
      if (idx !== culpritIdx) {
        // Biztosítsuk, hogy minden ártatlanról kiderüljön, hogy ártatlan:
        // ha valamelyik ártatlan nem mondta, hogy "Én nem voltam", és megegyezne a kiegészítője, adjunk neki kizáró nyomot
        const matchesPos = s.gear.includes(targetGear.id);
        const matchesNeg = notGear ? !s.gear.includes(notGear.id) : true;
        if (matchesPos && matchesNeg) {
          s.clueText = 'Én biztosan ártatlan vagyok!';
          s.clueIcons = `✅ ${s.emoji} ártatlan`;
        }
      }
    });

    return {
      suspects,
      culpritId: culprit.id,
      speech: 'Valaki megette a mézet! Hallgasd meg az állatok nyomait, zárd ki az ártatlanokat, és mutass rá a tettesre!',
    };
  }

  function generateLiarCase() {
    // Füllentő Szarka mód: Pontosan EGY állat füllent (ő a bűnös), a többiek igazat mondanak!
    const count = state.difficulty === 'easy' ? 3 : state.difficulty === 'medium' ? 4 : 5;
    const suspects = shuffle(ANIMALS).slice(0, count).map((a) => ({
      ...a,
      gear: [],
      clueText: '',
      clueIcons: '',
      eliminated: false,
    }));

    const culpritIdx = Math.floor(Math.random() * count);
    const culprit = suspects[culpritIdx];
    const innocentOther = suspects[(culpritIdx + 1) % count];

    suspects.forEach((s, idx) => {
      if (idx === culpritIdx) {
        // A bűnös füllent: ártatlanra mutat!
        s.clueText = `Szerintem ${innocentOther.name} vette el!`;
        s.clueIcons = `👉 ${innocentOther.emoji}`;
      } else if (idx === (culpritIdx + 1) % count) {
        // Az ártatlan, akire mutattak, igazat mond:
        s.clueText = 'Én biztosan nem vettem el!';
        s.clueIcons = `🚫 ${s.emoji}`;
      } else {
        // A többiek igazat mondanak: pl. vagy a tettesre mutatnak, vagy megerősítik, hogy a gyanúsított ártatlan
        if (idx === (culpritIdx + 2) % count) {
          s.clueText = `${culprit.name} gyanúsan mézes mancsú!`;
          s.clueIcons = `🍯 👉 ${culprit.emoji}`;
        } else {
          s.clueText = `${innocentOther.name} igazat mond!`;
          s.clueIcons = `✅ ${innocentOther.emoji}`;
        }
      }
    });

    return {
      suspects,
      culpritId: culprit.id,
      speech: 'Csak a bűnös füllent, mindenki más igazat mond! Ki mond ellent a többieknek?',
    };
  }

  function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    const res = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const p of getPermutations(rest)) {
        res.push([arr[i], ...p]);
      }
    }
    return res;
  }

  function generateSeatingCase() {
    const count = state.difficulty === 'easy' ? 3 : 4;
    const pool = shuffle(ANIMALS).slice(0, count);
    const solution = shuffle(pool); // index 0..count-1

    // Készítsünk természetes nyelvi nyomokat, és ellenőrizzük, hogy egyértelmű-e a megoldás!
    const allPerms = getPermutations(pool);

    const candidateClues = [];
    // 1. Fix pozíció nyom
    const posIdx = Math.floor(Math.random() * count);
    candidateClues.push({
      text: `${solution[posIdx].emoji} ${solution[posIdx].name} a(z) ${posIdx + 1}. tuskón ül.`,
      test: (perm) => perm[posIdx].id === solution[posIdx].id,
    });

    // 2. Balra/jobbra szomszéd nyomok
    for (let i = 0; i < count - 1; i++) {
      const a = solution[i];
      const b = solution[i + 1];
      candidateClues.push({
        text: `${a.emoji} ${a.name} közvetlenül ${b.emoji} ${b.name} előtt ül.`,
        test: (perm) => {
          const ia = perm.findIndex((x) => x.id === a.id);
          return ia >= 0 && ia + 1 < perm.length && perm[ia + 1].id === b.id;
        },
      });
    }

    // 3. Negatív pozíció nyom
    const notLast = solution[0];
    candidateClues.push({
      text: `${notLast.emoji} ${notLast.name} NEM az utolsó tuskón ül.`,
      test: (perm) => perm[count - 1].id !== notLast.id,
    });

    const selectedClues = [candidateClues[0]];
    for (const cl of candidateClues.slice(1)) {
      const validCount = allPerms.filter((p) => selectedClues.every((sc) => sc.test(p))).length;
      if (validCount === 1) break;
      selectedClues.push(cl);
    }

    // Ha még mindig több megoldás van, tegyük fixre a maradékot
    for (let i = 0; i < count; i++) {
      const validCount = allPerms.filter((p) => selectedClues.every((sc) => sc.test(p))).length;
      if (validCount === 1) break;
      selectedClues.push({
        text: `${solution[i].emoji} ${solution[i].name} a(z) ${i + 1}. tuskón ül.`,
        test: (perm) => perm[i].id === solution[i].id,
      });
    }

    return {
      pool: shuffle(pool),
      solution,
      clues: selectedClues.map((c) => c.text),
      seats: Array(count).fill(null),
      speech: 'Ültesd le az állatokat a tuskókra a nyomok alapján!',
    };
  }

  /* ========================================================================
     3. Játékállapot & DOM
     ======================================================================== */
  const state = {
    mode: 'elim', // 'elim' | 'liar' | 'seating'
    difficulty: 'easy', // 'easy' | 'medium' | 'hard'
    roundNum: 1,
    infiniteMode: false,
    stars: Number(localStorage.getItem('nyomozo_stars') || 0),
    currentCase: null,
    selectedAnimalId: null, // Seating módban
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
    localStorage.setItem('nyomozo_stars', String(state.stars));
    els.starCount.textContent = String(state.stars);
  }

  function setFeedback(text, kind = 'neutral') {
    els.feedbackText.textContent = text;
    els.feedbackBanner.className = 'feedback-banner';
    if (kind === 'success') els.feedbackBanner.classList.add('is-success');
    if (kind === 'warn') els.feedbackBanner.classList.add('is-warn');
  }

  /* ========================================================================
     4. Renderelés
     ======================================================================== */
  function loadCase() {
    state.levelCompleted = false;
    state.selectedAnimalId = null;

    if (state.mode === 'elim') state.currentCase = generateElimCase();
    else if (state.mode === 'liar') state.currentCase = generateLiarCase();
    else state.currentCase = generateSeatingCase();

    const prefix = state.infiniteMode ? '∞ ' : '';
    if (state.mode === 'elim') {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. ügy — Nyomkereső`;
      els.promptInstruction.textContent = 'Ki ette meg a mézet? Zárd ki az ártatlanokat, majd mutass a tettesre!';
    } else if (state.mode === 'liar') {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. ügy — Füllentő Szarka`;
      els.promptInstruction.textContent = 'Csak a bűnös füllent, mindenki más igazat mond! Ki a tettes?';
    } else {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. ügy — Erdei Ülésrend`;
      els.promptInstruction.textContent = 'Ültesd le az állatokat a megfelelő tuskókra a nyomok alapján!';
    }

    renderStage();
    renderActionButtons();
    setFeedback(
      state.mode === 'seating'
        ? 'Koppints egy állatra, majd a tuskóra, ahová ültetni szeretnéd!'
        : 'Koppints a 🔊 gombra a nyomok meghallgatásához, majd válaszd ki a tettest!'
    );
    speakHu(state.currentCase.speech);
  }

  function renderStage() {
    const c = state.currentCase;

    if (state.mode === 'seating') {
      const cluesHTML = c.clues
        .map((txt) => `<div class="stump-clue-pill">🔎 ${txt}</div>`)
        .join('');

      const stumpsHTML = c.seats
        .map((animal, idx) => {
          const content = animal
            ? `<span style="font-size:2.2rem;">${animal.emoji}</span><strong>${animal.name}</strong>`
            : `<span style="font-size:1.5rem; opacity:0.5;">🪵</span><span style="font-size:0.84rem; color:var(--ink-muted);">Üres</span>`;
          return `
            <button type="button" class="stump-slot ${state.selectedAnimalId ? 'is-ready' : ''}" data-seat-idx="${idx}">
              <span style="font-size:0.78rem; font-weight:800; color:var(--ink-muted);">${idx + 1}. tuskó</span>
              ${content}
            </button>
          `;
        })
        .join('');

      const seatedIds = new Set(c.seats.filter(Boolean).map((a) => a.id));
      const trayHTML = c.pool
        .filter((a) => !seatedIds.has(a.id))
        .map(
          (a) => `
          <button type="button" class="animal-chip-btn ${state.selectedAnimalId === a.id ? 'is-selected' : ''}" data-animal-id="${a.id}">
            <span>${a.emoji}</span>
            <span>${a.name}</span>
          </button>
        `
        )
        .join('');

      els.gameStage.innerHTML = `
        <div class="clues-panel">${cluesHTML}</div>
        <div class="stumps-row">${stumpsHTML}</div>
        <div class="animal-tray">${trayHTML || '<span style="color:var(--ink-muted); font-weight:700;">Minden állat leült! Nyomd meg az Ellenőrzést!</span>'}</div>
      `;

      document.querySelectorAll('.animal-chip-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (state.levelCompleted) return;
          const id = btn.dataset.animalId;
          state.selectedAnimalId = state.selectedAnimalId === id ? null : id;
          playTone('tap');
          renderStage();
        });
      });

      document.querySelectorAll('.stump-slot').forEach((slot) => {
        slot.addEventListener('click', () => {
          if (state.levelCompleted) return;
          const idx = Number(slot.dataset.seatIdx);
          if (state.selectedAnimalId) {
            const animal = c.pool.find((a) => a.id === state.selectedAnimalId);
            c.seats[idx] = animal;
            state.selectedAnimalId = null;
            playTone('tap');
            renderStage();
          } else if (c.seats[idx]) {
            c.seats[idx] = null;
            playTone('tap');
            renderStage();
          }
        });
      });
      return;
    }

    // Elim & Liar Lineup
    const cardsHTML = c.suspects
      .map((s) => {
        const gearHTML =
          state.mode === 'elim'
            ? `<span class="suspect-gear">${s.gear.map((gid) => GEAR.find((g) => g.id === gid).emoji).join(' ')}</span>`
            : '';
        const cls = ['suspect-card'];
        if (s.eliminated) cls.push('is-eliminated');
        if (state.levelCompleted && s.id === c.culpritId) cls.push('is-culprit');

        return `
          <div class="${cls.join(' ')}" data-suspect-id="${s.id}">
            <div class="suspect-top">
              <span class="suspect-emoji">${s.emoji}</span>
              ${gearHTML}
            </div>
            <p class="suspect-name">${s.name}</p>
            <div class="clue-bubble">
              <span style="font-size:1.15rem;">${s.clueIcons}</span>
              <span>„${s.clueText}”</span>
              <button type="button" class="clue-speak-btn" data-speak="${s.name} azt mondja: ${s.clueText}">🔊 Hallgasd</button>
            </div>
            <div class="suspect-actions">
              <button type="button" class="mini-btn btn-elim" data-id="${s.id}">
                ${s.eliminated ? '↩️ Mégis' : '❌ Kizár'}
              </button>
              <button type="button" class="mini-btn is-accuse btn-accuse" data-id="${s.id}">
                👉 Ő volt!
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    els.gameStage.innerHTML = `<div class="suspects-grid">${cardsHTML}</div>`;

    document.querySelectorAll('.clue-speak-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        speakHu(btn.dataset.speak);
      });
    });

    document.querySelectorAll('.btn-elim').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.levelCompleted) return;
        const s = c.suspects.find((x) => x.id === btn.dataset.id);
        s.eliminated = !s.eliminated;
        playTone('tap');
        renderStage();
      });
    });

    document.querySelectorAll('.btn-accuse').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.levelCompleted) return;
        accuseSuspect(btn.dataset.id);
      });
    });
  }

  function renderActionButtons() {
    if (state.levelCompleted) {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-success" id="btn-next-case">
          Következő ügy →
        </button>
      `;
      document.getElementById('btn-next-case').addEventListener('click', () => {
        state.roundNum++;
        loadCase();
      });
      return;
    }

    if (state.mode === 'seating') {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-secondary" id="btn-reset-seats">🔄 Újra</button>
        <button type="button" class="btn btn-primary" id="btn-check-seats">🪵 Ellenőrzés!</button>
      `;
      document.getElementById('btn-reset-seats').addEventListener('click', () => {
        state.currentCase.seats.fill(null);
        state.selectedAnimalId = null;
        renderStage();
      });
      document.getElementById('btn-check-seats').addEventListener('click', checkSeating);
    } else {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-secondary" id="btn-new-case">🎲 Új ügy</button>
      `;
      document.getElementById('btn-new-case').addEventListener('click', loadCase);
    }
  }

  /* ========================================================================
     5. Ellenőrzés
     ======================================================================== */
  function accuseSuspect(id) {
    const c = state.currentCase;
    if (id === c.culpritId) {
      addStars(1);
      state.levelCompleted = true;
      setFeedback('Megvan a tettes! Ügyesen kizártad a többieket!', 'success');
      speakMotivationalSuccess();
      renderStage();
      renderActionButtons();
    } else {
      playTone('error');
      const card = document.querySelector(`.suspect-card[data-suspect-id="${id}"]`);
      if (card) card.classList.add('is-wrong');
      setFeedback('Ő ártatlan! Zárd ki nyugodtan, és nézd meg újra a nyomokat!', 'warn');
      speakHu(pickRandom(MOTIVATIONAL_RETRY));
    }
  }

  function checkSeating() {
    const c = state.currentCase;
    if (c.seats.some((s) => s === null)) {
      setFeedback('Még maradt üres tuskó! Ültess le minden állatot!', 'warn');
      speakHu('Még maradt üres tuskó! Ültess le mindenkit!');
      return;
    }

    const ok = c.seats.every((s, idx) => s.id === c.solution[idx].id);
    if (ok) {
      addStars(1);
      state.levelCompleted = true;
      setFeedback('Tökéletes ülésrend! Mindenki a pontos helyére ült!', 'success');
      speakMotivationalSuccess();
      renderActionButtons();
    } else {
      playTone('error');
      setFeedback('Valaki rossz tuskóra ült! Olvasd el újra a fenti nyomokat!', 'warn');
      speakHu(pickRandom(MOTIVATIONAL_RETRY));
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
      loadCase();
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
      loadCase();
    });
  });

  els.btnInfiniteMode.addEventListener('click', () => {
    state.infiniteMode = !state.infiniteMode;
    els.btnInfiniteMode.classList.toggle('is-active', state.infiniteMode);
    els.btnInfiniteMode.setAttribute('aria-pressed', String(state.infiniteMode));
    loadCase();
  });

  els.btnReplayVoice.addEventListener('click', () => {
    speakHu(state.currentCase.speech);
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
  loadCase();
})();
