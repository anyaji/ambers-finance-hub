/* ===========================================================
   engine.js — derived finance metrics, XP/levels, quests, badges,
   milestones, projections. Pure functions over state.
   Exposes window.Engine
   =========================================================== */
(function () {
  'use strict';

  var PER = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1, once: 0 };

  function toMonthly(amount, freq) {
    var n = PER[freq] != null ? PER[freq] : 12;
    return n === 0 ? 0 : (amount * n) / 12;
  }

  function sum(arr, fn) { return arr.reduce(function (a, x) { return a + (fn ? fn(x) : x); }, 0); }

  /* ---------- Core metrics ---------- */
  function metrics(s) {
    var monthlyIncome = sum(s.income, function (i) { return toMonthly(i.amount, i.frequency); });
    var monthlyBills = sum(s.bills, function (b) { return b.amount; }); // bills are monthly
    var monthlySubs = sum(s.subscriptions, function (x) { return toMonthly(x.amount, x.frequency); });
    var monthlyMinDebt = sum(s.debts, function (d) { return d.minPayment || 0; });
    var monthlyExpenses = monthlyBills + monthlySubs + monthlyMinDebt;
    var surplus = monthlyIncome - monthlyExpenses;

    var totalSaved = sum(s.savings, function (x) { return x.balance; });
    var totalDebt = sum(s.debts, function (d) { return d.balance; });
    var totalDebtStart = sum(s.debts, function (d) { return d.originalBalance || d.balance; });
    var debtPaid = Math.max(0, totalDebtStart - totalDebt);

    var house = s.savings.find(function (x) { return x.type === 'house'; }) || { balance: 0, target: s.goal.downPaymentTarget };
    var houseGoal = (s.goal.downPaymentTarget || 0) + (s.goal.extraCostsTarget || 0);
    var housePct = houseGoal > 0 ? clamp(totalSaved / houseGoal) : 0;

    var net = totalSaved - totalDebt;

    return {
      monthlyIncome: monthlyIncome,
      monthlyExpenses: monthlyExpenses,
      monthlyBills: monthlyBills,
      monthlySubs: monthlySubs,
      monthlyMinDebt: monthlyMinDebt,
      surplus: surplus,
      savingsRate: monthlyIncome > 0 ? clamp(surplus / monthlyIncome) : 0,
      totalSaved: totalSaved,
      totalDebt: totalDebt,
      debtPaid: debtPaid,
      debtStart: totalDebtStart,
      debtPct: totalDebtStart > 0 ? clamp(debtPaid / totalDebtStart) : 0,
      net: net,
      houseBalance: house.balance,
      houseGoal: houseGoal,
      housePct: housePct,
      houseRemaining: Math.max(0, houseGoal - totalSaved)
    };
  }

  function clamp(x) { return Math.max(0, Math.min(1, x)); }

  /* ---------- Days/countdown ---------- */
  function daysUntil(dateStr) {
    var t = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    return Math.ceil((t - now) / 86400000);
  }

  // On-track projection: at current surplus, do we hit the house goal by target date?
  function projection(s) {
    var m = metrics(s);
    var days = daysUntil(s.goal.targetDate);
    var months = Math.max(0.1, days / 30.44);
    var need = m.houseRemaining;
    var monthlyNeeded = need / months;
    var paceRatio = monthlyNeeded > 0 ? (m.surplus / monthlyNeeded) : 2;
    var onTrack = m.surplus >= monthlyNeeded && m.surplus > 0;
    var projDate = null;
    if (m.surplus > 0) {
      var monthsToGoal = need / m.surplus;
      var d = new Date();
      d.setMonth(d.getMonth() + Math.ceil(monthsToGoal));
      projDate = d;
    }
    return {
      days: days, months: months, monthlyNeeded: monthlyNeeded,
      onTrack: onTrack, paceRatio: paceRatio, projDate: projDate
    };
  }

  /* ---------- XP & Levels ---------- */
  // XP: $1 saved = 1xp, $1 debt paid = 1xp, +250 per completed quest/badge.
  function xp(s) {
    var m = metrics(s);
    var base = Math.round(m.totalSaved + m.debtPaid);
    var bonus = (s.earnedBadges.length) * 250 + completedQuests(s).length * 150;
    var gameXp = (s.games && s.games.xp) || 0;
    return base + bonus + gameXp;
  }

  // Level curve: each level needs more XP (gentle quadratic).
  function levelInfo(s) {
    var totalXp = xp(s);
    var lvl = 1, need = 1000, acc = 0;
    while (totalXp >= acc + need) { acc += need; lvl++; need = Math.round(1000 * Math.pow(lvl, 1.25)); }
    return {
      level: lvl,
      xpInto: totalXp - acc,
      xpForNext: need,
      pct: clamp((totalXp - acc) / need),
      totalXp: totalXp,
      title: levelTitle(lvl)
    };
  }
  function levelTitle(l) {
    var t = ['Spark','Saver','Budget Buddy','Money Mover','Goal Getter','Coin Champ','Wealth Wizard','House Hero','Legend'];
    return t[Math.min(l - 1, t.length - 1)];
  }

  /* ---------- Milestones along the journey to the house ---------- */
  function milestones(s) {
    var m = metrics(s);
    var goal = m.houseGoal || 1;
    var marks = [0.1, 0.25, 0.5, 0.75, 0.9, 1.0];
    return marks.map(function (p) {
      return {
        pct: p,
        amount: Math.round(goal * p),
        hit: m.totalSaved >= goal * p,
        label: p === 1 ? 'KEYS! 🔑' : Math.round(p * 100) + '%'
      };
    });
  }

  /* ---------- Quests (auto-generated objectives) ---------- */
  function autoQuests(s) {
    var m = metrics(s);
    var q = [];
    function push(id, emoji, title, desc, done, reward, progress) {
      q.push({ id: id, emoji: emoji, title: title, desc: desc, done: done, reward: reward, progress: progress });
    }
    push('first-dollar', '✨', 'Plant the Seed', 'Save your first $1 toward the house', m.totalSaved >= 1, 'Unlock the Journey 🌱');
    push('first-500', '🌷', 'Little Sprout', 'Save your first $500', m.totalSaved >= 500, 'Coffee date on me ☕', clamp(m.totalSaved / 500));
    push('first-1k', '🌸', 'Thousandaire', 'Reach $1,000 saved', m.totalSaved >= 1000, 'Movie night 🍿', clamp(m.totalSaved / 1000));
    push('emergency', '🛟', 'Safety Net', 'Build a $1,000 emergency fund', emergencyBal(s) >= 1000, 'Peace of mind 😌', clamp(emergencyBal(s) / 1000));
    push('debt-dent', '⚔️', 'Debt Slayer I', 'Pay off your first $500 of debt', m.debtPaid >= 500, 'Treat yourself 🎁', m.debtStart ? clamp(m.debtPaid / 500) : (m.debtStart === 0 ? 1 : 0));
    push('halfway', '🏞️', 'Halfway There', 'Reach 50% of the house goal', m.housePct >= 0.5, 'Fancy dinner 🍝', clamp(m.housePct / 0.5));
    push('positive-net', '⚖️', 'In the Green', 'Get total savings above total debt', m.net > 0, 'Bragging rights 💪');
    push('saver-rate', '📈', 'Super Saver', 'Save 20%+ of monthly income', m.savingsRate >= 0.2, 'New plant for the home 🪴', clamp(m.savingsRate / 0.2));
    push('keys', '🔑', 'Welcome Home', 'Reach the full down payment + costs', m.housePct >= 1, 'THE HOUSE 🏡🎉', m.housePct);
    return q;
  }

  function emergencyBal(s) {
    var e = s.savings.find(function (x) { return x.type === 'emergency'; });
    return e ? e.balance : 0;
  }

  function allQuests(s) {
    var custom = (s.customQuests || []).map(function (c) {
      return { id: c.id, emoji: c.emoji || '⭐', title: c.title, desc: c.desc || '', done: !!c.done, reward: c.reward || '', custom: true, progress: c.done ? 1 : 0 };
    });
    return autoQuests(s).concat(custom);
  }
  function completedQuests(s) { return allQuests(s).filter(function (q) { return q.done; }); }

  /* ---------- Badges ---------- */
  var BADGE_DEFS = [
    { id: 'first-dollar', ico: '🌱', name: 'First Dollar', test: function (m) { return m.totalSaved >= 1; } },
    { id: 'grand', ico: '💵', name: '$1K Club', test: function (m) { return m.totalSaved >= 1000; } },
    { id: 'five-k', ico: '🏆', name: '$5K Saver', test: function (m) { return m.totalSaved >= 5000; } },
    { id: 'ten-k', ico: '💎', name: '$10K Vault', test: function (m) { return m.totalSaved >= 10000; } },
    { id: 'debt-slayer', ico: '⚔️', name: 'Debt Slayer', test: function (m) { return m.debtPaid >= 1000; } },
    { id: 'debt-free', ico: '🕊️', name: 'Debt Free', test: function (m) { return m.debtStart > 0 && m.totalDebt === 0; } },
    { id: 'half', ico: '🏞️', name: 'Halfway Home', test: function (m) { return m.housePct >= 0.5; } },
    { id: 'green', ico: '⚖️', name: 'In The Green', test: function (m) { return m.net > 0; } },
    { id: 'home', ico: '🏡', name: 'Homeowner', test: function (m) { return m.housePct >= 1; } }
  ];

  // Returns newly-earned badge ids (not yet in earnedBadges).
  function checkBadges(s) {
    var m = metrics(s);
    var newly = [];
    BADGE_DEFS.forEach(function (b) {
      if (b.test(m) && s.earnedBadges.indexOf(b.id) === -1) newly.push(b.id);
    });
    return newly;
  }
  function badgeDefs() { return BADGE_DEFS; }

  window.Engine = {
    metrics: metrics, toMonthly: toMonthly, daysUntil: daysUntil, projection: projection,
    levelInfo: levelInfo, xp: xp, milestones: milestones,
    allQuests: allQuests, completedQuests: completedQuests, autoQuests: autoQuests,
    checkBadges: checkBadges, badgeDefs: badgeDefs, clamp: clamp, PER: PER
  };
})();
