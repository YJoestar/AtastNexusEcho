-- A team may read a lead it has already closed, and still may not read a lead
-- it was never given.
--
-- 2026100302 gated get_player_node_detail on
--     status IN ('AVAILABLE','IN_PROGRESS')
-- while submit_puzzle_answer (2026100501) moves a row to 'SOLVED' and leaves it
-- there. So the instant a node was solved the team was refused its own record,
-- the site map still offered it as tappable, and the client rendered the denial
-- as a blank page.
--
-- 2026100504 adds 'SOLVED' to that predicate. This test pins both halves: the
-- solved node is served, and the node the team was never given is still denied,
-- so the fix cannot be mistaken for a widened surface.
\set ON_ERROR_STOP on
do $$
declare
  v_team uuid;
  v_open uuid;
  v_other uuid;
  v_user uuid := '00000000-0000-0000-0000-0000000000d4';
  v_answer text;
  got jsonb;
begin
  select id into v_open from puzzle_nodes where code = 'P01';
  select id into v_other from puzzle_nodes where code = 'P02';
  select answer_metadata->>'acceptedAnswer' into v_answer from puzzle_nodes where id = v_open;

  insert into auth.users(id, email) values (v_user, 'solved@test') on conflict do nothing;
  insert into teams(name, code) values ('SOLVED TEST', nexus_random_team_code()) returning id into v_team;
  insert into players(team_id, role, display_name, auth_user_id, status)
    values (v_team, 'OBSERVER', 'Obs', v_user, 'ACTIVE');

  -- A row in each of the three states a team may read.
  insert into node_progress(team_id, node_id, status) values (v_team, v_open, 'AVAILABLE')
    on conflict (team_id, node_id) do update set status = 'AVAILABLE';
  insert into node_progress(team_id, node_id, status) values (v_team, v_other, 'SOLVED')
    on conflict (team_id, node_id) do update set status = 'SOLVED';

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  set local role authenticated;

  got := get_player_node_detail(v_other, 'OBSERVER');   -- already solved
  if coalesce((got ->> 'unlocked')::boolean, false) is not true then
    raise exception 'a team cannot read a node it has already solved: %', got;
  end if;
  if got -> 'unlocked' is null or got -> 'code' is null then
    raise exception 'the solved node came back without its content: %', got;
  end if;

  -- The point of the whole thing: redaction still holds on the widened predicate.
  if v_answer is not null and got::text like ('%' || v_answer || '%') then
    raise exception 'serving a solved node leaked the accepted answer';
  end if;

  got := get_player_node_detail(v_open, 'OBSERVER');    -- in progress
  if coalesce((got ->> 'unlocked')::boolean, false) is not true then
    raise exception 'a team cannot read a node in progress: %', got;
  end if;

  -- Never granted: must stay denied, or the fix has become a leak.
  select id into v_other from puzzle_nodes where code = 'P03';
  delete from node_progress where team_id = v_team and node_id = v_other;
  got := get_player_node_detail(v_other, 'OBSERVER');
  if coalesce((got ->> 'unlocked')::boolean, true) then
    raise exception 'a node the team was never given is readable: %', got;
  end if;

  reset role;
  raise notice 'solved-node visibility test passed';
end $$;