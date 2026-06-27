/* ===========================================================
   app.js — router, activation lock, celebrations, notifications.
   Exposes window.App
   =========================================================== */
(function () {
  'use strict';

  var TABS = [
    { id: 'home',     icon: '🏠', label: 'Home' },
    { id: 'savings',  icon: '💰', label: 'Savings' },
    { id: 'debts',    icon: '⚔️', label: 'Debts' },
    { id: 'money',    icon: '🧾', label: 'Bills' },
    { id: 'games',    icon: '🎮', label: 'Games' },
    { id: 'quests',   icon: '🎯', label: 'Quests' }
  ];

  // US carrier email-to-text gateways (free).
  var CARRIERS = {
    'Verizon': 'vtext.com',
    'AT&T': 'txt.att.net',
    'T-Mobile': 'tmomail.net',
    'Sprint': 'messaging.sprintpcs.com',
    'Boost Mobile': 'sms.myboostmobile.com',
    'Cricket': 'sms.cricketwireless.net',
    'US Cellular': 'email.uscc.net',
    'Metro by T-Mobile': 'mymetropcs.com',
    'Google Fi': 'msg.fi.google.com',
    'Mint Mobile': 'tmomail.net',
    'Visible': 'vtext.com',
    'Consumer Cellular': 'mailmymobile.net',
    'Straight Talk': 'vtext.com'
  };

  var current = 'home';
  var booted = false;

  function go(route) {
    current = route;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    var app = document.getElementById('app');
    if (!Store.isActivated()) { renderLock(app); document.getElementById('tabbar').innerHTML = ''; hideFab(); return; }
    app.innerHTML = '';
    (Views[current] || Views.home)(app);
    renderTabbar();
    renderFab();
  }

  function renderTabbar() {
    var bar = document.getElementById('tabbar');
    bar.innerHTML = '';
    TABS.forEach(function (t) {
      var b = UI.el('button', { class: current === t.id ? 'active' : '', onclick: function () { UI.buzz(8); go(t.id); } },
        [UI.el('span', { class: 'ti', text: t.icon }), UI.el('span', { text: t.label })]);
      bar.appendChild(b);
    });
  }

  // Floating + button: quick-add on data screens (triggers the first "+ Add" button).
  function renderFab() {
    hideFab();
    if (['savings', 'debts', 'money', 'quests'].indexOf(current) === -1) return;
    var fab = UI.el('button', { class: 'fab', id: 'fab', title: 'Quick add', text: '＋', onclick: function () {
      var btn = document.querySelector('#app .section-head .btn.primary'); if (btn) { UI.buzz(10); btn.click(); }
    } });
    document.body.appendChild(fab);
  }
  function hideFab() { var f = document.getElementById('fab'); if (f) f.remove(); }

  /* ---------- Activation lock screen ---------- */
  function renderLock(app) {
    app.innerHTML = '';
    var code = UI.input({ placeholder: 'Enter your code', style: 'text-align:center;letter-spacing:1px;text-transform:uppercase;font-family:var(--font-head)' });
    var card = UI.el('div', { class: 'card', style: 'margin-top:18vh;text-align:center' }, [
      UI.el('div', { style: 'font-size:3.4rem' , text: '🏡' }),
      UI.el('h1', { style: 'font-family:var(--font-head);margin:6px 0 2px', text: "Amber's Finance Hub" }),
      UI.el('div', { class: 'muted', style: 'margin-bottom:16px', text: 'Enter your activation code to unlock this device' }),
      UI.field('Activation code', code),
      UI.el('button', { class: 'btn primary block', text: '🔓 Unlock', onclick: function () {
        var owner = Store.activate(code.value, null);
        if (owner) {
          UI.confetti({ big: true }); UI.buzz(30);
          UI.toast('Welcome, ' + owner + '! 💖', '🎉');
          booted = true; go('home');
        } else {
          code.style.borderColor = 'var(--bad)';
          code.value = '';
          UI.toast('Hmm, that code didn’t match', '⚠️');
          UI.buzz([20, 40, 20]);
        }
      } }),
      UI.el('div', { class: 'hint', style: 'margin-top:12px', text: 'Each device only needs this once.' })
    ]);
    app.appendChild(card);
    setTimeout(function () { code.focus(); }, 200);
    code.addEventListener('keydown', function (e) { if (e.key === 'Enter') card.querySelector('.btn.primary').click(); });
  }

  /* ---------- Commit + celebrations ---------- */
  function commit(mutator) {
    var s0 = Store.get();
    var prevBadges = s0.earnedBadges.slice();
    var beforeQuests = {};
    Engine.completedQuests(s0).forEach(function (q) { beforeQuests[q.id] = true; });
    var prevLevel = Engine.levelInfo(s0).level;

    Store.update(function (s) {
      mutator(s);
      Engine.checkBadges(s).forEach(function (id) { if (s.earnedBadges.indexOf(id) < 0) s.earnedBadges.push(id); });
    });

    var s = Store.get();
    var newBadges = s.earnedBadges.filter(function (id) { return prevBadges.indexOf(id) < 0; });
    var newQuests = Engine.completedQuests(s).filter(function (q) { return !beforeQuests[q.id]; });
    var newLevel = Engine.levelInfo(s).level;

    celebrate(newBadges, newQuests, newLevel > prevLevel ? newLevel : 0);
  }

  function celebrate(newBadges, newQuests, leveledTo) {
    var party = false;
    newBadges.forEach(function (id) {
      var def = Engine.badgeDefs().find(function (b) { return b.id === id; });
      if (def) { UI.toast('Badge unlocked: ' + def.name, def.ico); party = true; }
    });
    newQuests.forEach(function (q) {
      UI.toast('Quest done: ' + q.title + (q.reward ? ' → ' + q.reward : ''), '🎉'); party = true;
    });
    if (leveledTo) { UI.toast('Level up! You’re level ' + leveledTo + ' 🌟', '⬆️'); party = true; }
    if (party) { UI.confetti({ big: true }); UI.buzz(40); if (window.FX) FX.burstFrom(null, { count: 20, emojis: ['🪙', '💖', '⭐', '🎉', '💎'] }); if (window.LottieFX) LottieFX.celebrate(); }
  }

  /* ---------- Award XP from games ---------- */
  function awardGameXp(amount, label) {
    if (!amount) return;
    commit(function (s) { s.games = s.games || { xp: 0, stats: {} }; s.games.xp += Math.round(amount); });
    UI.toast('+' + Math.round(amount) + ' XP ' + (label ? '· ' + label : ''), '✨');
  }
  function recordGameStat(key, value) {
    Store.update(function (s) { s.games = s.games || { xp: 0, stats: {} }; var prev = s.games.stats[key] || 0; if (value > prev) s.games.stats[key] = value; });
  }

  /* ---------- Notifications: build summary + email-to-text ---------- */
  function buildSummary() {
    var s = Store.get(), m = Engine.metrics(s), lvl = Engine.levelInfo(s), proj = Engine.projection(s);
    var lines = [
      "Amber's Hub 🏡 update",
      'Saved: ' + UI.money(m.totalSaved) + ' of ' + UI.money(m.houseGoal) + ' (' + UI.pct(m.housePct) + ')',
      'Debt left: ' + UI.money(m.totalDebt) + (m.debtPaid ? ' (paid ' + UI.money(m.debtPaid) + ')' : ''),
      'Free/mo: ' + UI.money(Math.round(m.surplus)),
      proj.days > 0 ? ('Days to house: ' + proj.days) : 'House target reached!',
      'Level ' + lvl.level + ' · ' + lvl.title,
      proj.onTrack ? "On track 🎯" : 'Keep pushing 💪'
    ];
    return lines.join('\n');
  }

  function sendTextUpdate() {
    var s = Store.get();
    var rec = s.notify.recipients || [];
    if (!rec.length) { UI.toast('Add a phone number first (Settings)', '📱'); return; }
    var addrs = rec.map(function (r) {
      var gw = CARRIERS[r.carrier]; return gw ? (r.number + '@' + gw) : null;
    }).filter(Boolean);
    if (!addrs.length) { UI.toast('Carrier not recognized', '⚠️'); return; }
    var body = buildSummary();
    var url = 'mailto:' + addrs.join(',') + '?subject=' + encodeURIComponent("Amber's Hub update") + '&body=' + encodeURIComponent(body);
    window.location.href = url;
    UI.toast('Opening your mail app to send the text…', '✉️');
  }

  /* ---------- Export / Import ---------- */
  function exportData() {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ambers-finance-hub-backup.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    UI.toast('Backup downloaded', '⬇️');
  }
  function importData() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { try { Store.importJSON(r.result); UI.toast('Imported!', '✅'); } catch (e) { UI.toast('Bad file', '⚠️'); } };
      r.readAsText(f);
    };
    inp.click();
  }

  /* ---------- Boot ---------- */
  function init() {
    Store.load();
    Views.bind();
    if (window.FX) FX.ambient(true);
    if (window.LottieFX) LottieFX.preload().catch(function () {});
    Store.subscribe(function () { if (booted) render(); });

    // Try a GitHub pull on boot, then render.
    if (window.GitHubSync && GitHubSync.isConfigured()) {
      GitHubSync.pull().catch(function () {}).then(function () { booted = true; render(); });
    } else {
      booted = true; render();
    }
  }

  window.App = {
    go: go, render: render, commit: commit, init: init,
    CARRIERS: CARRIERS, sendTextUpdate: sendTextUpdate, buildSummary: buildSummary,
    exportData: exportData, importData: importData,
    awardGameXp: awardGameXp, recordGameStat: recordGameStat
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
