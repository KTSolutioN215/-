/* Browser guest bridge: the game and saves stay on the usual page. Native APKs retain their Java bridge. */
(()=>{
  'use strict';
  if(window.YushaLan||!/^(https?:|file:)$/.test(location.protocol))return;
  let relay=null,relayTimer=null,relayWatch=null;
  let socket=null,generation=0,searchGeneration=0,searchAbort=null,authTimer=null,authenticated=false;
  const event=(type,id,data)=>window.__lanNative?.(type,String(id||'0'),String(data||''));
  const stopSearch=()=>{searchGeneration++;searchAbort?.abort();searchAbort=null;};
  function close(){if(relay){relay.win.postMessage({channel:'yusha-relay-1',token:relay.token,type:'close'},relay.origin);relay.win.close();relay=null;}clearTimeout(relayTimer);clearInterval(relayWatch);generation++;clearTimeout(authTimer);authenticated=false;const s=socket;socket=null;if(s&&(s.readyState===WebSocket.OPEN||s.readyState===WebSocket.CONNECTING))s.close(1000);}
  const privateIp=ip=>{const n=ip.split('.').map(Number);return n.length===4&&n.every(x=>Number.isInteger(x)&&x>=0&&x<=255)&&(n[0]===10||n[0]===127||n[0]===192&&n[1]===168||n[0]===172&&n[1]>=16&&n[1]<=31||n[0]===169&&n[1]===254);};
  function joinRelay(ip,port,pin){
    if(!privateIp(ip)){event('error','0','同じWi-Fiにある親機の接続先を入力してください。');return;}
    const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);const token=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join(''),origin='http://'+ip+':'+port;
    const win=window.open(origin+'/lan-relay.html#'+new URLSearchParams({token,origin:location.origin}),'_blank');
    if(!win){event('error','0','通信タブを開けません。ポップアップを許可して、もう一度接続してください。');return;}
    relay={win,origin,token,pin,connected:false};
    relayTimer=setTimeout(()=>{if(relay&&!relay.connected){close();event('error','0','通信タブに接続できません。親機の接続先を確認してください。');}},20000);
    relayWatch=setInterval(()=>{if(relay?.win.closed){const was=relay.connected;close();event(was?'disconnected':'error','0',was?'':'通信タブが閉じられました。');}},1000);
  }
  window.addEventListener('message',e=>{const r=relay,m=e.data;if(!r||e.source!==r.win||e.origin!==r.origin||!m||m.channel!=='yusha-relay-1'||m.token!==r.token)return;
    if(m.type==='ready'){r.win.postMessage({channel:'yusha-relay-1',token:r.token,type:'connect',data:r.pin},r.origin);}
    else if(m.type==='connected'&&!r.connected&&/^\d+$/.test(m.data)){r.connected=true;r.pin='';authenticated=true;clearTimeout(relayTimer);event('connected',m.data,'');}
    else if(m.type==='message'&&r.connected&&typeof m.data==='string'&&m.data.length<=1048576)event('message','0',m.data);
    else if(m.type==='error'||m.type==='disconnected'){close();event(m.type,'0',typeof m.data==='string'?m.data:'通信が終了しました。');}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&authenticated)window.__lanSuspend?.();});
  window.addEventListener('pagehide',()=>{if(authenticated){window.__yusha?.lan?.request({type:'leave'});close();}});
  window.YushaLan={
    browserClient:true,
    host(){event('error','0','部屋はAndroidアプリで作成してください。ブラウザからは参加できます。');},
    async discover(token){stopSearch();if(!privateIp(location.hostname)){window.__lanDiscovered?.(token,'manual',[]);return;}const run=searchGeneration,abort=new AbortController();searchAbort=abort;try{
      const response=await fetch('/room',{cache:'no-store',signal:abort.signal});if(!response.ok)throw Error('room');const room=await response.json();if(run!==searchGeneration)return;
      const address=location.hostname+':'+(location.port||(location.protocol==='https:'?'443':'80'));
      window.__lanDiscovered?.(token,'searching',room.open?[{id:location.host,name:room.name||'ぶつかり勇者',address}]:[]);
    }catch(e){if(run===searchGeneration&&!abort.signal.aborted)window.__lanDiscovered?.(token,'error',[]);}},
    stopDiscovery:stopSearch,
    join(ip,port,pin){close();stopSearch();const expected=location.hostname+':'+(location.port||(location.protocol==='https:'?'443':'80'));
      try{localStorage.setItem('__yusha_save_check','1');localStorage.removeItem('__yusha_save_check');}catch(e){event('error','0','このブラウザでセーブを保存できません。保存を許可してから参加してください。');return;}
      if(!/^\d{6}$/.test(pin)){event('error','0','6桁の合言葉を入力してください。');return;}
      if(ip+':'+port!==expected||location.protocol==='file:'){joinRelay(ip,port,pin);return;}
      const run=generation;let s;try{s=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/coop');socket=s;}catch(e){event('error','0','接続できません。親機のAndroidと同じWi-Fiにつないでください。');return;}
      const current=()=>generation===run&&socket===s;
      authTimer=setTimeout(()=>{if(current()){close();event('error','0','接続できません。部屋と合言葉を確認してください。');}},10000);
      s.onopen=()=>{if(current())s.send('BYH1:'+pin);};
      s.onmessage=e=>{if(!current()||typeof e.data!=='string')return;if(!authenticated){const m=/^BYH1:(\d+)$/.exec(e.data);if(!m){close();event('error','0','部屋が満員か、合言葉が違います。ホストが待合室にいることも確認してください。');return;}authenticated=true;clearTimeout(authTimer);event('connected',m[1],'');}else event('message','0',e.data);};
      s.onerror=()=>{};
      s.onclose=()=>{if(!current())return;const wasAuthenticated=authenticated;socket=null;authenticated=false;clearTimeout(authTimer);event(wasAuthenticated?'disconnected':'error','0',wasAuthenticated?'':'接続できません。Androidの部屋とWi-Fiを確認してください。');};
    },
    send(peer,text){if(relay?.connected&&peer==='0'){relay.win.postMessage({channel:'yusha-relay-1',token:relay.token,type:'send',data:text},relay.origin);return;}if(peer!=='0'||!authenticated||socket?.readyState!==WebSocket.OPEN)return;if(socket.bufferedAmount>1024*1024){close();event('error','0','通信が追いつかないため終了しました。最後の保存は保持します。');return;}socket.send(text);},
    disconnect(){close();},close
  };
})();
