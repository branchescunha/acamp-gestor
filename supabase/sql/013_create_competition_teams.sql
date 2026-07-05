begin;

create table if not exists public.competition_teams (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps(id) on delete cascade,
  name text not null,
  color text,
  symbol text,
  leader_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.competition_teams'::regclass
      and conname = 'competition_teams_status_check'
  ) then
    alter table public.competition_teams
      add constraint competition_teams_status_check
      check (status in ('active', 'inactive'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.competition_teams'::regclass
      and conname = 'competition_teams_name_not_blank_check'
  ) then
    alter table public.competition_teams
      add constraint competition_teams_name_not_blank_check
      check (length(btrim(name)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.competition_teams'::regclass
      and conname = 'competition_teams_name_trimmed_check'
  ) then
    alter table public.competition_teams
      add constraint competition_teams_name_trimmed_check
      check (name = btrim(name));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.competition_teams'::regclass
      and conname = 'competition_teams_id_camp_id_unique'
  ) then
    alter table public.competition_teams
      add constraint competition_teams_id_camp_id_unique
      unique (id, camp_id);
  end if;
end $$;

create index if not exists competition_teams_camp_status_idx
  on public.competition_teams(camp_id, status);

create unique index if not exists competition_teams_camp_name_unique_idx
  on public.competition_teams(camp_id, lower(btrim(name)));

create or replace function public.set_competition_teams_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists competition_teams_set_updated_at
on public.competition_teams;

create trigger competition_teams_set_updated_at
before update on public.competition_teams
for each row
execute function public.set_competition_teams_updated_at();

alter table public.competition_teams enable row level security;

revoke all
on public.competition_teams
from public;

revoke all
on public.competition_teams
from anon;

grant select, insert, update, delete
on public.competition_teams
to authenticated;

drop policy if exists "Authenticated users can manage competition teams by camp"
on public.competition_teams;

create policy "Authenticated users can manage competition teams by camp"
on public.competition_teams
for all
to authenticated
using (
  public.can_manage_camp(camp_id)
)
with check (
  public.can_manage_camp(camp_id)
);

alter table public.participants
  add column if not exists competition_team_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.participants'::regclass
      and conname = 'participants_competition_team_requires_camp_check'
  ) then
    alter table public.participants
      add constraint participants_competition_team_requires_camp_check
      check (competition_team_id is null or camp_id is not null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.participants'::regclass
      and conname = 'participants_competition_team_camp_fk'
  ) then
    alter table public.participants
      add constraint participants_competition_team_camp_fk
      foreign key (competition_team_id, camp_id)
      references public.competition_teams(id, camp_id)
      on delete restrict;
  end if;
end $$;

alter table public.score_events
  add column if not exists competition_team_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.score_events'::regclass
      and conname = 'score_events_competition_team_requires_camp_check'
  ) then
    alter table public.score_events
      add constraint score_events_competition_team_requires_camp_check
      check (competition_team_id is null or camp_id is not null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.score_events'::regclass
      and conname = 'score_events_competition_team_camp_fk'
  ) then
    alter table public.score_events
      add constraint score_events_competition_team_camp_fk
      foreign key (competition_team_id, camp_id)
      references public.competition_teams(id, camp_id)
      on delete restrict;
  end if;
end $$;

alter table public.gymkhana_events
  add column if not exists winning_competition_team_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gymkhana_events'::regclass
      and conname = 'gymkhana_events_winning_competition_team_requires_camp_check'
  ) then
    alter table public.gymkhana_events
      add constraint gymkhana_events_winning_competition_team_requires_camp_check
      check (winning_competition_team_id is null or camp_id is not null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gymkhana_events'::regclass
      and conname = 'gymkhana_events_winning_competition_team_camp_fk'
  ) then
    alter table public.gymkhana_events
      add constraint gymkhana_events_winning_competition_team_camp_fk
      foreign key (winning_competition_team_id, camp_id)
      references public.competition_teams(id, camp_id)
      on delete restrict;
  end if;
end $$;

create index if not exists participants_competition_team_id_idx
  on public.participants(competition_team_id);

create index if not exists score_events_competition_team_id_idx
  on public.score_events(competition_team_id);

create index if not exists score_events_camp_competition_team_idx
  on public.score_events(camp_id, competition_team_id);

create index if not exists gymkhana_events_winning_competition_team_id_idx
  on public.gymkhana_events(winning_competition_team_id);

drop view if exists public.public_ranking_competition_participants;
drop view if exists public.public_ranking_competition_score_events;
drop view if exists public.public_ranking_competition_teams;

create view public.public_ranking_competition_teams
with (security_barrier = true)
as
select
  competition_teams.id,
  competition_teams.camp_id,
  competition_teams.name,
  competition_teams.color,
  competition_teams.symbol
from public.competition_teams
inner join public.camps
  on camps.id = competition_teams.camp_id
where competition_teams.status = 'active'
  and camps.public_ranking_enabled = true
  and camps.slug is not null;

create view public.public_ranking_competition_score_events
with (security_barrier = true)
as
select
  score_events.camp_id,
  score_events.competition_team_id,
  score_events.points
from public.score_events
inner join public.competition_teams
  on competition_teams.id = score_events.competition_team_id
  and competition_teams.camp_id = score_events.camp_id
inner join public.camps
  on camps.id = score_events.camp_id
where score_events.competition_team_id is not null
  and competition_teams.status = 'active'
  and camps.public_ranking_enabled = true
  and camps.slug is not null;

create view public.public_ranking_competition_participants
with (security_barrier = true)
as
select
  participants.camp_id,
  participants.competition_team_id,
  participants.is_active
from public.participants
inner join public.competition_teams
  on competition_teams.id = participants.competition_team_id
  and competition_teams.camp_id = participants.camp_id
inner join public.camps
  on camps.id = participants.camp_id
where participants.is_active = true
  and participants.competition_team_id is not null
  and competition_teams.status = 'active'
  and camps.public_ranking_enabled = true
  and camps.slug is not null;

revoke all
on public.public_ranking_competition_teams
from public;

revoke all
on public.public_ranking_competition_teams
from anon;

revoke all
on public.public_ranking_competition_teams
from authenticated;

revoke all
on public.public_ranking_competition_score_events
from public;

revoke all
on public.public_ranking_competition_score_events
from anon;

revoke all
on public.public_ranking_competition_score_events
from authenticated;

revoke all
on public.public_ranking_competition_participants
from public;

revoke all
on public.public_ranking_competition_participants
from anon;

revoke all
on public.public_ranking_competition_participants
from authenticated;

grant select
on public.public_ranking_competition_teams
to anon, authenticated;

grant select
on public.public_ranking_competition_score_events
to anon, authenticated;

grant select
on public.public_ranking_competition_participants
to anon, authenticated;

grant select
on public.public_ranking_tribes
to authenticated;

grant select
on public.public_ranking_participants
to authenticated;

grant select
on public.public_ranking_score_events
to authenticated;

commit;
