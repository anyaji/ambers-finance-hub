/* ===========================================================
   lottie.js — optional Lottie animation layer.
   Auto-detects animation files in assets/lottie/ and mounts them.
   Everything degrades gracefully if a file (or the lottie lib) is
   missing — the app falls back to the built-in emoji/confetti FX.
   Exposes window.LottieFX

   Drop-in file names (in assets/lottie/):
     mascot.json     -> replaces the Home hero mascot
     celebrate.json  -> full-screen overlay on level-ups / milestones
     house.json      -> reserved for a goal animation
   =========================================================== */
(function () {
  'use strict';
  var BASE = 'assets/lottie/';
  var cache = {}; // name -> json | false (false = checked & missing)

  function libReady() { return typeof window.lottie !== 'undefined' && window.lottie.loadAnimation; }

  // Fetch + cache an animation JSON. Resolves false if missing/unreadable.
  function fetchAnim(name) {
    if (name in cache) return Promise.resolve(cache[name]);
    if (typeof fetch === 'undefined') { cache[name] = false; return Promise.resolve(false); }
    return fetch(BASE + name + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { cache[name] = j; return j; })
      .catch(function () { cache[name] = false; return false; });
  }

  function available(name) { return (name in cache) ? !!cache[name] : null; }

  // Mount an animation into a container element. Resolves the anim instance or null.
  function mount(container, name, opts) {
    opts = opts || {};
    if (!libReady() || !container) return Promise.resolve(null);
    return fetchAnim(name).then(function (json) {
      if (!json) return null;
      try {
        container.innerHTML = '';
        return window.lottie.loadAnimation({
          container: container, renderer: 'svg',
          loop: opts.loop !== false, autoplay: opts.autoplay !== false,
          animationData: json
        });
      } catch (e) { console.warn('lottie mount failed', e); return null; }
    });
  }

  // One-shot full-screen celebration overlay (used on big wins).
  var playing = false;
  function celebrate() {
    if (!libReady()) return;
    fetchAnim('celebrate').then(function (json) {
      if (!json || playing) return;
      playing = true;
      var host = document.createElement('div');
      host.className = 'lottie-overlay';
      document.body.appendChild(host);
      var anim;
      try {
        anim = window.lottie.loadAnimation({ container: host, renderer: 'svg', loop: false, autoplay: true, animationData: json });
      } catch (e) { host.remove(); playing = false; return; }
      var done = function () { try { anim.destroy(); } catch (e) {} if (host.parentNode) host.remove(); playing = false; };
      anim.addEventListener('complete', done);
      setTimeout(done, 6000); // safety
    });
  }

  // Warm the cache so availability is known early.
  function preload() { return Promise.all(['mascot', 'celebrate', 'house'].map(fetchAnim)); }

  window.LottieFX = { mount: mount, celebrate: celebrate, available: available, preload: preload, fetchAnim: fetchAnim, libReady: libReady };
})();
