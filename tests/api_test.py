"""Tests de l'API PHP du classement (server/, src/api/) contre un vrai MySQL de test et le serveur PHP intégré.
Rien n'est jamais écrit dans la vraie base : la base de test est vidée et recréée à chaque lancement.

  MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 MYSQL_USER=… MYSQL_PASSWORD=… MYSQL_DB=… python tests/api_test.py
  Option : DATA_SQL=chemin/vers/classement-donnees.sql pour vérifier aussi l'import des données réelles.

Vérifie : chaque règle de validation, le filtre d'insultes, chaque limite anti-abus (pseudo, IP, minute, jour,
visite), les deux classements, l'origine (CORS), les méthodes, les tailles, les dates en UTC, les vues de
statistiques, les migrations automatiques et le nettoyage (tâche planifiée).
"""
import json, os, re, socket, subprocess, sys, tempfile, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = dict(host=os.environ.get('MYSQL_HOST', '127.0.0.1'), port=os.environ.get('MYSQL_PORT', '3306'),
          user=os.environ.get('MYSQL_USER', 'root'), password=os.environ.get('MYSQL_PASSWORD', ''), db=os.environ.get('MYSQL_DB', 'fox_test'))
results = []

def check(name, ok, detail=''):
    results.append((name, bool(ok))); print(('✓ ' if ok else '✗ ') + name + (f'  [{detail}]' if detail and not ok else ''), flush=True)

def sql(q, db=True):
    """Exécute du SQL avec le client mysql ; renvoie les lignes (tabulations)."""
    args = ['mysql', '--default-character-set=utf8mb4', '-N', '-B', '-h', DB['host'], '-P', str(DB['port']), '-u', DB['user']]
    if db: args.append(DB['db'])
    env = {**os.environ, 'MYSQL_PWD': DB['password']}
    out = subprocess.run(args, input=q, capture_output=True, text=True, env=env)
    if out.returncode: raise RuntimeError(out.stderr.strip())
    return [l.split('\t') for l in out.stdout.strip().split('\n') if l]

def one(q): r = sql(q); return r[0][0] if r else None

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

PORT = free_port(); BASE = f'http://127.0.0.1:{PORT}/api/'
SITE = 'https://pierrelogre.com'

def call(path, method='GET', body=None, origin=SITE, ctype='application/json', raw=None, ip=None):
    data = raw if raw is not None else (json.dumps(body, ensure_ascii=False).encode() if body is not None else None)
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if origin: req.add_header('Origin', origin)
    if data is not None and ctype: req.add_header('Content-Type', ctype)
    if ip: req.add_header('X-Test-Ip', ip)
    try:
        with urllib.request.urlopen(req, timeout=15) as r: return r.status, r.headers, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.headers, e.read().decode()

def js(t):
    try: return json.loads(t)
    except Exception: return None

def reset():
    sql('DELETE FROM scores; DELETE FROM daily_times; DELETE FROM events; DELETE FROM api_ip;')

def main():
    # ---------- Base de test neuve : schema.sql tel qu'il sera exécuté dans phpMyAdmin ----------
    sql(f"DROP DATABASE IF EXISTS `{DB['db']}`; CREATE DATABASE `{DB['db']}` CHARACTER SET utf8mb4;", db=False)
    sql(open(os.path.join(ROOT, 'server', 'schema.sql'), encoding='utf-8').read())
    check('schema.sql s’exécute sur une base vide (tables, index, contraintes, vues)', set(r[0] for r in sql('SHOW FULL TABLES')) >= {
        'scores', 'daily_times', 'events', 'api_ip', 'leaderboard', 'daily_leaderboard', 'stats_jour', 'stats_entonnoir', 'stats_appareils', 'stats_sources'})
    engines = {r[0]: (r[1], r[2]) for r in sql(f"SELECT table_name, engine, table_collation FROM information_schema.tables WHERE table_schema='{DB['db']}' AND table_type='BASE TABLE'")}
    check('tables en InnoDB, utf8mb4', all(e == 'InnoDB' and c.startswith('utf8mb4') for e, c in engines.values()), str(engines))
    sql(open(os.path.join(ROOT, 'server', 'schema.sql'), encoding='utf-8').read())
    check('schema.sql peut être relancé sans erreur (IF NOT EXISTS / OR REPLACE)', True)

    tmp = tempfile.mkdtemp()
    cfg = os.path.join(tmp, 'config.php')
    with open(cfg, 'w') as f:
        f.write("<?php return " + "['db_host'=>%s,'db_port'=>%s,'db_name'=>%s,'db_user'=>%s,'db_pass'=>%s,'ip_key'=>%s];" % tuple(
            json.dumps(v) for v in (DB['host'], int(DB['port']), DB['db'], DB['user'], DB['password'], 'k' * 64)))
    # Le serveur de test : www/api/ (copie de src/api/) + pierrelogre-api/ (server/). Un petit routeur permet de simuler
    # plusieurs adresses IP (en-tête X-Test-Ip, lu UNIQUEMENT ici, jamais par l'API en production).
    router = os.path.join(tmp, 'router.php')
    with open(router, 'w') as f:
        f.write("<?php if (isset($_SERVER['HTTP_X_TEST_IP'])) $_SERVER['REMOTE_ADDR'] = $_SERVER['HTTP_X_TEST_IP']; "
                "$f = __DIR__ . '/www' . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); if (!is_file($f)) { http_response_code(404); exit; } "
                "chdir(dirname($f)); require $f;")
    os.makedirs(os.path.join(tmp, 'www', 'api'))
    for n in os.listdir(os.path.join(ROOT, 'src', 'api')):
        with open(os.path.join(ROOT, 'src', 'api', n)) as a, open(os.path.join(tmp, 'www', 'api', n), 'w') as b: b.write(a.read())
    env = {**os.environ, 'FOX_API_DIR': os.path.join(ROOT, 'server'), 'FOX_API_CONFIG': cfg}
    srv = subprocess.Popen(['php', '-S', f'127.0.0.1:{PORT}', router], cwd=tmp, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    for _ in range(50):
        try: socket.create_connection(('127.0.0.1', PORT), 0.2).close(); break
        except OSError: time.sleep(0.1)
    try:
        run_tests(env, cfg)
    finally:
        srv.terminate(); srv.wait()
    ok = sum(1 for _, o in results if o)
    print(f'\n{ok}/{len(results)} vérifications réussies')
    sys.exit(0 if ok == len(results) else 1)

def run_tests(env, cfg):
    # ---------- Scores : ajout valide ----------
    reset()
    st, h, t = call('scores.php', 'POST', {'pseudo': 'Véro', 'score': 1234, 'game': 'handball'})
    check('score valide → 201 {"ok":true}, enregistré', st == 201 and js(t) == {'ok': True} and one("SELECT CONCAT(pseudo,'|',score,'|',game) FROM scores") == 'Véro|1234|handball', f'{st} {t}')
    check('réponse JSON en UTF-8, jamais mise en cache, CORS limité au site', h.get('Content-Type', '').startswith('application/json') and h.get('Cache-Control') == 'no-store'
          and h.get('Access-Control-Allow-Origin') == SITE and h.get('X-Content-Type-Options') == 'nosniff')
    st, _, _ = call('scores.php', 'POST', {'pseudo': 'Sans jeu', 'score': 5})
    check('game absent → « handball » par défaut', st == 201 and one("SELECT game FROM scores WHERE pseudo='Sans jeu'") == 'handball')
    lag = float(one("SELECT ABS(TIMESTAMPDIFF(MICROSECOND, MAX(created_at), UTC_TIMESTAMP(6))) / 1e6 FROM scores"))
    check('date enregistrée en UTC (même si le serveur MySQL est réglé sur un autre fuseau)', lag < 60, f'écart {lag} s')

    # ---------- Scores : validation ----------
    reset()
    bad = [({'pseudo': 'a', 'score': 1}, 'pseudo de 1 caractère'), ({'pseudo': 'x' * 17, 'score': 1}, 'pseudo de 17 caractères'),
           ({'pseudo': 'abc<', 'score': 1}, 'pseudo avec « < »'), ({'pseudo': 'ab!', 'score': 1}, 'pseudo avec « ! »'), ({'pseudo': 12, 'score': 1}, 'pseudo non texte'),
           ({'pseudo': 'ok ok', 'score': -1}, 'score -1'), ({'pseudo': 'ok ok', 'score': 20001}, 'score 20 001'), ({'pseudo': 'ok ok', 'score': 12.5}, 'score décimal'),
           ({'pseudo': 'ok ok', 'score': '100'}, 'score en texte'), ({'pseudo': 'ok ok'}, 'score absent'), ({'score': 5}, 'pseudo absent'),
           ({'pseudo': 'ok ok', 'score': 5, 'game': 'foot'}, 'jeu inconnu'), ({'pseudo': 'ok ok', 'score': 5, 'id': 9}, 'champ en trop'), ([{'pseudo': 'ok ok', 'score': 5}], 'liste au lieu d’un objet')]
    for body, label in bad:
        st, _, t = call('scores.php', 'POST', body); m = (js(t) or {}).get('message', {})
        check(f'score refusé : {label} → 400, message FR et EN', st == 400 and m.get('fr') and m.get('en'), f'{st} {t}')
    for p in ['Zoé Ça', 'Jean-Luc', 'a.b_c', 'Ñandú 42', '李小龙', 'ab', 'x' * 16]:
        st, _, t = call('scores.php', 'POST', {'pseudo': p, 'score': 1}, ip=f'10.0.{len(p)}.{ord(p[0]) % 250}')
        check(f'pseudo accepté : « {p} »', st == 201, f'{st} {t}')
    check('aucun score refusé n’a été enregistré', int(one('SELECT COUNT(*) FROM scores')) == 7)

    # ---------- Filtre d'insultes (même règle que pseudo_ok sur Supabase) ----------
    reset()
    insults = ['connard', 'C0nnard', 'Pütain', 'SALOPE', 'f.d.p', 'n t m', 'Sh1t', 'B@tard', 'encülé', 'Fuck', 'Nazi_', 'h1tl3r', 'pedofil', 'xxPORNxx', 'Merde42', 'niKtamer', '$lut']
    for p in insults:
        st, _, t = call('scores.php', 'POST', {'pseudo': p, 'score': 1}); st2, _, _ = call('daily.php', 'POST', {'day': one('SELECT UTC_DATE()'), 'pseudo': p, 'secs': 50})
        check(f'insulte refusée (score et temps du jour) : « {p} »', st == 400 and st2 == 400 and (js(t) or {}).get('error') == 'bad_pseudo', f'{st} {st2} {t}')
    for i, p in enumerate(['Monique', 'Dickens', 'Pierre', 'Nathan', 'Assia', 'Bastien']):
        st, _, _ = call('scores.php', 'POST', {'pseudo': p, 'score': 1}, ip=f'10.1.0.{i}')
        check(f'prénom courant accepté : « {p} »', st == 201)

    # ---------- Scores : limites anti-abus ----------
    reset()
    codes = [call('scores.php', 'POST', {'pseudo': 'Rapide', 'score': i}, ip='10.2.0.1')[0] for i in range(6)]
    st, _, t = call('scores.php', 'POST', {'pseudo': 'Rapide', 'score': 99}, ip='10.2.0.2')
    check('6e score du même pseudo dans la minute → 429 « trop de scores, réessaie plus tard »', codes == [201] * 5 + [429] and st == 429
          and (js(t) or {}).get('message', {}).get('fr') == 'Trop de scores, réessaie plus tard.', str(codes))
    reset()
    codes = [call('scores.php', 'POST', {'pseudo': f'Joueur{i}', 'score': i}, ip='10.3.0.1')[0] for i in range(21)]
    st, _, _ = call('scores.php', 'POST', {'pseudo': 'Autre IP', 'score': 1}, ip='10.3.0.2')
    check('21e score de la même adresse IP dans la minute → 429 ; une autre adresse passe', codes == [201] * 20 + [429] and st == 201, str(codes[-3:]))
    hashes = sql("SELECT HEX(ip_hash), LENGTH(ip_hash) FROM api_ip")
    check('adresse IP jamais enregistrée en clair (empreinte HMAC de 32 octets)', hashes and all(l == '32' for _, l in hashes)
          and not sql("SELECT 1 FROM api_ip WHERE ip_hash LIKE '%10.3.0.1%' OR HEX(ip_hash) LIKE CONCAT('%', HEX('10.3.0.1'), '%')"))
    reset()
    sql("INSERT INTO scores (pseudo, score, created_at) WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 300) SELECT CONCAT('p', i), 1, UTC_TIMESTAMP(6) FROM n")
    st, _, _ = call('scores.php', 'POST', {'pseudo': 'Nouveau', 'score': 1})
    check('300 scores tous pseudos dans la minute → 429', st == 429)
    sql("UPDATE scores SET created_at = UTC_TIMESTAMP(6) - INTERVAL 2 MINUTE")
    st, _, _ = call('scores.php', 'POST', {'pseudo': 'Nouveau', 'score': 1})
    check('… et la minute suivante, ça repasse', st == 201)
    reset()
    sql("SET SESSION cte_max_recursion_depth = 40000; INSERT INTO scores (pseudo, score, created_at) WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 3000) SELECT CONCAT('p', i), 1, UTC_TIMESTAMP(6) - INTERVAL 2 HOUR FROM n")
    st, _, _ = call('scores.php', 'POST', {'pseudo': 'Nouveau', 'score': 1})
    sql("UPDATE scores SET created_at = UTC_TIMESTAMP(6) - INTERVAL 25 HOUR")
    st2, _, _ = call('scores.php', 'POST', {'pseudo': 'Nouveau', 'score': 1})
    check('3 000 scores sur 24 h → 429, et plus au-delà de 24 h', st == 429 and st2 == 201, f'{st} {st2}')

    # ---------- Classement du mini-jeu ----------
    reset()
    rows = [('Monique', 900), ('Monique', 400), ('Renard', 700), ('renard', 650), ('Zed', 700)] + [(f'J{i:02d}', 100 + i) for i in range(12)]
    sql('INSERT INTO scores (pseudo, score) VALUES ' + ','.join(f"('{p}', {s})" for p, s in rows))
    st, _, t = call('scores.php?game=handball', origin=None); top = js(t)
    check('classement : meilleur score de chaque pseudo, du plus haut au plus bas, 10 au plus', st == 200 and len(top) == 10 and top[0] == {'pseudo': 'Monique', 'score': 900}
          and [x['pseudo'] for x in top[1:4]] == ['Renard', 'Zed', 'renard'] and [x['pseudo'] for x in top].count('Monique') == 1, t[:200])
    check('classement : pseudos comparés à l’identique (« Renard » et « renard » sont deux joueurs, comme sur Supabase)', {'Renard', 'renard'} <= {x['pseudo'] for x in top})
    st, _, t = call('scores.php', origin=None)
    check('classement sans « game » → handball', st == 200 and len(js(t)) == 10)
    st, _, t = call('scores.php?game=foot', origin=None)
    check('classement d’un autre jeu → liste vide', st == 200 and js(t) == [])
    check('classement : score en nombre entier dans le JSON', isinstance(top[0]['score'], int))

    # ---------- Temps du défi du jour ----------
    reset()
    today = one('SELECT UTC_DATE()'); yday = one('SELECT UTC_DATE() - INTERVAL 1 DAY'); tmrw = one('SELECT UTC_DATE() + INTERVAL 1 DAY')
    old = one('SELECT UTC_DATE() - INTERVAL 2 DAY'); far = one('SELECT UTC_DATE() + INTERVAL 2 DAY')
    for i, d in enumerate([yday, today, tmrw]):
        st, _, t = call('daily.php', 'POST', {'day': d, 'pseudo': f'Jour{i}', 'secs': 83.44})
        check(f'temps du jour accepté pour {"hier aujourd’hui demain".split()[i]}', st == 201, f'{st} {t}')
    check('temps arrondi au dixième (83,44 → 83,4)', one("SELECT secs FROM daily_times WHERE pseudo='Jour1'") == '83.4')
    bad = [({'day': old, 'pseudo': 'abc', 'secs': 50}, 'avant-hier'), ({'day': far, 'pseudo': 'abc', 'secs': 50}, 'après-demain'),
           ({'day': '2026-02-30', 'pseudo': 'abc', 'secs': 50}, 'date impossible'), ({'day': '26/10/2026', 'pseudo': 'abc', 'secs': 50}, 'mauvais format de date'),
           ({'day': today, 'pseudo': 'abc', 'secs': 9.9}, '9,9 s'), ({'day': today, 'pseudo': 'abc', 'secs': 7200.1}, '7 200,1 s'),
           ({'day': today, 'pseudo': 'abc', 'secs': '50'}, 'temps en texte'), ({'day': today, 'pseudo': 'a', 'secs': 50}, 'pseudo trop court'),
           ({'day': today, 'pseudo': 'abc', 'secs': 50, 'x': 1}, 'champ en trop'), ({'pseudo': 'abc', 'secs': 50}, 'jour absent')]
    for body, label in bad:
        st, _, t = call('daily.php', 'POST', body); m = (js(t) or {}).get('message', {})
        check(f'temps refusé : {label} → 400, message FR et EN', st == 400 and m.get('fr') and m.get('en'), f'{st} {t}')
    for s in (10, 7200):
        st, _, _ = call('daily.php', 'POST', {'day': today, 'pseudo': f'Borne{s}', 'secs': s}, ip=f'10.4.0.{s % 250}')
        check(f'temps limite accepté : {s} s', st == 201)
    reset()
    codes = [call('daily.php', 'POST', {'day': today, 'pseudo': 'Rapide', 'secs': 20 + i}, ip='10.5.0.1')[0] for i in range(6)]
    t = call('daily.php', 'POST', {'day': today, 'pseudo': 'Rapide', 'secs': 99}, ip='10.5.0.2')[2]
    check('6e temps du même pseudo dans la minute → 429 « trop de temps envoyés »', codes == [201] * 5 + [429]
          and (js(t) or {}).get('message', {}).get('fr') == 'Trop de temps envoyés, réessaie plus tard.', str(codes))
    reset()
    codes = [call('daily.php', 'POST', {'day': today, 'pseudo': f'J{i}', 'secs': 20}, ip='10.6.0.1')[0] for i in range(21)]
    check('21e temps de la même adresse IP dans la minute → 429', codes == [201] * 20 + [429], str(codes[-3:]))
    reset()
    sql(f"INSERT INTO daily_times (day, pseudo, secs, created_at) WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 300) SELECT '{today}', CONCAT('p', i), 50, UTC_TIMESTAMP(6) FROM n")
    st, _, _ = call('daily.php', 'POST', {'day': today, 'pseudo': 'Nouveau', 'secs': 50})
    check('300 temps tous pseudos dans la minute → 429', st == 429)
    reset()
    sql(f"SET SESSION cte_max_recursion_depth = 40000; INSERT INTO daily_times (day, pseudo, secs, created_at) WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 3000) SELECT '{today}', CONCAT('p', i), 50, UTC_TIMESTAMP(6) - INTERVAL 3 HOUR FROM n")
    st, _, _ = call('daily.php', 'POST', {'day': today, 'pseudo': 'Nouveau', 'secs': 50})
    check('3 000 temps sur 24 h → 429', st == 429)

    # ---------- Classement du jour ----------
    reset()
    rows = [(today, 'Renarde', 61.2), (today, 'Renarde', 75), (today, 'Pierre', 83.4), (yday, 'Hier', 12)] + [(today, f'J{i:02d}', 100 + i) for i in range(12)]
    sql('INSERT INTO daily_times (day, pseudo, secs) VALUES ' + ','.join(f"('{d}', '{p}', {s})" for d, p, s in rows))
    st, _, t = call(f'daily.php?day={today}', origin=None); top = js(t)
    check('classement du jour : meilleur temps de chaque pseudo, du plus rapide au plus lent, 10 au plus, seulement ce jour', st == 200 and len(top) == 10
          and top[0] == {'pseudo': 'Renarde', 'secs': 61.2} and top[1]['pseudo'] == 'Pierre' and 'Hier' not in {x['pseudo'] for x in top}
          and [x['pseudo'] for x in top].count('Renarde') == 1, t[:200])
    st, _, _ = call('daily.php?day=demain', origin=None); st2, _, _ = call('daily.php', origin=None)
    check('classement du jour : jour invalide ou absent → 400', st == 400 and st2 == 400)

    # ---------- Événements d'audience ----------
    reset()
    ev = {'name': 'Jeu prêt', 'visit': 'abcd1234efgh', 'lang': 'fr', 'page': '/fr/', 'device': 'desktop', 'props': {'ms': 1500, 'tier': 0, 'touch': False, 'ref': 'linkedin.com'}}
    st, _, t = call('events.php', 'POST', [ev, {'name': 'Visite', 'visit': 'abcd1234efgh'}])
    row = sql("SELECT name, lang, page, device, props FROM events ORDER BY id")
    check('lot d’événements valide → 201, enregistré (champs facultatifs vides, props par défaut {})', st == 201 and len(row) == 2 and row[0][0] == 'Jeu prêt'
          and json.loads(row[0][4]) == ev['props'] and row[1][1:4] == ['NULL', 'NULL', 'NULL'] and row[1][4] == '{}', f'{st} {t} {row}')
    st, _, _ = call('events.php', 'POST', {'name': 'Visite', 'visit': 'abcd1234efgh', 'props': {}})
    check('un seul événement (objet) accepté aussi', st == 201)
    for name in ['Visite', 'Jeu prêt', 'Partie lancée', 'Partie terminée', 'Tutoriel terminé', 'Tutoriel passé', 'Terrier trouvé', 'Terrier ouvert', 'Clic LinkedIn',
                 'Clic GitHub', 'Indice', 'Gland', 'Région ouverte', 'Succès', 'Mini-jeu lancé', 'Mini-jeu terminé', 'Qualité', 'Bench', 'Départ', 'Profil sans jeu']:
        if call('events.php', 'POST', [{'name': name, 'visit': 'liste12345'}])[0] != 201: check(f'événement de la liste accepté : {name}', False)
    check('les 20 noms d’événements de la liste sont acceptés', int(one("SELECT COUNT(*) FROM events WHERE visit = 'liste12345'")) == 20)
    reset()
    good = {'name': 'Visite', 'visit': 'abcd1234'}
    bad = [({'name': 'visite', 'visit': 'abcd1234'}, 'nom hors liste (casse)'), ({'name': 'Jeu pret', 'visit': 'abcd1234'}, 'nom hors liste (accent)'),
           ({'name': 'Visite', 'visit': 'ABCD1234'}, 'visite en majuscules'), ({'name': 'Visite', 'visit': 'abc1234'}, 'visite de 7 caractères'),
           ({'name': 'Visite', 'visit': 'a' * 17}, 'visite de 17 caractères'), ({'name': 'Visite', 'visit': 'abcd-1234'}, 'visite avec « - »'),
           ({**good, 'lang': 'de'}, 'langue « de »'), ({**good, 'page': '/en/'}, 'page « /en/ »'), ({**good, 'device': 'tv'}, 'appareil « tv »'),
           ({**good, 'props': []}, 'props liste'), ({**good, 'props': 'x'}, 'props texte'), ({**good, 'props': {'x': 'a' * 800}}, 'props de 800 octets ou plus'),
           ({**good, 'ip': '1.2.3.4'}, 'champ en trop'), ({'visit': 'abcd1234'}, 'nom absent')]
    for e, label in bad:
        st, _, t = call('events.php', 'POST', [good, e])
        check(f'lot refusé en entier : {label} → 400', st == 400 and (js(t) or {}).get('error') == 'bad_event', f'{st} {t}')
    check('aucun événement d’un lot refusé n’a été enregistré', one('SELECT COUNT(*) FROM events') == '0')
    st, _, _ = call('events.php', 'POST', [good] * 51)
    check('lot de plus de 50 événements → 400', st == 400)
    st, _, _ = call('events.php', 'POST', [{**good, 'props': {'x': 'é' * 200}}])
    check('props de moins de 800 octets accepté (accents compris)', st == 201)
    # Limites : ignorées sans erreur
    reset()
    sql("INSERT INTO events (name, visit, at) WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 149) SELECT 'Indice', 'bavard123', UTC_TIMESTAMP(6) - INTERVAL 30 MINUTE FROM n")
    st, _, t = call('events.php', 'POST', [{'name': 'Gland', 'visit': 'bavard123'}] * 3 + [{'name': 'Gland', 'visit': 'calme1234'}])
    check('150 événements d’une visite sur une heure : la suite est ignorée sans erreur (201), les autres visites passent', st == 201 and js(t) == {'ok': True}
          and one("SELECT COUNT(*) FROM events WHERE visit='bavard123'") == '150' and one("SELECT COUNT(*) FROM events WHERE visit='calme1234'") == '1', t)
    sql("UPDATE events SET at = UTC_TIMESTAMP(6) - INTERVAL 61 MINUTE WHERE visit = 'bavard123'")
    call('events.php', 'POST', [{'name': 'Gland', 'visit': 'bavard123'}])
    check('… une heure plus tard, cette visite peut de nouveau envoyer', one("SELECT COUNT(*) FROM events WHERE visit='bavard123'") == '151')
    reset()
    sql("SET SESSION cte_max_recursion_depth = 40000; INSERT INTO events (name, visit, at) WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 30000) SELECT 'Visite', CONCAT('v', LPAD(i, 8, '0')), UTC_TIMESTAMP(6) - INTERVAL 5 HOUR FROM n")
    st, _, _ = call('events.php', 'POST', [{'name': 'Visite', 'visit': 'nouveau123'}])
    check('30 000 événements sur 24 h : la suite est ignorée sans erreur (201)', st == 201 and one("SELECT COUNT(*) FROM events WHERE visit='nouveau123'") == '0')
    reset()

    # ---------- Accès : origine, méthodes, tailles, format ----------
    st, _, t = call('scores.php', 'POST', {'pseudo': 'Pirate', 'score': 1}, origin='https://evil.example')
    check('origine étrangère → 403 (rien d’enregistré)', st == 403 and one('SELECT COUNT(*) FROM scores') == '0', f'{st} {t}')
    st, _, _ = call('scores.php', 'POST', {'pseudo': 'Www ok', 'score': 1}, origin='https://www.pierrelogre.com')
    check('origine www.pierrelogre.com acceptée', st == 201)
    st, _, _ = call('events.php', 'POST', [good], origin='http://pierrelogre.com')
    check('origine en http:// refusée', st == 403)
    st, h, _ = call('events.php', 'OPTIONS', origin=SITE)
    check('pré-vérification CORS (OPTIONS) : 204, méthode POST et en-tête Content-Type seulement', st == 204 and h.get('Access-Control-Allow-Methods') == 'POST'
          and h.get('Access-Control-Allow-Headers') == 'Content-Type' and h.get('Access-Control-Allow-Origin') == SITE)
    st, _, _ = call('events.php', 'OPTIONS', origin='https://evil.example')
    check('pré-vérification CORS d’une origine étrangère → 403', st == 403)
    for path, meth in [('events.php', 'GET'), ('scores.php', 'PUT'), ('scores.php', 'DELETE'), ('daily.php', 'PATCH')]:
        st, h, _ = call(path, meth, origin=None)
        check(f'{meth} {path} → 405', st == 405 and h.get('Allow'))
    st, _, _ = call('scores.php', 'POST', raw=b'{"pseudo":"' + b'a' * 2000 + b'","score":1}')
    check('corps trop gros (score > 1 Ko) → 413', st == 413)
    st, _, _ = call('events.php', 'POST', raw=json.dumps([good] * 40 + [{**good, 'props': {'x': 'a' * 70000}}]).encode())
    check('corps trop gros (événements > 64 Ko) → 413', st == 413)
    st, _, _ = call('scores.php', 'POST', raw=b'{"pseudo":', ctype='application/json')
    check('JSON invalide → 400', st == 400)
    st, _, _ = call('scores.php', 'POST', raw=b'{"pseudo":"abc","score":1}', ctype='text/plain')
    check('Content-Type autre que JSON → 415', st == 415)
    check('l’API ne lit jamais la table events ni les statistiques (aucune requête de lecture dessus)',
          'FROM stats_' not in open(os.path.join(ROOT, 'server', 'lib', 'api.php')).read()
          and all(q.strip().startswith(('SELECT COUNT(*) FROM events', 'INSERT INTO events')) for q in [l.split("'")[1] if "'" in l else '' for l in open(os.path.join(ROOT, 'server', 'lib', 'api.php')) if 'events' in l and ('SELECT' in l or 'INSERT' in l)] if q))
    check('www/api ne contient que les trois points d’entrée', sorted(os.listdir(os.path.join(ROOT, 'src', 'api'))) == ['daily.php', 'events.php', 'scores.php'])

    # ---------- Base injoignable ou config absente : 503 propre ----------
    broken = cfg + '.cassee.php'
    with open(broken, 'w') as f: f.write("<?php return ['db_host'=>'127.0.0.1','db_port'=>1,'db_name'=>'x','db_user'=>'x','db_pass'=>'x','ip_key'=>str_repeat('k',64)];")
    out = subprocess.run(['php', '-r', "$_SERVER['REQUEST_METHOD']='GET'; require 'src/api/scores.php';"], cwd=ROOT, capture_output=True, text=True,
                         env={**env, 'FOX_API_CONFIG': broken})
    check('base injoignable → 503 « indisponible » en JSON, sans détail technique', '"error":"unavailable"' in out.stdout and 'SQLSTATE' not in out.stdout and 'PDO' not in out.stdout, out.stdout[:200])
    out = subprocess.run(['php', '-r', "$_SERVER['REQUEST_METHOD']='GET'; require 'src/api/scores.php';"], cwd=ROOT, capture_output=True, text=True,
                         env={**env, 'FOX_API_CONFIG': cfg + '.absent.php'})
    check('config.php absent → 503 « indisponible »', '"error":"unavailable"' in out.stdout, out.stdout[:200])

    # ---------- Vues de statistiques ----------
    reset()
    sql("""INSERT INTO events (at, name, visit, lang, device, props) VALUES
      ('2026-07-01 21:30:00', 'Visite', 'eteparis1', 'fr', 'desktop', '{}'),
      ('2026-07-01 22:30:00', 'Visite', 'eteparis2', 'fr', 'desktop', '{}'),
      ('2026-12-01 22:30:00', 'Visite', 'hivparis1', 'fr', 'desktop', '{}'),
      ('2026-12-01 23:30:00', 'Visite', 'hivparis2', 'fr', 'desktop', '{}')""")
    jours = {r[0]: r[1] for r in sql('SELECT jour, visites FROM stats_jour')}
    check('stats_jour : jours en heure de Paris (été UTC+2, hiver UTC+1)', jours == {'2026-07-01': '1', '2026-07-02': '1', '2026-12-01': '1', '2026-12-02': '1'}, str(jours))
    reset()
    sql("""INSERT INTO events (at, name, visit, device, props) VALUES
      (UTC_TIMESTAMP(6), 'Visite', 'aaaa1111', 'phone', '{"utm":"linkedin","ref":"x.com"}'), (UTC_TIMESTAMP(6), 'Jeu prêt', 'aaaa1111', 'phone', '{"ms":1000}'),
      (UTC_TIMESTAMP(6), 'Visite', 'bbbb2222', 'phone', '{"ref":"bing.com"}'), (UTC_TIMESTAMP(6), 'Jeu prêt', 'bbbb2222', 'phone', '{"ms":2000}'),
      (UTC_TIMESTAMP(6), 'Visite', 'cccc3333', 'phone', '{}'), (UTC_TIMESTAMP(6), 'Jeu prêt', 'cccc3333', 'phone', '{"ms":4000}'),
      (UTC_TIMESTAMP(6), 'Jeu prêt', 'dddd4444', 'phone', '{"ms":10000}'), (UTC_TIMESTAMP(6), 'Qualité', 'aaaa1111', 'phone', '{"tier":1,"fps":50}'),
      (UTC_TIMESTAMP(6), 'Clic LinkedIn', 'aaaa1111', 'phone', '{}'), (UTC_TIMESTAMP(6) - INTERVAL 40 DAY, 'Visite', 'vieux1234', 'phone', '{}')""")
    app = sql('SELECT appareil, visites, chargement_ms_median, qualite_reduite, images_par_seconde FROM stats_appareils')
    check('stats_appareils : vraie médiane (1 000, 2 000, 4 000, 10 000 → 3 000), qualité, fluidité, 30 jours', app == [['phone', '3', '3000.000000', '1', '50']], str(app))
    ent = sql('SELECT etape, nombre, pourcentage FROM stats_entonnoir')
    check('stats_entonnoir : 7 étapes, pourcentages (30 jours)', [r[1] for r in ent] == ['3', '4', '0', '0', '0', '0', '1'] and ent[1][2] == '100' and ent[0][2] == '75', str(ent))
    src = {r[0]: r[2] for r in sql('SELECT source, langue, visites FROM stats_sources')}
    check('stats_sources : utm, sinon site d’origine, sinon « (direct) »', src == {'linkedin': '1', 'bing.com': '1', '(direct)': '1'}, str(src))

    # ---------- Nettoyage quotidien ----------
    reset()
    sql("""INSERT INTO events (at, name, visit) VALUES (UTC_TIMESTAMP(6) - INTERVAL 14 MONTH, 'Visite', 'vieux1234'), (UTC_TIMESTAMP(6) - INTERVAL 12 MONTH, 'Visite', 'recent123');
      INSERT INTO daily_times (day, pseudo, secs, created_at) VALUES ('2026-01-01', 'Vieux', 50, UTC_TIMESTAMP(6) - INTERVAL 31 DAY), ('2026-01-02', 'Recent', 50, UTC_TIMESTAMP(6) - INTERVAL 29 DAY);
      INSERT INTO api_ip (ip_hash, kind, at) VALUES (UNHEX(SHA2('a', 256)), 'score', UTC_TIMESTAMP(6) - INTERVAL 25 HOUR), (UNHEX(SHA2('b', 256)), 'score', UTC_TIMESTAMP(6) - INTERVAL 23 HOUR);
      INSERT INTO scores (pseudo, score, created_at) VALUES ('Ancien', 5, UTC_TIMESTAMP(6) - INTERVAL 3 YEAR);""")
    out = subprocess.run(['php', os.path.join(ROOT, 'server', 'cron', 'tache-planifiee.php')], capture_output=True, text=True, env=env)
    check('nettoyage : événements de plus de 13 mois effacés, les autres gardés', out.returncode == 0 and [r[0] for r in sql('SELECT visit FROM events')] == ['recent123'], out.stdout + out.stderr)
    check('nettoyage : temps du jour de plus de 30 jours effacés, les autres gardés', [r[0] for r in sql('SELECT pseudo FROM daily_times')] == ['Recent'])
    check('nettoyage : empreintes IP de plus de 24 h effacées', one('SELECT COUNT(*) FROM api_ip') == '1')
    check('nettoyage : les scores du mini-jeu ne sont jamais effacés', one('SELECT COUNT(*) FROM scores') == '1')
    check('nettoyage : compte rendu lisible dans l’e-mail de la tâche planifiée', 'événements de plus de 13 mois : 1 supprimé(s)' in out.stdout, out.stdout)
    out = subprocess.run(['php-cgi', '-q', os.path.join(ROOT, 'server', 'cron', 'tache-planifiee.php')], capture_output=True, text=True, env=env) if subprocess.run(['which', 'php-cgi'], capture_output=True).returncode == 0 else None
    if out is not None: check('nettoyage : refuse de tourner hors ligne de commande', 'supprimé' not in out.stdout)

    # ---------- Migrations automatiques (même tâche planifiée) ----------
    cron = os.path.join(ROOT, 'server', 'cron', 'tache-planifiee.php')
    mig = tempfile.mkdtemp()
    def write(n, t):
        with open(os.path.join(mig, n), 'w') as f: f.write(t)
    def run_cron():
        return subprocess.run(['php', cron], capture_output=True, text=True, env={**env, 'FOX_MIGRATIONS_DIR': mig})
    out = run_cron()
    check('migrations : rien à appliquer → la tâche le dit et continue le nettoyage', out.returncode == 0 and 'rien à appliquer' in out.stdout and 'supprimé' in out.stdout, out.stdout + out.stderr)
    write('0001_table_essai.sql', "-- table d'essai\nCREATE TABLE IF NOT EXISTS essai (x INT NOT NULL, note VARCHAR(20) DEFAULT 'a;b');\nINSERT INTO essai (x) VALUES (1);\n")
    write('0002_colonne.sql', "ALTER TABLE essai ADD COLUMN y INT NULL;\nUPDATE essai SET y = 2;")
    write('notes.txt', 'ignoré'); write('3_mal_nomme.sql', 'DROP TABLE scores;')
    out = run_cron()
    applied = [r[0] for r in sql('SELECT name FROM schema_migrations ORDER BY name')]
    check('migrations : appliquées dans l’ordre des numéros, notées dans schema_migrations', out.returncode == 0 and applied == ['0001_table_essai.sql', '0002_colonne.sql']
          and sql('SELECT x, y, note FROM essai') == [['1', '2', 'a;b']], out.stdout + out.stderr)
    check('migrations : fichiers mal nommés ignorés (aucune table effacée)', one("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'scores'") == '1')
    out = run_cron()
    check('migrations : jamais rejouées (une seule ligne insérée)', out.returncode == 0 and one('SELECT COUNT(*) FROM essai') == '1' and 'rien à appliquer' in out.stdout, out.stdout)
    write('0001_table_essai.sql', 'CREATE TABLE IF NOT EXISTS essai (x INT);\nINSERT INTO essai (x) VALUES (9);')
    write('0003_erreur.sql', 'ALTER TABLE table_absente ADD COLUMN z INT;')
    write('0004_apres.sql', 'ALTER TABLE essai ADD COLUMN w INT NULL;')
    out = run_cron()
    applied = [r[0] for r in sql('SELECT name FROM schema_migrations ORDER BY name')]
    check('migrations : une erreur arrête la suite, la tâche échoue (code 1) et le compte rendu donne l’erreur', out.returncode == 1
          and '0003_erreur.sql a échoué' in out.stdout and "table_absente" in out.stdout and '0004_apres.sql' not in applied, out.stdout)
    check('migrations : une migration déjà appliquée puis modifiée est signalée, pas rejouée', '0001_table_essai.sql a changé' in out.stdout and one('SELECT COUNT(*) FROM essai') == '1')
    check('migrations : le nettoyage tourne quand même après une migration en échec', 'supprimé' in out.stdout)
    os.remove(os.path.join(mig, '0003_erreur.sql'))
    out = run_cron()
    check('migrations : une fois l’erreur corrigée, la suite s’applique', out.returncode == 0 and '0004_apres.sql appliquée' in out.stdout, out.stdout)
    sql('DROP TABLE essai; DELETE FROM schema_migrations;')
    repo = os.path.join(ROOT, 'server', 'migrations')
    names = [f for f in os.listdir(repo) if f.endswith('.sql')]
    check('migrations du dépôt : noms au bon format (NNNN_description.sql), numéros uniques', all(re.match(r'^\d{4}_[a-z0-9_-]+\.sql$', f) for f in names)
          and len({f[:4] for f in names}) == len(names), str(names))
    out = subprocess.run(['php', cron], capture_output=True, text=True, env={**env, 'FOX_MIGRATIONS_DIR': repo})
    check('migrations du dépôt : s’appliquent sans erreur sur la base de schema.sql', out.returncode == 0, out.stdout + out.stderr)
    out = subprocess.run(['php', cron], capture_output=True, text=True, env={**env, 'FOX_MIGRATIONS_DIR': repo})
    check('migrations du dépôt : relancer ne fait rien de plus', out.returncode == 0 and 'rien à appliquer' in out.stdout, out.stdout)

    # ---------- Import des données réelles (facultatif) ----------
    data = os.environ.get('DATA_SQL')
    if data and os.path.exists(data):
        reset()
        sql(open(data, encoding='utf-8').read()); sql(open(os.path.join(ROOT, 'server', 'apres-import.sql'), encoding='utf-8').read())
        n = sql("SELECT (SELECT COUNT(*) FROM scores), (SELECT COUNT(*) FROM daily_times), (SELECT COUNT(*) FROM events)")[0]
        ai = {r[0]: int(r[1]) for r in sql(f"SELECT table_name, auto_increment FROM information_schema.tables WHERE table_schema='{DB['db']}' AND table_name IN ('scores','events')")}
        mx = sql('SELECT (SELECT MAX(id) FROM scores), (SELECT MAX(id) FROM events)')[0]
        check('import des données : 13 scores, 0 temps du jour, 435 événements', n == ['13', '0', '435'], str(n))
        check('import : compteurs d’auto-incrément après le plus grand id', ai.get('scores') == int(mx[0]) + 1 and ai.get('events') == int(mx[1]) + 1, f'{ai} {mx}')
        st, _, _ = call('scores.php', 'POST', {'pseudo': 'Après import', 'score': 1})
        check('import : un nouveau score prend l’id suivant', st == 201 and one("SELECT id FROM scores WHERE pseudo='Après import'") == str(int(mx[0]) + 1))
        st, _, t = call('scores.php?game=handball', origin=None)
        check('import : classement identique à Supabase', [x['pseudo'] for x in js(t)][:6] == ['Nathan', 'Pierre', 'natalie', 'ClaudeTest', 'Véronique Test', 'SpamTest'], t[:200])

main()
