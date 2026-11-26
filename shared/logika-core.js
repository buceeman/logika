/**
 * Logika Műhely — Közös hang-, konfetti-, napi kaland- és haladáskezelő modul
 * Automatikusan fejleszti mind a 12 alkalmazást (magyar hangválasztó,
 * 5-csillagos konfetti-eső, globális némítás, nehézségi szint mentése,
 * napi 3 kaland és tanítói statisztika).
 */

(() => {
  'use strict';

  const APP_META = [
    { key: 'kovacs', slug: 'kovacs-muhelye', path: 'kovacs-muhelye/index.html', starKey: 'kovacs_stars', name: 'Kovács Műhelye', emoji: '🔨', badge: 'Halmaz-mester', skill: 'Halmazok & logikai tagadás' },
    { key: 'utveszto', slug: 'buvos-utveszto', path: 'buvos-utveszto/index.html', starKey: 'utveszto_stars', name: 'Bűvös Útvesztő', emoji: '🐓', badge: 'Útvesztő-bajnok', skill: 'Algoritmus & hibakeresés' },
    { key: 'merleg', slug: 'merleg-vasar', path: 'merleg-vasar/index.html', starKey: 'merleg_stars', name: 'Mérleg-Vásár', emoji: '⚖️', badge: 'Vásári mester', skill: 'Egyenértékűség & arányok' },
    { key: 'kameleon', slug: 'szabaly-kameleon', path: 'szabaly-kameleon/index.html', starKey: 'kameleon_stars', name: 'Szabály-Kaméleon', emoji: '🦎', badge: 'Dzsungel-detektív', skill: 'Rugalmas váltás & figyelem' },
    { key: 'tukor', slug: 'tukor-var', path: 'tukor-var/index.html', starKey: 'tukor_stars', name: 'Tükör-Vár', emoji: '🏰', badge: 'Térlátó lovag', skill: 'Szimmetria & térbeli forgatás' },
    { key: 'nyomozo', slug: 'erdei-nyomozo', path: 'erdei-nyomozo/index.html', starKey: 'nyomozo_stars', name: 'Erdei Nyomozó', emoji: '🦊', badge: 'Főnyomozó', skill: 'Kizárás & ellentmondás' },
    { key: 'suni', slug: 'postas-suni', path: 'postas-suni/index.html', starKey: 'suni_stars', name: 'Postás Süni', emoji: '🦔', badge: 'Gráf-bajnok', skill: 'Gráfelmélet & útvonal-tervezés' },
    { key: 'minta', slug: 'minta-vonat', path: 'minta-vonat/index.html', starKey: 'minta_stars', name: 'Minta-Vonat', emoji: '🚂', badge: 'Minta-mester', skill: 'Sorozatfelismerés & kakukktojás' },
    { key: 'vakond', slug: 'kertesz-vakond', path: 'kertesz-vakond/index.html', starKey: 'vakond_stars', name: 'Kertész Vakond', emoji: '🌻', badge: 'Kert-mester', skill: 'Mini-Sudoku & rács-logika' },
    { key: 'gep', slug: 'varazsgep', path: 'varazsgep/index.html', starKey: 'gep_stars', name: 'Varázsgép', emoji: '⚙️', badge: 'Gépész-mester', skill: 'Átalakítások & analógiák' },
    { key: 'mano', slug: 'ido-mano', path: 'ido-mano/index.html', starKey: 'mano_stars', name: 'Idő-Manó', emoji: '⏳', badge: 'Idő-mester', skill: 'Időrend, napok & óra-leolvasás' },
    { key: 'torony', slug: 'torony-epito', path: 'torony-epito/index.html', starKey: 'torony_stars', name: 'Torony-Építő', emoji: '🗼', badge: 'Torony-mester', skill: 'Kombinatorika & Hanoi-torony' },
  ];

  const STATS_KEY = 'logika_stats';
  const MUTED_KEY = 'logika_muted';
  const LAST_APP_KEY = 'logika_last_app';
  const DAILY_KEY = 'logika_daily';
  const STREAK_KEY = 'logika_streak';
  const DIFF_PREFIX = 'logika_diff_';

  const origGetItem = localStorage.getItem.bind(localStorage);
  const origSetItem = localStorage.setItem.bind(localStorage);
  const origRemoveItem = localStorage.removeItem.bind(localStorage);

  function getStats() {
    try {
      return JSON.parse(origGetItem(STATS_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveStats(stats) {
    try {
      origSetItem(STATS_KEY, JSON.stringify(stats));
    } catch (_) {}
  }

  function getAppStars(starKey) {
    return Number(origGetItem(starKey) || 0);
  }

  function getTotalStars() {
    return APP_META.reduce((sum, app) => sum + getAppStars(app.starKey), 0);
  }

  function getBadgeSummary() {
    const unlockedCount = APP_META.filter((app) => getAppStars(app.starKey) >= 5).length;
    return {
      unlockedCount,
      totalCount: APP_META.length,
      allUnlocked: unlockedCount === APP_META.length,
    };
  }

  function isMuted() {
    return origGetItem(MUTED_KEY) === '1';
  }

  function setMuted(muted) {
    try {
      origSetItem(MUTED_KEY, muted ? '1' : '0');
      if (muted && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
  }

  function toggleMuted() {
    const next = !isMuted();
    setMuted(next);
    return next;
  }

  function getDifficulty(appKey) {
    return origGetItem(DIFF_PREFIX + appKey) || 'easy';
  }

  function setDifficulty(appKey, diff) {
    if (diff === 'easy' || diff === 'medium' || diff === 'hard') {
      try {
        origSetItem(DIFF_PREFIX + appKey, diff);
      } catch (_) {}
    }
  }

  function getLastApp() {
    const key = origGetItem(LAST_APP_KEY);
    return APP_META.find((a) => a.key === key) || null;
  }

  function getDateKey(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getYesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getDateKey(d);
  }

  function pickDailyApps(dateKey) {
    let seed = 0;
    for (let i = 0; i < dateKey.length; i++) {
      seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
    }
    const pool = APP_META.map((a) => a.key);
    const chosen = [];
    while (chosen.length < 3 && pool.length > 0) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const idx = seed % pool.length;
      chosen.push(pool.splice(idx, 1)[0]);
    }
    return chosen;
  }

  function getDailyQuest() {
    const today = getDateKey();
    try {
      const saved = JSON.parse(origGetItem(DAILY_KEY) || 'null');
      if (saved && saved.date === today && Array.isArray(saved.apps) && saved.apps.length === 3) {
        return {
          date: today,
          apps: saved.apps,
          completed: Array.isArray(saved.completed) ? saved.completed : [],
        };
      }
    } catch (_) {}

    const fresh = {
      date: today,
      apps: pickDailyApps(today),
      completed: [],
    };
    try {
      origSetItem(DAILY_KEY, JSON.stringify(fresh));
    } catch (_) {}
    return fresh;
  }

  function getStreak() {
    const today = getDateKey();
    const yesterday = getYesterdayKey();
    try {
      const saved = JSON.parse(origGetItem(STREAK_KEY) || 'null');
      if (saved && typeof saved.count === 'number') {
        const active = saved.lastDate === today || saved.lastDate === yesterday;
        return {
          count: active ? saved.count : 0,
          lastDate: saved.lastDate || null,
          completedToday: saved.lastDate === today,
        };
      }
    } catch (_) {}
    return { count: 0, lastDate: null, completedToday: false };
  }

  function recordDailyProgress(appKey) {
    const daily = getDailyQuest();
    if (!daily.apps.includes(appKey) || daily.completed.includes(appKey)) {
      return false;
    }
    daily.completed.push(appKey);
    try {
      origSetItem(DAILY_KEY, JSON.stringify(daily));
    } catch (_) {}

    if (daily.completed.length === daily.apps.length) {
      const today = getDateKey();
      const yesterday = getYesterdayKey();
      const streak = getStreak();
      if (!streak.completedToday) {
        const nextCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
        try {
          origSetItem(STREAK_KEY, JSON.stringify({ count: nextCount, lastDate: today }));
        } catch (_) {}
      }
      launchConfetti();
      return true;
    }
    return false;
  }

  function resetAllProgress() {
    APP_META.forEach((app) => {
      origRemoveItem(app.starKey);
      origRemoveItem(DIFF_PREFIX + app.key);
    });
    origRemoveItem(STATS_KEY);
    origRemoveItem(DAILY_KEY);
    origRemoveItem(STREAK_KEY);
    origRemoveItem(LAST_APP_KEY);
  }

  /* ========================================================================
     1. Konfetti Animáció (5-csillagos mérföldköveknél & napi kalandnál)
     ======================================================================== */
  function launchConfetti() {
    if (!document.body) return;
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999;';

    const colors = ['#D95338', '#E09F3E', '#387D5A', '#2D5F9A', '#F4C95D'];
    for (let i = 0; i < 42; i++) {
      const piece = document.createElement('span');
      const left = Math.random() * 100;
      const delay = Math.random() * 0.35;
      const dur = 1.1 + Math.random() * 0.7;
      const size = 8 + Math.random() * 7;
      const color = colors[i % colors.length];
      piece.style.cssText = `
        position:absolute;
        top:-16px;
        left:${left}%;
        width:${size}px;
        height:${size * 0.6}px;
        background:${color};
        border-radius:2px;
        opacity:0.95;
        transform:rotate(${Math.random() * 360}deg);
        animation:logika-confetti-fall ${dur}s ease-in ${delay}s forwards;
      `;
      container.appendChild(piece);
    }

    if (!document.getElementById('logika-confetti-style')) {
      const style = document.createElement('style');
      style.id = 'logika-confetti-style';
      style.textContent = `
        @keyframes logika-confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(540deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 2200);
  }

  /* ========================================================================
     2. Intelligens Magyar Hangválasztó (hu-HU) + Globális Némítás
     ======================================================================== */
  let cachedHuVoice = null;
  function pickBestHuVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const huVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('hu'));
    if (huVoices.length === 0) return null;
    return (
      huVoices.find((v) => /google|natural|neural|microsoft/i.test(v.name)) ||
      huVoices[0]
    );
  }

  if ('speechSynthesis' in window) {
    cachedHuVoice = pickBestHuVoice();
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      cachedHuVoice = pickBestHuVoice();
    });

    const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = function (utterance) {
      if (isMuted()) return;
      if (utterance && !utterance.voice) {
        if (!cachedHuVoice) cachedHuVoice = pickBestHuVoice();
        if (cachedHuVoice) utterance.voice = cachedHuVoice;
      }
      return origSpeak(utterance);
    };
  }

  /* ========================================================================
     3. Automatikus Csillag, Napi Kaland & Statisztika Figyelő
     ======================================================================== */
  localStorage.setItem = function (key, value) {
    const matchedApp = APP_META.find((a) => a.starKey === key);
    if (matchedApp) {
      const prev = Number(origGetItem(key) || 0);
      const next = Number(value || 0);
      if (next > prev) {
        const stats = getStats();
        if (!stats[matchedApp.key]) stats[matchedApp.key] = { solved: 0 };
        stats[matchedApp.key].solved += next - prev;
        origSetItem(STATS_KEY, JSON.stringify(stats));
        recordDailyProgress(matchedApp.key);
        if (next % 5 === 0) {
          launchConfetti();
        }
      }
    }
    return origSetItem(key, value);
  };

  /* ========================================================================
     4. Automatikus Alkalmazás-szinkron (Hang & Nehézség & Utolsó játék)
     ======================================================================== */
  function detectCurrentApp() {
    const path = (window.location && window.location.pathname) || '';
    return APP_META.find((app) => path.includes(`/${app.slug}/`) || path.endsWith(`/${app.slug}`)) || null;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const currentApp = detectCurrentApp();
    if (currentApp) {
      try {
        origSetItem(LAST_APP_KEY, currentApp.key);
      } catch (_) {}
    }

    // Sync global mute button inside sub-apps
    const muteBtn = document.getElementById('btn-toggle-sound');
    if (muteBtn) {
      if (isMuted() && muteBtn.getAttribute('aria-pressed') !== 'false') {
        muteBtn.click();
      }
      muteBtn.addEventListener('click', () => {
        setTimeout(() => {
          setMuted(muteBtn.getAttribute('aria-pressed') === 'false');
        }, 0);
      });
    }

    // Sync difficulty persistence inside sub-apps
    if (currentApp) {
      const diffBtns = document.querySelectorAll('#difficulty-bar .diff-btn[data-diff]');
      if (diffBtns.length > 0) {
        const savedDiff = getDifficulty(currentApp.key);
        if (savedDiff && savedDiff !== 'easy') {
          const targetBtn = document.querySelector(`#difficulty-bar .diff-btn[data-diff="${savedDiff}"]`);
          if (targetBtn && !targetBtn.classList.contains('is-active')) {
            targetBtn.click();
          }
        }
        diffBtns.forEach((btn) => {
          btn.addEventListener('click', () => {
            if (btn.dataset.diff) {
              setDifficulty(currentApp.key, btn.dataset.diff);
            }
          });
        });
      }
    }
  });

  window.LogikaCore = {
    APP_META,
    getAppStars,
    getTotalStars,
    getBadgeSummary,
    getStats,
    saveStats,
    isMuted,
    setMuted,
    toggleMuted,
    getDifficulty,
    setDifficulty,
    getLastApp,
    getDailyQuest,
    getStreak,
    resetAllProgress,
    launchConfetti,
  };
})();
