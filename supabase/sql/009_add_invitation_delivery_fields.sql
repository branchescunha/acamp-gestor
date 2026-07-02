alter table public.invitations
add column if not exists sent_at timestamptz,
add column if not exists sent_by uuid references auth.users(id);
