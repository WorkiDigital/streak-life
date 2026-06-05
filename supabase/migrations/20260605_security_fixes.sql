-- ============================================================
-- Security fixes: RPC access control + query limits
-- ============================================================

-- 1. Restrict get_pending_schedules to service_role only
--    (only n8n with service key should call this)
REVOKE EXECUTE ON FUNCTION public.get_pending_schedules() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_schedules() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_schedules() TO service_role;
