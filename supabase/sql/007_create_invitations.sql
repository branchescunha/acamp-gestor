create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text not null default 'gestor',
  status text not null default 'pending',
  token uuid not null default gen_random_uuid(),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  canceled_at timestamptz,
  constraint invitations_role_check
    check (role in ('admin', 'gestor')),
  constraint invitations_status_check
    check (status in ('pending', 'accepted', 'canceled')),
  constraint invitations_name_not_empty
    check (length(btrim(name)) > 0),
  constraint invitations_email_not_empty
    check (length(btrim(email)) > 0)
);

alter table public.invitations enable row level security;

create index if not exists invitations_email_idx
on public.invitations (lower(email));

create unique index if not exists invitations_token_unique_idx
on public.invitations (token);

revoke all
on public.invitations
from anon;

grant select, insert, update
on public.invitations
to authenticated;

drop policy if exists "Admins can read invitations"
on public.invitations;

drop policy if exists "Admins can create invitations"
on public.invitations;

drop policy if exists "Admins can update invitations"
on public.invitations;

create policy "Admins can read invitations"
on public.invitations
for select
to authenticated
using (public.is_platform_admin());

create policy "Admins can create invitations"
on public.invitations
for insert
to authenticated
with check (public.is_platform_admin());

create policy "Admins can update invitations"
on public.invitations
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());
