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
  select auth_user_id into v_user from players where team_id = v_team and role = 'OBSERVER';
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
  reset role;
  raise notice 'game flow test passed';
end $$;
