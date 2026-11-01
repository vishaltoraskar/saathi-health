// Saathi Health social features: local event board, trophy cabinet, squads with a
// leaderboard and shared routes (via share codes, no server), and CSV export.
// Uses state, save(), dayKey(), dayStats(), weekValue(), allWorkouts(), streaks(),
// paceOf(), fmtPace(), routeSvg(), thinRoute(), download(), toast(), escapeHtml(), $.

// ---------- Event board (sample events, made up for this demo) ----------
// `in` = days from today, so the sample events are always upcoming.
const EVENTS = [
  { id: "e1", name: "Beach Yoga Morning", type: "Yoga", city: "Calangute", place: "Calangute beach, north end", in: 4, time: "06:30", dist: "60 min", fee: "Free" },
  { id: "e2", name: "Miramar Sunrise 5K", type: "Run", city: "Panaji", place: "Miramar beach promenade", in: 6, time: "06:00", dist: "5 km", fee: "Free" },
  { id: "e3", name: "Fontainhas Heritage Walk", type: "Walk", city: "Panaji", place: "Fontainhas, near the chapel", in: 9, time: "07:00", dist: "3 km", fee: "Free" },
  { id: "e4", name: "Verna Plateau Ride", type: "Cycle", city: "Verna", place: "Verna plateau car park", in: 13, time: "06:30", dist: "20 km", fee: "₹200" },
  { id: "e5", name: "Mapusa Market Loop Walk", type: "Walk", city: "Mapusa", place: "Mapusa municipal garden", in: 16, time: "07:00", dist: "4 km", fee: "Free" },
  { id: "e6", name: "Margao Community 10K", type: "Run", city: "Margao", place: "Margao municipal garden", in: 20, time: "06:00", dist: "10 km / 5 km", fee: "₹300" },
  { id: "e7", name: "Seniors' Walkathon", type: "Walk", city: "Panaji", place: "Campal gardens", in: 27, time: "07:30", dist: "2 km", fee: "Free" },
  { id: "e8", name: "Vasco Seaside Half", type: "Run", city: "Vasco", place: "Baina beach road", in: 34, time: "05:30", dist: "21.1 km / 10 km", fee: "₹600" },
];
const ICON = { Run: "🏃", Walk: "🚶", Cycle: "🚴", Yoga: "🧘" };

function renderEvents() {
  const city = $("evCity").value, type = $("evType").value, going = state.going || {};
  const list = EVENTS.filter((e) => (!city || e.city === city) && (!type || e.type === type));
  $("eventList").innerHTML = list.length
    ? list.map((e) => {
        const date = new Date(dayKey(e.in) + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        return `<div class="event">
          <div class="when"><b>${date.split(" ")[1]}</b>${date.split(" ")[2]}</div>
          <div class="what"><b>${ICON[e.type]} ${e.name}</b>
            <span class="muted small">${date.split(",")[0]} ${e.time} · ${e.place}, ${e.city} · ${e.dist} · ${e.fee}</span>
            <div class="row">
              <button data-go="${e.id}" class="${going[e.id] ? "" : "secondary"}">${going[e.id] ? "✓ Going" : "I'm going"}</button>
              <button data-ics="${e.id}" class="secondary">📅 Add to calendar</button>
            </div>
          </div></div>`;
      }).join("")
    : `<p class="muted">No events match. Try "All of Goa".</p>`;
}
$("evCity").onchange = $("evType").onchange = renderEvents;
$("eventList").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.go) {
    const g = (state.going ||= {});
    g[b.dataset.go] = !g[b.dataset.go];
    save();
    renderEvents();
  } else if (b.dataset.ics) {
    const ev = EVENTS.find((x) => x.id === b.dataset.ics);
    const d = dayKey(ev.in).replace(/-/g, "");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    download(`${ev.id}.ics`, [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Saathi Health//EN", "BEGIN:VEVENT",
      `UID:${ev.id}-${d}@saathi-health`, `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Kolkata:${d}T${ev.time.replace(":", "")}00`,
      `SUMMARY:${ev.name}`, `LOCATION:${ev.place}, ${ev.city}, Goa`, `DESCRIPTION:${ev.dist}. ${ev.fee}.`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n"), "text/calendar");
  }
};

// ---------- Trophy cabinet ----------
const MEDAL = { gold: "🥇", silver: "🥈", bronze: "🥉", finisher: "🏅" };

// "28:45" or "1:02:30" -> minutes. Returns NaN if it doesn't look like a time.
function parseFinish(s) {
  const parts = s.trim().split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isInteger(p) || p < 0) || parts.slice(1).some((p) => p > 59)) return NaN;
  const [h, m, sec] = parts.length === 3 ? parts : [0, ...parts];
  return h * 60 + m + sec / 60;
}
const fmtFinish = (min) => {
  const total = Math.round(min * 60), h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
};

$("trSave").onclick = () => {
  const err = (msg) => { $("trError").textContent = msg; $("trError").classList.remove("hidden"); };
  const name = $("trName").value.trim(), date = $("trDate").value, km = readNumber("trKm", 0.5, 200), minutes = parseFinish($("trTime").value);
  if (!name) return err("Please enter the race name.");
  if (!date || date > dayKey()) return err("Please pick the race date (today or earlier).");
  if (!km || Number.isNaN(km)) return err("Distance must be between 0.5 and 200 km.");
  if (Number.isNaN(minutes) || minutes <= 0) return err("Finish time should look like 28:45 or 1:02:30.");
  if (minutes / km < 2.5) return err("That time is faster than a world record. Please check it.");
  $("trError").classList.add("hidden");
  (state.trophies ||= []).push({ id: Date.now().toString(36), name, date, km, minutes, medal: $("trMedal").value });
  save();
  ["trName", "trDate", "trKm", "trTime"].forEach((id) => ($(id).value = ""));
  $("trophyForm").open = false;
  renderTrophies();
  celebrate(["🏆", MEDAL[$("trMedal").value]]);
};

function renderTrophies() {
  const list = state.trophies || [];
  // Personal best = fastest time at each distance.
  const best = {};
  list.forEach((t) => { if (!best[t.km] || t.minutes < best[t.km].minutes) best[t.km] = t; });
  const years = [...new Set(list.map((t) => t.date.slice(0, 4)))].sort().reverse();
  $("trophyList").innerHTML = years.length
    ? years.map((y) => `<h3 class="shelf-year">${y}</h3><div class="shelf">` +
        list.filter((t) => t.date.startsWith(y)).sort((a, b) => b.date.localeCompare(a.date)).map((t) =>
          `<div class="trophy"><span class="icon">${MEDAL[t.medal] || "🏅"}</span><b>${escapeHtml(t.name)}</b>
            <span class="muted small">${t.km} km · ${fmtFinish(t.minutes)} · ${fmtPace(t.minutes / t.km)} /km</span>
            ${best[t.km] === t ? `<span class="pb">PB</span>` : ""}
            <button class="link small" data-del="${t.id}" aria-label="Remove">Remove</button></div>`).join("") + "</div>").join("")
    : `<p class="muted">No race medals yet. Add your first race result below.</p>`;
}
$("trophyList").onclick = (e) => {
  const id = e.target.dataset?.del;
  if (!id || !confirm("Remove this race from your cabinet?")) return;
  state.trophies = state.trophies.filter((t) => t.id !== id);
  save();
  renderTrophies();
};

// ---------- Squads, share codes and leaderboard ----------
// A share code is this week's numbers + latest route, as base64 text. No server needed:
// friends send codes to each other and paste them in.
function mySnapshot() {
  let days = 0;
  for (let i = 0; i < 7; i++) if (dayStats(dayKey(-i)).logged) days++;
  const withRoute = allWorkouts().filter((w) => w.route?.length > 1).sort((a, b) => (b.key + b.at).localeCompare(a.key + a.at))[0];
  return {
    v: 1, n: state.profile?.name || "Friend",
    km: weekValue("km", 0), min: weekValue("minutes", 0), days, streak: streaks().current, steps: estSteps(), // corporate.js
    r: withRoute ? thinRoute(withRoute.route.map((p) => ({ p }))).filter((_, i, a) => i % Math.ceil(a.length / 60) === 0) : [],
    rt: withRoute ? `${withRoute.type} ${withRoute.km} km` : "",
    at: Date.now(),
  };
}
const encodeCode = (o) => "SAATHI1:" + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))));
function decodeCode(code) {
  const m = code.trim().match(/^SAATHI1:([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error("This doesn't look like a Saathi share code.");
  const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0))));
  // Never trust pasted data: keep only the fields we expect, with sane limits.
  const num = (x, max) => Math.min(Math.max(Number(x) || 0, 0), max);
  if (o?.v !== 1) throw new Error("Unknown code version.");
  return {
    n: String(o.n || "Friend").slice(0, 30), km: num(o.km, 2000), min: num(o.min, 10000), days: num(o.days, 7),
    streak: num(o.streak, 3650), steps: num(o.steps, 1000000), rt: String(o.rt || "").slice(0, 40), at: num(o.at, Date.now()),
    r: Array.isArray(o.r) ? o.r.slice(0, 100).filter((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)) : [],
  };
}

$("makeCodeBtn").onclick = () => {
  $("myCode").value = encodeCode(mySnapshot());
  $("myCode").classList.remove("hidden");
  $("copyCodeBtn").classList.remove("hidden");
};
$("copyCodeBtn").onclick = async () => {
  try { await navigator.clipboard.writeText($("myCode").value); toast("Code copied. Paste it in WhatsApp for your friend."); }
  catch { $("myCode").select(); toast("Select the code and copy it."); }
};

// Made-up friends so the leaderboard can be tried without anyone else.
function sampleFriends() {
  const loop = (lat, lon, r, n) => Array.from({ length: n }, (_, i) => [lat + r * Math.sin(i / 6) + i * 0.0001, lon + r * 1.4 * Math.sin(i / 9)]);
  const at = Date.now() - 3600000;
  return [
    { n: "Asha (sample)", km: 14.2, min: 160, days: 6, streak: 9, rt: "Run 5.1 km", at, r: loop(15.4909, 73.8278, 0.004, 40) },
    { n: "Joel (sample)", km: 8.5, min: 95, days: 4, streak: 2, rt: "Walk 3.2 km", at, r: loop(15.2832, 73.9862, 0.003, 35) },
    { n: "Farida (sample)", km: 22.0, min: 120, days: 3, streak: 1, rt: "Cycle 18 km", at, r: loop(15.3700, 73.9370, 0.01, 45) },
  ];
}

let lbBy = "km";
$("lbBtns").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  lbBy = b.dataset.lb;
  document.querySelectorAll("#lbBtns button").forEach((x) => x.classList.toggle("on", x === b));
  renderLeaderboard();
};

function renderSquad() {
  const sq = state.squad;
  if (!sq) {
    $("squadBox").innerHTML = `<p class="muted">Make a squad with friends and family and compete on weekly distance or on how many days you log.</p>
      <div class="row inline"><label>Squad name <input id="sqName" maxlength="30" placeholder="e.g. Panaji Morning Walkers"></label>
      <button id="sqCreate">Create squad</button></div>`;
    return;
  }
  const members = Object.values(sq.members || {});
  $("squadBox").innerHTML = `<p><b>${escapeHtml(sq.name)}</b> · ${members.length + 1} member${members.length ? "s" : ""}</p>
    <ul class="list">${members.map((f) => `<li>${escapeHtml(f.n)} <span class="muted small">· updated ${ago(f.at)}</span>
      <button class="link small" data-rm="${escapeHtml(f.n)}">Remove</button></li>`).join("") || `<li class="muted">Just you so far. Add a friend's code below.</li>`}</ul>
    <label>Paste a friend's share code <textarea id="sqCode" rows="2" placeholder="SAATHI1:…"></textarea></label>
    <p id="sqError" class="error hidden"></p>
    <div class="row"><button id="sqAdd">Add / update friend</button>
      <button id="sqSample" class="secondary">Try with sample friends</button>
      <button id="sqLeave" class="secondary">Leave squad</button></div>`;
}
const ago = (t) => {
  const h = Math.round((Date.now() - t) / 3600000);
  return h < 1 ? "just now" : h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

$("squadBox").onclick = (e) => {
  const id = e.target.id;
  if (id === "sqCreate") {
    const name = $("sqName").value.trim();
    if (!name) return toast("Please give your squad a name.");
    state.squad = { name, members: {} };
  } else if (id === "sqAdd") {
    try {
      const f = decodeCode($("sqCode").value);
      if (f.at < Date.now() - 10 * 86400000) throw new Error("This code is more than 10 days old. Ask for a new one.");
      state.squad.members[f.n] = f;
      toast(`${f.n} added to your squad.`);
    } catch (err) {
      $("sqError").textContent = err.message.startsWith("This") || err.message.startsWith("Unknown") ? err.message : "That code is broken or incomplete. Ask your friend to copy it again.";
      return $("sqError").classList.remove("hidden");
    }
  } else if (id === "sqSample") {
    sampleFriends().forEach((f) => (state.squad.members[f.n] = f));
  } else if (id === "sqLeave") {
    if (!confirm("Leave this squad? Your friends' numbers will be removed from this device.")) return;
    state.squad = null;
  } else if (e.target.dataset.rm) {
    delete state.squad.members[e.target.dataset.rm];
  } else return;
  save();
  renderSocial();
};

function renderLeaderboard() {
  if (!state.squad) {
    $("leaderboard").innerHTML = `<li class="muted">Create a squad to see a leaderboard.</li>`;
    $("squadRoutes").innerHTML = `<p class="muted">Routes shared by your squad appear here.</p>`;
    return;
  }
  const me = { ...mySnapshot(), me: true };
  const all = [me, ...Object.values(state.squad.members)];
  const score = (x) => (lbBy === "km" ? x.km : x.days * 1000 + x.min); // consistency: days logged, then minutes
  all.sort((a, b) => score(b) - score(a));
  const medal = ["🥇", "🥈", "🥉"];
  $("leaderboard").innerHTML = all.map((x, i) =>
    `<li class="${x.me ? "me" : ""}"><span class="rank">${medal[i] || i + 1}</span>
      <span class="who">${escapeHtml(x.me ? x.n + " (you)" : x.n)}</span>
      <span class="score">${lbBy === "km" ? `${x.km} km` : `${x.days}/7 days`}<small>${lbBy === "km" ? `${x.min} min` : `🔥 ${x.streak}-day streak`}</small></span></li>`).join("");
  $("squadRoutes").innerHTML = all.filter((x) => x.r.length > 1).map((x) =>
    `<figure>${routeSvg(x.r)}<figcaption><b>${escapeHtml(x.me ? "You" : x.n)}</b> · ${escapeHtml(x.rt)}</figcaption></figure>`).join("") ||
    `<p class="muted">No routes yet. Track a workout with GPS or import a file to share yours.</p>`;
}

function renderSocial() {
  renderEvents();
  renderSquad();
  renderLeaderboard();
}

// ---------- CSV export ----------
// Text that starts with = + - @ is prefixed with ' so spreadsheets don't run it as a formula.
function csvCell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (rows) => "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"); // BOM so Excel reads ₹ and Hindi text

$("csvWorkouts").onclick = () => {
  const rows = allWorkouts().sort((a, b) => (a.key + a.at).localeCompare(b.key + b.at)).map((w) => {
    const p = paceOf(w);
    return [w.key, w.type, w.km, w.minutes, p ? Math.round(p * 100) / 100 : "", p ? fmtPace(p) : "", w.source || "", (w.splits || []).join(";")];
  });
  download(`saathi-workouts-${dayKey()}.csv`, toCsv([["date", "type", "distance_km", "minutes", "pace_min_per_km", "pace_mm_ss", "source", "km_splits_min"], ...rows]), "text/csv");
};
$("csvDaily").onclick = () => {
  const rows = Object.keys(state.days).sort().map((k) => {
    const s = dayStats(k), d = state.days[k];
    return [k, s.logged ? "yes" : "no", s.water, s.sleep, s.minutes, s.km, d.mood || "", (d.workouts || []).length, d.entries.map((e) => e.text).join(" | ")];
  });
  download(`saathi-daily-${dayKey()}.csv`, toCsv([["date", "logged", "water_glasses", "sleep_hours", "active_minutes", "distance_km", "mood", "workouts", "notes"], ...rows]), "text/csv");
};
$("csvRaces").onclick = () => {
  const rows = (state.trophies || []).slice().sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.name, t.km, fmtFinish(t.minutes), Math.round(t.minutes * 100) / 100, fmtPace(t.minutes / t.km), t.medal]);
  download(`saathi-races-${dayKey()}.csv`, toCsv([["date", "race", "distance_km", "finish_time", "finish_minutes", "pace_mm_ss", "medal"], ...rows]), "text/csv");
};
