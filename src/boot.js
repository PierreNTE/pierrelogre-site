(function(){
  var $=function(id){ return document.getElementById(id); };
  var touch=false; try{ touch=matchMedia('(pointer: coarse)').matches||'ontouchstart' in window; }catch(e){}

  /* ---------- Mesure d'audience sans cookie (supabase/stats.sql) ----------
     Un numéro de visite tiré au hasard à chaque chargement, gardé seulement en mémoire : impossible de reconnaître
     un visiteur d'une fois sur l'autre. Ni cookie, ni stockage, ni adresse IP enregistrée. Seulement sur
     pierrelogre.com (jamais en test ni dans l'aperçu), et jamais si le navigateur demande « Do Not Track » ou GPC,
     ni si le visiteur l'a coupée sur la page des mentions légales. */
  var ST=/*STATS*/null, host=location.hostname;
  var nostats=false; try{ nostats=localStorage.getItem('fox-nostats')==='1'; }catch(e){}   // choix fait sur la page des mentions légales
  var allowed=!!ST&&(host==='pierrelogre.com'||host==='www.pierrelogre.com'||window.__foxStatsTest===true)
    &&!(navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1'||nostats);
  var visit=''; while(visit.length<10) visit+=Math.random().toString(36).slice(2);
  visit=visit.slice(0,12).replace(/[^a-z0-9]/g,'a');
  var sw=Math.min(screen.width||innerWidth,screen.height||innerHeight);
  var device=touch?(sw<600?'phone':'tablet'):'desktop', q=[], count=0;
  function flush(){
    if(!q.length||!allowed) return;
    var body=JSON.stringify(q.splice(0,40));
    try{ fetch(ST.url+'/rest/v1/events',{method:'POST',keepalive:true,credentials:'omit',body:body,
      headers:{apikey:ST.key,'Content-Type':'application/json',Prefer:'return=minimal'}})['catch'](function(){}); }catch(e){}
  }
  window.__foxStats={
    on:allowed,
    send:function(name,props){
      if(!allowed||count>=140) return; count++;
      var p={}; for(var k in (props||{})){ var v=props[k]; if(typeof v==='number'||typeof v==='boolean') p[k]=v; else if(v!=null) p[k]=String(v).slice(0,60); }
      q.push({name:name,visit:visit,lang:document.documentElement.lang==='fr'?'fr':'en',page:location.pathname.indexOf('/fr')===0?'/fr/':'/',device:device,props:p});
      if(q.length>=20) flush();
    },
    flush:flush
  };
  setInterval(flush,10000);
  document.addEventListener('visibilitychange',function(){ if(document.hidden) flush(); });
  addEventListener('pagehide',flush);
  // Visite : d'où l'on vient (seulement le nom du site, ou ?utm_source=… du lien), taille d'écran arrondie
  (function(){
    var ref=''; try{ var r=document.referrer&&new URL(document.referrer).hostname; if(r&&r!==host) ref=r.replace(/^www\./,''); }catch(e){}
    var utm=''; try{ utm=(new URLSearchParams(location.search).get('utm_source')||'').toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,30); }catch(e){}
    var w=innerWidth;
    window.__foxStats.send('Visite',{ref:ref,utm:utm,largeur:w<480?'<480':w<900?'480-900':w<1400?'900-1400':'1400+'});
  })();

  // Version sans jeu (pas de 3D) ; slow : le jeu tarde à se charger (pas de note « ton navigateur n'affiche pas la 3D »)
  function showProfile(slow){
    document.documentElement.classList.add('nogame');
    var b=$('burrow'); if(b) b.hidden=false;
    var n=$('nogameNote'); if(n) n.hidden=slow===true;
    window.__foxStats.send('Profil sans jeu',{raison:slow===true?'lent':'3d'});
  }
  window.__showProfile=showProfile;
  var gl=null; try{ var c=document.createElement('canvas'); gl=c.getContext('webgl2')||c.getContext('webgl'); }catch(e){}
  if(!('noModule' in HTMLScriptElement.prototype)||!gl){ showProfile(); return; }
  document.documentElement.classList.add('booting');   // interface de jeu cachée tant que le jeu n'est pas prêt
  // La carte d'accueil s'affiche tout de suite, dans la bonne langue, pendant que le jeu se charge derrière
  if(touch) document.documentElement.classList.add('is-touch');
  // Langue : celle de la page (anglais à « / », français à « /fr/ »), sauf si le visiteur a déjà choisi avec le bouton FR / EN
  var page=document.documentElement.lang==='fr'?'fr':'en', lang=null;
  try{ lang=JSON.parse(localStorage.getItem('fox-betises-v2')||'{}').lang; }catch(e){}
  if(lang!=='fr'&&lang!=='en') lang=page;
  var INTRO=/*INTRO*/null;
  if(lang!==page&&INTRO&&INTRO[lang]){
    document.documentElement.lang=lang;
    for(var id in INTRO[lang]){ var el=$(id); if(el) el.innerHTML=INTRO[lang][id]; }
    var ll=$('legalLink'); if(ll) ll.href=lang==='fr'?'/fr/mentions-legales/':'/legal/';
  }
  // Un clic sur Jouer pendant le chargement est retenu : la partie démarre dès que le jeu est prêt
  function queue(mode,btn){ return function(e){ if(window.__foxBoot) return; e.preventDefault(); window.__foxPending=mode; btn.classList.add('queued'); }; }
  var sb=$('startBtn'), db=$('dailyBtn'), who=$('introWho');
  if(sb) sb.addEventListener('click',queue('libre',sb));
  if(db) db.addEventListener('click',queue('defi',db));
  if(who) who.addEventListener('click',function(){ if(!window.__foxBoot){ var b=$('burrow'); if(b) b.hidden=false; window.__foxStats.send('Terrier ouvert',{depuis:'accueil'}); } });
  var close=function(){ if(!window.__foxBoot){ var b=$('burrow'); if(b) b.hidden=true; } };
  if($('bClose')) $('bClose').addEventListener('click',close);
  if($('outBtn')) $('outBtn').addEventListener('click',close);
  // fiche ouverte avant le jeu (ou sans jeu) : le clic LinkedIn compte aussi (ensuite, actions.js s'en charge)
  if($('liBtn')) $('liBtn').addEventListener('click',function(){ if(!window.__foxBoot) window.__foxStats.send('Clic LinkedIn',{depuis:'fiche'}); });
  setTimeout(function(){ if(!window.__foxReady){ var s=$('loaderSkip'); if(s) s.hidden=false; } },8000);
  $('loaderSkip').addEventListener('click',function(){ showProfile(true); });
  // Le jeu démarre juste après la première image : la carte d'accueil s'affiche d'abord, même quand la construction du
  // village bloque le navigateur plusieurs secondes (téléphone lent). Le fichier est déjà en route (modulepreload).
  // Aperçu tout-en-un : pas de lien modulepreload, le jeu est dans la page et démarre seul.
  var pre=document.querySelector('link[rel="modulepreload"][href*="/assets/game.js"]');
  // On attend aussi les polices (2 s au plus) : sinon le texte, encore invisible pendant leur chargement, ne s'afficherait
  // qu'une fois le village construit.
  if(pre){
    var started=false, go=function(){ if(started) return; started=true; var s=document.createElement('script'); s.type='module'; s.src=pre.getAttribute('href'); document.body.appendChild(s); };
    var later=function(){ if(document.hidden||!window.requestAnimationFrame) setTimeout(go,0); else requestAnimationFrame(function(){ setTimeout(go,0); }); };
    if(document.fonts&&document.fonts.ready){ document.fonts.ready.then(later,later); setTimeout(later,2000); } else later();
  }
})();
