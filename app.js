// Saathi Health: one text box, the AI turns a messy line about your day
// into a log, a short reply and one small goal for tomorrow.
// All data is made up by the user and stays in this browser (localStorage).

const STORE = "saathi-health-v1";
const $ = (id) => document.getElementById(id);

// ---------- Login (local only: name + 4-digit PIN, saved in this browser) ----------
// A guest button skips it, because the brief says the app must open with no sign-up.
const USERS = STORE + ":users";
let currentUser = null; // "guest" or a lowercase name

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS)) || {}; } catch { return {}; }
}
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

// The PIN is never stored. We keep a slow, salted hash (PBKDF2, 150,000 rounds),
// so even someone who copies the browser data cannot quickly try all 10,000 PINs.
async function hashPin(name, pin) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode("saathi:" + name), iterations: 150000, hash: "SHA-256" },
    key, 256
  );
  return "v2:" + toHex(bits);
}
// Accounts made before v2 used a plain SHA-256 hash; they are upgraded on next login.
async function oldHashPin(name, pin) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name + ":" + pin)));
}

// Reads a number field. Empty = null, out of range = NaN (so the caller can show an error).
function readNumber(id, min, max) {
  const v = $(id).value.trim();
  if (!v) return null;
  const n = +v;
  return n >= min && n <= max ? n : NaN;
}

// ---------- Saved data (one copy per user) ----------
function load() {
  try { return JSON.parse(localStorage.getItem(STORE + ":" + currentUser)) || { days: {} }; }
  catch { return { days: {} }; }
}
function save() {
  try { localStorage.setItem(STORE + ":" + currentUser, JSON.stringify(state)); } catch {}
}
let state = { days: {} };

// Date as YYYY-MM-DD in India time.
function dayKey(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
function today() {
  return (state.days[dayKey()] ||= { entries: [] });
}
// A day counts as logged if the user wrote anything, tapped water or picked a mood.
function hasLog(d) {
  return !!d && (d.entries.length > 0 || d.water > 0 || !!d.mood || d.sleep > 0 || d.workouts?.length > 0 || d.fatigue > 0);
}

// Plant stages: it only ever grows, it never wilts when you miss a day.
const PLANT = [
  { at: 0, icon: "🫘", name: "a seed" },
  { at: 1, icon: "🌱", name: "a sprout" },
  { at: 3, icon: "🌿", name: "a young tulsi" },
  { at: 7, icon: "🪴", name: "a healthy tulsi" },
  { at: 14, icon: "🌳", name: "a big tree" },
  { at: 30, icon: "🌸", name: "a flowering tree" },
];

const QUICK = [
  ["☕ Chai", "chai"], ["🫓 2 Roti", "2 roti"], ["🍛 Dal rice", "dal rice"], ["🐟 Fish curry", "fish curry"],
  ["🥗 Salad", "salad"], ["🍌 Fruit", "fruit"], ["🍬 Sweet", "sweet"], ["🚶 15 min walk", "15 min walk"],
];

const MOOD_REPLY = {
  great: "Wonderful! Keep that energy 🌞",
  good: "Nice. A steady day is a good day.",
  okay: "Okay is fine. Maybe a short walk will lift it?",
  low: "Sorry you're feeling low. Be gentle with yourself today — talking to a friend helps too. 💚",
};

const GOALS = {
  sugar: "keep blood sugar in control",
  weight: "lose a little weight",
  active: "walk more every day",
};

const EXAMPLES = [
  "aaj 2 chapati dal sabzi khaya, 20 min walk kiya",
  "Breakfast poha and chai with sugar, lunch rice fish curry, evening 2 samosa",
  "sugar 180 after lunch, no walk today, too tired",
  "drank 8 glass paani, slept 7 hours, 30 minute walk in the morning",
  "Mithai at a wedding, 3 gulab jamun 😅",
  "idli sambar breakfast, fruit at 4, dinner 2 roti",
  "I have chest pain since morning and feel breathless",
  "sugar 55 feeling chakkar",
  "feeling low, didn't eat much today",
  "kuch nahi",
];

// ---------- Safety: red flags are checked by plain rules first, always ----------
function redFlag(text) {
  const t = text.toLowerCase();
  const words = /(chest pain|seene (me|mein) dard|breathless|can'?t breathe|saans|faint|behosh|unconscious|chakkar|dizzy|blood in|vomiting blood|suicid|kill myself|stroke|\bnumb\b|slurred)/;
  if (words.test(t)) return true;
  const sugar = t.match(/sugar\D{0,10}(\d{2,3})/);
  if (sugar) {
    const v = +sugar[1];
    if (v >= 300 || v < 70) return true;
  }
  return false;
}
const RED_FLAG_MSG = "This sounds serious. Please see a doctor now or call 108 (ambulance). Saathi cannot help with this — a real doctor must check you.";

// ---------- Demo mode: rule-based understanding (works offline, no key) ----------
const NUM_WORDS = { ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, chaar: 4, four: 4, paanch: 5, five: 5, aadha: 0.5, half: 0.5 };
const FOODS = [
  { re: /chapati|chapatti|roti|phulka|bhakri/, label: "Roti", kind: "ok" },
  { re: /\brice\b|chawal|bhaat|pulao|biryani/, label: "Rice", kind: "watch" },
  { re: /\bdal\b|daal|sambar|sambhar/, label: "Dal / sambar", kind: "good" },
  { re: /sabzi|sabji|bhaji|vegetable|veggies|salad/, label: "Vegetables", kind: "good" },
  { re: /poha|upma/, label: "Poha / upma", kind: "ok" },
  { re: /idli|dosa|uttapam/, label: "Idli / dosa", kind: "ok" },
  { re: /fish|xitt|curry|xacuti|chicken|egg|anda|mutton/, label: "Fish / egg / meat", kind: "ok" },
  { re: /\bpav\b|pao|bread/, label: "Pav / bread", kind: "watch" },
  { re: /samosa|vada|bhaji|pakoda|pakora|fried|chips|fries/, label: "Fried snack", kind: "watch" },
  { re: /mithai|sweet|gulab jamun|jalebi|laddoo|ladoo|halwa|cake|dessert|ice ?cream/, label: "Sweets", kind: "watch" },
  { re: /fruit|apple|banana|papaya|guava|orange|phal/, label: "Fruit", kind: "good" },
  { re: /chai|tea|coffee/, label: "Tea / coffee", kind: "ok" },
];

function numberBefore(text, index) {
  // Only the word right before the food counts ("2 chapati dal" = 2 chapati, 1 dal).
  const w = text.slice(Math.max(0, index - 12), index).split(/\s+/).filter(Boolean).pop() || "";
  if (/^\d+(\.\d+)?$/.test(w)) return +w;
  return NUM_WORDS[w] ?? null;
}

function demoUnderstand(text) {
  const t = text.toLowerCase();
  const items = [];

  for (const f of FOODS) {
    const m = t.match(f.re);
    if (m) {
      const n = numberBefore(t, m.index);
      items.push({ type: "meal", label: (n ? n + " × " : "") + f.label, kind: f.kind });
    }
  }
  const walk = t.match(/(\d+)\s*(min|mins|minute|minutes)\s*(ka |ki )?(walk|chal|walking)?/) ||
               t.match(/walk\D{0,15}(\d+)\s*(min|mins|minute)/);
  const noWalk = /(no walk|didn'?t walk|walk nahi|nahi chala)/.test(t);
  if (walk && !noWalk) items.push({ type: "activity", label: "Walk " + walk[1] + " min", minutes: +walk[1] });
  else if (/\bwalk|chala|yoga|exercise|cycling/.test(t) && !noWalk) items.push({ type: "activity", label: "Some activity", minutes: 15 });

  const water = t.match(/(\d+)\s*(glass|glasses|gilas)/);
  if (water) items.push({ type: "water", label: water[1] + " glasses of water", glasses: +water[1] });

  const sugar = t.match(/sugar\D{0,10}(\d{2,3})/);
  if (sugar) items.push({ type: "sugar", label: "Sugar reading " + sugar[1] + " mg/dL", value: +sugar[1] });

  const sleep = t.match(/(slept|sleep|soya|neend)\D{0,6}(\d+)\s*(hours|hrs|hr|ghante)/) || t.match(/(\d+)\s*(hours|hrs|ghante)\s*(sleep|neend|soya)/);
  if (sleep) {
    const hours = sleep[2] && /\d/.test(sleep[2]) ? sleep[2] : sleep[1];
    items.push({ type: "sleep", label: "Slept " + hours + " hours", hours: +hours });
  }

  if (/(low|sad|tired|thak|stress|upset|udaas)/.test(t)) items.push({ type: "mood", label: "Feeling low / tired" });

  return { items, ...demoAdvice(items) };
}

// Short reply + one small goal for tomorrow, adapted to the last 3 days.
function demoAdvice(items) {
  if (!items.length) {
    return { reply: "I couldn't find food, walking or a reading in that. Try: \"2 roti dal, 15 min walk\".", tomorrow: null };
  }
  const goal = state.profile?.goal || "sugar";
  const watch = items.filter((i) => i.kind === "watch").map((i) => i.label.replace(/^[\d.]+ × /, ""));
  const good = items.filter((i) => i.kind === "good");
  const walk = items.find((i) => i.type === "activity") ||
    today().entries.flatMap((e) => e.items).find((i) => i.type === "activity");
  const sugar = items.find((i) => i.type === "sugar");
  const mood = items.find((i) => i.type === "mood");
  const missedWalks = recentDays(3).filter((d) => d.logged && !d.walked).length;

  let reply = "Saved. ";
  if (mood) reply += "Sorry you're feeling low — be gentle with yourself today. ";
  else if (good.length) reply += "Good choice with the " + good[0].label.replace(/^[\d.]+ × /, "").toLowerCase() + ". ";
  if (watch.length) reply += watch[0] + " can raise your " + (goal === "sugar" ? "sugar" : "weight") + " — fine once, just not daily.";
  else if (walk) reply += "Nice walk!";
  if (sugar && sugar.value >= 180) reply = "Saved. " + sugar.value + " is on the high side. If it stays above 180 for a few days, show your doctor.";

  // Tomorrow's goal shrinks when the user has been missing days (catch-up, not guilt).
  let tomorrow;
  if (!walk && missedWalks >= 2) tomorrow = "Just 10 minutes of walking after lunch. That's all.";
  else if (!walk) tomorrow = "A 15-minute walk after dinner.";
  else if (watch.length) tomorrow = "Swap the " + watch[0].toLowerCase() + " for a fruit or a bowl of dal.";
  else if (walk.minutes && walk.minutes < 30) tomorrow = "Same as today, plus 5 more minutes of walking (" + (walk.minutes + 5) + " min).";
  else tomorrow = "Keep it the same. You're doing well — 8 glasses of water too.";
  return { reply: reply.trim(), tomorrow };
}

function recentDays(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const d = state.days[dayKey(-i)];
    const items = d ? d.entries.flatMap((e) => e.items) : [];
    out.push({ logged: hasLog(d), walked: items.some((x) => x.type === "activity") });
  }
  return out;
}

// ---------- Real AI mode: Google Gemini (only if the user adds a key) ----------
async function aiUnderstand(text) {
  const history = recentDays(3).map((d, i) => `${i + 1} day(s) ago: ${d.logged ? (d.walked ? "logged, walked" : "logged, no walk") : "not logged"}`).join("; ");
  const prompt = `You are Saathi, a kind daily health buddy for an Indian adult whose goal is to ${GOALS[state.profile?.goal] || GOALS.sugar}.
The user wrote (may be Hinglish/Konkani, messy): """${text}"""
Recent history: ${history}.
Return ONLY JSON: {"items":[{"type":"meal|activity|water|sugar|sleep|mood","label":"short label","kind":"good|ok|watch (meals only)","minutes":number (activity only)}],
"reply":"max 2 short sentences, warm, plain English, no lecturing",
"tomorrow":"ONE small specific goal for tomorrow; make it SMALLER if they missed recent days"}
Rules: never diagnose, never name medicines or doses, never promise results. If unsure what a food is, label it as written.`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(state.key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error("Gemini error " + res.status);
  const data = await res.json();
  const out = JSON.parse(data.candidates[0].content.parts[0].text);
  return { items: out.items || [], reply: out.reply || "Saved.", tomorrow: out.tomorrow || null };
}

// ---------- Screens ----------
function show(id) {
  ["login", "welcome", "home", "settings", "admin"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
  $("topLinks").classList.toggle("hidden", id === "login");
}

function startSession(user, displayName) {
  currentUser = user;
  try { sessionStorage.setItem(STORE + ":current", JSON.stringify({ user, displayName })); } catch {}
  state = load();
  $("whoAmI").textContent = user === "guest" ? "Guest" : "Hi, " + displayName;
  if (!state.profile) {
    $("nameInput").value = user === "guest" ? "" : displayName;
    show("welcome");
  } else {
    renderHome();
  }
}

async function handleLogin() {
  const name = $("loginName").value.trim();
  const pin = $("loginPin").value.trim();
  const err = (msg) => { $("loginError").textContent = msg; $("loginError").classList.remove("hidden"); };
  $("loginError").classList.add("hidden");
  if (!name) return err("Please enter your name.");
  if (!/^\d{4}$/.test(pin)) return err("PIN must be exactly 4 digits.");
  if (name.toLowerCase() === "guest") return err("Please choose another name.");

  const key = name.toLowerCase();
  const users = getUsers();
  const user = users[key];
  const saveUsers = () => { try { localStorage.setItem(USERS, JSON.stringify(users)); } catch {} };
  $("loginBtn").disabled = true;
  const hash = await hashPin(key, pin);
  $("loginBtn").disabled = false;
  if (user) {
    if (user.lockedUntil > Date.now()) {
      return err(`Too many wrong PINs. Try again in ${Math.ceil((user.lockedUntil - Date.now()) / 1000)} seconds.`);
    }
    const ok = user.pinHash === hash || user.pinHash === (await oldHashPin(key, pin));
    if (!ok) {
      user.fails = (user.fails || 0) + 1;
      if (user.fails >= 5) { user.fails = 0; user.lockedUntil = Date.now() + 60000; }
      saveUsers();
      return err(user.lockedUntil > Date.now() ? "Too many wrong PINs. Locked for 1 minute." : `Wrong PIN. ${5 - user.fails} tries left.`);
    }
    user.pinHash = hash; // upgrades old hashes
    user.fails = 0;
  } else {
    users[key] = { name, pinHash: hash };
  }
  saveUsers();
  $("loginPin").value = "";
  startSession(key, users[key].name);
}

// Log out after 15 minutes without a click or key press (shared phones).
let idleTimer;
function resetIdle() {
  clearTimeout(idleTimer);
  if (currentUser) idleTimer = setTimeout(logout, 15 * 60000);
}
["click", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, resetIdle));

function logout() {
  try { sessionStorage.removeItem(STORE + ":current"); } catch {}
  currentUser = null;
  state = { days: {} };
  $("loginName").value = "";
  show("login");
}

function renderHome() {
  show("home");
  renderNudge();
  renderPlant();
  renderMood();
  renderWater();
  renderToday();
  renderWeek();
  renderExtras(); // features.js
}

function renderPlant(animate) {
  const total = Object.values(state.days).filter(hasLog).length;
  let i = PLANT.length - 1;
  while (PLANT[i].at > total) i--;
  const stage = PLANT[i], next = PLANT[i + 1];
  $("plant").textContent = stage.icon;
  $("plantText").innerHTML =
    `${total} day${total === 1 ? "" : "s"} logged — it's ${stage.name}. ` +
    (next ? `${next.at - total} more to grow into ${next.name}. Missing a day never hurts it.` : "Fully grown! 🎉") +
    (next ? `<div class="meter"><div style="width:${Math.round(((total - stage.at) / (next.at - stage.at)) * 100)}%"></div></div>` : "");
  if (animate) {
    $("plant").classList.remove("grow");
    void $("plant").offsetWidth;
    $("plant").classList.add("grow");
  }
}

function renderMood() {
  const mood = today().mood;
  document.querySelectorAll("#moods button").forEach((b) => b.classList.toggle("picked", b.dataset.mood === mood));
}

function renderWater() {
  const n = today().water || 0;
  let html = "";
  for (let i = 0; i < 8; i++) html += `<button data-i="${i}" class="${i < n ? "full" : ""}" title="Glass ${i + 1}">🥛</button>`;
  $("glasses").innerHTML = html;
  $("waterCount").textContent = `${n} / 8`;
}

// Small emoji celebration. Pure CSS animation, removed after it ends.
function celebrate(icons = ["🎉", "🌿", "💚", "⭐"]) {
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.textContent = icons[i % icons.length];
    s.style.left = 10 + Math.random() * 80 + "%";
    s.style.setProperty("--x", (Math.random() * 160 - 80) + "px");
    s.style.setProperty("--r", (Math.random() * 360 - 180) + "deg");
    s.style.animationDelay = Math.random() * 0.25 + "s";
    $("burst").appendChild(s);
    setTimeout(() => s.remove(), 1600);
  }
}

// Call this after any kind of logging: grows the plant the first time today is logged.
function afterLog(wasLogged) {
  save();
  renderNudge();
  renderWeek();
  renderPlant(!wasLogged);
  if (!wasLogged) celebrate();
  checkBadges(); // features.js
}

// Proactive message on opening the app, based on what happened, not a fixed reminder.
function renderNudge() {
  const name = state.profile.name || "friend";
  const hour = +new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false });
  const t = today();
  const plan = state.days[dayKey(-1)]?.tomorrow;
  const missed = recentDays(3).filter((d) => !d.logged).length;
  $("mascot").textContent = hour < 12 ? "🌅" : hour < 18 ? "🌿" : "🌙";
  let msg;
  if (t.mood === "low") msg = `${name}, I'm here. ${MOOD_REPLY.low}`;
  else if (hasLog(t)) msg = `Thanks ${name}, today is logged. Your tulsi says thank you! 🌿`;
  else if (missed === 3) msg = `Welcome back, ${name}! No catching up needed — just tell me about today.`;
  else if (plan) msg = `Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${name}. Your one goal for today: <b>${plan}</b>`;
  else msg = `Hi ${name}! One line about your day is enough.`;
  $("nudge").innerHTML = msg;
}

function renderToday() {
  const t = today();
  const items = t.entries.flatMap((e) => e.items);
  $("todayList").innerHTML = items.length
    ? items.map((i) => `<li><span class="tag">${i.type}</span>${escapeHtml(i.label)}</li>`).join("")
    : `<li class="muted">Nothing yet.</li>`;
}

function renderWeek() {
  let html = "";
  for (let i = 6; i >= 0; i--) {
    const key = dayKey(-i);
    const d = state.days[key];
    const label = new Date(key + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" });
    const walked = d && d.entries.some((e) => e.items.some((x) => x.type === "activity"));
    const icon = !hasLog(d) ? "·" : walked ? "🚶" : "🌿";
    html += `<div class="day ${hasLog(d) ? "done" : ""}"><span>${icon}</span>${label}</div>`;
  }
  $("week").innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function handleSend() {
  const text = $("dayInput").value.trim();
  if (!text) return;
  $("alert").classList.add("hidden");
  $("reply").classList.add("hidden");

  if (redFlag(text)) {
    $("alert").textContent = RED_FLAG_MSG;
    $("alert").classList.remove("hidden");
    return; // no tips, no logging advice, for red flags
  }

  $("sendBtn").disabled = true;
  $("sendBtn").textContent = "Thinking…";
  let result, mode = "demo";
  try {
    if (state.key) { result = await aiUnderstand(text); mode = "AI"; }
  } catch (e) {
    console.warn(e);
  }
  if (!result) result = demoUnderstand(text);
  $("sendBtn").disabled = false;
  $("sendBtn").textContent = "Save my day";

  if (result.items.length) {
    const wasLogged = hasLog(today());
    today().entries.push({ text, items: result.items, time: Date.now() });
    if (result.tomorrow) today().tomorrow = result.tomorrow;
    $("dayInput").value = "";
    afterLog(wasLogged);
    if (wasLogged) celebrate(["✅", "💚"]);
  }
  $("reply").innerHTML = `<p>${escapeHtml(result.reply)}</p>` +
    (result.tomorrow ? `<p><b>Tomorrow's one goal:</b> ${escapeHtml(result.tomorrow)}</p>` : "") +
    `<p class="muted">${mode === "AI" ? "Answered by Gemini AI" : "Demo mode (no AI key)"}</p>`;
  $("reply").classList.remove("hidden");
  renderToday();
}

// Voice input (Chrome / Edge). Works with Indian English.
function setupMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $("micBtn").style.display = "none"; return; }
  const rec = new SR();
  rec.lang = "en-IN";
  rec.onresult = (e) => { $("dayInput").value += (($("dayInput").value ? " " : "") + e.results[0][0].transcript); };
  rec.onend = () => { $("micBtn").textContent = "🎤 Speak"; };
  $("micBtn").onclick = () => { $("micBtn").textContent = "Listening…"; rec.start(); };
}

// ---------- Start ----------
$("goalChips").onclick = (e) => {
  const goal = e.target.dataset.goal;
  if (!goal) return;
  const err = (msg) => { $("welcomeError").textContent = msg; $("welcomeError").classList.remove("hidden"); };
  const age = readNumber("ageInput", 18, 100);
  const weight = readNumber("weightInput", 25, 250);
  const height = readNumber("heightInput", 100, 230);
  if ([age, weight, height].some(Number.isNaN)) return err("Please check: age 18–100, weight 25–250 kg, height 100–230 cm.");
  if (!$("consentInput").checked) return err("Please tick the box to agree before we start.");
  $("welcomeError").classList.add("hidden");
  state.profile = { name: $("nameInput").value.trim(), goal, age, weight, height, consentAt: new Date().toISOString() };
  save();
  renderHome();
};
$("sendBtn").onclick = handleSend;
$("quick").innerHTML = QUICK.map(([label, text]) => `<button data-text="${text}">${label}</button>`).join("");
$("quick").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const box = $("dayInput");
  box.value = (box.value.trim() ? box.value.trim() + ", " : "") + b.dataset.text;
  box.focus();
};
$("moods").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const wasLogged = hasLog(today());
  today().mood = b.dataset.mood;
  renderMood();
  afterLog(wasLogged);
};
$("glasses").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const wasLogged = hasLog(today());
  const i = +b.dataset.i;
  // Tapping the last full glass empties it, so mistakes are easy to undo.
  today().water = (today().water || 0) === i + 1 ? i : i + 1;
  renderWater();
  afterLog(wasLogged);
  if (today().water === 8) celebrate(["💧", "🥛", "💙"]);
};
$("examples").innerHTML = EXAMPLES.map((x) => `<button>${escapeHtml(x)}</button>`).join("");
$("examples").onclick = (e) => { if (e.target.tagName === "BUTTON") $("dayInput").value = e.target.textContent; };
$("settingsBtn").onclick = () => {
  $("keyInput").value = state.key || "";
  $("modeText").textContent = state.key ? "Mode: Gemini AI" : "Mode: demo (no key)";
  show("settings");
};
$("saveKeyBtn").onclick = () => { state.key = $("keyInput").value.trim(); save(); state.profile ? renderHome() : show("welcome"); };
$("closeSettingsBtn").onclick = () => (state.profile ? renderHome() : show("welcome"));
$("resetBtn").onclick = () => {
  if (!confirm("Delete all your Saathi data from this browser?")) return;
  state = { days: {} };
  save();
  show("welcome");
};
$("loginBtn").onclick = handleLogin;
$("loginPin").onkeydown = (e) => { if (e.key === "Enter") handleLogin(); };
$("guestBtn").onclick = () => startSession("guest", "Guest");
$("logoutBtn").onclick = logout;

// Start once features.js has loaded too. Stay logged in while this browser tab is open.
document.addEventListener("DOMContentLoaded", () => {
  setupMic();
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(STORE + ":current")); } catch {}
  saved ? startSession(saved.user, saved.displayName) : show("login");
  resetIdle();
});
