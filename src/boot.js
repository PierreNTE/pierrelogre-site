(function(){
  function showProfile(){
    document.documentElement.classList.add('nogame');
    var b=document.getElementById('burrow'); if(b) b.hidden=false;
    var n=document.getElementById('nogameNote'); if(n) n.hidden=false;
  }
  window.__showProfile=showProfile;
  var gl=null; try{ var c=document.createElement('canvas'); gl=c.getContext('webgl2')||c.getContext('webgl'); }catch(e){}
  if(!('noModule' in HTMLScriptElement.prototype)||!gl){ showProfile(); return; }
  setTimeout(function(){ if(!window.__foxReady){ var s=document.getElementById('loaderSkip'); if(s) s.hidden=false; } },8000);
  document.getElementById('loaderSkip').addEventListener('click',showProfile);
})();
