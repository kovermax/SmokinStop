Telegram.WebApp.ready();
Telegram.WebApp.expand();

// ========== ДАННЫЕ ==========
let app = {
  smokes: [],
  limit: 10,
  interval: 45,
  price: 200,
  lastSmoke: null,
  done: false
};

let step = 1;
let calDate = new Date();
let modal = null;

// ========== СОХРАНЕНИЕ ==========
function save() {
  localStorage.setItem("app", JSON.stringify({
    smokes: app.smokes.map(s => ({time: s.time.toISOString(), reason: s.reason})),
    limit: app.limit,
    interval: app.interval,
    price: app.price,
    lastSmoke: app.lastSmoke ? app.lastSmoke.toISOString() : null,
    done: app.done
  }));
}

function load() {
  const d = localStorage.getItem("app");
  if (!d) return;
  try {
    const p = JSON.parse(d);
    app.smokes = (p.smokes||[]).map(s => ({time: new Date(s.time), reason: s.reason||""}));
    app.limit = p.limit || 10;
    app.interval = p.interval || 45;
    app.price = p.price || 200;
    app.lastSmoke = p.lastSmoke ? new Date(p.lastSmoke) : null;
    app.done = p.done || false;
  } catch(e) {}
}

// ========== ОНБОРДИНГ ==========
document.getElementById("onb-next-btn").addEventListener("click", function() {
  if (step == 1) {
    const v = parseInt(document.getElementById("onb-input-1").value);
    if (isNaN(v) || v < 1) return;
    app.limit = v;
    document.getElementById("onb-step-1").style.display = "none";
    document.getElementById("onb-step-2").style.display = "block";
    step = 2;
    return;
  }
  
  if (step == 2) {
    const v = parseInt(document.getElementById("onb-input-2").value);
    if (isNaN(v) || v < 1) return;
    app.interval = v;
    document.getElementById("onb-step-2").style.display = "none";
    document.getElementById("onb-step-3").style.display = "block";
    step = 3;
    return;
  }
  
  if (step == 3) {
    const v = parseInt(document.getElementById("onb-input-3").value);
    if (isNaN(v) || v < 1) return;
    app.price = v;
    app.done = true;
    save();
    document.getElementById("onboarding").style.display = "none";
    document.getElementById("app-screen").style.display = "block";
    init();
  }
});

// ========== ТАБЫ ==========
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    const idx = this.getAttribute("data-idx");
    document.querySelectorAll(".tab-view").forEach(v => v.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-view")[idx].style.display = "block";
    this.classList.add("active");
    if (idx == 1) {chart(); cal();}
    if (idx == 2) ach();
  });
});

// ========== СМОГ ==========
document.getElementById("smoke-btn").addEventListener("click", function() {
  const now = new Date();
  if (app.lastSmoke) {
    const diff = (now - app.lastSmoke) / (1000*60);
    if (diff < app.interval) {
      showModal();
      return;
    }
  }
  app.smokes.push({time: now, reason: ""});
  app.lastSmoke = now;
  save();
  update();
});

// ========== МОДАЛЬ ==========
document.querySelectorAll(".reason-btn").forEach(b => {
  b.addEventListener("click", function() {
    document.querySelectorAll(".reason-btn").forEach(x => x.classList.remove("selected"));
    this.classList.add("selected");
    modal = this.getAttribute("data-reason");
    document.getElementById("reason-text").value = modal;
  });
});

document.getElementById("modal-cancel").addEventListener("click", function() {
  document.getElementById("modal-reason").style.display = "none";
});

document.getElementById("modal-confirm").addEventListener("click", function() {
  const reason = modal || document.getElementById("reason-text").value || "";
  app.smokes.push({time: new Date(), reason});
  app.lastSmoke = new Date();
  save();
  update();
  document.getElementById("modal-reason").style.display = "none";
});

// ========== ПАРАМЕТРЫ ==========
document.getElementById("edit-limit").addEventListener("click", function() {
  const v = prompt("Лимит:", app.limit);
  if (v && !isNaN(v) && v > 0) {
    app.limit = parseInt(v);
    save();
    update();
  }
});

document.getElementById("edit-interval").addEventListener("click", function() {
  const v = prompt("Интервал (мин):", app.interval);
  if (v && !isNaN(v) && v > 0) {
    app.interval = parseInt(v);
    save();
    update();
  }
});

document.getElementById("edit-price").addEventListener("click", function() {
  const v = prompt("Цена (₽):", app.price);
  if (v && !isNaN(v) && v > 0) {
    app.price = parseInt(v);
    save();
    update();
  }
});

document.getElementById("export-btn").addEventListener("click", function() {
  const data = JSON.stringify(app, null, 2);
  const blob = new Blob([data], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "smoker.json";
  a.click();
});

document.getElementById("reset-btn").addEventListener("click", function() {
  if (confirm("Удалить?")) {
    localStorage.removeItem("app");
    location.reload();
  }
});

// ========== КАЛЕНДАРЬ ==========
document.getElementById("cal-prev").addEventListener("click", function() {
  calDate.setMonth(calDate.getMonth() - 1);
  cal();
});

document.getElementById("cal-next").addEventListener("click", function() {
  calDate.setMonth(calDate.getMonth() + 1);
  cal();
});

function cal() {
  const y = calDate.getFullYear();
  const m = calDate.getMonth();
  const months = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
  document.getElementById("cal-month").textContent = months[m] + " " + y;
  
  const fd = new Date(y, m, 1).getDay();
  const ldm = new Date(y, m+1, 0).getDate();
  const ldp = new Date(y, m, 0).getDate();
  
  let html = "";
  for (let i = fd === 0 ? 6 : fd - 1; i > 0; i--) {
    html += '<div class="cal-day other">' + (ldp - i + 1) + '</div>';
  }
  
  const today = new Date();
  for (let d = 1; d <= ldm; d++) {
    const date = new Date(y, m, d);
    const cnt = app.smokes.filter(s => ts(s.time) === ts(date)).length;
    const cls = cnt > 0 ? (cnt <= app.limit ? "ok" : "bad") : "";
    if (ts(date) === ts(today)) cls.length > 0 ? cls += " today" : cls = "today";
    html += '<div class="cal-day ' + cls + '" onclick="details(' + d + ')">' + d + '</div>';
  }
  
  const total = document.getElementById("cal-days").innerHTML.split("</div>").length - 1;
  for (let d = 1; d <= 42 - total; d++) {
    html += '<div class="cal-day other">' + d + '</div>';
  }
  
  document.getElementById("cal-days").innerHTML = html;
}

function details(d) {
  const date = new Date(calDate.getFullYear(), calDate.getMonth(), d);
  const events = app.smokes.filter(s => ts(s.time) === ts(date));
  const cnt = events.length;
  const ds = date.toLocaleDateString("ru-RU", {weekday: "long", month: "long", day: "numeric"});
  
  let html = '<div class="card"><h3>' + ds + '</h3>';
  if (cnt === 0) {
    html += '<div class="empty">✅ Не курил</div>';
  } else {
    html += '<div style="text-align:center;margin:16px 0"><strong>' + cnt + '/' + app.limit + '</strong> ' + (cnt <= app.limit ? '✅' : '⚠️') + '</div>';
    html += '<div class="list">';
    events.forEach((e, i) => {
      const t = e.time.toLocaleTimeString("ru", {hour: "2-digit", minute: "2-digit"});
      let itv = "";
      if (i > 0) {
        const diff = Math.round((e.time - events[i-1].time) / (1000*60));
        itv = " (+" + diff + "м)";
      }
      html += '<div class="item"><strong>' + t + itv + '</strong>' + (e.reason ? '<div style="color:#999">' + e.reason + '</div>' : '') + '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  
  document.getElementById("date-details").innerHTML = html;
}

// ========== ГРАФИК ==========
function chart() {
  const days = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const today = new Date();
  let html = "";
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const cnt = app.smokes.filter(s => ts(s.time) === ts(d)).length;
    const day = days[(d.getDay() + 6) % 7];
    const h = Math.max(5, Math.min(100, cnt / app.limit * 100));
    const bad = cnt > app.limit;
    
    html += '<div class="chart-bar">' +
      '<div class="bar ' + (bad ? "bad" : "") + '" style="height:' + h + '%"></div>' +
      '<div>' + day + '</div>' +
      '<div>' + cnt + '</div>' +
      '</div>';
  }
  
  document.getElementById("chart").innerHTML = html;
}

// ========== ДОСТИЖЕНИЯ ==========
function ach() {
  const days = clean();
  const money = save_money();
  const list = [
    {icon: "👣", name: "1 День", d: 1},
    {icon: "📅", name: "Неделя", d: 7},
    {icon: "🎉", name: "Месяц", d: 30},
    {icon: "💪", name: "60 дн", d: 60},
    {icon: "💰", name: "1000₽", m: 1000}
  ];
  
  let html = "";
  list.forEach(a => {
    const ok = (a.d && days >= a.d) || (a.m && money >= a.m);
    html += '<div class="ach ' + (ok ? "ok" : "") + '"><div>' + a.icon + '</div><div>' + a.name + '</div></div>';
  });
  
  document.getElementById("achievements-grid").innerHTML = html;
}

// ========== УТИЛИТЫ ==========
function ts(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + dd;
}

function clean() {
  const today = new Date();
  if (app.smokes.length === 0) return 0;
  const last = app.smokes[app.smokes.length - 1].time;
  return Math.floor((today - last) / (1000*60*60*24));
}

function save_money() {
  return Math.floor(app.smokes.length * (app.price / 20));
}

function showModal() {
  document.getElementById("modal-reason").style.display = "flex";
  modal = null;
  document.getElementById("reason-text").value = "";
  document.querySelectorAll(".reason-btn").forEach(b => b.classList.remove("selected"));
}

function timer() {
  if (!app.lastSmoke) {
    document.getElementById("timer-display").textContent = "00:00";
    return;
  }
  
  const now = new Date();
  const since = (now - app.lastSmoke) / (1000*60);
  
  if (since >= app.interval) {
    document.getElementById("timer-display").textContent = "00:00";
    return;
  }
  
  const next = new Date(app.lastSmoke.getTime() + app.interval * 60 * 1000);
  const rem = Math.max(0, (next - now) / 1000);
  const m = Math.floor(rem / 60);
  const s = Math.floor(rem % 60);
  
  document.getElementById("timer-display").textContent = 
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function update() {
  const today = new Date();
  const today_smokes = app.smokes.filter(s => ts(s.time) === ts(today));
  const money = save_money();
  const clean_d = clean();
  
  document.getElementById("savings-amount").textContent = money + " ₽";
  document.getElementById("savings-cigs").textContent = app.smokes.length + " шт";
  document.getElementById("stat-clean").textContent = clean_d;
  document.getElementById("stat-today").textContent = today_smokes.length;
  
  const week_cnt = app.smokes.filter(s => {
    const d = (today - new Date(s.time)) / (1000*60*60*24);
    return d < 7;
  }).length;
  document.getElementById("stat-week").textContent = Math.round(week_cnt / 7);
  
  const prog = Math.min(100, today_smokes.length / app.limit * 100);
  document.getElementById("progress-fill").style.width = prog + "%";
  document.getElementById("progress-text").textContent = today_smokes.length + "/" + app.limit;
  document.getElementById("progress-status").textContent = today_smokes.length <= app.limit ? "✅ OK" : "⚠️ Увеличено";
  
  let disabled = false;
  let txt = "✓ Можно";
  if (app.lastSmoke) {
    const since = (today - app.lastSmoke) / (1000*60);
    if (since < app.interval) {
      disabled = true;
      const rem = Math.ceil(app.interval - since);
      txt = rem > 5 ? "⏳ " + rem + "м" : "⏱️ " + rem + "м";
    }
  }
  
  document.getElementById("smoke-btn").disabled = disabled;
  document.getElementById("timer-status").textContent = txt;
  
  let list_html = "";
  if (today_smokes.length === 0) {
    list_html = '<div class="empty">Нет записей 🎉</div>';
  } else {
    today_smokes.forEach((s, i) => {
      const t = s.time.toLocaleTimeString("ru", {hour: "2-digit", minute: "2-digit"});
      let itv = "";
      if (i > 0) {
        const diff = Math.round((s.time - today_smokes[i-1].time) / (1000*60));
        itv = " (+" + diff + "м)";
      }
      list_html += '<div class="item"><strong>' + t + itv + '</strong>' + (s.reason ? '<div style="color:#999">' + s.reason + '</div>' : '') + '</div>';
    });
  }
  document.getElementById("today-list").innerHTML = list_html;
  
  document.getElementById("setting-limit").textContent = app.limit + " сигарет";
  document.getElementById("setting-interval").textContent = app.interval + " минут";
  document.getElementById("setting-price").textContent = app.price + " ₽";
  document.getElementById("stat-total").textContent = app.smokes.length;
  
  if (app.smokes.length > 0) {
    const span = Math.max(1, Math.floor((app.smokes[app.smokes.length - 1].time - app.smokes[0].time) / (1000*60*60*24)) + 1);
    document.getElementById("stat-avg").textContent = Math.round(app.smokes.length / span);
  } else {
    document.getElementById("stat-avg").textContent = "0";
  }
  
  save();
}

function init() {
  calDate = new Date();
  chart();
  cal();
  if (Math.random() > 0.3) {
    const tips = ["Пей воду!", "Спорт!", "Прогулка", "Жвачка", "Дыши", "Держись!"];
    const tip = tips[Math.floor(Math.random() * tips.length)];
    document.getElementById("tip-text").textContent = tip;
    document.getElementById("tip-box").style.display = "flex";
  }
  update();
}

// ========== СТАРТ ==========
load();

if (app.done) {
  document.getElementById("onboarding").style.display = "none";
  document.getElementById("app-screen").style.display = "block";
  init();
}

update();
setInterval(timer, 1000);
setInterval(update, 10000);
