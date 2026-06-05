// ======== マスターデータ ========
const DAYS = ["月","火","水","木","金","土"];
const DAY_COLORS = { "月":"#3498db","火":"#e67e22","水":"#27ae60","木":"#9b59b6","金":"#e74c3c","土":"#1abc9c" };

const DEFAULT_STAFF = [
  { name:"佐伯", password:"1111", isAdmin:true },
  { name:"田中", password:"2222", isAdmin:false },
  { name:"山本", password:"3333", isAdmin:false },
];

const DEFAULT_CHILDREN = {
  "月": ["山田 太郎","鈴木 花子","中村 健太"],
  "火": ["小林 さくら","伊藤 蓮","山田 太郎"],
  "水": ["中村 健太","田中 葵"],
  "木": ["鈴木 花子","伊藤 蓮","小林 さくら"],
  "金": ["山田 太郎","田中 葵","中村 健太"],
  "土": ["鈴木 花子"],
};

const CHECK_OPTIONS = ["良好","体調不良","気分ムラ","トラブルあり","保護者連絡要"];
const GOOD_SET = new Set(["良好"]);
const FIELDS = [
  { key:"status",  label:"体調・様子",        ph:"例）登所時から落ち着きあり。活動に積極的に参加できた。" },
  { key:"trouble", label:"トラブル・対応記録",  ph:"例）○○くんとの言い合い→スタッフ介入し和解" },
  { key:"parent",  label:"保護者への連絡事項",  ph:"例）お迎え時に薬の残量をお伝えください" },
  { key:"next",    label:"翌日以降の申し送り",  ph:"例）明日は病院受診後の来所予定" },
];

// ======== ユーティリティ ========
function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function todayDow(){
  return ["日","月","火","水","木","金","土"][new Date().getDay()];
}
function formatDate(str){
  if(!str) return "";
  const [y,m,d] = str.split("-");
  const dow = ["日","月","火","水","木","金","土"][new Date(str).getDay()];
  return `${y}年${m}月${d}日（${dow}）`;
}
function nowTime(){
  const n = new Date();
  return `${pad(n.getHours())}:${pad(n.getMinutes())}`;
}
function escHtml(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

// ======== ストレージ ========
function getStaff(){ return JSON.parse(localStorage.getItem('staff')||'null') || DEFAULT_STAFF; }
function getChildren(){ return JSON.parse(localStorage.getItem('children')||'null') || DEFAULT_CHILDREN; }
function saveChildren(obj){ localStorage.setItem('children', JSON.stringify(obj)); }
function loadData(date){ try{ const r=localStorage.getItem('申し送り_'+date); return r?JSON.parse(r):null; }catch{return null;} }
function storeData(date,data){ localStorage.setItem('申し送り_'+date, JSON.stringify(data)); }

// ======== 状態 ========
let currentStaff = null;
let records = [];
let adminChildren = {};
const today = todayStr();
const todayDay = todayDow();

// ======== 画面切替 ========
function showScreen(name){
  ['login','main','history','detail','admin'].forEach(s => {
    document.getElementById(s+'-screen').classList.toggle('hidden', s !== name);
  });
}

// ======== ログイン ========
function buildLoginUI(){
  const staff = getStaff();
  const sel = document.getElementById('login-name');
  sel.innerHTML = '<option value="">選択してください</option>';
  staff.forEach(s => {
    const o = document.createElement('option');
    o.value = s.name; o.textContent = s.name;
    sel.appendChild(o);
  });
  document.getElementById('login-note').innerHTML =
    '※デモ用パスワード：' + staff.map(s => `${s.name}=${s.password}`).join(' / ');
}

function doLogin(){
  const name = document.getElementById('login-name').value;
  const pass = document.getElementById('login-pass').value;
  const staff = getStaff().find(s => s.name === name && s.password === pass);
  if(staff){
    currentStaff = staff;
    document.getElementById('login-error').textContent = '';
    initMain();
    showScreen('main');
  } else {
    document.getElementById('login-error').textContent = '名前またはパスワードが違います';
  }
}

document.getElementById('login-pass').addEventListener('keydown', e => {
  if(e.key === 'Enter') doLogin();
});

function doLogout(){
  currentStaff = null;
  document.getElementById('login-pass').value = '';
  buildLoginUI();
  showScreen('login');
}

// ======== メイン ========
function initMain(){
  document.getElementById('main-date-label').textContent = formatDate(today) + '　' + todayDay + '曜日';
  document.getElementById('main-staff-name').textContent = '👤 ' + currentStaff.name;

  const adminBtn = document.getElementById('admin-btn');
  currentStaff.isAdmin
    ? adminBtn.classList.remove('hidden')
    : adminBtn.classList.add('hidden');

  const children = getChildren();
  const todayChildren = children[todayDay] || [];
  const saved = loadData(today);

  if(saved){
    records = [...saved];
    const savedNames = saved.map(r => r.childName);
    todayChildren.forEach(name => {
      if(!savedNames.includes(name)) records.push(emptyRecord(name));
    });
  } else {
    records = todayChildren.map(emptyRecord);
  }
  renderCards();
}

function emptyRecord(name){
  return { childName:name, checks:[], logs:{ status:[], trouble:[], parent:[], next:[] } };
}

// ======== カード描画 ========
function renderCards(){
  const list = document.getElementById('card-list');
  list.innerHTML = '';

  if(records.length === 0){
    list.innerHTML = `<div class="empty-msg">本日（${todayDay}曜日）の登録児童がいません。<br>管理者設定から追加してください。</div>`;
    return;
  }

  records.forEach((rec, idx) => {
    list.appendChild(buildCard(rec, idx, false));
  });
}

function buildCard(rec, idx, keepOpen){
  const isAlert = rec.checks.some(c => ['トラブルあり','保護者連絡要','体調不良'].includes(c));
  const card = document.createElement('div');
  card.className = 'child-card' + (isAlert ? ' alert' : '');

  const tagsHtml = rec.checks.map(c =>
    `<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`
  ).join('');

  const allLogs = FIELDS.flatMap(f => rec.logs[f.key]||[]);
  const updaters = [...new Set(allLogs.map(l => l.staff))];
  const updaterHtml = updaters.length > 0
    ? `<span class="staff-tag">${updaters.join('・')}</span>` : '';

  card.innerHTML = `
    <div class="card-header" onclick="toggleCard(${idx})">
      <div class="card-left">
        <span class="child-icon">👦</span>
        <span class="child-name">${escHtml(rec.childName)}</span>
        <div class="tag-row">${tagsHtml}</div>
      </div>
      <div class="card-right">
        ${updaterHtml}
        <span class="arrow" id="arrow-${idx}">▼</span>
      </div>
    </div>
    <div class="card-body${keepOpen?' open':''}" id="body-${idx}" data-idx="${idx}">
      <div class="form-section">
        <div class="form-label">体調チェック</div>
        <div class="check-row" id="checks-${idx}">
          ${CHECK_OPTIONS.map(opt => {
            const active = rec.checks.includes(opt);
            const cls = active ? (GOOD_SET.has(opt)?'active-good':'active-bad') : '';
            return `<button class="check-btn ${cls}" onclick="toggleCheck(${idx},'${opt}')">${opt}</button>`;
          }).join('')}
        </div>
      </div>
      ${FIELDS.map(f => `
        <div class="form-section">
          <div class="form-label">${f.label}</div>
          <div class="log-box" id="log-${f.key}-${idx}">${renderLog(rec.logs[f.key]||[])}</div>
          <textarea id="input-${f.key}-${idx}" rows="2" placeholder="${f.ph}" style="margin-top:6px"></textarea>
          <button class="append-btn" onclick="appendLog(${idx},'${f.key}')">✏️ 追記する</button>
        </div>
      `).join('')}
    </div>
  `;

  if(keepOpen) card.querySelector('.arrow').textContent = '▲';
  return card;
}

function renderLog(logs){
  if(!logs || logs.length === 0)
    return '<span class="log-empty">まだ記録がありません</span>';
  return logs.map(l =>
    `<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`
  ).join('');
}

// ======== チェック ========
function toggleCheck(idx, label){
  const rec = records[idx];
  rec.checks.includes(label)
    ? rec.checks = rec.checks.filter(c => c !== label)
    : rec.checks.push(label);

  document.getElementById('checks-'+idx).innerHTML = CHECK_OPTIONS.map(opt => {
    const active = rec.checks.includes(opt);
    const cls = active ? (GOOD_SET.has(opt)?'active-good':'active-bad') : '';
    return `<button class="check-btn ${cls}" onclick="toggleCheck(${idx},'${opt}')">${opt}</button>`;
  }).join('');

  const cards = document.querySelectorAll('.child-card');
  const isAlert = rec.checks.some(c => ['トラブルあり','保護者連絡要','体調不良'].includes(c));
  cards[idx].classList.toggle('alert', isAlert);
  cards[idx].querySelector('.tag-row').innerHTML = rec.checks.map(c =>
    `<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`
  ).join('');
}

// ======== 追記 ========
function appendLog(idx, key){
  const ta = document.getElementById(`input-${key}-${idx}`);
  const text = ta.value.trim();
  if(!text){ ta.focus(); return; }
  if(!records[idx].logs[key]) records[idx].logs[key] = [];
  records[idx].logs[key].push({ staff: currentStaff.name, time: nowTime(), text });
  ta.value = '';
  document.getElementById(`log-${key}-${idx}`).innerHTML = renderLog(records[idx].logs[key]);
}

// ======== 開閉 ========
function toggleCard(idx){
  const body = document.getElementById('body-'+idx);
  const arrow = document.getElementById('arrow-'+idx);
  arrow.textContent = body.classList.toggle('open') ? '▲' : '▼';
}

// ======== 保存 ========
function saveRecords(){
  storeData(today, records);
  const btn = document.getElementById('save-btn');
  btn.textContent = '✅ 保存しました！';
  btn.classList.add('flash');
  setTimeout(() => { btn.textContent = '💾 保存する'; btn.classList.remove('flash'); }, 2000);
}

// ======== 履歴 ========
function openHistory(){
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  const dates = [];
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('申し送り_')) dates.push(k.replace('申し送り_',''));
  }
  dates.sort().reverse();

  if(dates.length === 0){
    list.innerHTML = '<div class="empty-msg">保存された記録がありません</div>';
  } else {
    dates.forEach(date => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `<span class="history-date">${formatDate(date)}</span><span class="arrow">▶</span>`;
      item.onclick = () => openDetail(date);
      list.appendChild(item);
    });
  }
  showScreen('history');
}

function openDetail(date){
  currentDetailDate = date;
  document.getElementById('detail-date-label').textContent = formatDate(date);
  const recs = loadData(date) || [];
  const list = document.getElementById('detail-list');
  list.innerHTML = '';

  recs.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'detail-card';
    const tagsHtml = rec.checks.map(c =>
      `<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`
    ).join('');
    const fieldsHtml = FIELDS.map(f => {
      const logs = rec.logs && rec.logs[f.key] || [];
      if(logs.length === 0) return '';
      return `<div class="detail-row">
        <span class="detail-label">${f.label}</span>
        ${logs.map(l =>
          `<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`
        ).join('')}
      </div>`;
    }).join('');

    card.innerHTML = `
      <div class="detail-name">👦 ${escHtml(rec.childName)}</div>
      <div class="tag-row" style="margin-bottom:6px">${tagsHtml}</div>
      ${fieldsHtml || '<span style="color:#bbb;font-size:13px">記録なし</span>'}
    `;
    list.appendChild(card);
  });
  showScreen('detail');
}

// ======== 管理者設定 ========
function openAdmin(){
  adminChildren = JSON.parse(JSON.stringify(getChildren()));
  renderAdmin();
  showScreen('admin');
}

function renderAdmin(){
  const content = document.getElementById('admin-content');
  content.innerHTML = '';
  const section = document.createElement('div');
  section.className = 'admin-section';
  section.innerHTML = '<h3>📅 曜日別 児童設定</h3>';

  DAYS.forEach(day => {
    if(!adminChildren[day]) adminChildren[day] = [];
    const row = document.createElement('div');
    row.className = 'day-row';
    row.innerHTML = `
      <div class="day-label" style="color:${DAY_COLORS[day]}">${day}曜日</div>
      <div class="child-tags" id="tags-${day}"></div>
      <div class="add-child-row">
        <input class="add-child-input" id="newinput-${day}" placeholder="児童名を入力" type="text">
        <button class="add-btn" onclick="addChild('${day}')">＋追加</button>
      </div>
    `;
    section.appendChild(row);
    renderDayTags(day);

    setTimeout(() => {
      const inp = document.getElementById('newinput-'+day);
      if(inp) inp.addEventListener('keydown', e => { if(e.key === 'Enter') addChild(day); });
    }, 0);
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'admin-save-btn';
  saveBtn.textContent = '💾 設定を保存する';
  saveBtn.onclick = saveAdminSettings;
  section.appendChild(saveBtn);
  content.appendChild(section);
}

function renderDayTags(day){
  const container = document.getElementById('tags-'+day);
  if(!container) return;
  container.innerHTML = (adminChildren[day]||[]).map((name, i) =>
    `<div class="child-tag">${escHtml(name)}<button class="child-tag-del" onclick="removeChild('${day}',${i})">✕</button></div>`
  ).join('');
}

function addChild(day){
  const inp = document.getElementById('newinput-'+day);
  const name = inp.value.trim();
  if(!name) return;
  if(!adminChildren[day]) adminChildren[day] = [];
  if(!adminChildren[day].includes(name)){
    adminChildren[day].push(name);
    renderDayTags(day);
  }
  inp.value = '';
  inp.focus();
}

function removeChild(day, idx){
  adminChildren[day].splice(idx, 1);
  renderDayTags(day);
}

function saveAdminSettings(){
  saveChildren(adminChildren);
  const btn = document.querySelector('.admin-save-btn');
  btn.textContent = '✅ 保存しました！';
  setTimeout(() => { btn.textContent = '💾 設定を保存する'; }, 2000);
}

// ======== 印刷 ========
let currentDetailDate = '';

function printDetail(){
  const recs = loadData(currentDetailDate) || [];
  const area = document.getElementById('print-area');

  const colWidths = ['14%','14%','18%','18%','18%','18%'];
  const headers   = ['児童名','体調チェック','体調・様子','トラブル・対応','保護者連絡事項','翌日申し送り'];
  const fieldKeys = ['status','trouble','parent','next'];

  const headerCols = headers.map((h,i) =>
    `<th style="width:${colWidths[i]}">${h}</th>`
  ).join('');

  const rows = recs.map(rec => {
    const checksStr = rec.checks.length > 0
      ? `<div class="print-check-list">▶ ${rec.checks.join('　')}</div>` : '';
    const fieldCells = fieldKeys.map(key => {
      const logs = rec.logs && rec.logs[key] || [];
      if(logs.length === 0) return `<td><span class="print-none">―</span></td>`;
      const entries = logs.map(l =>
        `<div class="print-log-entry"><span class="print-log-meta">[${escHtml(l.staff)} ${l.time}]</span> ${escHtml(l.text)}</div>`
      ).join('');
      return `<td>${entries}</td>`;
    }).join('');

    return `<tr>
      <td><span class="print-child-name">${escHtml(rec.childName)}</span></td>
      <td>${checksStr || '<span class="print-none">―</span>'}</td>
      ${fieldCells}
    </tr>`;
  }).join('');

  area.innerHTML = `
    <div class="print-header">
      <h1>申し送り記録</h1>
      <p>プロラボ加古川校　${formatDate(currentDetailDate)}</p>
    </div>
    <table class="print-table">
      <thead><tr>${headerCols}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="print-footer">印刷日時：${new Date().toLocaleString('ja-JP')}</div>
  `;

  area.style.display = 'block';
  window.print();
  area.style.display = 'none';
}

// ======== Service Worker登録 ========
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registered'))
      .catch(e => console.log('SW error:', e));
  });
}

// ======== 初期化 ========
buildLoginUI();
