#!/usr/bin/env python3
"""Génère l'image d'aperçu LinkedIn (1200×630, JPEG) en FR et EN depuis la vue figée #og.
Usage : python3 tests/og.py   (le serveur tests/csp_server.py doit tourner sur :8766)"""
import asyncio, os
from playwright.async_api import async_playwright
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets')
WWW = os.path.join(ROOT, 'site', 'www')
CARD = {
  'fr': ('Pierre Logre', '<em>le renard</em> fait des bêtises', 'Un petit jeu en Vendée : village, forêt, plage, Nantes, Paris… Trouve le terrier secret.'),
  'en': ('Pierre Logre', 'the fox <em>causes mischief</em>', 'A tiny game in Vendée: village, forest, beach, Nantes, Paris… Find the secret den.'),
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1200, "height": 630})
        await pg.goto("http://127.0.0.1:8766/#og", timeout=120000)
        await pg.wait_for_function("window.__foxReady===true", timeout=120000); await pg.wait_for_timeout(6000)
        bang = await pg.evaluate("__fox.screenOf(__fox.gardener)")
        foxp = await pg.evaluate("__fox.screenOf(__fox.fox)")
        bg = os.path.join(WWW, '_og_bg.png'); await pg.screenshot(path=bg)
        for lang, (name, tag, sub) in CARD.items():
            css = f'''
body{{margin:0;width:1200px;height:630px;position:relative;overflow:hidden;background:url(_og_bg.png) center/cover}}
.c{{position:absolute;left:56px;top:70px;width:500px;background:#fbf6e6;border-radius:8px;padding:30px 34px 28px;box-shadow:0 24px 60px rgba(40,50,30,.3);transform:rotate(-1.5deg);
 background-image:repeating-linear-gradient(transparent 0 33px,rgba(90,120,170,.15) 33px 34px);background-position:0 18px}}
h1{{font:800 66px/.95 "Baloo 2";margin:0 0 12px;color:#2f2a24}} h1 em{{font-style:normal;color:#e8742a}}
p{{font:30px/1.2 "Patrick Hand";margin:0 0 18px;color:#2f2a24}}
.u{{display:inline-block;font:800 24px "Baloo 2";color:#fff;background:#e8742a;padding:6px 18px 4px;border-radius:999px}}
.bang{{position:absolute;left:{bang[0]}px;top:{bang[1]}px;transform:translate(-50%,-100%);background:#ffd23f;color:#2f2a24;font:800 40px/1.3 "Baloo 2";padding:0 19px;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,.2)}}
.yap{{position:absolute;left:{foxp[0]-10}px;top:{foxp[1]+20}px;transform:translate(-50%,-100%) rotate(-4deg)!important;background:#e8742a;color:#fff;font:800 26px "Baloo 2";padding:4px 16px;border-radius:16px;transform:rotate(-4deg)}}
'''
            open(os.path.join(WWW, '_og.css'), 'w').write(css)
            html = f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="assets/style.css"><link rel="stylesheet" href="_og.css"></head><body><div class="c"><h1>{name}<br>{tag}</h1><p>{sub}</p><span class="u">pierrelogre.com</span></div><div class="bang">!</div><div class="yap">{'Yap !' if lang=='fr' else 'Yap!'}</div></body></html>'''
            open(os.path.join(WWW, '_og.html'), 'w').write(html)
            await pg.goto("http://127.0.0.1:8766/_og.html"); await pg.wait_for_timeout(1200)
            png = os.path.join(WWW, '_og.png'); await pg.screenshot(path=png)
            name_out = 'og-image.jpg' if lang == 'fr' else 'og-image-en.jpg'
            Image.open(png).convert('RGB').save(os.path.join(OUT, name_out), quality=82, optimize=True, progressive=True)
            print(name_out, os.path.getsize(os.path.join(OUT, name_out)) // 1024, 'Ko')
        for f in ('_og_bg.png', '_og.html', '_og.png', '_og.css'): os.remove(os.path.join(WWW, f))
        await b.close()
asyncio.run(main())
