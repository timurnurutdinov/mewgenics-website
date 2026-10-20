'use strict';
function collectMutations(cats){
  const groups=new Map();
  for(const cat of cats){
    const seen=new Set();
    for(const mutation of cat.mutations||[]){
      if(seen.has(mutation.id))continue;seen.add(mutation.id);
      if(!groups.has(mutation.id))groups.set(mutation.id,{mutation,cats:[]});
      groups.get(mutation.id).cats.push(cat);
    }
  }
  return [...groups.values()].sort((a,b)=>b.cats.length-a.cats.length||a.mutation.id.localeCompare(b.mutation.id));
}
if(typeof module!=='undefined')module.exports={collectMutations};
if(typeof document!=='undefined'){
 const data=window.CATBOOK_DATA;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const statNames={str:'Сила',dex:'Ловкость',con:'Выносливость',int:'Интеллект',spd:'Скорость',cha:'Харизма',lck:'Удача'};
 const translations={
 'eyebrows.900':'Шанс уклонения +5%. Базовая атака имеет 1% шанс наложить заморозку.',
 'mouth.305':'+100 здоровья тела после падения.',
 'eyes.314':'При падении создаёт 3 мух. +2 здоровья тела после падения.',
 'legs.303':'Базовая атака имеет 5% шанс обездвижить цель.',
 'eyes.309':'+2 здоровья тела после падения.',
 'arms.333':'Базовая атака получает стихию ветра и +1 к отталкиванию.',
 'body.321':'При падении создаёт фамильяра — очарованного котёнка.',
 'eyebrows.313':'В каждом бою появляется на 1–2 подбираемых предмета больше.',
 'arms.329':'В начале боя экипирует временный аксессуар Water Bottle.',
 'tail.311':'Шипы 1.',
 'arms.763':'Игнорирует эффекты клеток и ловушек.',
 'ears.332':'Brace 1 — один уровень эффекта Brace.',
 'legs.331':'+1 к дальности перемещения. Перемещение становится прыжком.',
 'ears.704':'Начинает каждый бой с обездвиживанием 1.',
 'eyes.353':'Не получает дополнительный урон от ударов в спину.',
 'tail.760':'Начинает с двумя сальто.',
 'head.703':'Удары в лицо считаются ударами в спину.',
 'texture.702':'Начинает каждый бой с кровотечением 1.',
 'arms.703':'Вода не замедляет перемещение.'
 };
 const living=data.cats.filter(c=>!c.dead&&!c.donated);
 document.title=`Мутации · день ${data.day} · Кототека`;
 document.querySelector('#atlas-summary').textContent=`День ${data.day} · Котов: ${living.length} · Мутаций: ${collectMutations(living).length}`;
 function render(){
  const scope=document.querySelector('#mutation-scope').value;
  const cats=scope==='first'?living.filter(window.CatbookCore.firstTripCandidate):living;
  const query=document.querySelector('#mutation-search').value.trim().toLocaleLowerCase('ru');
  const groups=collectMutations(cats).filter(({mutation:m,cats})=>[m.id,m.part,m.name,m.description,translations[m.id],...cats.map(c=>c.name),...Object.keys(m.effects||{}).map(k=>statNames[k]||k)].join(' ').toLocaleLowerCase('ru').includes(query));
  document.querySelector('#atlas-count').textContent=`Мутаций: ${groups.length} · котов в выбранном составе: ${cats.length}`;
  document.querySelector('#mutation-list').innerHTML=groups.map(({mutation:m,cats})=>{
   const effects=Object.entries(m.effects||{}).map(([k,v])=>`${statNames[k]||k} ${v>0?'+':''}${v}`).join(' · ');
   const description=translations[m.id]||m.description|| (effects?'Изменение характеристик.':'Описание в ресурсах не найдено.');
   return `<article class="atlas-entry" id="${esc(m.id)}"><div class="atlas-heading"><div><h2>${esc(m.part)} <small>${esc(m.id)}${m.defect?' · дефект':''}</small></h2></div><span class="carrier-count">${cats.length}<small>котов</small></span></div><p>${esc(description)}</p>${effects?`<p class="mutation-effects">${esc(effects)}</p>`:''}${translations[m.id]?`<details class="original-text"><summary>Оригинал описания</summary><p>${esc(m.description)}</p></details>`:''}<details class="atlas-carriers"><summary>Носители · ${cats.length}</summary><div>${cats.slice().sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(c=>`<a href="./#cat=${c.id}">${esc(c.name)}<small>${c.retired?'уже был в походе':c.level>0?'ур. '+c.level:c.age<2?'котёнок':'первый поход'}</small></a>`).join('')}</div></details></article>`;
  }).join('')||'<p>По этому запросу мутаций не найдено.</p>';
 }
 document.querySelector('#mutation-search').addEventListener('input',render);document.querySelector('#mutation-scope').addEventListener('change',render);render();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
}
