/* =========================================================
   Wander — an app that encourages travelers to stay off
   their phone. Vanilla JS, no build step, localStorage.
   ========================================================= */

const STORE_KEY = "wander.v1";

/* ---------- Content: presence prompts & challenges ---------- */
// Shown during an active (phone-down) session.
const PRESENCE_PROMPTS = [
  "Notice three sounds you can hear right now.",
  "Find the oldest thing you can see.",
  "Watch the light change for a moment.",
  "Breathe in. What does this place smell like?",
  "Make eye contact and smile at a stranger.",
  "Follow a street you'd normally walk past.",
  "Count the colors on the building across from you.",
  "Listen to a conversation in another language.",
  "Find somewhere to simply sit and watch.",
  "What's the texture under your feet?",
];

// Micro-quests that reward being present instead of scrolling.
const CHALLENGE_POOL = [
  { id: "cafe",   emoji: "☕", title: "Order like a local", desc: "Buy something at a café in the local language.", pts: 20 },
  { id: "map",    emoji: "🗺️", title: "Navigate by instinct", desc: "Get somewhere new without checking your map.", pts: 25 },
  { id: "talk",   emoji: "💬", title: "Ask a local", desc: "Get a recommendation from someone who lives here.", pts: 30 },
  { id: "detail", emoji: "🔍", title: "Spot a detail", desc: "Find something you'd never notice on your phone.", pts: 15 },
  { id: "meal",   emoji: "🍽️", title: "Phone-free meal", desc: "Eat a full meal without looking at your screen.", pts: 25 },
  { id: "sketch", emoji: "✏️", title: "Capture it by hand", desc: "Sketch or write about one thing you saw today.", pts: 20 },
  { id: "sunset", emoji: "🌅", title: "Catch the light", desc: "Watch a sunrise or sunset start to finish.", pts: 30 },
  { id: "lost",   emoji: "🚶", title: "Wander with no plan", desc: "Walk for 15 minutes with no destination.", pts: 20 },
];

const BADGES = [
  { id: "first",    emoji: "🌱", name: "First Steps", test: s => s.totalSessions >= 1 },
  { id: "hour",     emoji: "⏳", name: "Hour Away",   test: s => s.totalMinutes >= 60 },
  { id: "streak3",  emoji: "🔥", name: "3-Day Streak",test: s => s.streak >= 3 },
  { id: "collector",emoji: "📬", name: "Collector",   test: s => s.postcards.length >= 3 },
  { id: "quests",   emoji: "🎯", name: "Quest Master",test: s => s.totalChallenges >= 10 },
  { id: "explorer", emoji: "🌍", name: "Globetrotter", test: s => new Set(s.postcards.map(p => p.place)).size >= 3 },
  { id: "deep",     emoji: "🧘", name: "Deep Away",   test: s => s.longestSession >= 60 },
  { id: "century",  emoji: "💯", name: "100 Minutes", test: s => s.totalMinutes >= 100 },
];

// Postcard gradient palettes, chosen per destination.
const PALETTES = [
  ["#e8705a", "#e8a24a"], ["#4db6a4", "#2a7d8c"], ["#7a6bc4", "#c45a92"],
  ["#2a7d8c", "#0f2a3f"], ["#e8a24a", "#c45a3e"], ["#4db6a4", "#3a5a8c"],
];

/* ---------- State ---------- */
const defaultState = () => ({
  name: "",
  place: "",
  onboarded: false,
  streak: 0,
  lastSessionDay: null,
  totalMinutes: 0,
  totalSessions: 0,
  totalChallenges: 0,
  longestSession: 0,
  todayMinutes: 0,
  todayDay: null,
  challenges: [],        // today's active challenge set [{...pool, done}]
  challengeDay: null,
  postcards: [],         // [{place, date, minutes, palette, stamp}]
});

let state = load();
let session = null; // { startedAt, place, promptIdx, promptTimer }

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch { return defaultState(); }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* ---------- Date helpers ---------- */
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
function rollDay() {
  const today = dayKey();
  if (state.todayDay !== today) { state.todayDay = today; state.todayMinutes = 0; }
  if (state.challengeDay !== today) {
    state.challengeDay = today;
    // pick 3 fresh challenges for the day
    const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    state.challenges = shuffled.map(c => ({ ...c, done: false }));
  }
}

/* ---------- Router ---------- */
let currentTab = "explore";
const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");

function render() {
  rollDay();
  if (!state.onboarded) { tabbar.hidden = true; renderOnboarding(); return; }
  tabbar.hidden = false;
  if (currentTab === "explore") renderExplore();
  else if (currentTab === "passport") renderPassport();
  else if (currentTab === "profile") renderProfile();
  syncTabs();
  save();
}

function syncTabs() {
  [...tabbar.querySelectorAll(".tab")].forEach(t =>
    t.classList.toggle("active", t.dataset.tab === currentTab));
}
tabbar.addEventListener("click", e => {
  const t = e.target.closest(".tab");
  if (!t) return;
  currentTab = t.dataset.tab;
  render();
});

/* =========================================================
   ONBOARDING
   ========================================================= */
let onboardStep = 0;
function renderOnboarding() {
  const steps = [
    {
      art: "🧭",
      title: `Look up.<br><em>Be here.</em>`,
      body: "You traveled across the world. Don't spend it staring at a screen. Wander helps you trade scroll time for real moments.",
      cta: "How it works",
    },
    {
      art: "⏳",
      title: `Start an<br><em>exploration</em>`,
      body: "Put your phone down and start a session. We count every phone-free minute and nudge you to notice where you are.",
      cta: "Nice — what else?",
    },
    {
      art: "📬",
      title: `Collect<br><em>moments</em>`,
      body: "Finish presence challenges, build a daily streak, and earn a one-of-a-kind postcard for every place you explore.",
      cta: "Let's go",
    },
  ];

  if (onboardStep < steps.length) {
    const s = steps[onboardStep];
    app.innerHTML = `
      <div class="hero screen">
        <div></div>
        <div>
          <div class="hero-art">${s.art}</div>
          <h1 class="serif">${s.title}</h1>
          <p>${s.body}</p>
        </div>
        <div>
          <div class="dots">
            ${steps.map((_, i) => `<span class="${i === onboardStep ? "on" : ""}"></span>`).join("")}
          </div>
          <button class="btn btn-primary" id="next">${s.cta}</button>
        </div>
      </div>`;
    document.getElementById("next").onclick = () => { onboardStep++; renderOnboarding(); };
    return;
  }

  // Final: get name + first destination
  app.innerHTML = `
    <div class="hero screen">
      <div></div>
      <div>
        <div class="hero-art">✨</div>
        <h1 class="serif">Where to<br><em>first?</em></h1>
        <p style="margin-bottom:22px">Tell us who's exploring and where you are right now.</p>
        <input class="field" id="name" placeholder="Your name" autocomplete="off" />
        <div class="spacer"></div>
        <input class="field" id="place" placeholder="Where are you? (e.g. Lisbon)" autocomplete="off" />
      </div>
      <div>
        <button class="btn btn-primary" id="start">Start exploring</button>
      </div>
    </div>`;
  document.getElementById("start").onclick = () => {
    const name = document.getElementById("name").value.trim() || "Traveler";
    const place = document.getElementById("place").value.trim() || "Somewhere new";
    state.name = name; state.place = place; state.onboarded = true;
    save(); render();
  };
}

/* =========================================================
   EXPLORE (home)
   ========================================================= */
function renderExplore() {
  const active = !!session;
  const mins = state.todayMinutes;
  const ringPct = Math.min(mins / 60, 1); // ring fills toward a 60-min daily goal
  const C = 2 * Math.PI * 100;
  const offset = C * (1 - ringPct);

  app.innerHTML = `
    ${topbar()}
    <div class="screen">
      <div class="place-head">
        <div class="eyebrow">Currently exploring</div>
        <h2 class="serif">${escapeHtml(state.place)} <button id="editPlace" class="btn btn-ghost btn-sm" style="vertical-align:middle;margin-left:6px;padding:4px 10px;font-size:12px">change</button></h2>
      </div>

      <div class="card ring-card">
        <div class="ring-state ${active ? "pulse" : ""}">${active ? "● Phone down — exploring" : "Ready when you are"}</div>
        <div class="ring-wrap">
          <svg width="230" height="230" viewBox="0 0 230 230">
            <circle class="ring-bg" cx="115" cy="115" r="100" fill="none" stroke-width="16" />
            <circle class="ring-fg" cx="115" cy="115" r="100" fill="none" stroke-width="16"
              stroke-dasharray="${C}" stroke-dashoffset="${offset}" />
          </svg>
          <div class="ring-center">
            <div class="ring-time">${formatMins(mins)}</div>
            <div class="ring-sub">phone-free today · goal 60m</div>
          </div>
        </div>
        <button class="btn btn-primary" id="startSession">Start an exploration</button>
      </div>

      <div class="stat-strip">
        <div class="stat-chip"><div class="n">${state.streak}🔥</div><div class="l">Day streak</div></div>
        <div class="stat-chip"><div class="n">${state.totalSessions}</div><div class="l">Sessions</div></div>
        <div class="stat-chip"><div class="n">${state.postcards.length}</div><div class="l">Postcards</div></div>
      </div>

      <div class="section-title">🎯 Today's presence challenges</div>
      <div class="card">
        ${state.challenges.map(challengeRow).join("") || `<p style="color:var(--ink-soft)">Come back tomorrow for new challenges.</p>`}
      </div>
      <div class="spacer"></div>
    </div>`;

  document.getElementById("startSession").onclick = startSession;
  document.getElementById("editPlace").onclick = changePlace;
  app.querySelectorAll("[data-ch]").forEach(el =>
    el.onclick = () => toggleChallenge(el.dataset.ch));
}

function challengeRow(c) {
  return `
    <div class="challenge ${c.done ? "done" : ""}">
      <div class="emoji">${c.emoji}</div>
      <div class="body">
        <h3>${c.title}</h3>
        <p>${c.desc}</p>
        <div class="pts">+${c.pts} moments</div>
      </div>
      <button class="check ${c.done ? "on" : ""}" data-ch="${c.id}" aria-label="complete">✓</button>
    </div>`;
}

function toggleChallenge(id) {
  const c = state.challenges.find(x => x.id === id);
  if (!c) return;
  c.done = !c.done;
  if (c.done) { state.totalChallenges++; toast(`+${c.pts} moments · nice presence`); checkBadges(); }
  else { state.totalChallenges = Math.max(0, state.totalChallenges - 1); }
  save(); renderExplore(); syncTabs();
}

function changePlace() {
  const p = prompt("Where are you now?", state.place);
  if (p && p.trim()) { state.place = p.trim(); save(); renderExplore(); syncTabs(); }
}

/* =========================================================
   ACTIVE SESSION (full-screen focus mode)
   ========================================================= */
function startSession() {
  session = { startedAt: Date.now(), place: state.place, promptIdx: Math.floor(Math.random() * PRESENCE_PROMPTS.length) };
  renderFocus();
  session.tick = setInterval(renderFocus, 1000);
  // rotate presence prompt every 20s
  session.promptTimer = setInterval(() => {
    session.promptIdx = (session.promptIdx + 1) % PRESENCE_PROMPTS.length;
  }, 20000);
}

function renderFocus() {
  if (!session) return;
  const elapsedSec = Math.floor((Date.now() - session.startedAt) / 1000);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  let overlay = document.getElementById("focus");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "focus";
    overlay.className = "focus";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="eyebrow">Exploring ${escapeHtml(session.place)}</div>
    <div class="big">${mm}:${ss}</div>
    <div class="place">phone-free · keep going</div>
    <div class="prompt">“${PRESENCE_PROMPTS[session.promptIdx]}”</div>
    <div class="stars">★ ★ ★ ★ ★</div>
    <button class="btn btn-primary" id="endSession">End exploration</button>
    <button class="btn btn-ghost" id="minimize" style="margin-top:10px;max-width:260px">Hide (keep counting)</button>`;
  overlay.querySelector("#endSession").onclick = endSession;
  overlay.querySelector("#minimize").onclick = () => { overlay.remove(); };
}

function endSession() {
  if (!session) return;
  clearInterval(session.tick);
  clearInterval(session.promptTimer);
  const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const place = session.place;
  document.getElementById("focus")?.remove();
  session = null;

  // update stats
  const today = dayKey();
  state.todayMinutes += minutes;
  state.totalMinutes += minutes;
  state.totalSessions += 1;
  state.longestSession = Math.max(state.longestSession, minutes);

  // streak logic
  updateStreak(today);

  // mint a postcard for meaningful sessions (>= 3 min)
  if (minutes >= 3) mintPostcard(place, minutes);

  state.lastSessionDay = today;
  checkBadges();
  save();
  toast(`${formatMins(minutes)} phone-free in ${place} 🌍`);
  currentTab = "explore";
  render();
}

function updateStreak(today) {
  if (state.lastSessionDay === today) return; // already counted today
  const yest = dayKey(new Date(Date.now() - 86400000));
  if (state.lastSessionDay === yest) state.streak += 1;
  else state.streak = 1;
}

function mintPostcard(place, minutes) {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  state.postcards.unshift({
    place,
    minutes,
    date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    palette,
    stamp: `${formatMins(minutes)} away`,
  });
}

/* =========================================================
   PASSPORT (collectible postcards)
   ========================================================= */
function renderPassport() {
  app.innerHTML = `
    ${topbar()}
    <div class="screen">
      <div class="place-head">
        <div class="eyebrow">Your passport</div>
        <h2 class="serif">Moments collected</h2>
      </div>
      ${state.postcards.length === 0 ? emptyPassport() :
        state.postcards.map(postcard).join("")}
      <div class="spacer"></div>
    </div>`;
}

function postcard(p) {
  const [a, b] = p.palette;
  return `
    <div class="postcard" style="background:linear-gradient(135deg, ${a}, ${b})">
      <div class="grain"></div>
      <div class="stamp">${p.stamp}</div>
      <h3 class="serif">${escapeHtml(p.place)}</h3>
      <div class="meta">${p.date} · ${formatMins(p.minutes)} present</div>
    </div>`;
}

function emptyPassport() {
  return `
    <div class="empty">
      <div class="em">📬</div>
      <p>No postcards yet.<br>Start an exploration and earn your first one by staying phone-free for a few minutes.</p>
    </div>`;
}

/* =========================================================
   PROFILE
   ========================================================= */
function renderProfile() {
  const earned = BADGES.filter(b => b.test(state)).map(b => b.id);
  app.innerHTML = `
    ${topbar(true)}
    <div class="screen">
      <div class="avatar">${(state.name[0] || "✨").toUpperCase()}</div>
      <div class="profile-name">
        <h2 class="serif">${escapeHtml(state.name)}</h2>
        <p>${earned.length} badges · ${state.postcards.length} postcards</p>
      </div>

      <div class="grid2">
        <div class="metric"><div class="n">${formatMins(state.totalMinutes)}</div><div class="l">Total phone-free</div></div>
        <div class="metric"><div class="n">${state.streak}🔥</div><div class="l">Current streak</div></div>
        <div class="metric"><div class="n">${state.totalSessions}</div><div class="l">Explorations</div></div>
        <div class="metric"><div class="n">${state.totalChallenges}</div><div class="l">Challenges done</div></div>
      </div>

      <div class="section-title">🏅 Badges</div>
      <div class="badges">
        ${BADGES.map(b => `
          <div class="badge ${earned.includes(b.id) ? "" : "locked"}">
            <div class="ic">${b.emoji}</div>
            <div class="nm">${b.name}</div>
          </div>`).join("")}
      </div>

      <div class="spacer"></div>
      <button class="btn btn-outline" id="reset" style="margin-top:8px;background:rgba(255,255,255,0.06);color:var(--cream);border-color:rgba(255,255,255,0.15)">Reset my journey</button>
      <div class="spacer"></div>
    </div>`;
  document.getElementById("reset").onclick = () => {
    if (confirm("Reset all progress? This clears your postcards, streak, and badges.")) {
      state = defaultState(); save(); onboardStep = 0; currentTab = "explore"; render();
    }
  };
}

/* =========================================================
   Shared UI helpers
   ========================================================= */
function topbar(plain) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `
    <div class="topbar">
      <div class="brand"><span class="mark">🧭</span> Wander</div>
      <div class="greet">${plain ? "" : greet + ", " + escapeHtml(state.name.split(" ")[0])}</div>
    </div>`;
}

function checkBadges() {
  // detect newly earned badges and celebrate
  const prev = state._earned || [];
  const now = BADGES.filter(b => b.test(state)).map(b => b.id);
  const fresh = now.filter(id => !prev.includes(id));
  state._earned = now;
  if (fresh.length) {
    const b = BADGES.find(x => x.id === fresh[0]);
    setTimeout(() => toast(`${b.emoji} Badge unlocked: ${b.name}`), 700);
  }
}

let toastTimer;
function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

function formatMins(m) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Boot ---------- */
checkBadges(); // seed _earned so we don't re-toast old badges
render();
