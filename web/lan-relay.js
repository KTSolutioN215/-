/* Transport only. No game state, save reads, or localStorage access in this tab. */
(()=>{
 'use strict';
 const args=new URLSearchParams(location.hash.slice(1)),token=args.get('token'),origin=args.get('origin'),owner=window.opener,status=document.getElementById('status');
 if(!owner||!/^\w{32}$/.test(token||'')||!(origin==='null'||/^https?:\/\//.test(origin||''))){status.textContent='普段のゲーム画面の「部屋に入る」から接続してください。';return;}
 const target=origin==='null'?'*':origin,send=(type,data='')=>owner.postMessage({channel:'yusha-relay-1',token,type,data},target);
 let socket=null,authenticated=false,started=false,closed=false,timer=null;
 const fail=message=>{if(closed)return;status.textContent=message;send('error',message);close();};
 function close(){closed=true;clearTimeout(timer);if(socket)socket.close();socket=null;}
 window.addEventListener('message',e=>{const m=e.data;if(e.source!==owner||e.origin!==origin||!m||m.channel!=='yusha-relay-1'||m.token!==token)return;
  if(m.type==='close'){close();status.textContent='通信を終了しました。元のゲーム画面へ戻れます。';return;}
  if(m.type==='send'){if(authenticated&&socket?.readyState===WebSocket.OPEN&&typeof m.data==='string'&&m.data.length<=1048576){if(socket.bufferedAmount>1048576)fail('通信が追いつかないため終了しました。');else socket.send(m.data);}return;}
  if(m.type!=='connect'||started||closed)return;started=true;
  if(!/^\d{6}$/.test(m.data)){fail('合言葉を確認してください。');return;}
  socket=new WebSocket('ws://'+location.host+'/coop');const s=socket;
  timer=setTimeout(()=>fail('接続できません。部屋と合言葉を確認してください。'),10000);
  s.onopen=()=>{if(!closed)s.send('BYH1:'+m.data);};
  s.onmessage=e=>{if(closed||typeof e.data!=='string')return;if(!authenticated){const id=/^BYH1:(\d+)$/.exec(e.data);if(!id){fail('部屋が満員か、合言葉が違います。');return;}authenticated=true;clearTimeout(timer);status.textContent='接続しました。元のゲームのタブに戻って遊んでください。このタブは閉じないでください。';send('connected',id[1]);}else send('message',e.data);};
  s.onerror=()=>{};s.onclose=()=>{if(closed)return;const was=authenticated;close();status.textContent='通信が終了しました。元のゲーム画面に戻ってください。';send(was?'disconnected':'error',was?'':'部屋に接続できませんでした。');};
 });
 document.getElementById('return').onclick=()=>{try{owner.focus();}catch{}status.textContent+=(status.textContent.includes('タブ一覧')?'':' 戻らない場合はブラウザのタブ一覧から元のゲームを選んでください。');};
 const ready=setInterval(()=>{if(started||closed)clearInterval(ready);else send('ready');},300);send('ready');
 window.addEventListener('pagehide',()=>{if(!closed){send('disconnected');close();}});
})();
