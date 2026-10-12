'use strict';
const DATA=window.CATBOOK_DATA, C=window.CatbookCore;
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='catbook:notes:v1:'+DATA.campaign;
const state={collection:'first-trip',room:null,classId:'',status:'',ability:'',query:'',sort:'name',direction:1,view:'abilities'};
const media=matchMedia('(max-width:700px)');
let notes={},storageBlocked=false,currentCat=null,toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function payload(value=notes){return {schema:1,campaign:DATA.campaign,sourceDay:DATA.day,exportedAt:new Date().toISOString(),notes:value};}
try{const raw=localStorage.getItem(STORAGE);if(raw)notes=C.validateBackup(JSON.parse(raw),DATA.campaign);}catch(e){storageBlocked=true;toast('Хранилище заметок недоступно или повреждено. Экспортируй правки, чтобы не потерять их.');}
function noteFor(id){return notes[id]||{note:'',tags:[],favorite:false,updatedAt:0};}
function savePatch(id,patch){
  try {
    if(storageBlocked)throw Error('Хранилище недоступно');
    const raw=localStorage.getItem(STORAGE);const latest=raw?C.validateBackup(JSON.parse(raw),DATA.campaign):{};
    notes={...latest,[id]:{...(latest[id]||noteFor(id)),...patch,updatedAt:Date.now()}};
    localStorage.setItem(STORAGE,JSON.stringify(payload()));
    return true;
  }catch(e){notes={...notes,[id]:{...noteFor(id),...patch,updatedAt:Date.now()}};toast('Не удалось сохранить в браузере. Скачай экспорт заметок.');return false;}
}
function avatar(c){return `<span class="avatar portrait"><img src="${esc(c.portrait)}" alt="Портрет ${esc(c.name)}" loading="lazy" width="80" height="80"></span>`;}
function favorite(c){return `<button class="favorite" data-favorite="${c.id}" aria-label="Избранное: ${esc(c.name)}" aria-pressed="${!!noteFor(c.id).favorite}">${noteFor(c.id).favorite?'★':'☆'}</button>`;}
const shorts=['СИЛ','ЛОВ','ВЫН','ИНТ','СКР','ХАР','УДЧ'];
function stat(v){return `<span class="stat-value ${v>=7?'high':v<=3?'low':''}">${v??'—'}</span>`;}
function catLink(c){return `<button class="cat-link" data-cat="${c.id}" aria-label="Открыть кота ${esc(c.name)}">${avatar(c)}<span><strong>${esc(c.name)}${noteFor(c.id).note?'<span class="note-dot" title="Есть заметка">✎</span>':''}</strong><small>${esc(c.className)}${c.retired?' · <span class="retired">пенсионер</span>':''}</small></span></button>`;}
function abilityIcon(a,detail=false){return a.icon?`<span class="ability-art ${detail?'detail-art':''}"><img src="${esc(a.icon)}" alt="" width="40" height="40" loading="lazy">${a.upgraded?'<span class="upgrade-mark" aria-label="Улучшенная версия">+</span>':''}</span>`:'';}
function abilityPills(c){return `<div class="ability-icons">${c.abilities.map(id=>{const a=DATA.abilities[id];return `<button class="ability-icon-button" data-inspect-ability="${esc(id)}" data-preview-ability="${esc(id)}" aria-haspopup="dialog" aria-label="${esc(a.name)} — описание">${abilityIcon(a)}${a.icon?'':esc(a.name)}</button>`;}).join('')}</div>`;}

function readableDescription(a){return (a.description||'').replace(/\[\/?s(?::[^\]]+)?\]/g,'');}
function abilityCards(cats){
  return `<div class="ability-cards">${cats.map(c=>`<article class="cat-card ability-cat"><div class="card-top">${catLink(c)}${favorite(c)}</div><div class="card-meta"><span>${esc(DATA.rooms[c.room])}</span><span>${c.age??'—'} дн.</span><span>${c.age!==null&&c.age<2?'Ещё котёнок':'Ур. '+(c.level??'—')}</span></div><div class="focus-abilities">${c.abilities.map(id=>{const a=DATA.abilities[id];return `<button class="focus-ability" data-inspect-ability="${esc(id)}" data-preview-ability="${esc(id)}" aria-haspopup="dialog" aria-label="${esc(a.name)} — описание">${abilityIcon(a,true)}<span><strong>${esc(a.name)}</strong><small>${esc(a.kind)}</small><span class="ability-excerpt">${esc(readableDescription(a)||'Нажми, чтобы открыть подробности')}</span></span><span class="ability-chevron" aria-hidden="true">↗</span></button>`;}).join('')||'<p class="quiet">Способности не найдены в записи.</p>'}</div><details class="secondary-stats"><summary>Характеристики · Σ ${C.total(c)??'—'} <span>Мутации ${c.mutations.filter(m=>!m.defect).length} · дефекты ${c.mutations.filter(m=>m.defect).length}</span></summary><div class="card-stats">${DATA.stats.map((s,i)=>`<div title="${s}"><small>${shorts[i]}</small>${stat(c.stats?.[i])}</div>`).join('')}</div></details>${noteFor(c.id).tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}${noteFor(c.id).note?`<p class="note-preview">${esc(noteFor(c.id).note)}</p>`:''}<div class="card-bottom"><button class="text-button" data-cat="${c.id}">Карточка и заметки ↗</button></div></article>`).join('')}</div>`;
}

function renderNav(){
  const living=DATA.cats.filter(c=>!c.dead&&!c.donated);
  const collections=[['first-trip','✦','Первый поход',living.filter(C.firstTripCandidate).length],['all','☷','Все коты',living.length],['favorites','☆','Избранное',living.filter(c=>noteFor(c.id).favorite).length],['notes','✎','С заметками',living.filter(c=>noteFor(c.id).note||noteFor(c.id).tags.length).length]];
  $('#collections').innerHTML=collections.map(([id,symbol,name,count])=>`<button class="nav-item ${state.collection===id&&state.room===null?'active':''}" data-collection="${id}" aria-current="${state.collection===id&&state.room===null?'page':'false'}"><span class="nav-symbol">${symbol}</span>${name}<small>${count}</small></button>`).join('');
  $('#rooms').innerHTML=Object.entries(DATA.rooms).map(([id,name])=>`<button class="nav-item ${state.room===id?'active':''}" data-room="${id}" aria-current="${state.room===id?'page':'false'}"><span class="nav-symbol">${id==='Attic'?'⌂':id?'▤':'○'}</span>${name}<small>${living.filter(c=>c.room===id).length}</small></button>`).join('');
}
function render(){
  renderNav();
  const title=state.room!==null?DATA.rooms[state.room]:{'first-trip':'Первый поход',all:'Все коты',favorites:'Избранное',notes:'С заметками'}[state.collection];
  $('#page-title').innerHTML=esc(title)+'<span class="title-dot">.</span>';
  const living=DATA.cats.filter(c=>!c.dead&&!c.donated);
  $('#intro').textContent=state.collection==='first-trip'?'Выбирай по способностям · в списке коты уровня 0, без отметки пенсионера':`${living.length} котов · ${living.filter(c=>c.room).length} в комнатах · ${living.filter(c=>!c.room).length} без комнаты`;
  $('#day').textContent=DATA.day;$('#side-day').textContent=DATA.day;
  const cats=C.sortCats(C.filterCats(DATA,notes,state),state.sort,state.direction,DATA);
  $('#result-count').textContent=`Показано ${cats.length} из ${living.length}`;
  $('#sort').value=state.sort;$('#direction').textContent=state.direction===1?'↑':'↓';
  $('#abilities-view').setAttribute('aria-pressed',state.view==='abilities');
  $('#table-view').setAttribute('aria-pressed',state.view==='table');$('#cards-view').setAttribute('aria-pressed',state.view==='cards');
  const filtered=state.query||state.classId||state.status||state.ability||state.room!==null||state.collection!=='all';
  $('#active-filter').innerHTML=filtered?`<button class="filter-chip" id="clear-filters">${state.ability?esc(DATA.abilities[state.ability].name)+' · ':''}Сбросить ×</button>`:'';
  $('#empty').hidden=cats.length>0;$('#catalog').hidden=cats.length===0;
  if(state.view==='abilities'){
    $('#catalog').innerHTML=abilityCards(cats);
  }else if(state.view==='cards'||media.matches){
    $('#catalog').innerHTML=`<div class="cards">${cats.map(c=>`<article class="cat-card"><div class="card-top">${catLink(c)}${favorite(c)}</div><div class="card-meta"><span>${esc(DATA.rooms[c.room])}</span><span>${c.age??'—'} дн.</span><span>Ур. ${c.level??'—'}</span></div><div class="card-stats">${DATA.stats.map((s,i)=>`<div title="${s}"><small>${shorts[i]}</small>${stat(c.stats?.[i])}</div>`).join('')}</div><div>${abilityPills(c,3)}</div>${noteFor(c.id).tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}${noteFor(c.id).note?`<p class="note-preview">${esc(noteFor(c.id).note)}</p>`:''}<div class="card-bottom"><span>Σ ${C.total(c)??'—'} · мутации ${c.mutations.filter(m=>!m.defect).length} · дефекты ${c.mutations.filter(m=>m.defect).length}</span><button class="text-button" data-cat="${c.id}">Карточка ↗</button></div></article>`).join('')}</div>`;
  }else{
    const headers=[['name','КОТ','name-th'],['room','КОМНАТА',''],['age','ДНИ',''],['level','УР.',''],...shorts.map((s,i)=>['s'+i,s,'']),['sum','Σ',''],['mutations','МУТ.',''],['defects','ДЕФ.','']];
    $('#catalog').innerHTML=`<div class="table-wrap"><table class="cats-table"><thead><tr>${headers.map(([key,label,cls])=>`<th scope="col" class="${cls}" aria-sort="${state.sort===key?(state.direction===1?'ascending':'descending'):'none'}"><button data-sort="${key}" title="${key[0]==='s'&&key.length===2?DATA.stats[+key[1]]:label}" aria-label="Сортировать: ${key[0]==='s'&&key.length===2?DATA.stats[+key[1]]:label}">${label}${state.sort===key?(state.direction===1?' ↑':' ↓'):''}</button></th>`).join('')}<th scope="col" style="padding:15px 9px">СПОСОБНОСТИ / ЭФФЕКТЫ</th><th scope="col" aria-label="Избранное"></th></tr></thead><tbody>${cats.map(c=>`<tr><td class="name-td">${catLink(c)}</td><td class="room-cell">${esc(DATA.rooms[c.room])}</td><td class="num">${c.age??'—'}</td><td class="num">${c.level??'—'}</td>${DATA.stats.map((s,i)=>`<td class="num">${stat(c.stats?.[i])}</td>`).join('')}<td class="num sum">${C.total(c)??'—'}</td><td class="num">${c.mutations.filter(m=>!m.defect).length}</td><td class="num">${c.mutations.filter(m=>m.defect).length}</td><td class="ability-cell">${abilityPills(c)}</td><td>${favorite(c)}</td></tr>`).join('')}</tbody></table></div>`;
  }
}
function openCat(id){
  const c=DATA.cats.find(c=>c.id===Number(id));if(!c)return;
  currentCat=c;const n=noteFor(c.id);
  $('#cat-content').innerHTML=`<div class="profile-header"><button class="close icon-button" data-close aria-label="Закрыть карточку">×</button><div class="profile-id">КОТ №${c.id} · ДЕНЬ ${DATA.day}</div><div class="profile-title">${avatar(c)}<div><h2 id="cat-title">${esc(c.name)}</h2><p>${esc(c.className)}${c.retired?' · пенсионер':''}</p></div>${favorite(c)}</div><div class="profile-facts"><div><span>Комната</span><strong>${esc(DATA.rooms[c.room])}</strong></div><div><span>Возраст</span><strong>${c.age??'—'} дн.</strong></div><div><span>Уровень</span><strong>${c.level??'—'}</strong></div><div><span>Сумма статов</span><strong>${C.total(c)??'—'}</strong></div></div></div><div class="profile-body"><div class="section-label"><h3>Характеристики</h3><small>Базовые · без бонусов</small></div><div class="profile-stats">${DATA.stats.map((s,i)=>`<div title="${s}"><small>${shorts[i]}</small><strong>${c.stats?.[i]??'—'}</strong></div>`).join('')}</div><section class="note-box"><label for="cat-note">✎ Заметка о коте</label><textarea id="cat-note" maxlength="20000" placeholder="Идея билда, планы на поход или что проверить…">${esc(n.note)}</textarea><div class="note-status" id="note-status" role="status">${n.updatedAt?'Сохранено в этом браузере':'Сохраняется автоматически в этом браузере'}</div><label for="cat-tags">Теги</label><input id="cat-tags" maxlength="1000" value="${esc(n.tags.join(', '))}" placeholder="Через запятую: криты, разведение"><div class="suggest-tags">${['Живые камни','Криты','Разведение','В поход','Проверить билд'].map(t=>`<button data-tag="${t}">+ ${t}</button>`).join('')}</div></section><div class="section-label"><h3>Способности и эффекты</h3><small>${c.abilities.length} найдено в записи</small></div><div class="abilities-list">${c.abilities.map(id=>{const a=DATA.abilities[id];return `<details class="ability-detail"><summary data-preview-ability="${esc(id)}">${abilityIcon(a,true)}<span class="ability-detail-name"><strong>${esc(a.name)}</strong><small>${esc(a.kind)}${a.name!==a.originalName?' · '+esc(a.originalName):''}</small></span></summary>${a.description?`<p>${esc(a.description)}</p>${!a.descriptionRu?'<small>Описание из ресурсов игры · английский</small>':''}`:'<p>Описание в подключённых ресурсах не найдено.</p>'}<small>ID: ${esc(id)}</small><button class="text-button" data-ability="${esc(id)}">Показать всех носителей →</button></details>`;}).join('')||'<p class="quiet">В этой записи ничего не найдено.</p>'}</div><section class="mutations-section"><div class="section-label"><h3>Мутации и дефекты</h3><small>${c.mutations.length} особенностей</small></div><div class="abilities-list">${c.mutations.map(m=>`<details class="ability-detail"><summary><span><strong>${esc(m.name)}</strong><small>${m.defect?'Дефект':'Мутация'} · ${esc(m.id)}</small></span></summary>${m.description?`<p>${esc(m.description)}</p>${!m.descriptionRu?'<small>Описание из ресурсов игры · английский</small>':''}`:'<p>Подробное текстовое описание не найдено.</p>'}${Object.keys(m.effects).length?`<p class="mutation-effects">${Object.entries(m.effects).map(([key,v])=>`${{str:'Сила',dex:'Ловкость',con:'Выносливость',int:'Интеллект',spd:'Скорость',cha:'Харизма',lck:'Удача'}[key]} ${v>0?'+':''}${v}`).join(' · ')}</p>`:''}</details>`).join('')||'<p class="quiet">В распознанных частях особенностей не найдено.</p>'}</div></section><p class="data-note">Текущие и унаследованные способности не разделены. Пол и отношения пока не расшифрованы. Русские описания — рабочие переводы. Портрет собран из деталей и базовой палитры сейва. Без вещей, шрамов и возрастных наложений; положение деталей приближённое.</p></div>`;
  if(!$('#cat-dialog').open)$('#cat-dialog').showModal();
  $('#cat-dialog').scrollTop=0;
  $('#cat-note').addEventListener('input',e=>{const ok=savePatch(c.id,{note:e.target.value});$('#note-status').textContent=ok?'Сохранено в этом браузере':'Не сохранено · скачай экспорт заметок';render();});
  $('#cat-tags').addEventListener('input',e=>{const tags=[...new Set(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))].slice(0,30).map(s=>s.slice(0,80));const ok=savePatch(c.id,{tags});$('#note-status').textContent=ok?'Сохранено в этом браузере':'Не сохранено · скачай экспорт заметок';render();});
}
function resetFilters(){Object.assign(state,{collection:'all',room:null,classId:'',status:'',ability:'',query:''});$('#search').value='';$('#class-filter').value='';$('#status-filter').value='';render();}
function changeSort(key){state.direction=state.sort===key?-state.direction:key==='name'||key==='room'?1:-1;state.sort=key;render();}
function closeCat(){if($('#cat-dialog').open)$('#cat-dialog').close();}
$('#cat-dialog').addEventListener('close',()=>{currentCat=null;if(location.hash.startsWith('#cat='))history.replaceState(null,'',location.pathname+location.search);});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-cat')){location.hash='cat='+b.dataset.cat;if(currentCat?.id===Number(b.dataset.cat))openCat(b.dataset.cat);}
  else if(b.hasAttribute('data-favorite')){const id=Number(b.dataset.favorite);savePatch(id,{favorite:!noteFor(id).favorite});render();if(currentCat?.id===id){const f=$('#cat-dialog .favorite');f.textContent=noteFor(id).favorite?'★':'☆';f.setAttribute('aria-pressed',!!noteFor(id).favorite);}}
  else if(b.hasAttribute('data-collection')){state.collection=b.dataset.collection;state.room=null;if(state.collection==='first-trip')state.view='abilities';render();}
  else if(b.hasAttribute('data-room')){state.room=b.dataset.room;state.collection='all';render();}
  else if(b.hasAttribute('data-sort'))changeSort(b.dataset.sort);
  else if(b.hasAttribute('data-inspect-ability'))openAbility(b.dataset.inspectAbility);
  else if(b.hasAttribute('data-ability')){hideAbilityPreview();if($('#ability-dialog').open)$('#ability-dialog').close();resetFilters();state.ability=b.dataset.ability;closeCat();render();window.scrollTo({top:0,behavior:'smooth'});}
  else if(b.hasAttribute('data-tag')&&currentCat){const tags=[...new Set([...noteFor(currentCat.id).tags,b.dataset.tag])];const ok=savePatch(currentCat.id,{tags});$('#cat-tags').value=tags.join(', ');$('#note-status').textContent=ok?'Сохранено в этом браузере':'Не сохранено · скачай экспорт заметок';render();}
  else if(b.hasAttribute('data-close'))b.closest('dialog').close();
  else if(b.id==='reset'||b.id==='clear-filters')resetFilters();
});
$('#search').addEventListener('input',e=>{state.query=e.target.value;render();});
$('#class-filter').innerHTML+=[...new Map(DATA.cats.map(c=>[c.classId,c.className]))].sort((a,b)=>a[1].localeCompare(b[1],'ru')).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
$('#class-filter').onchange=e=>{state.classId=e.target.value;render();};
$('#status-filter').onchange=e=>{state.status=e.target.value;render();};
$('#sort').onchange=e=>{state.sort=e.target.value;state.direction=['name','room'].includes(state.sort)?1:-1;render();};
$('#direction').onclick=()=>{state.direction*=-1;render();};
$('#abilities-view').onclick=()=>{state.view='abilities';render();};
$('#table-view').onclick=()=>{state.view='table';render();};$('#cards-view').onclick=()=>{state.view='cards';render();};
media.addEventListener('change',render);
function showAbout(){
  $('#source-info').innerHTML=`<p>День ${DATA.day}. ${DATA.cats.length} записей котов в доме, включая тех, кому не назначена комната.</p><div class="source-file">${esc(DATA.sourceName)}<br><code>SHA-256: ${DATA.sha256}</code></div><ul>${DATA.limitations.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>Сейв только прочитан. Заметки, теги и избранное хранятся отдельно в этом браузере и привязаны к ID кота, а не к имени или дню. Для резервной копии и переноса используй экспорт.</p><p>Автоматической синхронизации с телефоном пока нет. Импорт объединяет теги и сохраняет обе версии отличающихся заметок.</p><p id="offline-detail">${$('#offline-status').textContent}</p>`;
  $('#about-dialog').showModal();
}
$('#about').onclick=showAbout;$('#details-link').onclick=showAbout;
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('#backup').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(payload(),null,2)],{type:'application/json'}));a.href=url;a.download=`catbook-notes-day${DATA.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Экспорт заметок подготовлен');};
$('#restore').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('Файл слишком большой.');const incoming=C.validateBackup(JSON.parse(await file.text()),DATA.campaign);const merged=C.mergeNotes(notes,incoming);C.validateBackup(payload(merged.notes),DATA.campaign);localStorage.setItem(STORAGE,JSON.stringify(payload(merged.notes)));notes=merged.notes;storageBlocked=false;render();toast(`Заметки импортированы${merged.conflicts?'; сохранены обе версии: '+merged.conflicts:''}`);}catch(error){toast('Импорт не выполнен: '+error.message);}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search').focus();}});
window.addEventListener('hashchange',()=>{const m=location.hash.match(/^#cat=(\d+)$/);if(m)openCat(m[1]);else closeCat();});
window.addEventListener('storage',e=>{if(e.key!==STORAGE)return;try{const next=e.newValue?C.validateBackup(JSON.parse(e.newValue),DATA.campaign):{};notes=next;render();if(currentCat){$('#cat-note').value=noteFor(currentCat.id).note;$('#cat-tags').value=noteFor(currentCat.id).tags.join(', ');$('#note-status').textContent='Обновлено из другой вкладки';}}catch(error){toast('Не удалось прочитать заметки из другой вкладки.');}});
// Hover/focus preview and a persistent, touch-friendly ability sheet.
const abilityPreview=$('#ability-preview');
let previewAnchor=null,previewTimer;
function abilityDescription(a){return `<div class="ability-heading">${abilityIcon(a,true)}<div><h2>${esc(a.name)}</h2><small>${esc(a.kind)}${a.upgraded?' · улучшенная версия':''}</small></div></div>${a.name!==a.originalName?`<div class="ability-original">${esc(a.originalName)}</div>`:''}<p class="ability-description">${esc(readableDescription(a)||'Описание в подключённых ресурсах не найдено.')}</p>${a.description&&!a.descriptionRu?'<small class="ability-language">Оригинальное описание из игры · английский</small>':''}`;}
function hideAbilityPreview(){clearTimeout(previewTimer);if(abilityPreview.matches(':popover-open'))abilityPreview.hidePopover();previewAnchor?.removeAttribute('aria-describedby');previewAnchor=null;}
function showAbilityPreview(anchor){
  hideAbilityPreview();const a=DATA.abilities[anchor.dataset.previewAbility];if(!a)return;
  previewAnchor=anchor;abilityPreview.innerHTML=abilityDescription(a)+'<div class="preview-hint">Нажми на иконку, чтобы открыть карточку</div>';
  (anchor.closest('dialog')||document.body).append(abilityPreview);
  abilityPreview.showPopover();anchor.setAttribute('aria-describedby','ability-preview');
  const r=anchor.getBoundingClientRect(),w=abilityPreview.offsetWidth,h=abilityPreview.offsetHeight;
  abilityPreview.style.left=Math.max(12,Math.min(r.left+r.width/2-w/2,innerWidth-w-12))+'px';
  abilityPreview.style.top=Math.max(12,r.bottom+h+12<innerHeight?r.bottom+9:r.top-h-9)+'px';
}
function openAbility(id){
  const a=DATA.abilities[id];if(!a)return;hideAbilityPreview();
  const count=DATA.cats.filter(c=>c.abilities.includes(id)).length;
  $('#ability-content').innerHTML=abilityDescription(a)+`<button class="primary ability-carriers" data-ability="${esc(id)}">Показать носителей · ${count} →</button>`;
  $('#ability-content h2').id='ability-title';$('#ability-dialog').showModal();
}
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const a=e.target.closest('[data-preview-ability]');if(a&&a!==previewAnchor){clearTimeout(previewTimer);previewTimer=setTimeout(()=>showAbilityPreview(a),220);}else if(abilityPreview.contains(e.target))clearTimeout(previewTimer);});
document.addEventListener('pointerout',e=>{const a=e.target.closest('[data-preview-ability]');if((a&&!a.contains(e.relatedTarget))||abilityPreview.contains(e.target)&&!abilityPreview.contains(e.relatedTarget)){clearTimeout(previewTimer);previewTimer=setTimeout(hideAbilityPreview,160);}});
document.addEventListener('focusin',e=>{const a=e.target.closest('[data-preview-ability]');if(a&&a.matches(':focus-visible'))requestAnimationFrame(()=>{if(a===document.activeElement)showAbilityPreview(a);});});
document.addEventListener('focusout',e=>{if(e.target.closest('[data-preview-ability]'))hideAbilityPreview();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&abilityPreview.matches(':popover-open')){e.preventDefault();e.stopPropagation();hideAbilityPreview();}},true);
document.addEventListener('click',hideAbilityPreview);
document.addEventListener('scroll',e=>{if(!abilityPreview.contains(e.target))hideAbilityPreview();},true);
window.addEventListener('resize',hideAbilityPreview);
render();const initial=location.hash.match(/^#cat=(\d+)$/);if(initial)openCat(initial[1]);
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('#offline-status').textContent='Готово к работе офлайн';}).catch(()=>{$('#offline-status').textContent='Офлайн-кеш не создан';});
