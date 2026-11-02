# 🧭 Wander

An app that encourages travelers to **stay off their phone** and actually *be* where they are.

Instead of blocking apps or nagging, Wander reframes being present as something you *collect*: you start a phone-free "exploration," earn minutes, complete small presence challenges, keep a daily streak, and get a unique postcard for every place you visit.

## How to run

No build step, no dependencies. From inside this `wander-app/` folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or simply open `index.html` in your browser.

> Tip: it's designed mobile-first. In your browser's dev tools, toggle the device toolbar (phone view) for the intended look.

## What's inside

| File | Purpose |
|------|---------|
| `index.html` | App shell + bottom tab bar |
| `styles.css` | All styling (warm "sunset & sea" travel theme, mobile-first) |
| `app.js` | App logic: screens, timer, challenges, postcards, badges, persistence |

## Core features (v1)

- **Onboarding** — a 3-step intro, then pick your name + current destination.
- **Explore tab** — a daily phone-free ring (goal: 60 min), your streak/sessions/postcards, and 3 rotating **presence challenges** (e.g. "order like a local", "phone-free meal").
- **Exploration mode** — a calming full-screen timer you start when you put your phone down. It rotates gentle prompts ("Notice three sounds you can hear right now") every 20s. End it to bank the time.
- **Passport tab** — collectible postcards, one minted per meaningful session (≥ 3 min), each with a unique gradient + time stamp.
- **You tab** — lifetime stats and 8 unlockable badges (First Steps, Hour Away, 3-Day Streak, Globetrotter…).
- **Persistence** — everything saves to `localStorage`; your streak/postcards survive refreshes.
- **Daily rollover** — challenges refresh and the daily ring resets each calendar day.

## Ideas for v2

- Replace the manual "put your phone down" session with real OS screen-time integration (native app).
- Location-aware challenges & real postcards tied to GPS.
- Travel-buddy mode: shared streaks and a group leaderboard.
- Offline-first so it works with data turned off abroad.
