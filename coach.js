// Saathi Health AI coach: a chat that reads the user's last two weeks of numbers and
// suggests rest days, training changes and food tips. Uses Gemini if a key is set in
// Settings, otherwise built-in rules. Safety checks always run first, in plain code.
// Uses state, save(), dayKey(), dayStats(), weekValue(), allWorkouts(), bestPace(),
// fmtPace(), streaks(), redFlag(), RED_FLAG_MSG, GOALS, escapeHtml() and $.

const MEDICINE = /(medicine|medication|tablet|pill|dawai|dava|dose|dosage|insulin|metformin|supplement|steroid|painkiller)/i;
const MEDICINE_MSG = "I can't advise on medicines, supplements or doses. Please ask your doctor or pharmacist.";

// The numbers the coach looks at. Only these go to the AI: no name, PIN or notes.
function coachMetrics() {
  const days = [];
  for (let i = 6; i >= 0; i--) days.push({ day: dayKey(-i), ...dayStats(dayKey(-i)) });
  const thisMin = weekValue("minutes", 0), lastMin = weekValue("minutes", 7);
  let activeRun = 0;
  while (activeRun < 60 && dayStats(dayKey(-activeRun)).minutes > 0) activeRun++;
  const sleeps = days.map((d) => d.sleep).filter((v) => v > 0);
  const recent = allWorkouts().sort((a, b) => (b.key + b.at).localeCompare(a.key + a.at)).slice(0, 5);
  return {
    goal: GOALS[state.profile?.goal] || GOALS.sugar,
    age: state.profile?.age || null,
    days,
    thisMin, lastMin,
    jump: lastMin ? (thisMin - lastMin) / lastMin : 0,
    thisKm: weekValue("km", 0), lastKm: weekValue("km", 7),
    activeRun,
    sleepAvg: sleeps.length ? Math.round((sleeps.reduce((a, b) => a + b, 0) / sleeps.length) * 10) / 10 : null,
    streak: streaks().current,
    bestRun: bestPace("Run"), bestWalk: bestPace("Walk"),
    recent: recent.map((w) => ({ day: w.key, type: w.type, km: w.km, minutes: w.minutes })),
  };
}

// Decides whether a rest day is needed, and why.
function recoveryAdvice(m) {
  const why = [];
  if (m.activeRun >= 4) why.push(`you've been active ${m.activeRun} days in a row`);
  if (m.jump > 0.3 && m.lastMin >= 60) why.push(`your active time is up ${Math.round(m.jump * 100)}% on last week`);
  if (m.sleepAvg && m.sleepAvg < 6) why.push(`you're sleeping only about ${m.sleepAvg} hours`);
  if (why.length) {
    return { rest: true, text: `Take a rest day tomorrow: ${why.join(", ")}. Gentle stretching or a slow 10-minute walk is fine.` };
  }
  if (m.thisMin < 60) {
    return { rest: false, text: `No rest needed. You've done ${m.thisMin} active minutes this week, so a 20-minute easy walk today would help.` };
  }
  return { rest: false, text: "You look well balanced. One easy or rest day this week is enough." };
}

function trainingAdvice(m) {
  // The "10% rule": grow weekly time slowly to avoid injury.
  const target = m.thisMin ? Math.round((m.thisMin * 1.1) / 5) * 5 : 60;
  let text = m.thisMin >= 150
    ? `You've hit the 150-minute weekly guideline (${m.thisMin} min). Keep it there and make one session a little faster.`
    : `Next week, aim for about ${target} active minutes (10% more than this week). Increase slowly to avoid injury.`;
  if (m.bestRun) {
    text += ` Run most days at an easy, chatty pace (about ${fmtPace(m.bestRun + 1)}–${fmtPace(m.bestRun + 1.5)} /km) and only one day near your best (${fmtPace(m.bestRun)} /km).`;
  }
  return text;
}

const FOOD_TIPS = [
  [/poha|upma/, "Poha is fine for breakfast. Add peanuts or sprouts and vegetables so it fills you up and keeps sugar steadier."],
  [/rice|chawal|bhaat/, "Rice is fine in a smaller portion: fill half the plate with vegetables, a quarter with dal or fish, and a quarter with rice."],
  [/roti|chapati|bhakri/, "Roti with dal and sabzi is a good balanced meal. Two medium rotis is a sensible portion for most adults."],
  [/mango|banana|fruit/, "Whole fruit is better than juice. One fruit at a time, ideally with a few nuts, is a good snack."],
  [/sweet|mithai|dessert|jalebi|laddoo|cake/, "Sweets are okay now and then. Have a small piece after a meal rather than on an empty stomach."],
  [/chai|tea|coffee/, "Try chai with less sugar. Cutting one spoon a day makes a real difference over a month."],
  [/fish|egg|chicken|paneer|protein|dal/, "Good protein sources: dal, eggs, fish, paneer, curd, sprouts and chana. Try to have some at every meal."],
  [/after.*(walk|run|workout)|recover/, "After a workout: water first, then a snack with protein and some carbs within an hour, like curd with fruit, an egg with roti, or a bowl of dal-rice."],
  [/before.*(walk|run|workout)/, "Before a workout: something light 1–2 hours earlier, like a banana or a slice of toast. Avoid heavy fried food."],
  [/water|drink|hydrat/, "Aim for about 8 glasses of water a day, plus a glass before and after exercise, and more on hot days."],
];

// Rule-based coach for demo mode (and when the AI call fails).
function coachDemo(q, m) {
  const t = q.toLowerCase();
  if (/(\brest\b|tired|sore|recover|thak|exhaust|\bbreak\b|day off)/.test(t)) {
    let text = recoveryAdvice(m).text;
    if (/(pain|injur|swell)/.test(t)) text += " If you have sharp pain or swelling, rest it and see a doctor.";
    return text;
  }
  if (/(faster|pace|train|workout plan|5k|10k|half marathon|marathon|improve|increase|run more|walk more)/.test(t)) return trainingAdvice(m);
  const food = FOOD_TIPS.find(([re]) => re.test(t));
  if (food) {
    return food[1] + (state.profile?.goal === "sugar" ? " For sugar control, pair carbs with protein or fibre, and take a short walk after meals." : "");
  }
  if (/(eat|food|diet|meal|breakfast|lunch|dinner|snack|khana|nashta|nutrition|carb)/.test(t)) {
    return "A simple plate: half vegetables, a quarter dal, egg or fish, and a quarter roti or rice. Eat slowly, and stop when you're about 80% full.";
  }
  if (/(how am i|progress|doing|this week|summary|stats)/.test(t)) {
    const change = m.lastMin ? ` (${m.thisMin >= m.lastMin ? "up" : "down"} from ${m.lastMin} last week)` : "";
    return `This week: ${m.thisMin} active minutes${change}, ${m.thisKm} km` +
      (m.sleepAvg ? `, about ${m.sleepAvg} hours of sleep a night` : "") +
      `, and a ${m.streak}-day streak. ${recoveryAdvice(m).rest ? "Plan a rest day soon." : "Keep going!"}`;
  }
  return "I can help with rest days, training, food, or how your week is going. Try one of the buttons below.";
}

async function coachAI(q, m) {
  const history = (state.chat || []).slice(-6).map((c) => `${c.who === "me" ? "User" : "Coach"}: ${c.text}`).join("\n");
  const prompt = `You are Saathi Coach, a kind fitness and wellness coach for an Indian adult whose goal is to ${m.goal}.
Their data (made up by the user, last 7 days and totals): ${JSON.stringify(m)}
Recent chat:
${history}
User: """${q}"""
Reply in at most 3 short sentences of plain English (Hinglish is fine if the user writes Hinglish). Use their actual numbers.
Suggest a rest day if they have trained 4+ days in a row, jumped more than 30% over last week, or sleep under 6 hours.
Never diagnose, never name medicines, supplements or doses, never promise results. For pain, dizziness or illness, tell them to see a doctor.`;
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(state.key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }),
    }
  );
  if (!res.ok) throw new Error("Gemini error " + res.status);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

async function askCoach(q) {
  q = q.trim();
  if (!q) return;
  const chat = (state.chat ||= []);
  chat.push({ who: "me", text: q });
  $("chatInput").value = "";
  renderChat(true);

  let text, mode = "rules";
  if (redFlag(q)) text = RED_FLAG_MSG; // safety first, never sent to the AI
  else if (MEDICINE.test(q)) text = MEDICINE_MSG;
  else {
    const m = coachMetrics();
    if (state.key) {
      try { text = await coachAI(q, m); mode = "ai"; } catch (e) { console.warn(e); }
    }
    if (!text) text = coachDemo(q, m);
  }
  chat.push({ who: "coach", text, mode });
  state.chat = chat.slice(-30);
  save();
  renderChat();
  return text;
}

function renderChat(thinking) {
  const chat = state.chat || [];
  $("chatLog").innerHTML = (chat.length ? "" : `<p class="muted">Hi${state.profile?.name ? " " + escapeHtml(state.profile.name) : ""}! I've looked at your week. Ask me anything about rest, training or food.</p>`) +
    chat.map((c) => `<div class="msg ${c.who}">${escapeHtml(c.text)}${c.who === "coach" ? `<span class="by">${c.mode === "ai" ? "Gemini AI" : "Saathi rules"}</span>` : ""}</div>`).join("") +
    (thinking ? `<div class="msg coach muted">Thinking…</div>` : "");
  $("chatLog").scrollTop = $("chatLog").scrollHeight;
}

// The proactive part: a check-in written from this week's numbers, without being asked.
function renderCoach() {
  const m = coachMetrics(), r = recoveryAdvice(m);
  $("coachCheckin").innerHTML =
    `<p>${r.rest ? "🛌" : "✅"} ${escapeHtml(r.text)}</p><p>🎯 ${escapeHtml(trainingAdvice(m))}</p>`;
  renderChat();
}

const COACH_CHIPS = ["How am I doing this week?", "Should I take a rest day?", "How can I run faster?", "What should I eat after a walk?", "Is poha good for sugar?"];
$("coachChips").innerHTML = COACH_CHIPS.map((c) => `<button>${c}</button>`).join("");
$("coachChips").onclick = (e) => { if (e.target.tagName === "BUTTON") askCoach(e.target.textContent); };
$("chatSend").onclick = () => askCoach($("chatInput").value);
$("chatInput").onkeydown = (e) => { if (e.key === "Enter") askCoach($("chatInput").value); };
$("chatClear").onclick = () => { state.chat = []; save(); renderChat(); };
