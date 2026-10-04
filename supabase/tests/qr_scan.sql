-- Scanning: typed marker ids and manual codes resolve; the qr_nodes policy no
-- longer recurses; a player still cannot list markers they have not scanned.
\set ON_ERROR_STOP on
do $$
declare
  v_user uuid := '00000000-0000-0000-0000-0000000000e9'; v_team uuid; n int;
  v_marker text; v_manual text; v_code text; got text;
begin
  select code, marker_id, manual_code into v_code, v_marker, v_manual from qr_nodes where marker_id is not null and manual_code is not null order by code limit 1;
  insert into auth.users(id,email) values (v_user,'qr@test');
  insert into teams(name, code) values ('QR TEST', nexus_random_team_code()) returning id into v_team;
  insert into players(team_id, role, display_name, auth_user_id, status) values (v_team, 'OBSERVER', 'Qr', v_user, 'ACTIVE');

  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  set local role authenticated;

  -- reading the table as a player used to raise "infinite recursion detected in policy"
  select count(*) into n from qr_nodes;
  if n <> 0 then raise exception 'a player who has scanned nothing can see % markers', n; end if;

  got := resolve_qr_code(v_marker);        if got is distinct from v_code then raise exception 'marker id did not resolve: % -> %', v_marker, got; end if;
  got := resolve_qr_code(lower(v_manual)); if got is distinct from v_code then raise exception 'manual code did not resolve: % -> %', v_manual, got; end if;
  got := resolve_qr_code(v_code);          if got is distinct from v_code then raise exception 'node code did not resolve'; end if;
  got := resolve_qr_code('x,code.neq.nothing'); if got is not null then raise exception 'a filter-shaped string resolved: %', got; end if;
  got := resolve_qr_code('');              if got is not null then raise exception 'empty input resolved'; end if;
  reset role;

  -- signed out: nothing resolves
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claim.role','anon',true);
  begin
    set local role anon;
    perform resolve_qr_code(v_marker);
    raise exception 'anon could call resolve_qr_code';
  exception when insufficient_privilege then reset role;
  end;
  raise notice 'qr scan test passed';
end $$;
