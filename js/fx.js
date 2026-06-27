/* ===========================================================
   fx.js — lightweight, dependency-free animation effects.
   Ambient floating emojis, number count-up tickers, coin bursts,
   and the reactive mascot. Exposes window.FX
   =========================================================== */
(function () {
  'use strict';

  /* ---------- Ambient floating money/sparkles ---------- */
  var ambientTimer = null;
  var SETS = {
    money: ['🪙', '💵', '💖', '✨', '🌸', '⭐', '💎'],
    celebrate: ['🎉', '🎊', '💖', '⭐', '🪙', '🏡']
  };

  function ambient(enable) {
    var layer = document.getElementById('fx-layer');
    if (!layer) return;
    if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; }
    if (enable === false) { layer.innerHTML = ''; return; }
    var set = SETS.money;
    function spawn() {
      if (document.hidden) return;
      var s = document.createElement('span');
      s.className = 'fx-float';
      s.textContent = set[Math.floor(Math.random() * set.length)];
      s.style.left = (Math.random() * 100) + 'vw';
      s.style.fontSize = (13 + Math.random() * 18) + 'px';
      var dur = 8000 + Math.random() * 7000;
      s.style.animationDuration = dur + 'ms';
      s.style.setProperty('--drift', ((Math.random() * 60) - 30) + 'px');
      s.style.opacity = String(0.35 + Math.random() * 0.4);
      layer.appendChild(s);
      setTimeout(function () { s.remove(); }, dur + 200);
    }
    for (var i = 0; i < 5; i++) setTimeout(spawn, i * 350);
    ambientTimer = setInterval(spawn, 1500);
  }

  /* ---------- Number count-up ticker ---------- */
  // animate el.textContent from `from` to `to`, formatting each frame.
  function countUp(el, to, opts) {
    if (!el) return;
    opts = opts || {};
    var dur = opts.dur || 900, from = opts.from || 0;
    var fmt = opts.fmt || function (v) { return String(Math.round(v)); };
    if (opts.reduced || matchReduced()) { el.textContent = fmt(to); return; }
    var startTs = null;
    function step(ts) {
      if (startTs === null) startTs = ts;
      var p = Math.min(1, (ts - startTs) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    }
    requestAnimationFrame(step);
  }

  // Convenience: money ticker
  function moneyUp(el, to, opts) {
    opts = opts || {};
    opts.fmt = function (v) { return window.UI ? UI.money(v) : '$' + Math.round(v); };
    countUp(el, to, opts);
  }

  /* ---------- Coin burst from a point/element ---------- */
  function burst(x, y, opts) {
    opts = opts || {};
    if (matchReduced()) return;
    var layer = document.getElementById('fx-layer');
    if (!layer) return;
    var emojis = opts.emojis || ['🪙', '💖', '✨', '💵'];
    var n = opts.count || 14;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var s = document.createElement('span');
        s.className = 'fx-burst';
        s.textContent = emojis[i % emojis.length];
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        var ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5);
        var dist = 60 + Math.random() * 90;
        s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        s.style.setProperty('--dy', (Math.sin(ang) * dist - 40) + 'px');
        s.style.fontSize = (16 + Math.random() * 12) + 'px';
        layer.appendChild(s);
        setTimeout(function () { s.remove(); }, 900);
      })(i);
    }
  }
  function burstFrom(elOrEvent, opts) {
    var x, y;
    if (elOrEvent && elOrEvent.clientX != null) { x = elOrEvent.clientX; y = elOrEvent.clientY; }
    else if (elOrEvent && elOrEvent.getBoundingClientRect) { var r = elOrEvent.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    else { x = window.innerWidth / 2; y = window.innerHeight / 2; }
    burst(x, y, opts);
  }

  /* ---------- Mascot ---------- */
  function mascotFace(pct) {
    if (pct >= 1) return '🏡';
    if (pct >= 0.75) return '🏠';
    if (pct >= 0.5) return '🏗️';
    if (pct >= 0.25) return '🐷';
    return '🐷';
  }
  function mascotMessage(ctx) {
    var pct = ctx.housePct, onTrack = ctx.onTrack, surplus = ctx.surplus;
    if (pct >= 1) return "We did it — keys time!! 🔑🎉";
    if (pct >= 0.75) return "So close I can see the porch! 🏡";
    if (pct >= 0.5) return "Halfway home, superstar! 💪";
    if (pct >= 0.25) return "Look at us go — quarter way! 🌟";
    if (surplus <= 0) return "Let's free up a little each month 💕";
    if (onTrack) return "We're right on pace — keep stacking! 🪙";
    return "Every dollar is a step home 🏡";
  }

  function matchReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // pause ambient when tab hidden (saves battery)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; }
    else if (!document.hidden && !ambientTimer && document.getElementById('fx-layer')) ambient(true);
  });

  window.FX = {
    ambient: ambient, countUp: countUp, moneyUp: moneyUp,
    burst: burst, burstFrom: burstFrom,
    mascotFace: mascotFace, mascotMessage: mascotMessage
  };
})();
