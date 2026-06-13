begin;
select plan(8);

select has_table('public', 'groups', 'groups exists');
select has_table('public', 'member_invites', 'member_invites exists');
select has_table('public', 'api_usage_log', 'api_usage_log exists');
select row_security_active('public', 'groups', 'groups RLS active');
select row_security_active('public', 'members', 'members RLS active');
select row_security_active('public', 'announcements', 'announcements RLS active');
select row_security_active('public', 'member_actions', 'member_actions RLS active');
select row_security_active('public', 'member_invites', 'invite RLS active');

select * from finish();
rollback;
