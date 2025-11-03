Telegram.WebApp.ready();
Telegram.WebApp.expand();

const TIPS = ["Пей воду!","Займись спортом","Позвони другу","Гулять 10 минут","Жвачка","Дыши глубже","Ты справишься!","Организм восстанавливается","Каждый день-победа!","Держись!"];
const ACHIEVEMENTS = [{id:1,name:"1 День",desc:"1 день",icon:"👣",days:1},{id:2,name:"Неделя",desc:"7 дней",icon:"📅",days:7},{id:3,name:"Месяц",desc:"30 дней",icon:"🎉",days:30},{id:4,name:"Два месяца",desc:"60 дней",icon:"💪",days:60},{id:5,name:"Богач",desc:"1000₽",icon:"💰",money:1000}];

let state={
  smokeEvents:[],
  minIntervalMinutes:45,
  dailyLimit:10,
  cigPrice:200,
  lastSmokeTime:null,
  onboardingComplete:false,
  achievements:ACHIEVEMENTS.map(a=>({...a,unlocked:false})),
  plan:30
};

let currentCalendarDate=new Date();
let selectedReason=null;
let currentStep=1;

function loadState(){
  const s=localStorage.getItem("smoker_app");
  if(!s)return;
  try{
    const p=JSON.parse(s);
    state.smokeEvents=(p.smokeEvents||[]).map(e=>({timestamp:new Date(e.timestamp),reason:e.reason||""}));
    state.minIntervalMinutes=p.minIntervalMinutes??45;
    state.dailyLimit=p.dailyLimit??10;
    state.cigPrice=p.cigPrice??200;
    state.onboardingComplete=p.onboardingComplete??false;
    state.lastSmokeTime=p.lastSmokeTime?new Date(p.lastSmokeTime):null;
    state.achievements=p.achievements||ACHIEVEMENTS.map(a=>({...a,unlocked:false}));
  }catch(e){console.error(e);}
}

function saveState(){
  localStorage.setItem("smoker_app",JSON.stringify({
    smokeEvents:state.smokeEvents.map(e=>({timestamp:e.timestamp.toISOString(),reason:e.reason})),
    minIntervalMinutes:state.minIntervalMinutes,
    dailyLimit:state.dailyLimit,
    cigPrice:state.cigPrice,
    onboardingComplete:state.onboardingComplete,
    lastSmokeTime:state.lastSmokeTime?state.lastSmokeTime.toISOString():null,
    achievements:state.achievements
  }));
}

const nextBtn=document.getElementById("nextOnboardingBtn");
nextBtn.addEventListener("click",()=>{
  if(currentStep===1){
    state.dailyLimit=parseInt(document.getElementById("dailyLimitInput").value,10)||10;
    document.getElementById("step1").style.display="none";
    document.getElementById("step2").style.display="block";
    currentStep=2;return;
  }
  if(currentStep===2){
    state.minIntervalMinutes=parseInt(document.getElementById("minIntervalInput").value,10)||45;
    document.getElementById("step2").style.display="none";
    document.getElementById("step3").style.display="block";
    currentStep=3;return;
  }
  if(currentStep===3){
    state.cigPrice=parseInt(document.getElementById("cigPriceInput").value,10)||200;
    state.onboardingComplete=true;
    saveState();
    document.getElementById("onboardingScreen").classList.remove("active");
    document.getElementById("onboardingScreen").classList.add("hidden");
    document.getElementById("appScreen").style.display="block";
    currentCalendarDate=new Date();
    renderCalendar();
    renderChart();
    showTip();
    updateUI();
  }
});

document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const tabId=btn.getAttribute("data-tab");
    document.querySelectorAll(".tab-content").forEach(t=>t.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
    btn.classList.add("active");
    if(tabId==="history"){renderCalendar();renderChart();}
    if(tabId==="achievements"){renderAchievements();}
  });
});

function showTip(){
  if(Math.random()>0.3){
    const tip=TIPS[Math.floor(Math.random()*TIPS.length)];
    document.getElementById("tipText").textContent=tip;
    document.getElementById("tipCard").style.display="flex";
  }
}

const reasonModal=document.getElementById("reasonModal");
document.querySelectorAll(".reason-btn").forEach(b=>{
  b.addEventListener("click",()=>{
    document.querySelectorAll(".reason-btn").forEach(x=>x.classList.remove("selected"));
    b.classList.add("selected");
    selectedReason=b.getAttribute("data-reason");
    document.getElementById("reasonInput").value=selectedReason;
  });
});

document.getElementById("cancelReasonBtn").addEventListener("click",()=>reasonModal.classList.remove("active"));
document.getElementById("confirmReasonBtn").addEventListener("click",()=>{
  const now=new Date();
  state.smokeEvents.push({timestamp:now,reason:selectedReason||document.getElementById("reasonInput").value||""});
  state.lastSmokeTime=now;
  saveState();
  updateUI();
  reasonModal.classList.remove("active");
});

document.getElementById("smokeBtn").addEventListener("click",()=>{
  const now=new Date();
  if(state.lastSmokeTime){
    const diff=(now-state.lastSmokeTime)/(1000*60);
    if(diff<state.minIntervalMinutes){
      selectedReason=null;
      document.getElementById("reasonInput").value="";
      document.querySelectorAll(".reason-btn").forEach(b=>b.classList.remove("selected"));
      reasonModal.classList.add("active");
      return;
    }
  }
  state.smokeEvents.push({timestamp:now,reason:""});
  state.lastSmokeTime=now;
  saveState();
  updateUI();
});

document.getElementById("editIntervalBtn").addEventListener("click",()=>{
  const v=prompt("Интервал (минуты):",state.minIntervalMinutes);
  if(v&&!isNaN(v)){state.minIntervalMinutes=parseInt(v,10);saveState();updateUI();}
});

document.getElementById("editLimitBtn").addEventListener("click",()=>{
  const v=prompt("Дневной лимит:",state.dailyLimit);
  if(v&&!isNaN(v)){state.dailyLimit=parseInt(v,10);saveState();updateUI();}
});

document.getElementById("editPriceBtn").addEventListener("click",()=>{
  const v=prompt("Цена пачки (₽):",state.cigPrice);
  if(v&&!isNaN(v)){state.cigPrice=parseInt(v,10);saveState();updateUI();}
});

document.getElementById("resetBtn").addEventListener("click",()=>{
  if(confirm("Удалить ВСЕ данные?")){localStorage.removeItem("smoker_app");location.reload();}
});

document.getElementById("exportBtn").addEventListener("click",()=>{
  const data=JSON.stringify(state,null,2);
  const blob=new Blob([data],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`smoker-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
});

function getDateString(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const dd=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

function isSameDay(a,b){return getDateString(a)===getDateString(b);}
function eventsFor(d){return state.smokeEvents.filter(e=>isSameDay(e.timestamp,d));}
function getDayStats(d){return eventsFor(d).length;}

function renderCalendar(){
  const y=currentCalendarDate.getFullYear();
  const m=currentCalendarDate.getMonth();
  const months=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  document.getElementById("calendarMonth").textContent=`${months[m]} ${y}`;
  
  const fd=new Date(y,m,1).getDay();
  const ldm=new Date(y,m+1,0).getDate();
  const ldp=new Date(y,m,0).getDate();
  const cont=document.getElementById("calendarDays");
  cont.innerHTML="";
  
  for(let i=(fd===0?6:fd-1);i>0;i--){
    const el=document.createElement("div");
    el.className="day other-month";
    el.textContent=ldp-i+1;
    cont.appendChild(el);
  }
  
  const today=new Date();
  for(let d=1;d<=ldm;d++){
    const date=new Date(y,m,d);
    const el=document.createElement("div");
    el.className="day";
    el.textContent=d;
    const cnt=getDayStats(date);
    if(cnt>0)el.classList.add(cnt<=state.dailyLimit?"success":"danger");
    if(isSameDay(date,today))el.classList.add("selected");
    el.addEventListener("click",()=>showDateDetails(date));
    cont.appendChild(el);
  }
  
  const total=cont.children.length;
  for(let d=1;d<=42-total;d++){
    const el=document.createElement("div");
    el.className="day other-month";
    el.textContent=d;
    cont.appendChild(el);
  }
}

function showDateDetails(date){
  const events=eventsFor(date);
  const cnt=events.length;
  const ds=date.toLocaleDateString("ru-RU",{weekday:"long",month:"long",day:"numeric"});
  let html=`<div class="card"><h3 class="card-title">${ds}</h3>`;
  
  if(cnt===0)html+=`<div class="empty-state">Без курения ✅</div>`;
  else{
    const ok=cnt<=state.dailyLimit?"✅":"⚠️";
    html+=`<div style="text-align:center;margin:16px 0;"><strong>${cnt}/${state.dailyLimit}</strong> ${ok}</div>`;
    html+=`<div class="smokes-list">`;
    events.forEach((e,i)=>{
      const t=e.timestamp.toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});
      let itv="";
      if(i>0){
        const diff=Math.round((e.timestamp-events[i-1].timestamp)/(1000*60));
        itv=` (+${diff} мин)`;
      }
      html+=`<div class="smoke-item"><div class="smoke-item-time">${t}${itv}</div>${e.reason?`<div class="smoke-item-reason">${e.reason}</div>`:""}`;
    });
    html+=`</div>`;
  }
  html+=`</div>`;
  document.getElementById("selectedDateSmokes").innerHTML=html;
}

function renderChart(){
  const days=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const today=new Date();
  let html="";
  
  for(let i=6;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    const cnt=getDayStats(d);
    const name=days[(d.getDay()+6)%7];
    const perc=Math.max(5,Math.min(100,(cnt/state.dailyLimit)*100));
    const danger=cnt>state.dailyLimit;
    
    html+=`<div class="chart-bar-container">
      <div class="chart-bar ${danger?"danger":"}" style="height:${perc}%;"></div>
      <div class="chart-label">${name}</div>
      <div class="chart-value">${cnt}</div>
    </div>`;
  }
  document.getElementById("weeklyChart").innerHTML=html;
}

function updateTimer(){
  if(!state.lastSmokeTime){
    document.getElementById("timerDisplay").textContent="00:00";
    return;
  }
  const now=new Date();
  const since=(now-state.lastSmokeTime)/(1000*60);
  if(since>=state.minIntervalMinutes){
    document.getElementById("timerDisplay").textContent="00:00";
    return;
  }
  const next=new Date(state.lastSmokeTime.getTime()+state.minIntervalMinutes*60*1000);
  const rem=Math.max(0,(next-now)/1000);
  const m=Math.floor(rem/60);
  const s=Math.floor(rem%60);
  document.getElementById("timerDisplay").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function getCleanDays(){
  const today=new Date();
  if(state.smokeEvents.length===0)return 0;
  const last=new Date(state.smokeEvents[state.smokeEvents.length-1].timestamp);
  return Math.floor((today-last)/(1000*60*60*24));
}

function updateUI(){
  const today=new Date();
  const todayEvents=eventsFor(today);
  const moneySaved=Math.floor(state.smokeEvents.length*(state.cigPrice/20));
  const daysClean=getCleanDays();
  
  document.getElementById("moneySaved").textContent=`${moneySaved} ₽`;
  document.getElementById("cigsSaved").textContent=`${state.smokeEvents.length} шт`;
  document.getElementById("daysClean").textContent=daysClean;
  document.getElementById("todayCount").textContent=todayEvents.length;
  
  const weekCount=state.smokeEvents.filter(e=>(today-new Date(e.timestamp))/(1000*60*60*24)<7).length;
  document.getElementById("weekAvg").textContent=Math.round(weekCount/7);
  
  const prog=Math.min(100,(todayEvents.length/state.dailyLimit)*100);
  document.getElementById("progressFill").style.width=`${prog}%`;
  document.getElementById("progressText").textContent=`${todayEvents.length}/${state.dailyLimit}`;
  
  const ok=todayEvents.length<=state.dailyLimit;
  document.getElementById("progressStatus").textContent=ok?"✅ В пределах нормы":"⚠️ Превышен лимит";
  
  const smokeBtn=document.getElementById("smokeBtn");
  const badge=document.getElementById("statusBadge");
  let dis=false;
  let txt="✓ Можно курить";
  
  if(state.lastSmokeTime){
    const since=(today-state.lastSmokeTime)/(1000*60);
    if(since<state.minIntervalMinutes){
      dis=true;
      const rem=Math.ceil(state.minIntervalMinutes-since);
      txt=rem>5?`⏳ ${rem} мин`:` ⏱️ ${rem} мин`;
    }
  }
  
  smokeBtn.disabled=dis;
  badge.textContent=txt;
  
  let listHtml="";
  if(todayEvents.length===0)listHtml=`<div class="empty-state">Нет записей</div>`;
  else{
    listHtml=todayEvents.map((e,i)=>{
      const t=e.timestamp.toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});
      let itv="";
      if(i>0){
        const diff=Math.round((e.timestamp-todayEvents[i-1].timestamp)/(1000*60));
        itv=` (+${diff})`;
      }
      return `<div class="smoke-item"><div class="smoke-item-time">${t}${itv}</div>${e.reason?`<div class="smoke-item-reason">${e.reason}</div>`:""}`;
    }).join("");
  }
  document.getElementById("todayList").innerHTML=listHtml;
  
  document.getElementById("currentLimitDisplay").textContent=`${state.dailyLimit} сигарет`;
  document.getElementById("currentIntervalDisplay").textContent=`${state.minIntervalMinutes} минут`;
  document.getElementById("currentPriceDisplay").textContent=`${state.cigPrice} ₽`;
  document.getElementById("totalSmokes").textContent=state.smokeEvents.length;
  
  if(state.smokeEvents.length>0){
    const first=new Date(state.smokeEvents[0].timestamp);
    const last=new Date(state.smokeEvents[state.smokeEvents.length-1].timestamp);
    const span=Math.max(1,Math.floor((last-first)/(1000*60*60*24)))+1;
    document.getElementById("avgDay").textContent=Math.round(state.smokeEvents.length/span);
  }else{
    document.getElementById("avgDay").textContent="0";
  }
  
  saveState();
}

function renderAchievements(){
  const container=document.getElementById("achievementsContainer");
  const daysClean=getCleanDays();
  const moneySaved=Math.floor(state.smokeEvents.length*(state.cigPrice/20));
  
  state.achievements.forEach(a=>{
    if(a.days && daysClean>=a.days)a.unlocked=true;
    if(a.money && moneySaved>=a.money)a.unlocked=true;
  });
  
  let html="";
  state.achievements.forEach(a=>{
    html+=`<div class="achievement ${a.unlocked?"unlocked":""}">
      <div class="achievement-icon">${a.icon}</div>
      <div class="achievement-name">${a.name}</div>
      <div class="achievement-desc">${a.desc}</div>
    </div>`;
  });
  container.innerHTML=html;
}

document.getElementById("prevMonthBtn").addEventListener("click",()=>{
  currentCalendarDate.setMonth(currentCalendarDate.getMonth()-1);
  renderCalendar();
});

document.getElementById("nextMonthBtn").addEventListener("click",()=>{
  currentCalendarDate.setMonth(currentCalendarDate.getMonth()+1);
  renderCalendar();
});

loadState();
if(state.onboardingComplete){
  document.getElementById("onboardingScreen").classList.remove("active");
  document.getElementById("onboardingScreen").classList.add("hidden");
  document.getElementById("appScreen").style.display="block";
  currentCalendarDate=new Date();
  renderCalendar();
  renderChart();
  showTip();
}
updateUI();
setInterval(updateTimer,1000);
setInterval(updateUI,10000);
