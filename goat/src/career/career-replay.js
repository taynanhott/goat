window.careerReplayStore=(()=>{
  const entries=new Map();
  let opening;

  function database(){
    if(!opening)opening=Promise.resolve(window.goatStorageReady).then(()=>new Promise(resolve=>{
      if(!window.indexedDB){resolve(null);return;}
      const request=window.indexedDB.open('goat-replays',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('clips');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=request.onblocked=()=>resolve(null);
    })).catch(()=>null);
    return opening;
  }

  function access(key,mode,action){
    return database().then(db=>{
      if(!db)return undefined;
      return new Promise(resolve=>{
        const tx=db.transaction('clips',mode);
        const op=action(tx.objectStore('clips'),key);
        tx.oncomplete=()=>resolve(op.result);
        tx.onerror=tx.onabort=()=>resolve(undefined);
      });
    }).catch(()=>undefined);
  }

  const id=(key,chance)=>key+':'+chance;

  function read(key,chance){
    const name=id(key,chance);
    if(entries.has(name))return Promise.resolve(entries.get(name));
    return access(name,'readonly',(store,k)=>store.get(k)).then(value=>{
      if(entries.has(name))return entries.get(name);
      if(!value?.frames?.length)return null;
      entries.set(name,value);
      return value;
    });
  }

  function write(key,chance,clip){
    const name=id(key,chance);
    entries.set(name,clip);
    return access(name,'readwrite',(store,k)=>store.put(clip,k));
  }

  function clear(key,count){
    return Promise.all(Array.from({length:count},(_,i)=>{
      const name=id(key,i+1);
      entries.delete(name);
      return access(name,'readwrite',(store,k)=>store.delete(k));
    }));
  }

  return {read,write,clear};
})();
