alter table public.profiles
  add column if not exists email text;

create unique index if not exists profiles_email_unique_idx
on public.profiles (lower(email))
where email is not null;

grant insert (id, name, email, role, status)
on public.profiles
to authenticated;

grant update (name, email, role, status, updated_at)
on public.profiles
to authenticated;
