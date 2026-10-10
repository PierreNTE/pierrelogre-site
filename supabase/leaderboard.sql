-- =====================================================================
-- Classement du mini-jeu « Tir au renard » (pierrelogre.com)
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Le site n'utilise que la clé publique « anon » : ces règles décident de ce qu'elle peut faire.
-- =====================================================================

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  pseudo     text        not null check (char_length(pseudo) between 2 and 16 and pseudo ~ '^[[:alnum:] _.-]+$'),
  score      integer     not null check (score between 0 and 20000),
  game       text        not null default 'handball' check (game in ('handball')),
  created_at timestamptz not null default now()
);
create index if not exists scores_game_score_idx on public.scores (game, score desc);

-- Sécurité au niveau des lignes : lecture et ajout seulement, jamais de modification ni de suppression.
alter table public.scores enable row level security;

drop policy if exists "lecture publique" on public.scores;
create policy "lecture publique" on public.scores for select to anon using (true);

drop policy if exists "ajout public controle" on public.scores;
create policy "ajout public controle" on public.scores for insert to anon
  with check (char_length(pseudo) between 2 and 16 and score between 0 and 20000 and game = 'handball');

-- Seules les colonnes utiles sont exposées / modifiables par la clé anon.
revoke all on public.scores from anon;
grant select (pseudo, score, game, created_at) on public.scores to anon;
grant insert (pseudo, score, game) on public.scores to anon;

-- Pseudos abusifs : même liste que src/js/leaderboard.js (sans accents, sans ponctuation, « l33t » défait).
create or replace function public.pseudo_ok(p text) returns boolean
language sql immutable as $$
  select not (regexp_replace(translate(lower(p), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ013@$5', 'aaaaaaceeeeiiiinooooouuuuyyoieass'), '[^a-z]', '', 'g')
    ~ '(connard|connasse|salope|salaud|encul|putain|merde|batard|couille|niquer|niktamer|fdp|ntm|tapette|bougnoul|youpin|nazi|hitler|fuck|shit|bitch|cunt|pussy|whore|slut|nigg|faggot|porn|violeur|pedophil|pedofil)');
$$;
alter table public.scores drop constraint if exists scores_pseudo_ok;
alter table public.scores add constraint scores_pseudo_ok check (public.pseudo_ok(pseudo)) not valid;

-- Anti-spam simple : au plus 5 scores par pseudo et par minute, 300 par minute au total.
create or replace function public.scores_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.scores where pseudo = new.pseudo and created_at > now() - interval '1 minute') >= 5
     or (select count(*) from public.scores where created_at > now() - interval '1 minute') >= 300 then
    raise exception 'trop de scores, réessaie dans une minute';
  end if;
  return new;
end $$;
drop trigger if exists scores_rate_limit on public.scores;
create trigger scores_rate_limit before insert on public.scores for each row execute function public.scores_rate_limit();
