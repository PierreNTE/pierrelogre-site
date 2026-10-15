#!/usr/bin/env python3
"""
Tests du site pierrelogre.com : `npm test` (build + ce script).

Lance un serveur local qui reproduit la CSP stricte d'OVH (.htaccess), puis vérifie dans Chromium :
  1. partie complète (13 bêtises + la secrète), écran de fin, succès
  2. discrétion : vol vu → alerte ; vol discret hors de vue → pas d'alerte
  3. objet lâché contre un meuble → reposé hors de l'obstacle
  4. gland doré → carte d'anecdote + sauvegarde
  5. sauvegarde de partie → « Reprendre (n/13) » après rechargement
  6. défi du jour → 5 bêtises
  7. versions de secours : sans WebGL, sans JavaScript, page 404
  8. mobile 375×667 : aucun chevauchement d'interface pendant un message
  9. budget de performance : < 150 appels de dessin (village), < 160 par région
 10. monde ouvert : ouverture des régions, voyages, mini-jeu, classement, carnet, sauvegarde v2
 11. première minute : carte d'accueil avant le jeu (bonne langue, clic retenu), visite guidée en 3 bêtises, vue une fois
 12. sensations au doigt : joystick flottant (vrais touchers), zone morte, bouton Attraper/Poser, portée, glissade
     le long d'un mur, « Passer », plafond 60 i/s des écrans 120 Hz, téléphone à l'horizontale sans chevauchement
 13. réactions : habitant surpris → agacé → il chasse le renard (sans l'attraper) ; objet lâché de surprise ;
     « Doublé ! » ; indice qui montre l'endroit
 14. classement partagé : faux serveur Supabase (aucune écriture dans le vrai classement), requêtes conformes, repli local
 15. langues : anglais par défaut à « / », français à « /fr/ », choix retenu ; référencement (hreflang, Open Graph, schema.org, llms.txt)
Aucune erreur console n'est tolérée.
"""
import asyncio, json, os, re, subprocess, sys, time, functools, http.server, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.environ.get('WWW') or os.path.join(ROOT, 'site', 'www')   # WWW=… : tester un dossier livré (zip décompressé)
PORT = 8767
OUT = os.environ.get('TEST_OUT', '/tmp/claude-0/tests')
os.makedirs(OUT, exist_ok=True)
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
results = []

def serve():
    csp = re.search(r'Content-Security-Policy "([^"]+)"', open(os.path.join(WWW, '.htaccess')).read()).group(1).replace(' upgrade-insecure-requests', '')
    class H(http.server.SimpleHTTPRequestHandler):
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8'}
        def end_headers(self):
            self.send_header('Content-Security-Policy', csp); self.send_header('X-Content-Type-Options', 'nosniff'); super().end_headers()
        def send_error(self, code, message=None, explain=None):
            if code == 404 and os.path.exists(os.path.join(WWW, '404.html')):
                body = open(os.path.join(WWW, '404.html'), 'rb').read()
                self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
            super().send_error(code, message, explain)
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(H, directory=WWW))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

URL = f'http://127.0.0.1:{PORT}/'
JS_HELPERS = """
  const F=window.__fox, f=F.fox, wait=ms=>new Promise(r=>setTimeout(r,ms));
  const go=(x,z,yaw=0)=>{ f.pos.set(x,0,z); f.yaw=yaw; f.vel.set(0,0,0); };
  const item=k=>F.items.find(i=>i.kind===k);
  const npc=id=>F.npcs.find(n=>n.id===id);
"""
def check(name, ok, detail=''):
    results.append((name, bool(ok), detail)); print(('✓ ' if ok else '✗ ') + name + (f'  [{detail}]' if detail else ''), flush=True)

SUPABASE = re.compile(r'^https://[^/]+\.supabase\.co/')
async def offline_lb(ctx, rows=None, seen=None, down=False):
    """Les tests n'écrivent jamais dans le vrai classement : un faux serveur Supabase (PostgREST) répond à sa place.
    down=True : serveur en panne (503), pour vérifier le repli local."""
    rows = [] if rows is None else rows
    async def fake(route):
        req = route.request; h = req.headers
        if seen is not None: seen.setdefault('headers', []).append({k: h.get(k) for k in ('apikey', 'authorization', 'prefer')})
        if down: await route.fulfill(status=503, content_type='application/json', body='{"message":"indisponible"}'); return
        if req.method == 'GET':
            if seen is not None: seen.setdefault('get', []).append(req.url)
            best = {}
            for r in rows: best[r['pseudo']] = max(best.get(r['pseudo'], 0), r['score'])
            body = sorted([{'pseudo': p, 'score': v} for p, v in best.items()], key=lambda x: -x['score'])[:10]
            await route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
        elif req.method == 'POST':
            d = json.loads(req.post_data or '{}')
            if seen is not None: seen.setdefault('post', []).append({'url': req.url, 'body': d, 'prefer': h.get('prefer')})
            rows.append({'pseudo': d.get('pseudo'), 'score': d.get('score', 0)}); await route.fulfill(status=201, body='')
        else: await route.fulfill(status=204, body='')
    await ctx.unroute(SUPABASE); await ctx.route(SUPABASE, fake)

async def page(browser, w=1280, h=760, acorns_done=False, **kw):
    cine = kw.pop('cine', False)
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, **kw)
    await offline_lb(ctx)
    if not cine: await ctx.add_init_script("window.__foxNoCine=true")
    if acorns_done:  # glands déjà trouvés : aucune carte ne vient interrompre la partie scriptée
        await ctx.add_init_script("try{localStorage.setItem('fox-betises-v2', JSON.stringify({acorns:[0,1,2,3,4]}))}catch(e){}")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'preloaded using link preload' not in m.text else None)
    await pg.goto(URL, timeout=120000)
    return ctx, pg, errs

async def ready(pg):
    await pg.wait_for_function('window.__foxReady===true', timeout=120000)

async def js(pg, body):
    return await pg.evaluate('async()=>{' + JS_HELPERS + body + '}')

async def test_playthrough(browser):
    ctx, pg, errs = await page(browser, 480, 320, acorns_done=True); await ready(pg)
    await js(pg, "F.start('libre', false);")
    # Carottes : arracher les 3, en garder une pour la machine à café
    await js(pg, """for(const c of F.items.filter(i=>i.kind==='carotte')){ go(c.pos.x,c.pos.z+1.2,Math.PI); await wait(400); F.grabOrDrop(); await wait(300); go(c.pos.x,-8.2,0); F.dropHeld(); await wait(300); }""")
    await js(pg, """const c=F.items.find(i=>i.kind==='carotte'&&!i.planted&&!i.carrier&&!i.gone); go(c.pos.x,c.pos.z-1,0); await wait(400); F.grabOrDrop(); await wait(300); go(7.6,-11.9,Math.PI); await wait(400); F.dropHeld(); await wait(400);""")
    # Jardinier, chapeau, chapeau à l'eau
    # (le jardinier court récupérer son chapeau : comme un joueur, on retente si on arrive trop tard)
    await js(pg, """const h=item('chapeau');
                    for(let k=0;k<4&&!F.run.done.chapeau;k++){ const g=npc('gardener'); go(g.pos.x+2,g.pos.z+1.6,-2.3); await wait(400); F.yap(); for(let i=0;i<800&&h.vel;i++) await wait(50);   /* attendre qu'il retombe (rendu logiciel : 1 à 2 images/s, le vol dure plus de 10 s) */
                      if(!h.worn&&!h.carrier){ go(h.pos.x,h.pos.z-.9,0); F.grabOrDrop(); } await wait(300); if(!F.run.done.chapeau) await wait(2500); }
                    if(f.held&&f.held.kind==='chapeau'){ go(-4,3.3,Math.PI); await wait(400); F.dropHeld(); await wait(400); }""")
    # Mug dans la fontaine
    await js(pg, """const m=item('mug'); go(m.pos.x,m.pos.z+1,Math.PI); await wait(400); F.grabOrDrop(); await wait(300); go(-4,3.2,Math.PI); await wait(400); F.dropHeld(); await wait(400);""")
    # Boue : le commercial au téléphone près de la flaque
    await js(pg, """const s=npc('sales'); s.state='idle'; s.routeI=3; s.wait=8; s.pos.set(-9.7,0,4.3); await wait(300); go(-8.3,3.4,-1); await wait(300); F.yap(); await wait(600);""")
    # Imprimante → l'informaticien s'éloigne → serveur débranché discrètement (diversion + serveur)
    await js(pg, """go(7.6,8.2,-Math.PI/2); await wait(400); F.grabOrDrop(); for(let i=0;i<60&&!npc('it').diverted;i++) await wait(100);
                    F.S.sneakToggle=true; const p=item('prise'); go(p.pos.x,p.pos.z+1,Math.PI); await wait(500); F.grabOrDrop(); await wait(300); F.dropHeld(); F.S.sneakToggle=false; await wait(300);""")
    # Réunion
    await js(pg, "go(22.5,5,0); await wait(400); F.yap(); await wait(300);")
    # Pots : foncer dedans
    # (on garde les touches enfoncées jusqu'au choc : le rendu logiciel des tests tourne à 1-3 images/s)
    for i, (px, pz) in enumerate([(.2, 4.4), (-8.2, -4.2), (-9.4, -12.1)]):
        await js(pg, f"go({px-2.6},{pz},Math.PI/2); await wait(300);")
        await pg.keyboard.down('Shift'); await pg.keyboard.down('KeyD')
        for _ in range(36):
            await pg.wait_for_timeout(250)
            if await js(pg, f"return F.props.filter(p=>p.kind==='pot')[{i}].knocked;"): break
        await pg.keyboard.up('KeyD'); await pg.keyboard.up('Shift'); await pg.wait_for_timeout(300)
    # Baguette au terrier : le renard descend dans la salle souterraine (regions/terrier.js)
    await js(pg, """const b=item('baguette'); go(b.pos.x,6.6,0); await wait(400); F.grabOrDrop(); await wait(300); go(-8,0,13.5); go(-8,13.5,0); await wait(300); f.pos.set(-8,0,15);
                    for(let i=0;i<60&&F.S.region!=='terrier';i++) await wait(250);""")
    r = await js(pg, "return {done:Object.keys(F.run.done).sort(), goals:F.run.goals.length, ach:F.saved.ach, region:F.S.region, loot:F.run.loot, alerts:F.run.alerts};")
    missing = sorted(set(['carottes','jardinier','chapeau','chapeauEau','baguette','pots','mug','cafe','boue','serveur','imprimante','diversion','reunion','terrier']) - set(r['done']))
    check('partie complète : 13 bêtises + la secrète', not missing, 'manque ' + ','.join(missing) if missing else '')
    check('le terrier s’ouvre : le renard entre dans la salle souterraine', r['region'] == 'terrier' and r['loot'], f"{r['region']} · butin {r['loot']}")
    end = await js(pg, "for(let i=0;i<40&&document.querySelector('#endCard').hidden;i++) await wait(250); const c=document.querySelector('#endCard'); return {visible:!c.hidden, stats:c.querySelectorAll('#endStats dt').length, li:document.querySelector('#endLi').href, share:!!document.querySelector('#shareBtn,#shareText,#copyNote')||document.documentElement.innerHTML.includes('share-offsite'), fleau:!!F.saved.ach.fleau};")
    check('écran de fin : carte de progression + lien profil, sans bouton de partage', end['visible'] and end['stats'] >= 4 and 'linkedin.com/in/' in end['li'] and not end['share'], f"stats {end['stats']} · partage {end['share']}")
    check('succès « Fléau » débloqué', end['fleau'])
    await pg.screenshot(path=f'{OUT}/end_card.png')
    # Dans le terrier : une plaque raconte chaque souvenir du parcours, le tableau de liège ouvre la fiche complète
    r = await js(pg, """document.querySelector('#contBtn').click(); await wait(400); go(2, 262-3.15, Math.PI); await wait(1200);
                        const pl=document.querySelector('.den-plaque'); const plaque=pl&&!pl.hidden?pl.innerText:'';
                        const ia=F.interacts.find(i=>i.den==='board'); ia.action(ia); await wait(300);
                        return {plaque, burrow:!document.querySelector('#burrow').hidden, li:document.querySelector('#liBtn').href};""")
    check('terrier : plaque du parcours + fiche complète (LinkedIn) depuis le tableau', 'Sopra Steria' in r['plaque'] and r['burrow'] and 'linkedin.com/in/' in r['li'], r['plaque'][:60])
    await js(pg, "document.querySelector('#outBtn').click(); await wait(300);")
    check('aucune erreur console (partie complète)', not errs, '; '.join(errs[:3]))
    await ctx.close()

async def test_stealth_and_drop(browser):
    ctx, pg, errs = await page(browser, 480, 320); await ready(pg)
    await js(pg, "F.start('libre', false);")
    # Vol sous les yeux du boulanger → alerte
    r1 = await js(pg, """const b=npc('baker'), bg=item('baguette'); b.state='idle'; b.routeI=0; b.wait=20; b.pos.set(-20.6,0,9.5); b.yaw=Math.PI; await wait(300);
                         go(bg.pos.x,6.6,0); await wait(400); const before=F.run.alerts; F.grabOrDrop(); await wait(300); return {before, after:F.run.alerts, state:b.state, noticed:bg.noticed};""")
    check('vol vu → alerte « ! »', r1['after'] == r1['before'] + 1 and r1['noticed'], json.dumps(r1))
    # Objet lâché contre l'étal → posé hors de l'obstacle
    r2 = await js(pg, """go(-19,6.45,0); await wait(300); F.dropHeld(); await wait(200); const bg=item('baguette'); const S={x:-19,z:8,w:4.4,d:1.5};
                         const inside=Math.abs(bg.pos.x-S.x)<S.w/2&&Math.abs(bg.pos.z-S.z)<S.d/2; return {x:bg.pos.x,z:bg.pos.z,inside};""")
    check('objet lâché contre un meuble → posé à côté', not r2['inside'], json.dumps(r2))
    # Vol discret du mug quand le commercial est dehors → pas d'alerte
    r3 = await js(pg, """const s=npc('sales'); s.state='idle'; s.routeI=3; s.wait=30; s.pos.set(-9.7,0,4.3); await wait(300);
                         F.S.sneakToggle=true; const m=item('mug'); go(m.pos.x,m.pos.z+1,Math.PI); await wait(500); const before=F.run.alerts; F.grabOrDrop(); await wait(600);
                         const r={before, after:F.run.alerts, noticed:m.noticed, missAt:m.missAt!=null}; F.S.sneakToggle=false; return r;""")
    check('vol discret hors de vue → pas d’alerte', r3['after'] == r3['before'] and not r3['noticed'] and r3['missAt'], json.dumps(r3))
    # Gland doré
    r4 = await js(pg, """const a=F.acorns[0]; go(a.pos.x,a.pos.z,0); await wait(1200); const card=!document.querySelector('#factCard').hidden; const txt=document.querySelector('#factText').textContent;
                         document.querySelector('#factClose').click(); await wait(200); return {card, txt, saved:F.saved.acorns.length, paused:F.paused};""")
    check('gland doré → carte d’anecdote sauvegardée', r4['card'] and r4['saved'] >= 1 and not r4['paused'], r4['txt'][:50])
    await pg.screenshot(path=f'{OUT}/stealth.png')
    # Sauvegarde : 2 bêtises puis rechargement
    await js(pg, "F.dropHeld(); go(22.5,5,0); await wait(300); F.yap(); await wait(300); go(7.6,8.2,-Math.PI/2); await wait(300); F.grabOrDrop(); await wait(600);")
    await pg.reload(timeout=120000); await ready(pg)
    r5 = await js(pg, "return {btn:document.querySelector('#startBtn').textContent, newVisible:!document.querySelector('#newBtn').hidden};")
    ok5 = re.search(r'\((\d+)/\d+\)', r5['btn'])
    check('reprise de partie proposée après rechargement', ok5 and int(ok5.group(1)) >= 2 and r5['newVisible'], r5['btn'])
    await js(pg, "document.querySelector('#startBtn').click(); await wait(500);")
    r6 = await js(pg, "return {done:Object.keys(F.run.done), mug:item('mug').gone};")
    check('progression restaurée', 'reunion' in r6['done'] and 'imprimante' in r6['done'], ','.join(r6['done']))
    check('aucune erreur console (discrétion, sauvegarde)', not errs, '; '.join(errs[:3]))
    await ctx.close()

async def test_daily(browser):
    ctx, pg, errs = await page(browser, 480, 320); await ready(pg)
    await js(pg, "document.querySelector('#dailyBtn').click(); await wait(500);")
    r = await js(pg, "return {mode:F.run.mode, n:F.run.goals.length, li:document.querySelectorAll('#goals li').length, label:document.querySelector('#nbMode').textContent};")
    check('défi du jour : 5 bêtises', r['mode'] == 'defi' and r['n'] == 5 and r['li'] == 5, json.dumps(r))
    await ctx.close()

async def test_fallbacks(browser_factory):
    b = await browser_factory(["--disable-webgl", "--disable-3d-apis", "--disable-gpu"])
    ctx = await b.new_context(viewport={'width': 390, 'height': 800}); pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(2500)
    r = await pg.evaluate("({nogame:document.documentElement.classList.contains('nogame'), burrow:!document.querySelector('#burrow').hidden})")
    check('sans WebGL → profil affiché', r['nogame'] and r['burrow'])
    await b.close()
    b = await browser_factory(GL)
    ctx = await b.new_context(java_script_enabled=False, viewport={'width': 1280, 'height': 760}); pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(800)
    txt = await pg.inner_text('#burrow')
    check('sans JavaScript → profil lisible', 'Pierre Logre' in txt and 'Sopra Steria' in txt)
    resp = await pg.goto(URL + 'nimporte-quoi'); txt = await pg.inner_text('body')
    check('page 404 du renard', resp.status == 404 and 'renard' in txt.lower(), str(resp.status))
    await b.close()

async def test_mobile_and_perf(browser):
    ctx, pg, errs = await page(browser, 375, 667, is_mobile=True, has_touch=True, device_scale_factor=2); await ready(pg)
    r = await pg.evaluate("()=>{ const c=document.querySelector('#intro .card').getBoundingClientRect(); return {l:Math.round(c.left), r:Math.round(c.right), w:innerWidth}; }")
    check('mobile : la carte d’accueil tient dans l’écran', r['l'] >= 0 and r['r'] <= r['w'], json.dumps(r))
    await js(pg, "F.start('libre', false); await wait(400);")
    await js(pg, "document.querySelector('#toasts').insertAdjacentHTML('beforeend','<div class=\"toast\">Bêtise accomplie : test de chevauchement assez long</div>'); await wait(200);")
    r = await pg.evaluate("""()=>{ const R=s=>{const e=document.querySelector(s); if(!e||e.hidden) return null; const r=e.getBoundingClientRect(); return r.width&&r.height?r:null;};
       const ids=['#notebook','#tuto','#topRight','#stick','#tbtns','.toast']; const out=[]; for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){ const a=R(ids[i]), b=R(ids[j]); if(a&&b&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom) out.push(ids[i]+'∩'+ids[j]); }
       const tr=R('#topRight'); return {overlaps:out, topRightW:tr&&Math.round(tr.width), scrollW:document.documentElement.scrollWidth}; }""")
    check('mobile 375×667 : aucun chevauchement', not r['overlaps'], ', '.join(r['overlaps']))
    check('mobile : pas de défilement horizontal', r['scrollW'] <= 375, str(r['scrollW']))
    # Qualité auto : un téléphone fluide au palier 1 retrouve la pleine résolution (essai, gardé s'il reste fluide)
    r = await js(pg, "F.Q.done=false; F.Q.tier=1; F.renderer.setPixelRatio(1); F.Q.decide(60); const a=F.renderer.getPixelRatio(); F.Q.decide(60); const b=F.renderer.getPixelRatio(); F.Q.decide(59); return {a, b, c:F.renderer.getPixelRatio(), done:F.Q.done};")
    check('qualité auto : retour à la pleine résolution si le téléphone reste fluide', r['a'] == 1 and r['b'] > 1 and r['c'] == r['b'] and r['done'], json.dumps(r))
    await pg.screenshot(path=f'{OUT}/mobile.png')
    await ctx.close()
    ctx, pg, errs = await page(browser, 1280, 760); await ready(pg)
    await js(pg, "F.start('libre', false); await wait(1500);")
    calls = []
    for spot in [(-4, 5.5), (-20, -5), (15, 0), (-8, 12)]:
        c = await js(pg, f"go({spot[0]},{spot[1]},Math.PI); await wait(2500); return F.renderer.info.render.calls;")
        calls.append(c)
    check('budget village : < 180 appels de dessin', max(calls) < 180, ' / '.join(map(str, calls)))
    await js(pg, "go(-8,13.6,0); await wait(2500);")
    await pg.screenshot(path=f'{OUT}/occlusion_burrow.png')
    check('aucune erreur console (mobile, perf)', not errs, '; '.join(errs[:3]))
    await ctx.close()

async def test_world(browser):
    """Monde ouvert : régions, ouverture, voyages, mini-jeu, classement, carnet, sauvegarde v2."""
    ctx, pg, errs = await page(browser, 1280, 760, acorns_done=True); await ready(pg)
    await js(pg, "localStorage.removeItem('fox-leaderboard'); F.start('libre', false); await wait(1500);")
    r = await js(pg, """return {regions:F.REGIONS.length, goals:F.GOALS.length, secrets:F.GOALS.filter(g=>g.secret).length, ach:F.ACHIEVEMENTS.length,
                        built:F.REGIONS.filter(R=>R.built).map(R=>R.id)};""")
    check('monde : ≥ 10 régions, ≥ 80 bêtises dont ≥ 15 secrètes, ≥ 20 succès', r['regions'] >= 10 and r['goals'] >= 80 and r['secrets'] >= 15 and r['ach'] >= 20, f"{r['regions']} régions · {r['goals']} bêtises · {r['secrets']} secrètes · {r['ach']} succès")
    # Avant 4 bêtises : la forêt est fermée (on ne peut pas passer)
    # (un pas par image : en rendu logiciel lent, on laisse le jeu résoudre les collisions à chaque pas)
    r = await js(pg, """const frame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
                        go(-18.5,-19,Math.PI); for(let i=0;i<40;i++){ f.pos.z-=.3; F.fox.vel.set(0,0,0); await frame(); } await wait(1800); const blocked=f.pos.z>-21.2;
                        for(const id of ['jardinier','reunion','imprimante','mug']) F.completeGoal(id); await wait(600);
                        go(-18.5,-19,Math.PI); for(let i=0;i<60;i++){ f.pos.z-=.3; F.fox.vel.set(0,0,0); await frame(); } await wait(1500);
                        for(let i=0;i<40&&F.S.region!=='foret';i++) await wait(250);   // rendu logiciel lent : on attend la mise à jour de la région
                        return {blocked, unlocked:F.run.unlocked.slice(), z:f.pos.z, region:F.S.region};""")
    check('forêt fermée puis ouverte après 4 bêtises', r['blocked'] and 'foret' in r['unlocked'] and r['region'] == 'foret', json.dumps(r))
    # Toutes les régions : visite, aucune erreur, budget de dessin
    calls = {}
    for rid in ['foret', 'sport', 'moto', 'riviere', 'plage', 'gare', 'nantes', 'paris', 'montagne', 'ile']:
        c = await js(pg, f"""const R=F.RG['{rid}']; F.unlockRegion(R,false); F.teleport(R.spawn.x,R.spawn.z,0); await wait(3200); return [F.S.region, F.renderer.info.render.calls];""")
        calls[rid] = c
        await pg.screenshot(path=f'{OUT}/region_{rid}.png')
    bad = {k: v for k, v in calls.items() if v[0] != k}
    check('voyage dans chaque région (terriers)', not bad, json.dumps(bad) if bad else f"{len(calls)} régions")
    worst = max(v[1] for v in calls.values())
    check('budget par région : < 180 appels de dessin', worst < 180, ' · '.join(f"{k} {v[1]}" for k, v in calls.items()))
    # Mini-jeu : quelques tirs, fin, record, classement local (sans Supabase configuré)
    r = await js(pg, """const R=F.RG.sport; F.teleport(89,18,Math.PI); await wait(1200); const ia=F.interacts.find(i=>i.kind==='act'&&Math.abs(i.pos.x-89)<.1&&Math.abs(i.pos.z-18)<.1); ia.action(ia); await wait(300);
                        const active=F.MG.active; const key=c=>{ dispatchEvent(new KeyboardEvent('keydown',{code:c})); dispatchEvent(new KeyboardEvent('keyup',{code:c})); };
                        const hold=async(c,ms)=>{ dispatchEvent(new KeyboardEvent('keydown',{code:c})); await wait(ms); dispatchEvent(new KeyboardEvent('keyup',{code:c})); };
                        const cv=document.querySelector('#game'), aim=(x,y)=>{ const v=new F.THREE.Vector3(89+x,y,11).project(F.camera); cv.dispatchEvent(new PointerEvent('pointermove',{clientX:(v.x+1)/2*innerWidth, clientY:(1-v.y)/2*innerHeight, pointerType:'mouse', bubbles:true})); };
                        // on vise les lucarnes à la souris puis on tire ; on attend la fin de chaque tir (rendu logiciel lent)
                        for(let i=0;i<8&&!(F.MG.score>0&&i>=2);i++){ for(let k=0;k<120&&!F.MG.ready;k++) await wait(250); aim(i%2?-1.25:1.25,1.7); await wait(400); key('Space'); await wait(300); for(let k=0;k<120&&F.MG.busy;k++) await wait(250); }
                        F.endMinigameNow(); await wait(800); for(let i=0;i<30&&document.querySelector('#mgEnd').hidden;i++) await wait(250);
                        const end=!document.querySelector('#mgEnd').hidden; document.querySelector('#mgPseudo').value='Renard<script>'; document.querySelector('#mgSend').click(); await wait(800);
                        const lb=JSON.parse(localStorage.getItem('fox-leaderboard')||'{}'); const top=document.querySelector('#mgTop').textContent;
                        return {active, end, best:F.saved.mgBest, lb:(lb.list||[]).map(x=>x.pseudo), top, note:document.querySelector('#mgSent').textContent};""")
    check('mini-jeu « Tir au renard » : partie, score, fin', r['active'] and r['end'], f"record {r['best']}")
    check('classement + pseudo nettoyé (Renard<script> → Renardscript)', r['lb'] and r['lb'][0] == 'Renardscript' and 'Renardscript' in r['top'], json.dumps(r['lb']))
    pz = await js(pg, "return {bad:['C0nnard','s@lope','F.u.c.k'].map(F.pseudoOk), good:['Monique','Véronique','Pierre L.','Renard'].map(F.pseudoOk)};")
    check('pseudos abusifs refusés, prénoms courants acceptés', not any(pz['bad']) and all(pz['good']), json.dumps(pz))
    await pg.screenshot(path=f'{OUT}/minigame_end.png')
    await js(pg, "document.querySelector('#mgQuit').click(); await wait(400);")
    # Carnet de voyage : carte, succès, classement
    r = await js(pg, """F.openJournal('map'); await wait(400); const map=!document.querySelector('#journal').hidden, li=document.querySelectorAll('#jRegions li').length;
                        document.querySelector('[data-tab=ach]').click(); await wait(200); const ach=document.querySelectorAll('.ach').length;
                        document.querySelector('[data-tab=lb]').click(); await wait(600); const lb=document.querySelectorAll('#j-lb .lb li').length; F.closeJournal(); return {map, li, ach, lb};""")
    check('carnet de voyage : carte, succès, classement', r['map'] and r['li'] >= 10 and r['ach'] >= 20 and r['lb'] >= 1, json.dumps(r))
    await pg.screenshot(path=f'{OUT}/journal.png')
    # Une bêtise de région + sauvegarde v2 (régions ouvertes, position) après rechargement
    dbg = await js(pg, "F.completeGoal('ola'); F.teleport(-290,10,0); await wait(1500); return {paused:F.paused, x:f.pos.x};")
    await pg.reload(timeout=120000); await ready(pg)
    r = await js(pg, "document.querySelector('#startBtn').click(); await wait(2500); return {unlocked:F.run.unlocked.length, ola:!!F.run.done.ola, region:F.S.region, x:Math.round(f.pos.x)};")
    check('sauvegarde v2 : régions, bêtises et position restaurées', r['unlocked'] >= 10 and r['ola'] and r['region'] == 'paris', json.dumps(r) + ' ' + json.dumps(dbg))
    # Fil rouge : un souvenir ramassé au complexe sportif (il rejoindra l'étagère du terrier)
    r = await js(pg, """F.teleport(40.6, 23.6, Math.PI); await wait(1800); for(let i=0;i<24;i++){ go(40.6, 23.6-i*.1, Math.PI); await new Promise(r=>requestAnimationFrame(()=>r())); } await wait(400);
                        return {souv:F.run.flags.souv||[], toast:[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' | ')};""")
    check('fil rouge : souvenir ramassé (ballon de hand)', 'sport' in r['souv'], json.dumps(r))
    check('aucune erreur console (monde ouvert)', not errs, '; '.join(errs[:3]))
    await ctx.close()
    # Plan de caméra à l'ouverture d'une région + défi du jour sans ouverture
    ctx, pg, errs = await page(browser, 800, 600, acorns_done=True, cine=True); await ready(pg)
    r = await js(pg, """F.start('libre', false); await wait(500); for(const id of ['jardinier','reunion','imprimante','mug']) F.completeGoal(id);
                        let seen=false; for(let i=0;i<40;i++){ if(F.S.cine) seen=true; await wait(100); } await wait(3000); return {seen, after:!!F.S.cine, paused:F.paused, banner:document.querySelector('#regionBanner b').textContent};""")
    check('ouverture : plan de caméra puis retour au jeu', r['seen'] and not r['after'] and not r['paused'], json.dumps(r))
    await ctx.close()
    ctx, pg, errs = await page(browser, 375, 667, is_mobile=True, has_touch=True, acorns_done=True); await ready(pg)
    r = await js(pg, """F.start('defi'); await wait(300); for(const g of F.run.goals.slice(0,4)) F.completeGoal(g); await wait(300); const u=F.run.unlocked.length;
                        F.S.paused=false; return {u};""")
    check('défi du jour : aucune région ne s’ouvre', r['u'] == 0, json.dumps(r))
    await js(pg, "F.start && 0; localStorage.removeItem('fox-run-libre'); location.reload();")
    await ready(pg)
    r = await js(pg, """F.start('libre', false); await wait(300); F.openJournal('ach'); await wait(400); const j=document.querySelector('#journal .card').getBoundingClientRect();
                        return {w:Math.round(j.width), right:Math.round(j.right), scrollW:document.documentElement.scrollWidth};""")
    check('mobile : carnet de voyage lisible, sans débordement', r['right'] <= 375 and r['scrollW'] <= 375, json.dumps(r))
    await pg.screenshot(path=f'{OUT}/journal_mobile.png')
    check('aucune erreur console (plans, mobile)', not errs, '; '.join(errs[:3]))
    await ctx.close()

OVERLAP_JS = """()=>{ const R=s=>{const e=document.querySelector(s); if(!e||e.hidden||getComputedStyle(e).display==='none') return null; const r=e.getBoundingClientRect(); return r.width&&r.height?r:null;};
   const ids=['#notebook','#tuto','#topRight','#stick','#tbtns','.toast']; const out=[]; for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){ const a=R(ids[i]), b=R(ids[j]); if(a&&b&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom) out.push(ids[i]+'∩'+ids[j]); }
   const off=ids.filter(s=>{ const r=R(s); return r&&(r.left<0||r.right>innerWidth+1||r.top<0||r.bottom>innerHeight+1); }).map(s=>{ const r=R(s); return s+' '+[r.left,r.top,r.right,r.bottom].map(Math.round).join(','); });
   return {overlaps:out, off, scrollW:document.documentElement.scrollWidth}; }"""

async def test_first_minute(browser):
    # Carte d'accueil affichée avant que le jeu soit prêt (game.js retardé de 3 s), dans la langue du visiteur
    ctx = await browser.new_context(viewport={'width': 1280, 'height': 760}, locale='en-US')
    await offline_lb(ctx)
    await ctx.add_init_script("window.__foxNoCine=true")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'preloaded using link preload' not in m.text else None)
    async def slow(route):
        await asyncio.sleep(3); await route.continue_()
    await pg.route('**/assets/game.js*', slow)   # l'adresse porte la version (?v=…)
    await pg.goto(URL, wait_until='commit', timeout=120000); await pg.wait_for_selector('#startBtn', state='attached'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("""()=>({intro:!document.querySelector('#intro').hidden, busy:document.querySelector('#startBtn').getAttribute('aria-busy'), lang:document.documentElement.lang,
        h1:document.querySelector('#introH1').textContent, btn:document.querySelector('#startBtn').textContent, ready:!!window.__foxReady, hud:getComputedStyle(document.querySelector('#notebook')).visibility})""")
    check('accueil : carte affichée avant le jeu, en anglais pour un visiteur anglophone, bouton qui tourne', r['intro'] and r['busy'] == 'true' and r['lang'] == 'en' and 'fox' in r['h1'] and r['btn'] == 'Cause mischief' and not r['ready'] and r['hud'] == 'hidden', json.dumps(r))
    await pg.screenshot(path=f'{OUT}/intro_loading.png')
    await pg.click('#startBtn')
    await pg.wait_for_function('()=>window.__foxReady===true', timeout=120000)
    r = await js(pg, """for(let i=0;i<60&&!F.S.started;i++) await wait(100); return {started:F.S.started, tuto:F.dev.TUTO.on, step:F.dev.TUTO.step, busy:document.querySelector('#startBtn').hasAttribute('aria-busy'),
                        nb:getComputedStyle(document.querySelector('#notebook')).display, post:document.querySelector('#tuto').innerText};""")
    check('accueil : clic pendant le chargement retenu → partie lancée dès que le jeu est prêt, visite guidée', r['started'] and r['tuto'] and r['step'] == 'yap' and not r['busy'] and r['nb'] == 'none' and 'gardener' in r['post'], json.dumps(r))
    await pg.screenshot(path=f'{OUT}/tuto_step1.png')
    # Les trois bêtises guidées, avec les vraies règles du jeu (le jardinier réagit plus lentement pendant la visite)
    r = await js(pg, """const g=npc('gardener'), h=item('chapeau'), steps=[]; const until=async(fn,n=300)=>{ for(let i=0;i<n&&!fn();i++) await wait(50); };
        go(g.pos.x+2,g.pos.z+1.6,-2.3); await wait(300); F.yap(); const cool=+g.cool.toFixed(2);
        await until(()=>F.dev.TUTO.step!=='yap'); steps.push(F.dev.TUTO.step); const ease=g.easeK, chev=!document.querySelector('#tutoChev').hidden||null;
        for(let k=0;k<4&&!F.run.done.chapeau;k++){ for(let i=0;i<800&&h.vel;i++) await wait(50);
          if(h.worn){ go(g.pos.x+2,g.pos.z+1.6,-2.3); await wait(300); F.yap(); continue; } go(h.pos.x,h.pos.z-.9,0); F.grabOrDrop(); await wait(300); }
        await until(()=>F.dev.TUTO.step==='fountain'); steps.push(F.dev.TUTO.step);
        go(-4,3.3,Math.PI); await wait(300); F.dropHeld(); await until(()=>F.dev.TUTO.step==='done'); steps.push(F.dev.TUTO.step);
        const win=document.querySelector('#tuto').classList.contains('win');
        await until(()=>!F.dev.TUTO.on,400); await wait(400); const nb=document.querySelector('#notebook');
        return {cool, ease, steps, win, on:F.dev.TUTO.on, saved:F.saved.tuto, nb:getComputedStyle(nb).display, more:!!nb.querySelector('.nb-more'), easeAfter:g.easeK,
                done:['jardinier','chapeau','chapeauEau'].every(i=>F.run.done[i])};""")
    check('visite guidée : glapir → chapeau → fontaine, puis le carnet revient (« la suite est ici »)', r['steps'] == ['grab', 'fountain', 'done'] and r['win'] and not r['on'] and r['saved'] == 1 and r['nb'] == 'block' and r['more'] and r['done'], json.dumps(r))
    check('visite guidée : le jardinier réagit plus lentement (2,6 s, ×0,8), puis redevient normal', r['cool'] >= 2.4 and r['ease'] == .8 and r['easeAfter'] == 1, json.dumps(r))
    await pg.screenshot(path=f'{OUT}/tuto_done.png')
    await js(pg, "localStorage.removeItem('fox-run-libre'); location.reload();")
    await pg.wait_for_function('()=>window.__foxReady===true', timeout=120000)
    r = await js(pg, "F.start('libre', false); await wait(500); return {on:F.dev.TUTO.on, nb:getComputedStyle(document.querySelector('#notebook')).display};")
    check('visite guidée : vue une fois, elle ne revient pas', not r['on'] and r['nb'] == 'block', json.dumps(r))
    check('aucune erreur console (première minute)', not errs, '; '.join(errs[:3]))
    await ctx.close()

async def test_touch_feel(browser):
    ctx, pg, errs = await page(browser, 390, 844, is_mobile=True, has_touch=True, device_scale_factor=2); await ready(pg)
    await js(pg, "F.start('libre', false); await wait(500); document.querySelector('#toasts').insertAdjacentHTML('beforeend','<div class=\"toast\">Bêtise accomplie : test de chevauchement assez long</div>'); await wait(200);")
    r = await pg.evaluate(OVERLAP_JS)
    check('téléphone 390×844 : post-it de la visite, boutons et carnet sans chevauchement', not r['overlaps'] and not r['off'] and r['scrollW'] <= 390, json.dumps(r))
    await pg.screenshot(path=f'{OUT}/touch_tuto.png')
    r = await js(pg, "document.querySelector('#tutoSkip').click(); await wait(700); const nb=document.querySelector('#notebook'); return {on:F.dev.TUTO.on, saved:F.saved.tuto, disp:getComputedStyle(nb).display, collapsed:nb.classList.contains('collapsed'), more:!!nb.querySelector('.nb-more')};")
    check('visite guidée : « Passer » rend la main ; au téléphone le carnet reste replié mais signalé', not r['on'] and r['saved'] == 1 and r['disp'] == 'block' and r['collapsed'] and r['more'], json.dumps(r))
    # Joystick flottant : vrais touchers (CDP)
    cdp = await ctx.new_cdp_session(pg)
    async def touch(kind, x=0, y=0):
        await cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})
    center = "const b=document.querySelector('#stick').getBoundingClientRect(); return [Math.round(b.left+b.width/2), Math.round(b.top+b.height/2)];"
    rest = await js(pg, center)
    z0 = await js(pg, "return f.pos.z;")
    await touch('touchStart', 140, 560); await touch('touchMove', 140, 500)
    r = await js(pg, center + "")
    s1 = await js(pg, "const s=F.dev.stick; return [+s.x.toFixed(2), +s.y.toFixed(2)];")
    await js(pg, "for(let i=0;i<6;i++) await new Promise(r=>requestAnimationFrame(()=>r()));")
    z1 = await js(pg, "return f.pos.z;")
    await touch('touchEnd')
    back = await js(pg, center); s2 = await js(pg, "const s=F.dev.stick; return [s.x, s.y];")
    ok = abs(r[0] - 140) <= 2 and abs(r[1] - 560) <= 2 and abs(s1[0]) < .05 and s1[1] <= -.95 and z1 < z0 - .05 and back == rest and s2 == [0, 0]
    check('joystick flottant : le cercle vient sous le pouce, course à fond, le renard avance, retour au repos', ok, json.dumps({'rest': rest, 'moved': r, 'stick': s1, 'z': [round(z0, 2), round(z1, 2)], 'back': back}))
    await touch('touchStart', rest[0], rest[1]); await touch('touchMove', rest[0] + 4, rest[1] - 3)
    dz = await js(pg, center + "")
    sd = await js(pg, "const s=F.dev.stick; return [s.x, s.y];")
    await touch('touchEnd')
    check('joystick : pouce posé dans le cercle → il ne bouge pas ; petite zone morte au centre', dz == rest and sd == [0, 0], json.dumps({'c': dz, 'stick': sd}))
    # Bouton Attraper : s'allume à portée (portée plus large au doigt), devient « Poser »
    r = await js(pg, """const bg=item('baguette'), b=npc('baker'); b.state='idle'; b.routeI=0; b.wait=30; b.pos.set(-23,0,9.5);
        go(bg.pos.x, bg.pos.z-2.6, 0); await wait(400); const far=F.dev.nearestTarget(); const btn=document.querySelector('#tGrab');
        for(let i=0;i<20&&!btn.classList.contains('ready');i++) await wait(100); const ready=btn.classList.contains('ready');
        go(bg.pos.x, 6.6, 0); await wait(300); F.grabOrDrop(); for(let i=0;i<20&&!btn.classList.contains('holding');i++) await wait(100);
        const hold={c:btn.classList.contains('holding'), t:btn.textContent}; F.dropHeld(); for(let i=0;i<20&&btn.classList.contains('holding');i++) await wait(100);
        return {far:far&&far.kind, ready, hold, after:btn.textContent};""")
    check('bouton Attraper : s’allume à portée (2,1 m de la gueule), devient « Poser », puis revient', r['far'] == 'baguette' and r['ready'] and r['hold']['c'] and r['hold']['t'] in ('Poser', 'Drop') and r['after'] in ('Attraper', 'Grab'), json.dumps(r))
    # Glissade le long d'un mur (étal du boulanger) : il garde la vitesse qui longe le mur ; de face, il ne court pas sur place
    async def push(keys, frames=8):
        await js(pg, "go(-19,6.7,0); f.vel.set(0,0,0); await wait(100);")
        for k in keys: await pg.keyboard.down(k)
        r = await js(pg, f"for(let i=0;i<{frames};i++) await new Promise(r=>requestAnimationFrame(()=>r())); return {{x:+f.pos.x.toFixed(2), z:+f.pos.z.toFixed(2), vx:+f.vel.x.toFixed(2), vz:+f.vel.z.toFixed(2)}};")
        for k in keys: await pg.keyboard.up(k)
        return r
    a = await push(['KeyS', 'KeyD']); b = await push(['KeyS'])
    check('contre un mur : glisse le long (vitesse le long du mur gardée), ne court pas sur place de face', a['x'] > -18.95 and a['z'] < 6.8 and abs(a['vz']) < 1 and a['vx'] > 1.5 and abs(b['vz']) < 1 and abs(b['vx']) < .5, json.dumps({'biais': a, 'face': b}))
    # Plafond 60 i/s : 120 Hz simulé → 60 images dessinées par seconde ; 60 Hz inchangé ; test #bench sans plafond
    r = await js(pg, """const {pace,PACE}=F.dev; const save={...PACE, ivs:[...PACE.ivs]}; Object.assign(PACE,{fast:0,cap:false,last:0,lastDraw:-1e9,ivs:[]});
        let t=1000, n120=0, n60=0, nb=0; for(let i=0;i<120;i++){ t+=1000/120; pace(t,false); } for(let i=0;i<120;i++){ t+=1000/120; if(pace(t,false)) n120++; }
        const cap=PACE.cap; for(let i=0;i<120;i++){ t+=1000/120; if(pace(t,true)) nb++; } for(let i=0;i<60;i++){ t+=1000/60; pace(t,false); } for(let i=0;i<60;i++){ t+=1000/60; if(pace(t,false)) n60++; }
        const cap60=PACE.cap; Object.assign(PACE,save); return {cap, n120, nb, n60, cap60};""")
    check('écran 120 Hz : 60 images par seconde dessinées (une sur deux), 60 Hz inchangé, #bench sans plafond', r['cap'] and r['n120'] == 60 and r['nb'] == 120 and r['n60'] == 60 and not r['cap60'], json.dumps(r))
    check('aucune erreur console (sensations au doigt)', not errs, '; '.join(errs[:3]))
    await ctx.close()
    # Téléphone à l'horizontale : post-it, carnet, boutons et message sans chevauchement
    ctx, pg, errs = await page(browser, 844, 390, is_mobile=True, has_touch=True, device_scale_factor=2); await ready(pg)
    await js(pg, "F.start('libre', false); await wait(500); document.querySelector('#toasts').insertAdjacentHTML('beforeend','<div class=\"toast\">Bêtise accomplie : test de chevauchement assez long</div>'); await wait(200);")
    r1 = await pg.evaluate(OVERLAP_JS)
    await pg.screenshot(path=f'{OUT}/touch_landscape_tuto.png')
    await js(pg, "F.dev.skipTuto(); await wait(900); const nb=document.querySelector('#notebook'); for(let i=0;i<40&&nb.getAnimations().length;i++) await wait(100);")   # fin de l'entrée du carnet
    r2 = await pg.evaluate(OVERLAP_JS)
    check('téléphone à l’horizontale (844×390) : rien ne se chevauche, ni pendant ni après la visite', not r1['overlaps'] and not r1['off'] and not r2['overlaps'] and not r2['off'], json.dumps({'pendant': r1, 'après': r2}))
    await pg.screenshot(path=f'{OUT}/touch_landscape.png')
    check('aucune erreur console (téléphone à l’horizontale)', not errs, '; '.join(errs[:3]))
    await ctx.close()

async def test_reactions(browser):
    ctx, pg, errs = await page(browser, 900, 600, acorns_done=True); await ready(pg)
    await js(pg, "F.start('libre', false); await wait(300); F.dev.skipTuto(); await wait(300);")
    # Le boulanger glapi trois fois de suite : surpris, agacé (poing levé), puis il chasse le renard
    r = await js(pg, """const b=npc('baker'); b.state='idle'; b.routeI=0; b.wait=30; b.cool=0; b.pos.set(-20.6,0,9.5); go(-20.6,12,Math.PI); await wait(300);
        const caught=F.run.caught, st=[]; F.yap(); st.push({a:b.annoy, flail:b.flailT>0}); await wait(250);
        F.yap(); st.push({a:b.annoy, shake:b.shakeT>0, freeze:b.freezeT>0}); for(let i=0;i<60&&b.freezeT>0;i++) await wait(50);
        go(-20.6,12,Math.PI); F.yap(); st.push({state:b.state});
        let pushed=false; const z0=f.pos.z; for(let i=0;i<200&&b.state==='shoo';i++){ await new Promise(r=>requestAnimationFrame(()=>r())); }
        return {st, after:b.state, caught:F.run.caught-caught, dz:+(f.pos.z-z0).toFixed(2), bubbles:[...document.querySelectorAll('.bubble')].map(e=>e.textContent)};""")
    ok = r['st'][0]['a'] == 1 and r['st'][0]['flail'] and r['st'][1]['a'] == 2 and r['st'][1]['shake'] and r['st'][2]['state'] == 'shoo' and r['after'] in ('return', 'tired') and r['caught'] == 0
    check('habitant glapi trois fois : surpris, agacé (poing levé), puis il chasse le renard sans l’attraper', ok, json.dumps(r, ensure_ascii=False))
    # Le jardinier rapporte une carotte : glapi, il la lâche de surprise, puis revient la chercher
    r = await js(pg, """const g=npc('gardener'), c=F.items.find(i=>i.kind==='carotte'); c.planted=false; c.noticed=true; c.carrier=g; g.carry=c; g.state='bring'; g.stateT=0; g.pos.set(-22,0,-4); await wait(200);
        go(-22,-1.5,Math.PI); await wait(200); F.yap(); const d={carry:!!g.carry, carrier:!!c.carrier, y:+c.pos.y.toFixed(2), freeze:g.freezeT>0, state:g.state};
        for(let i=0;i<300&&!(g.carry===c);i++) await new Promise(r=>requestAnimationFrame(()=>r()));
        return {d, back:g.carry===c, state:g.state};""")
    check('il rapportait une carotte : glapi, il la lâche de surprise, puis revient la chercher', not r['d']['carry'] and not r['d']['carrier'] and r['d']['y'] < .2 and r['d']['freeze'] and r['back'], json.dumps(r))
    # Deux bêtises en moins de 12 s : « Doublé ! »
    r = await js(pg, "F.completeGoal('imprimante'); await wait(100); F.completeGoal('reunion'); await wait(1200); return [...document.querySelectorAll('.toast')].map(t=>t.textContent);")
    check('deux bêtises enchaînées : « Doublé ! »', any(('Double' in x) or ('Doublé' in x) for x in r), ' | '.join(r))
    # Indice automatique après 45 s sans progrès : il montre l'endroit (anneau + flèche « Indice »)
    r = await js(pg, """F.S.hintN=0; go(-4,5.5,Math.PI); F.run.lastProgress=F.run.elapsed-50; for(let i=0;i<40&&!F.S.hintDest;i++) await wait(100);
        const h=F.S.hintDest; await wait(300); return {id:h&&h.id, toast:[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' | '), arrow:document.querySelector('#destArrow').innerText};""")
    check('indice automatique : il propose la bêtise la plus proche et montre l’endroit', bool(r['id']) and '💡' in r['toast'], json.dumps(r, ensure_ascii=False))
    check('aucune erreur console (réactions)', not errs, '; '.join(errs[:3]))
    await ctx.close()

async def slow_game(route):
    await asyncio.sleep(2); await route.continue_()

async def test_languages(browser):
    """Anglais par défaut (même pour un navigateur français), français à /fr/, choix du visiteur retenu ;
    référencement : titres, canonique, hreflang, Open Graph, données structurées, llms.txt, sitemap bilingue."""
    import urllib.request
    out = {}
    for loc, path in [('fr-FR', ''), ('en-US', 'fr/')]:
        ctx = await browser.new_context(viewport={'width': 1024, 'height': 700}, locale=loc); await offline_lb(ctx)
        await ctx.route('**/assets/game.js*', slow_game)   # la carte d'accueil est lue avant que le jeu prenne la main
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + path, wait_until='commit', timeout=120000); await pg.wait_for_selector('#startBtn', state='attached'); await pg.wait_for_timeout(200)
        early = await pg.evaluate("()=>({lang:document.documentElement.lang, h1:document.querySelector('#introH1').textContent, btn:document.querySelector('#startBtn').textContent.trim()})")
        await pg.wait_for_function('()=>window.__foxReady===true', timeout=120000)
        late = await js(pg, "F.start('libre', false); await wait(300); return {lang:F.S.lang, nb:document.querySelector('#notebook h2').textContent, aria:document.querySelector('#game').getAttribute('aria-label')};")
        out[path or '/'] = (early, late, errs)
        await ctx.close()
    e, l, errs = out['/']
    check('« / » en anglais par défaut, même pour un navigateur réglé en français', e['lang'] == 'en' and 'fox' in e['h1'] and e['btn'] == 'Cause mischief' and l['lang'] == 'en' and 'mischief' in l['nb'] and l['aria'].startswith('Game world') and not errs, json.dumps({'avant': e, 'jeu': l}, ensure_ascii=False))
    e, l, errs = out['fr/']
    check('« /fr/ » en français (carte d’accueil, jeu, libellés)', e['lang'] == 'fr' and 'renard' in e['h1'] and e['btn'] == 'Faire des bêtises' and l['lang'] == 'fr' and 'Bêtises' in l['nb'] and l['aria'].startswith('Monde du jeu') and not errs, json.dumps({'avant': e, 'jeu': l}, ensure_ascii=False))
    # choix du visiteur (bouton FR) retenu sur « / », dès la carte d'accueil
    ctx = await browser.new_context(viewport={'width': 1024, 'height': 700}); await offline_lb(ctx)
    await ctx.route('**/assets/game.js*', slow_game)
    await ctx.add_init_script("try{ if(!sessionStorage.getItem('once')){ sessionStorage.setItem('once','1'); localStorage.setItem('fox-betises-v2', JSON.stringify({lang:'fr'})); } }catch(e){}")
    pg = await ctx.new_page()
    await pg.goto(URL, wait_until='commit', timeout=120000); await pg.wait_for_selector('#startBtn', state='attached'); await pg.wait_for_timeout(200)
    e = await pg.evaluate("()=>({lang:document.documentElement.lang, btn:document.querySelector('#startBtn').textContent.trim(), sw:document.querySelector('#langBtn2').textContent})")
    await pg.wait_for_function('()=>window.__foxReady===true', timeout=120000)
    r = await js(pg, "document.querySelector('#langBtn2').click(); await wait(200); return {lang:F.S.lang, saved:F.saved.lang, h1:document.querySelector('#introH1').textContent, sw:document.querySelector('#langBtn2').textContent};")
    check('choix de langue du visiteur retenu (FR sur « / »), puis bouton EN', e['lang'] == 'fr' and e['btn'] == 'Faire des bêtises' and e['sw'] == 'EN' and r['lang'] == 'en' and r['saved'] == 'en' and 'fox' in r['h1'] and r['sw'] == 'FR', json.dumps({'avant': e, 'après': r}, ensure_ascii=False))
    await ctx.close()
    # sans JavaScript : la fiche dans la langue de la page
    ctx = await browser.new_context(java_script_enabled=False, viewport={'width': 1024, 'height': 700}); pg = await ctx.new_page()
    await pg.goto(URL); en = await pg.inner_text('#burrow'); await pg.goto(URL + 'fr/'); fr = await pg.inner_text('#burrow')
    check('sans JavaScript : fiche en anglais à « / », en français à « /fr/ »', "THE FOX'S TRAIL" in en.upper() and 'Follow me on LinkedIn' in en and 'LE PARCOURS DU RENARD' in fr.upper() and 'Me suivre sur LinkedIn' in fr)
    await ctx.close()
    # référencement
    def get(u):
        with urllib.request.urlopen(URL + u) as r: return r.status, r.headers.get('Content-Type', ''), r.read().decode('utf-8')
    seo = {}
    for u in ['', 'fr/']:
        st, ct, html = get(u)
        head = html.split('</head>')[0]
        ld = json.loads(re.search(r'<script type="application/ld\+json">(.+?)</script>', head).group(1))
        types = [x['@type'] for x in ld['@graph']]
        seo[u or '/'] = {'title': re.search(r'<title>(.+?)</title>', head).group(1), 'canon': re.search(r'rel="canonical" href="([^"]+)"', head).group(1),
                         'hreflang': sorted(re.findall(r'hreflang="([^"]+)"', head)), 'locale': re.search(r'og:locale" content="([^"]+)"', head).group(1),
                         'ogimg': re.search(r'og:image" content="([^"]+)"', head).group(1), 'types': types, 'desc_len': len(re.search(r'name="description" content="([^"]+)"', head).group(1))}
    st, ct, llms = get('llms.txt'); _, _, smap = get('sitemap.xml')
    ok = (seo['/']['canon'].endswith('.com/') and seo['fr/']['canon'].endswith('/fr/') and all(v['hreflang'] == ['en', 'fr', 'x-default'] for v in seo.values())
          and seo['/']['locale'] == 'en_US' and seo['fr/']['locale'] == 'fr_FR' and seo['/']['ogimg'].endswith('og-image-en.jpg') and 'Account Executive' in seo['/']['title']
          and all({'ProfilePage', 'Person', 'WebSite', 'VideoGame'} <= set(v['types']) for v in seo.values()) and all(v['desc_len'] <= 165 for v in seo.values())
          and st == 200 and ct.startswith('text/plain') and '# Pierre Logre' in llms and 'Sopra Steria' in llms and smap.count('hreflang="fr"') == 2)
    check('référencement : titres, canonique, hreflang, Open Graph, données structurées, llms.txt, sitemap bilingue', ok, json.dumps(seo, ensure_ascii=False))

async def test_leaderboard_online(browser):
    """Classement partagé : requêtes conformes (clé publique seule, vue « leaderboard », ajout minimal), meilleur score
    par pseudo, pseudos abusifs filtrés, repli local si le serveur refuse. Faux serveur : rien n'est écrit dans le vrai."""
    cfg = json.load(open(os.path.join(ROOT, 'src', 'site.config.json'))).get('leaderboard', {})
    key = cfg.get('publishableKey') or cfg.get('anonKey')
    if not (cfg.get('supabaseUrl') and key):
        check('classement en ligne : non configuré (repli local seulement)', True); return
    rows = [{'pseudo': 'Monique', 'score': 900}, {'pseudo': 'Monique', 'score': 400}, {'pseudo': 'C0nnard', 'score': 5000}, {'pseudo': 'Renard', 'score': 700}]
    seen = {}
    ctx = await browser.new_context(viewport={'width': 900, 'height': 600})
    await offline_lb(ctx, rows, seen)
    await ctx.add_init_script("window.__foxNoCine=true")
    pg = await ctx.new_page(); errs = []; phase = {'down': False}
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    # pendant la panne simulée, Chrome signale le 503 du faux serveur dans la console : seul ce message-là est attendu
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'preloaded using link preload' not in m.text
          and not (phase['down'] and SUPABASE.match((m.location or {}).get('url', '')) and '503' in m.text) else None)
    await pg.goto(URL, timeout=120000); await ready(pg)
    r = await js(pg, """F.start('libre', false); await wait(300); F.dev.skipTuto(); const L=F.dev.lb;
        const before=await L.top(); const sent=await L.submit('Véro', 1234); const after=await L.top();
        F.openJournal('lb'); for(let i=0;i<40&&!document.querySelector('#j-lb .lb li');i++) await wait(100);
        const pane=document.querySelector('#j-lb').innerText; F.closeJournal();
        return {before, sent, after, pane};""")
    names = [x['pseudo'] for x in r['after']['list']]
    bad = [h for h in seen.get('headers', []) if h['apikey'] != key or (h['authorization'] and key.startswith('sb_publishable_'))]
    post = seen.get('post', [])
    ok = (r['before']['online'] and r['sent'] and r['after']['online'] and names[:3] == ['Véro', 'Monique', 'Renard'] and 'C0nnard' not in names
          and names.count('Monique') == 1 and not bad and all('/rest/v1/leaderboard?' in u for u in seen.get('get', []))
          and post and post[0]['url'].endswith('/rest/v1/scores') and post[0]['prefer'] == 'return=minimal'
          and post[0]['body'] == {'pseudo': 'Véro', 'score': 1234, 'game': 'handball'} and ('Shared online leaderboard' in r['pane'] or 'Classement partagé en ligne' in r['pane']))
    check('classement en ligne : clé publique seule, meilleur score par pseudo, pseudo abusif filtré, envoi conforme', ok,
          json.dumps({'noms': names, 'entêtes refusés': len(bad), 'envoi': post[:1], 'carnet': r['pane'][:80]}, ensure_ascii=False))
    # serveur en panne : le score reste dans ce navigateur, le carnet le dit, sans erreur du jeu
    phase['down'] = True; await offline_lb(ctx, rows, seen, down=True)
    r = await js(pg, """await new Promise(r=>setTimeout(r,21000)); const L=F.dev.lb; const sent=await L.submit('Véro', 2000); const t=await L.top();
        F.openJournal('lb'); for(let i=0;i<40&&!document.querySelector('#j-lb .lb li');i++) await wait(100); const pane=document.querySelector('#j-lb').innerText; F.closeJournal();
        return {sent, online:t.online, top:t.list[0], pane};""")
    check('classement injoignable : score gardé dans le navigateur, le carnet le signale', r['sent'] is False and r['online'] is False and r['top'] and r['top']['score'] == 2000
          and ('unreachable' in r['pane'] or 'injoignable' in r['pane']), json.dumps(r, ensure_ascii=False))
    check('aucune erreur console (classement en ligne)', not errs, '; '.join(errs[:3]))
    await ctx.close()

async def main():
    srv = serve()
    async with async_playwright() as p:
        launch = lambda args: p.chromium.launch(args=args)
        b = await launch(GL)
        only = [x for x in os.environ.get('TESTS', '').split(',') if x]
        for t in (test_playthrough, test_stealth_and_drop, test_daily, test_mobile_and_perf, test_world, test_first_minute, test_touch_feel, test_reactions, test_leaderboard_online, test_languages):
            if only and t.__name__ not in only: continue
            try: await t(b)
            except Exception as e:
                check(t.__name__, False, 'exception : ' + str(e)[:200])
                for c in list(b.contexts): await c.close()   # une page restée ouverte (3D en rendu logiciel) ralentirait les tests suivants
        await b.close()
        if not only or 'test_fallbacks' in only:
            try: await test_fallbacks(launch)
            except Exception as e: check('test_fallbacks', False, 'exception : ' + str(e)[:200])
    srv.shutdown()
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} vérifications réussies. Captures : {OUT}")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    asyncio.run(main())
