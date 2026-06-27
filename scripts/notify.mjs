/* ===========================================================
   notify.mjs — runs in GitHub Actions on a schedule.
   Reads data/finance.json, builds a text-friendly summary, and
   emits `to`, `subject`, `body` to $GITHUB_OUTPUT for the mail step.
   Pure Node, no dependencies.
   =========================================================== */
import { readFileSync, appendFileSync } from 'node:fs';

const CARRIERS = {
  'Verizon': 'vtext.com', 'AT&T': 'txt.att.net', 'T-Mobile': 'tmomail.net',
  'Sprint': 'messaging.sprintpcs.com', 'Boost Mobile': 'sms.myboostmobile.com',
  'Cricket': 'sms.cricketwireless.net', 'US Cellular': 'email.uscc.net',
  'Metro by T-Mobile': 'mymetropcs.com', 'Google Fi': 'msg.fi.google.com',
  'Mint Mobile': 'tmomail.net', 'Visible': 'vtext.com',
  'Consumer Cellular': 'mailmymobile.net', 'Straight Talk': 'vtext.com'
};
const PER = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1, once: 0 };
const toMonthly = (a, f) => (PER[f] === 0 ? 0 : (a * (PER[f] ?? 12)) / 12);
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const sum = (arr, fn) => arr.reduce((a, x) => a + (fn ? fn(x) : x), 0);

function load() {
  try { return JSON.parse(readFileSync('data/finance.json', 'utf8')); }
  catch { console.log('No data/finance.json yet — skipping.'); process.exit(0); }
}

function summarize(s) {
  const monthlyIncome = sum(s.income || [], i => toMonthly(i.amount, i.frequency));
  const monthlyBills = sum(s.bills || [], b => b.amount);
  const monthlySubs = sum(s.subscriptions || [], x => toMonthly(x.amount, x.frequency));
  const monthlyMinDebt = sum(s.debts || [], d => d.minPayment || 0);
  const surplus = monthlyIncome - (monthlyBills + monthlySubs + monthlyMinDebt);
  const totalSaved = sum(s.savings || [], x => x.balance);
  const houseSaved = sum((s.savings || []).filter(x => x.type === 'house'), x => x.balance);
  const totalDebt = sum(s.debts || [], d => d.balance);
  const debtStart = sum(s.debts || [], d => d.originalBalance || d.balance);
  const debtPaid = Math.max(0, debtStart - totalDebt);
  const goal = (s.goal?.downPaymentTarget || 0) + (s.goal?.extraCostsTarget || 0);
  const pct = goal > 0 ? Math.round((houseSaved / goal) * 100) : 0;
  const days = s.goal?.targetDate ? Math.ceil((new Date(s.goal.targetDate + 'T00:00:00') - new Date()) / 86400000) : null;

  // upcoming bills/subs in next 7 days
  const now = new Date(); const wk = new Date(); wk.setDate(wk.getDate() + 7);
  const soon = [];
  (s.bills || []).forEach(b => { let d = new Date(now.getFullYear(), now.getMonth(), b.dueDay); if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, b.dueDay); if (d <= wk) soon.push(`${b.name} ${money(b.amount)}`); });
  (s.subscriptions || []).forEach(x => { if (!x.nextDate) return; const d = new Date(x.nextDate + 'T00:00:00'); if (d >= now && d <= wk) soon.push(`${x.name} ${money(x.amount)}`); });

  const lines = [
    "Amber's Hub update",
    `House ${money(houseSaved)} of ${money(goal)} (${pct}%)`,
    `Total saved ${money(totalSaved)}`,
    `Debt left ${money(totalDebt)}${debtPaid ? ` (paid ${money(debtPaid)})` : ''}`,
    `Free/mo ${money(surplus)}`,
    days != null ? (days > 0 ? `${days} days to the house` : 'House target reached!') : null,
    soon.length ? `Due soon: ${soon.slice(0, 4).join(', ')}` : null,
    pct >= 100 ? "KEYS! 🔑" : (surplus > 0 ? 'Keep stacking 💪' : null)
  ].filter(Boolean);
  return lines.join('\n');
}

function recipients(s) {
  return (s.notify?.recipients || [])
    .map(r => { const gw = CARRIERS[r.carrier]; return gw ? `${String(r.number).replace(/\D/g, '')}@${gw}` : null; })
    .filter(Boolean);
}

const s = load();
const to = recipients(s);
const body = summarize(s);

if (!to.length) { console.log('No recipients configured — skipping send.'); process.exit(0); }

const out = process.env.GITHUB_OUTPUT;
if (out) {
  appendFileSync(out, `to=${to.join(',')}\n`);
  appendFileSync(out, `subject=Amber's Hub 🏡 update\n`);
  const delim = 'BODY_EOF_' + Math.floor(Date.now() / 1000);
  appendFileSync(out, `body<<${delim}\n${body}\n${delim}\n`);
}
console.log('Prepared text for:', to.join(', '));
console.log(body);
