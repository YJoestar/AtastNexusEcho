-- The core loop on the migrated schema: a started team solves a node, scores
-- once, unlocks the next, and the state the app reads agrees with the progress.
\set ON_ERROR_STOP on
do $$
declare
  v_team uuid; v_user uuid; p record; i int := 0; v_node uuid; v_next uuid; ans text;
  wrong jsonb; good jsonb; again jsonb; st jsonb; codes jsonb;
begin
  perform set_config('request.jwt.claim.role','service_role',true);
  select * into p from bureau_provision_team('FLOW TEST','[{"name":"O","role":"OBSERVER"},{"name":"A","role":"ANALYST"},{"name":"P","role":"OPERATOR"}]'::jsonb,'flow-test');
  v_team := p.team_id;
  for p in select id from players where team_id = v_team loop
    i := i + 1; v_user := ('00000000-0000-0000-0000-00000000f0'||lpad(i::text,2,'0'))::uuid;
    insert into auth.users(id,email) values (v_user,'flow'||i||'@test');
    update players set auth_user_id=v_user, device_session_token=gen_random_uuid()::text, device_fingerprint_hash=md5(id::text) where id=p.id;
  end loop;
  perform * from bureau_reissue_login_codes(v_team, null);
  perform * from bureau_start_team(v_team, 'flow test');

  select id, answer_metadata->>'acceptedAnswer' into v_node, ans from puzzle_nodes where code = 'P01';
  -- Only the Operator submits the team's conclusion.
  select auth_user_id into v_user from players where team_id = v_team and role = 'OPERATOR';
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  set local role authenticated;

  st := get_team_game_state();
  if st #>> '{currentNode,code}' <> 'P01' then raise exception 'a started team should be on P01: %', st; end if;

  wrong := submit_puzzle_answer(v_node, 'not the answer');
  if (wrong ->> 'isCorrect')::boolean then raise exception 'a wrong answer was accepted'; end if;
  if (wrong ->> 'pointsAwarded')::int <> 0 then raise exception 'points for a wrong answer'; end if;

  good := submit_puzzle_answer(v_node, ans);
  if not (good ->> 'isCorrect')::boolean then raise exception 'the right answer was rejected: %', good; end if;
  if (good ->> 'pointsAwarded')::int <= 0 then raise exception 'no points for the right answer'; end if;

  again := submit_puzzle_answer(v_node, ans);
  if again ? 'pointsAwarded' and (again ->> 'pointsAwarded')::int <> 0 then raise exception 'a solved node paid out twice: %', again; end if;

  st := get_team_game_state();
  if (st #>> '{progress,solvedCount}')::int <> 1 then raise exception 'solvedCount should be 1: %', st; end if;
  if (st #>> '{team,score}')::int <> (good ->> 'pointsAwarded')::int then raise exception 'score drifted: %', st; end if;

  -- availableNodeIds must be what is actually open: not the solved node, and the one that unlocked.
  codes := st #> '{progress,availableNodeIds}';
  if codes ? 'P01' then raise exception 'solved P01 is still advertised as available: %', codes; end if;
  if jsonb_array_length(codes) < 1 then raise exception 'nothing unlocked after solving P01: %', st; end if;
  if not (codes ? (st #>> '{currentNode,code}')) then raise exception 'current node is not among the available nodes: %', st; end if;

  -- The Observer and the Analyst solve their parts mentally and speak
  -- them; their submission is refused before any attempt is claimed,
  -- so it costs nothing and records nothing.
  for p in select auth_user_id from players where team_id = v_team and role in ('OBSERVER', 'ANALYST') loop
    perform set_config('request.jwt.claim.sub', p.auth_user_id::text, true);
    again := submit_puzzle_answer(v_node, ans);
    if not (again ? 'error') then
      raise exception 'a non-operator submitted the team conclusion: %', again;
    end if;
  end loop;
  reset role;
  raise notice 'game flow test passed';
end $$;

-- A node can be named by its code or its id (the app sends the code).
do $$
declare v_user uuid := '00000000-0000-0000-0000-0000000000f9'; v_id uuid; r uuid;
begin
  select id into v_id from puzzle_nodes where code = 'P01';
  insert into auth.users(id,email) values (v_user,'resolve@test');
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  set local role authenticated;
  r := resolve_node_ref('P01');                if r is distinct from v_id then raise exception 'code did not resolve'; end if;
  r := resolve_node_ref('p01');                if r is distinct from v_id then raise exception 'lower-case code did not resolve'; end if;
  r := resolve_node_ref(v_id::text);           if r is distinct from v_id then raise exception 'uuid did not resolve'; end if;
  r := resolve_node_ref('00000000-0000-0000-0000-000000000000'); if r is not null then raise exception 'unknown uuid resolved'; end if;
  r := resolve_node_ref('P01; drop table teams'); if r is not null then raise exception 'junk resolved'; end if;
  reset role;
  raise notice 'resolve_node_ref test passed';
end $$;
