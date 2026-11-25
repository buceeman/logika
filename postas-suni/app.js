/**
 * Postás Süni — Gráfelmélet, Euler-séták és útvonal-optimalizálás
 * 1. osztályos magyar kisiskolásoknak
 */

(() => {
  'use strict';

  const HOUSE_ICONS = ['📮', '🏡', '🍄', '🌳', '🍯', '🌻'];
  const ISLAND_ICONS = ['🏝️', '⛺', '🪵', '🪨', '🌾', '🏰'];

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

      if (type === 'step') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.07);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.1);
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
    'Szuper útvonal-tervezés! Süni minden levelet kézbesített!',
    'Bravó! Egyetlen hidat sem használtál kétszer!',
    'Fantasztikus! Előre láttad, merre nem szabad zsákutcába menni!',
    'Igazi gráf-bajnok vagy! Minden pontot ügyesen érintettél!',
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function speakMotivationalSuccess() {
    if (state.stars > 0 && state.stars % 5 === 0) {
      playTone('fanfare');
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél Postás Sünivel!`);
    } else {
      playTone('success');
      speakHu(pickRandom(MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Gráf Elrendezések & Generátorok
     ======================================================================== */
  const LAYOUTS = {
    4: [
      { x: 95, y: 75 },
      { x: 305, y: 75 },
      { x: 305, y: 225 },
      { x: 95, y: 225 },
    ],
    5: [
      { x: 200, y: 50 },
      { x: 330, y: 125 },
      { x: 280, y: 245 },
      { x: 120, y: 245 },
      { x: 70, y: 125 },
    ],
    6: [
      { x: 95, y: 65 },
      { x: 200, y: 45 },
      { x: 305, y: 65 },
      { x: 320, y: 215 },
      { x: 200, y: 250 },
      { x: 80, y: 215 },
    ],
  };

  function hasEdge(edges, u, v) {
    return edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u));
  }

  function generateHousesGraph() {
    const n = state.difficulty === 'easy' ? 4 : state.difficulty === 'medium' ? 5 : 6;
    const coords = LAYOUTS[n];
    const order = [...Array(n).keys()].sort(() => Math.random() - 0.5);
    const edges = [];

    // Garantált Hamilton-út
    for (let i = 0; i < n - 1; i++) {
      edges.push({ id: `e_${i}`, u: order[i], v: order[i + 1] });
    }
    // 1-2 extra átkötő út a valódi választási lehetőséghez
    const extraCount = state.difficulty === 'easy' ? 1 : 2;
    for (let k = 0; k < extraCount * 4 && edges.length < n - 1 + extraCount; k++) {
      const a = Math.floor(Math.random() * n);
      const b = Math.floor(Math.random() * n);
      if (a !== b && !hasEdge(edges, a, b)) {
        edges.push({ id: `e_ex_${k}`, u: a, v: b });
      }
    }

    const startNode = order[0];
    const nodes = coords.map((pt, idx) => ({
      id: idx,
      x: pt.x,
      y: pt.y,
      icon: idx === startNode ? '📮' : HOUSE_ICONS[(idx % (HOUSE_ICONS.length - 1)) + 1],
    }));

    return {
      nodes,
      edges,
      startNode,
      speech: 'Indulj a postától, és látogass meg minden házikót pontosan egyszer!',
    };
  }

  function generateBridgesGraph(forceImpossible = false) {
    const n = state.difficulty === 'easy' ? 4 : state.difficulty === 'medium' ? 5 : 6;
    const coords = LAYOUTS[n];

    if (forceImpossible) {
      // Készítsünk garantáltan 4 páratlan fokszámú csúccsal rendelkező gráfot (lehetetlen Euler-séta!)
      // Pl. egy csillag/kerék vagy 4-es teljes gráf (K4: minden csúcs foka 3 -> 4 páratlan fokszám!)
      const edges = [
        { id: 'b0', u: 0, v: 1 },
        { id: 'b1', u: 1, v: 2 },
        { id: 'b2', u: 2, v: 3 },
        { id: 'b3', u: 3, v: 0 },
        { id: 'b4', u: 0, v: 2 },
        { id: 'b5', u: 1, v: 3 },
      ];
      if (n >= 5) {
        edges.push({ id: 'b6', u: 2, v: 4 });
        edges.push({ id: 'b7', u: 3, v: 4 });
      }
      if (n >= 6) {
        edges.push({ id: 'b8', u: 4, v: 5 });
        edges.push({ id: 'b9', u: 0, v: 5 });
      }
      const nodes = coords.map((pt, idx) => ({
        id: idx,
        x: pt.x,
        y: pt.y,
        icon: ISLAND_ICONS[idx % ISLAND_ICONS.length],
      }));
      return {
        nodes,
        edges,
        startNode: 0,
        isPossible: false,
        speech: 'Át tud-e menni Süni minden hídon pontosan egyszer? Próbáld ki, vagy döntsd el!',
      };
    }

    // Garantált Euler-séta generálása: véletlen séta, ami minden csúcsot érint
    const edges = [];
    const visited = new Set([0]);
    let curr = 0;
    const targetEdges = state.difficulty === 'easy' ? 5 : state.difficulty === 'medium' ? 7 : 8;

    let guard = 0;
    while ((visited.size < n || edges.length < targetEdges) && guard < 60) {
      guard++;
      const candidates = [];
      for (let v = 0; v < n; v++) {
        if (v !== curr && !hasEdge(edges, curr, v)) {
          candidates.push(v);
        }
      }
      if (candidates.length === 0) break;
      // Előnyben részesítjük a még nem látogatott csúcsokat
      const unvisited = candidates.filter((v) => !visited.has(v));
      const next = pickRandom(unvisited.length > 0 ? unvisited : candidates);
      edges.push({ id: `e_${edges.length}`, u: curr, v: next });
      visited.add(next);
      curr = next;
    }

    const nodes = coords.map((pt, idx) => ({
      id: idx,
      x: pt.x,
      y: pt.y,
      icon: ISLAND_ICONS[idx % ISLAND_ICONS.length],
    }));

    return {
      nodes,
      edges,
      startNode: 0,
      isPossible: true,
      speech: 'Menj át minden hídon pontosan egyszer! A szigetekre többször is ráléphetsz!',
    };
  }

  /* ========================================================================
     3. Játékállapot & DOM
     ======================================================================== */
  const state = {
    mode: 'houses', // 'houses' | 'bridges' | 'possible'
    difficulty: 'easy', // 'easy' | 'medium' | 'hard'
    roundNum: 1,
    infiniteMode: false,
    stars: Number(localStorage.getItem('suni_stars') || 0),
    graph: null,
    currentNode: 0,
    pathNodes: [], // meglátogatott csúcsok sorrendben
    crossedEdgeIds: [], // átszelt élek sorrendben
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
    localStorage.setItem('suni_stars', String(state.stars));
    els.starCount.textContent = String(state.stars);
  }

  function setFeedback(text, kind = 'neutral') {
    els.feedbackText.textContent = text;
    els.feedbackBanner.className = 'feedback-banner';
    if (kind === 'success') els.feedbackBanner.classList.add('is-success');
    if (kind === 'warn') els.feedbackBanner.classList.add('is-warn');
  }

  /* ========================================================================
     4. Szint Betöltése & Renderelés
     ======================================================================== */
  function loadLevel() {
    state.levelCompleted = false;

    if (state.mode === 'houses') {
      state.graph = generateHousesGraph();
    } else if (state.mode === 'bridges') {
      state.graph = generateBridgesGraph(false);
    } else {
      const impossible = Math.random() < 0.5;
      state.graph = generateBridgesGraph(impossible);
    }

    state.currentNode = state.graph.startNode;
    state.pathNodes = [state.graph.startNode];
    state.crossedEdgeIds = [];

    const prefix = state.infiniteMode ? '∞ ' : '';
    if (state.mode === 'houses') {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. kör — Minden Házba!`;
      els.promptInstruction.textContent = 'Látogass meg minden házikót pontosan egyszer!';
    } else if (state.mode === 'bridges') {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. kör — Minden Hídon Át!`;
      els.promptInstruction.textContent = 'Menj át minden hídon pontosan egyszer!';
    } else {
      els.levelBadge.textContent = `${prefix}${state.roundNum}. kör — Lehet vagy Nem?`;
      els.promptInstruction.textContent = 'Át lehet menni minden hídon pontosan egyszer? Próbáld ki vagy döntsd el!';
    }

    renderStage();
    renderActionButtons();
    setFeedback('Koppints egy sárgával jelölt szomszédos helyre a továbblépéshez!');
    speakHu(state.graph.speech);
  }

  function getAvailableEdgeTo(targetNodeId) {
    return state.graph.edges.find(
      (e) =>
        !state.crossedEdgeIds.includes(e.id) &&
        ((e.u === state.currentNode && e.v === targetNodeId) ||
          (e.v === state.currentNode && e.u === targetNodeId))
    );
  }

  function isReachable(nodeId) {
    if (state.levelCompleted || nodeId === state.currentNode) return false;
    const edge = getAvailableEdgeTo(nodeId);
    if (!edge) return false;
    if (state.mode === 'houses' && state.pathNodes.includes(nodeId)) return false;
    return true;
  }

  function renderStage() {
    const g = state.graph;

    const edgesSVG = g.edges
      .map((e) => {
        const nu = g.nodes[e.u];
        const nv = g.nodes[e.v];
        const crossed = state.crossedEdgeIds.includes(e.id);
        return `<line class="graph-edge ${crossed ? 'is-crossed' : ''}" x1="${nu.x}" y1="${nu.y}" x2="${nv.x}" y2="${nv.y}" />`;
      })
      .join('');

    const nodesSVG = g.nodes
      .map((n) => {
        const isCurrent = n.id === state.currentNode;
        const isVisited = state.pathNodes.includes(n.id);
        const reachable = isReachable(n.id);
        const cls = ['graph-node-group'];
        if (isCurrent) cls.push('is-current');
        else if (isVisited) cls.push('is-visited');
        if (reachable) cls.push('is-reachable');

        const displayIcon = isCurrent ? '🦔' : n.icon;
        return `
          <g class="${cls.join(' ')}" data-node-id="${n.id}" role="button" tabindex="0" aria-label="${n.id + 1}. pont">
            <circle class="graph-node-circle" cx="${n.x}" cy="${n.y}" r="27" />
            <text x="${n.x}" y="${n.y + 9}" text-anchor="middle" font-size="26">${displayIcon}</text>
          </g>
        `;
      })
      .join('');

    const statsHTML =
      state.mode === 'houses'
        ? `<span class="graph-pill">🏡 Meglátogatva: ${new Set(state.pathNodes).size} / ${g.nodes.length}</span>`
        : `<span class="graph-pill">🌉 Átszelt hidak: ${state.crossedEdgeIds.length} / ${g.edges.length}</span>`;

    const judgeHTML =
      state.mode === 'possible' && !state.levelCompleted
        ? `
        <div class="judge-row">
          <button type="button" class="btn btn-success" id="btn-judge-yes">✅ Igen, lehetséges!</button>
          <button type="button" class="btn btn-primary" id="btn-judge-no">❌ Nem, lehetetlen!</button>
        </div>
      `
        : '';

    els.gameStage.innerHTML = `
      <div class="graph-stage">
        <div class="graph-stats-row">${statsHTML}</div>
        <svg class="graph-svg" viewBox="0 0 400 300" aria-label="Útvonal térkép">
          ${edgesSVG}
          ${nodesSVG}
        </svg>
        ${judgeHTML}
      </div>
    `;

    document.querySelectorAll('.graph-node-group').forEach((nodeEl) => {
      nodeEl.addEventListener('click', () => {
        if (state.levelCompleted) return;
        handleNodeTap(Number(nodeEl.dataset.nodeId));
      });
    });

    if (state.mode === 'possible' && !state.levelCompleted) {
      document.getElementById('btn-judge-yes')?.addEventListener('click', () => judgePossible(true));
      document.getElementById('btn-judge-no')?.addEventListener('click', () => judgePossible(false));
    }
  }

  function handleNodeTap(targetId) {
    if (targetId === state.currentNode) return;
    const edge = getAvailableEdgeTo(targetId);

    if (!edge) {
      playTone('error');
      setFeedback('Ide nincs szabad híd vagy út a jelenlegi helyedről!', 'warn');
      return;
    }

    if (state.mode === 'houses' && state.pathNodes.includes(targetId)) {
      playTone('error');
      setFeedback('Ebben a házban már jártál! Válassz egy még üreset!', 'warn');
      return;
    }

    state.currentNode = targetId;
    state.pathNodes.push(targetId);
    state.crossedEdgeIds.push(edge.id);
    playTone('step');

    // Győzelem ellenőrzése
    if (state.mode === 'houses' && new Set(state.pathNodes).size === state.graph.nodes.length) {
      addStars(1);
      state.levelCompleted = true;
      setFeedback('Szuper! Süni minden házba eljuttatta a levelet!', 'success');
      speakMotivationalSuccess();
      renderStage();
      renderActionButtons();
      return;
    }

    if (
      (state.mode === 'bridges' || state.mode === 'possible') &&
      state.crossedEdgeIds.length === state.graph.edges.length
    ) {
      addStars(1);
      state.levelCompleted = true;
      setFeedback('Bravó! Minden hídon pontosan egyszer mentél át!', 'success');
      speakMotivationalSuccess();
      renderStage();
      renderActionButtons();
      return;
    }

    // Ellenőrizzük, maradt-e elérhető lépés
    const hasMove = state.graph.nodes.some((n) => isReachable(n.id));
    if (!hasMove) {
      setFeedback('Zsákutca! Koppints a Visszalép vagy az Újra gombra!', 'warn');
    } else {
      setFeedback('Ügyes lépés! Merre tovább?');
    }

    renderStage();
  }

  function judgePossible(userSaysYes) {
    if (state.levelCompleted) return;
    if (userSaysYes === state.graph.isPossible) {
      addStars(1);
      state.levelCompleted = true;
      const msg = state.graph.isPossible
        ? 'Igazad van! Ez az útvonal valóban végigjárható!'
        : 'Zseniális! Túl sok szigethez vezet páratlan számú híd, ezért lehetetlen!';
      setFeedback(msg, 'success');
      speakMotivationalSuccess();
      renderStage();
      renderActionButtons();
    } else {
      playTone('error');
      setFeedback('Nem egészen! Próbáld meg végigjárni a hidakat, és meglátod!', 'warn');
      speakHu('Próbáld meg végigjárni a hidakat, és kiderül!');
    }
  }

  function renderActionButtons() {
    if (state.levelCompleted) {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-success" id="btn-next-level">
          Következő térkép →
        </button>
      `;
      document.getElementById('btn-next-level').addEventListener('click', () => {
        state.roundNum++;
        loadLevel();
      });
      return;
    }

    els.actionButtons.innerHTML = `
      <button type="button" class="btn btn-secondary" id="btn-undo-step">↩️ Visszalép</button>
      <button type="button" class="btn btn-secondary" id="btn-reset-path">🔄 Újra</button>
    `;

    document.getElementById('btn-undo-step').addEventListener('click', () => {
      if (state.pathNodes.length <= 1) return;
      state.pathNodes.pop();
      state.crossedEdgeIds.pop();
      state.currentNode = state.pathNodes[state.pathNodes.length - 1];
      playTone('step');
      renderStage();
    });

    document.getElementById('btn-reset-path').addEventListener('click', () => {
      state.currentNode = state.graph.startNode;
      state.pathNodes = [state.graph.startNode];
      state.crossedEdgeIds = [];
      playTone('step');
      renderStage();
    });
  }

  /* ========================================================================
     5. Eseménykezelők & Indítás
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
    speakHu(state.graph.speech);
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
