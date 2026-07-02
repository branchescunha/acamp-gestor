create or replace function public.get_invitation_by_token(invitation_token uuid)
returns table (
  token uuid,
  name text,
  email text,
  role text,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  canceled_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    invitations.token,
    invitations.name,
    invitations.email,
    invitations.role,
    invitations.status,
    invitations.created_at,
    invitations.accepted_at,
    invitations.canceled_at
  from public.invitations
  where invitations.token = invitation_token
  limit 1;
$$;

create or replace function public.accept_invitation(invitation_token uuid)
returns table (
  profile_id uuid,
  name text,
  email text,
  role text,
  status text,
  invitation_status text,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record public.invitations%rowtype;
  current_user_id uuid;
  current_user_email text;
  accepted_timestamp timestamptz := now();
begin
  current_user_id := auth.uid();
  current_user_email := auth.jwt() ->> 'email';

  if current_user_id is null then
    raise exception 'Usuário autenticado é obrigatório para aceitar o convite.';
  end if;

  if current_user_email is null or length(btrim(current_user_email)) = 0 then
    raise exception 'Não foi possível identificar o e-mail do usuário autenticado.';
  end if;

  select *
  into invitation_record
  from public.invitations
  where invitations.token = invitation_token
  limit 1;

  if invitation_record.id is null then
    raise exception 'Convite não encontrado.';
  end if;

  if invitation_record.status <> 'pending' then
    raise exception 'Este convite não está pendente.';
  end if;

  if lower(invitation_record.email) <> lower(current_user_email) then
    raise exception 'Este convite pertence a outro e-mail. Entre com o e-mail convidado.';
  end if;

  insert into public.profiles (
    id,
    name,
    email,
    role,
    status,
    updated_at
  )
  values (
    current_user_id,
    invitation_record.name,
    invitation_record.email,
    invitation_record.role,
    'active',
    accepted_timestamp
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      role = excluded.role,
      status = 'active',
      updated_at = accepted_timestamp;

  update public.invitations
  set status = 'accepted',
      accepted_at = accepted_timestamp,
      canceled_at = null,
      updated_at = accepted_timestamp
  where invitations.id = invitation_record.id;

  return query
  select
    current_user_id,
    invitation_record.name,
    invitation_record.email,
    invitation_record.role,
    'active'::text,
    'accepted'::text,
    accepted_timestamp;
end;
$$;

revoke all
on function public.get_invitation_by_token(uuid)
from public;

revoke all
on function public.accept_invitation(uuid)
from public;

grant execute
on function public.get_invitation_by_token(uuid)
to anon, authenticated;

grant execute
on function public.accept_invitation(uuid)
to authenticated;
