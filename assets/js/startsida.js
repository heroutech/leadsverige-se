/* LeadSverige startsida – oförändrad från förlagan 2026-11-03. */
(() => {
 const root=document.documentElement;
 const motionButton=document.querySelector('.motion-toggle');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const compact=window.matchMedia('(max-width: 560px)');
 let userPaused=false;
 const syncMotion=()=>{
   const blocked=reduced.matches||compact.matches;
   const paused=blocked||userPaused;
   root.dataset.motion=paused?'off':'on';
   motionButton.disabled=blocked;
   motionButton.setAttribute('aria-pressed',String(paused));
   motionButton.querySelector('span').textContent=reduced.matches?'Rörelse av enligt din inställning':compact.matches?'Stillbild på mobil':paused?'Starta rörelsen':'Pausa rörelsen';
   motionButton.querySelector('use').setAttribute('href',paused?'#play':'#pause');
 };
 motionButton.addEventListener('click',()=>{userPaused=!userPaused;syncMotion()});
 reduced.addEventListener('change',syncMotion);compact.addEventListener('change',syncMotion);syncMotion();
 document.addEventListener('visibilitychange',()=>{root.dataset.pageHidden=String(document.hidden)});
 const menuButton=document.querySelector('.menu-toggle');
 const menu=document.getElementById('nav-links');
 const setMenu=open=>{menu.classList.toggle('is-open',open);menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Stäng menyn':'Öppna menyn')};
 menuButton.addEventListener('click',()=>setMenu(menuButton.getAttribute('aria-expanded')!=='true'));
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuButton.getAttribute('aria-expanded')==='true'){setMenu(false);menuButton.focus()}});
})();
