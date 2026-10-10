// Build : src/ → dist/artifact.html (aperçu Claude, tout en ligne) + site/www (OVH, CSP stricte)
//   node build.mjs          build complet
//   node build.mjs --watch  reconstruit l'aperçu à chaque modification
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { T } from './src/js/i18n.js';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = p => path.join(ROOT, 'src', p);
const CFG = JSON.parse(fs.readFileSync(SRC('site.config.json'), 'utf8'));
const read = p => fs.readFileSync(p, 'utf8');

/* ---------- 1. Bundle JS (Three.js tree-shaké + jeu) ---------- */
const result = await esbuild.build({
  entryPoints: [SRC('js/main.js')], bundle: true, format: 'esm', minify: true, write: false,
  target: ['es2020'], legalComments: 'none', metafile: true, logLevel: 'warning',
});
const gameJs = result.outputFiles[0].text;
const bootJs = (await esbuild.transform(read(SRC('boot.js')), { minify: true, target: 'es2015' })).code;
const css = read(SRC('style.css'));

/* ---------- 2. Contenu statique (FR) : lisible sans JS, par Google et en mode sans jeu ---------- */
const F = T.fr;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let body = read(SRC('body.html'))
  .replace(/(<([a-z0-9]+)\b[^>]*\bdata-t="([A-Za-z]+)"[^>]*>)(<\/\2>)/g,
    (m, open, tag, key, close) => (key in F && typeof F[key] === 'string') ? open + esc(F[key]) + close : m);
const fill = (id, inner) => {
  const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\bid="${id}"[^>]*>)(</\\2>)`);
  if (!re.test(body)) throw new Error('élément introuvable : #' + id);
  body = body.replace(re, (m, open, tag, close) => open + inner + close);
};
fill('help', F.help);
fill('introH1', F.introH1);
fill('introKeys', F.keys.map(([k, v]) => `<kbd>${esc(k)}</kbd><span>${esc(v)}</span>`).join(''));
fill('bStats', F.stats.map(([v, l]) => `<div class="stat"><strong>${esc(v === '{loot}' ? '0' : v)}</strong><span>${esc(l)}</span></div>`).join(''));
fill('bTrail', F.trail.map(([y, c, r, d]) => `<li><span class="yr">${esc(y)}</span><div class="what"><b>${esc(c)}</b><em>${esc(r)}</em><p>${esc(d)}</p></div></li>`).join(''));
fill('bCerts', F.certs.map(c => `<span>${esc(c)}</span>`).join(''));
fill('bSkillsList', F.skills.map(c => `<span>${esc(c)}</span>`).join(''));
fill('bEdu', F.edu.map(c => `<li>${esc(c)}</li>`).join(''));
fill('bHobbies', F.hobbies.map(c => `<li>${esc(c)}</li>`).join(''));
fill('bLegal', F.legal);
fill('loot', esc(F.loot0));
body = body.replace(/id="liBtn"/, `id="liBtn" href="${CFG.linkedin}"`)
  .replace(/id="liChip"/, `id="liChip" href="${CFG.linkedin}"`)
  .replace(/id="ghBtn"/, `id="ghBtn" href="${CFG.github}"`);

/* ---------- 3. Aperçu Artifact (une seule page, tout en ligne) ---------- */
const inlineSafe = s => s.replace(/<\/script/gi, '<\\/script');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/artifact.html'), `<title>Renard de Pierre</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Patrick+Hand&display=swap">
<style>
${css}</style>
${body}
<script>${inlineSafe(bootJs)}</script>
<script type="module">${inlineSafe(gameJs)}</script>
`);

if (process.argv.includes('--artifact-only')) { console.log('aperçu ok'); process.exit(0); }

/* ---------- 4. Version OVH : fichiers séparés, aucune ressource tierce ---------- */
const OUT = path.join(ROOT, 'site/www');
fs.rmSync(path.join(ROOT, 'site'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets/fonts'), { recursive: true });
fs.mkdirSync(path.join(OUT, '.well-known'), { recursive: true });

const fontFace = [['Baloo 2', 500, 'baloo-2-latin-500-normal'], ['Baloo 2', 700, 'baloo-2-latin-700-normal'], ['Baloo 2', 800, 'baloo-2-latin-800-normal'], ['Patrick Hand', 400, 'patrick-hand-latin-400-normal']]
  .map(([f, w, file]) => `@font-face{font-family:"${f}";font-weight:${w};font-display:swap;src:url(fonts/${file}.woff2) format("woff2")}`).join('\n');
const cssMin = (await esbuild.transform(fontFace + '\n' + css, { loader: 'css', minify: true })).code;
fs.writeFileSync(path.join(OUT, 'assets/style.css'), cssMin);
fs.writeFileSync(path.join(OUT, 'assets/boot.js'), bootJs);
fs.writeFileSync(path.join(OUT, 'assets/game.js'), gameJs);
fs.writeFileSync(path.join(OUT, 'assets/noscript.css'), '#burrow{display:block!important}#loader,#intro,#notebook,#topRight,#help,#touch,#game,#bClose,#outBtn,#loot,#endCard{display:none!important}\n');

const SITE = CFG.site;
const OGI = SITE + CFG.ogImage;
const umami = CFG.umami && CFG.umami.src && CFG.umami.websiteId
  ? `<script defer src="${esc(CFG.umami.src)}" data-website-id="${esc(CFG.umami.websiteId)}"></script>\n` : '';
const ld = {
  '@context': 'https://schema.org', '@type': 'Person', name: 'Pierre Logre', url: SITE, image: OGI,
  jobTitle: 'Account Executive', worksFor: { '@type': 'Organization', name: 'Dell Technologies' },
  description: 'Account Executive B2B IT : cloud, infrastructure et IA, secteur public et grands comptes.',
  knowsAbout: ['Vente B2B', 'Cloud', 'Cloud souverain', 'Infrastructure IT', 'Intelligence artificielle', 'Secteur public', "Appels d'offres publics"],
  alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'Euridis Business School' }, { '@type': 'CollegeOrUniversity', name: 'Epitech Digital' }],
  sameAs: [CFG.linkedin, CFG.github],
};
const head = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Pierre Logre · Le renard fait des bêtises</title>
<meta name="description" content="Pierre Logre, Account Executive B2B IT (cloud, infrastructure, IA). Un mini-jeu où un renard fait des bêtises au village et au bureau : trouve son terrier pour découvrir son parcours.">
<meta name="author" content="Pierre Logre">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#cfe3cf">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="canonical" href="${SITE}">
<meta property="og:type" content="profile">
<meta property="profile:first_name" content="Pierre">
<meta property="profile:last_name" content="Logre">
<meta property="og:url" content="${SITE}">
<meta property="og:site_name" content="Pierre Logre">
<meta property="og:title" content="Pierre Logre · Le renard fait des bêtises">
<meta property="og:description" content="Un mini-jeu où un renard sème la pagaille en Vendée : village, bureau, forêt, plage, Nantes, Paris… Trouve son terrier pour découvrir qui se cache derrière.">
<meta property="og:image" content="${OGI}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Un renard low-poly qui glapit près de la fontaine d'un village, avec le titre Pierre Logre, le renard fait des bêtises">
<meta property="og:locale" content="fr_FR">
<meta property="og:locale:alternate" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${OGI}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/baloo-2-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="modulepreload" href="assets/game.js">
<link rel="stylesheet" href="assets/style.css">
<noscript><link rel="stylesheet" href="assets/noscript.css"></noscript>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${umami}</head>
<body>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), head + body.trim()
  + '\n<script src="assets/boot.js"></script>\n<script type="module" src="assets/game.js"></script>\n</body>\n</html>\n');

/* ---------- 5. Fichiers annexes ---------- */
const nm = p => path.join(ROOT, 'node_modules', p);
fs.copyFileSync(nm('three/LICENSE'), path.join(OUT, 'assets/THREE-LICENSE.txt'));
for (const f of ['baloo-2-latin-500-normal', 'baloo-2-latin-700-normal', 'baloo-2-latin-800-normal']) fs.copyFileSync(nm(`@fontsource/baloo-2/files/${f}.woff2`), path.join(OUT, `assets/fonts/${f}.woff2`));
fs.copyFileSync(nm('@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2'), path.join(OUT, 'assets/fonts/patrick-hand-latin-400-normal.woff2'));
fs.copyFileSync(nm('@fontsource/baloo-2/LICENSE'), path.join(OUT, 'assets/fonts/OFL-Baloo2.txt'));
fs.copyFileSync(nm('@fontsource/patrick-hand/LICENSE'), path.join(OUT, 'assets/fonts/OFL-PatrickHand.txt'));
for (const img of [CFG.ogImage, 'og-image-en.jpg']) if (fs.existsSync(SRC('assets/' + img))) fs.copyFileSync(SRC('assets/' + img), path.join(OUT, img));
fs.writeFileSync(path.join(OUT, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🦊</text></svg>\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`);
const exp = new Date(Date.now() + 365 * 864e5).toISOString().replace(/\.\d+Z$/, 'Z');
fs.writeFileSync(path.join(OUT, '.well-known/security.txt'), `Contact: ${CFG.linkedin}\nExpires: ${exp}\nPreferred-Languages: fr, en\nCanonical: ${SITE}.well-known/security.txt\n`);
fs.writeFileSync(path.join(OUT, '404.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Page introuvable · Pierre Logre</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/style.css"></head>
<body class="p404"><div class="overlay"><div class="card"><h1 class="title">Le renard a <em>mangé</em> cette page.</h1><p>Elle n'existe pas, ou plus. Le reste du village est intact (pour l'instant).</p><div class="card-actions"><a class="big" href="/">Retour au village</a></div></div></div></body></html>
`);
let htaccess = read(SRC('htaccess.conf'));
if (umami) {
  const host = new URL(CFG.umami.src).origin;
  htaccess = htaccess.replace("script-src 'self'", `script-src 'self' ${host}`).replace("connect-src 'self'", `connect-src 'self' ${host}`);
}
// Classement en ligne (Supabase) : seul ce domaine est ajouté aux connexions autorisées
if (CFG.leaderboard && /^https:\/\//.test(CFG.leaderboard.supabaseUrl || '')) {
  const host = new URL(CFG.leaderboard.supabaseUrl).origin;
  htaccess = htaccess.replace(/connect-src 'self'([^;]*)/, (m, rest) => `connect-src 'self'${rest} ${host}`);
}
fs.writeFileSync(path.join(OUT, '.htaccess'), htaccess);

/* ---------- 6. Rapport de poids ---------- */
const { gzipSync } = await import('node:zlib');
const kb = n => (n / 1024).toFixed(0) + ' Ko';
const g = s => gzipSync(s, { level: 9 }).length;
console.log(`build ok · game.js ${kb(gameJs.length)} (gzip ${kb(g(gameJs))}) · style.css gzip ${kb(g(cssMin))}`);
