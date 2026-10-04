-- A player gets the clue block of THEIR role, whatever role they ask for.
\set ON_ERROR_STOP on
do $$
declare
  v_team uuid; v_node uuid; v_user uuid := '00000000-0000-0000-0000-0000000000c1';
  v_observer jsonb; v_operator jsonb; got jsonb;
begin
  select id into v_node from puzzle_nodes where code = 'P01';
  select content -> 'observer', content -> 'operator' into v_observer, v_operator from puzzle_nodes where id = v_node;
  if v_observer = v_operator then raise exception 'fixture: P01 observer and operator blocks are identical'; end if;

  insert into auth.users(id, email) values (v_user, 'observer@test') on conflict do nothing;
  insert into teams(name, code) values ('ROLE TEST', nexus_random_team_code()) returning id into v_team;
  insert into players(team_id, role, display_name, auth_user_id, status) values (v_team, 'OBSERVER', 'Obs', v_user, 'ACTIVE');
  insert into node_progress(team_id, node_id, status) values (v_team, v_node, 'AVAILABLE')
    on conflict (team_id, node_id) do update set status = 'AVAILABLE';

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  set local role authenticated;
  got := get_player_node_detail(v_node, 'OPERATOR');   -- an Observer asking for the Operator's block
  reset role;

  if got -> 'roleContent' is null then raise exception 'no roleContent returned: %', got; end if;
  if got -> 'operatorInvestigation' is not null and got ->> 'operatorInvestigation' <> 'null' then
    raise exception 'an Observer received the operator investigation chain';
  end if;
  if (got -> 'roleContent') = nexus_redact_jsonb(v_operator, (select answer_metadata->>'acceptedAnswer' from puzzle_nodes where id = v_node))
     and nexus_redact_jsonb(v_operator, (select answer_metadata->>'acceptedAnswer' from puzzle_nodes where id = v_node)) <> nexus_redact_jsonb(v_observer, (select answer_metadata->>'acceptedAnswer' from puzzle_nodes where id = v_node)) then
    raise exception 'an Observer received the Operator role block';
  end if;
  raise notice 'role content test passed';
end $$;
