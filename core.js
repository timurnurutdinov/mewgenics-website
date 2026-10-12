/* Shared pure logic, also exercised by node test_core.cjs. */
(function(root) {
  const normalize = s => String(s || '').toLocaleLowerCase('ru').replaceAll('ё','е');
  const total = cat => cat.stats ? cat.stats.reduce((a,b)=>a+b,0) : null;
  const firstTripCandidate = c => c.level===0&&!c.retired&&!c.dead&&!c.donated;
  function filterCats(data, notes, state) {
    const q=normalize(state.query).trim();
    return data.cats.filter(c=> {
      const n=notes[c.id]||{};
      if(c.dead||c.donated)return false;
      if(state.collection==='first-trip'&&!firstTripCandidate(c))return false;
      if(state.collection==='favorites'&&!n.favorite)return false;
      if(state.collection==='notes'&&!n.note&&!n.tags?.length)return false;
      if(state.room!==null&&c.room!==state.room)return false;
      if(state.classId&&c.classId!==state.classId)return false;
      if(state.status==='retired'&&!c.retired)return false;
      if(state.status==='young'&&!(c.age!==null&&c.age<2))return false;
      if(state.status==='ready'&&(c.retired||c.age===null||c.age<2))return false;
      if(state.ability&&!c.abilities.includes(state.ability))return false;
      return !q||normalize([c.name,c.id,c.className,n.note,...(n.tags||[]),...c.abilities.flatMap(id=>[id,data.abilities[id]?.name,data.abilities[id]?.description]),...c.mutations.map(m=>m.name)].join(' ')).includes(q);
    });
  }
  function sortCats(cats,key,direction,data) {
    const value=c=>key==='sum'?total(c):key==='mutations'?c.mutations.filter(m=>!m.defect).length:key==='defects'?c.mutations.filter(m=>m.defect).length:key==='room'?data.rooms[c.room]:/^s[0-6]$/.test(key)?c.stats?.[Number(key[1])]:c[key];
    return [...cats].sort((a,b)=>{const av=value(a),bv=value(b);if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;
      const cmp=typeof av==='string'?av.localeCompare(bv,'ru'):Number(av)-Number(bv);
      return direction*cmp||a.id-b.id;});
  }
  function validateBackup(payload,campaign) {
    if(!payload||payload.schema!==1||payload.campaign!==campaign||!payload.notes||typeof payload.notes!=='object'||Array.isArray(payload.notes))throw Error('Это не файл заметок этой кампании.');
    const result={};
    for(const [id,n] of Object.entries(payload.notes)) {
      if(!/^\d+$/.test(id)||!n||typeof n.note!=='string'||n.note.length>20000||typeof n.favorite!=='boolean'||!Array.isArray(n.tags)||n.tags.length>30||n.tags.some(t=>typeof t!=='string'||t.length>80)||!Number.isFinite(n.updatedAt))throw Error('Файл заметок повреждён.');
      result[id]={note:n.note,favorite:n.favorite,tags:[...new Set(n.tags)],updatedAt:n.updatedAt};
    }
    return result;
  }
  // Import never silently replaces a different local note. Keep both texts and union tags.
  function mergeNotes(local,incoming) {
    const out={...local};let conflicts=0;
    for(const [id,n] of Object.entries(incoming)) {
      const old=out[id];if(!old){out[id]=n;continue;}
      const different=old.note&&n.note&&old.note!==n.note;
      if(different)conflicts++;
      out[id]={note:different?old.note+'\n\n— Импортированная заметка —\n'+n.note:old.note||n.note,
        favorite:old.favorite||n.favorite,tags:[...new Set([...old.tags,...n.tags])],updatedAt:Math.max(old.updatedAt,n.updatedAt)};
    }
    return {notes:out,conflicts};
  }
  root.CatbookCore={firstTripCandidate,normalize,total,filterCats,sortCats,validateBackup,mergeNotes};
})(typeof module!=='undefined'?module.exports:window);
