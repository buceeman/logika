/**
 * Logika Műhely — Közös hang-, konfetti- és haladáskezelő modul
 * Automatikusan fejleszti mind a 6 alkalmazást (magyar hangválasztó,
 * 5-csillagos konfetti-eső, globális némítás és tanítói statisztika).
 */

(() => {
  'use strict';

  const APP_META = [
    { key: 'kovacs', starKey: 'kovacs_stars', name: 'Kovács Műhelye', emoji: '🔨', badge: 'Halmaz-mester', skill: 'Halmazok & logikai tagadás' },
    { key: 'utveszto', starKey: 'utveszto_stars', name: 'Bűvös Útvesztő', emoji: '🐓', badge: 'Útvesztő-bajnok', skill: 'Algoritmus & hibakeresés' },
    { key: 'merleg', starKey: 'merleg_stars', name: 'Mérleg-Vásár', emoji: '⚖️', badge: 'Vásári mester', skill: 'Egyenértékűség & arányok' },
    { key: 'kameleon', starKey: 'kameleon_stars', name: 'Szabály-Kaméleon', emoji: '🦎', badge: 'Dzsungel-detektív', skill: 'Rugalmas váltás & figyelem' },
    { key: 'tukor', starKey: 'tukor_stars', name: 'Tükör-Vár', emoji: '🏰', badge: 'Térlátó lovag', skill: 'Szimmetria & térbeli forgatás' },
    { key: 'nyomozo', starKey: 'nyomozo_stars', name: 'Erdei Nyomozó', emoji: '🦊', badge: 'Főnyomozó', skill: 'Kizárás & ellentmondás' },
    { key: 'suni', starKey: 'suni_stars', name: 'Postás Süni', emoji: '🦔', badge: 'Gráf-bajnok', skill: 'Gráfelmélet & útvonal-tervezés' },
  ];

  const STATS_KEY = 'logika_stats';

  function getStats() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (_) {}
  }

  function getAppStars(starKey) {
    return Number(localStorage.getItem(starKey) || 0);
  }

  function getTotalStars() {
    return APP_META.reduce((sum, app) => sum + getAppStars(app.starKey), 0);
  }

  function resetAllProgress() {
    APP_META.forEach((app) => localStorage.removeItem(app.starKey));
    localStorage.removeItem(STATS_KEY);
  }

  /* ========================================================================
     1. Konfetti Animáció (5-csillagos mérföldköveknél)
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
     2. Intelligens Magyar Hangválasztó (hu-HU)
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
      if (utterance && !utterance.voice) {
        if (!cachedHuVoice) cachedHuVoice = pickBestHuVoice();
        if (cachedHuVoice) utterance.voice = cachedHuVoice;
      }
      return origSpeak(utterance);
    };
  }

  /* ========================================================================
     3. Automatikus Csillag & Statisztika Figyelő
     ======================================================================== */
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    const matchedApp = APP_META.find((a) => a.starKey === key);
    if (matchedApp) {
      const prev = Number(localStorage.getItem(key) || 0);
      const next = Number(value || 0);
      if (next > prev) {
        const stats = getStats();
        if (!stats[matchedApp.key]) stats[matchedApp.key] = { solved: 0 };
        stats[matchedApp.key].solved += next - prev;
        origSetItem(STATS_KEY, JSON.stringify(stats));
        if (next % 5 === 0) {
          launchConfetti();
        }
      }
    }
    return origSetItem(key, value);
  };

  window.LogikaCore = {
    APP_META,
    getAppStars,
    getTotalStars,
    getStats,
    saveStats,
    resetAllProgress,
    launchConfetti,
  };
})();
