/**
 * Bűvös Útvesztő — CS Unplugged algoritmikus gondolkodás és hibakeresés
 * 1. osztályos magyar kisiskolásoknak
 */

(() => {
  'use strict';

  const CMD_META = {
    up: { icon: '⬆️', label: 'Fel', dr: -1, dc: 0 },
    down: { icon: '⬇️', label: 'Le', dr: 1, dc: 0 },
    left: { icon: '⬅️', label: 'Balra', dr: 0, dc: -1 },
    right: { icon: '➡️', label: 'Jobbra', dr: 0, dc: 1 },
    jump: { icon: '🍄', label: 'Ugrás', dr: 0, dc: 0 },
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

      if (type === 'step') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.14);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.17);
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
        osc.frequency.linearRampToValueAtTime(140, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
        osc.start(now);
        osc.stop(now + 0.25);
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
    'Szuper tervezés! Előre végiggondoltad az egész utat!',
    'Bravó! A kiskakas pontosan célba ért!',
    'Fantasztikus! Így gondolkodik egy igazi kis programozó!',
    'Nagyszerű! Minden lépéskő a helyén volt!',
    'Ügyes vagy! Pontosan kikerülted a pocsolyákat!',
  ];

  const MOTIVATIONAL_DEBUG_SUCCESS = [
    'Megtaláltad a manó hibáját! Szuper hibakereső vagy!',
    'Ügyesen kijavítottad a hibás lépéskövet!',
    'Bravó! A manó trükkje nem fogott ki rajtad!',
  ];

  const MOTIVATIONAL_RETRY = [
    'Semmi baj! Nézd meg, melyik lépésnél tért le a kiskakas!',
    'Majdnem jó! Keresd meg a pirossal jelölt lépéskövet!',
    'Próbáld újra! Kövesd végig az ujjaddal az utat!',
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function speakMotivationalSuccess(isDebug) {
    if (state.stars > 0 && state.stars % 5 === 0) {
      playTone('fanfare');
      speakHu(`Hűha! Már ${state.stars} csillagot gyűjtöttél az útvesztőben!`);
    } else {
      playTone('success');
      speakHu(pickRandom(isDebug ? MOTIVATIONAL_DEBUG_SUCCESS : MOTIVATIONAL_SUCCESS));
    }
  }

  /* ========================================================================
     2. Pályák (4×4 és 5×5 Meseerdő)
     Jelölések: '.' szabad, 'P' pocsolya, 'B' bokor, 'M' gomba, 'G' kincs
     ======================================================================== */
  const BUILD_LEVELS = [
    {
      title: '1. térkép — Első lépések',
      prompt: 'Vezesd el a kiskakast az aranytallérhoz!',
      speech: 'Állíts össze lépésköveket, hogy a kiskakas eljusson az aranytallérhoz!',
      size: 4,
      start: { r: 3, c: 0 },
      goal: { r: 1, c: 2 },
      obstacles: [
        { r: 2, c: 0, type: 'P' },
        { r: 2, c: 1, type: 'B' },
        { r: 1, c: 1, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '2. térkép — Kanyargós ösvény',
      prompt: 'Kerüld ki a pocsolyákat és a bokrokat!',
      speech: 'Kerüld ki a pocsolyákat, és tervezd meg előre az utat!',
      size: 4,
      start: { r: 3, c: 3 },
      goal: { r: 0, c: 0 },
      obstacles: [
        { r: 2, c: 3, type: 'B' },
        { r: 2, c: 1, type: 'P' },
        { r: 1, c: 1, type: 'B' },
        { r: 0, c: 2, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '3. térkép — Fentről lefelé',
      prompt: 'Most felülről indulunk! Merre kell menni?',
      speech: 'Most felülről indul a kiskakas! Merre kell mennie a kincshez?',
      size: 4,
      start: { r: 0, c: 0 },
      goal: { r: 3, c: 3 },
      obstacles: [
        { r: 0, c: 2, type: 'P' },
        { r: 1, c: 1, type: 'B' },
        { r: 2, c: 2, type: 'P' },
        { r: 3, c: 1, type: 'B' },
      ],
      initialSteps: [],
    },
    {
      title: '4. térkép — Híd a patakon',
      prompt: 'Csak egy szűk átjáró van a pocsolyák között!',
      speech: 'Keresd meg a keskeny ösvényt a pocsolyák között!',
      size: 4,
      start: { r: 2, c: 0 },
      goal: { r: 2, c: 3 },
      obstacles: [
        { r: 0, c: 2, type: 'P' },
        { r: 1, c: 2, type: 'P' },
        { r: 2, c: 2, type: 'B' },
        { r: 3, c: 1, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '5. térkép — Nagyobb erdő (5×5)',
      prompt: 'Most egy 5×5-ös erdőben kell megtalálni a kincset!',
      speech: 'Figyelj jól! Ez egy nagyobb erdő, számold ki a lépéseket!',
      size: 5,
      start: { r: 4, c: 0 },
      goal: { r: 0, c: 4 },
      obstacles: [
        { r: 3, c: 0, type: 'P' },
        { r: 3, c: 1, type: 'B' },
        { r: 2, c: 3, type: 'P' },
        { r: 1, c: 3, type: 'B' },
        { r: 1, c: 1, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '6. térkép — Csigavonal',
      prompt: 'Kerüld meg a nagy bokorsort a kincsért!',
      speech: 'Kerüld meg a bokorsort, úgy jutsz el a tallérhoz!',
      size: 5,
      start: { r: 4, c: 4 },
      goal: { r: 2, c: 2 },
      obstacles: [
        { r: 3, c: 2, type: 'B' },
        { r: 3, c: 3, type: 'B' },
        { r: 2, c: 3, type: 'P' },
        { r: 1, c: 1, type: 'B' },
        { r: 1, c: 2, type: 'P' },
        { r: 1, c: 3, type: 'B' },
      ],
      initialSteps: [],
    },
    {
      title: '7. térkép — Erdei labirintus (5×5)',
      prompt: 'Válaszd a tiszta ösvényt a sűrű erdőben!',
      speech: 'Válaszd a tiszta ösvényt a sűrű erdőben!',
      size: 5,
      start: { r: 0, c: 4 },
      goal: { r: 4, c: 0 },
      obstacles: [
        { r: 0, c: 2, type: 'B' },
        { r: 1, c: 2, type: 'P' },
        { r: 2, c: 2, type: 'B' },
        { r: 3, c: 1, type: 'P' },
        { r: 2, c: 4, type: 'P' },
        { r: 4, c: 2, type: 'B' },
      ],
      initialSteps: [],
    },
    {
      title: '8. térkép — Óriás Meseerdő (6×6)',
      prompt: 'Igazi mesterpróba a 6×6-os meseerdőben!',
      speech: 'Igazi mesterpróba! Vezesd át a kiskakast az óriás meseerdőn!',
      size: 6,
      start: { r: 5, c: 0 },
      goal: { r: 0, c: 5 },
      obstacles: [
        { r: 4, c: 0, type: 'P' },
        { r: 4, c: 1, type: 'B' },
        { r: 4, c: 2, type: 'P' },
        { r: 2, c: 1, type: 'B' },
        { r: 2, c: 2, type: 'B' },
        { r: 2, c: 4, type: 'P' },
        { r: 1, c: 4, type: 'B' },
        { r: 0, c: 3, type: 'P' },
      ],
      initialSteps: [],
    },
  ];

  const DEBUG_LEVELS = [
    {
      title: '1. manó-hiba — Egy rossz kő',
      prompt: 'A manó elrontott egy lépéskövet! Próbáld ki, és javítsd ki a hibát!',
      speech: 'A manó elrontotta az utat! Nyomd meg a Kipróbálom gombot, és cseréld ki a hibás követ!',
      size: 4,
      start: { r: 3, c: 0 },
      goal: { r: 1, c: 2 },
      obstacles: [
        { r: 2, c: 1, type: 'P' },
        { r: 1, c: 1, type: 'B' },
      ],
      initialSteps: ['right', 'down', 'up', 'up'],
    },
    {
      title: '2. manó-hiba — Pocsolyaveszély',
      prompt: 'Valahol belelép a pocsolyába! Keresd meg a hibás lépést!',
      speech: 'Valahol pocsolyába lép a kiskakas! Keresd meg és javítsd ki a hibát!',
      size: 4,
      start: { r: 3, c: 3 },
      goal: { r: 0, c: 1 },
      obstacles: [
        { r: 2, c: 2, type: 'P' },
        { r: 1, c: 2, type: 'B' },
        { r: 0, c: 3, type: 'P' },
      ],
      initialSteps: ['up', 'left', 'up', 'left', 'up'],
    },
    {
      title: '3. manó-hiba — Fordított irány',
      prompt: 'A manó megfordította az egyik nyilat! Melyiket?',
      speech: 'A manó megfordította az egyik nyilat! Találd meg, melyiket!',
      size: 4,
      start: { r: 0, c: 0 },
      goal: { r: 3, c: 2 },
      obstacles: [
        { r: 1, c: 0, type: 'B' },
        { r: 1, c: 1, type: 'P' },
        { r: 2, c: 3, type: 'P' },
      ],
      initialSteps: ['right', 'right', 'down', 'left', 'down'],
    },
    {
      title: '4. manó-hiba — Két hiba is van!',
      prompt: 'Most a manó két követ is elcserélt! Javítsd ki mindkettőt!',
      speech: 'Vigyázz, most két hibás kő is van az útban! Javítsd ki mindkettőt!',
      size: 5,
      start: { r: 4, c: 1 },
      goal: { r: 1, c: 4 },
      obstacles: [
        { r: 3, c: 1, type: 'B' },
        { r: 3, c: 3, type: 'P' },
        { r: 2, c: 2, type: 'P' },
        { r: 1, c: 2, type: 'B' },
      ],
      initialSteps: ['right', 'left', 'right', 'up', 'down', 'up'],
    },
    {
      title: '5. manó-hiba — Az erdei kanyar',
      prompt: 'Túl hamar fordul a kiskakas! Javítsd ki a kanyart!',
      speech: 'Túl hamar fordul a kiskakas! Keresd meg, hol kell kijavítani!',
      size: 5,
      start: { r: 4, c: 0 },
      goal: { r: 0, c: 3 },
      obstacles: [
        { r: 3, c: 0, type: 'P' },
        { r: 2, c: 1, type: 'B' },
        { r: 2, c: 2, type: 'P' },
        { r: 1, c: 4, type: 'B' },
      ],
      initialSteps: ['right', 'up', 'right', 'up', 'up', 'up', 'right'],
    },
    {
      title: '6. manó-hiba — Bokorcsapda',
      prompt: 'Két hiba is elrejtőzött a hosszú útban!',
      speech: 'Két hiba is elrejtőzött ebben az útban! Vizsgáld meg lépésről lépésre!',
      size: 5,
      start: { r: 0, c: 4 },
      goal: { r: 4, c: 1 },
      obstacles: [
        { r: 1, c: 4, type: 'B' },
        { r: 1, c: 2, type: 'P' },
        { r: 2, c: 2, type: 'B' },
        { r: 3, c: 2, type: 'P' },
        { r: 3, c: 0, type: 'B' },
      ],
      initialSteps: ['left', 'left', 'down', 'down', 'down', 'left', 'up'],
    },
    {
      title: '7. manó-hiba — A kincs előtt',
      prompt: 'Már majdnem odaért, de az utolsó előtti lépések rosszak!',
      speech: 'Már majdnem odaért, de az utolsó lépéseknél trükközött a manó!',
      size: 5,
      start: { r: 4, c: 4 },
      goal: { r: 0, c: 0 },
      obstacles: [
        { r: 3, c: 4, type: 'P' },
        { r: 2, c: 2, type: 'B' },
        { r: 1, c: 2, type: 'P' },
        { r: 1, c: 0, type: 'B' },
      ],
      initialSteps: ['left', 'up', 'up', 'up', 'left', 'left', 'down', 'left'],
    },
    {
      title: '8. manó-hiba — Óriás erdő (6×6)',
      prompt: 'Nagy 6×6-os pálya két manó-hibával! Megtalálod őket?',
      speech: 'Nagy pálya két manó-hibával! Megtalálod mindkettőt?',
      size: 6,
      start: { r: 5, c: 1 },
      goal: { r: 0, c: 4 },
      obstacles: [
        { r: 4, c: 1, type: 'B' },
        { r: 3, c: 3, type: 'P' },
        { r: 2, c: 3, type: 'B' },
        { r: 1, c: 1, type: 'P' },
        { r: 1, c: 5, type: 'B' },
      ],
      initialSteps: ['right', 'right', 'up', 'up', 'left', 'up', 'up', 'up', 'down', 'right'],
    },
  ];

  const MUSHROOM_LEVELS = [
    {
      title: '1. gomba-ugrás — Ugorj át rajta!',
      prompt: 'Lépj a gomba elé, majd használd a 🍄 Ugrás követ!',
      speech: 'Ha gomba van előtted, használd a Gomba Ugrás követ, hogy átugord!',
      size: 4,
      start: { r: 2, c: 0 },
      goal: { r: 2, c: 3 },
      obstacles: [
        { r: 2, c: 1, type: 'M' },
        { r: 1, c: 1, type: 'B' },
        { r: 3, c: 1, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '2. gomba-ugrás — Kanyar és ugrás',
      prompt: 'Fordulj felfelé, és ugorj át a varázsgombán!',
      speech: 'Fordulj felfelé, és ugorj át a gombán a kincshez!',
      size: 4,
      start: { r: 3, c: 0 },
      goal: { r: 0, c: 2 },
      obstacles: [
        { r: 1, c: 2, type: 'M' },
        { r: 2, c: 1, type: 'P' },
        { r: 1, c: 1, type: 'B' },
        { r: 0, c: 1, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '3. gomba-ugrás — Balra ugrás',
      prompt: 'Most balra kell fordulnod, mielőtt átugrod a gombát!',
      speech: 'Most balra kell fordulnod, mielőtt átugrod a gombát!',
      size: 4,
      start: { r: 3, c: 3 },
      goal: { r: 1, c: 0 },
      obstacles: [
        { r: 1, c: 1, type: 'M' },
        { r: 2, c: 2, type: 'P' },
        { r: 0, c: 1, type: 'B' },
        { r: 2, c: 1, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '4. gomba-ugrás — Dupla akadály (5×5)',
      prompt: 'Egy gomba és egy pocsolya is az útban van. Tervezd meg okosan!',
      speech: 'Egy gomba és egy pocsolya is az útban van. Tervezd meg okosan az utat!',
      size: 5,
      start: { r: 4, c: 0 },
      goal: { r: 0, c: 3 },
      obstacles: [
        { r: 4, c: 2, type: 'M' },
        { r: 2, c: 3, type: 'M' },
        { r: 3, c: 2, type: 'P' },
        { r: 2, c: 2, type: 'B' },
        { r: 1, c: 2, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '5. gomba-ugrás — Két gomba egymás után',
      prompt: 'Két varázsgombát is át kell ugranod az aranyért!',
      speech: 'Két varázsgombát is át kell ugranod az aranytallérért!',
      size: 5,
      start: { r: 2, c: 0 },
      goal: { r: 2, c: 4 },
      obstacles: [
        { r: 2, c: 1, type: 'M' },
        { r: 2, c: 3, type: 'M' },
        { r: 1, c: 1, type: 'P' },
        { r: 3, c: 1, type: 'B' },
        { r: 1, c: 3, type: 'B' },
        { r: 3, c: 3, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '6. gomba-ugrás — Lefelé ugrás',
      prompt: 'Indulj fentről, és ugorj át a gombán lefelé!',
      speech: 'Indulj fentről, és ugorj át a gombán lefelé!',
      size: 5,
      start: { r: 0, c: 2 },
      goal: { r: 4, c: 4 },
      obstacles: [
        { r: 1, c: 2, type: 'M' },
        { r: 3, c: 3, type: 'M' },
        { r: 1, c: 1, type: 'P' },
        { r: 1, c: 3, type: 'B' },
        { r: 2, c: 3, type: 'P' },
      ],
      initialSteps: [],
    },
    {
      title: '7. gomba-ugrás — Gombakert (5×5)',
      prompt: 'Válaszd ki, melyik gombán érdemes átugrani!',
      speech: 'Válaszd ki, melyik gombán érdemes átugrani!',
      size: 5,
      start: { r: 4, c: 4 },
      goal: { r: 0, c: 0 },
      obstacles: [
        { r: 3, c: 4, type: 'M' },
        { r: 1, c: 1, type: 'M' },
        { r: 4, c: 2, type: 'P' },
        { r: 3, c: 3, type: 'B' },
        { r: 2, c: 2, type: 'P' },
        { r: 0, c: 2, type: 'B' },
      ],
      initialSteps: [],
    },
    {
      title: '8. gomba-ugrás — Óriás Gombaerdő (6×6)',
      prompt: '6×6-os gombaerdő! Tervezd meg a nagy ugrásokat!',
      speech: 'Óriás gombaerdő! Tervezd meg a nagy ugrásokat!',
      size: 6,
      start: { r: 5, c: 0 },
      goal: { r: 0, c: 5 },
      obstacles: [
        { r: 5, c: 2, type: 'M' },
        { r: 3, c: 4, type: 'M' },
        { r: 1, c: 5, type: 'M' },
        { r: 4, c: 1, type: 'P' },
        { r: 4, c: 2, type: 'B' },
        { r: 3, c: 2, type: 'P' },
        { r: 2, c: 4, type: 'B' },
      ],
      initialSteps: [],
    },
  ];

  /* ========================================================================
     3. Végtelen Pályagenerátor (BFS-sel garantáltan megoldható, 4×4–6×6)
     ======================================================================== */
  function findShortestPath(size, start, goal, obstacles, allowMushroomJump) {
    const obsMap = new Map();
    obstacles.forEach((o) => obsMap.set(`${o.r},${o.c}`, o.type));

    const queue = [{ r: start.r, c: start.c, dir: 'right', path: [] }];
    const visited = new Set([`${start.r},${start.c},right`]);

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr.r === goal.r && curr.c === goal.c) {
        return curr.path;
      }

      for (const dir of ['up', 'down', 'left', 'right']) {
        const { dr, dc } = CMD_META[dir];
        const nr = curr.r + dr;
        const nc = curr.c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

        const cellType = obsMap.get(`${nr},${nc}`);
        if (!cellType) {
          const key = `${nr},${nc},${dir}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ r: nr, c: nc, dir, path: [...curr.path, dir] });
          }
        } else if (allowMushroomJump && cellType === 'M') {
          const jr = nr + dr;
          const jc = nc + dc;
          if (jr >= 0 && jr < size && jc >= 0 && jc < size && !obsMap.get(`${jr},${jc}`)) {
            if (curr.dir === dir) {
              const key = `${jr},${jc},${dir}`;
              if (!visited.has(key)) {
                visited.add(key);
                queue.push({ r: jr, c: jc, dir, path: [...curr.path, 'jump'] });
              }
            }
          }
        }
      }
    }
    return null;
  }

  function generateInfiniteMaze(mode, roundNum) {
    const size = roundNum <= 2 ? 4 : roundNum <= 6 ? 5 : 6;
    const allowMushroom = mode === 'mushroom';

    for (let attempt = 0; attempt < 120; attempt++) {
      // Változatos indulási és célpontok (nem csak alulról felfelé)
      const start = {
        r: Math.floor(Math.random() * size),
        c: Math.floor(Math.random() * size),
      };
      const goal = {
        r: Math.floor(Math.random() * size),
        c: Math.floor(Math.random() * size),
      };
      const dist = Math.abs(start.r - goal.r) + Math.abs(start.c - goal.c);
      if (dist < size - 1) continue;

      const obstacles = [];
      const obsCount = size === 4 ? 4 : size === 5 ? 6 : 9;
      for (let i = 0; i < obsCount; i++) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        if ((r === start.r && c === start.c) || (r === goal.r && c === goal.c)) continue;
        if (obstacles.some((o) => o.r === r && o.c === c)) continue;
        const type =
          allowMushroom && i < 2 ? 'M' : Math.random() < 0.5 ? 'P' : 'B';
        obstacles.push({ r, c, type });
      }

      const path = findShortestPath(size, start, goal, obstacles, allowMushroom);
      if (!path || path.length < 3 || path.length > 14) continue;
      if (allowMushroom && !path.includes('jump')) continue;

      if (mode === 'debug') {
        const buggy = path.slice();
        const bugCount = roundNum >= 4 && buggy.length >= 5 ? 2 : 1;
        const usedIdx = new Set();
        for (let b = 0; b < bugCount; b++) {
          let bugIdx = Math.floor(Math.random() * buggy.length);
          while (usedIdx.has(bugIdx)) {
            bugIdx = Math.floor(Math.random() * buggy.length);
          }
          usedIdx.add(bugIdx);
          const dirs = ['up', 'down', 'left', 'right'].filter((d) => d !== buggy[bugIdx]);
          buggy[bugIdx] = pickRandom(dirs);
        }
        return {
          title: `∞ Végtelen Manó-hiba — ${roundNum}. kör (${size}×${size})`,
          prompt:
            bugCount === 2
              ? 'A manó két követ is elrontott! Keresd meg és javítsd ki őket!'
              : 'A manó elrontott egy követ ebben az útban! Keresd meg és javítsd ki!',
          speech: 'Végtelen kör! Keresd meg a manó hibáját és javítsd ki!',
          size,
          start,
          goal,
          obstacles,
          initialSteps: buggy,
        };
      }

      return {
        title: `∞ Végtelen Útvesztő — ${roundNum}. kör (${size}×${size})`,
        prompt: allowMushroom
          ? 'Használd a 🍄 Ugrás követ a gombánál, és juss el a kincshez!'
          : 'Vezesd el a kiskakast az aranytallérhoz!',
        speech: 'Új térkép! Tervezd meg előre a kiskakas útját!',
        size,
        start,
        goal,
        obstacles,
        initialSteps: [],
      };
    }

    return BUILD_LEVELS[0];
  }

  /* ========================================================================
     4. Játékállapot & DOM
     ======================================================================== */
  const state = {
    mode: 'build', // 'build' | 'debug' | 'mushroom'
    levelIdx: { build: 0, debug: 0, mushroom: 0 },
    infiniteMode: false,
    infiniteRound: { build: 1, debug: 1, mushroom: 1 },
    generatedLevel: null,
    stars: Number(localStorage.getItem('utveszto_stars') || 0),
    steps: [],
    selectedSlotIdx: null, // Debug módban csere-kijelölés
    isRunning: false,
    levelCompleted: false,
    playerPos: { r: 0, c: 0 },
    visitedCells: new Set(),
    crashCell: null,
    bugStepIdx: null,
    runningStepIdx: null,
  };

  const els = {
    starCount: document.getElementById('star-count-value'),
    btnInfiniteMode: document.getElementById('btn-infinite-mode'),
    btnReplayVoice: document.getElementById('btn-replay-voice'),
    btnToggleSound: document.getElementById('btn-toggle-sound'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    levelBadge: document.getElementById('level-badge'),
    promptInstruction: document.getElementById('prompt-instruction'),
    mazeGrid: document.getElementById('maze-grid'),
    legendMushroom: document.getElementById('legend-mushroom'),
    btnCmdJump: document.getElementById('btn-cmd-jump'),
    debugHintBox: document.getElementById('debug-hint-box'),
    stepCountLabel: document.getElementById('step-count-label'),
    sequenceTrack: document.getElementById('sequence-track'),
    btnClearSteps: document.getElementById('btn-clear-steps'),
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackText: document.getElementById('feedback-text'),
    actionButtons: document.getElementById('action-buttons'),
  };

  function addStars(n) {
    state.stars += n;
    localStorage.setItem('utveszto_stars', String(state.stars));
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
    if (state.mode === 'build') return BUILD_LEVELS[state.levelIdx.build];
    if (state.mode === 'debug') return DEBUG_LEVELS[state.levelIdx.debug];
    return MUSHROOM_LEVELS[state.levelIdx.mushroom];
  }

  /* ========================================================================
     5. Renderelés
     ======================================================================== */
  function loadLevel() {
    if (state.infiniteMode) {
      state.generatedLevel = generateInfiniteMaze(state.mode, state.infiniteRound[state.mode]);
    }
    const lvl = getCurrentLevel();

    state.steps = lvl.initialSteps ? lvl.initialSteps.slice() : [];
    state.selectedSlotIdx = null;
    state.isRunning = false;
    state.levelCompleted = false;
    state.playerPos = { ...lvl.start };
    state.visitedCells = new Set([`${lvl.start.r},${lvl.start.c}`]);
    state.crashCell = null;
    state.bugStepIdx = null;
    state.runningStepIdx = null;

    els.levelBadge.textContent = lvl.title;
    els.promptInstruction.textContent = lvl.prompt;

    const showMushroom = state.mode === 'mushroom';
    els.btnCmdJump.style.display = showMushroom ? 'inline-flex' : 'none';
    els.legendMushroom.style.display = showMushroom ? 'inline' : 'none';
    els.debugHintBox.style.display = state.mode === 'debug' ? 'block' : 'none';

    setFeedback(
      state.mode === 'debug'
        ? 'Nyomd meg a Kipróbálom gombot, és figyeld, hol rontotta el a manó!'
        : 'Koppints a nyilakra az út megépítéséhez, majd indítsd el a kiskakast!'
    );

    renderMaze();
    renderSequence();
    renderActionButtons();
    speakHu(lvl.speech);
  }

  function renderMaze() {
    const lvl = getCurrentLevel();
    els.mazeGrid.style.gridTemplateColumns = `repeat(${lvl.size}, 1fr)`;
    els.mazeGrid.innerHTML = '';

    const obsMap = new Map();
    lvl.obstacles.forEach((o) => obsMap.set(`${o.r},${o.c}`, o.type));

    for (let r = 0; r < lvl.size; r++) {
      for (let c = 0; c < lvl.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'maze-cell';
        const key = `${r},${c}`;
        const obs = obsMap.get(key);

        if (obs === 'P') {
          cell.classList.add('is-puddle');
          cell.textContent = '💧';
        } else if (obs === 'B') {
          cell.classList.add('is-bush');
          cell.textContent = '🌿';
        } else if (obs === 'M') {
          cell.classList.add('is-mushroom');
          cell.textContent = '🍄';
        } else if (r === lvl.goal.r && c === lvl.goal.c) {
          cell.classList.add('is-goal');
          cell.textContent = '🪙';
        }

        if (state.visitedCells.has(key)) {
          cell.classList.add('is-visited');
        }
        if (state.crashCell && state.crashCell.r === r && state.crashCell.c === c) {
          cell.classList.add('is-crash');
        }

        if (state.playerPos.r === r && state.playerPos.c === c) {
          cell.innerHTML = `<span class="player-sprite">🐓</span>`;
        }

        els.mazeGrid.appendChild(cell);
      }
    }
  }

  function renderSequence() {
    els.stepCountLabel.textContent = `${state.steps.length} lépés`;
    els.sequenceTrack.innerHTML = '';

    if (state.steps.length === 0) {
      els.sequenceTrack.innerHTML =
        '<span style="color:var(--ink-muted); font-size:0.9rem;">Még üres az ösvény. Koppints a fenti nyilakra!</span>';
      return;
    }

    state.steps.forEach((cmd, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'step-stone';
      if (state.runningStepIdx === idx) btn.classList.add('is-running');
      if (state.bugStepIdx === idx) btn.classList.add('is-bug-hit');
      if (state.selectedSlotIdx === idx) btn.classList.add('is-selected-slot');

      btn.innerHTML = `
        <span class="step-num">${idx + 1}</span>
        <span>${CMD_META[cmd].icon}</span>
      `;
      btn.title = state.mode === 'debug' ? 'Koppints a cseréhez' : 'Koppints a törléshez';

      btn.addEventListener('click', () => {
        if (state.isRunning || state.levelCompleted) return;
        if (state.mode === 'debug') {
          state.selectedSlotIdx = state.selectedSlotIdx === idx ? null : idx;
          renderSequence();
        } else {
          state.steps.splice(idx, 1);
          state.bugStepIdx = null;
          playTone('step');
          renderSequence();
        }
      });

      els.sequenceTrack.appendChild(btn);
    });
  }

  function renderActionButtons() {
    if (state.levelCompleted) {
      els.actionButtons.innerHTML = `
        <button type="button" class="btn btn-success" id="btn-next-level">
          Következő pálya →
        </button>
      `;
      document.getElementById('btn-next-level').addEventListener('click', goNextLevel);
      return;
    }

    const runLabel = state.mode === 'debug' ? '▶️ Kipróbálom!' : '▶️ Indulás!';
    const rerollBtn = state.infiniteMode
      ? '<button type="button" class="btn btn-secondary" id="btn-new-map">🎲 Új térkép</button>'
      : '';
    els.actionButtons.innerHTML = `
      ${rerollBtn}
      <button type="button" class="btn btn-secondary" id="btn-reset-pos">↩️ Vissza az elejére</button>
      <button type="button" class="btn btn-primary" id="btn-run-path">${runLabel}</button>
    `;
    if (state.infiniteMode) {
      document.getElementById('btn-new-map').addEventListener('click', () => {
        if (state.isRunning) return;
        loadLevel();
      });
    }
    document.getElementById('btn-reset-pos').addEventListener('click', resetPlayerToStart);
    document.getElementById('btn-run-path').addEventListener('click', runProgram);
  }

  function resetPlayerToStart() {
    if (state.isRunning) return;
    const lvl = getCurrentLevel();
    state.playerPos = { ...lvl.start };
    state.visitedCells = new Set([`${lvl.start.r},${lvl.start.c}`]);
    state.crashCell = null;
    state.bugStepIdx = null;
    state.runningStepIdx = null;
    renderMaze();
    renderSequence();
  }

  /* ========================================================================
     6. Algoritmus Futtatása Lépésről Lépésre
     ======================================================================== */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runProgram() {
    if (state.isRunning || state.levelCompleted) return;
    if (state.steps.length === 0) {
      setFeedback('Először rakj le legalább egy lépéskövet!', 'warn');
      speakHu('Először rakj le lépésköveket!');
      return;
    }

    const lvl = getCurrentLevel();
    const obsMap = new Map();
    lvl.obstacles.forEach((o) => obsMap.set(`${o.r},${o.c}`, o.type));

    state.isRunning = true;
    state.playerPos = { ...lvl.start };
    state.visitedCells = new Set([`${lvl.start.r},${lvl.start.c}`]);
    state.crashCell = null;
    state.bugStepIdx = null;
    state.selectedSlotIdx = null;
    let lastDir = 'right';

    renderMaze();
    renderSequence();

    for (let i = 0; i < state.steps.length; i++) {
      state.runningStepIdx = i;
      renderSequence();
      await sleep(360);

      const cmd = state.steps[i];
      let nr = state.playerPos.r;
      let nc = state.playerPos.c;

      if (cmd === 'jump') {
        const { dr, dc } = CMD_META[lastDir];
        const midR = nr + dr;
        const midC = nc + dc;
        if (obsMap.get(`${midR},${midC}`) !== 'M') {
          failAtStep(i, { r: nr, c: nc }, 'Itt nincs előtted gomba, amin átugorhatnál!');
          return;
        }
        nr = nr + dr * 2;
        nc = nc + dc * 2;
        playTone('jump');
      } else {
        lastDir = cmd;
        const { dr, dc } = CMD_META[cmd];
        nr += dr;
        nc += dc;
        playTone('step');
      }

      // Pályahatár ellenőrzése
      if (nr < 0 || nr >= lvl.size || nc < 0 || nc >= lvl.size) {
        failAtStep(i, state.playerPos, `A ${i + 1}. lépésnél a kiskakas lelépett a pályáról!`);
        return;
      }

      const hitObs = obsMap.get(`${nr},${nc}`);
      if (hitObs === 'P' || hitObs === 'B' || hitObs === 'M') {
        const msg =
          hitObs === 'P'
            ? `Hoppá! A ${i + 1}. lépésnél pocsolyába lépett!`
            : hitObs === 'M'
              ? `A ${i + 1}. lépésnél gomba van az útban! Használd a 🍄 Ugrást!`
              : `Ajjaj! A ${i + 1}. lépésnél bokorba ütközött!`;
        failAtStep(i, { r: nr, c: nc }, msg);
        return;
      }

      state.playerPos = { r: nr, c: nc };
      state.visitedCells.add(`${nr},${nc}`);
      renderMaze();

      if (nr === lvl.goal.r && nc === lvl.goal.c) {
        state.isRunning = false;
        state.runningStepIdx = null;
        state.levelCompleted = true;
        addStars(1);
        setFeedback('Szuper! A kiskakas elérte az aranytallért!', 'success');
        speakMotivationalSuccess(state.mode === 'debug');
        renderSequence();
        renderActionButtons();
        return;
      }
    }

    // Elfogyott a lépés, de nem ért célba
    state.isRunning = false;
    state.runningStepIdx = null;
    state.bugStepIdx = state.steps.length - 1;
    playTone('error');
    setFeedback('Elfogyott a lépés, de még nem értük el a kincset! Adj hozzá vagy javíts!', 'warn');
    speakHu(pickRandom(MOTIVATIONAL_RETRY));
    renderSequence();
  }

  function failAtStep(stepIdx, crashPos, msg) {
    state.isRunning = false;
    state.runningStepIdx = null;
    state.bugStepIdx = stepIdx;
    state.crashCell = crashPos;
    playTone('error');
    setFeedback(msg, 'warn');
    speakHu(pickRandom(MOTIVATIONAL_RETRY));
    renderMaze();
    renderSequence();
  }

  /* ========================================================================
     7. Eseménykezelők & Indítás
     ======================================================================== */
  document.querySelectorAll('#stone-palette .cmd-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.isRunning || state.levelCompleted) return;
      const cmd = btn.dataset.cmd;
      playTone('step');

      if (state.mode === 'debug' && state.selectedSlotIdx !== null) {
        state.steps[state.selectedSlotIdx] = cmd;
        state.selectedSlotIdx = null;
        state.bugStepIdx = null;
      } else if (state.steps.length < 20) {
        state.steps.push(cmd);
        state.bugStepIdx = null;
      }
      renderSequence();
    });
  });

  els.btnClearSteps.addEventListener('click', () => {
    if (state.isRunning || state.levelCompleted) return;
    state.steps = [];
    state.selectedSlotIdx = null;
    state.bugStepIdx = null;
    resetPlayerToStart();
  });

  els.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.mode;
      if (nextMode === state.mode || state.isRunning) return;
      state.mode = nextMode;
      els.modeTabs.forEach((t) => t.classList.toggle('is-active', t.dataset.mode === nextMode));
      loadLevel();
    });
  });

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
    const lists = { build: BUILD_LEVELS, debug: DEBUG_LEVELS, mushroom: MUSHROOM_LEVELS };
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

  els.btnInfiniteMode.addEventListener('click', () => {
    if (state.isRunning) return;
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

  els.starCount.textContent = String(state.stars);
  loadLevel();
})();
