// Saathi Health extra features: tabs, profile and privacy, workouts (form, GPS, file import),
// progress charts, weekly summary, daily reminder and badges.
// Uses state, today(), save(), dayKey(), hasLog(), afterLog(), celebrate(), escapeHtml(),
// readNumber() and $ from app.js. Everything stays in this browser.

// ---------- Small helpers ----------
const keyOf = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const dayOf = (key) => (state.days[key] ||= { entries: [] });
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
// 6.2 (minutes per km) -> "6:12"
function fmtPace(minPerKm) {
  if (!minPerKm || !isFinite(minPerKm)) return "–";
  const m = Math.floor(minPerKm), s = Math.round((minPerKm - m) * 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, "0")}`;
}
const paceOf = (w) => (w.km >= 1 && w.minutes ? w.minutes / w.km : null);

let toastTimer;
function toast(msg) {
  $("toast").textContent = msg;
  $("toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.add("hidden"), 3500);
}

// One day's numbers, from typed text, quick buttons and workouts together.
function dayStats(key) {
  const d = state.days[key];
  const items = d ? d.entries.flatMap((e) => e.items) : [];
  const workouts = d?.workouts || [];
  const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
  return {
    logged: hasLog(d),
    water: (d?.water || 0) + sum(items.filter((i) => i.type === "water"), (i) => i.glasses),
    minutes: sum(items.filter((i) => i.type === "activity"), (i) => i.minutes) + sum(workouts, (w) => w.minutes),
    km: round(sum(workouts, (w) => w.km), 2),
    sleep: d?.sleep || Math.max(0, ...items.filter((i) => i.type === "sleep").map((i) => i.hours || 0)),
  };
}
const allWorkouts = () =>
  Object.entries(state.days).flatMap(([key, d]) => (d.workouts || []).map((w) => ({ ...w, key })));

// ---------- Tabs ----------
let currentTab = "today";
function showTab(name) {
  currentTab = name;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("hidden", t.id !== "tab-" + name));
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
  if (name === "activity") { renderWorkouts(); renderFatigue(); } // training.js
  if (name === "coach") renderBlock(); // training.js
  if (name === "progress") { renderVariance(); renderDigests(); } // training.js
  if (name === "progress") renderProgress();
  if (name === "badges") renderBadges();
  if (name === "profile") renderProfile();
  if (name === "coach") renderCoach(); // coach.js
  if (name === "social") renderSocial(); // social.js
  if (name === "badges") renderTrophies(); // social.js
}
$("tabs").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) showTab(b.dataset.tab);
};
// Called from renderHome() in app.js.
function renderExtras() {
  showTab(currentTab);
  checkBadges(true);
  autoDigest(); // training.js
}

// ---------- 1. Profile, consent and privacy ----------
function renderProfile() {
  const p = state.profile || {};
  $("pName").value = p.name || "";
  $("pAge").value = p.age ?? "";
  $("pWeight").value = p.weight ?? "";
  $("pHeight").value = p.height ?? "";
  $("pGoal").value = p.goal || "sugar";
  if (p.weight && p.height) {
    const bmi = p.weight / (p.height / 100) ** 2;
    $("bmiText").textContent = `BMI: ${bmi.toFixed(1)}. BMI is only a rough guide; ask your doctor what is right for you.`;
  } else {
    $("bmiText").textContent = "Add weight and height to see your BMI.";
  }
  $("consentText").textContent = p.consentAt
    ? "You agreed to store your data on this device on " + new Date(p.consentAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }) + "."
    : "";
  const r = state.reminder;
  $("remTime").value = r?.time || "20:00";
  $("remBtn").textContent = r?.on ? "Turn off" : "Turn on";
  $("remStatus").textContent = r?.on ? `On: every day at ${r.time} (India time).` : "Off.";
}

$("saveProfileBtn").onclick = () => {
  const err = (msg) => { $("profileError").textContent = msg; $("profileError").classList.remove("hidden"); };
  const age = readNumber("pAge", 18, 100), weight = readNumber("pWeight", 25, 250), height = readNumber("pHeight", 100, 230);
  if ([age, weight, height].some(Number.isNaN)) return err("Please check: age 18–100, weight 25–250 kg, height 100–230 cm.");
  $("profileError").classList.add("hidden");
  Object.assign(state.profile, { name: $("pName").value.trim(), age, weight, height, goal: $("pGoal").value });
  save();
  renderProfile();
  renderNudge();
  toast("Profile saved.");
};

$("exportBtn").onclick = () => {
  download(`saathi-health-data-${dayKey()}.json`, JSON.stringify({ ...state, key: undefined }, null, 2), "application/json");
};
$("withdrawBtn").onclick = () => {
  if (!confirm("This deletes all your Saathi data on this device and logs you out. Continue?")) return;
  try { localStorage.removeItem(STORE + ":" + currentUser); } catch {}
  logout();
};

function download(name, text, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- 2. Activity logging ----------
$("addGlassBtn").onclick = () => {
  const wasLogged = hasLog(today());
  today().water = Math.min((today().water || 0) + 1, 20);
  renderWater();
  afterLog(wasLogged);
  toast(`💧 ${today().water} glass${today().water === 1 ? "" : "es"} today.`);
};
$("addWalkBtn").onclick = () => addWorkout({ type: "Walk", km: 0, minutes: 15, source: "Quick add" });
$("saveSleepBtn").onclick = () => {
  const h = readNumber("sleepInput", 0.5, 16);
  if (h === null || Number.isNaN(h)) return toast("Enter hours of sleep between 0.5 and 16.");
  const wasLogged = hasLog(today());
  today().sleep = h;
  $("sleepInput").value = "";
  afterLog(wasLogged);
  toast(`😴 Saved ${h} hours of sleep.`);
};

$("woSaveBtn").onclick = () => {
  const err = (msg) => { $("woError").textContent = msg; $("woError").classList.remove("hidden"); };
  const km = readNumber("woKm", 0, 300), minutes = readNumber("woMin", 1, 600);
  if (minutes === null || Number.isNaN(minutes)) return err("Enter the time in minutes (1–600).");
  if (Number.isNaN(km)) return err("Distance must be between 0 and 300 km.");
  const type = $("woType").value;
  if (km && minutes / km < (type === "Cycle" ? 1 : 2.5)) return err("That pace is faster than humanly possible. Please check the numbers.");
  $("woError").classList.add("hidden");
  $("woKm").value = $("woMin").value = "";
  addWorkout({ type, km: km || 0, minutes, source: "Typed" });
};

// Saves a workout on the given day and checks for a personal best.
function addWorkout(w, key = dayKey()) {
  const before = bestPace(w.type);
  const d = dayOf(key);
  const wasLogged = hasLog(d);
  (d.workouts ||= []).push({ ...w, km: round(w.km || 0, 2), minutes: Math.round(w.minutes), at: Date.now() });
  const p = paceOf(w);
  let msg = `Saved: ${w.type}${w.km ? " " + round(w.km, 2) + " km" : ""} in ${Math.round(w.minutes)} min` + (p ? ` (${fmtPace(p)} /km)` : "");
  if (p && before && p < before) {
    state.pbs = (state.pbs || 0) + 1;
    msg += ". New personal best pace! ⚡";
  }
  if (key === dayKey()) afterLog(wasLogged);
  else { save(); renderWeek(); renderPlant(); checkBadges(); }
  renderWorkouts();
  renderToday();
  toast(msg);
  return msg;
}
function bestPace(type) {
  const paces = allWorkouts().filter((w) => w.type === type).map(paceOf).filter(Boolean);
  return paces.length ? Math.min(...paces) : null;
}

function renderWorkouts() {
  const list = allWorkouts().sort((a, b) => (b.key + b.at).localeCompare(a.key + a.at)).slice(0, 10);
  const icon = { Walk: "🚶", Run: "🏃", Cycle: "🚴", Yoga: "🧘" };
  $("workoutList").innerHTML = list.length
    ? list.map((w) => {
        const date = new Date(w.key + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        const p = paceOf(w);
        return `<li>${icon[w.type] || "👟"} <b>${w.type}</b> ${w.km ? w.km + " km · " : ""}${w.minutes} min` +
          (p ? ` · ${fmtPace(p)} /km` : "") + ` <span class="muted">· ${date} · ${escapeHtml(w.source || "")}</span></li>`;
      }).join("")
    : `<li class="muted">No workouts yet.</li>`;
}

// Distance in km between two [lat, lon] points (haversine formula).
function haversine([lat1, lon1], [lat2, lon2]) {
  const rad = Math.PI / 180, R = 6371;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Turns a list of {p:[lat,lon], t:ms} points into distance, time and per-km split times.
function trackStats(points) {
  let km = 0, lastSplitT = points[0]?.t;
  const splits = [];
  for (let i = 1; i < points.length; i++) {
    km += haversine(points[i - 1].p, points[i].p);
    while (km >= splits.length + 1) {
      splits.push((points[i].t - lastSplitT) / 60000);
      lastSplitT = points[i].t;
    }
  }
  const minutes = points.length > 1 ? (points.at(-1).t - points[0].t) / 60000 : 0;
  return { km, minutes, splits };
}

// Keeps at most 200 route points so saved data stays small.
const thinRoute = (points) => {
  const step = Math.max(1, Math.ceil(points.length / 200));
  return points.filter((_, i) => i % step === 0).map(({ p }) => [round(p[0], 5), round(p[1], 5)]);
};

function routeSvg(route) {
  if (route.length < 2) return "";
  const lats = route.map((r) => r[0]), lons = route.map((r) => r[1]);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const span = Math.max(maxLat - minLat, maxLon - minLon) || 1e-6;
  const pts = route.map(([la, lo]) => `${10 + ((lo - minLon) / span) * 280},${150 - ((la - minLat) / span) * 140}`).join(" ");
  const [sx, sy] = pts.split(" ")[0].split(","), [ex, ey] = pts.split(" ").at(-1).split(",");
  return `<svg viewBox="0 0 300 160" class="route" role="img" aria-label="Route map">
    <polyline points="${pts}" fill="none" stroke="#2e7d4f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${sx}" cy="${sy}" r="5" fill="#fff" stroke="#2e7d4f" stroke-width="2"/>
    <circle cx="${ex}" cy="${ey}" r="5" fill="#2e7d4f"/></svg>`;
}

// ---- GPS tracker ----
let gps = null;
$("gpsBtn").onclick = () => (gps ? gpsStop() : gpsStart());

function gpsStart() {
  if (!navigator.geolocation) return toast("This browser has no GPS / location support.");
  gps = { start: Date.now(), points: [], type: $("gpsType").value };
  gps.watch = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      gps.accuracy = accuracy;
      if (accuracy > 50) return; // too rough to trust
      const p = [latitude, longitude], last = gps.points.at(-1);
      if (last && haversine(last.p, p) < 0.005) return; // ignore jitter under 5 m
      gps.points.push({ p, t: pos.timestamp || Date.now() });
    },
    (e) => { gps && ($("gpsStatus").textContent = "Location problem: " + e.message); },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
  );
  gps.timer = setInterval(renderGps, 1000);
  $("gpsBtn").textContent = "■ Stop & save";
  $("gpsBtn").classList.add("danger");
  $("gpsType").disabled = true;
  $("gpsLive").classList.remove("hidden");
  renderGps();
}

function renderGps() {
  const s = trackStats(gps.points);
  const secs = Math.floor((Date.now() - gps.start) / 1000);
  $("gpsTime").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  $("gpsKm").textContent = s.km.toFixed(2);
  $("gpsPace").textContent = s.km >= 0.1 ? fmtPace(secs / 60 / s.km) : "–";
  $("gpsStatus").textContent = !gps.points.length
    ? "Waiting for a good GPS signal… (works best outdoors on a phone)" + (gps.accuracy ? ` Accuracy now: ${Math.round(gps.accuracy)} m.` : "")
    : `Tracking. ${gps.points.length} points.`;
  $("gpsSplits").innerHTML = s.splits.map((m, i) => `<li>Km ${i + 1}: <b>${fmtPace(m)}</b></li>`).join("");
  $("gpsRoute").innerHTML = routeSvg(gps.points.map((x) => x.p));
}

function gpsStop() {
  navigator.geolocation.clearWatch(gps.watch);
  clearInterval(gps.timer);
  const s = trackStats(gps.points);
  const minutes = Math.max(1, (Date.now() - gps.start) / 60000);
  if (minutes >= 1 || s.km > 0) {
    addWorkout({ type: gps.type, km: s.km, minutes, splits: s.splits.map((m) => round(m, 2)), route: thinRoute(gps.points), source: "GPS" });
  }
  gps = null;
  $("gpsBtn").textContent = "▶ Start";
  $("gpsBtn").classList.remove("danger");
  $("gpsType").disabled = false;
  $("gpsLive").classList.add("hidden");
}

// ---- 3. Import a .gpx (Strava, Apple Health) or .tcx (Google Fit, Garmin) file ----
function parseTrackFile(text, fileName) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("not a valid GPX/TCX file");
  const tag = (el, name) => el.getElementsByTagName(name)[0]?.textContent;
  let points;
  if (doc.getElementsByTagName("trkpt").length) {
    points = [...doc.getElementsByTagName("trkpt")].map((el) => ({
      p: [+el.getAttribute("lat"), +el.getAttribute("lon")], t: Date.parse(tag(el, "time")),
    }));
  } else {
    points = [...doc.getElementsByTagName("Trackpoint")]
      .filter((el) => tag(el, "LatitudeDegrees"))
      .map((el) => ({ p: [+tag(el, "LatitudeDegrees"), +tag(el, "LongitudeDegrees")], t: Date.parse(tag(el, "Time")) }));
  }
  points = points.filter((x) => isFinite(x.p[0]) && isFinite(x.p[1]) && isFinite(x.t));
  if (points.length < 2) throw new Error("no route points with times found");
  const s = trackStats(points);
  const sport = ((tag(doc, "type") || "") + " " + (doc.getElementsByTagName("Activity")[0]?.getAttribute("Sport") || "") + " " + fileName).toLowerCase();
  const type = /run/.test(sport) ? "Run" : /cycl|bik|ride/.test(sport) ? "Cycle" : "Walk";
  return {
    key: keyOf(points[0].t),
    workout: { type, km: s.km, minutes: Math.max(1, s.minutes), splits: s.splits.map((m) => round(m, 2)), route: thinRoute(points), source: "Imported file" },
  };
}

async function importFiles(files) {
  const lines = [];
  for (const f of files) {
    try {
      const { key, workout } = parseTrackFile(await f.text(), f.name);
      const dup = allWorkouts().some((w) => w.key === key && w.km === round(workout.km, 2) && w.minutes === Math.round(workout.minutes));
      if (dup) { lines.push(`${f.name}: already imported, skipped.`); continue; }
      addWorkout(workout, key);
      lines.push(`${f.name}: ${workout.type} ${round(workout.km, 2)} km on ${key}.`);
    } catch (e) {
      lines.push(`${f.name}: could not read it (${e.message}).`);
    }
  }
  $("importResult").innerHTML = lines.map(escapeHtml).join("<br>");
  return lines;
}
$("importFile").onchange = async (e) => {
  await importFiles([...e.target.files]);
  e.target.value = "";
};

// ---------- 4. Progress charts ----------
const METRICS = {
  minutes: { label: "Active minutes", unit: "min", target: 30, total: true },
  water: { label: "Water", unit: "glasses", target: 8, total: false },
  sleep: { label: "Sleep", unit: "hours", target: 7, total: false },
  km: { label: "Distance", unit: "km", target: null, total: true },
};
let chartMetric = "minutes";
$("metricBtns").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  chartMetric = b.dataset.m;
  document.querySelectorAll("#metricBtns button").forEach((x) => x.classList.toggle("on", x === b));
  renderChart();
};

// Totals (or averages over days that have a number) for a 7-day window ending `endOffset` days ago.
function weekValue(metric, endOffset) {
  const vals = [];
  for (let i = endOffset; i < endOffset + 7; i++) vals.push(dayStats(dayKey(-i))[metric]);
  if (METRICS[metric].total) return round(vals.reduce((a, b) => a + b, 0));
  const filled = vals.filter((v) => v > 0);
  return filled.length ? round(filled.reduce((a, b) => a + b, 0) / filled.length) : 0;
}

function renderProgress() {
  $("wow").innerHTML = Object.entries(METRICS).map(([k, m]) => {
    const now = weekValue(k, 0), before = weekValue(k, 7), diff = round(now - before);
    const change = diff > 0 ? `▲ ${diff} more` : diff < 0 ? `▼ ${-diff} less` : "same as";
    return `<div class="tile"><span class="muted">${m.label}${m.total ? "" : " (daily avg)"}</span>
      <b>${now} <small>${m.unit}</small></b>
      <span class="muted small">${change}${diff ? " than" : ""} last week</span></div>`;
  }).join("");
  renderChart();
  $("summaryText").textContent = weeklySummary();
}

// 14 bars: last week in a light green, this week in the main green, one optional target line.
function renderChart() {
  const m = METRICS[chartMetric];
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(-i);
    days.push({ key, v: dayStats(key)[chartMetric], thisWeek: i < 7 });
  }
  const W = 600, H = 230, L = 34, R = 8, T = 18, B = 46;
  const plotW = W - L - R, plotH = H - T - B;
  const rawMax = Math.max(m.target || 0, ...days.map((d) => d.v), 1);
  const step = rawMax <= 10 ? 2 : rawMax <= 50 ? 10 : rawMax <= 200 ? 30 : 60;
  const max = Math.ceil(rawMax / step) * step;
  const y = (v) => T + plotH - (v / max) * plotH;
  const slot = plotW / 14, bw = Math.min(26, slot - 8);
  const barPath = (x, top, w, h) => {
    const r = Math.min(4, h, w / 2);
    return `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${top + h}Z`;
  };

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${m.label}, last 14 days">`;
  for (let v = 0; v <= max; v += step) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid${v === 0 ? " base" : ""}"/>
      <text x="${L - 6}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`;
  }
  days.forEach((d, i) => {
    const x = L + i * slot + (slot - bw) / 2, h = (d.v / max) * plotH;
    const label = new Date(d.key + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    if (d.v > 0) svg += `<path d="${barPath(x, y(d.v), bw, h)}" class="${d.thisWeek ? "bar" : "bar old"}"/>`;
    svg += `<text x="${x + bw / 2}" y="${H - B + 16}" class="axis" text-anchor="middle">${label.split(" ")[0][0]}</text>`;
    svg += `<rect x="${L + i * slot}" y="${T}" width="${slot}" height="${plotH}" class="hit" tabindex="0"
      data-tip="${label}: ${round(d.v)} ${m.unit}"><title>${label}: ${round(d.v)} ${m.unit}</title></rect>`;
  });
  if (m.target) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(m.target)}" y2="${y(m.target)}" class="target"/>
      <text x="${L + 4}" y="${y(m.target) - 5}" class="axis goal">daily goal ${m.target}</text>`;
  }
  svg += `<text x="${L + plotW / 4}" y="${H - 6}" class="axis wk" text-anchor="middle">Last week</text>
    <text x="${L + (plotW * 3) / 4}" y="${H - 6}" class="axis wk" text-anchor="middle">This week</text></svg>`;

  $("chartTitle").textContent = `${m.label}, last 14 days`;
  $("chart").innerHTML = svg + `<div class="tip hidden" id="chartTip"></div>`;
  $("chartTable").innerHTML = `<tr><th>Day</th><th>${m.label} (${m.unit})</th></tr>` +
    days.map((d) => `<tr><td>${d.key}</td><td>${round(d.v)}</td></tr>`).join("");
}

// Hover / keyboard focus tooltip for the chart bars.
function chartTip(e) {
  const hit = e.target.closest?.(".hit"), tip = $("chartTip");
  if (!tip) return;
  if (!hit) return tip.classList.add("hidden");
  tip.textContent = hit.dataset.tip;
  const box = $("chart").getBoundingClientRect(), r = hit.getBoundingClientRect();
  tip.style.left = Math.min(Math.max(r.left - box.left + r.width / 2, 60), box.width - 60) + "px";
  tip.style.top = r.top - box.top + "px";
  tip.classList.remove("hidden");
}
["mouseover", "focusin"].forEach((ev) => $("chart").addEventListener(ev, chartTip));
$("chart").addEventListener("mouseleave", () => $("chartTip")?.classList.add("hidden"));

// ---------- 5. Weekly summary and daily reminder ----------
function weeklySummary() {
  const name = state.profile?.name || "friend";
  let logged = 0;
  for (let i = 0; i < 7; i++) if (dayStats(dayKey(-i)).logged) logged++;
  const weekAgo = dayKey(-6);
  const newBadges = BADGES.filter((b) => state.badges?.[b.id] >= weekAgo).map((b) => `${b.icon} ${b.name}`);
  const best = ["Walk", "Run", "Cycle"].map((t) => [t, bestPace(t)]).filter(([, p]) => p);
  const s = streaks();
  return [
    `Saathi Health — weekly summary for ${name}`,
    `${new Date(weekAgo + "T12:00:00").toDateString()} to ${new Date().toDateString()}`,
    "",
    `Days logged: ${logged} of 7   (current streak: ${s.current} day${s.current === 1 ? "" : "s"})`,
    `Active minutes: ${weekValue("minutes", 0)} (last week ${weekValue("minutes", 7)})`,
    `Distance: ${weekValue("km", 0)} km (last week ${weekValue("km", 7)} km)`,
    `Water: ${weekValue("water", 0)} glasses a day on average`,
    `Sleep: ${weekValue("sleep", 0)} hours a night on average`,
    `New badges: ${newBadges.length ? newBadges.join(", ") : "none this week"}`,
    `Best pace: ${best.length ? best.map(([t, p]) => `${t} ${fmtPace(p)} /km`).join(", ") : "log a walk or run with distance to see it"}`,
    "",
    "Not medical advice. For worrying symptoms, please see a doctor.",
  ].join("\n");
}
$("emailSummaryBtn").onclick = () => {
  // Opens the user's own email app with the summary filled in; nothing goes through our server.
  location.href = "mailto:?subject=" + encodeURIComponent("My Saathi Health weekly summary") + "&body=" + encodeURIComponent(weeklySummary());
};
$("copySummaryBtn").onclick = async () => {
  try { await navigator.clipboard.writeText(weeklySummary()); toast("Summary copied."); }
  catch { toast("Could not copy. Please select the text and copy it."); }
};
$("downloadSummaryBtn").onclick = () => download(`saathi-weekly-summary-${dayKey()}.txt`, weeklySummary());

$("remBtn").onclick = async () => {
  const r = (state.reminder ||= {});
  if (r.on) { r.on = false; save(); return renderProfile(); }
  if (!("Notification" in window)) return toast("This browser cannot show notifications.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return toast("Notifications are blocked. Allow them in your browser settings.");
  Object.assign(r, { on: true, time: $("remTime").value || "20:00" });
  save();
  renderProfile();
  toast(`Reminder set for ${r.time} every day.`);
};
// Every 30 seconds: if it's reminder time and today isn't logged yet, send one notification.
setInterval(() => {
  const r = state.reminder;
  if (!currentUser || !r?.on || window.Notification?.permission !== "granted") return;
  const now = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  if (now < r.time || r.lastSent === dayKey() || hasLog(state.days[dayKey()])) return;
  r.lastSent = dayKey();
  save();
  new Notification("Saathi Health 🌿", { body: `Hi ${state.profile?.name || ""}! One line about your day keeps your streak going.` });
}, 30000);

// ---------- 6. Badges and streaks ----------
function streaks() {
  const logged = new Set(Object.keys(state.days).filter((k) => hasLog(state.days[k])));
  let best = 0, run = 0, prev = null;
  [...logged].sort().forEach((k) => {
    const t = Date.parse(k + "T00:00:00Z");
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  });
  // Today not logged yet doesn't break the streak; it counts from yesterday.
  let current = 0;
  for (let i = logged.has(dayKey()) ? 0 : 1; logged.has(dayKey(-i)); i++) current++;
  return { current, best, total: logged.size };
}

const BADGES = [
  { id: "first", icon: "🌱", name: "First step", desc: "Log your first day", test: (s) => s.total >= 1 },
  { id: "streak3", icon: "🔥", name: "3-day streak", desc: "Log 3 days in a row", test: (s) => s.best >= 3 },
  { id: "streak7", icon: "🌟", name: "7-day streak", desc: "Log 7 days in a row", test: (s) => s.best >= 7 },
  { id: "streak10", icon: "🏆", name: "10-day streak", desc: "Log 10 days in a row", test: (s) => s.best >= 10 },
  { id: "water8", icon: "💧", name: "Hydration hero", desc: "Drink 8 glasses in one day", test: (s) => s.maxWater >= 8 },
  { id: "sleep7", icon: "😴", name: "Well rested", desc: "Sleep 7 hours or more", test: (s) => s.maxSleep >= 7 },
  { id: "workout1", icon: "👟", name: "First workout", desc: "Save a walk, run or ride", test: (s) => s.workouts >= 1 },
  { id: "km5", icon: "🛣️", name: "5 km club", desc: "Cover 5 km in total", test: (s) => s.km >= 5 },
  { id: "km25", icon: "🗺️", name: "25 km explorer", desc: "Cover 25 km in total", test: (s) => s.km >= 25 },
  { id: "pb", icon: "⚡", name: "Personal best", desc: "Beat your best pace", test: (s) => s.pbs >= 1 },
  { id: "week150", icon: "💪", name: "150-minute week", desc: "150 active minutes in 7 days", test: (s) => s.week >= 150 },
];

function badgeStats() {
  const days = Object.keys(state.days).map(dayStats);
  return {
    ...streaks(),
    maxWater: Math.max(0, ...days.map((d) => d.water)),
    maxSleep: Math.max(0, ...days.map((d) => d.sleep)),
    workouts: allWorkouts().length,
    km: allWorkouts().reduce((s, w) => s + (w.km || 0), 0),
    pbs: state.pbs || 0,
    week: weekValue("minutes", 0),
  };
}

// Awards new badges. `quiet` = no celebration (used when the app first opens).
function checkBadges(quiet = false) {
  if (!state.profile) return;
  const s = badgeStats(), earned = (state.badges ||= {});
  const fresh = BADGES.filter((b) => !earned[b.id] && b.test(s));
  if (!fresh.length) return;
  fresh.forEach((b) => (earned[b.id] = dayKey()));
  save();
  if (currentTab === "badges") renderBadges();
  if (!quiet) {
    setTimeout(() => toast(`New badge: ${fresh.map((b) => b.icon + " " + b.name).join(", ")}!`), 600);
    celebrate(["🏅", ...fresh.map((b) => b.icon)]);
  }
}

function renderBadges() {
  const s = streaks(), earned = state.badges || {};
  $("streakNum").textContent = s.current;
  $("streakText").textContent = s.current
    ? `Your best is ${s.best} day${s.best === 1 ? "" : "s"}. Log today to keep it going.`
    : "Log today to start a new streak. Missing a day is fine; just start again.";
  $("badgeCount").textContent = `${BADGES.filter((b) => earned[b.id]).length} / ${BADGES.length}`;
  $("badgeGrid").innerHTML = BADGES.map((b) => {
    const when = earned[b.id] && new Date(earned[b.id] + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `<div class="badge ${when ? "got" : ""}"><span class="icon">${when ? b.icon : "🔒"}</span>
      <b>${b.name}</b><span class="muted small">${when ? "Earned " + when : b.desc}</span></div>`;
  }).join("");
  const rows = ["Walk", "Run", "Cycle"].flatMap((t) => {
    const ws = allWorkouts().filter((w) => w.type === t);
    if (!ws.length) return [];
    const p = bestPace(t), far = Math.max(...ws.map((w) => w.km || 0));
    return [`<li><b>${t}:</b> ${p ? "best pace " + fmtPace(p) + " /km" : "no pace yet"}${far ? ", longest " + far + " km" : ""}</li>`];
  });
  $("pbList").innerHTML = rows.join("") || `<li class="muted">Log a walk or run with distance to see your bests.</li>`;
}
