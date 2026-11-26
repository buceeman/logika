/**
 * Minta-Vonat — Sorozatfelismerés, Kakukktojás és Növekvő minták
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
    'Szuper! Ügyesen felismerted a mintát!',
    'Bravó! A Minta-Vonat már roboghat is tovább!',
    'Fantasztikus megfigyelés! Pont ez hiányzott!',
    'Igazi minta-mester vagy!',
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
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél a Minta-Vonattal!`);
    } else {
      playTone('success');
      speakHu(customMsg || pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Vizuális Tokenek (SVG & Emoji)
     ======================================================================== */
  const SHAPE_COLORS = [
    { id: 'red', name: 'piros', hex: '#D95338' },
    { id: 'blue', name: 'kék', hex: '#2D5F9A' },
    { id: 'green', name: 'zöld', hex: '#387D5A' },
    { id: 'gold', name: 'sárga', hex: '#D99226' },
  ];

  const SHAPE_TYPES = [
    { id: 'circle', name: 'kör' },
    { id: 'square', name: 'négyzet' },
    { id: 'triangle', name: 'háromszög' },
    { id: 'star', name: 'csillag' },
  ];

  function renderShapeSvg(shapeId, colorHex, size = 44) {
    if (shapeId === 'circle') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="${colorHex}" stroke="#2B1E16" stroke-width="2.5"/></svg>`;
    }
    if (shapeId === 'square') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="7" width="34" height="34" rx="6" fill="${colorHex}" stroke="#2B1E16" stroke-width="2.5"/></svg>`;
    }
    if (shapeId === 'triangle') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><polygon points="24,6 43,40 5,40" fill="${colorHex}" stroke="#2B1E16" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><polygon points="24,5 29.5,17 42.5,18.5 32.8,27.5 35.4,40.5 24,34 12.6,40.5 15.2,27.5 5.5,18.5 18.5,17" fill="${colorHex}" stroke="#2B1E16" stroke-width="2.3" stroke-linejoin="round"/></svg>`;
  }

  /* ========================================================================
     3. Feladat Generátorok (3 Játékmód × 3 Nehézség)
     ======================================================================== */
  const EMOJI_SETS = [
    ['🍎', '🍌', '🍇', '🍓'],
    ['🦋', '🐝', '🐞', '🐛'],
    ['🌸', '🌻', '🌷', '🍀'],
    ['🚗', '🚌', '🚲', '🚂'],
    ['🐶', '🐱', '🐰', '🦊'],
    ['☀️', '🌙', '⭐', '☁️'],
  ];

  function generatePatternPuzzle(diff) {
    if (diff === 'hard') {
      // Kéttulajdonságos minta: szín ABAB vagy ABC, forma ABC vagy ABAB
      const colors = shuffle(SHAPE_COLORS).slice(0, 3);
      const shapes = shuffle(SHAPE_TYPES).slice(0, 3);
      const colorRule = Math.random() < 0.5 ? [0, 1, 0, 1, 0, 1] : [0, 1, 2, 0, 1, 2];
      const shapeRule = colorRule.length === 6 && colorRule[2] === 0
        ? [0, 1, 2, 0, 1, 2]
        : [0, 1, 0, 1, 0, 1];

      const sequence = [];
      for (let i = 0; i < 6; i++) {
        const c = colors[colorRule[i]];
        const s = shapes[shapeRule[i]];
        sequence.push({
          key: `${s.id}_${c.id}`,
          html: renderShapeSvg(s.id, c.hex, 44),
          label: `${c.name} ${s.name}`,
          shape: s,
          color: c,
        });
      }

      const missingIdx = Math.random() < 0.5 ? 5 : 4;
      const answer = sequence[missingIdx];

      const distractors = [];
      const candidates = [
        { s: shapes[(shapeRule[missingIdx] + 1) % 3], c: answer.color },
        { s: answer.shape, c: colors[(colorRule[missingIdx] + 1) % 3] },
        { s: shapes[(shapeRule[missingIdx] + 2) % 3], c: colors[(colorRule[missingIdx] + 1) % 3] },
      ];
      for (const cand of candidates) {
        const k = `${cand.s.id}_${cand.c.id}`;
        if (k !== answer.key && !distractors.some((d) => d.key === k)) {
          distractors.push({
            key: k,
            html: renderShapeSvg(cand.s.id, cand.c.hex, 44),
            label: `${cand.c.name} ${cand.s.name}`,
          });
        }
      }

      return {
        mode: 'pattern',
        prompt: 'Figyeld a formát ÉS a színt is! Melyik vagon hiányzik?',
        sequence,
        missingIdx,
        answer,
        choices: shuffle([answer, ...distractors.slice(0, 3)]),
      };
    }

    const icons = shuffle(pickRandom(EMOJI_SETS));
    let indices;
    let missingIdx;

    if (diff === 'easy') {
      const templates = [
        [0, 1, 0, 1, 0, 1],
        [0, 0, 1, 0, 0, 1],
        [0, 1, 1, 0, 1, 1],
      ];
      indices = pickRandom(templates);
      missingIdx = 5;
    } else {
      const templates = [
        [0, 1, 2, 0, 1, 2],
        [0, 0, 1, 1, 0, 0],
        [0, 1, 2, 1, 0, 1],
      ];
      indices = pickRandom(templates);
      missingIdx = Math.random() < 0.5 ? 5 : 3;
    }

    const sequence = indices.map((idx) => ({
      key: icons[idx],
      html: `<span>${icons[idx]}</span>`,
      label: icons[idx],
    }));

    const answer = sequence[missingIdx];
    const pool = icons.filter((ic) => ic !== answer.key);
    const numDistractors = diff === 'easy' ? 2 : 3;
    const distractors = pool.slice(0, numDistractors).map((ic) => ({
      key: ic,
      html: `<span>${ic}</span>`,
      label: ic,
    }));

    return {
      mode: 'pattern',
      prompt: missingIdx === 5
        ? 'Melyik vagon jön a vonat végére?'
        : 'Melyik vagon hiányzik a kérdőjel helyéről?',
      sequence,
      missingIdx,
      answer,
      choices: shuffle([answer, ...distractors]),
    };
  }

  const ODD_BANKS = {
    easy: [
      {
        items: ['🍎', '🍌', '🍇', '🚗'],
        odd: '🚗',
        reason: 'A kisautó kakukktojás, mert a többi mind gyümölcs!',
      },
      {
        items: ['🐶', '🐱', '🐰', '🌻'],
        odd: '🌻',
        reason: 'A napraforgó kakukktojás, mert a többi mind állat!',
      },
      {
        items: ['🚗', '🚌', '🚂', '🍓'],
        odd: '🍓',
        reason: 'Az eper kakukktojás, mert a többi mind jármű!',
      },
      {
        items: ['👕', '👖', '🧢', '🍕'],
        odd: '🍕',
        reason: 'A pizza kakukktojás, mert a többi mind ruha!',
      },
      {
        items: ['🐟', '🐙', '🐳', '🦅'],
        odd: '🦅',
        reason: 'A sas kakukktojás, mert a többi a vízben él!',
      },
      {
        items: ['✏️', '📚', '✂️', '🍦'],
        odd: '🍦',
        reason: 'A fagyi kakukktojás, mert a többi iskolai eszköz!',
      },
    ],
  };

  function generateOddPuzzle(diff) {
    if (diff === 'easy') {
      const bank = pickRandom(ODD_BANKS.easy);
      const cards = shuffle(bank.items).map((ic) => ({
        key: ic,
        html: `<span>${ic}</span>`,
        isOdd: ic === bank.odd,
      }));
      return {
        mode: 'odd',
        prompt: 'Melyik a kakukktojás? Koppints rá!',
        cards,
        reason: bank.reason,
      };
    }

    if (diff === 'medium') {
      // 3 azonos forma különböző színekben + 1 más forma
      const shapes = shuffle(SHAPE_TYPES);
      const mainShape = shapes[0];
      const oddShape = shapes[1];
      const colors = shuffle(SHAPE_COLORS);

      const cards = [
        { key: '1', html: renderShapeSvg(mainShape.id, colors[0].hex, 52), isOdd: false },
        { key: '2', html: renderShapeSvg(mainShape.id, colors[1].hex, 52), isOdd: false },
        { key: '3', html: renderShapeSvg(mainShape.id, colors[2].hex, 52), isOdd: false },
        { key: '4', html: renderShapeSvg(oddShape.id, colors[3].hex, 52), isOdd: true },
      ];

      return {
        mode: 'odd',
        prompt: 'Melyik forma a kakukktojás?',
        cards: shuffle(cards),
        reason: `A ${oddShape.name} a kakukktojás, mert a többi mind ${mainShape.name}!`,
      };
    }

    // Hard: 5 kártya, vagy darabszám alapú (pl. 4 kártyán 3 pötty van, 1-en 2 pötty), vagy minden szín ugyanaz kivéve egyet
    const useCountRule = Math.random() < 0.5;
    if (useCountRule) {
      const targetCount = pickRandom([2, 3]);
      const oddCount = targetCount === 2 ? 3 : 2;
      const icons = shuffle(['⭐', '🔴', '🍀', '💎', '🦋']);
      const cards = [0, 1, 2, 3].map((i) => ({
        key: `c${i}`,
        html: `<span style="font-size:1.5rem;letter-spacing:2px;">${icons[i].repeat(targetCount)}</span>`,
        isOdd: false,
      }));
      cards.push({
        key: 'odd',
        html: `<span style="font-size:1.5rem;letter-spacing:2px;">${icons[4].repeat(oddCount)}</span>`,
        isOdd: true,
      });
      return {
        mode: 'odd',
        prompt: 'Figyeld a darabszámot! Melyik a kakukktojás?',
        cards: shuffle(cards),
        reason: `Ez a kakukktojás, mert ezen ${oddCount} darab van, a többin pedig ${targetCount}!`,
      };
    }

    const colors = shuffle(SHAPE_COLORS);
    const mainColor = colors[0];
    const oddColor = colors[1];
    const shapes = shuffle(SHAPE_TYPES);
    const cards = [0, 1, 2, 3].map((i) => ({
      key: `s${i}`,
      html: renderShapeSvg(shapes[i % shapes.length].id, mainColor.hex, 48),
      isOdd: false,
    }));
    cards.push({
      key: 'odd',
      html: renderShapeSvg(shapes[0].id, oddColor.hex, 48),
      isOdd: true,
    });

    return {
      mode: 'odd',
      prompt: 'Melyik az egyetlen kakukktojás az 5 közül?',
      cards: shuffle(cards),
      reason: `A ${oddColor.name} alakzat a kakukktojás, mert a többi mind ${mainColor.name}!`,
    };
  }

  function generateGrowingPuzzle(diff) {
    let counts;
    let missingIdx;
    let prompt;

    if (diff === 'easy') {
      const start = pickRandom([1, 2]);
      counts = [start, start + 1, start + 2, start + 3];
      missingIdx = 3;
      prompt = 'Hány kocka magas lesz a következő torony?';
    } else if (diff === 'medium') {
      const variants = [
        { seq: [5, 4, 3, 2], miss: 3, text: 'A torony csökken! Melyik torony következik?' },
        { seq: [1, 3, 5, 7], miss: 3, text: 'Mindig kettővel nő a torony! Melyik jön?' },
        { seq: [2, 4, 6, 8], miss: 2, text: 'Melyik torony hiányzik a sorból?' },
      ];
      const v = pickRandom(variants);
      counts = v.seq;
      missingIdx = v.miss;
      prompt = v.text;
    } else {
      const variants = [
        { seq: [1, 2, 4, 7], miss: 3, text: 'Egyre nagyobbakat ugrik a torony (+1, +2, +3)! Mi jön?' },
        { seq: [8, 6, 4, 2], miss: 2, text: 'Kettővel csökken minden lépésben! Mi hiányzik?' },
        { seq: [1, 2, 1, 3, 1], miss: 3, text: 'Figyeld a magasabb tornyokat! Melyik hiányzik?' },
      ];
      const v = pickRandom(variants);
      counts = v.seq;
      missingIdx = v.miss;
      prompt = v.text;
    }

    const answerCount = counts[missingIdx];
    const color = pickRandom(SHAPE_COLORS);
    const altColor = SHAPE_COLORS.find((c) => c.id !== color.id);

    const candidateCounts = new Set([answerCount]);
    const offsets = [-2, -1, 1, 2, 3];
    for (const off of shuffle(offsets)) {
      if (candidateCounts.size >= (diff === 'easy' ? 3 : 4)) break;
      const val = answerCount + off;
      if (val >= 1 && val <= 9) candidateCounts.add(val);
    }

    return {
      mode: 'growing',
      prompt,
      counts,
      missingIdx,
      answerCount,
      blockColor: color.hex,
      altColor: altColor.hex,
      choices: shuffle(Array.from(candidateCounts)),
    };
  }

  /* ========================================================================
     4. Állapot & DOM Kezelés
     ======================================================================== */
  const STAR_KEY = 'minta_stars';

  const state = {
    mode: 'pattern',
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
     5. Renderelők
     ======================================================================== */
  function renderPatternStage(puzzle) {
    const carsHtml = puzzle.sequence.map((item, idx) => {
      const coupler = '<div class="train-coupler" aria-hidden="true"></div>';
      if (idx === puzzle.missingIdx) {
        return `${coupler}<div class="train-car is-missing" id="missing-car">?</div>`;
      }
      return `${coupler}<div class="train-car">${item.html}</div>`;
    }).join('');

    const choicesHtml = puzzle.choices.map((c, idx) => `
      <button type="button" class="choice-card" data-choice-idx="${idx}" aria-label="${c.label}">
        ${c.html}
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="train-track-wrap">
        <div class="train-row">
          <div class="train-engine" aria-hidden="true">🚂</div>
          ${carsHtml}
        </div>
      </div>
      <div style="margin-top:1.1rem;">
        <p class="choices-label">👇 Válaszd ki a hiányzó vagont:</p>
        <div class="choices-grid" id="choices-grid">${choicesHtml}</div>
      </div>
    `;

    const grid = document.getElementById('choices-grid');
    grid.querySelectorAll('.choice-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const choice = puzzle.choices[Number(btn.dataset.choiceIdx)];
        if (choice.key === puzzle.answer.key) {
          state.solved = true;
          btn.classList.add('is-correct');
          const slot = document.getElementById('missing-car');
          slot.classList.remove('is-missing');
          slot.classList.add('is-filled');
          slot.innerHTML = choice.html;
          grid.querySelectorAll('.choice-card').forEach((b) => { b.disabled = true; });
          addStar();
          setFeedback('Ügyes! Pontosan ez illett a vonatba! ⭐', 'success');
          speakSuccess();
          renderNextButton();
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          playTone('error');
          setFeedback('Nem egészen ez a minta! Nézd meg újra a vagonok sorrendjét!', 'error');
          speakHu('Nem egészen! Nézd meg újra a vagonok sorrendjét!');
        }
      });
    });
  }

  function renderOddStage(puzzle) {
    const cardsHtml = puzzle.cards.map((card, idx) => `
      <button type="button" class="odd-card" data-card-idx="${idx}">
        ${card.html}
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="odd-grid" id="odd-grid">${cardsHtml}</div>
    `;

    const grid = document.getElementById('odd-grid');
    grid.querySelectorAll('.odd-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const card = puzzle.cards[Number(btn.dataset.cardIdx)];
        if (card.isOdd) {
          state.solved = true;
          btn.classList.add('is-correct');
          grid.querySelectorAll('.odd-card').forEach((b) => { b.disabled = true; });
          addStar();
          setFeedback(`${puzzle.reason} ⭐`, 'success');
          speakSuccess(puzzle.reason);
          renderNextButton();
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          playTone('error');
          setFeedback('Ez még illik a többiekhez! Keresd azt, amelyik kilóg a sorból!', 'error');
          speakHu('Ez illik a többiekhez. Keresd a kakukktojást!');
        }
      });
    });
  }

  function buildTowerBlocksHtml(count, baseColor, altColor) {
    let blocks = '';
    for (let i = 0; i < count; i++) {
      const col = (i === count - 1 && count > 1) ? altColor : baseColor;
      blocks += `<div class="tower-block" style="background:${col};"></div>`;
    }
    return blocks;
  }

  function renderGrowingStage(puzzle) {
    const towersHtml = puzzle.counts.map((cnt, idx) => {
      if (idx === puzzle.missingIdx) {
        return `
          <div class="tower-slot is-missing" id="missing-tower">
            <div class="tower-stack" id="missing-tower-stack">?</div>
            <span class="tower-count-label" id="missing-tower-label">?</span>
          </div>
        `;
      }
      return `
        <div class="tower-slot">
          <div class="tower-stack">${buildTowerBlocksHtml(cnt, puzzle.blockColor, puzzle.altColor)}</div>
          <span class="tower-count-label">${cnt}</span>
        </div>
      `;
    }).join('');

    const choicesHtml = puzzle.choices.map((cnt) => `
      <button type="button" class="choice-card" data-count="${cnt}" aria-label="${cnt} kockás torony">
        <div class="tower-choice-stack">${buildTowerBlocksHtml(cnt, puzzle.blockColor, puzzle.altColor)}</div>
        <span style="font-family:var(--font-display);font-size:1rem;font-weight:800;color:var(--ink-primary);">${cnt}</span>
      </button>
    `).join('');

    els.stage.innerHTML = `
      <div class="towers-stage">${towersHtml}</div>
      <div style="margin-top:1.1rem;">
        <p class="choices-label">👇 Válaszd ki a hiányzó tornyot:</p>
        <div class="choices-grid" id="tower-choices-grid">${choicesHtml}</div>
      </div>
    `;

    const grid = document.getElementById('tower-choices-grid');
    grid.querySelectorAll('.choice-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.solved) return;
        const chosen = Number(btn.dataset.count);
        if (chosen === puzzle.answerCount) {
          state.solved = true;
          btn.classList.add('is-correct');
          const slot = document.getElementById('missing-tower');
          slot.classList.remove('is-missing');
          slot.classList.add('is-filled');
          document.getElementById('missing-tower-stack').innerHTML =
            buildTowerBlocksHtml(chosen, puzzle.blockColor, puzzle.altColor);
          document.getElementById('missing-tower-label').textContent = String(chosen);
          grid.querySelectorAll('.choice-card').forEach((b) => { b.disabled = true; });
          addStar();
          setFeedback(`Szuper! A ${chosen} kockás torony hiányzott! ⭐`, 'success');
          speakSuccess(`Ügyes vagy! A ${chosen} kockás torony illett a sorba!`);
          renderNextButton();
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          playTone('error');
          setFeedback('Számold meg még egyszer a tornyok magasságát!', 'error');
          speakHu('Számold meg még egyszer, hány kocka van a tornyokban!');
        }
      });
    });
  }

  /* ========================================================================
     6. Játékciklus & Eseménykezelők
     ======================================================================== */
  function loadNewPuzzle() {
    state.solved = false;
    els.actionButtons.innerHTML = '';
    els.levelBadge.textContent = `${state.level}. feladat`;

    if (state.mode === 'pattern') {
      state.puzzle = generatePatternPuzzle(state.difficulty);
      renderPatternStage(state.puzzle);
      setFeedback('Figyeld meg a vagonokat, és válaszd ki a hiányzót!');
    } else if (state.mode === 'odd') {
      state.puzzle = generateOddPuzzle(state.difficulty);
      renderOddStage(state.puzzle);
      setFeedback('Koppints arra az egyre, amelyik nem illik a többiekhez!');
    } else {
      state.puzzle = generateGrowingPuzzle(state.difficulty);
      renderGrowingStage(state.puzzle);
      setFeedback('Számold meg a kockákat, és válaszd ki a hiányzó tornyot!');
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
