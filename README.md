# 🏡 Amber's Finance Hub

A cute, game-like finance tracker for the road to **our house in December**.
Tracks savings, debt, income, bills & subscriptions — with quests, badges, levels,
mini-games, and free text-message updates. No build tools, no monthly fees.

---

## ▶️ Run it right now (no setup)

Just **double-click `index.html`** — it opens in your browser and works immediately.
Everything you enter is saved on that device. That's it to start playing with it.

> First screen asks for an **activation code**. Defaults:
> - Amber: `AMBER-LOVE-2026`
> - Avel: `AVEL-HERO-2026`
>
> Change these any time in **Settings → Access & Devices → Manage codes**.

---

## 📱 Put it on your phones (free hosting via GitHub Pages)

1. Make a **private** GitHub repo (e.g. `ambers-finance-hub`) and upload this whole folder.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / root**.
3. Wait ~1 minute. GitHub gives you a link like
   `https://YOURNAME.github.io/ambers-finance-hub/`.
4. Open that link on each phone → browser menu → **Add to Home Screen**.
   It now behaves like an installed app (icon, full screen).

> Pages can't be private on free accounts, but the **link is unguessable** and the app is
> gated by your activation codes. For extra privacy use a non-obvious repo name.

---

## ☁️ Share the same numbers across both phones (GitHub sync)

By default each device keeps its own copy. To keep **both of you on the same data**:

1. In the app: **Settings → GitHub Sync → Set up GitHub sync**.
2. **Repo:** `YOURNAME/ambers-finance-hub`  •  **Path:** `data/finance.json`
3. **Token:** create a **fine-grained personal access token**
   (GitHub → Settings → Developer settings → Fine-grained tokens):
   - Repository access: **Only select repositories → your hub repo**
   - Permissions: **Contents → Read and write**
4. Paste it in, **Save & test**. Do the same on the other phone with the same repo/token.

Now contributions, debts, milestones etc. sync to the repo and both phones see them.
(Use **Pull latest now** if a phone looks behind.)

---

## 📲 Automatic text-message updates (100% free)

Uses your carrier's **email-to-text** gateway. Two ways:

### A) Tap-to-send (instant, manual)
**Settings → Text Updates → Add number** (phone + carrier), then **Send update now**.
It opens your mail app pre-addressed to the carrier gateway — just hit send and it
arrives as a text.

### B) Automatic weekly + milestone texts (GitHub Actions)
Already wired up in `.github/workflows/notify.yml`. To turn it on:

1. Make a free email to send from. Easiest is **Gmail**:
   - Enable 2-Step Verification, then create an **App Password**
     (Google Account → Security → App passwords).
2. In your repo: **Settings → Secrets and variables → Actions → New repository secret**:
   - `GMAIL_USER` = your gmail address
   - `GMAIL_APP_PASSWORD` = the 16-char app password
3. Add your phone numbers in the app (**Settings → Text Updates**) and let them sync
   to `data/finance.json` (GitHub sync on), so the Action can read them.
4. Done. It texts a summary **every Sunday**, and you can trigger it anytime from
   **Actions → "Amber's Hub — Text Update" → Run workflow**.

Change the schedule by editing the `cron` line in `.github/workflows/notify.yml`.

**Carrier gateways supported:** Verizon, AT&T, T-Mobile, Sprint, Boost, Cricket,
US Cellular, Metro, Google Fi, Mint, Visible, Consumer Cellular, Straight Talk.

---

## 🎮 What's inside

| Screen | What it does |
|--------|--------------|
| **Home** | "Road to our house" journey bar, countdown to December, level/XP, pace check, next quests, upcoming bills |
| **Savings** | Buckets (house, emergency, fun) with progress rings; add money / withdraw |
| **Debts** | Debt slayer with avalanche ("attack first") hint, payoff progress, make payments |
| **Bills** | Income, monthly bills (with due days) + subscriptions, 30-day "coming up" timeline |
| **Games** | Finance games (Money Quiz, Need or Want, Budget Blitz) + fun games (Money Match, Coin Catcher) that earn XP/levels |
| **Quests** | Auto objectives + your own custom reward quests, badges, level progress |
| **Settings** | Goal, text updates, GitHub sync, activation codes/devices, backup/restore |

Milestones, badges, level-ups and savings/debt wins all fire **confetti + a text-ready summary**.

### ✨ Animations
Built-in: floating money/sparkles, count-up number tickers, a reactive mascot, coin bursts,
and confetti. **Optional Lottie upgrade:** drop `.json` animation files into
`assets/lottie/` (`mascot.json`, `celebrate.json`) — see `assets/lottie/README.md`.
Get free ones at [lottiefiles.com](https://lottiefiles.com). The app auto-detects them;
without them it uses the built-in effects.

---

## 🔐 Activation / device binding
Each person enters their code **once per device** to unlock it; the device stays bound.
Manage or revoke in **Settings → Access & Devices**. Lost a phone? **Unbind this device**
or change the codes.

## 💾 Backups
**Settings → Your Data → Export** saves a `.json` backup. **Import** restores it.

---

Made with 💖 for Amber.
