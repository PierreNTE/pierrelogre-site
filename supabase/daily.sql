-- =====================================================================
-- Classement du défi du jour (pierrelogre.com) : le meilleur temps de chaque pseudo, pour chaque jour.
-- Même projet Supabase que le classement du mini-jeu ; réutilise public.pseudo_ok (supabase/leaderboard.sql).
-- La clé publique (« publishable ») peut lire et ajouter, jamais modifier ni supprimer. Temps gardés 30 jours.
-- =====================================================================

create table if not exists public.daily_times (
  id         bigint generated always as identity primary key,
  day        date        not null,
  pseudo     text        not null check (char_length(pseudo) between 2 and 16 and pseudo ~ '^[[:alnum:] _.-]+$' and public.pseudo_ok(pseudo)),
  secs       numeric(7, 1) not null check (secs between 10 and 7200),   -- 5 bêtises : jamais moins de 10 s, au plus 2 h
  created_at timestamptz not null default now()
);
create index if not exists daily_times_day_secs_idx on public.daily_times (day, secs);
create index if not exists daily_times_pseudo_created_idx on public.daily_times (pseudo, created_at);
create index if not exists daily_times_created_idx on public.daily_times (created_at);

alter table public.daily_times enable row level security;
drop policy if exists "lecture publique" on public.daily_times;
create policy "lecture publique" on public.daily_times for select to anon using (true);
-- Ajout : seulement pour hier, aujourd'hui ou demain (fuseaux horaires des visiteurs), pseudo et temps vérifiés
drop policy if exists "ajout public controle" on public.daily_times;
create policy "ajout public controle" on public.daily_times for insert to anon
  with check (day between current_date - 1 and current_date + 1 and char_length(pseudo) between 2 and 16 and secs between 10 and 7200);

revoke all on public.daily_times from anon, authenticated;
grant select (day, pseudo, secs) on public.daily_times to anon;
grant insert (day, pseudo, secs) on public.daily_times to anon;

-- Anti-spam : au plus 5 temps par pseudo et par minute, 300 par minute et 3 000 par jour au total
create or replace function public.daily_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.daily_times where pseudo = new.pseudo and created_at > now() - interval '1 minute') >= 5
     or (select count(*) from public.daily_times where created_at > now() - interval '1 minute') >= 300
     or (select count(*) from public.daily_times where created_at > now() - interval '1 day') >= 3000 then
    raise exception 'trop de temps envoyés, réessaie plus tard';
  end if;
  return new;
end $$;
revoke all on function public.daily_rate_limit() from public, anon, authenticated;
drop trigger if exists daily_rate_limit on public.daily_times;
create trigger daily_rate_limit before insert on public.daily_times for each row execute function public.daily_rate_limit();

-- Le classement affiché : le meilleur temps de chaque pseudo, jour par jour
create or replace view public.daily_leaderboard with (security_invoker = true) as
  select distinct on (day, pseudo) day, pseudo, secs
  from public.daily_times
  order by day, pseudo, secs asc;
revoke all on public.daily_leaderboard from anon, authenticated;
grant select on public.daily_leaderboard to anon;

-- Effacement automatique des temps de plus de 30 jours (chaque nuit à 3 h 27)
create extension if not exists pg_cron;
select cron.schedule('purge-daily', '27 3 * * *', $$delete from public.daily_times where created_at < now() - interval '30 days'$$);
