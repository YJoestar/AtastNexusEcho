-- Every RPC the game calls, exercised end to end on the migrated schema:
-- provision -> start -> a player plays the first node -> admin tools.
-- A function that raises anything other than a deliberate refusal is a bug.
\set ON_ERROR_STOP on
do $$
declare
  failures text[] := '{}';
  v_team uuid; v_code text; v_player uuid; v_node uuid; v_user uuid := '00000000-0000-0000-0000-0000000000d1';
  v_team2 uuid;
  v_admin uuid := '00000000-0000-0000-0000-0000000000a1';
  r record; j jsonb; i int; ok int := 0; bad int := 0;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', '', true);

  -- Provisioning is the Bureau's main action. Team codes are random, so run it
  -- often enough that a bad generator would show.
  for i in 1..60 loop
    begin
      select * into r from bureau_provision_team('SMOKE ' || i,
        '[{"name":"Obs","role":"OBSERVER"},{"name":"Ana","role":"ANALYST"},{"name":"Opr","role":"OPERATOR"}]'::jsonb, 'smoke-' || i);
      if r.team_id is null then raise exception 'no row returned'; end if;
      ok := ok + 1; v_team := r.team_id; v_code := r.team_code;
    exception when others then
      bad := bad + 1;
      if bad = 1 then failures := failures || format('bureau_provision_team: %s', sqlerrm); end if;
    end;
  end loop;
  if bad > 0 then failures := failures || format('bureau_provision_team failed %s of 60 runs', bad); end if;

  -- a spare team for add_player (not yet staffed)
  select team_id into v_team2 from bureau_create_team('SMOKE SPARE');

  -- a player for the last team
  select id into v_player from players where team_id = v_team and role = 'OBSERVER';
  insert into auth.users(id, email) values (v_user, 'smoke-player@test') on conflict do nothing;
  update players set auth_user_id = v_user where id = v_player;
  select id into v_node from puzzle_nodes where code = 'P01';

  -- every player has logged in and bound a phone (the precondition for starting)
  insert into auth.users(id, email) select id, 'smoke-' || id || '@test' from players where team_id = v_team and id <> v_player on conflict do nothing;
  update players set auth_user_id = id where team_id = v_team and id <> v_player;
  update players set device_session_token = gen_random_uuid()::text, device_fingerprint_hash = md5(id::text), status = 'ACTIVE' where team_id = v_team;

  -- admin session
  insert into auth.users(id, email) values (v_admin, 'admin@smoke') on conflict do nothing;
  insert into admin_users(auth_user_id, username, role) values (v_admin, 'smokeboss', 'SUPER_ADMIN') on conflict do nothing;
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  set local role authenticated;
  begin perform * from bureau_reissue_login_codes(v_team, null); exception when others then failures := failures || format('bureau_reissue_login_codes: %s', sqlerrm); end;
  begin perform * from bureau_start_team(v_team, 'smoke'); exception when others then failures := failures || format('bureau_start_team: %s', sqlerrm); end;
  begin perform bureau_list_locations(); exception when others then failures := failures || format('bureau_list_locations: %s', sqlerrm); end;
  begin perform bureau_get_node_detail(v_node); exception when others then failures := failures || format('bureau_get_node_detail: %s', sqlerrm); end;
  begin perform bureau_get_location(v_node); exception when others then failures := failures || format('bureau_get_location: %s', sqlerrm); end;
  begin perform bureau_manual_unlock(v_team, v_node, 'smoke'); exception when others then failures := failures || format('bureau_manual_unlock: %s', sqlerrm); end;
  begin perform bureau_reset_node(v_team, v_node, 'smoke'); exception when others then failures := failures || format('bureau_reset_node: %s', sqlerrm); end;
  begin perform * from bureau_add_player(v_team2, 'Late', 'OBSERVER'); exception when others then failures := failures || format('bureau_add_player: %s', sqlerrm); end;
  begin perform * from bureau_generate_login_code(v_player); exception when others then failures := failures || format('bureau_generate_login_code: %s', sqlerrm); end;
  reset role;

  -- player session
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  set local role authenticated;
  begin perform get_team_game_state(); exception when others then failures := failures || format('get_team_game_state: %s', sqlerrm); end;
  begin perform get_team_node_progress(); exception when others then failures := failures || format('get_team_node_progress: %s', sqlerrm); end;
  begin perform * from get_team_notifications(false); exception when others then failures := failures || format('get_team_notifications: %s', sqlerrm); end;
  begin perform get_team_inventory(); exception when others then failures := failures || format('get_team_inventory: %s', sqlerrm); end;
  begin perform get_leaderboard(); exception when others then failures := failures || format('get_leaderboard: %s', sqlerrm); end;
  begin perform get_available_nodes(); exception when others then failures := failures || format('get_available_nodes: %s', sqlerrm); end;
  begin j := get_player_node_detail(v_node, 'OBSERVER'); exception when others then failures := failures || format('get_player_node_detail: %s', sqlerrm); end;
  begin perform scan_qr_code('QR-NODE-02'); exception when others then failures := failures || format('scan_qr_code: %s', sqlerrm); end;
  begin perform request_hint(v_node, 1); exception when others then failures := failures || format('request_hint: %s', sqlerrm); end;
  begin perform submit_puzzle_answer(v_node, 'definitely wrong'); exception when others then failures := failures || format('submit_puzzle_answer: %s', sqlerrm); end;
  begin perform mark_notifications_read(); exception when others then failures := failures || format('mark_notifications_read: %s', sqlerrm); end;
  reset role;

  -- admin: reset the whole team (last, it wipes the progress above)
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  set local role authenticated;
  begin perform * from bureau_reset_team(v_team, 'smoke'); exception when others then failures := failures || format('bureau_reset_team: %s', sqlerrm); end;
  reset role;

  if array_length(failures, 1) > 0 then
    raise exception E'RPC smoke failures:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'rpc smoke passed (% provisions)', ok;
end $$;
