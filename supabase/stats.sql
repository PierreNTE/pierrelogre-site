-- =====================================================================
-- Mesure d'audience de pierrelogre.com, sans cookie (même projet Supabase que le classement)
-- Ce qui est enregistré : le nom d'un événement (« Visite », « Partie lancée », « Clic LinkedIn »…), la langue, la page,
-- le type d'appareil, quelques chiffres (temps de chargement, qualité graphique, durée) et un numéro de visite tiré
-- au hasard à chaque chargement de page, qui n'est gardé nulle part dans le navigateur : on ne peut pas reconnaître
-- un visiteur d'une visite à l'autre. Pas d'adresse IP, pas de cookie. Le site respecte « Do Not Track » et GPC.
-- La clé publique ne peut qu'ajouter des événements : elle ne peut ni les lire, ni les modifier, ni les effacer.
-- Les statistiques se lisent dans Supabase (Table Editor ou SQL Editor) : vues stats_jour, stats_entonnoir,
-- stats_appareils, stats_sources. Les événements de plus de 13 mois sont effacés chaque nuit.
-- =====================================================================

create table if not exists public.events (
  id     bigint generated always as identity primary key,
  at     timestamptz not null default now(),
  name   text not null check (name in ('Visite', 'Jeu prêt', 'Partie lancée', 'Partie terminée', 'Tutoriel terminé', 'Tutoriel passé',
           'Terrier trouvé', 'Terrier ouvert', 'Clic LinkedIn', 'Clic GitHub', 'Indice', 'Gland', 'Région ouverte', 'Succès',
           'Mini-jeu lancé', 'Mini-jeu terminé', 'Qualité', 'Bench', 'Départ', 'Profil sans jeu')),
  visit  text not null check (visit ~ '^[a-z0-9]{8,16}$'),
  lang   text check (lang in ('en', 'fr')),
  page   text check (page in ('/', '/fr/')),
  device text check (device in ('phone', 'tablet', 'desktop')),
  props  jsonb not null default '{}' check (jsonb_typeof(props) = 'object' and pg_column_size(props) < 800)
);
create index if not exists events_at_idx on public.events (at);
create index if not exists events_visit_at_idx on public.events (visit, at);
create index if not exists events_name_at_idx on public.events (name, at);

alter table public.events enable row level security;
drop policy if exists "ajout anonyme" on public.events;
create policy "ajout anonyme" on public.events for insert to anon with check (true);   -- les contraintes de la table font le tri
revoke all on public.events from anon, authenticated;
grant insert (name, visit, lang, page, device, props) on public.events to anon;

-- Anti-abus : au plus 150 événements par visite (sur une heure) et 30 000 par jour au total ; au-delà, ils sont
-- ignorés sans erreur (le site n'a rien à gérer)
create or replace function public.events_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.events where visit = new.visit and at > now() - interval '1 hour') >= 150
     or (select count(*) from public.events where at > now() - interval '1 day') >= 30000 then
    return null;
  end if;
  return new;
end $$;
revoke all on function public.events_limit() from public, anon, authenticated;
drop trigger if exists events_limit on public.events;
create trigger events_limit before insert on public.events for each row execute function public.events_limit();

-- ---------- Lecture (Supabase seulement : aucune de ces vues n'est accessible avec la clé publique) ----------
-- Par jour (heure de Paris) : visites, parties, visite guidée finie, terrier trouvé, fiche ouverte, clics LinkedIn
create or replace view public.stats_jour with (security_invoker = true) as
  select (at at time zone 'Europe/Paris')::date as jour,
    count(distinct visit) filter (where name = 'Visite') as visites,
    count(distinct visit) filter (where name = 'Partie lancée') as parties,
    count(distinct visit) filter (where name = 'Tutoriel terminé') as visite_guidee_finie,
    count(distinct visit) filter (where name = 'Terrier trouvé') as terrier_trouve,
    count(distinct visit) filter (where name = 'Terrier ouvert') as fiche_ouverte,
    count(distinct visit) filter (where name = 'Clic LinkedIn') as clic_linkedin,
    round(avg((props->>'secondes')::numeric) filter (where name = 'Départ')) as secondes_moyennes
  from public.events group by 1 order by 1 desc;

-- Entonnoir des 30 derniers jours : combien de visites atteignent chaque étape
create or replace view public.stats_entonnoir with (security_invoker = true) as
  with v as (select visit, array_agg(distinct name) as n from public.events where at > now() - interval '30 days' group by visit)
  select etape, nombre, round(100.0 * nombre / nullif(max(nombre) over (), 0)) as pourcentage from (
    select 1 as ordre, '1. Visite' as etape, count(*) filter (where 'Visite' = any(n)) as nombre from v
    union all select 2, '2. Jeu prêt', count(*) filter (where 'Jeu prêt' = any(n)) from v
    union all select 3, '3. Partie lancée', count(*) filter (where 'Partie lancée' = any(n)) from v
    union all select 4, '4. Visite guidée finie', count(*) filter (where 'Tutoriel terminé' = any(n)) from v
    union all select 5, '5. Terrier trouvé', count(*) filter (where 'Terrier trouvé' = any(n)) from v
    union all select 6, '6. Fiche ouverte', count(*) filter (where 'Terrier ouvert' = any(n)) from v
    union all select 7, '7. Clic LinkedIn', count(*) filter (where 'Clic LinkedIn' = any(n)) from v
  ) s order by ordre;

-- Appareils des 30 derniers jours : temps de chargement (médiane), qualité retenue, fluidité
create or replace view public.stats_appareils with (security_invoker = true) as
  select device as appareil,
    count(distinct visit) filter (where name = 'Visite') as visites,
    percentile_cont(.5) within group (order by (props->>'ms')::numeric) filter (where name = 'Jeu prêt') as chargement_ms_median,
    count(*) filter (where name = 'Qualité' and props->>'tier' = '0') as qualite_pleine,
    count(*) filter (where name = 'Qualité' and props->>'tier' = '1') as qualite_reduite,
    count(*) filter (where name = 'Qualité' and props->>'tier' = '2') as qualite_basse,
    round(avg((props->>'fps')::numeric) filter (where name = 'Qualité')) as images_par_seconde
  from public.events where at > now() - interval '30 days' group by device order by visites desc;

-- Provenance des 30 derniers jours (site d'où l'on vient, ou ?utm_source=… dans le lien)
create or replace view public.stats_sources with (security_invoker = true) as
  select coalesce(nullif(props->>'utm', ''), nullif(props->>'ref', ''), '(direct)') as source, lang as langue, count(*) as visites
  from public.events where name = 'Visite' and at > now() - interval '30 days' group by 1, 2 order by visites desc;

revoke all on public.stats_jour, public.stats_entonnoir, public.stats_appareils, public.stats_sources from anon, authenticated;

-- Effacement automatique des événements de plus de 13 mois (chaque nuit à 3 h 17)
create extension if not exists pg_cron;
select cron.schedule('purge-events', '17 3 * * *', $$delete from public.events where at < now() - interval '13 months'$$);
