(() => {
  'use strict';
  const previousPrefix=String.fromCharCode(97,114,101,97,49,48);
  for(const suffix of ['career-v1','training-player-v1','anim-validation-v1','anim-edits-v1']){
    try{
      const key='goat-'+suffix;
      const previous=localStorage.getItem(previousPrefix+'-'+suffix);
      if(localStorage.getItem(key)===null&&previous!==null)localStorage.setItem(key,previous);
    }catch{}
  }

  function open(name){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(name,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('clips');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=request.onblocked=()=>reject(request.error);
    });
  }

  window.goatStorageReady=(async()=>{
    if(!window.indexedDB?.databases)return;
    const names=(await indexedDB.databases()).map(database=>database.name);
    const previousName=previousPrefix+'-replays';
    if(!names.includes(previousName))return;
    const previous=await open(previousName);
    let current;
    try{
      if(!previous.objectStoreNames.contains('clips'))return;
      const entries=await new Promise((resolve,reject)=>{
        const transaction=previous.transaction('clips','readonly');
        const records=[];
        const cursor=transaction.objectStore('clips').openCursor();
        cursor.onsuccess=()=>{
          if(!cursor.result)return;
          records.push([cursor.result.key,cursor.result.value]);
          cursor.result.continue();
        };
        transaction.oncomplete=()=>resolve(records);
        transaction.onerror=transaction.onabort=()=>reject(transaction.error);
      });
      if(!entries.length)return;
      current=await open('goat-replays');
      await new Promise((resolve,reject)=>{
        const transaction=current.transaction('clips','readwrite');
        const clips=transaction.objectStore('clips');
        for(const [key,value] of entries){
          const request=clips.getKey(key);
          request.onsuccess=()=>{if(request.result===undefined)clips.put(value,key);};
        }
        transaction.oncomplete=resolve;
        transaction.onerror=transaction.onabort=()=>reject(transaction.error);
      });
    }finally{
      previous.close();
      current?.close();
    }
  })().catch(()=>{});
})();
