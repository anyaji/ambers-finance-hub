/* ===========================================================
   games.js — side mini-games (finance + fun) that earn XP/levels.
   Registers Views.games. Depends on UI, App, Store.
   =========================================================== */
(function () {
  'use strict';
  var el = function () { return UI.el.apply(null, arguments); };

  var GAMES = [
    { id: 'memory', emoji: '🧠', name: 'Money Match', tag: 'Memory', desc: 'Flip & match the money pairs', kind: 'fun' },
    { id: 'coins',  emoji: '🪙', name: 'Coin Catcher', tag: 'Reflex', desc: 'Tap the coins, dodge the bombs', kind: 'fun' },
    { id: 'quiz',   emoji: '💡', name: 'Money Quiz', tag: 'Finance', desc: 'Test your money smarts', kind: 'finance' },
    { id: 'nw',     emoji: '⚖️', name: 'Need or Want?', tag: 'Finance', desc: 'Sort spending in a snap', kind: 'finance' },
    { id: 'budget', emoji: '🎯', name: 'Budget Blitz', tag: 'Finance', desc: 'Split a paycheck the smart way', kind: 'finance' }
  ];

  function gamesView(root) {
    var s = Store.get();
    var gx = (s.games && s.games.xp) || 0;
    var stats = (s.games && s.games.stats) || {};
    root.appendChild(headerLite('Arcade', 'Play, learn, level up 🎮'));

    root.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'row between' }, [
        el('div', {}, [el('div', { class: 'lbl muted', text: 'GAME XP EARNED' }), el('div', { style: 'font-family:var(--font-head);font-size:2rem', text: gx.toLocaleString() + ' XP' })]),
        el('div', { style: 'font-size:2.6rem', text: '🎮' })
      ]),
      el('div', { class: 'hint', text: 'Every game feeds your Level on the Home & Quests screens.' })
    ]));

    var finance = el('div'), fun = el('div');
    root.appendChild(el('div', { class: 'section-head' }, el('h2', { text: '💡 Finance Games' })));
    root.appendChild(finance);
    root.appendChild(el('div', { class: 'section-head' }, el('h2', { text: '🕹️ Just for Fun' })));
    root.appendChild(fun);

    GAMES.forEach(function (g) {
      var best = stats[g.id + '_best'];
      var card = el('div', { class: 'card tight gcard', onclick: function () { play(g.id); } }, [
        el('div', { class: 'row', style: 'gap:14px' }, [
          el('div', { class: 'gicon', text: g.emoji }),
          el('div', { style: 'flex:1' }, [
            el('div', { class: 'row between' }, [el('div', { class: 'name', style: 'font-weight:800;font-size:1.05rem', text: g.name }), el('span', { class: 'tag ' + (g.kind === 'finance' ? 'info' : ''), text: g.tag })]),
            el('div', { class: 'hint', text: g.desc }),
            best != null ? el('div', { class: 'hint', style: 'margin-top:2px', text: '🏆 Best: ' + best }) : null
          ]),
          el('div', { style: 'font-size:1.4rem', text: '▶️' })
        ])
      ]);
      (g.kind === 'finance' ? finance : fun).appendChild(card);
    });
  }

  function play(id) {
    var app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(el('div', { class: 'app-header' }, [
      el('button', { class: 'header-chip', text: '← Arcade', onclick: function () { App.go('games'); } }),
      el('div', { class: 'spacer' })
    ]));
    var stage = el('div', { class: 'card', style: 'min-height:60vh' });
    app.appendChild(stage);
    ({ memory: memory, coins: coins, quiz: quiz, nw: needWant, budget: budget }[id])(stage);
  }

  function finish(stage, title, score, xp, gameId) {
    App.awardGameXp(xp, title);
    if (gameId) App.recordGameStat(gameId + '_best', score);
    UI.confetti({ big: xp >= 60 });
    stage.innerHTML = '';
    stage.appendChild(el('div', { class: 'empty' }, [
      el('div', { style: 'font-size:3.4rem', text: '🎉' }),
      el('h2', { style: 'font-family:var(--font-head);margin:6px', text: title }),
      el('div', { class: 'big-amount', style: 'font-size:2.2rem', text: '+' + xp + ' XP' }),
      el('div', { class: 'muted', text: 'Score: ' + score }),
      el('div', { class: 'btn-row', style: 'justify-content:center;margin-top:16px' }, [
        el('button', { class: 'btn primary', text: '🔁 Play again', onclick: function () { var p = stage.parentNode; play(gameId); } }),
        el('button', { class: 'btn ghost', text: '🎮 Arcade', onclick: function () { App.go('games'); } })
      ])
    ]));
  }

  /* ====================== MEMORY MATCH ====================== */
  function memory(stage) {
    var faces = ['💰', '🏦', '💳', '📈', '🪙', '💎', '🏡', '🎁'];
    var deck = shuffle(faces.concat(faces).map(function (f, i) { return { f: f, i: i }; }));
    var first = null, lock = false, matched = 0, moves = 0;
    stage.innerHTML = '';
    stage.appendChild(el('h2', { style: 'font-family:var(--font-head);text-align:center', text: '🧠 Money Match' }));
    var info = el('div', { class: 'center hint', text: 'Find all 8 pairs!' });
    stage.appendChild(info);
    var grid = el('div', { class: 'mem-grid' });
    stage.appendChild(grid);
    deck.forEach(function (card) {
      var c = el('div', { class: 'mem-card' }, [el('div', { class: 'mem-inner' }, [
        el('div', { class: 'mem-front', text: '❓' }),
        el('div', { class: 'mem-back', text: card.f })
      ])]);
      c.addEventListener('click', function () {
        if (lock || c.classList.contains('flipped') || c.classList.contains('done')) return;
        c.classList.add('flipped');
        if (!first) { first = { c: c, card: card }; return; }
        moves++; lock = true;
        if (first.card.f === card.f) {
          setTimeout(function () { first.c.classList.add('done'); c.classList.add('done'); matched++; first = null; lock = false; if (matched === faces.length) { var xp = Math.max(20, 130 - moves * 4); finish(stage, 'Matched!', moves + ' moves', xp, 'memory'); } }, 350);
        } else {
          setTimeout(function () { first.c.classList.remove('flipped'); c.classList.remove('flipped'); first = null; lock = false; }, 750);
        }
        info.textContent = 'Moves: ' + moves;
      });
      grid.appendChild(c);
    });
  }

  /* ====================== COIN CATCHER ====================== */
  function coins(stage) {
    var score = 0, time = 20, running = true;
    stage.innerHTML = '';
    stage.appendChild(el('h2', { style: 'font-family:var(--font-head);text-align:center', text: '🪙 Coin Catcher' }));
    var hud = el('div', { class: 'row between', style: 'font-weight:800' }, [el('span', { id: 'cc-score', text: 'Score: 0' }), el('span', { id: 'cc-time', text: '⏱️ 20s' })]);
    stage.appendChild(hud);
    var arena = el('div', { class: 'cc-arena' });
    stage.appendChild(arena);
    stage.appendChild(el('div', { class: 'center hint', style: 'margin-top:8px', text: 'Tap 🪙 (+1) • avoid 💣 (−2)' }));

    function spawn() {
      if (!running) return;
      var isBomb = Math.random() < 0.22;
      var t = el('div', { class: 'cc-token' + (isBomb ? ' bomb' : ''), text: isBomb ? '💣' : '🪙' });
      var pad = 14;
      t.style.left = (pad + Math.random() * (arena.clientWidth - pad * 2 - 44)) + 'px';
      t.style.top = (pad + Math.random() * (arena.clientHeight - pad * 2 - 44)) + 'px';
      t.addEventListener('click', function () {
        if (!running) return;
        score += isBomb ? -2 : 1; UI.buzz(isBomb ? 30 : 8);
        document.getElementById('cc-score').textContent = 'Score: ' + score;
        t.style.transform = 'scale(0)'; setTimeout(function () { t.remove(); }, 150);
      });
      arena.appendChild(t);
      setTimeout(function () { if (t.parentNode) { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 200); } }, 900 + Math.random() * 500);
      setTimeout(spawn, 420 + Math.random() * 350);
    }
    spawn();
    var tick = setInterval(function () {
      time--; document.getElementById('cc-time').textContent = '⏱️ ' + time + 's';
      if (time <= 0) { clearInterval(tick); running = false; arena.innerHTML = ''; var sc = Math.max(0, score); finish(stage, 'Time!', sc + ' coins', Math.max(10, sc * 3), 'coins'); }
    }, 1000);
  }

  /* ====================== MONEY QUIZ ====================== */
  var QUIZ = [
    { q: 'What does APR stand for?', a: ['Annual Percentage Rate', 'Average Payment Ratio', 'Account Payment Record'], c: 0, e: 'APR is the yearly cost of borrowing — lower is better.' },
    { q: 'A solid emergency fund covers about…', a: ['1 day', '3–6 months of expenses', '10 years'], c: 1, e: '3–6 months of expenses is the classic safety net.' },
    { q: 'Which debt should you usually attack first (avalanche)?', a: ['Lowest balance', 'Highest interest rate', 'Newest one'], c: 1, e: 'Highest APR first saves the most money over time.' },
    { q: 'For a house, a bigger down payment usually means…', a: ['Higher monthly payment', 'Lower monthly payment', 'No difference'], c: 1, e: 'More down = smaller loan = lower monthly payment.' },
    { q: 'Paying yourself first means…', a: ['Buy treats first', 'Save before you spend', 'Pay bills last'], c: 1, e: 'Automate savings before spending on anything else.' },
    { q: 'A good rule of thumb for saving rate is at least…', a: ['1%', '20%', '90%'], c: 1, e: '20%+ of income is a great target.' },
    { q: 'What hurts your credit score most?', a: ['Checking your own score', 'Missing payments', 'Using a debit card'], c: 1, e: 'Payment history is the biggest factor — never miss.' },
    { q: 'Compound interest works best when you…', a: ['Start early', 'Wait as long as possible', 'Never invest'], c: 0, e: 'Time is the magic ingredient — start now.' }
  ];
  function quiz(stage) {
    var qs = shuffle(QUIZ.slice()).slice(0, 5), idx = 0, correct = 0;
    stage.innerHTML = '';
    stage.appendChild(el('h2', { style: 'font-family:var(--font-head);text-align:center', text: '💡 Money Quiz' }));
    var body = el('div'); stage.appendChild(body);
    function showQ() {
      var item = qs[idx];
      body.innerHTML = '';
      body.appendChild(el('div', { class: 'center hint', text: 'Question ' + (idx + 1) + ' of ' + qs.length }));
      body.appendChild(el('div', { class: 'card tight', style: 'font-weight:800;font-size:1.1rem;text-align:center', text: item.q }));
      shuffle(item.a.map(function (txt, i) { return { txt: txt, i: i }; })).forEach(function (opt) {
        body.appendChild(el('button', { class: 'btn block', style: 'margin-bottom:10px;text-align:left', text: opt.txt, onclick: function (e) {
          var right = opt.i === item.c;
          e.target.style.background = right ? 'var(--mint-2)' : '#ffe1e7';
          if (right) correct++;
          UI.buzz(right ? 12 : 30);
          body.appendChild(el('div', { class: 'hint center', style: 'margin:6px 0', text: (right ? '✅ ' : '❌ ') + item.e }));
          Array.prototype.forEach.call(body.querySelectorAll('button'), function (b) { b.disabled = true; b.style.opacity = '.8'; });
          setTimeout(function () { idx++; if (idx < qs.length) showQ(); else finish(stage, 'Quiz done!', correct + '/' + qs.length, correct * 18, 'quiz'); }, 1400);
        } }));
      });
    }
    showQ();
  }

  /* ====================== NEED OR WANT ====================== */
  var NW = [
    { n: 'Rent', e: '🏠', need: true }, { n: 'Designer bag', e: '👜', need: false },
    { n: 'Groceries', e: '🛒', need: true }, { n: 'New phone every year', e: '📱', need: false },
    { n: 'Electric bill', e: '💡', need: true }, { n: 'Daily latte', e: '☕', need: false },
    { n: 'Health insurance', e: '🏥', need: true }, { n: 'Concert tickets', e: '🎫', need: false },
    { n: 'Car payment', e: '🚗', need: true }, { n: 'Streaming #5', e: '📺', need: false },
    { n: 'Down payment savings', e: '🏡', need: true }, { n: 'Impulse gadget', e: '🎮', need: false }
  ];
  function needWant(stage) {
    var rounds = shuffle(NW.slice()).slice(0, 8), idx = 0, correct = 0;
    stage.innerHTML = '';
    stage.appendChild(el('h2', { style: 'font-family:var(--font-head);text-align:center', text: '⚖️ Need or Want?' }));
    var body = el('div'); stage.appendChild(body);
    function show() {
      var it = rounds[idx];
      body.innerHTML = '';
      body.appendChild(el('div', { class: 'center hint', text: (idx + 1) + ' / ' + rounds.length }));
      body.appendChild(el('div', { style: 'text-align:center;margin:18px 0' }, [el('div', { style: 'font-size:4rem', text: it.e }), el('div', { style: 'font-family:var(--font-head);font-size:1.4rem', text: it.n })]));
      function answer(guessNeed, btn) {
        var right = guessNeed === it.need; if (right) correct++;
        btn.style.background = right ? 'var(--mint-2)' : '#ffe1e7'; UI.buzz(right ? 12 : 30);
        setTimeout(function () { idx++; if (idx < rounds.length) show(); else finish(stage, 'Nice sorting!', correct + '/' + rounds.length, correct * 12, 'nw'); }, 450);
      }
      body.appendChild(el('div', { class: 'btn-row', style: 'justify-content:center' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: '✅ Need', onclick: function (e) { answer(true, e.target); } }),
        el('button', { class: 'btn ghost', style: 'flex:1', text: '🛍️ Want', onclick: function (e) { answer(false, e.target); } })
      ]));
    }
    show();
  }

  /* ====================== BUDGET BLITZ ====================== */
  // Split a $2000 paycheck into Needs/Savings/Fun close to 50/30/20-ish (savings-forward).
  function budget(stage) {
    var total = 2000;
    var needs = 50, save = 30, fun = 20; // percentages, user adjusts savings & fun
    stage.innerHTML = '';
    stage.appendChild(el('h2', { style: 'font-family:var(--font-head);text-align:center', text: '🎯 Budget Blitz' }));
    stage.appendChild(el('div', { class: 'center hint', text: 'You earned ' + UI.money(total) + '. Slide to budget it — aim to SAVE big for the house!' }));
    var out = el('div');
    function sliderRow(label, getV, setV) {
      var val = el('b', { text: '' });
      var range = el('input', { type: 'range', min: '0', max: '100', value: getV(), style: 'width:100%' });
      range.addEventListener('input', function () { setV(+range.value); redraw(); });
      return { node: el('div', { class: 'field' }, [el('label', {}, [document.createTextNode(label + ' — '), val]), range]), val: val, range: range };
    }
    var sNeeds = sliderRow('🏠 Needs', function () { return needs; }, function (v) { needs = v; });
    var sSave = sliderRow('💰 Savings', function () { return save; }, function (v) { save = v; });
    var sFun = sliderRow('🎁 Fun', function () { return fun; }, function (v) { fun = v; });
    out.appendChild(sNeeds.node); out.appendChild(sSave.node); out.appendChild(sFun.node);
    var sumLine = el('div', { class: 'center', style: 'font-weight:800;margin:6px 0' });
    out.appendChild(sumLine);
    var goBtn = el('button', { class: 'btn primary block', text: 'Lock in budget 🎯', onclick: function () {
      var sum = needs + save + fun;
      if (sum !== 100) { UI.toast('Must add up to 100% (now ' + sum + '%)', '⚠️'); return; }
      // score: reward higher savings, sensible needs (40-60), some fun
      var score = 0;
      score += Math.min(save, 40) * 2;            // savings up to 40% rewarded
      if (needs >= 40 && needs <= 60) score += 30; // realistic needs
      if (fun >= 5 && fun <= 25) score += 20;      // healthy fun
      var xp = Math.round(score / 2);
      finish(stage, 'Budget locked!', save + '% saved', Math.max(15, xp), 'budget');
    } });
    out.appendChild(goBtn);
    stage.appendChild(out);
    function redraw() {
      sNeeds.val.textContent = needs + '%  (' + UI.money(total * needs / 100) + ')';
      sSave.val.textContent = save + '%  (' + UI.money(total * save / 100) + ')';
      sFun.val.textContent = fun + '%  (' + UI.money(total * fun / 100) + ')';
      var sum = needs + save + fun;
      sumLine.textContent = 'Total: ' + sum + '%' + (sum === 100 ? ' ✅' : ' (aim for 100%)');
      sumLine.style.color = sum === 100 ? 'var(--good)' : 'var(--bad)';
    }
    redraw();
  }

  /* ---------- helpers ---------- */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function headerLite(title, sub) {
    return el('div', { class: 'app-header' }, [
      el('div', { class: 'crest', text: '🎮' }),
      el('div', {}, [el('h1', { text: title }), el('div', { class: 'sub', text: sub })]),
      el('div', { class: 'spacer' }),
      el('button', { class: 'header-chip', text: '⚙️', onclick: function () { App.go('settings'); } })
    ]);
  }

  // register
  if (window.Views) window.Views.games = gamesView;
  else document.addEventListener('DOMContentLoaded', function () { window.Views.games = gamesView; });
})();
