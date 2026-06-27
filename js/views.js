/* ===========================================================
   views.js — all screen renderers. Exposes window.Views
   Depends on UI, Engine, Store, App (App.commit, App.go)
   =========================================================== */
(function () {
  'use strict';
  var el, money, moneyShort, pct, ring, bar, fmtDate, fmtDay;
  function bind() { el = UI.el; money = UI.money; moneyShort = UI.moneyShort; pct = UI.pct; ring = UI.ring; bar = UI.bar; fmtDate = UI.fmtDate; fmtDay = UI.fmtDay; }

  function header(title, sub) {
    var lvl = Engine.levelInfo(Store.get());
    return el('div', { class: 'app-header' }, [
      el('div', { class: 'crest', text: '🏡' }),
      el('div', {}, [el('h1', { text: title }), el('div', { class: 'sub', text: sub })]),
      el('div', { class: 'spacer' }),
      el('button', { class: 'header-chip', title: 'Your level', onclick: function () { App.go('quests'); } },
        [el('span', { text: '⭐' }), el('span', { text: 'Lv ' + lvl.level })]),
      el('button', { class: 'header-chip', title: 'Settings', style: 'padding:7px 11px', onclick: function () { App.go('settings'); } },
        [el('span', { text: '⚙️' })])
    ]);
  }

  function emptyCard(ico, msg, btnLabel, onClick) {
    return el('div', { class: 'card' }, el('div', { class: 'empty' }, [
      el('div', { class: 'e-ico', text: ico }),
      el('div', { class: 'muted', html: msg }),
      onClick ? el('div', { style: 'margin-top:12px' }, el('button', { class: 'btn primary', text: btnLabel, onclick: onClick })) : null
    ]));
  }

  /* ============================ HOME ============================ */
  function home(root) {
    var s = Store.get(), m = Engine.metrics(s), proj = Engine.projection(s), lvl = Engine.levelInfo(s);
    root.appendChild(header("Amber's Hub", 'Road to ' + s.goal.name + ' ' + s.goal.emoji));

    /* Hero */
    var hero = el('div', { class: 'hero' });
    var days = Engine.daysUntil(s.goal.targetDate);
    hero.appendChild(el('div', { class: 'row between wrap' }, [
      el('div', {}, [
        el('h2', { text: 'Road to ' + s.goal.name + ' ' + s.goal.emoji }),
        el('div', { class: 'countdown', text: (days > 0 ? days + ' days to go • target ' + fmtDate(s.goal.targetDate) : 'Target date reached!') })
      ]),
      el('span', { class: 'tag ' + (proj.onTrack ? '' : 'warn'), text: proj.onTrack ? '🎯 On track' : '⏳ Push pace' })
    ]));
    var heroNum = el('span', { text: money(0) });
    hero.appendChild(el('div', { class: 'big-amount' }, [heroNum, el('small', { text: ' of ' + money(m.houseGoal) })]));
    if (window.FX) FX.moneyUp(heroNum, m.houseBalance, { dur: 1100 }); else heroNum.textContent = money(m.houseBalance);

    // Journey track with milestones
    var track = el('div', { class: 'journey-track' });
    var fill = el('div', { class: 'journey-fill' });
    track.appendChild(fill);
    var flags = el('div', { class: 'journey-flags' });
    Engine.milestones(s).forEach(function (ms) {
      if (ms.pct === 1) return;
      var f = el('div', { class: 'journey-flag' + (ms.hit ? ' hit' : ''), style: 'left:' + (ms.pct * 100) + '%' }, [el('span', { class: 'dot' }), el('span', { text: ms.label })]);
      flags.appendChild(f);
    });
    track.appendChild(flags);
    track.appendChild(el('div', { class: 'journey-house', text: '🏡' }));
    var walker = el('div', { class: 'journey-walker', text: '🚶‍♀️' });
    track.appendChild(walker);
    hero.appendChild(el('div', { class: 'journey' }, track));
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      var p = Engine.clamp(m.housePct);
      fill.style.width = (p * 100) + '%';
      walker.style.left = 'calc(' + (p * 92 + 2) + '% )';
    }); });

    // Level / XP
    hero.appendChild(el('div', { class: 'xp-wrap' }, [
      el('div', { class: 'level-badge' }, [el('small', { text: 'LEVEL' }), el('b', { text: lvl.level })]),
      el('div', { class: 'xp-bar' }, [
        el('div', { class: 'label' }, [el('span', { text: lvl.title }), el('span', { text: lvl.xpInto + ' / ' + lvl.xpForNext + ' XP' })]),
        (function () { var b = el('div', { class: 'bar' }, el('span')); requestAnimationFrame(function () { requestAnimationFrame(function () { b.firstChild.style.width = pct(lvl.pct); }); }); return b; })()
      ])
    ]));

    // Reactive mascot (emoji by default; upgrades to Lottie if a file is present)
    if (window.FX) {
      var ctx = { housePct: m.housePct, onTrack: proj.onTrack, surplus: m.surplus };
      var mascotIcon = el('div', { class: 'mascot', text: FX.mascotFace(m.housePct), title: 'Tap me!' });
      hero.appendChild(el('div', { class: 'mascot-wrap' }, [
        mascotIcon,
        el('div', { class: 'mascot-bubble', text: FX.mascotMessage(ctx) })
      ]));
      if (window.LottieFX) LottieFX.mount(mascotIcon, 'mascot').then(function (anim) { if (anim) mascotIcon.classList.add('mascot-lottie'); });
    }
    root.appendChild(hero);

    /* Stat tiles */
    var stats = el('div', { class: 'grid3' }, [
      statTile('💰', money(m.totalSaved), 'Saved', null, 'up', m.totalSaved),
      statTile('💳', money(m.totalDebt), 'Debt left', m.debtPaid > 0 ? ('▼ ' + money(m.debtPaid) + ' paid') : null, 'up', m.totalDebt),
      statTile('📊', money(m.net), 'Net', null, 'up', m.net),
      statTile('📈', money(Math.round(m.monthlyIncome)), 'Income/mo', null, 'up', Math.round(m.monthlyIncome)),
      statTile('🧾', money(Math.round(m.monthlyExpenses)), 'Spends/mo', null, 'up', Math.round(m.monthlyExpenses)),
      statTile(m.surplus >= 0 ? '✨' : '⚠️', money(Math.round(m.surplus)), 'Free/mo', null, m.surplus >= 0 ? 'up' : 'down', Math.round(m.surplus))
    ]);
    root.appendChild(stats);

    /* Pace card */
    var pace = el('div', { class: 'card' }, [
      el('div', { class: 'card-title' }, [el('span', { class: 'emoji', text: '🧭' }), 'Pace Check']),
      el('div', { class: 'ring-wrap' }, [
        ring(Engine.clamp(proj.paceRatio), { text: '' }),
        el('div', {}, [
          el('div', { html: '<b>' + money(Math.round(proj.monthlyNeeded)) + '</b>/mo needed to hit the goal by ' + fmtDate(s.goal.targetDate) + '.' }),
          el('div', { class: 'hint', style: 'margin-top:6px', text: proj.onTrack
            ? 'You’re saving enough — keep it up! 💪'
            : (m.surplus > 0 ? 'At your current pace you’d arrive ' + (proj.projDate ? fmtDate(proj.projDate) : 'later') + '. A little more each month closes the gap.' : 'Add your income & expenses so we can chart the pace.') })
        ])
      ])
    ]);
    root.appendChild(pace);

    /* Active quests preview */
    var quests = Engine.allQuests(s).filter(function (q) { return !q.done; }).slice(0, 3);
    var qcard = el('div', { class: 'card' }, [
      el('div', { class: 'row between' }, [el('div', { class: 'card-title', style: 'margin:0' }, [el('span', { class: 'emoji', text: '🎯' }), 'Next Quests']),
        el('button', { class: 'btn ghost sm', text: 'All →', onclick: function () { App.go('quests'); } })])
    ]);
    if (!quests.length) qcard.appendChild(el('div', { class: 'hint', style: 'margin-top:10px', text: 'All caught up — you legend! 🎉' }));
    quests.forEach(function (q) { qcard.appendChild(questRow(q)); });
    root.appendChild(qcard);

    /* Upcoming money out */
    var up = upcoming(s).slice(0, 4);
    var ucard = el('div', { class: 'card' }, [
      el('div', { class: 'row between' }, [el('div', { class: 'card-title', style: 'margin:0' }, [el('span', { class: 'emoji', text: '📅' }), 'Coming Up']),
        el('button', { class: 'btn ghost sm', text: 'Bills →', onclick: function () { App.go('money'); } })])
    ]);
    if (!up.length) ucard.appendChild(el('div', { class: 'hint', style: 'margin-top:10px', text: 'No bills or subscriptions added yet.' }));
    up.forEach(function (u) {
      ucard.appendChild(el('div', { class: 'item' }, [
        el('div', { class: 'ic', text: u.emoji || '💸' }),
        el('div', { class: 'meta' }, [el('div', { class: 'name', text: u.name }), el('div', { class: 'desc', text: u.when })]),
        el('div', { class: 'amt', text: money(u.amount) })
      ]));
    });
    root.appendChild(ucard);
  }

  function statTile(ico, val, lbl, delta, dir, countTo) {
    var valNode = el('div', { class: 'val', text: val });
    if (countTo != null && window.FX) { valNode.textContent = money(0); FX.moneyUp(valNode, countTo, { dur: 1000 }); }
    return el('div', { class: 'stat' }, [
      el('div', { class: 'ico', text: ico }),
      valNode,
      el('div', { class: 'lbl', text: lbl }),
      delta ? el('div', { class: 'delta ' + (dir || 'up'), text: delta }) : null
    ]);
  }

  /* ============================ SAVINGS ============================ */
  function savings(root) {
    var s = Store.get(), m = Engine.metrics(s);
    root.appendChild(header('Savings', 'Every dollar is a step home'));
    root.appendChild(sectionHead('💰 Savings Buckets', 'Add bucket', function () { editBucket(); }));

    if (!s.savings.length) { root.appendChild(emptyCard('🪣', 'No savings buckets yet.<br>Make one for the house!', 'Add a bucket', function () { editBucket(); })); }

    s.savings.forEach(function (b) {
      var p = b.target > 0 ? Engine.clamp(b.balance / b.target) : 0;
      var card = el('div', { class: 'card' }, [
        el('div', { class: 'ring-wrap' }, [
          ring(p, { text: pct(p) }),
          el('div', { style: 'flex:1' }, [
            el('div', { class: 'row between' }, [
              el('div', { class: 'card-title', style: 'margin:0' }, [el('span', { class: 'emoji', text: b.emoji || '🏦' }), b.name]),
              el('button', { class: 'btn ghost sm', text: '✏️', onclick: function () { editBucket(b); } })
            ]),
            el('div', { html: '<b style="font-size:1.3rem;font-family:var(--font-head)">' + money(b.balance) + '</b> <span class="muted">/ ' + money(b.target) + '</span>' }),
            el('div', { class: 'hint', text: b.target > b.balance ? (money(b.target - b.balance) + ' to go') : 'Goal reached! 🎉' })
          ])
        ]),
        el('div', { class: 'btn-row', style: 'margin-top:12px' }, [
          el('button', { class: 'btn primary', text: '+ Add money', onclick: function () { contribute(b, +1); } }),
          el('button', { class: 'btn ghost', text: '− Withdraw', onclick: function () { contribute(b, -1); } })
        ])
      ]);
      root.appendChild(card);
    });
  }

  function contribute(bucket, sign) {
    var amt = UI.input({ type: 'number', inputmode: 'decimal', placeholder: '0.00', min: '0', step: '0.01' });
    var note = UI.input({ type: 'text', placeholder: sign > 0 ? 'Payday deposit 🎉' : 'Reason' });
    var mdl = UI.modal((sign > 0 ? 'Add to ' : 'Withdraw from ') + bucket.name, [
      UI.field('Amount', amt),
      UI.field('Note (optional)', note),
      el('button', { class: 'btn primary block', text: sign > 0 ? '💖 Add it' : 'Withdraw', onclick: function (ev) {
        var v = Math.abs(parseFloat(amt.value) || 0); if (!v) return;
        if (sign > 0 && window.FX) FX.burstFrom(ev, { count: 16 });
        App.commit(function (st) {
          var b = st.savings.find(function (x) { return x.id === bucket.id; });
          b.balance = Math.max(0, Math.round((b.balance + sign * v) * 100) / 100);
          b.history = b.history || []; b.history.push({ at: Store.nowISO(), balance: b.balance });
          if (b.history.length > 200) b.history.shift();
          Store.logActivity({ type: sign > 0 ? 'save' : 'withdraw', bucket: b.name, amount: v, note: note.value });
        });
        mdl.close();
        if (sign > 0) { UI.confetti(); UI.toast('Added ' + money(v) + ' to ' + bucket.name, '💖'); UI.buzz(20); }
        else UI.toast('Withdrew ' + money(v), '💸');
      } })
    ]);
    setTimeout(function () { amt.focus(); }, 100);
  }

  function editBucket(b) {
    var isNew = !b; b = b || { name: '', emoji: '🏦', type: 'fun', balance: 0, target: 1000 };
    var name = UI.input({ value: b.name, placeholder: 'e.g. House Down Payment' });
    var emoji = UI.input({ value: b.emoji, maxlength: 2, style: 'text-align:center;font-size:1.4rem' });
    var target = UI.input({ type: 'number', value: b.target, min: '0' });
    var balance = UI.input({ type: 'number', value: b.balance, min: '0' });
    var type = b.type;
    var mdl = UI.modal(isNew ? 'New Bucket' : 'Edit Bucket', [
      el('div', { class: 'row', style: 'gap:10px' }, [
        el('div', { style: 'width:70px' }, UI.field('Icon', emoji)),
        el('div', { style: 'flex:1' }, UI.field('Name', name))
      ]),
      UI.field('Type', UI.segmented([
        { label: '🏠 House', value: 'house' }, { label: '🛟 Emergency', value: 'emergency' }, { label: '🎁 Fun', value: 'fun' }
      ], b.type, function (v) { type = v; })),
      UI.field('Goal amount', target),
      UI.field('Current balance', balance),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: isNew ? 'Create' : 'Save', onclick: function () {
          if (!name.value.trim()) return;
          App.commit(function (st) {
            if (isNew) { st.savings.push({ id: Store.uid(), name: name.value.trim(), emoji: emoji.value || '🏦', type: type, balance: +balance.value || 0, target: +target.value || 0, history: [] }); }
            else { var t = st.savings.find(function (x) { return x.id === b.id; }); t.name = name.value.trim(); t.emoji = emoji.value || '🏦'; t.type = type; t.target = +target.value || 0; t.balance = +balance.value || 0; }
          });
          mdl.close(); UI.toast('Saved', '✅');
        } }),
        isNew ? null : el('button', { class: 'btn ghost', text: '🗑️', onclick: function () { App.commit(function (st) { st.savings = st.savings.filter(function (x) { return x.id !== b.id; }); }); mdl.close(); } })
      ])
    ]);
    setTimeout(function () { name.focus(); }, 100);
  }

  /* ============================ DEBTS ============================ */
  function debts(root) {
    var s = Store.get(), m = Engine.metrics(s);
    root.appendChild(header('Debt Slayer', 'Knock it down, one payment at a time'));

    // Overview
    root.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'ring-wrap' }, [
        ring(m.debtPct, { text: pct(m.debtPct) }),
        el('div', {}, [
          el('div', { html: '<b style="font-size:1.5rem;font-family:var(--font-head)">' + money(m.totalDebt) + '</b> remaining' }),
          el('div', { class: 'hint', text: m.debtStart > 0 ? (money(m.debtPaid) + ' slain of ' + money(m.debtStart)) : 'Add debts to start slaying ⚔️' })
        ])
      ])
    ]));

    root.appendChild(sectionHead('⚔️ Your Debts', 'Add debt', function () { editDebt(); }));
    if (!s.debts.length) root.appendChild(emptyCard('🕊️', 'No debts tracked. Debt-free or ready to log some?', 'Add a debt', function () { editDebt(); }));

    // Avalanche suggestion (highest APR first)
    var byApr = s.debts.slice().sort(function (a, b) { return (b.apr || 0) - (a.apr || 0); });
    byApr.forEach(function (d, i) {
      var p = d.originalBalance > 0 ? Engine.clamp(1 - d.balance / d.originalBalance) : 0;
      var card = el('div', { class: 'card tight' }, [
        el('div', { class: 'row between' }, [
          el('div', { class: 'card-title', style: 'margin:0' }, [el('span', { class: 'emoji', text: d.emoji || '💳' }), d.name]),
          i === 0 && d.apr ? el('span', { class: 'tag bad', text: '🎯 Attack first' }) : (d.apr ? el('span', { class: 'tag info', text: d.apr + '% APR' }) : null)
        ]),
        el('div', { class: 'row between', style: 'margin-top:8px' }, [
          el('div', { html: '<b style="font-size:1.2rem;font-family:var(--font-head)">' + money(d.balance) + '</b>' }),
          el('div', { class: 'hint', text: 'min ' + money(d.minPayment || 0) + '/mo' })
        ]),
        bar(p, 'linear-gradient(90deg,#ff8095,#ffd6a5)'),
        el('div', { class: 'hint', style: 'margin-top:4px', text: pct(p) + ' paid off' }),
        el('div', { class: 'btn-row', style: 'margin-top:10px' }, [
          el('button', { class: 'btn primary', text: '💥 Make payment', onclick: function () { payDebt(d); } }),
          el('button', { class: 'btn ghost sm', text: '✏️', onclick: function () { editDebt(d); } })
        ])
      ]);
      root.appendChild(card);
    });
  }

  function payDebt(d) {
    var amt = UI.input({ type: 'number', inputmode: 'decimal', placeholder: String(d.minPayment || ''), min: '0', step: '0.01' });
    var mdl = UI.modal('Pay ' + d.name, [
      UI.field('Payment amount', amt),
      el('button', { class: 'btn primary block', text: '💥 Smash it', onclick: function (ev) {
        var v = Math.abs(parseFloat(amt.value) || 0); if (!v) return;
        if (window.FX) FX.burstFrom(ev, { count: 16, emojis: ['💥', '⚔️', '🪙', '✨'] });
        var clearedNow = false;
        App.commit(function (st) {
          var t = st.debts.find(function (x) { return x.id === d.id; });
          t.balance = Math.max(0, Math.round((t.balance - v) * 100) / 100);
          clearedNow = t.balance === 0;
          Store.logActivity({ type: 'debt', name: t.name, amount: v });
        });
        mdl.close();
        UI.confetti(clearedNow ? { big: true } : {}); UI.buzz(clearedNow ? 40 : 20);
        UI.toast(clearedNow ? d.name + ' is GONE! 🕊️' : 'Paid ' + money(v) + ' off ' + d.name, clearedNow ? '🎉' : '💥');
      } })
    ]);
    setTimeout(function () { amt.focus(); }, 100);
  }

  function editDebt(d) {
    var isNew = !d; d = d || { name: '', emoji: '💳', balance: 0, originalBalance: 0, apr: 0, minPayment: 0, owner: 'Both' };
    var name = UI.input({ value: d.name, placeholder: 'e.g. Visa Card' });
    var emoji = UI.input({ value: d.emoji, maxlength: 2, style: 'text-align:center;font-size:1.4rem' });
    var bal = UI.input({ type: 'number', value: d.balance, min: '0' });
    var orig = UI.input({ type: 'number', value: d.originalBalance || d.balance, min: '0' });
    var apr = UI.input({ type: 'number', value: d.apr, min: '0', step: '0.1' });
    var minp = UI.input({ type: 'number', value: d.minPayment, min: '0' });
    var mdl = UI.modal(isNew ? 'New Debt' : 'Edit Debt', [
      el('div', { class: 'row', style: 'gap:10px' }, [
        el('div', { style: 'width:70px' }, UI.field('Icon', emoji)),
        el('div', { style: 'flex:1' }, UI.field('Name', name))
      ]),
      el('div', { class: 'grid2' }, [UI.field('Current balance', bal), UI.field('Original balance', orig)]),
      el('div', { class: 'grid2' }, [UI.field('APR %', apr), UI.field('Min payment/mo', minp)]),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: isNew ? 'Create' : 'Save', onclick: function () {
          if (!name.value.trim()) return;
          App.commit(function (st) {
            if (isNew) st.debts.push({ id: Store.uid(), name: name.value.trim(), emoji: emoji.value || '💳', balance: +bal.value || 0, originalBalance: +orig.value || +bal.value || 0, apr: +apr.value || 0, minPayment: +minp.value || 0 });
            else { var t = st.debts.find(function (x) { return x.id === d.id; }); t.name = name.value.trim(); t.emoji = emoji.value || '💳'; t.balance = +bal.value || 0; t.originalBalance = +orig.value || +bal.value || 0; t.apr = +apr.value || 0; t.minPayment = +minp.value || 0; }
          });
          mdl.close(); UI.toast('Saved', '✅');
        } }),
        isNew ? null : el('button', { class: 'btn ghost', text: '🗑️', onclick: function () { App.commit(function (st) { st.debts = st.debts.filter(function (x) { return x.id !== d.id; }); }); mdl.close(); } })
      ])
    ]);
    setTimeout(function () { name.focus(); }, 100);
  }

  /* ============================ INCOME ============================ */
  function income(root) {
    var s = Store.get(), m = Engine.metrics(s);
    root.appendChild(header('Income', 'The fuel for the dream'));
    root.appendChild(el('div', { class: 'card' }, el('div', { class: 'row between' }, [
      el('div', {}, [el('div', { class: 'lbl muted', text: 'MONTHLY INCOME' }), el('div', { style: 'font-family:var(--font-head);font-size:2rem', text: money(Math.round(m.monthlyIncome)) })]),
      el('div', { class: 'right' }, [el('div', { class: 'lbl muted', text: 'FREE TO SAVE' }), el('div', { style: 'font-family:var(--font-head);font-size:1.4rem;color:' + (m.surplus >= 0 ? 'var(--good)' : 'var(--bad)'), text: money(Math.round(m.surplus)) })])
    ])));
    root.appendChild(sectionHead('💵 Income Sources', 'Add income', function () { editIncome(); }));
    if (!s.income.length) root.appendChild(emptyCard('💵', 'Add your paychecks & side income.', 'Add income', function () { editIncome(); }));
    s.income.forEach(function (i) {
      root.appendChild(el('div', { class: 'item' }, [
        el('div', { class: 'ic', style: 'background:var(--mint-2)', text: i.emoji || '💵' }),
        el('div', { class: 'meta' }, [el('div', { class: 'name', text: i.source }), el('div', { class: 'desc', text: cap(i.frequency) + (i.owner ? ' • ' + i.owner : '') })]),
        el('div', { class: 'amt' }, [money(i.amount), el('small', { text: '≈ ' + money(Math.round(Engine.toMonthly(i.amount, i.frequency))) + '/mo' })]),
        el('button', { class: 'btn ghost sm', text: '✏️', onclick: function () { editIncome(i); } })
      ]));
    });
  }

  function editIncome(i) {
    var isNew = !i; i = i || { source: '', amount: 0, frequency: 'biweekly', owner: 'Amber', emoji: '💵' };
    var source = UI.input({ value: i.source, placeholder: 'e.g. Main job' });
    var amount = UI.input({ type: 'number', value: i.amount, min: '0' });
    var owner = i.owner, freq = i.frequency;
    var mdl = UI.modal(isNew ? 'New Income' : 'Edit Income', [
      UI.field('Source', source),
      UI.field('Amount per paycheck', amount),
      UI.field('How often', UI.segmented([
        { label: 'Weekly', value: 'weekly' }, { label: 'Biweekly', value: 'biweekly' }, { label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }
      ], freq, function (v) { freq = v; })),
      UI.field('Whose', UI.segmented([{ label: 'Amber', value: 'Amber' }, { label: 'Avel', value: 'Avel' }, { label: 'Both', value: 'Both' }], owner, function (v) { owner = v; })),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: isNew ? 'Create' : 'Save', onclick: function () {
          if (!source.value.trim()) return;
          App.commit(function (st) {
            if (isNew) st.income.push({ id: Store.uid(), source: source.value.trim(), amount: +amount.value || 0, frequency: freq, owner: owner, emoji: '💵' });
            else { var t = st.income.find(function (x) { return x.id === i.id; }); t.source = source.value.trim(); t.amount = +amount.value || 0; t.frequency = freq; t.owner = owner; }
          });
          mdl.close(); UI.toast('Saved', '✅');
        } }),
        isNew ? null : el('button', { class: 'btn ghost', text: '🗑️', onclick: function () { App.commit(function (st) { st.income = st.income.filter(function (x) { return x.id !== i.id; }); }); mdl.close(); } })
      ])
    ]);
    setTimeout(function () { source.focus(); }, 100);
  }

  /* ============================ MONEY (Bills + Subscriptions) ============================ */
  function moneyView(root) {
    var s = Store.get(), m = Engine.metrics(s);
    root.appendChild(header('Bills & Subs', 'Know what’s going out'));
    root.appendChild(el('div', { class: 'grid3' }, [
      statTile('💵', money(Math.round(m.monthlyIncome)), 'Income/mo'),
      statTile('🧾', money(Math.round(m.monthlyBills)), 'Bills/mo'),
      statTile('🔁', money(Math.round(m.monthlySubs)), 'Subs/mo')
    ]));
    root.appendChild(el('button', { class: 'btn ghost block', style: 'margin-bottom:14px', text: '💵 Manage income sources →', onclick: function () { App.go('income'); } }));

    // Upcoming timeline
    var up = upcoming(s);
    var tl = el('div', { class: 'card' }, [el('div', { class: 'card-title' }, [el('span', { class: 'emoji', text: '📅' }), 'Next 30 days'])]);
    if (!up.length) tl.appendChild(el('div', { class: 'hint', text: 'Nothing scheduled yet.' }));
    up.forEach(function (u) {
      tl.appendChild(el('div', { class: 'item' }, [
        el('div', { class: 'ic', text: u.emoji || '💸' }),
        el('div', { class: 'meta' }, [el('div', { class: 'name', text: u.name }), el('div', { class: 'desc', text: u.when })]),
        el('div', { class: 'amt', text: money(u.amount) })
      ]));
    });
    root.appendChild(tl);

    root.appendChild(sectionHead('🧾 Monthly Bills', 'Add bill', function () { editBill(); }));
    if (!s.bills.length) root.appendChild(el('div', { class: 'hint', style: 'margin:0 4px 12px', text: 'No bills yet — rent, utilities, car…' }));
    s.bills.forEach(function (b) {
      root.appendChild(el('div', { class: 'item' }, [
        el('div', { class: 'ic', style: 'background:#fff0db', text: b.emoji || '🧾' }),
        el('div', { class: 'meta' }, [el('div', { class: 'name', text: b.name }), el('div', { class: 'desc', text: 'Due day ' + b.dueDay + (b.category ? ' • ' + b.category : '') })]),
        el('div', { class: 'amt', text: money(b.amount) }),
        el('button', { class: 'btn ghost sm', text: '✏️', onclick: function () { editBill(b); } })
      ]));
    });

    root.appendChild(sectionHead('🔁 Subscriptions', 'Add sub', function () { editSub(); }));
    if (!s.subscriptions.length) root.appendChild(el('div', { class: 'hint', style: 'margin:0 4px 12px', text: 'No subscriptions — Netflix, gym, apps…' }));
    s.subscriptions.forEach(function (x) {
      root.appendChild(el('div', { class: 'item' }, [
        el('div', { class: 'ic', style: 'background:var(--lilac-2)', text: x.emoji || '🔁' }),
        el('div', { class: 'meta' }, [el('div', { class: 'name', text: x.name }), el('div', { class: 'desc', text: cap(x.frequency) + ' • next ' + (x.nextDate ? fmtDay(x.nextDate) : '—') })]),
        el('div', { class: 'amt', text: money(x.amount) }),
        el('button', { class: 'btn ghost sm', text: '✏️', onclick: function () { editSub(x); } })
      ]));
    });
  }

  function editBill(b) {
    var isNew = !b; b = b || { name: '', emoji: '🧾', amount: 0, dueDay: 1, category: '' };
    var name = UI.input({ value: b.name, placeholder: 'e.g. Rent' });
    var emoji = UI.input({ value: b.emoji, maxlength: 2, style: 'text-align:center;font-size:1.4rem' });
    var amount = UI.input({ type: 'number', value: b.amount, min: '0' });
    var due = UI.input({ type: 'number', value: b.dueDay, min: '1', max: '31' });
    var cat = UI.input({ value: b.category, placeholder: 'Housing / Car / Utility' });
    var mdl = UI.modal(isNew ? 'New Bill' : 'Edit Bill', [
      el('div', { class: 'row', style: 'gap:10px' }, [el('div', { style: 'width:70px' }, UI.field('Icon', emoji)), el('div', { style: 'flex:1' }, UI.field('Name', name))]),
      el('div', { class: 'grid2' }, [UI.field('Amount/mo', amount), UI.field('Due day (1-31)', due)]),
      UI.field('Category', cat),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: isNew ? 'Create' : 'Save', onclick: function () {
          if (!name.value.trim()) return;
          App.commit(function (st) {
            if (isNew) st.bills.push({ id: Store.uid(), name: name.value.trim(), emoji: emoji.value || '🧾', amount: +amount.value || 0, dueDay: Math.min(31, Math.max(1, +due.value || 1)), category: cat.value });
            else { var t = st.bills.find(function (x) { return x.id === b.id; }); t.name = name.value.trim(); t.emoji = emoji.value || '🧾'; t.amount = +amount.value || 0; t.dueDay = Math.min(31, Math.max(1, +due.value || 1)); t.category = cat.value; }
          });
          mdl.close(); UI.toast('Saved', '✅');
        } }),
        isNew ? null : el('button', { class: 'btn ghost', text: '🗑️', onclick: function () { App.commit(function (st) { st.bills = st.bills.filter(function (x) { return x.id !== b.id; }); }); mdl.close(); } })
      ])
    ]);
    setTimeout(function () { name.focus(); }, 100);
  }

  function editSub(x) {
    var isNew = !x; x = x || { name: '', emoji: '🔁', amount: 0, frequency: 'monthly', nextDate: '' };
    var name = UI.input({ value: x.name, placeholder: 'e.g. Netflix' });
    var emoji = UI.input({ value: x.emoji, maxlength: 2, style: 'text-align:center;font-size:1.4rem' });
    var amount = UI.input({ type: 'number', value: x.amount, min: '0' });
    var next = UI.input({ type: 'date', value: x.nextDate || '' });
    var freq = x.frequency;
    var mdl = UI.modal(isNew ? 'New Subscription' : 'Edit Subscription', [
      el('div', { class: 'row', style: 'gap:10px' }, [el('div', { style: 'width:70px' }, UI.field('Icon', emoji)), el('div', { style: 'flex:1' }, UI.field('Name', name))]),
      UI.field('Amount', amount),
      UI.field('Billing', UI.segmented([{ label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }, { label: 'Yearly', value: 'yearly' }], freq, function (v) { freq = v; })),
      UI.field('Next charge date', next),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: isNew ? 'Create' : 'Save', onclick: function () {
          if (!name.value.trim()) return;
          App.commit(function (st) {
            if (isNew) st.subscriptions.push({ id: Store.uid(), name: name.value.trim(), emoji: emoji.value || '🔁', amount: +amount.value || 0, frequency: freq, nextDate: next.value });
            else { var t = st.subscriptions.find(function (s2) { return s2.id === x.id; }); t.name = name.value.trim(); t.emoji = emoji.value || '🔁'; t.amount = +amount.value || 0; t.frequency = freq; t.nextDate = next.value; }
          });
          mdl.close(); UI.toast('Saved', '✅');
        } }),
        isNew ? null : el('button', { class: 'btn ghost', text: '🗑️', onclick: function () { App.commit(function (st) { st.subscriptions = st.subscriptions.filter(function (s2) { return s2.id !== x.id; }); }); mdl.close(); } })
      ])
    ]);
    setTimeout(function () { name.focus(); }, 100);
  }

  // Build the upcoming 30-day list from bills (dueDay) + subs (nextDate)
  function upcoming(s) {
    var now = new Date(); var horizon = new Date(); horizon.setDate(horizon.getDate() + 30);
    var out = [];
    s.bills.forEach(function (b) {
      var d = new Date(now.getFullYear(), now.getMonth(), b.dueDay);
      if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, b.dueDay);
      if (d <= horizon) out.push({ name: b.name, emoji: b.emoji, amount: b.amount, date: d, when: 'Bill • ' + fmtDay(d) });
    });
    s.subscriptions.forEach(function (x) {
      if (!x.nextDate) return; var d = new Date(x.nextDate + 'T00:00:00');
      if (d >= now && d <= horizon) out.push({ name: x.name, emoji: x.emoji, amount: x.amount, date: d, when: 'Sub • ' + fmtDay(d) });
    });
    out.sort(function (a, b) { return a.date - b.date; });
    return out;
  }

  /* ============================ QUESTS & BADGES ============================ */
  function quests(root) {
    var s = Store.get(), lvl = Engine.levelInfo(s);
    root.appendChild(header('Quests & Rewards', 'Hit goals, earn treats 🎁'));

    // Level card
    root.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'xp-wrap' }, [
        el('div', { class: 'level-badge' }, [el('small', { text: 'LEVEL' }), el('b', { text: lvl.level })]),
        el('div', { class: 'xp-bar' }, [
          el('div', { class: 'label' }, [el('span', { text: lvl.title }), el('span', { text: lvl.totalXp.toLocaleString() + ' XP' })]),
          (function () { var b = el('div', { class: 'bar' }, el('span')); requestAnimationFrame(function () { requestAnimationFrame(function () { b.firstChild.style.width = pct(lvl.pct); }); }); return b; })()
        ])
      ])
    ]));

    var all = Engine.allQuests(s);
    var done = all.filter(function (q) { return q.done; }), todo = all.filter(function (q) { return !q.done; });

    root.appendChild(sectionHead('🎯 Active Quests', 'Add reward', function () { editQuest(); }));
    var ac = el('div', { class: 'card' });
    if (!todo.length) ac.appendChild(el('div', { class: 'hint', text: 'Every quest complete — incredible! 🏆' }));
    todo.forEach(function (q) { ac.appendChild(questRow(q)); });
    root.appendChild(ac);

    if (done.length) {
      root.appendChild(el('div', { class: 'section-head' }, el('h2', { text: '✅ Completed' })));
      var dc = el('div', { class: 'card' });
      done.forEach(function (q) { dc.appendChild(questRow(q)); });
      root.appendChild(dc);
    }

    // Badges
    root.appendChild(el('div', { class: 'section-head' }, el('h2', { text: '🏅 Badges' })));
    var bc = el('div', { class: 'card' }, el('div', { class: 'badges' }, Engine.badgeDefs().map(function (b) {
      var earned = s.earnedBadges.indexOf(b.id) >= 0;
      return el('div', { class: 'badge' + (earned ? '' : ' locked') }, [el('div', { class: 'bico', text: b.ico }), el('div', { class: 'bname', text: b.name })]);
    })));
    root.appendChild(bc);
  }

  function questRow(q) {
    var row = el('div', { class: 'quest' + (q.done ? ' done' : '') }, [
      el('div', { class: 'qic', text: q.emoji }),
      el('div', { class: 'qmeta' }, [
        el('div', { class: 'qt', text: q.title }),
        el('div', { class: 'qd', text: q.desc }),
        q.reward ? el('div', { class: 'reward', text: '🎁 ' + q.reward }) : null,
        (!q.done && q.progress != null && q.progress > 0 && q.progress < 1) ? bar(q.progress) : null
      ]),
      el('div', { class: 'check', text: q.done ? '✓' : '' })
    ]);
    if (q.custom) row.addEventListener('click', function () { editQuest(findCustom(q.id)); });
    return row;
  }
  function findCustom(id) { return (Store.get().customQuests || []).find(function (c) { return c.id === id; }); }

  function editQuest(c) {
    var isNew = !c; c = c || { emoji: '🎁', title: '', desc: '', reward: '', done: false };
    var emoji = UI.input({ value: c.emoji, maxlength: 2, style: 'text-align:center;font-size:1.4rem' });
    var title = UI.input({ value: c.title, placeholder: 'e.g. No takeout for 2 weeks' });
    var desc = UI.input({ value: c.desc, placeholder: 'Details (optional)' });
    var reward = UI.input({ value: c.reward, placeholder: 'e.g. Spa day 💆' });
    var done = c.done;
    var mdl = UI.modal(isNew ? 'New Reward Quest' : 'Edit Quest', [
      el('div', { class: 'row', style: 'gap:10px' }, [el('div', { style: 'width:70px' }, UI.field('Icon', emoji)), el('div', { style: 'flex:1' }, UI.field('Quest', title))]),
      UI.field('Description', desc),
      UI.field('Reward 🎁', reward),
      UI.field('Status', UI.segmented([{ label: '⏳ In progress', value: 'no' }, { label: '✅ Done', value: 'yes' }], done ? 'yes' : 'no', function (v) { done = v === 'yes'; })),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: isNew ? 'Create' : 'Save', onclick: function () {
          if (!title.value.trim()) return;
          var wasDone = c.done;
          App.commit(function (st) {
            st.customQuests = st.customQuests || [];
            if (isNew) st.customQuests.push({ id: Store.uid(), emoji: emoji.value || '🎁', title: title.value.trim(), desc: desc.value, reward: reward.value, done: done });
            else { var t = st.customQuests.find(function (x) { return x.id === c.id; }); t.emoji = emoji.value || '🎁'; t.title = title.value.trim(); t.desc = desc.value; t.reward = reward.value; t.done = done; }
          });
          mdl.close();
          if (done && !wasDone) { UI.confetti({ big: true }); UI.toast('Quest complete: ' + title.value, '🎉'); }
          else UI.toast('Saved', '✅');
        } }),
        isNew ? null : el('button', { class: 'btn ghost', text: '🗑️', onclick: function () { App.commit(function (st) { st.customQuests = (st.customQuests || []).filter(function (x) { return x.id !== c.id; }); }); mdl.close(); } })
      ])
    ]);
    setTimeout(function () { title.focus(); }, 100);
  }

  /* ============================ SETTINGS ============================ */
  function settings(root) {
    var s = Store.get();
    root.appendChild(header('Settings', 'Make it yours'));

    // Goal
    root.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'card-title' }, [el('span', { class: 'emoji', text: '🎯' }), 'The Goal']),
      settingRow('Goal name', s.goal.name),
      settingRow('Target date', fmtDate(s.goal.targetDate)),
      settingRow('Down payment', money(s.goal.downPaymentTarget)),
      settingRow('Extra costs buffer', money(s.goal.extraCostsTarget)),
      el('button', { class: 'btn primary block', style: 'margin-top:10px', text: 'Edit goal', onclick: editGoal })
    ]));

    // Notifications
    var rec = s.notify.recipients || [];
    var ncard = el('div', { class: 'card' }, [
      el('div', { class: 'card-title' }, [el('span', { class: 'emoji', text: '📲' }), 'Text Updates']),
      el('div', { class: 'hint', style: 'margin-bottom:10px', text: 'Free carrier email-to-text. Add each phone + carrier; the weekly summary & milestone alerts go here.' })
    ]);
    if (!rec.length) ncard.appendChild(el('div', { class: 'hint', text: 'No numbers yet.' }));
    rec.forEach(function (r) {
      ncard.appendChild(el('div', { class: 'item' }, [
        el('div', { class: 'ic', text: '📱' }),
        el('div', { class: 'meta' }, [el('div', { class: 'name', text: r.name }), el('div', { class: 'desc', text: r.number + ' • ' + r.carrier })]),
        el('button', { class: 'btn ghost sm', text: '✏️', onclick: function () { editRecipient(r); } })
      ]));
    });
    ncard.appendChild(el('div', { class: 'btn-row', style: 'margin-top:10px' }, [
      el('button', { class: 'btn ghost', text: '+ Add number', onclick: function () { editRecipient(); } }),
      el('button', { class: 'btn primary', text: '✉️ Send update now', onclick: function () { App.sendTextUpdate(); } })
    ]));
    root.appendChild(ncard);

    // GitHub sync
    var gh = (window.GitHubSync && GitHubSync.getConfig()) || {};
    root.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'card-title' }, [el('span', { class: 'emoji', text: '☁️' }), 'GitHub Sync']),
      el('div', { class: 'hint', style: 'margin-bottom:10px', html: gh.repo ? ('Syncing to <b>' + gh.repo + '</b>. Both devices share the same numbers.') : 'Optional: keep both phones in sync via a private GitHub repo. (Works fine without it — data saves on each device.)' }),
      el('button', { class: 'btn ' + (gh.repo ? 'ghost' : 'primary') + ' block', text: gh.repo ? 'Edit sync settings' : 'Set up GitHub sync', onclick: editGitHub }),
      gh.repo ? el('button', { class: 'btn ghost block', style: 'margin-top:8px', text: '⬇️ Pull latest now', onclick: function () { GitHubSync.pull(true).then(function () { UI.toast('Pulled latest', '☁️'); }).catch(function (e) { UI.toast('Pull failed: ' + e.message, '⚠️'); }); } }) : null
    ]));

    // Access / device binding
    var dev = Store.getDevice();
    var acard = el('div', { class: 'card' }, [
      el('div', { class: 'card-title' }, [el('span', { class: 'emoji', text: '🔐' }), 'Access & Devices']),
      el('div', { class: 'hint', style: 'margin-bottom:8px', html: dev ? ('This device is bound to <b>' + dev.owner + '</b> (' + dev.name + ').') : 'This device is not bound.' })
    ]);
    (s.access.devices || []).forEach(function (d) {
      acard.appendChild(el('div', { class: 'item' }, [
        el('div', { class: 'ic', text: '💻' }),
        el('div', { class: 'meta' }, [el('div', { class: 'name', text: d.owner }), el('div', { class: 'desc', text: d.name + ' • ' + fmtDay(d.activatedAt) })])
      ]));
    });
    acard.appendChild(el('div', { class: 'btn-row', style: 'margin-top:10px' }, [
      el('button', { class: 'btn ghost', text: 'Manage codes', onclick: editCodes }),
      el('button', { class: 'btn ghost', text: 'Unbind this device', onclick: function () { Store.unbindThisDevice(); UI.toast('Device unbound', '🔓'); setTimeout(function () { location.reload(); }, 600); } })
    ]));
    root.appendChild(acard);

    // Custom animations (Lottie)
    var mascotOn = window.LottieFX && LottieFX.available('mascot');
    var celebrateOn = window.LottieFX && LottieFX.available('celebrate');
    root.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'card-title' }, [el('span', { class: 'emoji', text: '✨' }), 'Custom Animations']),
      el('div', { class: 'hint', html: 'Drop animation files into <span class="code">assets/lottie/</span> and they appear automatically:' }),
      el('div', { style: 'margin:10px 0' }, [
        animSlot('mascot.json', 'Home mascot', mascotOn),
        animSlot('celebrate.json', 'Win celebration overlay', celebrateOn),
        animSlot('house.json', 'Goal animation (reserved)', window.LottieFX && LottieFX.available('house'))
      ]),
      el('div', { class: 'hint', html: 'Grab free <b>.json</b> animations from <a href="https://lottiefiles.com" target="_blank">lottiefiles.com</a> (or export from Glaxnimate / Rive / After Effects). Rename to the names above.' }),
      el('button', { class: 'btn ghost block', style: 'margin-top:10px', text: '🎉 Test celebration', onclick: function () { if (window.LottieFX) LottieFX.celebrate(); UI.confetti({ big: true }); if (window.FX) FX.burstFrom(null, { count: 18 }); } })
    ]));

    // Data
    root.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'card-title' }, [el('span', { class: 'emoji', text: '💾' }), 'Your Data']),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn ghost', text: '⬇️ Export', onclick: App.exportData }),
        el('button', { class: 'btn ghost', text: '⬆️ Import', onclick: App.importData }),
        el('button', { class: 'btn ghost', text: '🗑️ Reset all', onclick: function () { if (confirm('Erase everything and start fresh?')) { Store.resetAll(); UI.toast('Reset done', '🧼'); } } })
      ])
    ]));

    root.appendChild(el('div', { class: 'center hint', style: 'margin:6px 0 20px', text: "Amber's Finance Hub • made with 💖" }));
  }

  function settingRow(k, v) { return el('div', { class: 'row between', style: 'padding:6px 0' }, [el('span', { class: 'muted', text: k }), el('b', { text: v })]); }

  function animSlot(file, label, state) {
    var tag = state === true ? el('span', { class: 'tag', text: '✅ Active' }) : el('span', { class: 'tag info', text: '⬜ Not added' });
    return el('div', { class: 'row between', style: 'padding:5px 0' }, [
      el('div', {}, [el('b', { text: label }), el('div', { class: 'hint', html: '<span class="code">' + file + '</span>' })]),
      tag
    ]);
  }

  function editGoal() {
    var s = Store.get();
    var name = UI.input({ value: s.goal.name });
    var date = UI.input({ type: 'date', value: s.goal.targetDate });
    var dp = UI.input({ type: 'number', value: s.goal.downPaymentTarget, min: '0' });
    var ex = UI.input({ type: 'number', value: s.goal.extraCostsTarget, min: '0' });
    var mdl = UI.modal('Edit Goal', [
      UI.field('Goal name', name), UI.field('Target date', date),
      el('div', { class: 'grid2' }, [UI.field('Down payment $', dp), UI.field('Extra costs $', ex)]),
      el('button', { class: 'btn primary block', text: 'Save goal', onclick: function () {
        App.commit(function (st) { st.goal.name = name.value || st.goal.name; st.goal.targetDate = date.value || st.goal.targetDate; st.goal.downPaymentTarget = +dp.value || 0; st.goal.extraCostsTarget = +ex.value || 0; var h = st.savings.find(function (x) { return x.type === 'house'; }); if (h) h.target = +dp.value || h.target; });
        mdl.close(); UI.toast('Goal updated', '🎯');
      } })
    ]);
  }

  function editRecipient(r) {
    var isNew = !r; r = r || { name: '', number: '', carrier: 'Verizon' };
    var name = UI.input({ value: r.name, placeholder: 'Amber' });
    var num = UI.input({ value: r.number, placeholder: '5551234567', inputmode: 'numeric' });
    var carrier = r.carrier;
    var carriers = Object.keys(App.CARRIERS);
    var sel = el('select', {}, carriers.map(function (c) { var o = el('option', { value: c, text: c }); if (c === carrier) o.selected = true; return o; }));
    sel.addEventListener('change', function () { carrier = sel.value; });
    var mdl = UI.modal(isNew ? 'Add Number' : 'Edit Number', [
      UI.field('Name', name), UI.field('Phone (digits only)', num), UI.field('Carrier', sel),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: 'Save', onclick: function () {
          if (!num.value.trim()) return;
          App.commit(function (st) {
            st.notify.recipients = st.notify.recipients || [];
            if (isNew) st.notify.recipients.push({ id: Store.uid(), name: name.value.trim(), number: num.value.replace(/\D/g, ''), carrier: carrier });
            else { var t = st.notify.recipients.find(function (x) { return x.id === r.id; }); t.name = name.value.trim(); t.number = num.value.replace(/\D/g, ''); t.carrier = carrier; }
          });
          mdl.close(); UI.toast('Saved', '✅');
        } }),
        isNew ? null : el('button', { class: 'btn ghost', text: '🗑️', onclick: function () { App.commit(function (st) { st.notify.recipients = (st.notify.recipients || []).filter(function (x) { return x.id !== r.id; }); }); mdl.close(); } })
      ])
    ]);
  }

  function editGitHub() {
    var cfg = (window.GitHubSync && GitHubSync.getConfig()) || {};
    var repo = UI.input({ value: cfg.repo || '', placeholder: 'username/repo-name' });
    var token = UI.input({ value: cfg.token || '', placeholder: 'ghp_… (fine-grained token)', type: 'password' });
    var path = UI.input({ value: cfg.path || 'data/finance.json' });
    var mdl = UI.modal('GitHub Sync', [
      el('div', { class: 'hint', style: 'margin-bottom:10px', html: 'Create a <b>private</b> repo + a fine-grained token with <span class="code">Contents: Read/Write</span> on just that repo. See the README for steps.' }),
      UI.field('Repo (user/name)', repo), UI.field('Path', path), UI.field('Access token', token),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn primary', style: 'flex:1', text: 'Save & test', onclick: function () {
          GitHubSync.setConfig({ repo: repo.value.trim(), token: token.value.trim(), path: path.value.trim() || 'data/finance.json' });
          GitHubSync.pull(true).then(function (pulled) { UI.toast(pulled ? 'Connected & pulled!' : 'Connected (empty repo)', '☁️'); mdl.close(); })
            .catch(function (e) { UI.toast('Could not connect: ' + e.message, '⚠️'); });
        } }),
        el('button', { class: 'btn ghost', text: 'Disconnect', onclick: function () { GitHubSync.setConfig(null); mdl.close(); UI.toast('Disconnected', '🔌'); } })
      ])
    ]);
  }

  function editCodes() {
    var s = Store.get();
    var codes = Object.assign({}, s.access.codes);
    var amberCode = '', avelCode = '';
    Object.keys(codes).forEach(function (k) { if (codes[k] === 'Amber') amberCode = k; if (codes[k] === 'Avel') avelCode = k; });
    var a = UI.input({ value: amberCode });
    var v = UI.input({ value: avelCode });
    var mdl = UI.modal('Activation Codes', [
      el('div', { class: 'hint', style: 'margin-bottom:10px', text: 'Each person enters their code once on a new device to unlock it. Keep them private.' }),
      UI.field("Amber's code", a), UI.field("Avel's code", v),
      el('button', { class: 'btn primary block', text: 'Save codes', onclick: function () {
        App.commit(function (st) {
          var map = {};
          if (a.value.trim()) map[a.value.trim().toUpperCase()] = 'Amber';
          if (v.value.trim()) map[v.value.trim().toUpperCase()] = 'Avel';
          st.access.codes = map;
        });
        mdl.close(); UI.toast('Codes updated', '🔐');
      } })
    ]);
  }

  /* ---------- shared ---------- */
  function sectionHead(title, btn, onClick) {
    return el('div', { class: 'section-head' }, [el('h2', { text: title }), btn ? el('button', { class: 'btn primary sm', text: '+ ' + btn, onclick: onClick }) : null]);
  }
  function cap(s) { return (s || '').charAt(0).toUpperCase() + (s || '').slice(1); }

  window.Views = { bind: bind, home: home, savings: savings, debts: debts, income: income, money: moneyView, quests: quests, settings: settings, upcoming: upcoming };
})();
