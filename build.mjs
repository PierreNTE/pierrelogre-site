// Build : src/ → dist/artifact.html (aperçu Claude, tout en ligne) + site/www (OVH, CSP stricte)
//   node build.mjs          build complet
//   node build.mjs --watch  reconstruit l'aperçu à chaque modification
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import crypto from 'node:crypto';
import { T } from './src/js/i18n.js';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = p => path.join(ROOT, 'src', p);
const CFG = JSON.parse(fs.readFileSync(SRC('site.config.json'), 'utf8'));
const read = p => fs.readFileSync(p, 'utf8');

/* ---------- 1. Bundle JS (Three.js tree-shaké + jeu) ---------- */
const ES = { bundle: true, format: 'esm', minify: true, write: false, target: ['es2020'], legalComments: 'none', logLevel: 'warning' };
// Aperçu tout-en-un : un seul fichier (l'import des régions lointaines devient une simple promesse)
const gameOne = (await esbuild.build({ ...ES, entryPoints: [SRC('js/main.js')] })).outputFiles[0].text;
// Site en ligne : découpé. game.js (moteur, village, terrier) + morceaux partagés, chargés d'emblée ; lazy-….js (les dix
// autres régions) téléchargé juste après la première image. Les noms des morceaux portent leur empreinte (cache sûr).
const split = await esbuild.build({ ...ES, entryPoints: { game: SRC('js/main.js') }, splitting: true, metafile: true,
  outdir: path.join(ROOT, '.split'), entryNames: '[name]-[hash]', chunkNames: '[name]-[hash]' });
const outKey = f => path.relative(ROOT, f.path);
const mainOut = split.outputFiles.find(f => split.metafile.outputs[outKey(f)]?.entryPoint === 'src/js/main.js');
if (!mainOut) throw new Error('build : sortie principale introuvable');
const gameJs = mainOut.text;
const chunks = split.outputFiles.filter(f => f !== mainOut && f.path.endsWith('.js')).map(f => ({ name: path.basename(f.path), text: f.text }));
const eagerChunks = split.metafile.outputs[outKey(mainOut)].imports.filter(i => i.kind === 'import-statement').map(i => path.basename(i.path));
const lazyChunks = split.metafile.outputs[outKey(mainOut)].imports.filter(i => i.kind === 'dynamic-import').map(i => path.basename(i.path));
if (!lazyChunks.some(n => n.startsWith('lazy-'))) throw new Error('build : les régions lointaines ne sont pas dans un fichier à part');
const escB = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Textes de la carte d'accueil dans chaque langue, glissés dans boot.js : si le visiteur a choisi l'autre langue,
// la carte s'affiche d'emblée dans la sienne (la page elle-même est en anglais à « / », en français à « /fr/ »)
const intro = L => ({ introH1: L.introH1, introP: escB(L.introP), introKeys: L.keys.map(([k, v]) => `<kbd>${escB(k)}</kbd><span>${escB(v)}</span>`).join(''),
  startBtn: escB(L.start), dailyBtn: escB(L.daily), newBtn: escB(L.newGame), dailyNoteTxt: escB(L.dailyNote), introWho: escB(L.introWho), loaderSkip: escB(L.skip), langBtn2: L === T.fr ? 'EN' : 'FR' });
// Supabase (classement + mesure d'audience) : seule une clé PUBLIQUE est acceptée (publishable, ou ancienne clé anon)
const LB = CFG.leaderboard || {}, PUBKEY = LB.publishableKey || LB.anonKey || '';
{ let role = null; if (/^eyJ/.test(PUBKEY)) { try { role = JSON.parse(Buffer.from(PUBKEY.split('.')[1], 'base64url').toString()).role; } catch (e) { role = '?'; } }
  if (/^sb_secret_/.test(PUBKEY) || (role && role !== 'anon')) throw new Error('site.config.json : clé secrète interdite dans le site (mettre la clé publishable)'); }
const STATS = /^https:\/\//.test(LB.supabaseUrl || '') && PUBKEY ? { url: LB.supabaseUrl.replace(/\/$/, ''), key: PUBKEY } : null;
const bootRaw = read(SRC('boot.js'));
const bootSrc = bootRaw.replace('/*INTRO*/null', () => JSON.stringify({ en: intro(T.en), fr: intro(T.fr) })).replace('/*STATS*/null', () => JSON.stringify(STATS));
if (!bootRaw.includes('/*INTRO*/null') || !bootRaw.includes('/*STATS*/null')) throw new Error('boot.js : emplacement INTRO ou STATS introuvable');
const bootJs = (await esbuild.transform(bootSrc, { minify: true, target: 'es2015' })).code;
const css = read(SRC('style.css'));

/* ---------- 2. Contenu statique d'une langue : lisible sans JS, par les moteurs de recherche et en mode sans jeu ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function makeBody(lang) {
  const F = T[lang];
  let body = read(SRC('body.html'))
    .replace(/(<([a-z0-9]+)\b[^>]*\bdata-t="([A-Za-z]+)"[^>]*>)(<\/\2>)/g,
      (m, open, tag, key, close) => (key in F && typeof F[key] === 'string') ? open + esc(F[key]) + close : m)
    .replace(/data-a="([A-Za-z]+)" aria-label=""/g, (m, key) => `data-a="${key}" aria-label="${esc(F[key] || '')}"`)
    .replace(/(id="langBtn2?"[^>]*>)FR(<\/button>)/g, (m, a, b) => a + (lang === 'fr' ? 'EN' : 'FR') + b);
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
  return body.replace(/id="liBtn"/, `id="liBtn" href="${CFG.linkedin}"`)
    .replace(/id="liChip"/, `id="liChip" href="${CFG.linkedin}"`)
    .replace(/id="ghBtn"/, `id="ghBtn" href="${CFG.github}"`);
}
const body = makeBody('en');

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
<script type="module">${inlineSafe(gameOne)}</script>
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
for (const c of chunks) fs.writeFileSync(path.join(OUT, 'assets', c.name), c.text);
const noscriptCss = '#burrow{display:block!important}#intro,#notebook,#topRight,#help,#touch,#game,#bClose,#outBtn,#loot,#endCard{display:none!important}\n';
fs.writeFileSync(path.join(OUT, 'assets/noscript.css'), noscriptCss);
// Version dans l'adresse des fichiers (empreinte du contenu) : après une mise à jour, un visiteur déjà venu ne garde pas
// l'ancien game.js en cache (7 jours, .htaccess) avec la nouvelle page : il recharge ce qui a changé, et seulement ça
const v = s => '?v=' + crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const A = { css: 'assets/style.css' + v(cssMin), boot: 'assets/boot.js' + v(bootJs), game: 'assets/game.js' + v(gameJs), noscript: 'assets/noscript.css' + v(noscriptCss) };

const SITE = CFG.site;   // https://pierrelogre.com/ (avec la barre finale)
const umami = CFG.umami && CFG.umami.src && CFG.umami.websiteId
  ? `<script defer src="${esc(CFG.umami.src)}" data-website-id="${esc(CFG.umami.websiteId)}"></script>\n` : '';
const today = new Date().toISOString().slice(0, 10);
const URLS = { en: SITE, fr: SITE + 'fr/' };
/** Référencement (classique et par les assistants IA) : titres, descriptions, image d'aperçu, données structurées. */
const META = {
  en: {
    title: 'Pierre Logre · Cloud & AI Account Executive · The fox game',
    desc: 'Pierre Logre, B2B IT Account Executive in cloud, infrastructure and AI. Play a 3D fox causing mischief in Vendée, France, and find its den to see his career.',
    ogTitle: 'Pierre Logre · The fox causes mischief',
    ogDesc: 'A tiny 3D game where a fox wreaks havoc in Vendée: village, office, forest, beach, Nantes, Paris… Find the secret den to meet the person behind it.',
    ogImage: 'og-image-en.jpg', ogAlt: 'A low-poly fox yapping by a village fountain, with the title Pierre Logre, the fox causes mischief',
    locale: 'en_US', altLocale: 'fr_FR',
    person: 'Account Executive in B2B IT sales (cloud, infrastructure and AI) for the public sector and large accounts, based in Paris and Nantes, France.',
    knows: ['B2B enterprise sales', 'Cloud computing', 'Sovereign cloud', 'IT infrastructure', 'Artificial intelligence', 'Public sector', 'Public tenders', 'Partner co-selling'],
    game: 'The fox causes mischief', gameDesc: 'A small hand-made 3D browser game (Three.js, no framework): a fox causes mischief across 12 areas of Vendée, Nantes and Paris; its den holds Pierre Logre’s profile.',
  },
  fr: {
    title: 'Pierre Logre · Account Executive cloud & IA · Le jeu du renard',
    desc: 'Pierre Logre, Account Executive B2B IT (cloud, infrastructure, IA). Un jeu 3D où un renard sème la pagaille en Vendée : trouve son terrier et découvre son parcours.',
    ogTitle: 'Pierre Logre · Le renard fait des bêtises',
    ogDesc: 'Un mini-jeu où un renard sème la pagaille en Vendée : village, bureau, forêt, plage, Nantes, Paris… Trouve son terrier pour découvrir qui se cache derrière.',
    ogImage: CFG.ogImage, ogAlt: "Un renard low-poly qui glapit près de la fontaine d'un village, avec le titre Pierre Logre, le renard fait des bêtises",
    locale: 'fr_FR', altLocale: 'en_US',
    person: 'Account Executive B2B IT (cloud, infrastructure et IA), secteur public et grands comptes, entre Paris et Nantes.',
    knows: ['Vente B2B grands comptes', 'Cloud', 'Cloud souverain', 'Infrastructure IT', 'Intelligence artificielle', 'Secteur public', "Appels d'offres publics", 'Co-selling partenaires'],
    game: 'Le renard fait des bêtises', gameDesc: 'Un petit jeu 3D fait main (Three.js, sans framework) : un renard fait des bêtises dans 12 lieux de Vendée, de Nantes et de Paris ; son terrier abrite la fiche de Pierre Logre.',
  },
};
/** Données structurées (schema.org) : la page de profil, la personne, le jeu. */
function jsonLd(lang) {
  const M = META[lang], id = SITE + '#pierre';
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ProfilePage', '@id': URLS[lang] + '#page', url: URLS[lang], name: M.title, description: M.desc, inLanguage: lang, isPartOf: { '@id': SITE + '#site' }, mainEntity: { '@id': id }, dateModified: today },
    { '@type': 'WebSite', '@id': SITE + '#site', url: SITE, name: 'Pierre Logre', inLanguage: ['en', 'fr'], publisher: { '@id': id } },
    { '@type': 'Person', '@id': id, name: 'Pierre Logre', givenName: 'Pierre', familyName: 'Logre', url: SITE, image: SITE + M.ogImage,
      jobTitle: 'Account Executive', worksFor: { '@type': 'Organization', name: 'Dell Technologies' }, description: M.person,
      knowsAbout: M.knows, knowsLanguage: [{ '@type': 'Language', name: 'French', alternateName: 'fr' }, { '@type': 'Language', name: 'English', alternateName: 'en' }],
      alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'Euridis Business School' }, { '@type': 'CollegeOrUniversity', name: 'Epitech Digital' }],
      hasCredential: T.en.certs.map(c => ({ '@type': 'EducationalOccupationalCredential', name: c })),
      sameAs: [CFG.linkedin, CFG.github] },
    { '@type': 'VideoGame', '@id': SITE + '#game', name: M.game, url: URLS[lang], description: M.gameDesc, inLanguage: ['en', 'fr'], author: { '@id': id },
      gamePlatform: 'Web browser', applicationCategory: 'Game', operatingSystem: 'Any', genre: ['Casual', 'Sandbox', 'Stealth'], isAccessibleForFree: true },
  ] };
}
function page(lang) {
  const M = META[lang], OGI = SITE + M.ogImage, u = URLS[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(M.title)}</title>
<meta name="description" content="${esc(M.desc)}">
<meta name="author" content="Pierre Logre">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#cfe3cf">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="canonical" href="${u}">
<link rel="alternate" hreflang="en" href="${URLS.en}">
<link rel="alternate" hreflang="fr" href="${URLS.fr}">
<link rel="alternate" hreflang="x-default" href="${URLS.en}">
<link rel="alternate" type="text/plain" href="${SITE}llms.txt" title="Pierre Logre: summary for AI assistants">
<meta property="og:type" content="profile">
<meta property="profile:first_name" content="Pierre">
<meta property="profile:last_name" content="Logre">
<meta property="og:url" content="${u}">
<meta property="og:site_name" content="Pierre Logre">
<meta property="og:title" content="${esc(M.ogTitle)}">
<meta property="og:description" content="${esc(M.ogDesc)}">
<meta property="og:image" content="${OGI}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(M.ogAlt)}">
<meta property="og:locale" content="${M.locale}">
<meta property="og:locale:alternate" content="${M.altLocale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(M.ogTitle)}">
<meta name="twitter:description" content="${esc(M.ogDesc)}">
<meta name="twitter:image" content="${OGI}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/baloo-2-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/patrick-hand-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="modulepreload" href="/${A.game}">
${eagerChunks.map(n => `<link rel="modulepreload" href="/assets/${n}">\n`).join('')}<link rel="stylesheet" href="/${A.css}">
<noscript><link rel="stylesheet" href="/${A.noscript}"></noscript>
<script type="application/ld+json">${JSON.stringify(jsonLd(lang)).replace(/</g, '\\u003c')}</script>
${umami}</head>
<body>
${makeBody(lang).trim()}
<script src="/${A.boot}"></script>
<script type="module" src="/${A.game}"></script>
</body>
</html>
`;
}
// Anglais à l'adresse principale, français à /fr/ (mêmes fichiers du jeu ; le bouton FR / EN change la langue en jeu)
fs.writeFileSync(path.join(OUT, 'index.html'), page('en'));
fs.mkdirSync(path.join(OUT, 'fr'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'fr/index.html'), page('fr'));

/* ---------- 5. Fichiers annexes ---------- */
const nm = p => path.join(ROOT, 'node_modules', p);
fs.copyFileSync(nm('three/LICENSE'), path.join(OUT, 'assets/THREE-LICENSE.txt'));
for (const f of ['baloo-2-latin-500-normal', 'baloo-2-latin-700-normal', 'baloo-2-latin-800-normal']) fs.copyFileSync(nm(`@fontsource/baloo-2/files/${f}.woff2`), path.join(OUT, `assets/fonts/${f}.woff2`));
fs.copyFileSync(nm('@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2'), path.join(OUT, 'assets/fonts/patrick-hand-latin-400-normal.woff2'));
fs.copyFileSync(nm('@fontsource/baloo-2/LICENSE'), path.join(OUT, 'assets/fonts/OFL-Baloo2.txt'));
fs.copyFileSync(nm('@fontsource/patrick-hand/LICENSE'), path.join(OUT, 'assets/fonts/OFL-PatrickHand.txt'));
for (const img of [CFG.ogImage, 'og-image-en.jpg']) if (fs.existsSync(SRC('assets/' + img))) fs.copyFileSync(SRC('assets/' + img), path.join(OUT, img));
fs.writeFileSync(path.join(OUT, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🦊</text></svg>\n');
// Moteurs de recherche et assistants IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) : tout est ouvert
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
const alts = Object.entries({ en: URLS.en, fr: URLS.fr, 'x-default': URLS.en }).map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${h}"/>`).join('');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`
  + [URLS.en, URLS.fr].map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod>${alts}</url>\n`).join('') + '</urlset>\n');
// llms.txt : le profil en texte simple, pour les assistants IA (GEO) ; mêmes informations publiques que la page
{
  const E = T.en, strip = x => String(x).replace(/<[^>]+>/g, '');
  const md = `# Pierre Logre

> ${META.en.person} His personal website, pierrelogre.com, is a small hand-made 3D browser game: a fox causes mischief in a village in Vendée, France, and the fox's den holds his profile.

- Role: ${E.bRole}
- Location: ${E.bLoc}
- LinkedIn (preferred contact): ${CFG.linkedin}
- GitHub: ${CFG.github}
- Website: ${URLS.en} (English), ${URLS.fr} (French)

## Summary

${E.bPitch}

## Key figures

${E.stats.filter(([v]) => v !== '{loot}').map(([v, l]) => `- ${v} ${l}`).join('\n')}

## Career

${E.trail.map(([y, c, r, d]) => `- ${y}: ${c}, ${r}. ${d}`).join('\n')}

## Certifications

${E.certs.map(c => `- ${c}`).join('\n')}

## Skills

${E.skills.map(c => `- ${c}`).join('\n')}

## Education

${E.edu.map(c => `- ${c}`).join('\n')}

## Outside work

${E.hobbies.map(c => `- ${c}`).join('\n')}

## About the website

- ${META.en.gameDesc}
- More than 100 pieces of mischief across 12 areas, achievements, a penalty shootout mini-game with a shared leaderboard, golden acorns that reveal facts about Pierre.
- No cookies, no advertising trackers. Works without WebGL or JavaScript (plain profile).

## Fun facts (from the golden acorns)

${E.acorns.map(a => `- ${strip(a)}`).join('\n')}
`;
  fs.writeFileSync(path.join(OUT, 'llms.txt'), md);
}
const exp = new Date(Date.now() + 365 * 864e5).toISOString().replace(/\.\d+Z$/, 'Z');
fs.writeFileSync(path.join(OUT, '.well-known/security.txt'), `Contact: ${CFG.linkedin}\nExpires: ${exp}\nPreferred-Languages: en, fr\nCanonical: ${SITE}.well-known/security.txt\n`);
fs.writeFileSync(path.join(OUT, '404.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Page not found · Pierre Logre</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/${A.css}"></head>
<body class="p404"><main class="overlay"><div class="card"><h1 class="title">The fox <em>ate</em> this page.</h1><p>It doesn't exist, or not anymore. The rest of the village is fine (for now).</p><p class="en" lang="fr">Le renard a mangé cette page. Le reste du village est intact (pour l'instant).</p><div class="card-actions"><a class="big" href="/">Back to the village</a><a class="alt" href="/fr/" lang="fr">Version française</a></div></div></main></body></html>
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
const eagerJs = gameJs + eagerChunks.map(n => chunks.find(c => c.name === n).text).join('');
const lazyJs = lazyChunks.map(n => chunks.find(c => c.name === n).text).join('');
console.log(`build ok · JS au démarrage ${kb(eagerJs.length)} (gzip ${kb(g(gameJs) + eagerChunks.reduce((a, n) => a + g(chunks.find(c => c.name === n).text), 0))}) · régions après la 1re image ${kb(lazyJs.length)} (gzip ${kb(g(lazyJs))}) · tout-en-un ${kb(gameOne.length)} (gzip ${kb(g(gameOne))}) · style.css gzip ${kb(g(cssMin))}`);
