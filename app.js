// ======== 音声入力 ========
let recognition = null;
let micActive = false;
let currentMicBtn = null;
let currentMicTarget = null;

function initSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return false;
  recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? final += t : interim += t;
    }
    if (currentMicTarget) {
      const base = currentMicTarget.dataset.base || '';
      currentMicTarget.value = base + final + interim;
      if (final) currentMicTarget.dataset.base = base + final;
    }
  };

  recognition.onend = () => {
    // 録音中フラグが立っていれば自動再開（ブラウザが途中で止めることがあるため）
    if (micActive) {
      try { recognition.start(); } catch(e) {}
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      alert('マイクへのアクセスが拒否されました。\nブラウザの設定でマイクを許可してください。');
      stopMic();
    } else if (e.error !== 'aborted') {
      console.warn('音声認識エラー:', e.error);
    }
  };
  return true;
}

function toggleMic(btn, targetId) {
  // 別のマイクが動いていたら先に止める
  if (currentMicBtn && currentMicBtn !== btn) stopMic();

  if (micActive && currentMicBtn === btn) {
    // 同じボタンを押したら停止
    stopMic();
  } else {
    // 新たに開始
    if (!recognition && !initSpeech()) {
      btn.insertAdjacentHTML('afterend','<span class="mic-not-supported">このブラウザは音声入力非対応です</span>');
      return;
    }
    const ta = document.getElementById(targetId);
    if (!ta) return;
    currentMicBtn = btn;
    currentMicTarget = ta;
    currentMicTarget.dataset.base = ta.value;
    micActive = true;
    btn.classList.add('recording');
    btn.title = '録音中…もう一度押すと停止';
    try { recognition.start(); } catch(e) {}
  }
}

function stopMic() {
  micActive = false;
  if (recognition) { try { recognition.stop(); } catch(e) {} }
  if (currentMicBtn) {
    currentMicBtn.classList.remove('recording');
    currentMicBtn.title = '音声入力（押してON／もう一度押してOFF）';
  }
  if (currentMicTarget) currentMicTarget.dataset.base = '';
  currentMicBtn = null;
  currentMicTarget = null;
}

// ======== GAS連携設定 ========
// デプロイ後にここを書き換えてください
const GAS_URL = 'ここにGASのデプロイURLを貼り付け';

async function gasGet(params) {
  const url = GAS_URL + '?' + new URLSearchParams(params);
  const res = await fetch(url);
  return res.json();
}
async function gasPost(body) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  });
  return res.json();
}
function isGasReady() {
  return GAS_URL && GAS_URL !== 'ここにGASのデプロイURLを貼り付け';
}

// ======== マスターデータ ========
const DAYS = ["月","火","水","木","金","土"];
const DAY_COLORS = {"月":"#3498db","火":"#e67e22","水":"#27ae60","木":"#9b59b6","金":"#e74c3c","土":"#1abc9c"};
const DEFAULT_STAFF = [
  {name:"佐伯",  password:"1111", isAdmin:true},
  {name:"田中",  password:"2222", isAdmin:false},
  {name:"山本",  password:"3333", isAdmin:false},
  {name:"鈴木",  password:"4444", isAdmin:false},
  {name:"伊藤",  password:"5555", isAdmin:false},
  {name:"渡辺",  password:"6666", isAdmin:false},
  {name:"中村",  password:"7777", isAdmin:false},
  {name:"小林",  password:"8888", isAdmin:false},
  {name:"加藤",  password:"9999", isAdmin:false},
  {name:"吉田",  password:"0000", isAdmin:false},
];
const DEFAULT_CHILDREN = {
  "月":["山田 太郎","鈴木 花子","中村 健太"],
  "火":["小林 さくら","伊藤 蓮","山田 太郎"],
  "水":["中村 健太","田中 葵"],
  "木":["鈴木 花子","伊藤 蓮","小林 さくら"],
  "金":["山田 太郎","田中 葵","中村 健太"],
  "土":["鈴木 花子"],
};
const DEFAULT_PRESETS = {
  status: ["元気に過ごせた","落ち着きがあった","落ち着きがなかった","体調不良気味","機嫌が良かった","機嫌が悪かった","疲れ気味だった"],
  trouble:["トラブルなし","友人とのトラブル→声かけで解決","友人とのトラブル→スタッフ介入","暴言あり→クールダウン対応","パニックあり→別室で落ち着かせた","物を投げる→制止し落ち着かせた"],
  parent: ["特になし","体調について報告済み","忘れ物あり・伝達済み","薬の残量を伝達","送迎時間の変更あり","欠席連絡あり"],
  next:   ["特になし","引き続き様子観察","保護者へ要連絡","翌日通院予定","翌日欠席予定","支援計画の見直し検討"],
};
const CHECK_OPTIONS = ["良好","体調不良","気分ムラ","トラブルあり","保護者連絡要"];
const GOOD_SET = new Set(["良好"]);
const FIELDS = [
  {key:"status", label:"体調・様子",       ph:"自由記述または定型文を選択"},
  {key:"trouble",label:"トラブル・対応記録",ph:"自由記述または定型文を選択"},
  {key:"parent", label:"保護者への連絡事項",ph:"自由記述または定型文を選択"},
  {key:"next",   label:"翌日以降の申し送り",ph:"自由記述または定型文を選択"},
];

// ======== ユーティリティ ========
function pad(n){return String(n).padStart(2,'0');}
function todayStr(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function todayDow(){return ["日","月","火","水","木","金","土"][new Date().getDay()];}
function formatDate(str){
  if(!str)return"";
  const[y,m,d]=str.split("-");
  const dow=["日","月","火","水","木","金","土"][new Date(str).getDay()];
  return`${y}年${m}月${d}日（${dow}）`;
}
function nowTime(){const n=new Date();return`${pad(n.getHours())}:${pad(n.getMinutes())}`;}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ======== ストレージ ========
function getStaff(){return JSON.parse(localStorage.getItem('staff')||'null')||DEFAULT_STAFF;}
function saveStaff(a){localStorage.setItem('staff',JSON.stringify(a));}
function getChildren(){return JSON.parse(localStorage.getItem('children')||'null')||DEFAULT_CHILDREN;}
function saveChildren(o){localStorage.setItem('children',JSON.stringify(o));}
function getPresets(){return JSON.parse(localStorage.getItem('presets')||'null')||DEFAULT_PRESETS;}
function savePresets(o){localStorage.setItem('presets',JSON.stringify(o));}
function loadData(date){ try{ const r=localStorage.getItem('申し送り_'+date); return r?JSON.parse(r):null; }catch{return null;} }
function storeData(date,data){ localStorage.setItem('申し送り_'+date,JSON.stringify(data)); }
function getSavedDates(){ const d=[]; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k&&k.startsWith('申し送り_'))d.push(k.replace('申し送り_',''));} return d.sort().reverse(); }
function getNoticeData(date){ try{ return JSON.parse(localStorage.getItem('notice_'+date)||'{"msg":[],"visitor":[]}'); }catch{return{msg:[],visitor:[]};} }
function saveNoticeData(date,o){ localStorage.setItem('notice_'+date,JSON.stringify(o)); }
function getHandoverData(date){ try{ return JSON.parse(localStorage.getItem('handover_'+date)||'null'); }catch{return null;} }
function saveHandoverData(date,o){ localStorage.setItem('handover_'+date,JSON.stringify(o)); }

// GAS対応：読み込み（GAS優先・ローカル fallback）
async function loadDataRemote(date){
  if(!isGasReady()) return loadData(date);
  try{
    const r=await gasGet({action:'getRecords',date});
    if(r.ok&&r.data!==null){ storeData(date,r.data); return r.data; }
  }catch(e){ console.warn('GAS getRecords失敗、ローカル使用',e); }
  return loadData(date);
}
async function loadNoticeRemote(date){
  if(!isGasReady()) return getNoticeData(date);
  try{
    const r=await gasGet({action:'getNotice',date});
    if(r.ok){ localStorage.setItem('notice_'+date,JSON.stringify(r.data)); return r.data; }
  }catch(e){ console.warn('GAS getNotice失敗',e); }
  return getNoticeData(date);
}
async function loadHandoverRemote(date){
  if(!isGasReady()) return getHandoverData(date);
  try{
    const r=await gasGet({action:'getHandover',date});
    if(r.ok){ localStorage.setItem('handover_'+date,JSON.stringify(r.data)); return r.data; }
  }catch(e){ console.warn('GAS getHandover失敗',e); }
  return getHandoverData(date);
}
async function getDatesRemote(){
  if(!isGasReady()) return getSavedDates();
  try{
    const r=await gasGet({action:'getDates'});
    if(r.ok) return r.data;
  }catch(e){ console.warn('GAS getDates失敗',e); }
  return getSavedDates();
}

// ======== 状態 ========
let currentStaff=null,records=[],adminChildren={},adminStaff=[],adminPresets={};
let currentDetailDate='',currentMonthlyData=null,currentChildName='';
const today=todayStr(),todayDay=todayDow();

// ======== 画面切替 ========
function showScreen(name){
  ['login','main','history','detail','admin','monthly','childlist','childpage'].forEach(s=>{
    document.getElementById(s+'-screen').classList.toggle('hidden',s!==name);
  });
}

// ======== ログイン ========
function buildLoginUI(){
  const staff=getStaff();
  const sel=document.getElementById('login-name');
  sel.innerHTML='<option value="">選択してください</option>';
  staff.forEach(s=>{const o=document.createElement('option');o.value=s.name;o.textContent=s.name;sel.appendChild(o);});
  document.getElementById('login-note').innerHTML='※デモ用パスワード：'+staff.map(s=>`${s.name}=${s.password}`).join(' / ');
}
function doLogin(){
  const name=document.getElementById('login-name').value;
  const pass=document.getElementById('login-pass').value;
  const staff=getStaff().find(s=>s.name===name&&s.password===pass);
  if(staff){currentStaff=staff;document.getElementById('login-error').textContent='';initMain();showScreen('main');}
  else document.getElementById('login-error').textContent='名前またはパスワードが違います';
}
document.getElementById('login-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
function doLogout(){currentStaff=null;document.getElementById('login-pass').value='';buildLoginUI();showScreen('login');}

// ======== メイン ========
async function initMain(){
  document.getElementById('main-date-label').textContent=formatDate(today)+'　'+todayDay+'曜日';
  document.getElementById('main-staff-name').textContent='👤 '+currentStaff.name;
  document.getElementById('admin-btn').classList.toggle('hidden',!currentStaff.isAdmin);
  showSyncStatus('読み込み中…');
  const children=getChildren(),todayChildren=children[todayDay]||[];
  const saved=await loadDataRemote(today);
  if(saved){
    records=[...saved];
    const savedNames=saved.map(r=>r.childName);
    todayChildren.forEach(name=>{if(!savedNames.includes(name))records.push(emptyRecord(name));});
  } else {
    records=todayChildren.map(emptyRecord);
  }
  const noticeData=await loadNoticeRemote(today);
  localStorage.setItem('notice_'+today,JSON.stringify(noticeData));
  const handoverData=await loadHandoverRemote(today);
  localStorage.setItem('handover_'+today,JSON.stringify(handoverData));
  hideSyncStatus();
  renderNotice();renderHandover();renderCards();
}
function emptyRecord(name){
  return{childName:name,checks:[],logs:{status:[],trouble:[],parent:[],next:[]},contactDone:false,contactDoneBy:''};
}

// ======== 全体共有欄 ========
function renderNotice(){
  const data=getNoticeData(today);
  ['msg','visitor'].forEach(type=>{
    const box=document.getElementById('notice-log-'+type);
    const logs=data[type]||[];
    box.innerHTML=logs.length===0
      ?'<span class="log-empty">まだ記録がありません</span>'
      :logs.map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
  });
}
function toggleNotice(){
  document.getElementById('notice-body').classList.toggle('hidden');
  document.getElementById('notice-arrow').textContent=document.getElementById('notice-body').classList.contains('hidden')?'▼':'▲';
}
function appendNotice(type){
  const ta=document.getElementById('notice-input-'+type);
  const text=ta.value.trim();if(!text){ta.focus();return;}
  const data=getNoticeData(today);
  if(!data[type])data[type]=[];
  data[type].push({staff:currentStaff.name,time:nowTime(),text});
  saveNoticeData(today,data);ta.value='';renderNotice();
  if(isGasReady()) gasPost({action:'saveNotice',date:today,data}).catch(e=>console.warn('notice sync失敗',e));
}

// ======== 引継ぎフラグ ========
function renderHandover(){
  const data=getHandoverData(today);
  const statusEl=document.getElementById('handover-status');
  const btn=document.getElementById('handover-btn');
  if(data&&data.confirmed){
    statusEl.innerHTML=`✅ <strong>${escHtml(data.staff)}</strong> が ${data.time} に引継ぎ確認済みです`;
    btn.textContent='確認を取り消す';btn.className='handover-btn confirmed';
  } else {
    statusEl.innerHTML='引継ぎ確認：<span style="color:#e74c3c">未確認</span>';
    btn.textContent='✅ 引継ぎ確認済み';btn.className='handover-btn unconfirmed';
  }
}
function toggleHandover(){
  const data=getHandoverData(today);
  const next=data&&data.confirmed?null:{confirmed:true,staff:currentStaff.name,time:nowTime()};
  saveHandoverData(today,next);
  if(isGasReady()) gasPost({action:'saveHandover',date:today,data:next}).catch(e=>console.warn('handover sync失敗',e));
  renderHandover();
}

// ======== カード描画 ========
function renderCards(){
  const list=document.getElementById('card-list');
  list.innerHTML='';
  if(records.length===0){
    list.innerHTML=`<div class="empty-msg">本日（${todayDay}曜日）の登録児童がいません。<br>管理者設定から追加してください。</div>`;
    return;
  }
  records.forEach((rec,idx)=>list.appendChild(buildCard(rec,idx)));
}

function buildCard(rec,idx){
  const isAlert=rec.checks.some(c=>['トラブルあり','保護者連絡要','体調不良'].includes(c));
  const card=document.createElement('div');
  card.className='child-card'+(isAlert?' alert':'');
  const tagsHtml=rec.checks.map(c=>`<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`).join('');
  const allLogs=FIELDS.flatMap(f=>rec.logs[f.key]||[]);
  const updaters=[...new Set(allLogs.map(l=>l.staff))];
  const updaterHtml=updaters.length>0?`<span class="staff-tag">${updaters.join('・')}</span>`:'';

  const fieldSections=FIELDS.map(f=>{
    const logs=rec.logs[f.key]||[];
    const summary=logs.length>0?logs[logs.length-1].text.slice(0,20)+(logs[logs.length-1].text.length>20?'…':''):'未記入';
    const presets=getPresets()[f.key]||[];
    const presetHtml=presets.length>0
      ?`<div class="preset-row">${presets.map((p,pi)=>`<button class="preset-btn" onclick="selectPreset(${idx},'${f.key}',${pi})">${escHtml(p)}</button>`).join('')}</div>`:'';
    const isParent=f.key==='parent';
    const doneBtn=isParent?`
      <div class="contact-done-row">
        <button class="contact-done-btn ${rec.contactDone?'done':'undone'}" id="cdone-${idx}" onclick="toggleContactDone(${idx})">
          ${rec.contactDone?'✅ 連絡済み':'連絡済みにする'}
        </button>
        <span class="contact-done-label" id="cdone-label-${idx}">${rec.contactDone&&rec.contactDoneBy?`（${escHtml(rec.contactDoneBy)}）`:''}</span>
      </div>`:'';
    return `
      <div class="form-section">
        <div class="field-header" onclick="toggleField(this)">
          <span class="field-header-label">${f.label}</span>
          <div class="field-header-right">
            <span class="field-summary" id="fsummary-${f.key}-${idx}">${escHtml(summary)}</span>
            <span class="field-arrow">▼</span>
          </div>
        </div>
        <div class="field-body" id="fbody-${f.key}-${idx}">
          ${presetHtml}
          <div class="log-box" id="log-${f.key}-${idx}">${renderLog(logs)}</div>
          <div class="textarea-row">
            <textarea id="input-${f.key}-${idx}" rows="2" placeholder="${f.ph}"></textarea>
            <button class="mic-btn" id="mic-${f.key}-${idx}" title="音声入力（押してON／もう一度押してOFF）"
              onclick="toggleMic(this,'input-${f.key}-${idx}')">🎤</button>
          </div>
          <button class="append-btn" onclick="appendLog(${idx},'${f.key}')">✏️ 追記する</button>
          ${doneBtn}
        </div>
      </div>`;
  }).join('');

  card.innerHTML=`
    <div class="card-header" onclick="toggleCard(${idx})">
      <div class="card-left">
        <span class="child-icon">👦</span>
        <span class="child-name">${escHtml(rec.childName)}</span>
        <div class="tag-row">${tagsHtml}${rec.contactDone?'<span class="tag tag-done">📞済</span>':''}</div>
      </div>
      <div class="card-right">${updaterHtml}<span class="arrow" id="arrow-${idx}">▼</span></div>
    </div>
    <div class="card-body" id="body-${idx}">
      <div class="form-section">
        <div class="form-label">体調チェック</div>
        <div class="check-row" id="checks-${idx}">
          ${CHECK_OPTIONS.map(opt=>{
            const active=rec.checks.includes(opt);
            return`<button class="check-btn ${active?(GOOD_SET.has(opt)?'active-good':'active-bad'):''}" onclick="toggleCheck(${idx},'${opt}')">${opt}</button>`;
          }).join('')}
        </div>
      </div>
      ${fieldSections}
    </div>`;
  return card;
}

function renderLog(logs){
  if(!logs||logs.length===0)return'<span class="log-empty">まだ記録がありません</span>';
  return logs.map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
}

// ======== 項目の開閉 ========
function toggleField(header){
  const body=header.nextElementSibling;
  const arrow=header.querySelector('.field-arrow');
  const isOpen=body.classList.toggle('open');
  arrow.textContent=isOpen?'▲':'▼';
}

// ======== 定型文選択 ========
function selectPreset(idx,key,pi){
  const presets=getPresets()[key]||[];
  const text=presets[pi];if(!text)return;
  const ta=document.getElementById(`input-${key}-${idx}`);
  ta.value=text;ta.focus();
}

// ======== 保護者連絡済み ========
function toggleContactDone(idx){
  const rec=records[idx];
  rec.contactDone=!rec.contactDone;
  rec.contactDoneBy=rec.contactDone?`${currentStaff.name} ${nowTime()}`:'';
  document.getElementById('cdone-'+idx).textContent=rec.contactDone?'✅ 連絡済み':'連絡済みにする';
  document.getElementById('cdone-'+idx).className='contact-done-btn '+(rec.contactDone?'done':'undone');
  document.getElementById('cdone-label-'+idx).textContent=rec.contactDone&&rec.contactDoneBy?`（${escHtml(rec.contactDoneBy)}）`:'';
  const cards=document.querySelectorAll('.child-card');
  const tagRow=cards[idx].querySelector('.tag-row');
  const existingDone=tagRow.querySelector('.tag-done');
  if(rec.contactDone&&!existingDone)tagRow.insertAdjacentHTML('beforeend','<span class="tag tag-done">📞済</span>');
  if(!rec.contactDone&&existingDone)existingDone.remove();
}

// ======== チェック ========
function toggleCheck(idx,label){
  const rec=records[idx];
  rec.checks.includes(label)?rec.checks=rec.checks.filter(c=>c!==label):rec.checks.push(label);
  document.getElementById('checks-'+idx).innerHTML=CHECK_OPTIONS.map(opt=>{
    const active=rec.checks.includes(opt);
    return`<button class="check-btn ${active?(GOOD_SET.has(opt)?'active-good':'active-bad'):''}" onclick="toggleCheck(${idx},'${opt}')">${opt}</button>`;
  }).join('');
  const cards=document.querySelectorAll('.child-card');
  const isAlert=rec.checks.some(c=>['トラブルあり','保護者連絡要','体調不良'].includes(c));
  cards[idx].classList.toggle('alert',isAlert);
  cards[idx].querySelector('.tag-row').innerHTML=rec.checks.map(c=>`<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`).join('')+(rec.contactDone?'<span class="tag tag-done">📞済</span>':'');
}

// ======== 追記 ========
function appendLog(idx,key){
  const ta=document.getElementById(`input-${key}-${idx}`);
  const text=ta.value.trim();if(!text){ta.focus();return;}
  if(!records[idx].logs[key])records[idx].logs[key]=[];
  records[idx].logs[key].push({staff:currentStaff.name,time:nowTime(),text});
  ta.value='';
  document.getElementById(`log-${key}-${idx}`).innerHTML=renderLog(records[idx].logs[key]);
  // サマリー更新
  document.getElementById(`fsummary-${key}-${idx}`).textContent=text.slice(0,20)+(text.length>20?'…':'');
}
function toggleCard(idx){
  const body=document.getElementById('body-'+idx);
  document.getElementById('arrow-'+idx).textContent=body.classList.toggle('open')?'▲':'▼';
}

// ======== 保存 ========
async function saveRecords(){
  storeData(today,records);
  const btn=document.getElementById('save-btn');
  btn.textContent='保存中…';btn.classList.add('flash');
  if(isGasReady()){
    try{
      await gasPost({action:'saveRecords',date:today,data:records});
      // 全体共有・引継ぎも同時同期
      await gasPost({action:'saveNotice',date:today,data:getNoticeData(today)});
      await gasPost({action:'saveHandover',date:today,data:getHandoverData(today)});
      btn.textContent='✅ 保存・同期しました！';
    }catch(e){
      console.warn('GAS保存失敗',e);
      btn.textContent='⚠️ ローカルのみ保存';
    }
  } else {
    btn.textContent='✅ 保存しました（ローカル）';
  }
  setTimeout(()=>{btn.textContent='💾 保存する';btn.classList.remove('flash');},2500);
}

// ======== 児童一覧 ========
function openChildList(){
  const list=document.getElementById('childlist-list');
  list.innerHTML='';
  // 全日付から全児童名を収集
  const dates=getSavedDates();
  const nameMap={}; // name -> {dates, lastChecks}
  dates.forEach(date=>{
    const recs=loadData(date)||[];
    recs.forEach(r=>{
      if(!nameMap[r.childName])nameMap[r.childName]={count:0,lastDate:'',alerts:0};
      nameMap[r.childName].count++;
      if(!nameMap[r.childName].lastDate||date>nameMap[r.childName].lastDate)nameMap[r.childName].lastDate=date;
      if(r.checks.some(c=>['トラブルあり','保護者連絡要','体調不良'].includes(c)))nameMap[r.childName].alerts++;
    });
  });
  const names=Object.keys(nameMap).sort();
  if(names.length===0){
    list.innerHTML='<div class="empty-msg">記録が見つかりません</div>';
    showScreen('childlist');return;
  }
  names.forEach(name=>{
    const info=nameMap[name];
    const item=document.createElement('div');
    item.className='child-list-item';
    item.innerHTML=`
      <div>
        <div class="child-list-name">👦 ${escHtml(name)}</div>
        <div class="child-list-meta">記録${info.count}件　最終：${formatDate(info.lastDate)}${info.alerts>0?`　⚠ 要注意${info.alerts}件`:''}</div>
      </div>
      <span class="arrow">▶</span>`;
    item.onclick=()=>openChildPage(name);
    list.appendChild(item);
  });
  showScreen('childlist');
}

// ======== 児童個人ページ ========
function openChildPage(name){
  currentChildName=name;
  document.getElementById('childpage-title').textContent='👦 '+name;
  const dates=getSavedDates();
  const list=document.getElementById('childpage-list');
  list.innerHTML='';
  const entries=[];
  dates.forEach(date=>{
    const recs=loadData(date)||[];
    const rec=recs.find(r=>r.childName===name);
    if(rec)entries.push({date,rec});
  });
  if(entries.length===0){
    list.innerHTML='<div class="empty-msg">この児童の記録がありません</div>';
    showScreen('childpage');return;
  }
  entries.forEach(({date,rec})=>{
    const isAlert=rec.checks.some(c=>['トラブルあり','保護者連絡要','体調不良'].includes(c));
    const card=document.createElement('div');
    card.className='childpage-entry'+(isAlert?' alert':'');
    const tagsHtml=rec.checks.map(c=>`<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`).join('');
    const fieldsHtml=FIELDS.map(f=>{
      const logs=rec.logs&&rec.logs[f.key]||[];
      if(!logs.length)return'';
      return`<div class="childpage-field">
        <div class="childpage-field-label">${f.label}</div>
        ${logs.map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('')}
      </div>`;
    }).join('');
    card.innerHTML=`
      <div class="childpage-date">${formatDate(date)}</div>
      <div class="tag-row" style="margin-bottom:6px">${tagsHtml}${rec.contactDone?'<span class="tag tag-done">📞済</span>':''}</div>
      ${fieldsHtml||'<span style="color:#bbb;font-size:13px">記録なし</span>'}`;
    list.appendChild(card);
  });
  showScreen('childpage');
}

// ======== 印刷（児童個人） ========
function printChildPage(){
  const name=currentChildName;
  const dates=getSavedDates();
  const entries=[];
  dates.forEach(date=>{
    const recs=loadData(date)||[];
    const rec=recs.find(r=>r.childName===name);
    if(rec)entries.push({date,rec});
  });
  const area=document.getElementById('print-area');
  const entriesHtml=entries.map(({date,rec})=>{
    const checksStr=rec.checks.length>0?`<div class="print-check-list">▶ ${rec.checks.join('　')}</div>`:'';
    const fieldsHtml=FIELDS.map(f=>{
      const logs=rec.logs&&rec.logs[f.key]||[];
      if(!logs.length)return'';
      return`<div style="margin-top:6px"><span style="font-size:8pt;font-weight:700;color:#555">${f.label}：</span>${logs.map(l=>`<span class="print-log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}`).join('<br>')}</div>`;
    }).join('');
    return`<div class="print-child-date-entry">
      <div class="print-child-date-label">${formatDate(date)}</div>
      ${checksStr}${fieldsHtml||'<span class="print-none">記録なし</span>'}
      ${rec.contactDone?'<div class="print-contact-done">📞 保護者連絡済</div>':''}
    </div>`;
  }).join('');
  area.innerHTML=`
    <div class="print-header"><h1>児童別記録</h1><p>プロラボ加古川校　${escHtml(name)}</p></div>
    <div class="print-child-section">${entriesHtml}</div>
    <div class="print-footer">印刷日時：${new Date().toLocaleString('ja-JP')}</div>`;
  area.style.display='block';window.print();area.style.display='none';
}

// ======== 履歴 ========
async function openHistory(){
  const list=document.getElementById('history-list');
  list.innerHTML='<div class="empty-msg">読み込み中…</div>';
  showScreen('history');
  const dates=await getDatesRemote();
  list.innerHTML='';
  const months=[...new Set(dates.map(d=>d.slice(0,7)))].sort().reverse();
  list.insertAdjacentHTML('afterbegin',`
    <div class="monthly-selector">
      <label>月次まとめ：</label>
      <select id="month-select">${months.map(m=>`<option value="${m}">${m.replace('-','年')}月</option>`).join('')}</select>
      <button onclick="openMonthly(document.getElementById('month-select').value)">📊 表示</button>
    </div>`);
  if(dates.length===0){
    list.insertAdjacentHTML('beforeend','<div class="empty-msg">保存された記録がありません</div>');
  } else {
    dates.forEach(date=>{
      const recs=loadData(date)||[];
      const alertCount=recs.filter(r=>r.checks&&r.checks.some(c=>['トラブルあり','保護者連絡要','体調不良'].includes(c))).length;
      const handover=getHandoverData(date);
      const handoverHtml=handover&&handover.confirmed?'<span style="color:#27ae60">✅ 引継確認済</span>':'<span style="color:#e74c3c">⚠ 引継未確認</span>';
      const item=document.createElement('div');
      item.className='history-item';
      item.innerHTML=`
        <div class="history-item-left">
          <span class="history-date">${formatDate(date)}</span>
          <div class="history-meta">
            <span>👦 ${recs.length}名</span>
            ${alertCount>0?`<span style="color:#e74c3c">⚠ 要注意${alertCount}名</span>`:''}
            ${handoverHtml}
          </div>
        </div>
        <div class="history-right"><span class="arrow">▶</span></div>`;
      item.onclick=()=>openDetail(date);
      list.appendChild(item);
    });
  }
}

// ======== 同期ステータス表示 ========
function showSyncStatus(msg){
  let el=document.getElementById('sync-status');
  if(!el){
    el=document.createElement('div');el.id='sync-status';
    el.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#1a3a5c;color:#fff;padding:6px 18px;border-radius:20px;font-size:13px;z-index:999;box-shadow:0 2px 8px rgba(0,0,0,0.2)';
    document.body.appendChild(el);
  }
  el.textContent=msg;el.style.display='block';
}
function hideSyncStatus(){
  const el=document.getElementById('sync-status');
  if(el)el.style.display='none';
}

// ======== 詳細 ========
async function openDetail(date){
  currentDetailDate=date;
  document.getElementById('detail-date-label').textContent=formatDate(date);
  showScreen('detail');
  const list=document.getElementById('detail-list');
  list.innerHTML='<div class="empty-msg">読み込み中…</div>';
  const recs=await loadDataRemote(date)||[];
  const notice=await loadNoticeRemote(date);
  const handover=await loadHandoverRemote(date);
  list.innerHTML='';
  const hasMsgs=(notice.msg||[]).length>0,hasVisitors=(notice.visitor||[]).length>0;
  if(hasMsgs||hasVisitors){
    const nc=document.createElement('div');nc.className='detail-notice';
    nc.innerHTML=`<div class="detail-notice-title">📢 全体共有事項</div>`;
    if(hasMsgs)nc.innerHTML+=`<div class="detail-notice-sub">📌 伝達事項</div>`+(notice.msg||[]).map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
    if(hasVisitors)nc.innerHTML+=`<div class="detail-notice-sub">🚪 来客予定</div>`+(notice.visitor||[]).map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
    list.appendChild(nc);
  }
  if(handover&&handover.confirmed){
    const hc=document.createElement('div');hc.className='detail-handover';
    hc.textContent=`✅ ${handover.staff} が ${handover.time} に引継ぎを確認しました`;
    list.appendChild(hc);
  }
  recs.forEach(rec=>{
    const card=document.createElement('div');card.className='detail-card';
    const tagsHtml=(rec.checks||[]).map(c=>`<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`).join('');
    const fieldsHtml=FIELDS.map(f=>{
      const logs=rec.logs&&rec.logs[f.key]||[];if(!logs.length)return'';
      const badge=(f.key==='parent'&&rec.contactDone)?'<span class="tag tag-done" style="margin-left:6px">📞連絡済</span>':'';
      return`<div class="detail-row"><span class="detail-label">${f.label}${badge}</span>${logs.map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('')}</div>`;
    }).join('');
    card.innerHTML=`<div class="detail-name">👦 ${escHtml(rec.childName)}</div><div class="tag-row" style="margin-bottom:6px">${tagsHtml}${rec.contactDone?'<span class="tag tag-done">📞済</span>':''}</div>${fieldsHtml||'<span style="color:#bbb;font-size:13px">記録なし</span>'}`;
    list.appendChild(card);
  });
}

// ======== 月次まとめ ========
function openMonthly(ym){
  if(!ym)return;
  document.getElementById('monthly-label').textContent=ym.replace('-','年')+'月';
  const dates=getSavedDates().filter(d=>d.startsWith(ym));
  const list=document.getElementById('monthly-list');list.innerHTML='';
  const allNames=new Set(),dateMap={};
  dates.forEach(date=>{const recs=loadData(date)||[];dateMap[date]=recs;recs.forEach(r=>allNames.add(r.childName));});
  if(allNames.size===0){list.innerHTML='<div class="empty-msg">この月の記録がありません</div>';showScreen('monthly');return;}
  currentMonthlyData={ym,dates,dateMap,allNames:[...allNames].sort()};
  currentMonthlyData.allNames.forEach(name=>{
    const card=document.createElement('div');card.className='monthly-child-card';
    const entries=dates.map(date=>{
      const rec=(dateMap[date]||[]).find(r=>r.childName===name);if(!rec)return'';
      const checksStr=rec.checks.length>0?`<div style="font-size:11px;color:#e74c3c">${rec.checks.join('　')}</div>`:'';
      const logsStr=FIELDS.map(f=>{const logs=rec.logs&&rec.logs[f.key]||[];if(!logs.length)return'';return`<div style="margin-top:4px"><span style="font-size:11px;font-weight:700;color:#555">${f.label}：</span>${logs.map(l=>`<span style="font-size:12px">[${escHtml(l.staff)}]${escHtml(l.text)}</span>`).join(' ')}</div>`;}).filter(Boolean).join('');
      if(!checksStr&&!logsStr)return'';
      return`<div class="monthly-date-entry"><div class="monthly-date-label">${formatDate(date)}</div>${checksStr}${logsStr}${rec.contactDone?'<div style="font-size:11px;color:#27ae60;margin-top:2px">📞 保護者連絡済</div>':''}</div>`;
    }).filter(Boolean).join('');
    card.innerHTML=`<div class="monthly-child-name">👦 ${escHtml(name)}</div>${entries||'<span style="color:#bbb;font-size:13px">この月の記録なし</span>'}`;
    list.appendChild(card);
  });
  showScreen('monthly');
}

// ======== 印刷（詳細） ========
function printDetail(){
  const date=currentDetailDate,recs=loadData(date)||[];
  const notice=getNoticeData(date),handover=getHandoverData(date);
  const area=document.getElementById('print-area');
  const hasMsgs=(notice.msg||[]).length>0,hasVisitors=(notice.visitor||[]).length>0;
  let noticeHtml='';
  if(hasMsgs||hasVisitors){
    noticeHtml=`<div class="print-notice"><div class="print-notice-title">📢 全体共有事項</div>`;
    if(hasMsgs)noticeHtml+=`<div class="print-notice-sub">📌 伝達事項</div>`+(notice.msg||[]).map(l=>`<div class="print-log-entry"><span class="print-log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
    if(hasVisitors)noticeHtml+=`<div class="print-notice-sub">🚪 来客予定</div>`+(notice.visitor||[]).map(l=>`<div class="print-log-entry"><span class="print-log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
    noticeHtml+='</div>';
  }
  const handoverHtml=handover&&handover.confirmed?`<div class="print-handover">✅ ${escHtml(handover.staff)} が ${handover.time} に引継ぎを確認しました</div>`:'';
  const headers=['児童名','体調チェック','体調・様子','トラブル・対応','保護者連絡事項','翌日申し送り'];
  const colW=['13%','14%','18%','18%','18%','19%'];
  const rows=recs.map(rec=>{
    const checksStr=rec.checks.length>0?`<div class="print-check-list">▶ ${rec.checks.join('　')}</div>`:'';
    const fieldCells=['status','trouble','parent','next'].map(key=>{
      const logs=rec.logs&&rec.logs[key]||[],extra=(key==='parent'&&rec.contactDone)?'<div class="print-contact-done">📞 連絡済</div>':'';
      if(!logs.length)return`<td>${extra}<span class="print-none">―</span></td>`;
      return`<td>${extra}${logs.map(l=>`<div class="print-log-entry"><span class="print-log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('')}</td>`;
    }).join('');
    return`<tr><td><span class="print-child-name">${escHtml(rec.childName)}</span></td><td>${checksStr||'<span class="print-none">―</span>'}</td>${fieldCells}</tr>`;
  }).join('');
  area.innerHTML=`<div class="print-header"><h1>申し送り記録</h1><p>プロラボ加古川校　${formatDate(date)}</p></div>${noticeHtml}${handoverHtml}<table class="print-table"><thead><tr>${headers.map((h,i)=>`<th style="width:${colW[i]}">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="print-footer">印刷日時：${new Date().toLocaleString('ja-JP')}</div>`;
  area.style.display='block';window.print();area.style.display='none';
}

// ======== 印刷（月次） ========
function printMonthly(){
  if(!currentMonthlyData)return;
  const{ym,dates,dateMap,allNames}=currentMonthlyData;
  const area=document.getElementById('print-area');
  const childBlocks=allNames.map(name=>{
    const rows=dates.map(date=>{
      const rec=(dateMap[date]||[]).find(r=>r.childName===name);if(!rec)return'';
      const checksStr=rec.checks.join('　')||'―';
      const fieldCells=FIELDS.map(f=>{const logs=rec.logs&&rec.logs[f.key]||[];return`<td>${logs.map(l=>`[${escHtml(l.staff)}]${escHtml(l.text)}`).join('<br>')||'―'}</td>`;}).join('');
      return`<tr><td>${formatDate(date)}</td><td>${checksStr}</td>${fieldCells}</tr>`;
    }).filter(Boolean).join('');
    if(!rows)return'';
    return`<div class="print-monthly-child"><div class="print-monthly-name">👦 ${escHtml(name)}</div><table class="print-monthly-table"><thead><tr><th>日付</th><th>チェック</th>${FIELDS.map(f=>`<th>${f.label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }).filter(Boolean).join('');
  area.innerHTML=`<div class="print-header"><h1>月次まとめ</h1><p>プロラボ加古川校　${ym.replace('-','年')}月</p></div>${childBlocks}<div class="print-footer">印刷日時：${new Date().toLocaleString('ja-JP')}</div>`;
  area.style.display='block';window.print();area.style.display='none';
}

// ======== 管理者設定 ========
function openAdmin(){
  adminChildren=JSON.parse(JSON.stringify(getChildren()));
  adminStaff=JSON.parse(JSON.stringify(getStaff()));
  adminPresets=JSON.parse(JSON.stringify(getPresets()));
  renderAdmin();showScreen('admin');
}
function renderAdmin(){
  const content=document.getElementById('admin-content');content.innerHTML='';
  // スタッフ
  const ss=document.createElement('div');ss.className='admin-section';
  ss.innerHTML='<h3>👥 スタッフ管理</h3><div id="staff-list"></div>';
  ss.insertAdjacentHTML('beforeend',`<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><input class="add-child-input" id="new-staff-name" placeholder="名前" style="max-width:100px"><input class="add-child-input" id="new-staff-pass" placeholder="パスワード" style="max-width:120px"><button class="add-btn" onclick="addStaff()">＋追加</button></div><button class="admin-save-btn" style="margin-top:10px" onclick="saveAdminStaff()">💾 スタッフ設定を保存</button>`);
  content.appendChild(ss);renderStaffList();
  // 定型文
  const ps=document.createElement('div');ps.className='admin-section';ps.innerHTML='<h3>💬 定型文管理</h3>';
  FIELDS.forEach(f=>{
    const row=document.createElement('div');row.className='day-row';
    row.innerHTML=`<div class="day-label" style="color:#2980b9">${f.label}</div><div class="child-tags" id="ptags-${f.key}"></div><div class="add-child-row"><input class="add-child-input" id="pinput-${f.key}" placeholder="定型文を入力"><button class="add-btn" onclick="addPreset('${f.key}')">＋追加</button></div>`;
    ps.appendChild(row);renderPresetTags(f.key);
    setTimeout(()=>{const inp=document.getElementById('pinput-'+f.key);if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter')addPreset(f.key);});},0);
  });
  ps.insertAdjacentHTML('beforeend','<button class="admin-save-btn" onclick="saveAdminPresets()">💾 定型文を保存</button>');
  content.appendChild(ps);
  // 児童
  const cs=document.createElement('div');cs.className='admin-section';cs.innerHTML='<h3>📅 曜日別 児童設定</h3>';
  DAYS.forEach(day=>{
    if(!adminChildren[day])adminChildren[day]=[];
    const row=document.createElement('div');row.className='day-row';
    row.innerHTML=`<div class="day-label" style="color:${DAY_COLORS[day]}">${day}曜日</div><div class="child-tags" id="tags-${day}"></div><div class="add-child-row"><input class="add-child-input" id="newinput-${day}" placeholder="児童名を入力"><button class="add-btn" onclick="addChild('${day}')">＋追加</button></div>`;
    cs.appendChild(row);renderDayTags(day);
    setTimeout(()=>{const inp=document.getElementById('newinput-'+day);if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter')addChild(day);});},0);
  });
  cs.insertAdjacentHTML('beforeend','<button class="admin-save-btn" onclick="saveAdminChildren()">💾 児童設定を保存</button>');
  content.appendChild(cs);
}
function renderStaffList(){
  const list=document.getElementById('staff-list');if(!list)return;
  list.innerHTML=adminStaff.map((s,i)=>`<div class="admin-staff-row"><span class="admin-staff-name">${escHtml(s.name)}</span><input class="admin-staff-input" value="${escHtml(s.password)}" placeholder="パスワード" oninput="adminStaff[${i}].password=this.value" ${s.isAdmin?'style="background:#fff8e1"':''}>${s.isAdmin?'<span style="font-size:12px;color:#e65100">👑管理者</span>':`<button class="admin-staff-del" onclick="removeStaff(${i})">削除</button>`}</div>`).join('');
}
function addStaff(){
  const name=document.getElementById('new-staff-name').value.trim(),pass=document.getElementById('new-staff-pass').value.trim();
  if(!name||!pass){alert('名前とパスワードを入力してください');return;}
  if(adminStaff.find(s=>s.name===name)){alert('同じ名前のスタッフがすでにいます');return;}
  adminStaff.push({name,password:pass,isAdmin:false});
  document.getElementById('new-staff-name').value='';document.getElementById('new-staff-pass').value='';
  renderStaffList();
}
function removeStaff(idx){if(!confirm(`${adminStaff[idx].name} を削除しますか？`))return;adminStaff.splice(idx,1);renderStaffList();}
function saveAdminStaff(){saveStaff(adminStaff);flashBtn(0,'💾 スタッフ設定を保存');}
function renderPresetTags(key){
  const c=document.getElementById('ptags-'+key);if(!c)return;
  c.innerHTML=(adminPresets[key]||[]).map((p,i)=>`<div class="child-tag">${escHtml(p)}<button class="child-tag-del" onclick="removePreset('${key}',${i})">✕</button></div>`).join('');
}
function addPreset(key){
  const inp=document.getElementById('pinput-'+key),text=inp.value.trim();if(!text)return;
  if(!adminPresets[key])adminPresets[key]=[];
  if(!adminPresets[key].includes(text)){adminPresets[key].push(text);renderPresetTags(key);}
  inp.value='';inp.focus();
}
function removePreset(key,idx){adminPresets[key].splice(idx,1);renderPresetTags(key);}
function saveAdminPresets(){savePresets(adminPresets);flashBtn(1,'💾 定型文を保存');}
function renderDayTags(day){
  const c=document.getElementById('tags-'+day);if(!c)return;
  c.innerHTML=(adminChildren[day]||[]).map((name,i)=>`<div class="child-tag">${escHtml(name)}<button class="child-tag-del" onclick="removeChild('${day}',${i})">✕</button></div>`).join('');
}
function addChild(day){
  const inp=document.getElementById('newinput-'+day),name=inp.value.trim();if(!name)return;
  if(!adminChildren[day])adminChildren[day]=[];
  if(!adminChildren[day].includes(name)){adminChildren[day].push(name);renderDayTags(day);}
  inp.value='';inp.focus();
}
function removeChild(day,idx){adminChildren[day].splice(idx,1);renderDayTags(day);}
function saveAdminChildren(){saveChildren(adminChildren);flashBtn(2,'💾 児童設定を保存');}
function flashBtn(index,originalText){
  const btns=document.querySelectorAll('.admin-save-btn');
  if(!btns[index])return;
  btns[index].textContent='✅ 保存しました！';
  setTimeout(()=>{if(btns[index])btns[index].textContent=originalText;},2000);
}

// ======== Service Worker ========
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(e=>console.log('SW error:',e));});
}

// ======== 初期化 ========
buildLoginUI();
