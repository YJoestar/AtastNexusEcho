-- Privilege regression tests. Run by scripts/db/verify-migrations.sh after the
-- migrations; every check raises on failure. Roles are simulated the way
-- PostgREST does it: SET ROLE plus the request.jwt.claim.* settings.
\set ON_ERROR_STOP on

insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-0000000000a1','admin@test'),
  ('00000000-0000-0000-0000-0000000000b1','player@test');
insert into admin_users(auth_user_id, username, role) values ('00000000-0000-0000-0000-0000000000a1','boss','SUPER_ADMIN');

create or replace function pg_temp.must_fail(sql text, role_name text, claim_role text, sub text) returns void language plpgsql as $$
declare denied boolean := false;
begin
  perform set_config('request.jwt.claim.role', claim_role, false);
  perform set_config('request.jwt.claim.sub', sub, false);
  execute format('set local role %I', role_name);
  begin
    execute sql;
  exception when insufficient_privilege then denied := true;
  end;
  execute 'reset role';
  if not denied then raise exception 'EXPECTED DENIAL for %: %', role_name, sql; end if;
end $$;

create or replace function pg_temp.must_pass(sql text, role_name text, claim_role text, sub text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.role', claim_role, false);
  perform set_config('request.jwt.claim.sub', sub, false);
  execute format('set local role %I', role_name);
  execute sql;
  execute 'reset role';
end $$;

begin;
-- anon may not call privileged functions or touch the unprotected tables
select pg_temp.must_fail($$select * from bureau_create_team('x')$$, 'anon', 'anon', '');
select pg_temp.must_fail($$select * from bureau_reissue_login_codes('00000000-0000-0000-0000-000000000000', null)$$, 'anon', 'anon', '');
select pg_temp.must_fail($$select * from verify_player_login('x','y','{}'::jsonb)$$, 'anon', 'anon', '');
select pg_temp.must_fail($$select set_player_device_binding('00000000-0000-0000-0000-000000000000','h')$$, 'anon', 'anon', '');
select pg_temp.must_fail($$select count(*) from game_events$$, 'anon', 'anon', '');
select pg_temp.must_fail($$insert into login_rate_limit_buckets(key,window_seconds) values ('ip:9.9.9.9',60)$$, 'anon', 'anon', '');
select pg_temp.must_fail($$delete from locations$$, 'anon', 'anon', '');
-- a signed-in player is not an administrator
select pg_temp.must_fail($$select * from bureau_create_team('x')$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$select * from bureau_reset_team('00000000-0000-0000-0000-000000000000','x')$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$select * from bureau_manual_unlock('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','x')$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$select * from verify_player_login('x','y','{}'::jsonb)$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$select count(*) from login_rate_limit_buckets$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
-- the answers never leave the server through the table API
select pg_temp.must_fail($$select answer_metadata from puzzle_nodes$$, 'anon', 'anon', '');
select pg_temp.must_fail($$select code from puzzle_nodes$$, 'anon', 'anon', '');
select pg_temp.must_fail($$select answer_metadata from puzzle_nodes$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$select content from puzzle_nodes$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
-- no credential or device columns, no direct writes
select pg_temp.must_fail($$select login_code_hash from players$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$select device_session_token from players$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$select auth_user_email from players$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_pass($$select display_name, role from players$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$update teams set score = 99999$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$insert into submissions(team_id,node_id,player_id,role,submitted_answer,is_correct,attempt_number) values (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'OBSERVER','x',true,1)$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.must_fail($$delete from notifications$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
-- an administrator and the service role can
select pg_temp.must_pass($$select * from bureau_create_team('ADMIN TEAM')$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.must_pass($$select bureau_list_locations()$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.must_pass($$select * from bureau_create_team('SERVICE TEAM')$$, 'service_role', 'service_role', '');
select pg_temp.must_pass($$select count(*) from login_rate_limit_buckets$$, 'service_role', 'service_role', '');
select pg_temp.must_pass($$select answer_metadata from puzzle_nodes$$, 'service_role', 'service_role', '');
-- players keep the RPCs the game calls
select pg_temp.must_pass($$select * from get_leaderboard()$$, 'authenticated', 'authenticated', '00000000-0000-0000-0000-0000000000b1');
rollback;

-- bureau_create_team must emit its row (regression: 2026093021 dropped it)
do $$
declare r record;
begin
  perform set_config('request.jwt.claim.role','service_role',false);
  select * into r from bureau_create_team('ROW CHECK');
  if r.team_id is null or r.team_code is null then raise exception 'bureau_create_team returned no row'; end if;
end $$;

select 'privilege tests passed' as result;
