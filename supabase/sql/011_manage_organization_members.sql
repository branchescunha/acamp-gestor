create or replace function public.can_manage_organization_members(
  target_organization_id uuid
)
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
        and organization_members.role = 'owner'
        and organization_members.status = 'active'
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
    inner join public.profiles
      on profiles.id = auth.uid()
    where organizations.id = target_organization_id
      and organizations.created_by = auth.uid()
      and profiles.status = 'active'
      and profiles.role in ('admin', 'gestor')
      and not exists (
        select 1
        from public.organization_members
        where organization_members.organization_id = target_organization_id
      )
  );
$$;

create or replace function public.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or target_profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles current_profile
      inner join public.organization_members current_member
        on current_member.profile_id = current_profile.id
      inner join public.organization_members target_member
        on target_member.organization_id = current_member.organization_id
      where current_profile.id = auth.uid()
        and current_profile.status = 'active'
        and current_member.status = 'active'
        and target_member.profile_id = target_profile_id
    );
$$;

drop policy if exists "Members can read related profiles"
on public.profiles;

create policy "Members can read related profiles"
on public.profiles
for select
to authenticated
using (public.can_read_profile(id));

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

drop policy if exists "Owners can create organization members"
on public.organization_members;

drop policy if exists "Owners can update organization members"
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

create policy "Owners can create organization members"
on public.organization_members
for insert
to authenticated
with check (public.can_manage_organization_members(organization_id));

create policy "Owners can update organization members"
on public.organization_members
for update
to authenticated
using (public.can_manage_organization_members(organization_id))
with check (public.can_manage_organization_members(organization_id));

create or replace function public.add_organization_member_by_email(
  target_organization_id uuid,
  member_email text,
  member_role text default 'manager'
)
returns table (
  id uuid,
  organization_id uuid,
  profile_id uuid,
  name text,
  email text,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(btrim(member_email));
  normalized_role text := coalesce(member_role, 'manager');
  target_profile public.profiles%rowtype;
  saved_member public.organization_members%rowtype;
begin
  if not public.can_manage_organization_members(target_organization_id) then
    raise exception 'Você não tem permissão para gerenciar membros desta organização.';
  end if;

  if normalized_email is null or length(normalized_email) = 0 then
    raise exception 'Informe o e-mail do profile.';
  end if;

  if normalized_role not in ('owner', 'manager') then
    raise exception 'Papel de membro inválido.';
  end if;

  select *
  into target_profile
  from public.profiles
  where lower(profiles.email) = normalized_email
    and profiles.status = 'active'
  limit 1;

  if target_profile.id is null then
    raise exception 'Profile ativo não encontrado para este e-mail.';
  end if;

  insert into public.organization_members (
    organization_id,
    profile_id,
    role,
    status,
    updated_at
  )
  values (
    target_organization_id,
    target_profile.id,
    normalized_role,
    'active',
    now()
  )
  on conflict (organization_id, profile_id) do update
  set role = excluded.role,
      status = 'active',
      updated_at = now()
  returning *
  into saved_member;

  return query
  select
    saved_member.id,
    saved_member.organization_id,
    saved_member.profile_id,
    target_profile.name,
    target_profile.email,
    saved_member.role,
    saved_member.status;
end;
$$;

revoke all
on function public.can_manage_organization_members(uuid)
from public;

grant execute
on function public.can_manage_organization_members(uuid)
to authenticated;

revoke all
on function public.can_read_profile(uuid)
from public;

grant execute
on function public.can_read_profile(uuid)
to authenticated;

revoke all
on function public.add_organization_member_by_email(uuid, text, text)
from public;

grant execute
on function public.add_organization_member_by_email(uuid, text, text)
to authenticated;
