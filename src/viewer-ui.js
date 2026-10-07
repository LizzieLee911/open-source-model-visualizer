const cards=[...document.querySelectorAll('.detail')],buttons=[...document.querySelectorAll('nav [data-select]')];
const stage=document.querySelector('.layout'),navEl=document.querySelector('nav'),region=document.getElementById('detail-region'),links=document.getElementById('links-layer');
let active=null,selectedButton=null,allMode=false,frame=0,until=0;
function drawLinks(){
 const box=stage.getBoundingClientRect(),nr=navEl.getBoundingClientRect(),rr=region.getBoundingClientRect();
 links.setAttribute('viewBox','0 0 '+box.width+' '+box.height);
 let markup='';
 for(const card of cards.filter(c=>!c.hidden)){
  const id=card.dataset.module;
  const options=buttons.filter(b=>b.dataset.select===id);
  const button=(selectedButton&&selectedButton.dataset.select===id)?selectedButton:options.find(b=>{const r=b.getBoundingClientRect();return r.top>=nr.top&&r.bottom<=nr.bottom});
  if(!button)continue;
  const b=button.getBoundingClientRect(),c=card.getBoundingClientRect();
  if(b.bottom<nr.top||b.top>nr.bottom||c.bottom<rr.top||c.top>rr.bottom)continue;
  let x1=b.right-box.left,y1=b.top+b.height/2-box.top,x2=c.left-box.left,y2=Math.max(rr.top+26,Math.min(c.top+48,rr.bottom-24))-box.top,d;
  if(innerWidth<=760){x1=b.left+b.width/2-box.left;y1=b.bottom-box.top;x2=c.left+c.width/2-box.left;y2=c.top-box.top;d='M '+x1+' '+y1+' C '+x1+' '+(y1+24)+', '+x2+' '+(y2-24)+', '+x2+' '+y2;}
  else{const mid=(x1+x2)/2;d='M '+x1+' '+y1+' C '+mid+' '+y1+', '+mid+' '+y2+', '+x2+' '+y2;}
  markup+='<path data-link="'+id+'" d="'+d+'"/><circle cx="'+x1+'" cy="'+y1+'" r="4"/><circle cx="'+x2+'" cy="'+y2+'" r="4"/>';
 }
 links.innerHTML=markup;
}
function refresh(ms=0){until=Math.max(until,performance.now()+ms);if(frame)return;function tick(){drawLinks();if(performance.now()<until)frame=requestAnimationFrame(tick);else frame=0;}frame=requestAnimationFrame(tick);}
function sync(){const opened=cards.filter(c=>!c.hidden);stage.classList.toggle('is-open',opened.length>0);region.inert=opened.length===0;document.getElementById('status').textContent=allMode?'完整结构 · 已展开 '+opened.length+' 个模块':opened.length?'模块详情 · '+document.getElementById('detail-'+active)?.querySelector('h2').textContent:'选择一个模块开始探索';for(const b of buttons){b.setAttribute('aria-expanded',String(!document.getElementById('detail-'+b.dataset.select).hidden));b.classList.toggle('active',b.dataset.select===active)}refresh(800);}
function openModule(id,origin){
 active=id;allMode=false;selectedButton=origin&&origin.closest('nav')?origin:buttons.find(b=>b.dataset.select===id);
 cards.forEach(c=>c.hidden=c.dataset.module!==id);const card=document.getElementById('detail-'+id);
 card.classList.remove('entering');void card.offsetWidth;card.classList.add('entering');region.scrollTop=0;
 if(innerWidth>760){const b=selectedButton.getBoundingClientRect(),n=navEl.getBoundingClientRect();if(b.top<n.top+10)navEl.scrollTop-=n.top+10-b.top;else if(b.bottom>n.bottom-10)navEl.scrollTop+=b.bottom-n.bottom+10;}
 sync();if(innerWidth<=760)region.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
}
document.addEventListener('click',e=>{const open=e.target.closest('[data-select]'),close=e.target.closest('[data-close]');if(open)openModule(open.dataset.select,open);if(close){const id=close.dataset.close;document.getElementById('detail-'+id).hidden=true;if(active===id)active=null;sync();buttons.find(b=>b.dataset.select===id).focus({preventScroll:true});}});
document.getElementById('expand-all').onclick=()=>{allMode=true;active=null;selectedButton=null;cards.forEach(c=>{c.hidden=false;c.classList.remove('entering')});region.scrollTop=0;navEl.scrollTop=0;sync();if(innerWidth<=760)region.scrollIntoView({block:'start',behavior:'smooth'});};
document.getElementById('collapse-all').onclick=()=>{cards.forEach(c=>c.hidden=true);active=null;selectedButton=null;allMode=false;sync();};
for(const target of [navEl,region,window])target.addEventListener('scroll',()=>refresh(),{passive:true});window.addEventListener('resize',()=>refresh(800));new ResizeObserver(()=>refresh()).observe(region);sync();
