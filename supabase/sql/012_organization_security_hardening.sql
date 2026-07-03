create or replace function public.count_active_organization_owners(
  target_organization_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.organization_members
  where organization_id = target_organization_id
    and role = 'owner'
    and status = 'active';
$$;

create or replace function public.can_update_organization_member(
  target_member_id uuid,
  next_role text,
  next_status text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_member public.organization_members%rowtype;
  active_owner_count integer;
  normalized_role text := coalesce(next_role, '');
  normalized_status text := coalesce(next_status, '');
  caller_can_manage boolean;
begin
  if normalized_role not in ('owner', 'manager') then
    return false;
  end if;

  if normalized_status not in ('active', 'suspended') then
    return false;
  end if;

  select *
  into target_member
  from public.organization_members
  where id = target_member_id
  limit 1;

  if target_member.id is null then
    return false;
  end if;

  caller_can_manage := public.is_platform_admin()
    or exists (
      select 1
      from public.organization_members current_member
      inner join public.profiles current_profile
        on current_profile.id = current_member.profile_id
      where current_member.organization_id = target_member.organization_id
        and current_member.profile_id = auth.uid()
        and current_member.role = 'owner'
        and current_member.status = 'active'
        and current_profile.status = 'active'
    );

  if not caller_can_manage then
    return false;
  end if;

  active_owner_count := public.count_active_organization_owners(
    target_member.organization_id
  );

  if target_member.role = 'owner'
    and target_member.status = 'active'
    and active_owner_count <= 1
    and (normalized_role <> 'owner' or normalized_status <> 'active')
  then
    return false;
  end if;

  return true;
end;
$$;

drop policy if exists "Admins can update organization members"
on public.organization_members;

drop policy if exists "Owners can update organization members"
on public.organization_members;

create policy "Authorized users can update organization members safely"
on public.organization_members
for update
to authenticated
using (public.can_update_organization_member(id, role, status))
with check (public.can_update_organization_member(id, role, status));

revoke update
on public.organization_members
from authenticated;

grant update (role, status, updated_at)
on public.organization_members
to authenticated;

revoke all
on function public.count_active_organization_owners(uuid)
from public;

grant execute
on function public.count_active_organization_owners(uuid)
to authenticated;

revoke all
on function public.can_update_organization_member(uuid, text, text)
from public;

grant execute
on function public.can_update_organization_member(uuid, text, text)
to authenticated;
