(()=>{
'use strict';
document.documentElement.classList.add('js');
const safeStorage={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}};
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');toggle.setAttribute('aria-expanded',open?'true':'false')})}

/* Home reel: one native video element. The first film has HTML autoplay, so basic playback
   does not depend on JavaScript. JS only adds rotation, selectors, sound and viewport pausing. */
const reel=document.querySelector('[data-reel]');
if(reel){
  const video=reel.querySelector('[data-reel-video]');
  const selectors=[...reel.querySelectorAll('[data-reel-select]')];
  const playBtn=reel.querySelector('.reel-play');
  const soundBtn=reel.querySelector('.reel-sound');
  const status=reel.querySelector('[data-reel-status]');
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const intervalMs=8000;
  let index=0,timer=null,userPaused=false,soundOn=false,inView=true,switching=false;

  const clearTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
  const updateSelectors=()=>selectors.forEach((b,i)=>{const active=i===index;b.classList.toggle('is-active',active);if(active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')});
  const updateControls=()=>{
    if(playBtn){playBtn.textContent=userPaused?'Play':'Pause';playBtn.setAttribute('aria-pressed',userPaused?'true':'false');playBtn.setAttribute('aria-label',userPaused?'Play featured reel':'Pause featured reel')}
    if(soundBtn){soundBtn.textContent=soundOn?'Sound Off':'Sound On';soundBtn.setAttribute('aria-pressed',soundOn?'true':'false');soundBtn.setAttribute('aria-label',soundOn?'Turn featured reel sound off':'Turn featured reel sound on')}
  };
  const showError=()=>{
    if(reel.querySelector('.reel-error'))return;
    const box=document.createElement('div');box.className='reel-error';
    const inner=document.createElement('div');
    const p=document.createElement('p');p.textContent='Video unavailable in this preview.';
    const a=document.createElement('a');a.href=video.currentSrc||video.src;a.textContent='Open video directly';
    inner.append(p,a);box.append(inner);reel.querySelector('.reel-stage')?.append(box);
  };
  const attemptPlay=()=>{
    if(!video||userPaused||!inView)return Promise.resolve();
    const p=video.play();
    return p&&typeof p.catch==='function'?p.catch(()=>{updateControls()}):Promise.resolve();
  };
  const schedule=()=>{clearTimer();if(!reduceMotion.matches&&!userPaused&&inView)timer=setTimeout(()=>switchTo((index+1)%selectors.length,true),intervalMs)};
  const switchTo=(next,automatic=false)=>{
    if(switching||next===index||next<0||next>=selectors.length){if(!automatic)schedule();return}
    switching=true;clearTimer();
    const target=selectors[next];
    const src=target.dataset.src,poster=target.dataset.poster||'';
    video.classList.add('is-switching');
    // Source is replaced synchronously; play() is invoked immediately so manual selection
    // keeps the user's activation in browsers with stricter media policies.
    index=next;updateSelectors();
    if(status)status.textContent=`Featured video ${index+1} of ${selectors.length}`;
    video.pause();
    video.poster=poster;
    video.src=src;
    video.setAttribute('aria-label',`Featured video ${index+1} of ${selectors.length}`);
    video.muted=!soundOn;
    video.defaultMuted=!soundOn;
    video.load();
    const playPromise=(!userPaused&&inView)?video.play():null;
    if(playPromise&&typeof playPromise.catch==='function')playPromise.catch(()=>{});
    const reveal=()=>{video.classList.remove('is-switching');switching=false;schedule()};
    if(video.readyState>=2)reveal();else video.addEventListener('loadeddata',reveal,{once:true});
    setTimeout(()=>{if(switching)reveal()},1200);
  };

  video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;
  video.addEventListener('error',showError);
  video.addEventListener('playing',()=>{reel.querySelector('.reel-error')?.remove()});
  selectors.forEach((b,i)=>b.addEventListener('click',()=>switchTo(i,false)));
  playBtn?.addEventListener('click',()=>{
    userPaused=!userPaused;
    if(userPaused){clearTimer();video.pause()}else{attemptPlay().then(schedule)}
    updateControls();
  });
  soundBtn?.addEventListener('click',()=>{
    soundOn=!soundOn;video.muted=!soundOn;video.defaultMuted=!soundOn;safeStorage.set('yb-home-sound',soundOn?'on':'off');updateControls();
    if(!userPaused&&inView)attemptPlay();
  });

  updateSelectors();updateControls();
  if(reduceMotion.matches){userPaused=true;video.pause();updateControls()}else{attemptPlay().then(schedule)}
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.target!==reel)continue;inView=e.isIntersecting&&e.intersectionRatio>=.10;if(inView&&!userPaused){attemptPlay().then(schedule)}else{clearTimer();video.pause()}}},{threshold:[0,.10,.5,1]});
    observer.observe(reel);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimer();video.pause()}else if(inView&&!userPaused){attemptPlay().then(schedule)}});
  reduceMotion.addEventListener?.('change',()=>{if(reduceMotion.matches){clearTimer();video.pause();userPaused=true;updateControls()}else{userPaused=false;attemptPlay().then(schedule);updateControls()}});
}

class GalleryOverlay{
constructor(){
  this.el=document.querySelector('.overlay');if(!this.el)return;
  this.stage=this.el.querySelector('.overlay-stage');this.title=this.el.querySelector('.overlay-title');
  this.prev=this.el.querySelector('[data-prev]');this.next=this.el.querySelector('[data-next]');this.close=this.el.querySelector('[data-close]');this.sound=this.el.querySelector('.sound-btn');
  this.items=[];this.index=0;this.trigger=null;this.mode='image';this.lastScroll=0;this.soundOn=safeStorage.get('yb-sound')==='on';
  this.close.addEventListener('click',()=>this.hide());this.prev.addEventListener('click',()=>this.go(-1));this.next.addEventListener('click',()=>this.go(1));
  if(this.sound)this.sound.addEventListener('click',()=>{this.soundOn=!this.soundOn;safeStorage.set('yb-sound',this.soundOn?'on':'off');this.applySound()});
  document.addEventListener('keydown',e=>{if(this.el.getAttribute('aria-hidden')!=='false')return;if(e.key==='Escape')this.hide();if(e.key==='ArrowLeft')this.go(-1);if(e.key==='ArrowRight')this.go(1);if(e.key==='Tab')this.trap(e)});
  let sx=null;this.stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')sx=e.clientX},{passive:true});this.stage.addEventListener('pointerup',e=>{if(sx===null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>55)this.go(dx<0?1:-1)},{passive:true});
}
setup(selector,mode){
  this.mode=mode;this.items=[...document.querySelectorAll(selector)];
  this.items.forEach((item,i)=>item.addEventListener('click',e=>{if(item.matches('a[href]'))e.preventDefault();this.show(i,item)}));
}
show(i,trigger){
  if(!this.el)return;this.index=i;this.trigger=trigger;this.lastScroll=scrollY;this.el.setAttribute('aria-hidden','false');
  [...this.el.parentElement.children].filter(e=>e!==this.el).forEach(e=>e.inert=true);document.body.style.overflow='hidden';this.render(true);this.close.focus();
}
hide(){this.stopMedia();this.el.setAttribute('aria-hidden','true');[...this.el.parentElement.children].filter(e=>e!==this.el).forEach(e=>e.inert=false);document.body.style.overflow='';window.scrollTo(0,this.lastScroll);if(this.trigger)this.trigger.focus()}
stopMedia(){const v=this.stage.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load()}}
go(d){const ni=this.index+d;if(ni<0||ni>=this.items.length)return;this.stopMedia();this.index=ni;this.render(true)}
render(autoplay=false){
  const it=this.items[this.index];this.stage.innerHTML='';const title=it.dataset.title||'';this.title.textContent=this.mode==='image'?'':title;this.prev.disabled=this.index===0;this.next.disabled=this.index===this.items.length-1;
  if(this.mode==='video'){
    const raw=it.dataset.src||it.getAttribute('href')||'';const src=new URL(raw,document.baseURI).href;
    const v=document.createElement('video');v.controls=true;v.autoplay=autoplay;v.playsInline=true;v.preload='metadata';v.poster=it.dataset.poster||'';v.muted=!this.soundOn;v.src=src;v.setAttribute('aria-label',title||'Video');
    v.addEventListener('error',()=>this.renderVideoError(src),{once:true});
    v.addEventListener('play',()=>document.querySelectorAll('video').forEach(o=>{if(o!==v)o.pause()}));
    this.stage.append(v);if(this.sound){this.sound.hidden=false;this.applySound()}
    // Call play directly during the click/navigation event. If a browser blocks it, native controls remain visible.
    if(autoplay){const p=v.play();if(p&&typeof p.catch==='function')p.catch(()=>{})}
  }else{
    const img=document.createElement('img');img.src=it.dataset.src;img.alt=it.dataset.alt||title;this.stage.append(img);if(this.sound)this.sound.hidden=true;
  }
}
renderVideoError(src){
  this.stage.innerHTML='';const box=document.createElement('div');box.className='video-error';
  const p=document.createElement('p');p.textContent='This video file is unavailable in the current preview deployment.';
  const a=document.createElement('a');a.href=src;a.textContent='Open video file directly';a.className='video-direct-link';box.append(p,a);this.stage.append(box);
}
applySound(){const v=this.stage.querySelector('video');if(v)v.muted=!this.soundOn;if(this.sound)this.sound.textContent=this.soundOn?'Sound Off':'Sound On'}
trap(e){const focusables=[...this.el.querySelectorAll('button:not([disabled]),a[href],video[controls]')].filter(x=>!x.hidden);if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
}
const ov=new GalleryOverlay();if(document.querySelector('.apparel-item'))ov.setup('.apparel-item','image');if(document.querySelector('.motion-item'))ov.setup('.motion-item','video');
})();
