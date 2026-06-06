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
function todayStr(){ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function todayDow(){ return ["日","月","火","水","木","金","土"][new Date().getDay()]; }
function formatDate(str){
  if(!str) return "";
  const [y,m,d]=str.split("-");
  const dow=["日","月","火","水","木","金","土"][new Date(str).getDay()];
  return `${y}年${m}月${d}日（${dow}）`;
}
function nowTime(){ const n=new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; }
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ======== ストレージ ========
function getStaff(){ return JSON.parse(localStorage.getItem('staff')||'null')||DEFAULT_STAFF; }
function saveStaff(arr){ localStorage.setItem('staff',JSON.stringify(arr)); }
function getChildren(){ return JSON.parse(localStorage.getItem('children')||'null')||DEFAULT_CHILDREN; }
function saveChildren(obj){ localStorage.setItem('children',JSON.stringify(obj)); }
function loadData(date){ try{ const r=localStorage.getItem('申し送り_'+date); return r?JSON.parse(r):null; }catch{return null;} }
function storeData(date,data){ localStorage.setItem('申し送り_'+date,JSON.stringify(data)); }
function getSavedDates(){ const d=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('申し送り_')) d.push(k.replace('申し送り_','')); } return d.sort().reverse(); }

// ======== 状態 ========
let currentStaff=null, records=[], adminChildren={}, adminStaff=[];
let currentDetailDate='', currentMonthlyData=null;
const today=todayStr(), todayDay=todayDow();

// ======== 画面切替 ========
function showScreen(name){
  ['login','main','history','detail','admin','monthly'].forEach(s=>{
    document.getElementById(s+'-screen').classList.toggle('hidden',s!==name);
  });
}

// ======== ログイン ========
function buildLoginUI(){
  const staff=getStaff();
  const sel=document.getElementById('login-name');
  sel.innerHTML='<option value="">選択してください</option>';
  staff.forEach(s=>{ const o=document.createElement('option'); o.value=s.name; o.textContent=s.name; sel.appendChild(o); });
  document.getElementById('login-note').innerHTML='※デモ用パスワード：'+staff.map(s=>`${s.name}=${s.password}`).join(' / ');
}
function doLogin(){
  const name=document.getElementById('login-name').value;
  const pass=document.getElementById('login-pass').value;
  const staff=getStaff().find(s=>s.name===name&&s.password===pass);
  if(staff){ currentStaff=staff; document.getElementById('login-error').textContent=''; initMain(); showScreen('main'); }
  else document.getElementById('login-error').textContent='名前またはパスワードが違います';
}
document.getElementById('login-pass').addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
function doLogout(){ currentStaff=null; document.getElementById('login-pass').value=''; buildLoginUI(); showScreen('login'); }

// ======== メイン ========
function initMain(){
  document.getElementById('main-date-label').textContent=formatDate(today)+'　'+todayDay+'曜日';
  document.getElementById('main-staff-name').textContent='👤 '+currentStaff.name;
  document.getElementById('admin-btn').classList.toggle('hidden',!currentStaff.isAdmin);

  const children=getChildren(), todayChildren=children[todayDay]||[];
  const saved=loadData(today);
  if(saved){
    records=[...saved];
    const savedNames=saved.map(r=>r.childName);
    todayChildren.forEach(name=>{ if(!savedNames.includes(name)) records.push(emptyRecord(name)); });
  } else {
    records=todayChildren.map(emptyRecord);
  }

  renderNotice();
  renderHandover();
  renderCards();
}

function emptyRecord(name){
  return { childName:name, checks:[], logs:{ status:[], trouble:[], parent:[], next:[] }, contactDone:false, contactDoneBy:'' };
}

// ======== 全体共有欄 ========
function getNoticeData(date){ try{ return JSON.parse(localStorage.getItem('notice_'+date)||'[]'); }catch{return[];} }
function saveNoticeData(date,arr){ localStorage.setItem('notice_'+date,JSON.stringify(arr)); }

function renderNotice(){
  const logs=getNoticeData(today);
  const box=document.getElementById('notice-log');
  box.innerHTML=logs.length===0
    ? '<span class="log-empty">まだ共有事項はありません</span>'
    : logs.map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
}

function toggleNotice(){
  document.getElementById('notice-body').classList.toggle('hidden');
  document.getElementById('notice-arrow').textContent=
    document.getElementById('notice-body').classList.contains('hidden')?'▼':'▲';
}

function appendNotice(){
  const ta=document.getElementById('notice-input');
  const text=ta.value.trim();
  if(!text){ ta.focus(); return; }
  const logs=getNoticeData(today);
  logs.push({ staff:currentStaff.name, time:nowTime(), text });
  saveNoticeData(today,logs);
  ta.value='';
  renderNotice();
}

// ======== 引継ぎ完了フラグ ========
function getHandoverData(date){ try{ return JSON.parse(localStorage.getItem('handover_'+date)||'null'); }catch{return null;} }
function saveHandoverData(date,obj){ localStorage.setItem('handover_'+date,JSON.stringify(obj)); }

function renderHandover(){
  const data=getHandoverData(today);
  const statusEl=document.getElementById('handover-status');
  const btn=document.getElementById('handover-btn');
  if(data&&data.confirmed){
    statusEl.innerHTML=`✅ <strong>${escHtml(data.staff)}</strong> が ${data.time} に引継ぎ確認済みです`;
    btn.textContent='確認を取り消す';
    btn.className='handover-btn confirmed';
  } else {
    statusEl.innerHTML='引継ぎ確認：<span style="color:#e74c3c">未確認</span>';
    btn.textContent='✅ 引継ぎ確認済み';
    btn.className='handover-btn unconfirmed';
  }
}

function toggleHandover(){
  const data=getHandoverData(today);
  if(data&&data.confirmed){
    saveHandoverData(today,null);
  } else {
    saveHandoverData(today,{ confirmed:true, staff:currentStaff.name, time:nowTime() });
  }
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

  const parentFieldIdx=FIELDS.findIndex(f=>f.key==='parent');
  const parentSection=FIELDS.map((f,fi)=>{
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
        <div class="form-label">${f.label}</div>
        <div class="log-box" id="log-${f.key}-${idx}">${renderLog(rec.logs[f.key]||[])}</div>
        <textarea id="input-${f.key}-${idx}" rows="2" placeholder="${f.ph}" style="margin-top:6px"></textarea>
        <button class="append-btn" onclick="appendLog(${idx},'${f.key}')">✏️ 追記する</button>
        ${doneBtn}
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
            return `<button class="check-btn ${active?(GOOD_SET.has(opt)?'active-good':'active-bad'):''}" onclick="toggleCheck(${idx},'${opt}')">${opt}</button>`;
          }).join('')}
        </div>
      </div>
      ${parentSection}
    </div>`;
  return card;
}

function renderLog(logs){
  if(!logs||logs.length===0) return '<span class="log-empty">まだ記録がありません</span>';
  return logs.map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
}

// ======== 保護者連絡済み ========
function toggleContactDone(idx){
  const rec=records[idx];
  rec.contactDone=!rec.contactDone;
  rec.contactDoneBy=rec.contactDone?`${currentStaff.name} ${nowTime()}`:'';
  const btn=document.getElementById('cdone-'+idx);
  const label=document.getElementById('cdone-label-'+idx);
  btn.textContent=rec.contactDone?'✅ 連絡済み':'連絡済みにする';
  btn.className='contact-done-btn '+(rec.contactDone?'done':'undone');
  label.textContent=rec.contactDone&&rec.contactDoneBy?`（${escHtml(rec.contactDoneBy)}）`:'';
  // ヘッダータグも更新
  const cards=document.querySelectorAll('.child-card');
  const tagRow=cards[idx].querySelector('.tag-row');
  const existingDone=tagRow.querySelector('.tag-done');
  if(rec.contactDone&&!existingDone) tagRow.insertAdjacentHTML('beforeend','<span class="tag tag-done">📞済</span>');
  if(!rec.contactDone&&existingDone) existingDone.remove();
}

// ======== チェック ========
function toggleCheck(idx,label){
  const rec=records[idx];
  rec.checks.includes(label)?rec.checks=rec.checks.filter(c=>c!==label):rec.checks.push(label);
  document.getElementById('checks-'+idx).innerHTML=CHECK_OPTIONS.map(opt=>{
    const active=rec.checks.includes(opt);
    return `<button class="check-btn ${active?(GOOD_SET.has(opt)?'active-good':'active-bad'):''}" onclick="toggleCheck(${idx},'${opt}')">${opt}</button>`;
  }).join('');
  const cards=document.querySelectorAll('.child-card');
  const isAlert=rec.checks.some(c=>['トラブルあり','保護者連絡要','体調不良'].includes(c));
  cards[idx].classList.toggle('alert',isAlert);
  cards[idx].querySelector('.tag-row').innerHTML=rec.checks.map(c=>`<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`).join('')+(rec.contactDone?'<span class="tag tag-done">📞済</span>':'');
}

// ======== 追記 ========
function appendLog(idx,key){
  const ta=document.getElementById(`input-${key}-${idx}`);
  const text=ta.value.trim();
  if(!text){ ta.focus(); return; }
  if(!records[idx].logs[key]) records[idx].logs[key]=[];
  records[idx].logs[key].push({ staff:currentStaff.name, time:nowTime(), text });
  ta.value='';
  document.getElementById(`log-${key}-${idx}`).innerHTML=renderLog(records[idx].logs[key]);
}

function toggleCard(idx){
  const body=document.getElementById('body-'+idx);
  document.getElementById('arrow-'+idx).textContent=body.classList.toggle('open')?'▲':'▼';
}

// ======== 保存 ========
function saveRecords(){
  storeData(today,records);
  const btn=document.getElementById('save-btn');
  btn.textContent='✅ 保存しました！'; btn.classList.add('flash');
  setTimeout(()=>{ btn.textContent='💾 保存する'; btn.classList.remove('flash'); },2000);
}

// ======== 履歴 ========
function openHistory(){
  const list=document.getElementById('history-list');
  list.innerHTML='';
  const dates=getSavedDates();

  // 月のセレクタを構築
  const months=[...new Set(dates.map(d=>d.slice(0,7)))].sort().reverse();
  const selectorHtml=`
    <div class="monthly-selector">
      <label>月次まとめ：</label>
      <select id="month-select">
        ${months.map(m=>`<option value="${m}">${m.replace('-','年')}月</option>`).join('')}
      </select>
      <button onclick="openMonthly(document.getElementById('month-select').value)">📊 表示</button>
    </div>`;
  list.insertAdjacentHTML('afterbegin',selectorHtml);

  if(dates.length===0){
    list.insertAdjacentHTML('beforeend','<div class="empty-msg">保存された記録がありません</div>');
  } else {
    dates.forEach(date=>{
      const recs=loadData(date)||[];
      const alertCount=recs.filter(r=>r.checks.some(c=>['トラブルあり','保護者連絡要','体調不良'].includes(c))).length;
      const handover=getHandoverDataByDate(date);
      const handoverHtml=handover&&handover.confirmed?`<span style="color:#27ae60">✅ 引継確認済</span>`:'<span style="color:#e74c3c">⚠ 引継未確認</span>';
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
        <div class="history-right">
          <span class="arrow">▶</span>
        </div>`;
      item.onclick=()=>openDetail(date);
      list.appendChild(item);
    });
  }
  showScreen('history');
}

function getHandoverDataByDate(date){ try{ return JSON.parse(localStorage.getItem('handover_'+date)||'null'); }catch{return null;} }

// ======== 詳細 ========
function openDetail(date){
  currentDetailDate=date;
  document.getElementById('detail-date-label').textContent=formatDate(date);
  const recs=loadData(date)||[];
  const list=document.getElementById('detail-list');
  list.innerHTML='';

  // 全体共有欄
  const notices=getNoticeData(date);
  if(notices.length>0){
    const nc=document.createElement('div');
    nc.className='detail-notice';
    nc.innerHTML=`<div class="detail-notice-title">📢 全体共有事項</div>`+
      notices.map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('');
    list.appendChild(nc);
  }

  // 引継ぎ確認
  const handover=getHandoverDataByDate(date);
  if(handover&&handover.confirmed){
    const hc=document.createElement('div');
    hc.className='detail-handover';
    hc.textContent=`✅ ${handover.staff} が ${handover.time} に引継ぎを確認しました`;
    list.appendChild(hc);
  }

  recs.forEach(rec=>{
    const card=document.createElement('div');
    card.className='detail-card';
    const tagsHtml=rec.checks.map(c=>`<span class="tag ${GOOD_SET.has(c)?'tag-good':'tag-bad'}">${c}</span>`).join('');
    const fieldsHtml=FIELDS.map(f=>{
      const logs=rec.logs&&rec.logs[f.key]||[];
      if(logs.length===0) return '';
      const contactBadge=(f.key==='parent'&&rec.contactDone)?`<span class="tag tag-done" style="margin-left:6px">📞連絡済</span>`:'';
      return `<div class="detail-row">
        <span class="detail-label">${f.label}${contactBadge}</span>
        ${logs.map(l=>`<div class="log-entry"><span class="log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('')}
      </div>`;
    }).join('');
    card.innerHTML=`
      <div class="detail-name">👦 ${escHtml(rec.childName)}</div>
      <div class="tag-row" style="margin-bottom:6px">${tagsHtml}${rec.contactDone?'<span class="tag tag-done">📞済</span>':''}</div>
      ${fieldsHtml||'<span style="color:#bbb;font-size:13px">記録なし</span>'}`;
    list.appendChild(card);
  });
  showScreen('detail');
}

// ======== 月次まとめ ========
function openMonthly(ym){
  if(!ym) return;
  document.getElementById('monthly-label').textContent=ym.replace('-','年')+'月';
  const dates=getSavedDates().filter(d=>d.startsWith(ym));
  const list=document.getElementById('monthly-list');
  list.innerHTML='';

  // 全児童名を収集
  const allNames=new Set();
  const dateMap={};
  dates.forEach(date=>{
    const recs=loadData(date)||[];
    dateMap[date]=recs;
    recs.forEach(r=>allNames.add(r.childName));
  });

  if(allNames.size===0){
    list.innerHTML='<div class="empty-msg">この月の記録がありません</div>';
    showScreen('monthly');
    return;
  }

  currentMonthlyData={ ym, dates, dateMap, allNames:[...allNames].sort() };

  currentMonthlyData.allNames.forEach(name=>{
    const card=document.createElement('div');
    card.className='monthly-child-card';
    const entries=dates.map(date=>{
      const rec=(dateMap[date]||[]).find(r=>r.childName===name);
      if(!rec) return '';
      const checksStr=rec.checks.length>0?`<div style="font-size:11px;color:#e74c3c">${rec.checks.join('　')}</div>`:'';
      const logsStr=FIELDS.map(f=>{
        const logs=rec.logs&&rec.logs[f.key]||[];
        if(!logs.length) return '';
        return `<div style="margin-top:4px"><span style="font-size:11px;font-weight:700;color:#555">${f.label}：</span>${logs.map(l=>`<span style="font-size:12px">[${escHtml(l.staff)}]${escHtml(l.text)}</span>`).join(' ')}</div>`;
      }).filter(Boolean).join('');
      if(!checksStr&&!logsStr) return '';
      return `<div class="monthly-date-entry">
        <div class="monthly-date-label">${formatDate(date)}</div>
        ${checksStr}${logsStr}
        ${rec.contactDone?'<div style="font-size:11px;color:#27ae60;margin-top:2px">📞 保護者連絡済</div>':''}
      </div>`;
    }).filter(Boolean).join('');

    card.innerHTML=`<div class="monthly-child-name">👦 ${escHtml(name)}</div>${entries||'<span style="color:#bbb;font-size:13px">この月の記録なし</span>'}`;
    list.appendChild(card);
  });
  showScreen('monthly');
}

// ======== 印刷（詳細） ========
function printDetail(){
  const date=currentDetailDate;
  const recs=loadData(date)||[];
  const notices=getNoticeData(date);
  const handover=getHandoverDataByDate(date);
  const area=document.getElementById('print-area');

  const noticeHtml=notices.length>0?`
    <div class="print-notice">
      <div class="print-notice-title">📢 全体共有事項</div>
      ${notices.map(l=>`<div class="print-log-entry"><span class="print-log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('')}
    </div>`:'';

  const handoverHtml=handover&&handover.confirmed
    ?`<div class="print-handover">✅ ${escHtml(handover.staff)} が ${handover.time} に引継ぎを確認しました</div>`:'';

  const headers=['児童名','体調チェック','体調・様子','トラブル・対応','保護者連絡事項','翌日申し送り'];
  const colW=['13%','14%','18%','18%','18%','19%'];
  const rows=recs.map(rec=>{
    const checksStr=rec.checks.length>0?`<div class="print-check-list">▶ ${rec.checks.join('　')}</div>`:'';
    const contactBadge=rec.contactDone?'<div class="print-contact-done">📞 連絡済</div>':'';
    const fieldCells=['status','trouble','parent','next'].map(key=>{
      const logs=rec.logs&&rec.logs[key]||[];
      const extra=(key==='parent')?contactBadge:'';
      if(!logs.length) return `<td>${extra}<span class="print-none">―</span></td>`;
      return `<td>${extra}${logs.map(l=>`<div class="print-log-entry"><span class="print-log-meta">[${escHtml(l.staff)} ${l.time}]</span>${escHtml(l.text)}</div>`).join('')}</td>`;
    }).join('');
    return `<tr><td><span class="print-child-name">${escHtml(rec.childName)}</span></td><td>${checksStr||'<span class="print-none">―</span>'}</td>${fieldCells}</tr>`;
  }).join('');

  area.innerHTML=`
    <div class="print-header"><h1>申し送り記録</h1><p>プロラボ加古川校　${formatDate(date)}</p></div>
    ${noticeHtml}${handoverHtml}
    <table class="print-table">
      <thead><tr>${headers.map((h,i)=>`<th style="width:${colW[i]}">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="print-footer">印刷日時：${new Date().toLocaleString('ja-JP')}</div>`;
  area.style.display='block';
  window.print();
  area.style.display='none';
}

// ======== 印刷（月次） ========
function printMonthly(){
  if(!currentMonthlyData) return;
  const { ym, dates, dateMap, allNames }=currentMonthlyData;
  const area=document.getElementById('print-area');

  const childBlocks=allNames.map(name=>{
    const rows=dates.map(date=>{
      const rec=(dateMap[date]||[]).find(r=>r.childName===name);
      if(!rec) return '';
      const checksStr=rec.checks.join('　')||'―';
      const fieldCells=FIELDS.map(f=>{
        const logs=rec.logs&&rec.logs[f.key]||[];
        return `<td>${logs.map(l=>`[${escHtml(l.staff)}]${escHtml(l.text)}`).join('<br>')||'―'}</td>`;
      }).join('');
      return `<tr><td>${formatDate(date)}</td><td>${checksStr}</td>${fieldCells}</tr>`;
    }).filter(Boolean).join('');
    if(!rows) return '';
    return `<div class="print-monthly-child">
      <div class="print-monthly-name">👦 ${escHtml(name)}</div>
      <table class="print-monthly-table">
        <thead><tr><th>日付</th><th>チェック</th>${FIELDS.map(f=>`<th>${f.label}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).filter(Boolean).join('');

  area.innerHTML=`
    <div class="print-header"><h1>月次まとめ</h1><p>プロラボ加古川校　${ym.replace('-','年')}月</p></div>
    ${childBlocks}
    <div class="print-footer">印刷日時：${new Date().toLocaleString('ja-JP')}</div>`;
  area.style.display='block';
  window.print();
  area.style.display='none';
}

// ======== 管理者設定 ========
function openAdmin(){
  adminChildren=JSON.parse(JSON.stringify(getChildren()));
  adminStaff=JSON.parse(JSON.stringify(getStaff()));
  renderAdmin();
  showScreen('admin');
}

function renderAdmin(){
  const content=document.getElementById('admin-content');
  content.innerHTML='';

  // --- スタッフ管理 ---
  const staffSection=document.createElement('div');
  staffSection.className='admin-section';
  staffSection.innerHTML='<h3>👥 スタッフ管理</h3><div id="staff-list"></div>';
  const addStaffRow=document.createElement('div');
  addStaffRow.style.cssText='display:flex;gap:8px;margin-top:10px;flex-wrap:wrap';
  addStaffRow.innerHTML=`
    <input class="add-child-input" id="new-staff-name" placeholder="名前" style="max-width:100px">
    <input class="add-child-input" id="new-staff-pass" placeholder="パスワード" style="max-width:120px">
    <button class="add-btn" onclick="addStaff()">＋追加</button>`;
  const staffSaveBtn=document.createElement('button');
  staffSaveBtn.className='admin-save-btn';
  staffSaveBtn.textContent='💾 スタッフ設定を保存';
  staffSaveBtn.onclick=saveAdminStaff;
  staffSection.appendChild(addStaffRow);
  staffSection.appendChild(staffSaveBtn);
  content.appendChild(staffSection);
  renderStaffList();

  // --- 曜日別児童設定 ---
  const childSection=document.createElement('div');
  childSection.className='admin-section';
  childSection.innerHTML='<h3>📅 曜日別 児童設定</h3>';
  DAYS.forEach(day=>{
    if(!adminChildren[day]) adminChildren[day]=[];
    const row=document.createElement('div');
    row.className='day-row';
    row.innerHTML=`
      <div class="day-label" style="color:${DAY_COLORS[day]}">${day}曜日</div>
      <div class="child-tags" id="tags-${day}"></div>
      <div class="add-child-row">
        <input class="add-child-input" id="newinput-${day}" placeholder="児童名を入力">
        <button class="add-btn" onclick="addChild('${day}')">＋追加</button>
      </div>`;
    childSection.appendChild(row);
    renderDayTags(day);
    setTimeout(()=>{ const inp=document.getElementById('newinput-'+day); if(inp) inp.addEventListener('keydown',e=>{ if(e.key==='Enter') addChild(day); }); },0);
  });
  const childSaveBtn=document.createElement('button');
  childSaveBtn.className='admin-save-btn';
  childSaveBtn.textContent='💾 児童設定を保存';
  childSaveBtn.onclick=saveAdminChildren;
  childSection.appendChild(childSaveBtn);
  content.appendChild(childSection);
}

function renderStaffList(){
  const list=document.getElementById('staff-list');
  if(!list) return;
  list.innerHTML=adminStaff.map((s,i)=>`
    <div class="admin-staff-row">
      <span class="admin-staff-name">${escHtml(s.name)}</span>
      <input class="admin-staff-input" value="${escHtml(s.password)}" placeholder="パスワード"
        oninput="adminStaff[${i}].password=this.value" ${s.isAdmin?'style="background:#fff8e1"':''}>
      ${s.isAdmin?'<span style="font-size:12px;color:#e65100">👑管理者</span>':
        `<button class="admin-staff-del" onclick="removeStaff(${i})">削除</button>`}
    </div>`).join('');
}

function addStaff(){
  const name=document.getElementById('new-staff-name').value.trim();
  const pass=document.getElementById('new-staff-pass').value.trim();
  if(!name||!pass){ alert('名前とパスワードを入力してください'); return; }
  if(adminStaff.find(s=>s.name===name)){ alert('同じ名前のスタッフがすでにいます'); return; }
  adminStaff.push({ name, password:pass, isAdmin:false });
  document.getElementById('new-staff-name').value='';
  document.getElementById('new-staff-pass').value='';
  renderStaffList();
}

function removeStaff(idx){
  if(!confirm(`${adminStaff[idx].name} を削除しますか？`)) return;
  adminStaff.splice(idx,1);
  renderStaffList();
}

function saveAdminStaff(){
  saveStaff(adminStaff);
  const btns=document.querySelectorAll('.admin-save-btn');
  btns[0].textContent='✅ 保存しました！';
  setTimeout(()=>{ btns[0].textContent='💾 スタッフ設定を保存'; },2000);
}

function renderDayTags(day){
  const c=document.getElementById('tags-'+day);
  if(!c) return;
  c.innerHTML=(adminChildren[day]||[]).map((name,i)=>
    `<div class="child-tag">${escHtml(name)}<button class="child-tag-del" onclick="removeChild('${day}',${i})">✕</button></div>`
  ).join('');
}

function addChild(day){
  const inp=document.getElementById('newinput-'+day);
  const name=inp.value.trim();
  if(!name) return;
  if(!adminChildren[day]) adminChildren[day]=[];
  if(!adminChildren[day].includes(name)){ adminChildren[day].push(name); renderDayTags(day); }
  inp.value=''; inp.focus();
}

function removeChild(day,idx){ adminChildren[day].splice(idx,1); renderDayTags(day); }

function saveAdminChildren(){
  saveChildren(adminChildren);
  const btns=document.querySelectorAll('.admin-save-btn');
  btns[1].textContent='✅ 保存しました！';
  setTimeout(()=>{ btns[1].textContent='💾 児童設定を保存'; },2000);
}

// ======== Service Worker ========
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js')
      .then(()=>console.log('SW registered'))
      .catch(e=>console.log('SW error:',e));
  });
}

// ======== 初期化 ========
buildLoginUI();
