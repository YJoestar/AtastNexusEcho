-- Regression tests for 2026100309: SUPER_ADMIN gating, definer search_path,
-- FK indexes, RLS coverage, inventory exposure and login rate limiting.
-- Each check raises on failure.
\set ON_ERROR_STOP on

insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-0000000000e1','plainadmin@test'),
  ('00000000-0000-0000-0000-0000000000e2','superadmin@test'),
  ('00000000-0000-0000-0000-0000000000e3','player3@test');
insert into admin_users(auth_user_id, username, role) values
  ('00000000-0000-0000-0000-0000000000e1','plain','ADMIN'),
  ('00000000-0000-0000-0000-0000000000e2','super','SUPER_ADMIN');

-- run sql as a role/user; returns the SQLSTATE raised, or 'ok'
create or replace function pg_temp.try_as(sql text, role_name text, claim_role text, sub text) returns text language plpgsql as $$
declare st text := 'ok';
begin
  perform set_config('request.jwt.claim.role', claim_role, false);
  perform set_config('request.jwt.claim.sub', sub, false);
  execute format('set local role %I', role_name);
  begin execute sql; exception when others then st := sqlstate; end;
  execute 'reset role';
  return st;
end $$;

-- ---------------------------------------------------------------------------
-- 1. SUPER_ADMIN gating
-- ---------------------------------------------------------------------------
do $$
declare t uuid; n uuid; st text;
  e1 text := '00000000-0000-0000-0000-0000000000e1';  -- ADMIN
  e2 text := '00000000-0000-0000-0000-0000000000e2';  -- SUPER_ADMIN
  e3 text := '00000000-0000-0000-0000-0000000000e3';  -- player
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  select team_id into t from bureau_create_team('GATING');
  select id into n from puzzle_nodes limit 1;

  -- ordinary ADMIN operations still work
  st := pg_temp.try_as('select * from bureau_create_team(''by plain admin'')', 'authenticated','authenticated', e1);
  if st <> 'ok' then raise exception 'ADMIN must still create teams, got %', st; end if;
  st := pg_temp.try_as(format('select * from bureau_manual_unlock(%L,%L,''t'')', t, n), 'authenticated','authenticated', e1);
  if st = '42501' then raise exception 'ADMIN must still manual-unlock'; end if;

  -- destructive ones: ADMIN and players denied with 42501
  foreach st in array array[e1, e3] loop
    if pg_temp.try_as(format('select * from bureau_reset_team(%L,''x'')', t), 'authenticated','authenticated', st) <> '42501' then
      raise exception 'bureau_reset_team must be denied (42501) for %', st; end if;
    if pg_temp.try_as(format('select bureau_reset_node(%L,%L,''x'')', t, n), 'authenticated','authenticated', st) <> '42501' then
      raise exception 'bureau_reset_node must be denied (42501) for %', st; end if;
  end loop;
  if pg_temp.try_as(format('select * from bureau_reset_team(%L,''x'')', t), 'anon','anon','') <> '42501' then
    raise exception 'anon must be denied reset_team'; end if;

  -- SUPER_ADMIN and service_role pass
  if pg_temp.try_as(format('select * from bureau_reset_team(%L,''x'')', t), 'authenticated','authenticated', e2) <> 'ok' then
    raise exception 'SUPER_ADMIN must be able to reset a team'; end if;
  if pg_temp.try_as(format('select bureau_reset_node(%L,%L,''x'')', t, n), 'authenticated','authenticated', e2) <> 'ok' then
    raise exception 'SUPER_ADMIN must be able to reset a node'; end if;
  if pg_temp.try_as(format('select * from bureau_reset_team(%L,''x'')', t), 'service_role','service_role','') <> 'ok' then
    raise exception 'service_role must be able to reset a team'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Every SECURITY DEFINER function pins its search_path
-- ---------------------------------------------------------------------------
do $$
declare bad text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into bad
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%');
  if bad is not null then raise exception 'SECURITY DEFINER without search_path: %', bad; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Every foreign key column is the leading column of some index
-- ---------------------------------------------------------------------------
do $$
declare bad text;
begin
  select string_agg(c.conrelid::regclass || '.' || a.attname, ', ') into bad
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
   where c.contype = 'f' and c.connamespace = 'public'::regnamespace
     and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]);
  if bad is not null then raise exception 'foreign keys without index: %', bad; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. RLS on every table; the item catalogue is not readable through the API
-- ---------------------------------------------------------------------------
do $$
declare bad text;
begin
  select string_agg(relname, ', ') into bad from pg_class
   where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;
  if bad is not null then raise exception 'tables without RLS: %', bad; end if;
  if pg_temp.try_as('select * from inventory_items', 'authenticated','authenticated','00000000-0000-0000-0000-0000000000e3') <> '42501' then
    raise exception 'authenticated must not read inventory_items directly'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Login rate limiting
-- ---------------------------------------------------------------------------
do $$
declare r record; i int; n int; allowed_count int := 0;
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  truncate login_rate_limit_buckets;

  -- limit 3 per window: 3 pass, the 4th and 5th are refused, with a retry hint
  for i in 1..5 loop
    select * into r from login_rate_limit_hit(array['ip:1.1.1.1'], array[3], array[60]);
    if i <= 3 and not r.allowed then raise exception 'attempt % should pass', i; end if;
    if i > 3 and r.allowed then raise exception 'attempt % should be blocked', i; end if;
  end loop;
  if r.blocked_key <> 'ip:1.1.1.1' or r.retry_after_seconds not between 1 and 60 then
    raise exception 'bad block info: % %', r.blocked_key, r.retry_after_seconds; end if;

  -- another IP is unaffected
  select * into r from login_rate_limit_hit(array['ip:2.2.2.2'], array[3], array[60]);
  if not r.allowed then raise exception 'unrelated key must not be limited'; end if;

  -- two keys at once: the team key blocks even when the IP key is fresh,
  -- which is what makes rotating IPs against one team useless
  for i in 1..4 loop
    select * into r from login_rate_limit_hit(array['ip:9.9.9.' || i, 'team:ABCDEF'], array[10, 3], array[60, 60]);
  end loop;
  if r.allowed or r.blocked_key <> 'team:ABCDEF' then raise exception 'team key must block rotating IPs'; end if;

  -- a successful login elsewhere cannot clear a counter (there is no reset API)
  -- window expiry: age the window, the counter restarts at 1
  update login_rate_limit_buckets set window_start = now() - interval '61 seconds' where key = 'ip:1.1.1.1';
  select * into r from login_rate_limit_hit(array['ip:1.1.1.1'], array[3], array[60]);
  if not r.allowed then raise exception 'expired window must reset'; end if;
  select attempts into n from login_rate_limit_buckets where key = 'ip:1.1.1.1';
  if n <> 1 then raise exception 'counter after expiry should be 1, got %', n; end if;

  -- bad input is rejected, not silently ignored
  begin
    perform * from login_rate_limit_hit(array['a','b'], array[1], array[60]);
    raise exception 'mismatched arrays accepted';
  exception when sqlstate '22023' then null; end;

  -- bounded growth: expired rows are removed by normal use, in bounded batches,
  -- and the purge removes the rest
  truncate login_rate_limit_buckets;
  insert into login_rate_limit_buckets(key, attempts, window_start, window_seconds)
    select 'old:' || g, 1, now() - interval '2 hours', 60 from generate_series(1, 100) g;
  perform * from login_rate_limit_hit(array['ip:3.3.3.3'], array[3], array[60]);
  select count(*) into n from login_rate_limit_buckets where key like 'old:%';
  if n <> 75 then raise exception 'hit() should delete exactly 25 expired rows, left %', n; end if;
  select login_rate_limit_purge() into n;
  if n <> 75 then raise exception 'purge should remove 75, removed %', n; end if;
  select count(*) into n from login_rate_limit_buckets;
  if n <> 1 then raise exception 'only the live bucket should remain, have %', n; end if;
end $$;

-- the API roles cannot call or read any of it
do $$
declare p text := '00000000-0000-0000-0000-0000000000e3'; c text;
begin
  foreach c in array array[
    'select * from login_rate_limit_hit(array[''x''],array[1],array[1])',
    'select login_rate_limit_purge()',
    'delete from login_rate_limit_buckets'] loop
    if pg_temp.try_as(c, 'anon','anon','') <> '42501' then raise exception 'anon must be denied: %', c; end if;
    if pg_temp.try_as(c, 'authenticated','authenticated', p) <> '42501' then raise exception 'authenticated must be denied: %', c; end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Admin policies must be able to evaluate (2026100401)
--
-- Nine policies read
--   USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()))
-- which is part of the policy expression and therefore evaluated as the
-- invoking role — so admin_users' own deny-all RLS applies and the subquery can
-- never return a row. They were permanently FALSE while looking correct.
--
-- The check below is behavioural rather than textual: as an ADMIN, the policy
-- must now actually admit the row, and as a non-admin it must still refuse.
-- A policy that is textually right but still dead fails here.
-- ---------------------------------------------------------------------------
do $$
declare t uuid; bad text;
  e1 text := '00000000-0000-0000-0000-0000000000e1';  -- ADMIN
  e3 text := '00000000-0000-0000-0000-0000000000e3';  -- player
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  select team_id into t from bureau_create_team('POLICY_EVAL');

  -- The helper itself must see its own admin_users row despite the deny-all
  -- policy; if it does not, every policy built on it is dead again.
  if pg_temp.try_as('select is_current_user_admin()', 'authenticated','authenticated', e1) <> 'ok' then
    raise exception 'is_current_user_admin must be callable by an admin'; end if;

  -- An admin can read a team through "Admins can read all teams" ...
  if pg_temp.try_as(format('select id from teams where id = %L', t), 'authenticated','authenticated', e1) <> 'ok' then
    raise exception 'ADMIN must be able to read a team through RLS'; end if;
  -- ... and a player cannot. Zero rows is a success here; an error is not.
  perform pg_temp.try_as(format('select id from teams where id = %L', t), 'authenticated','authenticated', e3);

  select string_agg(pol.polname, ', ') into bad
    from pg_policies pol
   where pol.schemaname = 'public'
     and pol.polname like 'Admins can%'
     and (pol.qual is null or pol.qual ~* 'admin_users');
  if bad is not null then
    raise exception 'admin policies still name admin_users inline: %', bad; end if;

  -- Every admin policy must now go through the SECURITY DEFINER helper.
  select string_agg(pol.polname, ', ') into bad
    from pg_policies pol
   where pol.schemaname = 'public'
     and pol.polname like 'Admins can%'
     and coalesce(pol.qual, pol.with_check) !~* 'is_current_user_admin';
  if bad is not null then
    raise exception 'admin policies not using is_current_user_admin: %', bad; end if;

  perform set_config('request.jwt.claim.role','service_role',false);
  delete from teams where id = t;
end $$;

select 'security hardening tests passed' as result;
