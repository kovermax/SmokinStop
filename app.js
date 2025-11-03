// === CONSTANTS ===
const TIPS = [
  "Пей воду!",
  "Займись спортом на 10 мин",
  "Позвони другу",
  "Прогулка на воздухе",
  "Жвачка без сахара",
  "Через 3-4 дня тяга ослабляется!",
  "Каждый день - победа!",
  "Медленное дыхание 5 раз",
  "Организм восстанавливается",
  "Ты справишься!"
];

const ACHIEVEMENTS = [
  { id: 1, name: "Первый шаг", desc: "1 день", icon: "👣", unlocked: false },
  { id: 2, name: "Неделя!", desc: "7 дней", icon: "📅", unlocked: false },
  { id: 3, name: "Месяц!", desc: "30 дней", icon: "🎉", unlocked: false },
  { id: 4, name: "Два!", desc: "60 дней", icon: "💪", unlocked: false },
  { id: 5, name: "Верность", desc: "5 дн", icon: "✅", unlocked: false },
  { id: 6, name: "Богач", desc: "1000 ₽", icon: "💰", unlocked: false }
];

// === STATE ===
let state = {
  smokeEvents: [],
  minIntervalMinutes: 45,
  dailyLimit: 5,
  cigPrice: 200,
  lastSmokeTime: null,
  onboardingComplete: false,
  achievements: ACHIEVEMENTS.map(a => ({ ...a })),
  plan: 30  // ВСЕГДА 30 ДНЕЙ - БЕЗ ВЫБОРА
};

let currentCalendarDate = new Date();
let selectedReason = null;
let currentStep = 1;

// === STORAGE ===
function loadState() {
  const stored = localStorage.getItem("quitSmoking_v1");
  if (!stored) return;
  try {
    const p = JSON.parse(stored);
    state.smokeEvents = (p.smokeEvents || []).map(e => ({
      timestamp: new Date(e.timestamp),
      reason: e.reason || "Без причины"
    }));
    state.minIntervalMinutes = p.minIntervalMinutes ?? 45;
    state.dailyLimit = p.dailyLimit ?? 5;
    state.cigPrice = p.cigPrice ?? 200;
    state.onboardingComplete = p.onboardingComplete ?? false;
    state.achievements = p.achievements || ACHIEVEMENTS.map(a => ({ ...a }));
    state.plan = p.plan ?? 30;
    state.lastSmokeTime = p.lastSmokeTime ? new Date(p.lastSmokeTime) : null;
  } catch (e) {
    console.error("Load error", e);
  }
}

function saveState() {
  localStorage.setItem("quitSmoking_v1", JSON.stringify({
    smokeEvents: state.smokeEvents.map(e => ({ timestamp: e.timestamp.toISOString(), reason: e.reason })),
    minIntervalMinutes: state.minIntervalMinutes,
    dailyLimit: state.dailyLimit,
    cigPrice: state.cigPrice,
    onboardingComplete: state.onboardingComplete,
    achievements: state.achievements,
    lastSmokeTime: state.lastSmokeTime ? state.lastSmokeTime.toISOString() : null,
    plan: state.plan
  }));
}

// === TELEGRAM ===
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// === ONBOARDING ===
const nextBtn = document.getElementById("nextOnboardingBtn");
nextBtn.addEventListener("click", () => {
  if (currentStep === 1) {
    state.dailyLimit = parseInt(document.getElementById("dailyLimitInput").value, 10) || 5;
    document.getElementById("step1").style.display = "none";
    document.getElementById("step2").style.display = "block";
    currentStep = 2;
    return;
  }
  if (currentStep === 2) {
    state.minIntervalMinutes = parseInt(document.getElementById("minIntervalInput").value, 10) || 45;
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "block";
    currentStep = 3;
    return;
  }
  if (currentStep === 3) {
    state.cigPrice = parseInt(document.getElementById("cigPriceInput").value, 10) || 200;
    // ПРОПУСКАЕМ ШАГ 4 С ВЫБОРОМ ПЛАНА
    // СРАЗУ ЗАВЕРШАЕМ ОНБОРДИНГ
    state.plan = 30;  // ВСЕГДА 30 ДНЕЙ
    state.onboardingComplete = true;
    saveState();
    document.getElementById("onboardingScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";
    currentCalendarDate = new Date();
    renderCalendar();
    renderWeeklyChart();
    showTip();
    updateUI();
    return;
  }
});

// === TABS ===
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabName = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    btn.classList.add("active");
    if (tabName === "history") {
      currentCalendarDate = new Date();
      renderCalendar();
      renderWeeklyChart();
    }
    if (tabName === "achievements") {
      renderAchievements();
    }
  });
});

// === TIPS ===
function showTip() {
  if (Math.random() > 0.4) {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    document.getElementById("tipText").textContent = tip;
    document.getElementById("tipCard").style.display = "flex";
  }
}

// === MODAL ===
const reasonModal = document.getElementById("reasonModal");
const reasonButtons = document.querySelectorAll(".reason-btn");

reasonButtons.forEach(b => {
  b.addEventListener("click", () => {
    reasonButtons.forEach(x => x.classList.remove("selected"));
    b.classList.add("selected");
    selectedReason = b.getAttribute("data-reason");
    document.getElementById("reasonInput").value = selectedReason;
  });
});

document.getElementById("cancelReasonBtn").addEventListener("click", () => {
  reasonModal.classList.remove("active");
});

document.getElementById("confirmReasonBtn").addEventListener("click", () => {
  const now = new Date();
  state.smokeEvents.push({
    timestamp: now,
    reason: selectedReason || document.getElementById("reasonInput").value || "Без причины"
  });
  state.lastSmokeTime = now;
  saveState();
  updateUI();
  reasonModal.classList.remove("active");
});

// === SMOKE BUTTON ===
document.getElementById("smokeBtn").addEventListener("click", () => {
  const now = new Date();
  if (state.lastSmokeTime) {
    const diffMin = (now - state.lastSmokeTime) / (1000 * 60);
    if (diffMin < state.minIntervalMinutes) {
      selectedReason = null;
      document.getElementById("reasonInput").value = "";
      reasonButtons.forEach(b => b.classList.remove("selected"));
      reasonModal.classList.add("active");
      return;
    }
  }
  state.smokeEvents.push({ timestamp: now, reason: "По графику" });
  state.lastSmokeTime = now;
  saveState();
  updateUI();
});

// === SETTINGS ===
document.getElementById("editIntervalBtn").addEventListener("click", () => {
  const v = prompt("Интервал (мин):", state.minIntervalMinutes);
  if (v && !isNaN(v)) {
    state.minIntervalMinutes = parseInt(v, 10);
    saveState();
    updateUI();
  }
});

document.getElementById("editLimitBtn").addEventListener("click", () => {
  const v = prompt("Дневной лимит:", state.dailyLimit);
  if (v && !isNaN(v)) {
    state.dailyLimit = parseInt(v, 10);
    saveState();
    updateUI();
  }
});

document.getElementById("editPriceBtn").addEventListener("click", () => {
  const v = prompt("Цена пачки (₽):", state.cigPrice);
  if (v && !isNaN(v)) {
    state.cigPrice = parseInt(v, 10);
    saveState();
    updateUI();
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Удалить все данные?")) {
    localStorage.removeItem("quitSmoking_v1");
    location.reload();
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smoking-tracker-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
});

// === UTILS ===
function getDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isSameDay(a, b) {
  return getDateString(a) === getDateString(b);
}

function eventsFor(date) {
  return state.smokeEvents.filter(e => isSameDay(e.timestamp, date));
}

function dayStats(date) {
  const c = eventsFor(date).length;
  return { count: c, isSuccess: c <= state.dailyLimit };
}

// === CALENDAR ===
function renderCalendar() {
  const y = currentCalendarDate.getFullYear();
  const m = currentCalendarDate.getMonth();
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];
  document.getElementById("calendarMonthYear").textContent = `${months[m]} ${y}`;

  const firstDay = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const dimPrev = new Date(y, m, 0).getDate();
  const cont = document.getElementById("calendarDays");
  cont.innerHTML = "";

  for (let i = firstDay === 0 ? 6 : firstDay - 1; i > 0; i--) {
    const el = document.createElement("div");
    el.className = "day other-month";
    el.textContent = dimPrev - i + 1;
    cont.appendChild(el);
  }

  const today = new Date();
  for (let d = 1; d <= dim; d++) {
    const date = new Date(y, m, d);
    const el = document.createElement("div");
    el.className = "day";
    el.textContent = d;
    const { count, isSuccess } = dayStats(date);
    if (count > 0) el.classList.add(isSuccess ? "success" : "danger");
    if (isSameDay(date, today)) el.classList.add("selected");
    el.addEventListener("click", () => renderDateDetails(date, eventsFor(date)));
    cont.appendChild(el);
  }

  const total = cont.children.length;
  for (let d = 1; d <= 42 - total; d++) {
    const el = document.createElement("div");
    el.className = "day other-month";
    el.textContent = d;
    cont.appendChild(el);
  }
}

function renderDateDetails(date, events) {
  const c = document.getElementById("selectedDateSmokes");
  const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
  const { count, isSuccess } = dayStats(date);
  let html = `<div class="smokes-list"><div class="smokes-list-title">${dateStr}</div>`;
  if (count === 0) {
    html += `<div class="empty-state">Лимит выполнен ✅</div>`;
  } else {
    html += `<div class="empty-state">${count}/${state.dailyLimit} ${isSuccess ? "✅" : "⚠️"}</div>`;
    events.forEach((e, i) => {
      const t = e.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      let itv = "";
      if (i > 0) {
        const diff = Math.round((e.timestamp - events[i - 1].timestamp) / (1000 * 60));
        itv = ` (+${diff})`;
      }
      html += `<div class="smoke-item"><div class="smoke-item-time">${t}${itv}</div><div class="smoke-item-reason">📝 ${e.reason || "Без причины"}</div></div>`;
    });
  }
  html += `</div>`;
  c.innerHTML = html;
}

function renderWeeklyChart() {
  const chart = document.getElementById("weeklyChart");
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const today = new Date();
  let html = "";
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const cnt = eventsFor(d).length;
    const name = days[(d.getDay() + 6) % 7];
    const perc = Math.max(4, Math.min(100, (cnt / state.dailyLimit) * 100));
    const color = cnt <= state.dailyLimit ? "#2e7d32" : "#c62828";
    html += `<div class="chart-bar-container"><div class="chart-bar" style="height:${perc}%;background:${color};"></div><div class="chart-label">${name}</div><div class="chart-value">${cnt}</div></div>`;
  }
  chart.innerHTML = html;
}

// === TIMER ===
function updateTimer() {
  if (!state.lastSmokeTime) {
    document.getElementById("timerDisplay").textContent = "00:00";
    return;
  }
  const now = new Date();
  const since = (now - state.lastSmokeTime) / (1000 * 60);
  if (since >= state.minIntervalMinutes) {
    document.getElementById("timerDisplay").textContent = "00:00";
    return;
  }
  const next = new Date(state.lastSmokeTime.getTime() + state.minIntervalMinutes * 60 * 1000);
  const rem = Math.max(0, (next - now) / 1000);
  const m = Math.floor(rem / 60);
  const s = Math.floor(rem % 60);
  document.getElementById("timerDisplay").textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getCleanDays() {
  const today = new Date();
  if (state.smokeEvents.length === 0) return 0;
  const last = new Date(state.smokeEvents[state.smokeEvents.length - 1].timestamp);
  return Math.floor((today - last) / (1000 * 60 * 60 * 24));
}

// === UI UPDATE ===
function updateUI() {
  const today = new Date();
  const todayEvents = eventsFor(today);
  const moneySaved = Math.floor(state.smokeEvents.length * (state.cigPrice / 20));
  const daysClean = getCleanDays();

  document.getElementById("moneySaved").textContent = `${moneySaved} ₽`;
  document.getElementById("cigsSaved").textContent = `${state.smokeEvents.length} шт`;
  document.getElementById("daysClean").textContent = daysClean;
  document.getElementById("todayCount").textContent = todayEvents.length;

  const weekCount = state.smokeEvents.filter(
    e => (today - new Date(e.timestamp)) / (1000 * 60 * 60 * 24) < 7
  ).length;
  document.getElementById("weekAvg").textContent = Math.round(weekCount / 7);

  const perc = Math.min(100, (todayEvents.length / state.dailyLimit) * 100);
  document.getElementById("progressFill").style.width = `${perc}%`;
  document.getElementById("progressCount").textContent = todayEvents.length;
  document.getElementById("progressLimit").textContent = state.dailyLimit;
  document.getElementById("progressStatus").textContent =
    todayEvents.length <= state.dailyLimit ? "✅ В пределах" : "⚠️ Превышен!";

  const smokeBtn = document.getElementById("smokeBtn");
  const statusBadge = document.getElementById("statusBadge");
  let disabled = false;
  let cls = "status-allowed";
  let txt = "✓ Можно курить";

  if (state.lastSmokeTime) {
    const since = (today - state.lastSmokeTime) / (1000 * 60);
    if (since < state.minIntervalMinutes) {
      disabled = true;
      const rem = Math.ceil(state.minIntervalMinutes - since);
      if (rem > 5) {
        cls = "status-wait";
        txt = `⏳ ${rem} мин`;
      } else {
        cls = "status-soon";
        txt = `⏱️ ${rem} мин`;
      }
    }
  }

  smokeBtn.disabled = disabled;
  statusBadge.className = `status-badge ${cls}`;
  statusBadge.textContent = txt;

  const todayList = document.getElementById("todayList");
  todayList.innerHTML =
    todayEvents.length === 0
      ? '<div class="empty-state">Нет записей 🎉</div>'
      : todayEvents
        .map((e, i) => {
          const t = e.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
          let itv = "";
          if (i > 0) {
            const diff = Math.round((e.timestamp - todayEvents[i - 1].timestamp) / (1000 * 60));
            itv = ` (+${diff})`;
          }
          return `<div class="smoke-item"><div class="smoke-item-time">${t}${itv}</div><div class="smoke-item-reason">📝 ${e.reason || "Без причины"}</div></div>`;
        })
        .join("");

  document.getElementById("currentLimitDisplay").textContent = state.dailyLimit;
  document.getElementById("currentIntervalDisplay").textContent = state.minIntervalMinutes;
  document.getElementById("currentPriceDisplay").textContent = state.cigPrice;
  document.getElementById("totalSmokes").textContent = state.smokeEvents.length;

  if (state.smokeEvents.length > 0) {
    const first = new Date(state.smokeEvents[0].timestamp);
    const last = new Date(state.smokeEvents[state.smokeEvents.length - 1].timestamp);
    const span = Math.max(1, Math.floor((last - first) / (1000 * 60 * 60 * 24))) + 1;
    document.getElementById("avgDay").textContent = Math.round(state.smokeEvents.length / span);
  } else {
    document.getElementById("avgDay").textContent = "0";
  }

  saveState();
}

function renderAchievements() {
  const container = document.getElementById("achievementsContainer");
  const daysClean = getCleanDays();
  const moneySaved = Math.floor(state.smokeEvents.length * (state.cigPrice / 20));

  state.achievements.forEach(a => {
    if (a.id === 1 && daysClean >= 1) a.unlocked = true;
    if (a.id === 2 && daysClean >= 7) a.unlocked = true;
    if (a.id === 3 && daysClean >= 30) a.unlocked = true;
    if (a.id === 4 && daysClean >= 60) a.unlocked = true;
    if (a.id === 6 && moneySaved >= 1000) a.unlocked = true;
  });

  let html = "";
  state.achievements.forEach(a => {
    html += `<div class="achievement-card ${a.unlocked ? "unlocked" : "locked"}">
      <div class="achievement-icon">${a.icon}</div>
      <div class="achievement-name">${a.name}</div>
      <div class="achievement-desc">${a.desc}</div>
    </div>`;
  });

  container.innerHTML = html;
}

// === MONTH NAV ===
document.getElementById("prevMonthBtn").addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonthBtn").addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendar();
});

// === INIT ===
loadState();
if (state.onboardingComplete) {
  document.getElementById("onboardingScreen").style.display = "none";
  document.getElementById("appScreen").style.display = "block";
  currentCalendarDate = new Date();
  renderCalendar();
  renderWeeklyChart();
  showTip();
}
updateUI();
setInterval(updateTimer, 1000);
setInterval(updateUI, 10000);
