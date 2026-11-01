// Saathi Health training: adaptive 8–12 week training blocks (Gemini or rules),
// fatigue logging, a plan-vs-actual variance dashboard with drill-down, and
// automatic weekly digests. Weeks run Monday to Sunday, in India time.
// Uses state, save(), today(), dayKey(), dayStats(), hasLog(), afterLog(), allWorkouts(),
// bestPace(), paceOf(), fmtPace(), streaks(), weekValue(), parseFinish(), download(),
// toast(), round(), escapeHtml(), readNumber() and $.

// ---------- Date helpers (keys are "YYYY-MM-DD") ----------
const addDays = (key, n) => new Date(Date.parse(key + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const mondayOf = (key) => addDays(key, -((new Date(key + "T00:00:00Z").getUTCDay() + 6) % 7));
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shortDate = (key) => new Date(key + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const weekWorkouts = (monday) => allWorkouts().filter((w) => w.key >= monday && w.key <= addDays(monday, 6));

// ---------- Fatigue (1 = fresh, 5 = exhausted) ----------
function renderFatigue() {
  document.querySelectorAll("#fatigueBtns button").forEach((b) => b.classList.toggle("on", +b.dataset.f === today().fatigue));
}
$("fatigueBtns").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const wasLogged = hasLog(today());
  today().fatigue = +b.dataset.f;
  afterLog(wasLogged);
  renderFatigue();
  toast(today().fatigue >= 4 ? "Saved. Your plan for today has been made easier." : "Saved. Thanks!");
};

// ---------- Training blocks ----------
const BLOCK_GOALS = {
  "5K": { label: "5K run", race: 5, type: "Run", peakLong: 9 },
  "10K": { label: "10K run", race: 10, type: "Run", peakLong: 14 },
  Half: { label: "Half marathon", race: 21.1, type: "Run", peakLong: 18 },
  Walk: { label: "Walking fitness", race: 6, type: "Walk", peakLong: 8 },
};
const DAY_SETS = { 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [0, 1, 3, 4, 6] }; // 0 = Monday
const HARD = ["tempo", "intervals", "long", "race"];
const KINDS = ["easy", "long", "tempo", "intervals", "race"];
function kindLabel(kind, type) {
  if (type === "Walk") return { easy: "Brisk walk", long: "Long walk", race: "Goal walk" }[kind] || "Walk";
  return { easy: "Easy run", long: "Long run", tempo: "Tempo run", intervals: "Intervals", race: "Goal race" }[kind];
}
// Target pace in minutes per km, worked out from the user's best pace.
function paceFor(kind, type, best) {
  if (type === "Walk") return { race: 9.5, long: 11, easy: 10.5 }[kind] || 10.5;
  const b = best || 7;
  return { easy: b + 1.25, long: b + 1.5, tempo: b + 0.35, intervals: b - 0.1, race: b }[kind];
}
const half = (n) => Math.max(1, Math.round(n * 2) / 2); // round to 0.5 km, at least 1

// Rule-based block: build ~8% a week, every 4th week easier, last week tapers to a goal day.
function rulesBlock({ goal, weeks, days, baseKm }) {
  const g = BLOCK_GOALS[goal], set = DAY_SETS[days];
  let build = Math.max(baseKm, days * (g.type === "Walk" ? 2 : 3));
  const cap = Math.max(build * 1.6, g.race * 2.5);
  const plan = [];
  for (let w = 1; w <= weeks; w++) {
    const last = w === weeks, recovery = !last && w % 4 === 0;
    if (w > 1 && !recovery && !last) build = Math.min(build * 1.08, cap);
    const weekKm = last ? build * 0.6 : recovery ? build * 0.75 : build;
    const sessions = set.map((dow) => ({ dow, kind: "easy" }));
    sessions.at(-1).kind = last ? "race" : "long";
    if (g.type === "Run" && !recovery && !last && w > 1) sessions[0].kind = w % 2 ? "tempo" : "intervals";
    if (last) {
      // Taper: the goal day plus short, easy sessions, so the whole week stays light.
      const easy = Math.min(g.race * 0.4, Math.max(weekKm - g.race, 0) / (sessions.length - 1));
      sessions.forEach((s) => (s.km = s.kind === "race" ? g.race : half(easy)));
    } else {
      const long = Math.min(g.peakLong, weekKm * 0.35), quality = sessions[0].kind === "easy" ? 0 : weekKm * 0.2;
      const easyCount = sessions.filter((s) => s.kind === "easy").length;
      const easy = (weekKm - long - quality) / Math.max(easyCount, 1);
      sessions.forEach((s) => (s.km = half(s.kind === "long" ? long : s.kind === "easy" ? easy : quality)));
    }
    plan.push({ week: w, focus: last ? "Taper & goal day" : recovery ? "Recovery week" : w <= weeks / 2 ? "Base building" : "Build", sessions });
  }
  return plan;
}

// Never trust AI output as-is: check the shape and clamp distances and weekly jumps.
function cleanPlan(weeksArr, { goal, weeks }) {
  const g = BLOCK_GOALS[goal], maxKm = g.type === "Walk" ? 15 : Math.max(g.race, 30);
  if (!Array.isArray(weeksArr) || weeksArr.length !== weeks) throw new Error("wrong number of weeks");
  let prev = null;
  return weeksArr.map((wk, i) => {
    const used = new Set();
    let sessions = (wk.sessions || []).filter((s) => {
      const ok = Number.isInteger(s.dow) && s.dow >= 0 && s.dow <= 6 && !used.has(s.dow) && KINDS.includes(s.kind) &&
        (g.type === "Run" || ["easy", "long", "race"].includes(s.kind));
      if (ok) used.add(s.dow);
      return ok;
    }).map((s) => ({ dow: s.dow, kind: s.kind, km: half(Math.min(Math.max(+s.km || 0, 1), maxKm)), note: String(s.note || "").slice(0, 80) }));
    if (sessions.length < 2 || sessions.length > 6) throw new Error("bad session count");
    const total = sessions.reduce((a, s) => a + s.km, 0);
    if (prev && total > prev * 1.15) sessions = sessions.map((s) => ({ ...s, km: half((s.km * prev * 1.15) / total) }));
    prev = sessions.reduce((a, s) => a + s.km, 0);
    return { week: i + 1, focus: String(wk.focus || "Training").slice(0, 30), sessions: sessions.sort((a, b) => a.dow - b.dow) };
  });
}

async function aiBlock(opts) {
  const g = BLOCK_GOALS[opts.goal];
  const prompt = `Create a ${opts.weeks}-week training block. Goal: ${g.label} (goal day distance ${g.race} km).
The person trains ${opts.days} days a week on day numbers ${JSON.stringify(DAY_SETS[opts.days])} (0 = Monday).
Current weekly distance: ${opts.baseKm} km. Best pace: ${opts.best ? fmtPace(opts.best) + " min/km" : "unknown"}. Age: ${state.profile?.age || "unknown"}.
Rules: increase weekly km by at most 10%; make every 4th week easier; the last week tapers and ends with one "race" session of ${g.race} km.
${g.type === "Walk" ? 'Walking only: use kinds "easy", "long" and "race" only.' : 'Kinds: "easy", "long", "tempo", "intervals", "race". At most one tempo or intervals session a week.'}
Return ONLY JSON: {"weeks":[{"focus":"2-3 words","sessions":[{"dow":0,"kind":"easy","km":3,"note":"max 8 words"}]}]}`;
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(state.key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.3 } }),
    }
  );
  if (!res.ok) throw new Error("Gemini error " + res.status);
  const data = await res.json();
  return cleanPlan(JSON.parse(data.candidates[0].content.parts[0].text).weeks, opts);
}

// Average weekly km over the last 4 full weeks, to start the plan at the right level.
function recentWeeklyKm() {
  const mon = mondayOf(dayKey());
  let total = 0;
  for (let i = 1; i <= 4; i++) total += weekWorkouts(addDays(mon, -7 * i)).reduce((a, w) => a + (w.km || 0), 0);
  return round(total / 4);
}

async function createBlock() {
  const goal = $("blGoal").value, weeks = +$("blWeeks").value, days = +$("blDays").value;
  const baseKm = readNumber("blKm", 0, 150);
  if (Number.isNaN(baseKm)) return toast("Weekly distance must be between 0 and 150 km.");
  const g = BLOCK_GOALS[goal];
  const opts = { goal, weeks, days, baseKm: baseKm || 0, best: bestPace(g.type) };
  const t = dayKey();
  const startKey = (new Date(t + "T00:00:00Z").getUTCDay() + 6) % 7 === 0 ? t : addDays(mondayOf(t), 7);
  $("blCreate").disabled = true;
  $("blCreate").textContent = "Building your plan…";
  let plan, source = "Saathi rules";
  if (state.key) {
    try { plan = await aiBlock(opts); source = "Gemini AI"; } catch (e) { console.warn(e); }
  }
  if (!plan) plan = rulesBlock(opts);
  plan.forEach((wk) => wk.sessions.forEach((s) => (s.pace = paceFor(s.kind, g.type, opts.best))));
  state.block = { ...opts, type: g.type, startKey, plan, source, created: Date.now() };
  save();
  renderBlock();
  toast(`Your ${weeks}-week ${g.label} plan is ready. It starts ${shortDate(startKey)}.`);
}

// Did the user do this session? A workout of the right type that day, at least 70% of the distance.
function sessionDone(s, type) {
  return allWorkouts().some((w) => w.key === s.date && (w.type === type || (type === "Run" && w.type === "Walk" && s.kind === "easy")) &&
    (w.km ? w.km >= s.km * 0.7 : w.minutes >= s.km * 6));
}

// The adaptive part: rework the rest of this week from what actually happened.
// Pure function: the saved plan never changes, so the result is always explainable.
function adaptWeek(idx) {
  const b = state.block, monday = addDays(b.startKey, idx * 7), t = dayKey();
  const notes = [];
  let sessions = b.plan[idx].sessions.map((s) => ({ ...s, date: addDays(monday, s.dow) }));
  sessions.forEach((s) => (s.status = sessionDone(s, b.type) ? "done" : s.date < t ? "missed" : "planned"));
  const missed = sessions.filter((s) => s.status === "missed");

  // 1. A missed hard session moves to the next free day if it isn't next to another hard day; never crammed.
  missed.filter((s) => HARD.includes(s.kind)).forEach((s) => {
    const taken = new Set(sessions.map((x) => x.date));
    let free = null;
    for (let d = 0; d < 7; d++) {
      const date = addDays(monday, d);
      if (date < t || taken.has(date)) continue;
      const nextToHard = sessions.some((x) => x.status !== "missed" && HARD.includes(x.kind) && Math.abs(Date.parse(x.date) - Date.parse(date)) === 86400000);
      if (!nextToHard) { free = date; break; }
    }
    if (free) {
      sessions.push({ ...s, date: free, dow: (new Date(free + "T00:00:00Z").getUTCDay() + 6) % 7, km: half(s.km * 0.8), status: "planned", moved: true });
      notes.push(`Missed ${kindLabel(s.kind, b.type).toLowerCase()} on ${DOW[s.dow]} moved to ${DOW[(new Date(free + "T00:00:00Z").getUTCDay() + 6) % 7]}, 20% shorter.`);
    } else {
      notes.push(`Missed ${kindLabel(s.kind, b.type).toLowerCase()} on ${DOW[s.dow]} is skipped. No free day to fit it safely, and cramming raises injury risk.`);
    }
  });
  if (missed.some((s) => !HARD.includes(s.kind))) notes.push("Missed easy sessions are simply dropped. Don't make them up.");

  // 2. Two or more misses: ease back in with 15% less volume for the rest of the week.
  const future = sessions.filter((s) => s.status === "planned");
  if (missed.length >= 2) {
    future.forEach((s) => { s.km = half(s.km * 0.85); s.adjusted = true; });
    notes.push("You missed 2+ sessions, so the rest of the week is 15% lighter to ease back in.");
  }

  // 3. Poor sleep or high fatigue: today's session becomes easy and shorter (or a rest day at 5/5).
  const td = state.days[t], sleep = td?.sleep || state.days[addDays(t, -1)]?.sleep, fatigue = td?.fatigue;
  const todays = future.find((s) => s.date === t);
  if (todays && ((sleep && sleep < 6) || fatigue >= 4)) {
    const reason = fatigue >= 4 ? `you rated tiredness ${fatigue}/5` : `you slept only ${sleep} hours`;
    if (fatigue === 5) {
      todays.status = "rest";
      notes.push(`Today is now a rest day because ${reason}.`);
    } else {
      todays.kind = "easy";
      todays.km = half(todays.km * 0.8);
      todays.adjusted = true;
      notes.push(`Today's session is now easy and 20% shorter because ${reason}.`);
    }
  }
  sessions.forEach((s) => (s.pace = paceFor(s.kind, b.type, b.best)));
  return { sessions: sessions.sort((a, c) => a.date.localeCompare(c.date)), notes, monday };
}

const STATUS_ICON = { done: "✅", missed: "❌", planned: "⬜", rest: "🛌" };
function renderBlock() {
  const b = state.block;
  if (!b) {
    $("blockBox").innerHTML = `<p class="muted">Get a personal 8–12 week plan that changes when life gets in the way: missed sessions, poor sleep or a tiring day.</p>
      <div class="grid3">
        <label>Goal <select id="blGoal"><option value="5K">5K run</option><option value="10K">10K run</option><option value="Half">Half marathon</option><option value="Walk">Walking fitness</option></select></label>
        <label>Weeks <select id="blWeeks"><option>8</option><option>10</option><option>12</option></select></label>
        <label>Days a week <select id="blDays"><option>3</option><option selected>4</option><option>5</option></select></label>
      </div>
      <label>Current distance per week (km) <input id="blKm" type="number" min="0" max="150" step="0.5" value="${recentWeeklyKm() || ""}" placeholder="e.g. 10"></label>
      <div class="row"><button id="blCreate">Create my plan</button></div>
      <p class="muted small">${state.key ? "Gemini AI writes the plan; Saathi checks it for safe distances." : "Built by Saathi's rules. Add a Gemini key in Settings to have AI write it."}</p>`;
    return;
  }
  const idx = Math.floor((Date.parse(dayKey()) - Date.parse(b.startKey)) / (7 * 86400000));
  const g = BLOCK_GOALS[b.goal];
  let body;
  if (idx < 0) {
    body = `<p>Your plan starts on <b>${shortDate(b.startKey)}</b>. First week:</p>` + sessionList(b.plan[0].sessions.map((s) => ({ ...s, date: addDays(b.startKey, s.dow), status: "planned" })), b.type);
  } else if (idx >= b.plan.length) {
    body = `<p>🎉 You finished your ${b.weeks}-week plan! Add your race result in the Trophy cabinet, then make a new plan.</p>`;
  } else {
    const wk = adaptWeek(idx);
    body = `<p><b>Week ${idx + 1} of ${b.weeks}</b> · ${b.plan[idx].focus}</p>` + sessionList(wk.sessions, b.type) +
      (wk.notes.length ? `<div class="adapt"><b>What changed and why</b><ul>${wk.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul></div>` : "");
  }
  $("blockBox").innerHTML = `<p class="muted small">${g.label} · ${b.weeks} weeks · ${b.days} days a week · made by ${b.source}</p>${body}
    <details><summary>See the whole plan</summary><table class="table">
      <tr><th>Week</th><th>Focus</th><th>km</th><th>Sessions</th></tr>
      ${b.plan.map((w) => `<tr${w.week === idx + 1 ? ' class="now"' : ""}><td>${w.week}</td><td>${escapeHtml(w.focus)}</td><td>${round(w.sessions.reduce((a, s) => a + s.km, 0))}</td>
        <td>${w.sessions.map((s) => `${DOW[s.dow]} ${s.km}`).join(", ")}</td></tr>`).join("")}
    </table></details>
    <div class="row"><button id="blDelete" class="secondary">Delete plan</button></div>`;
}
function sessionList(sessions, type) {
  return `<ul class="list sessions">${sessions.map((s) =>
    `<li class="${s.status}">${STATUS_ICON[s.status]} <b>${DOW[(new Date(s.date + "T00:00:00Z").getUTCDay() + 6) % 7]} ${shortDate(s.date)}</b> · ` +
    (s.status === "rest" ? "Rest day" : `${kindLabel(s.kind, type)} ${s.km} km @ ${fmtPace(s.pace)} /km`) +
    (s.moved ? ` <span class="tag">moved</span>` : "") + (s.adjusted ? ` <span class="tag">adjusted</span>` : "") +
    (s.note ? `<span class="muted small"> · ${escapeHtml(s.note)}</span>` : "") + `</li>`).join("")}</ul>`;
}
$("blockBox").onclick = (e) => {
  if (e.target.id === "blCreate") createBlock();
  if (e.target.id === "blDelete" && confirm("Delete your training plan?")) { state.block = null; save(); renderBlock(); }
};

// ---------- Plan vs actual (variance) ----------
// Planned numbers for a week: from the training block if it covers that week, else the simple weekly plan.
function plannedFor(monday) {
  const b = state.block;
  if (b) {
    const idx = Math.round((Date.parse(monday) - Date.parse(b.startKey)) / (7 * 86400000));
    if (idx >= 0 && idx < b.plan.length) {
      const list = b.plan[idx].sessions.map((s) => ({ ...s, date: addDays(monday, s.dow), pace: s.pace || paceFor(s.kind, b.type, b.best) }));
      const km = list.reduce((a, s) => a + s.km, 0);
      return { km: round(km), sessions: list.length, pace: list.reduce((a, s) => a + s.pace * s.km, 0) / km, list };
    }
  }
  const p = state.weeklyPlan;
  return p?.km ? { km: p.km, sessions: p.sessions || null, pace: p.pace || null, list: [] } : null;
}
function actualFor(monday) {
  const ws = weekWorkouts(monday), withKm = ws.filter((w) => w.km > 0);
  const km = withKm.reduce((a, w) => a + w.km, 0), mins = withKm.reduce((a, w) => a + w.minutes, 0);
  return { km: round(km), sessions: ws.length, pace: km >= 1 ? mins / km : null, list: ws };
}
// Acute:chronic load ratio: this week's km vs the average of the 4 weeks before.
function loadRatio(monday) {
  let chronic = 0;
  for (let i = 1; i <= 4; i++) chronic += actualFor(addDays(monday, -7 * i)).km;
  chronic /= 4;
  return chronic >= 2 ? actualFor(monday).km / chronic : null;
}
function varStatus(p, a, ratio) {
  if (ratio && ratio > 1.5) return ["serious", "🔴", `Overtraining risk: this week's load is ${ratio.toFixed(1)}× your 4-week average`];
  if (p?.km) {
    const v = (a.km - p.km) / p.km;
    if (v < -0.2) return ["warn", "🟡", `Training deficit: ${Math.round(-v * 100)}% under plan`];
    if (v > 0.2) return ["warn", "🟠", `Over plan by ${Math.round(v * 100)}%. Watch for tiredness`];
    return ["good", "🟢", "On plan"];
  }
  if (ratio && ratio < 0.6) return ["warn", "🟡", "Much less than your usual weeks"];
  return ["none", "⚪", "No plan for this week. Set one below to compare"];
}
const paceDiff = (actual, plan) => {
  if (!actual || !plan) return "–";
  const d = actual - plan;
  return Math.abs(d) < 0.05 ? "on target" : `${fmtPace(Math.abs(d))} ${d > 0 ? "slower" : "faster"}`;
};

let varWeek = null, varMetric = "km";
function renderVariance() {
  const thisMon = mondayOf(dayKey());
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const monday = addDays(thisMon, -7 * i);
    weeks.push({ monday, p: plannedFor(monday), a: actualFor(monday) });
  }
  if (!varWeek || !weeks.some((w) => w.monday === varWeek)) varWeek = thisMon;
  const sel = weeks.find((w) => w.monday === varWeek), ratio = loadRatio(varWeek);
  // For the current week, compare against what was planned up to today, not the whole week.
  const isNow = varWeek === thisMon;
  let p = sel.p;
  if (isNow && p) {
    const soFar = p.list.length
      ? p.list.filter((s) => s.date <= dayKey()).reduce((a, s) => a + s.km, 0)
      : (p.km * ((new Date(dayKey() + "T00:00:00Z").getUTCDay() + 6) % 7 + 1)) / 7;
    p = { ...p, km: round(soFar) };
  }
  const [cls, icon, text] = varStatus(p, sel.a, ratio);
  const v = p?.km ? sel.a.km - p.km : null;

  $("varBox").innerHTML = `
    <div class="seg" id="varMetric"><button data-m="km" class="${varMetric === "km" ? "on" : ""}">Distance</button><button data-m="sessions" class="${varMetric === "sessions" ? "on" : ""}">Sessions</button></div>
    <div class="legend"><span><i class="sw plan"></i>Planned</span><span><i class="sw act"></i>Actual</span><span class="muted small">Tap a week to drill down</span></div>
    <div class="chart" id="varChart">${varChart(weeks)}</div>
    <h3 class="drill">Week of ${shortDate(varWeek)}</h3>
    <p class="status ${cls}">${icon} ${escapeHtml(text)}</p>
    <div class="tiles">
      <div class="tile"><span class="muted">Planned${isNow ? " so far" : ""}</span><b>${p?.km ?? "–"} <small>km</small></b><span class="muted small">${isNow && sel.p ? `of ${sel.p.km} km this week` : `${sel.p?.sessions ?? "–"} sessions`}</span></div>
      <div class="tile"><span class="muted">Actual</span><b>${sel.a.km} <small>km</small></b><span class="muted small">${sel.a.sessions} sessions</span></div>
      <div class="tile"><span class="muted">Variance</span><b>${v === null ? "–" : (v > 0 ? "+" : "") + round(v)} <small>km</small></b><span class="muted small">${v === null ? "no plan" : (v > 0 ? "+" : "") + Math.round((v / p.km) * 100) + "%"}</span></div>
      <div class="tile"><span class="muted">Pace vs plan</span><b>${fmtPace(sel.a.pace)} <small>/km</small></b><span class="muted small">${paceDiff(sel.a.pace, sel.p?.pace)}</span></div>
      <div class="tile"><span class="muted">Load ratio</span><b>${ratio ? ratio.toFixed(2) : "–"}</b><span class="muted small">safe range 0.8–1.3</span></div>
    </div>
    <table class="table drilltable"><tr><th>Day</th><th>Planned</th><th>Actual</th><th>Δ km</th><th>Pace</th></tr>
      ${DOW.map((d, i) => {
        const date = addDays(varWeek, i), ps = sel.p?.list.filter((s) => s.date === date) || [], as = sel.a.list.filter((w) => w.key === date);
        const pk = ps.reduce((x, s) => x + s.km, 0), ak = as.reduce((x, w) => x + (w.km || 0), 0);
        const ap = as.filter((w) => w.km > 0).reduce((x, w) => x + w.minutes, 0) / (ak || 1);
        return `<tr><td>${d} ${shortDate(date)}</td>
          <td>${ps.map((s) => `${kindLabel(s.kind, state.block?.type || "Run")} ${s.km} km`).join("<br>") || "–"}</td>
          <td>${as.map((w) => `${w.type} ${w.km ? w.km + " km" : w.minutes + " min"}`).join("<br>") || "–"}</td>
          <td>${ps.length || as.length ? (ak - pk > 0 ? "+" : "") + round(ak - pk) : ""}</td>
          <td>${ak >= 1 && ps[0] ? paceDiff(ap, ps[0].pace) : ""}</td></tr>`;
      }).join("")}
    </table>
    <details${state.block ? "" : " open"}><summary>My weekly plan ${state.block ? "(used for weeks outside your training block)" : ""}</summary>
      <div class="grid3">
        <label>Km per week <input id="wpKm" type="number" min="1" max="300" step="0.5" value="${state.weeklyPlan?.km ?? ""}"></label>
        <label>Sessions per week <input id="wpSessions" type="number" min="1" max="14" value="${state.weeklyPlan?.sessions ?? ""}"></label>
        <label>Target pace <input id="wpPace" placeholder="e.g. 6:30" value="${state.weeklyPlan?.pace ? fmtPace(state.weeklyPlan.pace) : ""}"></label>
      </div>
      <div class="row"><button id="wpSave" class="secondary">Save weekly plan</button></div>
    </details>`;
}

function varChart(weeks) {
  const W = 600, H = 220, L = 34, R = 8, T = 14, B = 34, plotW = W - L - R, plotH = H - T - B;
  const val = (x) => (x ? x[varMetric] || 0 : 0);
  const rawMax = Math.max(1, ...weeks.flatMap((w) => [val(w.p), val(w.a)]));
  const step = rawMax <= 10 ? 2 : rawMax <= 50 ? 10 : 25, max = Math.ceil(rawMax / step) * step;
  const y = (v) => T + plotH - (v / max) * plotH, slot = plotW / weeks.length, bw = Math.min(22, (slot - 16) / 2);
  const bar = (x, v, cls) => {
    if (!v) return "";
    const h = (v / max) * plotH, r = Math.min(4, h, bw / 2), top = y(v);
    return `<path class="${cls}" d="M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${top + h}Z"/>`;
  };
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Planned versus actual ${varMetric} per week">`;
  for (let v = 0; v <= max; v += step) svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid${v === 0 ? " base" : ""}"/><text x="${L - 6}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`;
  weeks.forEach((w, i) => {
    const x0 = L + i * slot + (slot - 2 * bw - 2) / 2;
    if (w.monday === varWeek) svg += `<rect x="${L + i * slot + 2}" y="${T}" width="${slot - 4}" height="${plotH}" class="selwk"/>`;
    svg += bar(x0, val(w.p), "plan") + bar(x0 + bw + 2, val(w.a), "bar");
    svg += `<text x="${L + i * slot + slot / 2}" y="${H - B + 16}" class="axis" text-anchor="middle">${shortDate(w.monday)}</text>`;
    const tip = `Week of ${shortDate(w.monday)}: planned ${w.p ? val(w.p) : "–"}, actual ${val(w.a)} ${varMetric === "km" ? "km" : "sessions"}`;
    svg += `<rect x="${L + i * slot}" y="${T}" width="${slot}" height="${plotH}" class="hit" tabindex="0" data-week="${w.monday}" data-tip="${tip}"><title>${tip}</title></rect>`;
  });
  return svg + `</svg><div class="tip hidden" id="varTip"></div>`;
}

$("varBox").addEventListener("click", (e) => {
  const wk = e.target.closest?.("[data-week]");
  if (wk) { varWeek = wk.dataset.week; return renderVariance(); }
  const m = e.target.closest?.("#varMetric button");
  if (m) { varMetric = m.dataset.m; return renderVariance(); }
  if (e.target.id === "wpSave") {
    const km = readNumber("wpKm", 1, 300), sessions = readNumber("wpSessions", 1, 14);
    const paceText = $("wpPace").value.trim(), pace = paceText ? parseFinish(paceText) : null;
    if (!km || Number.isNaN(km) || Number.isNaN(sessions) || Number.isNaN(pace)) return toast("Please check: km 1–300, sessions 1–14, pace like 6:30.");
    state.weeklyPlan = { km, sessions, pace };
    save();
    renderVariance();
    toast("Weekly plan saved.");
  }
});
$("varBox").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.dataset?.week) { varWeek = e.target.dataset.week; renderVariance(); }
});
["mouseover", "focusin"].forEach((ev) => $("varBox").addEventListener(ev, (e) => {
  const hit = e.target.closest?.(".hit"), tip = $("varTip");
  if (!tip) return;
  if (!hit) return tip.classList.add("hidden");
  const box = $("varChart").getBoundingClientRect(), r = hit.getBoundingClientRect();
  tip.textContent = hit.dataset.tip;
  tip.style.left = Math.min(Math.max(r.left - box.left + r.width / 2, 110), box.width - 110) + "px";
  tip.style.top = r.top - box.top + "px";
  tip.classList.remove("hidden");
}));

// ---------- Weekly digests (made automatically each Monday) ----------
function recoveryProtocol(fatigue, sleep, ratio) {
  if (fatigue >= 4 || (sleep && sleep < 6) || (ratio && ratio > 1.5)) {
    return ["Take 2 full rest days this week.", "Aim for 7–8 hours of sleep; no screens for 30 minutes before bed.",
      "Swap hard sessions for easy 20–30 minute walks.", "Drink 8+ glasses of water and have protein at every meal."];
  }
  if (fatigue >= 3 || (sleep && sleep < 7)) {
    return ["Take 1 rest day and stretch for 10 minutes after workouts.", "Keep easy runs truly easy: you should be able to talk in full sentences.",
      "Try going to bed 30 minutes earlier."];
  }
  return ["You're recovering well. Keep one rest day a week.", "You can add about 10% more next week if you feel good."];
}

// New personal records set during the week: best pace and longest distance, per workout type.
function weekRecords(monday) {
  const before = allWorkouts().filter((w) => w.key < monday), during = weekWorkouts(monday), out = [];
  ["Walk", "Run", "Cycle"].forEach((t) => {
    const b = before.filter((w) => w.type === t), d = during.filter((w) => w.type === t);
    if (!d.length) return;
    const bestBefore = Math.min(...b.map(paceOf).filter(Boolean)), bestNow = Math.min(...d.map(paceOf).filter(Boolean));
    if (isFinite(bestNow) && isFinite(bestBefore) && bestNow < bestBefore) out.push(`${t}: fastest pace ever, ${fmtPace(bestNow)} /km`);
    const farBefore = Math.max(0, ...b.map((w) => w.km || 0)), farNow = Math.max(0, ...d.map((w) => w.km || 0));
    if (b.length && farNow > farBefore) out.push(`${t}: longest ever, ${farNow} km`);
  });
  (state.trophies || []).filter((t) => t.date >= monday && t.date <= addDays(monday, 6)).forEach((t) => out.push(`Race: ${t.name}, ${t.km} km`));
  return out;
}

function makeDigest(monday) {
  const name = state.profile?.name || "friend", sunday = addDays(monday, 6);
  let logged = 0, fat = [], sleeps = [], minutes = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(monday, i), s = dayStats(k);
    if (s.logged) logged++;
    if (state.days[k]?.fatigue) fat.push(state.days[k].fatigue);
    if (s.sleep) sleeps.push(s.sleep);
    minutes += s.minutes;
  }
  const avg = (a) => (a.length ? round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const p = plannedFor(monday), a = actualFor(monday), ratio = loadRatio(monday), fatigue = avg(fat), sleep = avg(sleeps);
  const done = p?.list.length ? p.list.filter((s) => sessionDone(s, state.block?.type || "Run")).length : null;
  const records = weekRecords(monday);
  const nextIdx = state.block ? Math.round((Date.parse(addDays(monday, 7)) - Date.parse(state.block.startKey)) / (7 * 86400000)) : -1;
  const next = state.block?.plan[nextIdx];
  return [
    `Saathi Health — weekly performance review`,
    `${name}, week of ${shortDate(monday)} to ${shortDate(sunday)}`,
    ``,
    `CONSISTENCY`,
    `• Days logged: ${logged} of 7`,
    done !== null ? `• Planned sessions done: ${done} of ${p.list.length}` : `• Workouts: ${a.sessions}`,
    `• Distance: ${a.km} km${p?.km ? ` (plan ${p.km} km)` : ""} · Active time: ${minutes} min`,
    ``,
    `NEW PERSONAL RECORDS`,
    ...(records.length ? records.map((r) => "• " + r) : ["• None this week. Consistency matters more than records!"]),
    ``,
    `HOW YOU FELT`,
    `• Tiredness: ${fatigue ? fatigue + " / 5 on average" : "not logged"} · Sleep: ${sleep ? sleep + " hours a night" : "not logged"}`,
    ratio ? `• Load ratio: ${ratio.toFixed(2)} (safe range 0.8–1.3)` : null,
    ``,
    `RECOVERY PLAN FOR NEXT WEEK`,
    ...recoveryProtocol(fatigue, sleep, ratio).map((r) => "• " + r),
    next ? `\nNEXT WEEK: ${next.focus}, ${round(next.sessions.reduce((x, s) => x + s.km, 0))} km in ${next.sessions.length} sessions.` : null,
    ``,
    `Not medical advice. For pain, dizziness or illness, please see a doctor.`,
  ].filter((l) => l !== null).join("\n");
}

// Runs whenever the app opens: makes last week's digest once, if there was anything logged.
function autoDigest() {
  if (!state.profile) return;
  const lastMon = addDays(mondayOf(dayKey()), -7);
  if ((state.digests || []).some((d) => d.week === lastMon)) return;
  let any = false;
  for (let i = 0; i < 7; i++) if (dayStats(addDays(lastMon, i)).logged) any = true;
  if (!any) return;
  (state.digests ||= []).unshift({ week: lastMon, text: makeDigest(lastMon), created: Date.now() });
  state.digests = state.digests.slice(0, 12);
  save();
  setTimeout(() => toast("📬 Your weekly performance review is ready in the Progress tab."), 800);
}

function renderDigests() {
  const ds = state.digests || [];
  $("digestBox").innerHTML = (ds.length
    ? ds.map((d, i) => `<details ${i === 0 ? "open" : ""}><summary>Week of ${shortDate(d.week)}</summary>
        <pre class="summary">${escapeHtml(d.text)}</pre>
        <div class="row"><button data-email="${i}">✉ Email it to me</button><button data-copy="${i}" class="secondary">Copy</button></div></details>`).join("")
    : `<p class="muted">Every Monday, Saathi writes a review of your last week here automatically.</p>`) +
    `<div class="row"><button id="digestNow" class="secondary">Preview this week's review now</button></div>`;
}
$("digestBox").onclick = async (e) => {
  const t = e.target, ds = state.digests || [];
  if (t.dataset.email) {
    location.href = "mailto:?subject=" + encodeURIComponent("My Saathi weekly performance review") + "&body=" + encodeURIComponent(ds[t.dataset.email].text);
  } else if (t.dataset.copy) {
    try { await navigator.clipboard.writeText(ds[t.dataset.copy].text); toast("Review copied."); } catch { toast("Could not copy."); }
  } else if (t.id === "digestNow") {
    const text = makeDigest(mondayOf(dayKey()));
    $("digestBox").insertAdjacentHTML("afterbegin", `<details open><summary>This week so far (preview)</summary><pre class="summary">${escapeHtml(text)}</pre></details>`);
  }
};
