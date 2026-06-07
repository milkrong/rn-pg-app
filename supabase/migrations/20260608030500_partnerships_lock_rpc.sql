-- Restrict accept_partner_invite to signed-in callers only. The function already
-- raises when auth.uid() is null, but tightening EXECUTE shrinks the public API.

revoke execute on function public.accept_partner_invite(text) from public;
revoke execute on function public.accept_partner_invite(text) from anon;
grant execute on function public.accept_partner_invite(text) to authenticated;
