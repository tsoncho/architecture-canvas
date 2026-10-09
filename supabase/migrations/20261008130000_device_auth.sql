-- Device identity fallback when Anonymous Auth is disabled
create extension if not exists pgcrypto;

create or replace function public.ensure_device_user(
  p_installation_id text,
  p_email text,
  p_password text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  existing_id uuid;
  new_id uuid;
  encrypted_pw text;
begin
  if p_installation_id is null or length(trim(p_installation_id)) < 8 then
    raise exception 'Invalid installation id';
  end if;
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'Invalid email';
  end if;
  if p_password is null or length(p_password) < 16 then
    raise exception 'Invalid password';
  end if;

  select id into existing_id from auth.users where email = lower(p_email) limit 1;
  if existing_id is not null then
    update auth.users
    set
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('display_name', coalesce(nullif(trim(p_display_name), ''), 'Guest')),
      updated_at = now()
    where id = existing_id;
    return existing_id;
  end if;

  new_id := gen_random_uuid();
  encrypted_pw := crypt(p_password, gen_salt('bf'));

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous,
    confirmation_token, recovery_token, email_change_token_new, email_change, is_sso_user
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id, 'authenticated', 'authenticated', lower(p_email), encrypted_pw, now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'display_name', coalesce(nullif(trim(p_display_name), ''), 'Guest'),
      'installation_id', p_installation_id
    ),
    now(), now(), false, '', '', '', '', false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', lower(p_email), 'email_verified', true),
    'email',
    lower(p_email),
    now(), now(), now()
  );

  return new_id;
end;
$$;

revoke all on function public.ensure_device_user(text, text, text, text) from public;
grant execute on function public.ensure_device_user(text, text, text, text) to anon, authenticated;
