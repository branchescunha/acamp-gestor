create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'church',
  city text,
  state text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_not_empty
    check (length(btrim(name)) > 0),
  constraint organizations_type_check
    check (type in ('church', 'school', 'other'))
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'manager',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_role_check
    check (role in ('owner', 'manager')),
  constraint organization_members_status_check
    check (status in ('active', 'suspended'))
);

create unique index if not exists organization_members_unique_idx
on public.organization_members (organization_id, profile_id);

create index if not exists organization_members_profile_id_idx
on public.organization_members (profile_id);

create index if not exists organization_members_organization_id_idx
on public.organization_members (organization_id);

alter table public.camps
add column if not exists organization_id uuid references public.organizations(id);

create index if not exists camps_organization_id_idx
on public.camps (organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

grant select, insert, update
on public.organizations
to authenticated;

grant select, insert, update
on public.organization_members
to authenticated;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.organization_members
      inner join public.profiles
        on profiles.id = organization_members.profile_id
      where organization_members.organization_id = target_organization_id
        and organization_members.profile_id = auth.uid()
        and organization_members.status = 'active'
        and profiles.status = 'active'
        and profiles.role in ('admin', 'gestor')
    );
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.organization_members
      inner join public.profiles
        on profiles.id = organization_members.profile_id
      where organization_members.organization_id = target_organization_id
        and organization_members.profile_id = auth.uid()
        and organization_members.role in ('owner', 'manager')
        and organization_members.status = 'active'
        and profiles.role = 'gestor'
        and profiles.status = 'active'
    );
$$;

create or replace function public.can_create_initial_organization_membership(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations
    where organizations.id = target_organization_id
      and organizations.created_by = auth.uid()
      and (
        public.is_platform_admin()
        or public.is_active_gestor()
      )
  );
$$;

create or replace function public.can_manage_camp(target_camp_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.profiles
      inner join public.camps
        on camps.id = target_camp_id
      where profiles.id = auth.uid()
        and profiles.role = 'gestor'
        and profiles.status = 'active'
        and (
          camps.created_by = auth.uid()
          or (
            camps.organization_id is not null
            and public.is_organization_member(camps.organization_id)
          )
        )
    );
$$;

drop policy if exists "Admins can read all organizations"
on public.organizations;

drop policy if exists "Admins can create organizations"
on public.organizations;

drop policy if exists "Admins can update all organizations"
on public.organizations;

drop policy if exists "Gestors can create organizations"
on public.organizations;

drop policy if exists "Members can read their organizations"
on public.organizations;

drop policy if exists "Members can update their organizations"
on public.organizations;

create policy "Admins can read all organizations"
on public.organizations
for select
to authenticated
using (public.is_platform_admin());

create policy "Admins can create organizations"
on public.organizations
for insert
to authenticated
with check (public.is_platform_admin());

create policy "Admins can update all organizations"
on public.organizations
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Gestors can create organizations"
on public.organizations
for insert
to authenticated
with check (
  public.is_active_gestor()
  and created_by = auth.uid()
);

create policy "Members can read their organizations"
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

create policy "Members can update their organizations"
on public.organizations
for update
to authenticated
using (public.can_manage_organization(id))
with check (public.can_manage_organization(id));

drop policy if exists "Admins can read all organization members"
on public.organization_members;

drop policy if exists "Admins can create organization members"
on public.organization_members;

drop policy if exists "Admins can update organization members"
on public.organization_members;

drop policy if exists "Members can read organization members"
on public.organization_members;

drop policy if exists "Users can create own organization owner membership"
on public.organization_members;

create policy "Admins can read all organization members"
on public.organization_members
for select
to authenticated
using (public.is_platform_admin());

create policy "Admins can create organization members"
on public.organization_members
for insert
to authenticated
with check (public.is_platform_admin());

create policy "Admins can update organization members"
on public.organization_members
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Members can read organization members"
on public.organization_members
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Users can create own organization owner membership"
on public.organization_members
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and role = 'owner'
  and status = 'active'
  and public.can_create_initial_organization_membership(organization_id)
);

drop policy if exists "Gestors can create their own camps"
on public.camps;

drop policy if exists "Gestors can read their own camps"
on public.camps;

drop policy if exists "Gestors can update their own camps"
on public.camps;

create policy "Gestors can create their own camps"
on public.camps
for insert
to authenticated
with check (
  public.is_active_gestor()
  and created_by = auth.uid()
  and (
    organization_id is null
    or public.is_organization_member(organization_id)
  )
);

create policy "Gestors can read their own camps"
on public.camps
for select
to authenticated
using (
  public.is_active_gestor()
  and (
    created_by = auth.uid()
    or (
      organization_id is not null
      and public.is_organization_member(organization_id)
    )
  )
);

create policy "Gestors can update their own camps"
on public.camps
for update
to authenticated
using (
  public.is_active_gestor()
  and (
    created_by = auth.uid()
    or (
      organization_id is not null
      and public.is_organization_member(organization_id)
    )
  )
)
with check (
  public.is_active_gestor()
  and (
    (
      created_by = auth.uid()
      and (
        organization_id is null
        or public.is_organization_member(organization_id)
      )
    )
    or (
      organization_id is not null
      and public.is_organization_member(organization_id)
    )
  )
);
