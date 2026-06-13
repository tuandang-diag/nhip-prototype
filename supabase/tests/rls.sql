begin;
select plan(10);

select has_table('public', 'groups', 'groups exists');
select has_table('public', 'member_invites', 'member_invites exists');
select has_table('public', 'api_usage_log', 'api_usage_log exists');
select row_security_active('public', 'groups', 'groups RLS active');
select row_security_active('public', 'members', 'members RLS active');
select row_security_active('public', 'announcements', 'announcements RLS active');
select row_security_active('public', 'member_actions', 'member_actions RLS active');
select row_security_active('public', 'member_invites', 'invite RLS active');
select has_function(
  'public',
  'create_group',
  array['text', 'text'],
  'authenticated group creation RPC exists'
);
select function_privs_are(
  'public',
  'create_group',
  array['text', 'text'],
  'authenticated',
  array['EXECUTE'],
  'authenticated users can execute group creation RPC'
);

select * from finish();
rollback;
