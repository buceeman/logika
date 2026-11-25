/**
 * Kovács Műhelye — Dienes-alapú logikafejlesztő játék 1. osztályosoknak
 * Támogatja az egér-, érintő- és tollvezérelt húzást (Pointer Events),
 * valamint a koppintásos (tap-to-select -> tap-to-place) irányítást.
 */

(() => {
  'use strict';

  /* ========================================================================
     1. Dienes Készlet Definíciók & SVG Generátor
     ======================================================================== */
  const COLORS = {
    red: { label: 'Piros', hex: '#D94336', stroke: '#A5281E' },
    blue: { label: 'Kék', hex: '#2B6CB0', stroke: '#1D4B7D' },
    yellow: { label: 'Sárga', hex: '#E8A825', stroke: '#B47C0E' },
  };

  const SHAPES = {
    circle: { label: 'Kör' },
    square: { label: 'Négyzet' },
    triangle: { label: 'Háromszög' },
    hexagon: { label: 'Hatszög' },
  };

  const SIZES = {
    big: { label: 'Nagy', scale: 1 },
    small: { label: 'Kicsi', scale: 0.62 },
  };

  const FILLS = {
    solid: { label: 'Teli' },
    hollow: { label: 'Lyukas' },
  };

  function createTokenSVG(token, sizePx = 54) {
    const c = COLORS[token.color];
    const isHollow = token.fill === 'hollow';
    const scale = SIZES[token.size].scale;
    const fillAttr = isHollow ? 'none' : c.hex;
    const strokeAttr = isHollow ? c.hex : c.stroke;
    const strokeWidth = isHollow ? 8 : 3.5;

    let shapeEl = '';
    if (token.shape === 'circle') {
      shapeEl = `<circle cx="50" cy="50" r="36" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeWidth}" />`;
    } else if (token.shape === 'square') {
      shapeEl = `<rect x="16" y="16" width="68" height="68" rx="10" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeWidth}" />`;
    } else if (token.shape === 'triangle') {
      shapeEl = `<polygon points="50,12 88,82 12,82" stroke-linejoin="round" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeWidth}" />`;
    } else if (token.shape === 'hexagon') {
      shapeEl = `<polygon points="50,10 85,30 85,70 50,90 15,70 15,30" stroke-linejoin="round" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeWidth}" />`;
    }

    return `
      <svg width="${sizePx}" height="${sizePx}" viewBox="0 0 100 100" aria-hidden="true">
        <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
          ${shapeEl}
        </g>
      </svg>
    `;
  }

  function describeTokenHu(t) {
    return `${SIZES[t.size].label} ${FILLS[t.fill].label.toLowerCase()} ${COLORS[t.color].label.toLowerCase()} ${SHAPES[t.shape].label.toLowerCase()}`;
  }

  function renderRuleChipHTML(cond) {
    let icon = '';
    let text = '';

    if (cond.key === 'color') {
      const c = COLORS[cond.val];
      icon = `<span class="swatch-dot" style="background:${c.hex}"></span>`;
      text = c.label;
    } else if (cond.key === 'shape') {
      icon = createTokenSVG({ color: 'blue', shape: cond.val, size: 'big', fill: 'solid' }, 22);
      text = SHAPES[cond.val].label;
    } else if (cond.key === 'size') {
      icon = cond.val === 'big' ? '🐘' : '🐭';
      text = SIZES[cond.val].label;
    } else if (cond.key === 'fill') {
      icon = createTokenSVG({ color: 'red', shape: 'circle', size: 'big', fill: cond.val }, 22);
      text = FILLS[cond.val].label;
    }

    if (cond.negate) {
      return `
        <span class="rule-chip is-negated">
          <span class="negate-badge">NEM</span>
          ${icon}
          <span>${text}</span>
        </span>
      `;
    }
    return `
      <span class="rule-chip">
        ${icon}
        <span>${text}</span>
      </span>
    `;
  }

  function matchesCondition(token, cond) {
    const eq = token[cond.key] === cond.val;
    return cond.negate ? !eq : eq;
  }

  function matchesRule(token, conditions) {
    return conditions.every((c) => matchesCondition(token, c));
  }

  /* ========================================================================
     2. Hang & Magyar Beszéd (Web Audio + Web Speech API)
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
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.start(now);
        osc.stop(now + 0.12);
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
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(160, now + 0.18);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.24);
      }
    } catch (_) {
      // Hang figyelmen kívül hagyása, ha blokkolt
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
      // Fallback némán
    }
  }

  const MOTIVATIONAL_SUCCESS = [
    'Szuper stratégia! Így gondolkodik egy igazi mesterkovács!',
    'Fantasztikus megfigyelés! Egyre ügyesebb vagy!',
    'Bravó! Alaposan végiggondoltad, és meglett az eredménye!',
    'Csodás munka! Minden részletre figyeltél!',
    'Ügyesen kizártad a hibás formákat! Igazi logikabajnok vagy!',
    'Remek! Látom, hogy pontosan követted a szabályt!',
  ];

  const MOTIVATIONAL_RETRY = [
    'Semmi baj, a próba segít rájönni! Nézzük meg még egyszer!',
    'Közel jársz! Egy apró részletet figyelj meg újra!',
    'Ügyesen próbálkozol! Nézd meg a formák színét és alakját is!',
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function speakMotivationalSuccess() {
    if (state.stars > 0 && state.stars % 5 === 0) {
      playTone('fanfare');
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél! Igazi mesterkovács vagy!`);
    } else {
      playTone('success');
      speakHu(pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  function speakMotivationalRetry(customMsg) {
    playTone('error');
    speakHu(customMsg || pickRandom(MOTIVATIONAL_RETRY));
  }

  /* ========================================================================
     3. Pályák és Feladatok (3 Játékmód)
     ======================================================================== */
  const ANVIL_LEVELS = [
    {
      title: '1. szint — Egyetlen tulajdonság',
      speech: 'Tedd az üllőre az összes PIROS formát!',
      prompt: 'Tedd az üllőre az összes PIROS formát!',
      conditions: [{ key: 'color', val: 'red', negate: false }],
      tokens: [
        { id: 'a1', color: 'red', shape: 'circle', size: 'big', fill: 'solid' },
        { id: 'a2', color: 'blue', shape: 'circle', size: 'big', fill: 'solid' },
        { id: 'a3', color: 'red', shape: 'triangle', size: 'small', fill: 'hollow' },
        { id: 'a4', color: 'yellow', shape: 'square', size: 'big', fill: 'solid' },
        { id: 'a5', color: 'red', shape: 'square', size: 'big', fill: 'hollow' },
        { id: 'a6', color: 'blue', shape: 'hexagon', size: 'small', fill: 'solid' },
      ],
    },
    {
      title: '2. szint — A tagadás varázsa (NEM)',
      speech: 'Vigyázz! Csak azok mehetnek az üllőre, amelyek NEM kékek!',
      prompt: 'Csak azok mehetnek az üllőre, amelyek NEM kékek!',
      conditions: [{ key: 'color', val: 'blue', negate: true }],
      tokens: [
        { id: 'b1', color: 'red', shape: 'square', size: 'big', fill: 'solid' },
        { id: 'b2', color: 'blue', shape: 'triangle', size: 'big', fill: 'solid' },
        { id: 'b3', color: 'yellow', shape: 'circle', size: 'small', fill: 'hollow' },
        { id: 'b4', color: 'blue', shape: 'circle', size: 'small', fill: 'solid' },
        { id: 'b5', color: 'yellow', shape: 'hexagon', size: 'big', fill: 'solid' },
        { id: 'b6', color: 'red', shape: 'triangle', size: 'small', fill: 'hollow' },
      ],
    },
    {
      title: '3. szint — Két szabály egyszerre',
      speech: 'Keresd meg azokat, amelyek SÁRGÁK és KÖR alakúak!',
      prompt: 'Tedd az üllőre azokat, amelyek SÁRGÁK és KÖR alakúak!',
      conditions: [
        { key: 'color', val: 'yellow', negate: false },
        { key: 'shape', val: 'circle', negate: false },
      ],
      tokens: [
        { id: 'c1', color: 'yellow', shape: 'circle', size: 'big', fill: 'solid' },
        { id: 'c2', color: 'yellow', shape: 'square', size: 'big', fill: 'solid' },
        { id: 'c3', color: 'red', shape: 'circle', size: 'big', fill: 'solid' },
        { id: 'c4', color: 'yellow', shape: 'circle', size: 'small', fill: 'hollow' },
        { id: 'c5', color: 'blue', shape: 'circle', size: 'small', fill: 'solid' },
        { id: 'c6', color: 'yellow', shape: 'triangle', size: 'small', fill: 'hollow' },
      ],
    },
    {
      title: '4. szint — Méret és lyukas forma',
      speech: 'Most csak a NAGY és LYUKAS formák kellenek a pajzshoz!',
      prompt: 'Csak a NAGY és LYUKAS formák kellenek az üllőre!',
      conditions: [
        { key: 'size', val: 'big', negate: false },
        { key: 'fill', val: 'hollow', negate: false },
      ],
      tokens: [
        { id: 'd1', color: 'red', shape: 'hexagon', size: 'big', fill: 'hollow' },
        { id: 'd2', color: 'red', shape: 'hexagon', size: 'small', fill: 'hollow' },
        { id: 'd3', color: 'blue', shape: 'square', size: 'big', fill: 'solid' },
        { id: 'd4', color: 'yellow', shape: 'circle', size: 'big', fill: 'hollow' },
        { id: 'd5', color: 'blue', shape: 'triangle', size: 'small', fill: 'solid' },
        { id: 'd6', color: 'blue', shape: 'circle', size: 'big', fill: 'hollow' },
      ],
    },
    {
      title: '5. szint — Forma és tagadás',
      speech: 'Tedd az üllőre a NÉGYZETEKET, de NEM lehetnek pirosak!',
      prompt: 'Tedd az üllőre a NÉGYZETEKET, amelyek NEM pirosak!',
      conditions: [
        { key: 'shape', val: 'square', negate: false },
        { key: 'color', val: 'red', negate: true },
      ],
      tokens: [
        { id: 'e1', color: 'blue', shape: 'square', size: 'big', fill: 'solid' },
        { id: 'e2', color: 'red', shape: 'square', size: 'big', fill: 'solid' },
        { id: 'e3', color: 'yellow', shape: 'square', size: 'small', fill: 'hollow' },
        { id: 'e4', color: 'blue', shape: 'circle', size: 'big', fill: 'solid' },
        { id: 'e5', color: 'red', shape: 'square', size: 'small', fill: 'hollow' },
        { id: 'e6', color: 'yellow', shape: 'triangle', size: 'big', fill: 'solid' },
      ],
    },
    {
      title: '6. szint — Mesterkovács próba (3 szabály)',
      speech: 'Csak a KICSI, TELI, HÁROMSZÖG formákat tedd az üllőre!',
      prompt: 'Tedd az üllőre a KICSI, TELI, HÁROMSZÖG formákat!',
      conditions: [
        { key: 'size', val: 'small', negate: false },
        { key: 'fill', val: 'solid', negate: false },
        { key: 'shape', val: 'triangle', negate: false },
      ],
      tokens: [
        { id: 'f1', color: 'red', shape: 'triangle', size: 'small', fill: 'solid' },
        { id: 'f2', color: 'blue', shape: 'triangle', size: 'big', fill: 'solid' },
        { id: 'f3', color: 'yellow', shape: 'triangle', size: 'small', fill: 'hollow' },
        { id: 'f4', color: 'blue', shape: 'triangle', size: 'small', fill: 'solid' },
        { id: 'f5', color: 'red', shape: 'circle', size: 'small', fill: 'solid' },
        { id: 'f6', color: 'yellow', shape: 'triangle', size: 'small', fill: 'solid' },
      ],
    },
  ];

  const VENN_LEVELS = [
    {
      title: '1. karika-játék — Piros és Kör',
      speech: 'Rendezd el a formákat! Balra a pirosak, jobbra a körök, középre pedig ami piros ÉS kör!',
      prompt: 'Rendezd a karikákba a formákat! Ami egyikbe sem illik, tedd kívülre.',
      leftRule: { key: 'color', val: 'red', negate: false },
      rightRule: { key: 'shape', val: 'circle', negate: false },
      tokens: [
        { id: 'v1', color: 'red', shape: 'circle', size: 'big', fill: 'solid' },
        { id: 'v2', color: 'red', shape: 'square', size: 'big', fill: 'solid' },
        { id: 'v3', color: 'blue', shape: 'circle', size: 'small', fill: 'hollow' },
        { id: 'v4', color: 'yellow', shape: 'triangle', size: 'big', fill: 'solid' },
        { id: 'v5', color: 'red', shape: 'circle', size: 'small', fill: 'hollow' },
        { id: 'v6', color: 'blue', shape: 'hexagon', size: 'big', fill: 'solid' },
      ],
    },
    {
      title: '2. karika-játék — Nagy és Háromszög',
      speech: 'Balra a nagy formák, jobbra a háromszögek, középre a nagy háromszögek!',
      prompt: 'Balra: Nagy · Középre: Nagy ÉS Háromszög · Jobbra: Háromszög',
      leftRule: { key: 'size', val: 'big', negate: false },
      rightRule: { key: 'shape', val: 'triangle', negate: false },
      tokens: [
        { id: 'w1', color: 'yellow', shape: 'triangle', size: 'big', fill: 'solid' },
        { id: 'w2', color: 'red', shape: 'square', size: 'big', fill: 'hollow' },
        { id: 'w3', color: 'blue', shape: 'triangle', size: 'small', fill: 'solid' },
        { id: 'w4', color: 'yellow', shape: 'circle', size: 'small', fill: 'hollow' },
        { id: 'w5', color: 'blue', shape: 'triangle', size: 'big', fill: 'hollow' },
        { id: 'w6', color: 'red', shape: 'circle', size: 'small', fill: 'solid' },
      ],
    },
    {
      title: '3. karika-játék — Lyukas és Kék',
      speech: 'Balra a lyukas formák, jobbra a kékek, középre pedig a lyukas kékek!',
      prompt: 'Balra: Lyukas · Középre: Lyukas ÉS Kék · Jobbra: Kék',
      leftRule: { key: 'fill', val: 'hollow', negate: false },
      rightRule: { key: 'color', val: 'blue', negate: false },
      tokens: [
        { id: 'x1', color: 'blue', shape: 'hexagon', size: 'big', fill: 'hollow' },
        { id: 'x2', color: 'red', shape: 'circle', size: 'big', fill: 'hollow' },
        { id: 'x3', color: 'blue', shape: 'square', size: 'small', fill: 'solid' },
        { id: 'x4', color: 'yellow', shape: 'triangle', size: 'big', fill: 'solid' },
        { id: 'x5', color: 'blue', shape: 'circle', size: 'small', fill: 'hollow' },
        { id: 'x6', color: 'red', shape: 'square', size: 'small', fill: 'solid' },
      ],
    },
  ];

  const SECRET_LEVELS = [
    {
      title: '1. rejtély — Mit fogad el a varázsüllő?',
      speech: 'Próbálj ki formákat a varázsüllőn! Ha rájöttél a titkos szabályra, válaszd ki lent a megfelelőt!',
      prompt: 'Tesztelj formákat az üllőn, és fejtsd meg a titkos szabályt!',
      secretConditions: [{ key: 'shape', val: 'hexagon', negate: false }],
      choices: [
        [{ key: 'color', val: 'blue', negate: false }],
        [{ key: 'shape', val: 'hexagon', negate: false }],
        [{ key: 'size', val: 'big', negate: false }],
      ],
      correctIndex: 1,
      tokens: [
        { id: 's1', color: 'red', shape: 'hexagon', size: 'big', fill: 'solid' },
        { id: 's2', color: 'blue', shape: 'circle', size: 'big', fill: 'solid' },
        { id: 's3', color: 'yellow', shape: 'hexagon', size: 'small', fill: 'hollow' },
        { id: 's4', color: 'blue', shape: 'square', size: 'small', fill: 'solid' },
        { id: 's5', color: 'red', shape: 'triangle', size: 'big', fill: 'hollow' },
      ],
    },
    {
      title: '2. rejtély — Dupla titok',
      speech: 'Teszteld a formákat! Vajon melyik két tulajdonság kell egyszerre?',
      prompt: 'Tesztelj formákat, majd válaszd ki a pontos szabályt!',
      secretConditions: [
        { key: 'color', val: 'blue', negate: false },
        { key: 'fill', val: 'hollow', negate: false },
      ],
      choices: [
        [
          { key: 'color', val: 'blue', negate: false },
          { key: 'fill', val: 'hollow', negate: false },
        ],
        [
          { key: 'color', val: 'blue', negate: false },
          { key: 'size', val: 'big', negate: false },
        ],
        [
          { key: 'color', val: 'red', negate: true },
          { key: 'fill', val: 'solid', negate: false },
        ],
      ],
      correctIndex: 0,
      tokens: [
        { id: 't1', color: 'blue', shape: 'circle', size: 'big', fill: 'hollow' },
        { id: 't2', color: 'blue', shape: 'square', size: 'big', fill: 'solid' },
        { id: 't3', color: 'red', shape: 'circle', size: 'big', fill: 'hollow' },
        { id: 't4', color: 'blue', shape: 'triangle', size: 'small', fill: 'hollow' },
        { id: 't5', color: 'yellow', shape: 'hexagon', size: 'small', fill: 'solid' },
      ],
    },
    {
      title: '3. rejtély — A tiltott szín',
      speech: 'Figyeld meg, mi pattan le az üllőről! Melyik a titkos szabály?',
      prompt: 'Figyeld meg, mi fér bele és mi pattan le!',
      secretConditions: [{ key: 'color', val: 'yellow', negate: true }],
      choices: [
        [{ key: 'color', val: 'red', negate: false }],
        [{ key: 'color', val: 'yellow', negate: true }],
        [{ key: 'fill', val: 'solid', negate: false }],
      ],
      correctIndex: 1,
      tokens: [
        { id: 'u1', color: 'red', shape: 'circle', size: 'big', fill: 'solid' },
        { id: 'u2', color: 'yellow', shape: 'square', size: 'big', fill: 'solid' },
        { id: 'u3', color: 'blue', shape: 'triangle', size: 'small', fill: 'hollow' },
        { id: 'u4', color: 'yellow', shape: 'circle', size: 'small', fill: 'hollow' },
        { id: 'u5', color: 'red', shape: 'hexagon', size: 'small', fill: 'solid' },
      ],
    },
  ];

  /* ========================================================================
     3b. Végtelen Műhely — Eljárási Pályagenerátor (48 elemű Dienes-készlet)
     ======================================================================== */
  function buildFullDienesDeck() {
    const deck = [];
    let idx = 1;
    Object.keys(COLORS).forEach((color) => {
      Object.keys(SHAPES).forEach((shape) => {
        Object.keys(SIZES).forEach((size) => {
          Object.keys(FILLS).forEach((fill) => {
            deck.push({ id: `gen_${idx++}`, color, shape, size, fill });
          });
        });
      });
    });
    return deck;
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function conditionTextHu(cond) {
    let base = '';
    if (cond.key === 'color') base = COLORS[cond.val].label.toUpperCase();
    else if (cond.key === 'shape') base = SHAPES[cond.val].label.toUpperCase();
    else if (cond.key === 'size') base = SIZES[cond.val].label.toUpperCase();
    else if (cond.key === 'fill') base = FILLS[cond.val].label.toUpperCase();
    return cond.negate ? `NEM ${base}` : base;
  }

  function randomCondition(allowedKeys, allowNegate) {
    const key = pickRandom(allowedKeys);
    let val = '';
    if (key === 'color') val = pickRandom(Object.keys(COLORS));
    else if (key === 'shape') val = pickRandom(Object.keys(SHAPES));
    else if (key === 'size') val = pickRandom(Object.keys(SIZES));
    else if (key === 'fill') val = pickRandom(Object.keys(FILLS));

    const canNegate = allowNegate && (key === 'color' || key === 'shape');
    const negate = canNegate ? Math.random() < 0.35 : false;
    return { key, val, negate };
  }

  function generateInfiniteLevel(mode, roundNum) {
    const deck = shuffle(buildFullDienesDeck());
    const diff = state.difficulty || 'medium';
    const tokenTotal = diff === 'easy' ? 5 : diff === 'medium' ? 6 : 8;

    if (mode === 'anvil') {
      const numConds = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3;
      const allowNeg = diff !== 'easy';
      const keys = shuffle(['color', 'shape', 'size', 'fill']).slice(0, numConds);
      const conditions = keys.map((k) => randomCondition([k], allowNeg));

      const matching = deck.filter((t) => matchesRule(t, conditions));
      const nonMatching = deck.filter((t) => !matchesRule(t, conditions));
      const matchCount = Math.min(matching.length, diff === 'hard' ? 3 : 2 + Math.floor(Math.random() * 2));
      const tokens = shuffle([
        ...matching.slice(0, matchCount),
        ...nonMatching.slice(0, tokenTotal - matchCount),
      ]);

      const ruleText = conditions.map(conditionTextHu).join(' és ');
      return {
        title: `∞ Végtelen Műhely — ${roundNum}. kör`,
        prompt: `Tedd az üllőre: ${ruleText}!`,
        speech: `Végtelen kör! Tedd az üllőre azokat, amelyek: ${ruleText}!`,
        conditions,
        tokens,
      };
    }

    if (mode === 'venn') {
      const keys = shuffle(['color', 'shape', 'size', 'fill']).slice(0, 2);
      const leftRule = randomCondition([keys[0]], diff === 'hard');
      const rightRule = randomCondition([keys[1]], false);

      const bBoth = deck.filter((t) => matchesCondition(t, leftRule) && matchesCondition(t, rightRule));
      const bLeft = deck.filter((t) => matchesCondition(t, leftRule) && !matchesCondition(t, rightRule));
      const bRight = deck.filter((t) => !matchesCondition(t, leftRule) && matchesCondition(t, rightRule));
      const bOut = deck.filter((t) => !matchesCondition(t, leftRule) && !matchesCondition(t, rightRule));

      const picked = [
        ...bBoth.slice(0, 2),
        ...bLeft.slice(0, diff === 'hard' ? 2 : 1),
        ...bRight.slice(0, 2),
        ...bOut.slice(0, diff === 'hard' ? 2 : 1),
      ].slice(0, tokenTotal);

      const lTxt = conditionTextHu(leftRule);
      const rTxt = conditionTextHu(rightRule);
      return {
        title: `∞ Végtelen Karikák — ${roundNum}. kör`,
        prompt: `Balra: ${lTxt} · Középre: mindkettő · Jobbra: ${rTxt}`,
        speech: `Rendezd a karikákba! Balra: ${lTxt}, jobbra: ${rTxt}, középre pedig ami mindkettő!`,
        leftRule,
        rightRule,
        tokens: shuffle(picked),
      };
    }

    // Secret Mode
    const numConds = diff === 'easy' ? 1 : 2;
    const distractorCount = diff === 'hard' ? 3 : 2;
    const keys = shuffle(['color', 'shape', 'size', 'fill']).slice(0, numConds);
    const secretConditions = keys.map((k) => randomCondition([k], diff !== 'easy' && numConds === 1));

    const sig = (conds) =>
      deck.map((t) => (matchesRule(t, conds) ? '1' : '0')).join('');
    const targetSig = sig(secretConditions);

    const distractors = [];
    let guard = 0;
    while (distractors.length < distractorCount && guard < 80) {
      guard++;
      const dKeys = shuffle(['color', 'shape', 'size', 'fill']).slice(0, numConds);
      const cand = dKeys.map((k) => randomCondition([k], diff !== 'easy' && numConds === 1));
      const cSig = sig(cand);
      if (cSig !== targetSig && !distractors.some((d) => sig(d) === cSig)) {
        distractors.push(cand);
      }
    }

    const allChoices = shuffle([secretConditions, ...distractors]);
    const correctIndex = allChoices.indexOf(secretConditions);

    const matching = deck.filter((t) => matchesRule(t, secretConditions));
    const nonMatching = deck.filter((t) => !matchesRule(t, secretConditions));
    const tokens = shuffle([...matching.slice(0, 2), ...nonMatching.slice(0, 3)]);

    return {
      title: `∞ Végtelen Rejtély — ${roundNum}. kör`,
      prompt: 'Tesztelj formákat a varázsüllőn, és fejtsd meg a titkos szabályt!',
      speech: 'Új titkos szabály! Próbálj ki formákat az üllőn, és válaszd ki lent a megfelelőt!',
      secretConditions,
      choices: allChoices,
      correctIndex,
      tokens,
    };
  }

  /* ========================================================================
     4. Játékállapot & DOM Hivatkozások
     ======================================================================== */
  const state = {
    mode: 'anvil', // 'anvil' | 'venn' | 'secret'
    levelIdx: { anvil: 0, venn: 0, secret: 0 },
    infiniteMode: false,
    infiniteRound: { anvil: 1, venn: 1, secret: 1 },
    generatedLevel: null,
    stars: Number(localStorage.getItem('kovacs_stars') || 0),
    attempts: 3,
    placements: {}, // tokenId -> zoneName
    selectedTokenId: null,
    secretLog: [], // { token, pass }
    secretSelectedChoice: null,
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
    attemptsDisplay: document.getElementById('attempts-display'),
    ruleBlueprint: document.getElementById('rule-blueprint'),
    gameStage: document.getElementById('game-stage'),
    tokenTray: document.getElementById('token-tray'),
    trayCount: document.getElementById('tray-count'),
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackText: document.getElementById('feedback-text'),
    actionButtons: document.getElementById('action-buttons'),
  };

  /* ========================================================================
     5. Segédfüggvények
     ======================================================================== */
  function addStars(n) {
    state.stars += n;
    localStorage.setItem('kovacs_stars', String(state.stars));
    els.starCount.textContent = String(state.stars);
  }

  function setFeedback(text, kind = 'neutral') {
    els.feedbackText.textContent = text;
    els.feedbackBanner.className = 'feedback-banner';
    if (kind === 'success') els.feedbackBanner.classList.add('is-success');
    if (kind === 'warn') els.feedbackBanner.classList.add('is-warn');
  }

  function getCurrentLevel() {
    if (state.infiniteMode) {
      return state.generatedLevel;
    }
    if (state.mode === 'anvil') return ANVIL_LEVELS[state.levelIdx.anvil];
    if (state.mode === 'venn') return VENN_LEVELS[state.levelIdx.venn];
    return SECRET_LEVELS[state.levelIdx.secret];
  }

  function getMaxAttempts() {
    if (state.difficulty === 'easy') return 4;
    if (state.difficulty === 'hard') return 2;
    return 3;
  }

  function updateAttemptsUI() {
    if (state.mode === 'secret') {
      const maxTests = state.difficulty === 'hard' ? 4 : 5;
      const left = Math.max(0, maxTests - state.secretLog.length);
      els.attemptsDisplay.textContent = `🔍 ${left} próba`;
      return;
    }
    const maxAtt = getMaxAttempts();
    const fires = '🔥'.repeat(Math.max(0, state.attempts));
    const empty = '⚪'.repeat(Math.max(0, maxAtt - state.attempts));
    els.attemptsDisplay.textContent = fires + empty;
  }

  /* ========================================================================
     6. Szint Betöltése & Renderelés
     ======================================================================== */
  function loadLevel() {
    if (state.infiniteMode) {
      state.generatedLevel = generateInfiniteLevel(
        state.mode,
        state.infiniteRound[state.mode]
      );
    }
    const lvl = getCurrentLevel();
    state.attempts = getMaxAttempts();
    state.placements = {};
    state.selectedTokenId = null;
    state.secretLog = [];
    state.secretSelectedChoice = null;
    state.levelCompleted = false;

    lvl.tokens.forEach((t) => {
      state.placements[t.id] = 'tray';
    });

    els.levelBadge.textContent = lvl.title;
    els.promptInstruction.textContent = lvl.prompt;
    updateAttemptsUI();
    setFeedback('Húzd át a formákat, vagy koppints egy formára, majd a célhelyre!');

    renderBlueprint(lvl);
    renderStage(lvl);
    renderAllTokens(lvl);
    renderActionButtons(lvl);

    speakHu(lvl.speech);
  }

  function renderBlueprint(lvl) {
    if (state.mode === 'anvil') {
      els.ruleBlueprint.style.display = 'flex';
      els.ruleBlueprint.innerHTML = lvl.conditions
        .map((c) => renderRuleChipHTML(c))
        .join('<span class="rule-plus">+</span>');
    } else {
      els.ruleBlueprint.style.display = 'none';
      els.ruleBlueprint.innerHTML = '';
    }
  }

  function renderStage(lvl) {
    if (state.mode === 'anvil') {
      els.gameStage.innerHTML = `
        <div class="anvil-stage">
          <div class="drop-zone drop-target" id="zone-anvil" data-zone="anvil">
            <span class="zone-label">🔨 Kovács Üllője (Ide tedd a jó formákat!)</span>
            <div class="zone-tokens" id="tokens-anvil"></div>
          </div>
        </div>
      `;
    } else if (state.mode === 'venn') {
      els.gameStage.innerHTML = `
        <div class="venn-stage">
          <div class="venn-diagram">
            <div class="venn-zone venn-left drop-target" data-zone="left">
              <div class="venn-header">${renderRuleChipHTML(lvl.leftRule)}</div>
              <div class="zone-tokens" id="tokens-left"></div>
            </div>
            <div class="venn-zone venn-both drop-target" data-zone="both">
              <div class="venn-header">✨ Mindkettő</div>
              <div class="zone-tokens" id="tokens-both"></div>
            </div>
            <div class="venn-zone venn-right drop-target" data-zone="right">
              <div class="venn-header">${renderRuleChipHTML(lvl.rightRule)}</div>
              <div class="zone-tokens" id="tokens-right"></div>
            </div>
          </div>
          <div class="venn-outside venn-zone drop-target" data-zone="outside">
            <div class="venn-header">📦 Egyik karikába sem illik</div>
            <div class="zone-tokens" id="tokens-outside"></div>
          </div>
        </div>
      `;
    } else if (state.mode === 'secret') {
      const choicesHTML = lvl.choices
        .map(
          (choiceConds, idx) => `
          <button type="button" class="rule-choice-btn" data-choice-idx="${idx}">
            ${choiceConds.map((c) => renderRuleChipHTML(c)).join('<span class="rule-plus">+</span>')}
          </button>
        `
        )
        .join('');

      els.gameStage.innerHTML = `
        <div class="secret-layout">
          <div class="drop-zone drop-target" id="zone-secret-anvil" data-zone="secret-test">
            <span class="zone-label">✨ Varázs-Üllő (Dobj ide egy formát tesztelni!)</span>
            <div class="zone-tokens" id="tokens-secret-test"></div>
          </div>
          <div class="test-log-box">
            <p class="test-log-title">📋 Eddigi próbák eredménye:</p>
            <div class="test-log-list" id="secret-log-list">
              <span style="color:var(--ink-muted); font-size:0.88rem;">Még nem teszteltél formát.</span>
            </div>
          </div>
        </div>
        <div style="margin-top:0.5rem;">
          <p class="test-log-title" style="margin-bottom:0.5rem;">🔓 Melyik a titkos szabály? Válassz egyet:</p>
          <div class="rule-choices-grid" id="secret-choices-grid">${choicesHTML}</div>
        </div>
      `;

      document.querySelectorAll('.rule-choice-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (state.levelCompleted) return;
          document.querySelectorAll('.rule-choice-btn').forEach((b) => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          state.secretSelectedChoice = Number(btn.dataset.choiceIdx);
          playTone('place');
        });
      });
    }

    attachDropZoneTapHandlers();
  }

  function createTokenElement(token) {
    const el = document.createElement('div');
    el.className = 'dienes-token';
    el.dataset.tokenId = token.id;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', describeTokenHu(token));
    el.innerHTML = createTokenSVG(token, 54);

    if (state.selectedTokenId === token.id) {
      el.classList.add('is-selected');
    }

    setupTokenPointerInteractions(el, token.id);
    return el;
  }

  function renderAllTokens(lvl) {
    // Tálca ürítése
    els.tokenTray.innerHTML = '';

    // Célzónák ürítése
    document.querySelectorAll('.zone-tokens').forEach((z) => {
      z.innerHTML = '';
    });

    let trayCount = 0;
    lvl.tokens.forEach((token) => {
      const zone = state.placements[token.id] || 'tray';
      const el = createTokenElement(token);
      if (zone === 'tray') {
        els.tokenTray.appendChild(el);
        trayCount++;
      } else {
        const container = document.getElementById(`tokens-${zone}`);
        if (container) {
          container.appendChild(el);
        } else {
          els.tokenTray.appendChild(el);
          trayCount++;
        }
      }
    });

    els.trayCount.textContent = trayCount > 0 ? `${trayCount} db maradt` : 'Minden elhelyezve!';
    updateTapReadyHighlights();
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

    if (state.mode === 'anvil') {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-secondary" id="btn-reset-level">🔄 Újrakezdem</button>
        <button type="button" class="btn btn-primary" id="btn-check-anvil">🔨 Üssük meg!</button>
      `;
      document.getElementById('btn-reset-level').addEventListener('click', loadLevel);
      document.getElementById('btn-check-anvil').addEventListener('click', checkAnvilLevel);
    } else if (state.mode === 'venn') {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-secondary" id="btn-reset-level">🔄 Újrakezdem</button>
        <button type="button" class="btn btn-primary" id="btn-check-venn">✨ Ellenőrzés!</button>
      `;
      document.getElementById('btn-reset-level').addEventListener('click', loadLevel);
      document.getElementById('btn-check-venn').addEventListener('click', checkVennLevel);
    } else {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-secondary" id="btn-reset-level">🔄 Újrakezdem</button>
        <button type="button" class="btn btn-primary" id="btn-check-secret">🔓 Láda kinyitása!</button>
      `;
      document.getElementById('btn-reset-level').addEventListener('click', loadLevel);
      document.getElementById('btn-check-secret').addEventListener('click', checkSecretLevel);
    }
  }

  /* ========================================================================
     7. Univerzális Pointer Drag-and-Drop + Tap-to-Select
     ======================================================================== */
  let dragState = null;

  function setupTokenPointerInteractions(el, tokenId) {
    el.addEventListener('pointerdown', (e) => {
      if (state.levelCompleted) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      el.setPointerCapture(e.pointerId);
      dragState = {
        tokenId,
        sourceEl: el,
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
        ghost: null,
      };
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragState || dragState.tokenId !== tokenId) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (!dragState.isDragging && Math.hypot(dx, dy) > 8) {
        dragState.isDragging = true;
        dragState.sourceEl.classList.add('is-dragging-source');
        const ghost = dragState.sourceEl.cloneNode(true);
        ghost.classList.remove('is-selected', 'is-dragging-source');
        ghost.classList.add('drag-ghost');
        document.body.appendChild(ghost);
        dragState.ghost = ghost;
      }

      if (dragState.isDragging && dragState.ghost) {
        dragState.ghost.style.left = `${e.clientX}px`;
        dragState.ghost.style.top = `${e.clientY}px`;
        highlightDropTargetAt(e.clientX, e.clientY);
      }
    });

    el.addEventListener('pointerup', (e) => {
      if (!dragState || dragState.tokenId !== tokenId) return;
      const wasDragging = dragState.isDragging;

      if (dragState.ghost) {
        dragState.ghost.remove();
      }
      dragState.sourceEl.classList.remove('is-dragging-source');
      clearDropTargetHighlights();

      if (wasDragging) {
        const targetZone = findDropZoneAt(e.clientX, e.clientY);
        if (targetZone) {
          placeTokenInZone(tokenId, targetZone);
        }
      } else {
        // Koppintás / Kattintás
        handleTokenTap(tokenId);
      }
      dragState = null;
    });

    el.addEventListener('pointercancel', () => {
      if (dragState && dragState.ghost) dragState.ghost.remove();
      if (dragState && dragState.sourceEl) dragState.sourceEl.classList.remove('is-dragging-source');
      clearDropTargetHighlights();
      dragState = null;
    });

    // Billentyűzetes hozzáférhetőség
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTokenTap(tokenId);
      }
    });
  }

  function findDropZoneAt(x, y) {
    const elements = document.elementsFromPoint(x, y);
    for (const node of elements) {
      const target = node.closest('.drop-target');
      if (target && target.dataset.zone) {
        return target.dataset.zone;
      }
    }
    return null;
  }

  function highlightDropTargetAt(x, y) {
    clearDropTargetHighlights();
    const zoneName = findDropZoneAt(x, y);
    if (zoneName) {
      const zoneEl = document.querySelector(`.drop-target[data-zone="${zoneName}"]`);
      if (zoneEl) zoneEl.classList.add('is-drag-over');
    }
  }

  function clearDropTargetHighlights() {
    document.querySelectorAll('.drop-target.is-drag-over').forEach((z) => {
      z.classList.remove('is-drag-over');
    });
  }

  function updateTapReadyHighlights() {
    document.querySelectorAll('.drop-target').forEach((z) => {
      if (state.selectedTokenId) {
        z.classList.add('is-tap-ready');
      } else {
        z.classList.remove('is-tap-ready');
      }
    });
  }

  function attachDropZoneTapHandlers() {
    document.querySelectorAll('.drop-target').forEach((zoneEl) => {
      zoneEl.addEventListener('click', (e) => {
        if (state.levelCompleted) return;
        // Ha közvetlenül egy tokenre koppintottunk, a token kezelője fut le
        if (e.target.closest('.dienes-token')) return;
        if (state.selectedTokenId) {
          placeTokenInZone(state.selectedTokenId, zoneEl.dataset.zone);
        }
      });
    });
  }

  function handleTokenTap(tokenId) {
    if (state.levelCompleted) return;
    const currentZone = state.placements[tokenId];

    // Ha már egy célzónában van és nincs más kijelölve, visszatesszük a ládába
    if (currentZone !== 'tray' && state.selectedTokenId !== tokenId) {
      placeTokenInZone(tokenId, 'tray');
      return;
    }

    state.selectedTokenId = state.selectedTokenId === tokenId ? null : tokenId;
    renderAllTokens(getCurrentLevel());
  }

  function placeTokenInZone(tokenId, zoneName) {
    const lvl = getCurrentLevel();

    if (state.mode === 'secret' && zoneName === 'secret-test') {
      if (state.secretLog.length >= 5) {
        setFeedback('Elfogytak a próbák! Válaszd ki lent a titkos szabályt!', 'warn');
        speakHu('Elfogytak a próbák! Válaszd ki lent a szabályt!');
        return;
      }
      const token = lvl.tokens.find((t) => t.id === tokenId);
      const pass = matchesRule(token, lvl.secretConditions);
      state.secretLog.push({ token, pass });
      state.selectedTokenId = null;
      updateAttemptsUI();
      renderSecretLog();

      if (pass) {
        playTone('success');
        setFeedback('Zöld pipa! Ez a forma BELEFÉR a titkos szabályba.', 'success');
      } else {
        playTone('error');
        setFeedback('Lepattant! Ez a forma NEM felel meg a szabálynak.', 'warn');
      }
      renderAllTokens(lvl);
      return;
    }

    state.placements[tokenId] = zoneName;
    state.selectedTokenId = null;
    playTone('place');
    renderAllTokens(lvl);
  }

  /* ========================================================================
     8. Ellenőrzési Logika (Anti-Guessing & Process Praise)
     ======================================================================== */
  function checkAnvilLevel() {
    const lvl = getCurrentLevel();
    const placedIds = Object.keys(state.placements).filter((id) => state.placements[id] === 'anvil');

    if (placedIds.length === 0) {
      setFeedback('Először tegyél legalább egy formát az üllőre!', 'warn');
      speakHu('Először tegyél formákat az üllőre!');
      return;
    }

    let wrongTokens = [];
    let missingCount = 0;

    lvl.tokens.forEach((t) => {
      const shouldBeOnAnvil = matchesRule(t, lvl.conditions);
      const isOnAnvil = state.placements[t.id] === 'anvil';
      if (isOnAnvil && !shouldBeOnAnvil) wrongTokens.push(t);
      if (!isOnAnvil && shouldBeOnAnvil) missingCount++;
    });

    if (wrongTokens.length === 0 && missingCount === 0) {
      addStars(1);
      state.levelCompleted = true;
      setFeedback('Szuper megfigyelés! Minden pontosan a szabály szerint került az üllőre!', 'success');
      speakMotivationalSuccess();
      document.querySelectorAll('#tokens-anvil .dienes-token').forEach((el) => el.classList.add('is-correct'));
      renderActionButtons();
      return;
    }

    state.attempts--;
    updateAttemptsUI();

    // Hibás formák visszapattannak a ládába
    wrongTokens.forEach((t) => {
      state.placements[t.id] = 'tray';
    });
    renderAllTokens(lvl);

    if (wrongTokens.length > 0 && missingCount > 0) {
      setFeedback('Néhány forma nem illett ide, és maradt még jó forma a ládában is!', 'warn');
      speakMotivationalRetry('Néhány forma nem illett ide, és maradt még jó forma a ládában!');
    } else if (wrongTokens.length > 0) {
      setFeedback('Hoppsz! Amelyik visszapattant, annál figyelj újra a szabályra!', 'warn');
      speakMotivationalRetry();
    } else {
      setFeedback(`Majdnem megvan! Még ${missingCount} jó forma lapul a ládában.`, 'warn');
      speakMotivationalRetry(`Majdnem megvan! Még ${missingCount} jó forma maradt a ládában.`);
    }

    if (state.attempts <= 0) {
      setFeedback('Elfogyott a tűz! Semmi gond, próbáljuk újra friss fejjel!', 'warn');
      state.attempts = 3;
      updateAttemptsUI();
    }
  }

  function checkVennLevel() {
    const lvl = getCurrentLevel();
    const inTray = lvl.tokens.filter((t) => state.placements[t.id] === 'tray');

    if (inTray.length > 0) {
      setFeedback(`Még ${inTray.length} formát nem tettél sehova! Helyezz el mindent!`, 'warn');
      speakHu('Helyezz el minden formát a karikákba vagy kívülre!');
      return;
    }

    let wrongIds = [];
    lvl.tokens.forEach((t) => {
      const inLeft = matchesCondition(t, lvl.leftRule);
      const inRight = matchesCondition(t, lvl.rightRule);
      let expected = 'outside';
      if (inLeft && inRight) expected = 'both';
      else if (inLeft) expected = 'left';
      else if (inRight) expected = 'right';

      if (state.placements[t.id] !== expected) {
        wrongIds.push(t.id);
      }
    });

    if (wrongIds.length === 0) {
      addStars(1);
      state.levelCompleted = true;
      setFeedback('Halmaz-mester vagy! A metszetbe is tökéletesen válogattál!', 'success');
      speakMotivationalSuccess();
      renderActionButtons();
      return;
    }

    state.attempts--;
    updateAttemptsUI();

    wrongIds.forEach((id) => {
      state.placements[id] = 'tray';
    });
    renderAllTokens(lvl);
    setFeedback(`${wrongIds.length} forma rossz helyen volt, visszakerült a ládába. Nézd meg újra!`, 'warn');
    speakMotivationalRetry();

    if (state.attempts <= 0) {
      state.attempts = 3;
      updateAttemptsUI();
    }
  }

  function renderSecretLog() {
    const list = document.getElementById('secret-log-list');
    if (!list) return;
    if (state.secretLog.length === 0) {
      list.innerHTML = '<span style="color:var(--ink-muted); font-size:0.88rem;">Még nem teszteltél formát.</span>';
      return;
    }
    list.innerHTML = state.secretLog
      .map(
        (item) => `
        <div class="test-result-badge ${item.pass ? 'is-pass' : 'is-fail'}">
          ${createTokenSVG(item.token, 30)}
          <span>${item.pass ? '✅' : '❌'}</span>
        </div>
      `
      )
      .join('');
  }

  function checkSecretLevel() {
    const lvl = getCurrentLevel();
    if (state.secretSelectedChoice === null) {
      setFeedback('Előbb bökj rá lent arra a szabályra, amelyik szerinted a titok!', 'warn');
      speakHu('Előbb válassz lent egy szabályt!');
      return;
    }

    if (state.secretSelectedChoice === lvl.correctIndex) {
      addStars(1);
      state.levelCompleted = true;
      setFeedback('Kinyílt a láda! Remekül kikövetkeztetted a próbákból a szabályt!', 'success');
      speakMotivationalSuccess();
      renderActionButtons();
    } else {
      setFeedback('Ez most nem nyitotta ki a ládát. Tesztelj még egy formát az üllőn!', 'warn');
      speakMotivationalRetry('Ez most nem nyitotta ki a ládát. Tesztelj még egy formát!');
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
    const lists = { anvil: ANVIL_LEVELS, venn: VENN_LEVELS, secret: SECRET_LEVELS };
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
     9. Eseménykezelők & Indítás
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
    const lvl = getCurrentLevel();
    speakHu(lvl.speech);
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
        const lists = { anvil: ANVIL_LEVELS, venn: VENN_LEVELS, secret: SECRET_LEVELS };
        const len = lists[state.mode].length;
        state.levelIdx[state.mode] =
          nextDiff === 'easy' ? 0 : nextDiff === 'medium' ? Math.floor(len / 2) : len - 1;
      }
      loadLevel();
    });
  });

  // Kezdeti csillagszám és első pálya betöltése
  state.difficulty = 'medium';
  els.starCount.textContent = String(state.stars);
  loadLevel();
})();
