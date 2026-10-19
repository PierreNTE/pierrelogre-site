-- =====================================================================
-- Classement du mini-jeu « Tir au renard » (pierrelogre.com)
-- Appliqué sur le projet Supabase dédié « pierrelogre-classement » (Paris).
-- Pour un autre projet : Supabase > SQL Editor > New query, coller ce fichier, Run.
-- Le site n'utilise que la clé publique (« publishable ») : ces règles décident de tout ce qu'elle peut faire.
-- Jamais de clé secrète / service_role dans le site.
-- =====================================================================

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  pseudo     text        not null check (char_length(pseudo) between 2 and 16 and pseudo ~ '^[[:alnum:] _.-]+$'),
  score      integer     not null check (score between 0 and 20000),
  game       text        not null default 'handball' check (game in ('handball')),
  created_at timestamptz not null default now()
);
create index if not exists scores_game_score_idx on public.scores (game, score desc);
create index if not exists scores_created_idx on public.scores (created_at);
create index if not exists scores_pseudo_created_idx on public.scores (pseudo, created_at);

-- Sécurité au niveau des lignes : lecture et ajout seulement, jamais de modification ni de suppression.
alter table public.scores enable row level security;

drop policy if exists "lecture publique" on public.scores;
create policy "lecture publique" on public.scores for select to anon using (true);

drop policy if exists "ajout public controle" on public.scores;
create policy "ajout public controle" on public.scores for insert to anon
  with check (char_length(pseudo) between 2 and 16 and score between 0 and 20000 and game = 'handball');

-- Seules les colonnes utiles sont lisibles / modifiables par la clé publique ; le rôle « authenticated »
-- (comptes, non utilisés ici) n'a aucun droit.
revoke all on public.scores from anon, authenticated;
grant select (pseudo, score, game, created_at) on public.scores to anon;
grant insert (pseudo, score, game) on public.scores to anon;

-- Pseudos abusifs : même liste que src/js/leaderboard.js (sans accents, sans ponctuation, « l33t » défait).
create or replace function public.pseudo_ok(p text) returns boolean
language sql immutable set search_path = '' as $$
  select not (regexp_replace(translate(lower(p), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ0134@$5', 'aaaaaaceeeeiiiinooooouuuuyyoieaass'), '[^a-z]', '', 'g')
    ~ '(connard|connasse|salope|salaud|encul|putain|merde|batard|couille|niquer|niktamer|fdp|ntm|tapette|bougnoul|youpin|nazi|hitler|fuck|shit|bitch|cunt|pussy|whore|slut|nigg|faggot|porn|violeur|pedophil|pedofil)');
$$;
alter table public.scores drop constraint if exists scores_pseudo_ok;
alter table public.scores add constraint scores_pseudo_ok check (public.pseudo_ok(pseudo)) not valid;

-- Anti-spam : au plus 5 scores par pseudo et par minute, 300 par minute et 3 000 par jour au total
-- (le site lui-même n'envoie pas plus d'un score toutes les 20 secondes).
create or replace function public.scores_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.scores where pseudo = new.pseudo and created_at > now() - interval '1 minute') >= 5
     or (select count(*) from public.scores where created_at > now() - interval '1 minute') >= 300
     or (select count(*) from public.scores where created_at > now() - interval '1 day') >= 3000 then
    raise exception 'trop de scores, réessaie plus tard';
  end if;
  return new;
end $$;
revoke all on function public.scores_rate_limit() from public, anon, authenticated;
drop trigger if exists scores_rate_limit on public.scores;
create trigger scores_rate_limit before insert on public.scores for each row execute function public.scores_rate_limit();

-- Le classement affiché : le meilleur score de chaque pseudo (sinon un même joueur pourrait occuper tout le top 10).
-- security_invoker : la vue applique les droits et les règles de celui qui la lit (la clé publique).
create or replace view public.leaderboard with (security_invoker = true) as
  select distinct on (game, pseudo) pseudo, score, game
  from public.scores
  order by game, pseudo, score desc;
revoke all on public.leaderboard from anon, authenticated;
grant select on public.leaderboard to anon;
