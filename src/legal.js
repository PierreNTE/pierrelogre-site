/* Page des mentions légales : choisir de ne pas être compté par la mesure d'audience sur ce navigateur.
   Le choix est gardé dans le navigateur (fox-nostats), boot.js le respecte. Textes fournis par la page (data-*). */
(function(){
  var K='fox-nostats', b=document.getElementById('statsBtn'), s=document.getElementById('statsState');
  if(!b||!s) return;
  var d=b.dataset, dnt=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
  function off(){ try{ return localStorage.getItem(K)==='1'; }catch(e){ return false; } }
  function render(){
    var o=off();
    s.textContent=dnt?d.dnt:o?d.off:d.on;
    b.textContent=o?d.again:d.stop;
    b.hidden=dnt;
  }
  b.addEventListener('click',function(){ try{ if(off()) localStorage.removeItem(K); else localStorage.setItem(K,'1'); }catch(e){} render(); });
  render();
})();
