/* ===========================================================
   store.js — state, persistence (localStorage + GitHub sync),
   and device-binding access control.
   Exposes window.Store
   =========================================================== */
(function () {
  'use strict';

  var LS_DATA   = 'afh_data_v1';
  var LS_DEVICE = 'afh_device_v1';

  /* ---------- Seed / default data ---------- */
  function seed() {
    return {
      meta: { version: 1, lastUpdated: null, currency: 'USD' },
      goal: {
        name: 'Our First House',
        emoji: '🏡',
        targetDate: '2026-12-15',
        downPaymentTarget: 40000,   // editable in Settings
        extraCostsTarget: 8000,     // closing costs / moving buffer
        startedOn: '2026-06-01'
      },
      // Access control: codes map an activation code -> owner name.
      // Change these in Settings. Each person activates once per device.
      access: {
        enabled: true,
        codes: { 'AMBER-LOVE-2026': 'Amber', 'AVEL-HERO-2026': 'Avel' },
        devices: []  // [{owner, deviceId, name, activatedAt}]
      },
      income: [
        // {id, source, amount, frequency, owner, emoji}
      ],
      savings: [
        { id: uid(), name: 'House Down Payment', emoji: '🏠', type: 'house', balance: 0, target: 40000, history: [] },
        { id: uid(), name: 'Emergency Fund',     emoji: '🛟', type: 'emergency', balance: 0, target: 6000, history: [] }
      ],
      debts: [
        // {id, name, balance, originalBalance, apr, minPayment, owner, emoji}
      ],
      bills: [
        // {id, name, amount, dueDay(1-31), category, emoji}  recurring monthly payments
      ],
      subscriptions: [
        // {id, name, amount, frequency, nextDate, emoji}
      ],
      quests: [],          // generated + custom
      customQuests: [],    // user-added rewards/objectives
      earnedBadges: [],    // ['first-dollar', ...]
      games: { xp: 0, stats: {} }, // arcade XP + high scores
      activity: [],        // log of contributions/payments for history & texts
      notify: {
        recipients: [
          // {name, number, carrier}  -> turned into email-to-text address
        ],
        weeklyDay: 'Sun'
      }
    };
  }

  function uid() {
    return 'x' + Math.random().toString(36).slice(2, 9) + (count++).toString(36);
  }
  var count = 0;

  /* ---------- State ---------- */
  var state = null;
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(LS_DATA);
      if (raw) { state = migrate(JSON.parse(raw)); return; }
    } catch (e) { console.warn('load failed', e); }
    state = seed();
    persist(false);
  }

  // Ensure new fields exist if data was saved by an older version.
  function migrate(d) {
    var base = seed();
    d.meta = Object.assign(base.meta, d.meta || {});
    d.goal = Object.assign(base.goal, d.goal || {});
    d.access = Object.assign(base.access, d.access || {});
    d.notify = Object.assign(base.notify, d.notify || {});
    if (!d.games || typeof d.games !== 'object') d.games = base.games;
    if (typeof d.games.xp !== 'number') d.games.xp = 0;
    if (!d.games.stats) d.games.stats = {};
    ['income','savings','debts','bills','subscriptions','quests','customQuests','earnedBadges','activity'].forEach(function (k) {
      if (!Array.isArray(d[k])) d[k] = base[k];
    });
    return d;
  }

  function get() { return state; }

  function persist(notify) {
    state.meta.lastUpdated = nowISO();
    try { localStorage.setItem(LS_DATA, JSON.stringify(state)); } catch (e) { console.warn('persist failed', e); }
    if (notify !== false) emit();
  }

  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  function nowISO() { return new Date().toISOString(); }

  /* ---------- Mutations ---------- */
  function update(mutator) {
    mutator(state);
    persist(true);
    if (window.GitHubSync && GitHubSync.isConfigured()) GitHubSync.queuePush(state);
  }

  function logActivity(entry) {
    entry.at = nowISO();
    state.activity.unshift(entry);
    if (state.activity.length > 300) state.activity.length = 300;
  }

  /* ---------- Import / export ---------- */
  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(text, opts) {
    opts = opts || {};
    var parsed = JSON.parse(text);
    var keepTs = opts.keepTimestamp && parsed.meta && parsed.meta.lastUpdated;
    state = migrate(parsed);
    if (keepTs) {
      // Preserve the source timestamp (sync conflict resolution relies on it)
      // and save locally WITHOUT re-stamping or triggering a push echo.
      state.meta.lastUpdated = keepTs;
      try { localStorage.setItem(LS_DATA, JSON.stringify(state)); } catch (e) {}
      emit();
    } else {
      persist(true);
    }
    return true;
  }

  // Has the user entered anything real yet? Lets a fresh device accept the
  // cloud copy on first sync instead of being blocked by a "newer" empty seed.
  function hasUserData(s) {
    s = s || state;
    return !!((s.income && s.income.length) || (s.debts && s.debts.length) ||
      (s.bills && s.bills.length) || (s.subscriptions && s.subscriptions.length) ||
      (s.savings && s.savings.some(function (x) { return x.balance > 0; })) ||
      (s.games && s.games.xp > 0) || (s.activity && s.activity.length));
  }
  function resetAll() { state = seed(); persist(true); }

  /* ===========================================================
     Device-binding access control
     =========================================================== */
  function getDevice() {
    try { return JSON.parse(localStorage.getItem(LS_DEVICE) || 'null'); }
    catch (e) { return null; }
  }

  function isActivated() {
    if (!state.access || !state.access.enabled) return true;
    var dev = getDevice();
    return !!(dev && dev.owner);
  }

  // Try an activation code on THIS device. Returns owner name or null.
  function activate(code, deviceLabel) {
    var codes = (state.access && state.access.codes) || {};
    var owner = codes[(code || '').trim().toUpperCase()] || codes[(code || '').trim()];
    if (!owner) return null;
    var dev = {
      owner: owner,
      deviceId: 'd' + Math.random().toString(36).slice(2, 11),
      name: deviceLabel || guessDeviceName(),
      activatedAt: nowISO()
    };
    localStorage.setItem(LS_DEVICE, JSON.stringify(dev));
    update(function (s) {
      // Dedup by owner+device name (deviceId is random each activation).
      s.access.devices = (s.access.devices || []).filter(function (d) { return !(d.owner === dev.owner && d.name === dev.name); });
      s.access.devices.push({ owner: dev.owner, deviceId: dev.deviceId, name: dev.name, activatedAt: dev.activatedAt });
    });
    return owner;
  }

  function unbindThisDevice() {
    var dev = getDevice();
    localStorage.removeItem(LS_DEVICE);
    if (dev) update(function (s) {
      s.access.devices = (s.access.devices || []).filter(function (d) { return d.deviceId !== dev.deviceId; });
    });
  }

  function guessDeviceName() {
    var ua = navigator.userAgent;
    var os = /Windows/.test(ua) ? 'Windows PC' : /iPhone|iPad/.test(ua) ? 'iPhone' :
             /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : 'Device';
    return os;
  }

  window.Store = {
    load: load, get: get, update: update, persist: persist, subscribe: subscribe,
    logActivity: logActivity, uid: uid, nowISO: nowISO,
    exportJSON: exportJSON, importJSON: importJSON, resetAll: resetAll, hasUserData: hasUserData,
    // access
    isActivated: isActivated, activate: activate, getDevice: getDevice,
    unbindThisDevice: unbindThisDevice
  };
})();
