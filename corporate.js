// Saathi Health for companies (B2B): an HR admin panel to run company-wide challenges and
// see wellness and engagement by department. Employees join by sending their share code
// (Social tab). HR only ever sees department totals, and departments with fewer than
// 3 active people are hidden, so no one can be singled out.
// Uses state, save(), dayKey(), decodeCode(), download(), toast(), escapeHtml(), show(),
// renderHome(), readNumber(), round() and $.

// Estimated steps for the 7 days ending `endOffset` days ago
// (about 1,300 steps per km walked, 1,000 per km run, 100 per minute of walking).
function estSteps(endOffset = 0) {
  let steps = 0;
  for (let i = endOffset; i < endOffset + 7; i++) {
    const d = state.days[dayKey(-i)];
    if (!d) continue;
    d.entries.flatMap((e) => e.items).filter((x) => x.type === "activity").forEach((x) => (steps += (x.minutes || 0) * 100));
    (d.workouts || []).forEach((w) => {
      if (w.type === "Walk" || w.type === "Run") steps += w.km ? w.km * (w.type === "Run" ? 1000 : 1300) : w.minutes * 100;
    });
  }
  return Math.round(steps);
}

const CH_METRICS = {
  steps: { label: "Step challenge", unit: "steps a week", get: (s) => s.steps || 0 },
  min: { label: "Active minutes challenge", unit: "active minutes a week", get: (s) => s.min },
  km: { label: "Distance challenge", unit: "km a week", get: (s) => s.km },
  days: { label: "Consistency challenge", unit: "days logged a week", get: (s) => s.days },
};
const MIN_GROUP = 3; // smallest group HR may see
const isActive = (s) => s.at > Date.now() - 8 * 86400000;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const avgOf = (arr, f) => (arr.length ? arr.reduce((x, s) => x + f(s), 0) / arr.length : 0);

$("adminBtn").onclick = () => { show("admin"); renderAdmin(); };
$("adminClose").onclick = () => renderHome();

// Department-level numbers. Individual snapshots never leave this function.
function deptStats(c) {
  const ch = c.challenge, metric = ch && CH_METRICS[ch.metric];
  const emps = Object.values(c.employees || {});
  return c.depts.map((dept) => {
    const all = emps.filter((e) => e.dept === dept), act = all.map((e) => e.snap).filter(isActive);
    return {
      dept, people: all.length, active: act.length, hidden: act.length < MIN_GROUP,
      minutes: Math.round(avgOf(act, (s) => s.min)),
      stepsDay: Math.round(avgOf(act, (s) => s.steps || 0) / 7),
      days: round(avgOf(act, (s) => s.days)),
      who150: pct(act.filter((s) => s.min >= 150).length, act.length),
      metric: metric ? round(avgOf(act, metric.get)) : null,
      hitTarget: metric ? pct(act.filter((s) => metric.get(s) >= ch.target).length, act.length) : null,
    };
  });
}

function renderAdmin() {
  const c = state.company;
  if (!c) {
    $("adminRoot").innerHTML = `<div class="card"><h2>Set up your company</h2>
      <label>Company name <input id="coName" maxlength="60" placeholder="e.g. Konkan Coastal Foods"></label>
      <label>Departments (comma separated) <input id="coDepts" maxlength="200" placeholder="e.g. Head Office, Plant, Sales, Logistics"></label>
      <div class="row"><button id="coCreate">Create company</button></div></div>`;
    return;
  }
  const emps = Object.values(c.employees || {}), act = emps.map((e) => e.snap).filter(isActive);
  const depts = deptStats(c), ch = c.challenge, metric = ch && CH_METRICS[ch.metric];
  const enough = act.length >= MIN_GROUP;
  const visible = depts.filter((d) => !d.hidden);
  const daysLeft = ch ? Math.max(0, Math.round((Date.parse(ch.end) - Date.parse(dayKey())) / 86400000)) : 0;
  const total = metric ? act.reduce((x, s) => x + metric.get(s), 0) : 0, goal = metric ? ch.target * act.length : 0;
  const best = metric && visible.length ? Math.max(...visible.map((d) => d.metric), 1) : 1;

  $("adminRoot").innerHTML = `
    <div class="card"><h2>${escapeHtml(c.name)}</h2>
      ${enough ? `<div class="tiles">
        <div class="tile"><span class="muted">Enrolled</span><b>${emps.length}</b><span class="muted small">employees</span></div>
        <div class="tile"><span class="muted">Engagement</span><b>${pct(act.length, emps.length)}%</b><span class="muted small">shared data in the last 8 days</span></div>
        <div class="tile"><span class="muted">Active minutes</span><b>${Math.round(avgOf(act, (s) => s.min))}</b><span class="muted small">average per person, per week</span></div>
        <div class="tile"><span class="muted">Meeting 150 min/week</span><b>${pct(act.filter((s) => s.min >= 150).length, act.length)}%</b><span class="muted small">WHO guideline for adults</span></div>
        <div class="tile"><span class="muted">Steps</span><b>${Math.round(avgOf(act, (s) => s.steps || 0) / 7).toLocaleString("en-IN")}</b><span class="muted small">average per day (estimated)</span></div>
        <div class="tile"><span class="muted">Days logged</span><b>${round(avgOf(act, (s) => s.days))} <small>/ 7</small></b><span class="muted small">average consistency</span></div>
      </div>` : `<p class="muted">Company numbers appear once at least ${MIN_GROUP} employees have shared data. ${emps.length} enrolled so far.</p>`}
    </div>

    <div class="card"><h2>Company challenge</h2>
      ${ch ? `<p><b>${escapeHtml(ch.name)}</b> · ${CH_METRICS[ch.metric].label}<br>
          <span class="muted">${ch.start} to ${ch.end} · ${daysLeft} days left · target ${ch.target.toLocaleString("en-IN")} ${CH_METRICS[ch.metric].unit} per person</span></p>
        ${enough ? `<p>Company total this week: <b>${Math.round(total).toLocaleString("en-IN")}</b> of ${Math.round(goal).toLocaleString("en-IN")}</p>
          <div class="meter big"><div style="width:${Math.min(100, pct(total, goal))}%"></div></div>
          <p class="muted">${pct(act.filter((s) => metric.get(s) >= ch.target).length, act.length)}% of active employees hit the target this week.</p>
          <h3 class="drill">Department ranking</h3>
          <div class="hbars">${visible.sort((a, b) => b.metric - a.metric).map((d, i) =>
            `<div class="hbar"><span class="lbl">${i === 0 ? "🏆 " : ""}${escapeHtml(d.dept)}</span><span class="track"><span style="width:${pct(d.metric, best)}%"></span></span><span class="val">${d.metric.toLocaleString("en-IN", { maximumFractionDigits: ch.metric === "km" || ch.metric === "days" ? 1 : 0 })}</span></div>`).join("") ||
            `<p class="muted">No department has ${MIN_GROUP}+ active people yet.</p>`}</div>
          <p class="muted small">Average ${CH_METRICS[ch.metric].unit} per active person. Departments with fewer than ${MIN_GROUP} active people are not shown.</p>` : ""}
        <div class="row"><button id="chEnd" class="secondary">End challenge</button></div>`
      : `<p class="muted">Start a company-wide challenge. Everyone's weekly numbers count toward their department.</p>
        <label>Challenge name <input id="chName" maxlength="60" placeholder="e.g. November Step-Up"></label>
        <div class="grid3">
          <label>Type <select id="chMetric"><option value="steps">Steps</option><option value="min">Active minutes</option><option value="km">Distance (km)</option><option value="days">Consistency (days)</option></select></label>
          <label>Weekly target per person <input id="chTarget" type="number" min="1" placeholder="e.g. 50000"></label>
          <label>Ends on <input id="chEndDate" type="date" min="${dayKey()}"></label>
        </div>
        <div class="row"><button id="chStart">Start challenge</button></div>`}
    </div>

    <div class="card"><h2>Departments</h2>
      <table class="table"><tr><th>Department</th><th>Active</th><th>Avg min/week</th><th>Steps/day</th><th>Days /7</th><th>150+ min</th>${ch ? "<th>Hit target</th>" : ""}</tr>
        ${depts.map((d) => d.hidden
          ? `<tr class="muted"><td>${escapeHtml(d.dept)}</td><td>${d.active} of ${d.people}</td><td colspan="${ch ? 5 : 4}">Hidden for privacy (fewer than ${MIN_GROUP} active)</td></tr>`
          : `<tr><td>${escapeHtml(d.dept)}</td><td>${d.active} of ${d.people}</td><td>${d.minutes}</td><td>${d.stepsDay.toLocaleString("en-IN")}</td><td>${d.days}</td><td>${d.who150}%</td>${ch ? `<td>${d.hitTarget}%</td>` : ""}</tr>`).join("")}
      </table>
      <div class="row"><button id="coCsv" class="secondary">⬇ Download department report (CSV)</button></div>
    </div>

    <div class="card"><h2>Add employees</h2>
      <p class="muted">Ask employees to tap <b>Social → Make my code</b> and send it to HR. Paste one per line as <code>Department: code</code>. Departments: ${c.depts.map(escapeHtml).join(", ")}.</p>
      <textarea id="coCodes" rows="4" placeholder="Plant: SAATHI1:eyJ2Ijox…"></textarea>
      <p id="coResult" class="muted small"></p>
      <div class="row"><button id="coAdd">Add / update employees</button>
        <button id="coSample" class="secondary">Add 20 sample employees</button>
        <button id="coDelete" class="danger">Delete company</button></div>
    </div>`;
}

$("adminRoot").onclick = (e) => {
  const id = e.target.id, c = state.company;
  if (id === "coCreate") {
    const name = $("coName").value.trim();
    const depts = [...new Set($("coDepts").value.split(",").map((d) => d.trim()).filter(Boolean))].slice(0, 20);
    if (!name || !depts.length) return toast("Please enter a company name and at least one department.");
    state.company = { name, depts, employees: {}, challenge: null };
  } else if (id === "coAdd") {
    const lines = $("coCodes").value.split("\n").map((l) => l.trim()).filter(Boolean), msgs = [];
    let added = 0;
    lines.forEach((line, i) => {
      const m = line.match(/^(?:([^:]{1,40}?)\s*:\s*)?(SAATHI1:\S+)$/);
      const dept = m?.[1] && c.depts.find((d) => d.toLowerCase() === m[1].toLowerCase());
      if (!m) return msgs.push(`Line ${i + 1}: no share code found.`);
      if (!dept) return msgs.push(`Line ${i + 1}: unknown department "${m[1] || "(none)"}".`);
      try {
        const snap = decodeCode(m[2]);
        c.employees[snap.n.toLowerCase() + "|" + dept] = { dept, snap };
        added++;
      } catch { msgs.push(`Line ${i + 1}: the code is broken.`); }
    });
    save();
    renderAdmin();
    $("coResult").textContent = `${added} employee${added === 1 ? "" : "s"} added or updated. ` + msgs.join(" ");
    return;
  } else if (id === "coSample") {
    // Made-up employees with a fixed seed, so the demo looks the same every time.
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 1; i <= 20; i++) {
      const dept = c.depts[i % c.depts.length], min = Math.round(40 + rnd() * 220);
      c.employees[`sample ${i}|${dept}`] = {
        dept,
        snap: { n: `Sample ${i}`, km: round(rnd() * 25), min, days: Math.min(7, Math.round(1 + rnd() * 6)), streak: Math.round(rnd() * 12),
          steps: Math.round(min * 110 + rnd() * 15000), r: [], rt: "", at: Date.now() - Math.round(rnd() * 5) * 86400000 },
      };
    }
  } else if (id === "coDelete") {
    if (!confirm("Delete the company, its challenge and all employee data from this device?")) return;
    state.company = null;
  } else if (id === "chStart") {
    const name = $("chName").value.trim(), target = readNumber("chTarget", 1, 1000000), end = $("chEndDate").value;
    if (!name || !target || Number.isNaN(target) || !end || end < dayKey()) return toast("Please fill in a name, a target and an end date in the future.");
    c.challenge = { name, metric: $("chMetric").value, target, start: dayKey(), end };
  } else if (id === "chEnd") {
    if (!confirm("End this challenge?")) return;
    c.challenge = null;
  } else if (id === "coCsv") {
    const rows = deptStats(c).map((d) => d.hidden
      ? [d.dept, d.people, d.active, "hidden", "", "", "", ""]
      : [d.dept, d.people, d.active, d.minutes, d.stepsDay, d.days, d.who150, d.hitTarget ?? ""]);
    download(`${c.name.replace(/\W+/g, "-").toLowerCase()}-wellness-${dayKey()}.csv`,
      toCsv([["department", "enrolled", "active", "avg_active_min_week", "avg_steps_day", "avg_days_logged", "pct_150_min", "pct_hit_challenge_target"], ...rows]), "text/csv");
    return;
  } else return;
  save();
  renderAdmin();
};
