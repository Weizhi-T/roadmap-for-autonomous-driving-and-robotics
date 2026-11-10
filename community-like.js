(() => {
'use strict';
const endpoint='https://atlas-likes.embodied-atlas-research.workers.dev/likes';
let count=null,pending=0,running=false,reachable=false,lastPoll=0,polling=false,inView=false,observed=null;
const zh=()=>document.documentElement.lang.startsWith('zh');
const tr=(a,b)=>zh()?a:b;
const select=s=>document.querySelector(s);
function display(){
 const number=select('[data-community-count]'),button=select('[data-community-like]'),status=select('[data-community-status]');
 if(!number||!button||!status)return;
 number.textContent=count===null?'—':BigInt(count).toLocaleString(zh()?'zh-CN':'en-US');
 button.disabled=!reachable;
 if(count===null&&!reachable)status.textContent=tr('正在连接共享点赞，起始值为 200。','Connecting shared likes. Starting value: 200.');
 else if(!reachable)status.textContent=tr('共享点赞暂不可用，请稍后再试。起始值为 200。','Shared likes are unavailable. Please try again later. Starting value: 200.');
 else status.textContent=pending?tr('正在同步 '+pending+' 次点赞。','Syncing '+pending+' likes.'):'';
}
async function request(method){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch(endpoint,{method,cache:'no-store',credentials:'omit',signal:controller.signal});
 if(!r.ok)throw new Error('Counter unavailable');const d=await r.json();
 if(typeof d.count!=='string'||!/^\d+$/.test(d.count))throw new Error('Invalid counter response');return d.count;
 }finally{clearTimeout(timer);}
}
function accept(next){if(count===null||BigInt(next)>=BigInt(count))count=next;}
async function poll(force=false){
 if(document.hidden||!inView||!select('[data-community-count]')||running||pending||polling||(!force&&Date.now()-lastPoll<60000))return;
 polling=true;lastPoll=Date.now();
 try{accept(await request('GET'));reachable=true;display();}
 catch{if(count===null){reachable=false;display();const status=select('[data-community-status]');if(status)status.textContent=tr('共享点赞暂不可用，请稍后再试。起始值为 200。','Shared likes are unavailable. Please try again later. Starting value: 200.');}}
 finally{polling=false;}
}
async function sync(){
 if(running)return;running=true;
 while(pending>0){
  try{accept(await request('POST'));pending--;reachable=true;display();}
  catch{pending=0;reachable=false;display();const status=select('[data-community-status]');if(status)status.textContent=tr('同步中断，最后一次点赞可能已记录。请稍后查看，未发送的点击未计入。','Sync interrupted. The last like may have been recorded. Check later; unsent clicks were not counted.');break;}
 }
 running=false;
}
function burst(button){
 if(document.documentElement.dataset.motion==='paused'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 button.classList.remove('community-bump');void button.offsetWidth;button.classList.add('community-bump');
 const chars=['🎉','🌹','✌️','🎆','🎁','💖','🥳','🚀','✨','👏'];for(let i=0;i<4;i++){const el=document.createElement('span');el.className='community-pop';el.textContent=chars[Math.floor(Math.random()*chars.length)];el.style.left=(20+Math.random()*60)+'%';el.style.top='0';el.style.setProperty('--x',((Math.random()-.5)*70)+'px');el.style.setProperty('--r',((Math.random()-.5)*70)+'deg');button.appendChild(el);setTimeout(()=>el.remove(),850);}
}
document.addEventListener('click',e=>{
 const bookmark=e.target.closest('[data-community-bookmark]');
 if(bookmark){const status=select('[data-bookmark-status]');const mac=/Mac|iPhone|iPad|iPod/.test(navigator.platform||'');const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
 status.textContent=mobile?tr('请打开浏览器菜单，选择“添加书签”或“收藏”。','Open your browser menu and choose Add Bookmark.'):tr('请按 '+(mac?'⌘ + D':'Ctrl + D')+' 收藏本网址。','Press '+(mac?'⌘ + D':'Ctrl + D')+' to bookmark this page.');return;}
 const button=e.target.closest('[data-community-like]');if(button&&!button.disabled){burst(button);pending++;display();sync();}
});
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.target===observed){inView=entry.isIntersecting;if(inView)poll();}},{threshold:0}):null;
function setup(){const section=select('.repo-community');if(section!==observed){if(observed&&observer)observer.unobserve(observed);observed=section;inView=false;if(section){if(observer)observer.observe(section);else{inView=true;poll();}}}display();}
new MutationObserver(setup).observe(document.querySelector('#main'),{childList:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
setInterval(()=>poll(),60000);setup();
})();
