Telegram.WebApp.ready();
Telegram.WebApp.expand();

const TIPS = ["Пей воду!","Спорт","Прогулка","Жвачка","Дыши","Держись!"];
const ACH = [{icon:"👣",n:"1 Д",d:1},{icon:"📅",n:"7 Д",d:7},{icon:"🎉",n:"М",d:30},{icon:"💪",n:"60 Д",d:60},{icon:"💰",n:"1000₽",m:1000}];

let app = {smokes: [], limit: 10, interval: 45, price: 200, last: null, done: false};
let step = 1, calDate = new Date(), selReason = null, timerInt = null;

function save() {
  localStorage.setItem("app", JSON.stringify({
    smokes: app.smokes.map(s => ({t: s.t.toISOString(), r: s.r})),
    limit: app.limit,
    interval: app.interval,
    price: app.price,
    last: app.last ? app.last.toISOString() : null,
    done: app.done
  }));
}

function load() {
  const d = localStorage.getItem("app");
  if (!d) return;
  try {
    const p = JSON.parse(d);
    app.smokes = (p.smokes||[]).map(s => ({t: new Date(s.t), r: s.r||""}));
    app.limit = p.limit || 10;
    app.interval = p.interval || 45;
    app.price = p.price || 200;
    app.last = p.last ? new Date(p.last) : null;
    app.done = p.done || false;
  } catch(e) {}
}

// === ONBOARDING ===
document.getElementById("btn-next").addEventListener("click", function() {
  if (step == 1) {
    const v = parseInt(document.getElementById("i1").value);
    if (isNaN(v) || v < 1) return;
    app.limit = v;
    document.getElementById("onb1").style.display = "none";
    document.getElementById("onb2").style.display = "block";
    step = 2;
  } else if (step == 2) {
    const v = parseInt(document.getElementById("i2").value);
    if (isNaN(v) || v < 1) return;
    app.interval = v;
    document.getElementById("onb2").style.display = "none";
    document.getElementById("onb3").style.display = "block";
    step = 3;
  } else if (step == 3) {
    const v = parseInt(document.getElementById("i3").value);
    if (isNaN(v) || v < 1) return;
    app.price = v;
    app.done = true;
    save();
    document.getElementById("onb").style.display = "none";
    document.getElementById("app").style.display = "block";
    init();
  }
});

// === TABS ===
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", function() {
    const idx = this.getAttribute("data-tab");
    document.querySelectorAll(".tab-view").forEach(v => v.style.display = "none");
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-view")[idx].style.display = "block";
    this.classList.add("active");
    if (idx == 1) { drawChart(); drawCal(); }
    if (idx == 2) drawAch();
  });
});

// === SMOKE ===
document.getElementById("btn-smoke").addEventListener("click", function() {
  const now = new Date();
  if (app.last) {
    const mins = (now - app.last) / (1000*60);
    if (mins < app.interval) {
      showModal();
      return;
    }
  }
  app.smokes.push({t: now, r: ""});
  app.last = now;
  save();
  update();
  tick();
});

// === MODAL ===
document.querySelectorAll(".reason").forEach(b => {
  b.addEventListener("click", function() {
    document.querySelectorAll(".reason").forEach(x => x.classList.remove("sel"));
    this.classList.add("sel");
    selReason = this.getAttribute("data-r");
    document.getElementById("reason-text").value = selReason;
  });
});

document.getElementById("m-cancel").addEventListener("click", () => {
  document.getElementById("modal").style.display = "none";
});

document.getElementById("m-ok").addEventListener("click", () => {
  const r = selReason || document.getElementById("reason-text").value || "";
  app.smokes.push({t: new Date(), r});
  app.last = new Date();
  save();
  update();
  tick();
  document.getElementById("modal").style.display = "none";
});

// === SETTINGS ===
document.getElementById("e-limit").addEventListener("click", function() {
  const v = prompt("Лимит:", app.limit);
  if (v && !isNaN(v) && v > 0) { app.limit = parseInt(v); save(); update(); }
});

document.getElementById("e-int").addEventListener("click", function() {
  const v = prompt("Интервал (мин):", app.interval);
  if (v && !isNaN(v) && v > 0) { app.interval = parseInt(v); save(); update(); tick(); }
});

document.getElementById("e-price").addEventListener("click", function() {
  const v = prompt("Цена (₽):", app.price);
  if (v && !isNaN(v) && v > 0) { app.price = parseInt(v); save(); update(); }
});

document.getElementById("btn-export").addEventListener("click", function() {
  const data = JSON.stringify(app, null, 2);
  const blob = new Blob([data], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  a.click();
});

document.getElementById("btn-reset").addEventListener("click", function() {
  if (confirm("Удалить?")) { localStorage.removeItem("app"); location.reload(); }
});

document.getElementById("cal-p").addEventListener("click", () => {
  calDate.setMonth(calDate.getMonth() - 1);
  drawCal();
});

document.getElementById("cal-n").addEventListener("click", () => {
  calDate.setMonth(calDate.getMonth() + 1);
  drawCal();
});

// === RENDER ===
function ts(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return y + "-" + m + "-" + dd;
}

function cleanDays() {
  if (app.smokes.length === 0) return 0;
  return Math.floor((new Date() - app.smokes[app.smokes.length-1].t) / (1000*60*60*24));
}

function saved() {
  return Math.floor(app.smokes.length * (app.price / 20));
}

function getDay(d) {
  return app.smokes.filter(s => ts(s.t) === ts(d)).length;
}

function showModal() {
  document.getElementById("modal").style.display = "flex";
  selReason = null;
  document.getElementById("reason-text").value = "";
  document.querySelectorAll(".reason").forEach(b => b.classList.remove("sel"));
}

function drawCal() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const months = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
  document.getElementById("cal-month").textContent = months[m] + " " + y;
  
  const fd = new Date(y, m, 1).getDay();
  const ldm = new Date(y, m+1, 0).getDate();
  const ldp = new Date(y, m, 0).getDate();
  
  let html = "";
  for (let i = fd === 0 ? 6 : fd - 1; i > 0; i--) html += '<div class="day o">' + (ldp - i + 1) + '</div>';
  
  const today = new Date();
  for (let d = 1; d <= ldm; d++) {
    const date = new Date(y, m, d);
    const cnt = getDay(date);
    let cls = cnt > 0 ? (cnt <= app.limit ? "ok" : "bad") : "";
    if (ts(date) === ts(today)) cls = cls ? cls + " now" : "now";
    html += '<div class="day ' + cls + '" onclick="dayDetails(new Date(' + y + ',' + m + ',' + d + '))">' + d + '</div>';
  }
  
  for (let i = 42 - (ldm + (fd === 0 ? 6 : fd - 1)); i > 0; i--) html += '<div class="day o">1</div>';
  
  document.getElementById("cal-days").innerHTML = html;
}

function dayDetails(date) {
  const events = app.smokes.filter(s => ts(s.t) === ts(date));
  const cnt = events.length;
  const ds = date.toLocaleDateString("ru-RU", {weekday: "long", month: "long", day: "numeric"});
  
  let html = '<div class="card"><h3>' + ds + '</h3>';
  if (cnt === 0) html += '<div class="empty">✅ Не курил</div>';
  else {
    html += '<div style="text-align:center;margin:16px 0"><b>' + cnt + '/' + app.limit + '</b> ' + (cnt <= app.limit ? '✅' : '⚠️') + '</div>';
    events.forEach((e, i) => {
      const t = e.t.toLocaleTimeString("ru", {hour: "2-digit", minute: "2-digit"});
      let itv = "";
      if (i > 0) itv = " (+" + Math.round((e.t - events[i-1].t) / (1000*60)) + "м)";
      html += '<div class="item"><b>' + t + itv + '</b>' + (e.r ? '<div style="color:#999;font-size:11px">' + e.r + '</div>' : '') + '</div>';
    });
  }
  html += '</div>';
  document.getElementById("day-info").innerHTML = html;
}

function drawChart() {
  const days = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const today = new Date();
  let html = "";
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const cnt = getDay(d);
    const day = days[(d.getDay() + 6) % 7];
    const h = Math.max(5, Math.min(100, cnt / app.limit * 100));
    const bad = cnt > app.limit;
    
    html += '<div class="chart-col"><div class="bar ' + (bad ? "bad" : "") + '" style="height:' + h + '%"></div><div>' + day + '</div><div>' + cnt + '</div></div>';
  }
  
  document.getElementById("chart").innerHTML = html;
}

function drawAch() {
  const d = cleanDays();
  const m = saved();
  let html = "";
  
  ACH.forEach(a => {
    const ok = (a.d && d >= a.d) || (a.m && m >= a.m);
    html += '<div class="ach ' + (ok ? "ok" : "") + '"><div>' + a.icon + '</div><div>' + a.n + '</div></div>';
  });
  
  document.getElementById("ach").innerHTML = html;
}

function tick() {
  if (!app.last) { 
    document.getElementById("timer").textContent = "00:00";
    document.getElementById("ts").textContent = "✓ Можно";
    document.getElementById("btn-smoke").disabled = false;
    return;
  }
  
  const now = new Date();
  const mins = (now - app.last) / (1000*60);
  
  if (mins >= app.interval) { 
    document.getElementById("timer").textContent = "00:00";
    document.getElementById("ts").textContent = "✓ Можно";
    document.getElementById("btn-smoke").disabled = false;
    return;
  }
  
  const next = new Date(app.last.getTime() + app.interval * 60 * 1000);
  const rem = Math.max(0, (next - now) / 1000);
  const m = Math.floor(rem / 60);
  const s = Math.floor(rem % 60);
  
  document.getElementById("timer").textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  document.getElementById("ts").textContent = "⏳ " + Math.ceil(rem / 60) + "м";
  document.getElementById("btn-smoke").disabled = true;
}

function update() {
  const today = new Date();
  const tdaySmokes = app.smokes.filter(s => ts(s.t) === ts(today));
  const mon = saved();
  const cln = cleanDays();
  
  document.getElementById("saved").textContent = mon + " ₽";
  document.getElementById("count").textContent = app.smokes.length + " шт";
  document.getElementById("days").textContent = cln;
  document.getElementById("today").textContent = tdaySmokes.length;
  
  const weekSmokes = app.smokes.filter(s => (today - new Date(s.t)) / (1000*60*60*24) < 7).length;
  document.getElementById("week").textContent = Math.round(weekSmokes / 7);
  
  const prog = Math.min(100, tdaySmokes.length / app.limit * 100);
  document.getElementById("fill").style.width = prog + "%";
  document.getElementById("prog-text").textContent = tdaySmokes.length + "/" + app.limit;
  document.getElementById("status").textContent = tdaySmokes.length <= app.limit ? "✅ OK" : "⚠️ Превышено";
  
  let list = "";
  if (tdaySmokes.length === 0) list = '<div class="empty">Нет записей 🎉</div>';
  else {
    tdaySmokes.forEach((s, i) => {
      const t = s.t.toLocaleTimeString("ru", {hour: "2-digit", minute: "2-digit"});
      let itv = "";
      if (i > 0) itv = " (+" + Math.round((s.t - tdaySmokes[i-1].t) / (1000*60)) + "м)";
      list += '<div class="item"><b>' + t + itv + '</b>' + (s.r ? '<div style="color:#666;font-size:11px">' + s.r + '</div>' : '') + '</div>';
    });
  }
  document.getElementById("today-list").innerHTML = list;
  
  document.getElementById("val-limit").textContent = app.limit + " сигарет";
  document.getElementById("val-int").textContent = app.interval + " минут";
  document.getElementById("val-price").textContent = app.price + " ₽";
  document.getElementById("total").textContent = app.smokes.length;
  
  if (app.smokes.length > 0) {
    const span = Math.max(1, Math.floor((app.smokes[app.smokes.length-1].t - app.smokes[0].t) / (1000*60*60*24)) + 1);
    document.getElementById("avg").textContent = Math.round(app.smokes.length / span);
  } else {
    document.getElementById("avg").textContent = "0";
  }
  
  save();
}

function init() {
  calDate = new Date();
  drawChart();
  drawCal();
  if (Math.random() > 0.3) {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    document.getElementById("tip-text").textContent = tip;
    document.getElementById("tip").style.display = "flex";
  }
  update();
  tick();
  // ТАЙМЕР РАБОТАЕТ ПОСТОЯННО!
  if (timerInt) clearInterval(timerInt);
  timerInt = setInterval(tick, 1000);
}

// === START ===
load();
if (app.done) {
  document.getElementById("onb").style.display = "none";
  document.getElementById("app").style.display = "block";
  init();
}
update();
tick();
// ТАЙМЕР РАБОТАЕТ ПОСТОЯННО!
if (timerInt) clearInterval(timerInt);
timerInt = setInterval(tick, 1000);
