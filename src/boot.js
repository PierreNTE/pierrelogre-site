(function(){
  var $=function(id){ return document.getElementById(id); };
  function showProfile(){
    document.documentElement.classList.add('nogame');
    var b=$('burrow'); if(b) b.hidden=false;
    var n=$('nogameNote'); if(n) n.hidden=false;
  }
  window.__showProfile=showProfile;
  var gl=null; try{ var c=document.createElement('canvas'); gl=c.getContext('webgl2')||c.getContext('webgl'); }catch(e){}
  if(!('noModule' in HTMLScriptElement.prototype)||!gl){ showProfile(); return; }
  document.documentElement.classList.add('booting');   // interface de jeu cachée tant que le jeu n'est pas prêt
  // La carte d'accueil s'affiche tout de suite, dans la bonne langue, pendant que le jeu se charge derrière
  var touch=false; try{ touch=matchMedia('(pointer: coarse)').matches||'ontouchstart' in window; }catch(e){}
  if(touch) document.documentElement.classList.add('is-touch');
  var lang=null; try{ lang=JSON.parse(localStorage.getItem('fox-betises-v2')||'{}').lang; }catch(e){}
  if(!lang) lang=(navigator.language||'fr').toLowerCase().indexOf('fr')===0?'fr':'en';
  var EN=/*INTRO_EN*/null;
  if(lang==='en'&&EN){
    document.documentElement.lang='en';
    for(var id in EN){ var el=$(id); if(el) el.innerHTML=EN[id]; }
  }
  // Un clic sur Jouer pendant le chargement est retenu : la partie démarre dès que le jeu est prêt
  function queue(mode,btn){ return function(e){ if(window.__foxBoot) return; e.preventDefault(); window.__foxPending=mode; btn.classList.add('queued'); }; }
  var sb=$('startBtn'), db=$('dailyBtn'), who=$('introWho');
  if(sb) sb.addEventListener('click',queue('libre',sb));
  if(db) db.addEventListener('click',queue('defi',db));
  if(who) who.addEventListener('click',function(){ if(!window.__foxBoot){ var b=$('burrow'); if(b) b.hidden=false; } });
  var close=function(){ if(!window.__foxBoot){ var b=$('burrow'); if(b) b.hidden=true; } };
  if($('bClose')) $('bClose').addEventListener('click',close);
  if($('outBtn')) $('outBtn').addEventListener('click',close);
  setTimeout(function(){ if(!window.__foxReady){ var s=$('loaderSkip'); if(s) s.hidden=false; } },8000);
  $('loaderSkip').addEventListener('click',showProfile);
})();
