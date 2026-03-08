-- ============================================================================
-- Row Level Security Policies for LRC Boat Booking
-- Run this script in the Supabase SQL Editor.
-- Idempotent: safe to re-run (drops policies before creating).
-- Note: Prisma's service role bypasses RLS; these policies protect direct
--       Supabase REST/realtime access.
-- ============================================================================

-- Helper: check if the current auth user has an admin-level role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND role IN ('admin', 'captain', 'vice_captain')
  );
$$;

-- ============================================================================
-- BOOKINGS
-- ============================================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_authenticated" ON public.bookings;
CREATE POLICY "bookings_select_authenticated" ON public.bookings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own" ON public.bookings
  FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin_user());

DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_own_or_admin" ON public.bookings
  FOR UPDATE USING (user_id = auth.uid()::text OR public.is_admin_user());

DROP POLICY IF EXISTS "bookings_delete_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_delete_own_or_admin" ON public.bookings
  FOR DELETE USING (user_id = auth.uid()::text OR public.is_admin_user());

-- ============================================================================
-- USERS
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "users_update_own_or_admin" ON public.users;
CREATE POLICY "users_update_own_or_admin" ON public.users
  FOR UPDATE USING (id = auth.uid()::text OR public.is_admin_user());

DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (public.is_admin_user() OR id = auth.uid()::text);

DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (public.is_admin_user());

-- ============================================================================
-- BOATS
-- ============================================================================
ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boats_select_authenticated" ON public.boats;
CREATE POLICY "boats_select_authenticated" ON public.boats
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "boats_mutate_admin" ON public.boats;
CREATE POLICY "boats_mutate_admin" ON public.boats
  FOR ALL USING (public.is_admin_user());

-- ============================================================================
-- EQUIPMENT
-- ============================================================================
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_select_authenticated" ON public.equipment;
CREATE POLICY "equipment_select_authenticated" ON public.equipment
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "equipment_mutate_admin" ON public.equipment;
CREATE POLICY "equipment_mutate_admin" ON public.equipment
  FOR ALL USING (public.is_admin_user());

-- ============================================================================
-- OAR SETS
-- ============================================================================
ALTER TABLE public.oar_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oar_sets_select_authenticated" ON public.oar_sets;
CREATE POLICY "oar_sets_select_authenticated" ON public.oar_sets
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "oar_sets_mutate_admin" ON public.oar_sets;
CREATE POLICY "oar_sets_mutate_admin" ON public.oar_sets
  FOR ALL USING (public.is_admin_user());

-- ============================================================================
-- BOOKING WEEKS
-- ============================================================================
ALTER TABLE public.booking_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_weeks_select_authenticated" ON public.booking_weeks;
CREATE POLICY "booking_weeks_select_authenticated" ON public.booking_weeks
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "booking_weeks_mutate_admin" ON public.booking_weeks;
CREATE POLICY "booking_weeks_mutate_admin" ON public.booking_weeks
  FOR ALL USING (public.is_admin_user());

-- ============================================================================
-- INVITATIONS
-- ============================================================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select_authenticated" ON public.invitations;
CREATE POLICY "invitations_select_authenticated" ON public.invitations
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "invitations_mutate_admin" ON public.invitations;
CREATE POLICY "invitations_mutate_admin" ON public.invitations
  FOR ALL USING (public.is_admin_user());

-- ============================================================================
-- BLACK BOAT APPLICATIONS
-- ============================================================================
ALTER TABLE public.black_boat_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select_authenticated" ON public.black_boat_applications;
CREATE POLICY "applications_select_authenticated" ON public.black_boat_applications
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "applications_insert_own" ON public.black_boat_applications;
CREATE POLICY "applications_insert_own" ON public.black_boat_applications
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "applications_update_admin" ON public.black_boat_applications;
CREATE POLICY "applications_update_admin" ON public.black_boat_applications
  FOR UPDATE USING (public.is_admin_user());

DROP POLICY IF EXISTS "applications_delete_admin" ON public.black_boat_applications;
CREATE POLICY "applications_delete_admin" ON public.black_boat_applications
  FOR DELETE USING (public.is_admin_user());

-- ============================================================================
-- SQUADS
-- ============================================================================
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "squads_select_authenticated" ON public.squads;
CREATE POLICY "squads_select_authenticated" ON public.squads
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "squads_mutate_admin" ON public.squads;
CREATE POLICY "squads_mutate_admin" ON public.squads
  FOR ALL USING (public.is_admin_user());

-- ============================================================================
-- USER SQUADS
-- ============================================================================
ALTER TABLE public.user_squads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_squads_select_authenticated" ON public.user_squads;
CREATE POLICY "user_squads_select_authenticated" ON public.user_squads
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "user_squads_mutate_admin" ON public.user_squads;
CREATE POLICY "user_squads_mutate_admin" ON public.user_squads
  FOR ALL USING (public.is_admin_user());

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (public.is_admin_user());

DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin_user());

-- ============================================================================
-- TIME SLOTS (reference data — read-only for all, admin mutations)
-- ============================================================================
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_slots_select_authenticated" ON public.time_slots;
CREATE POLICY "time_slots_select_authenticated" ON public.time_slots
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "time_slots_mutate_admin" ON public.time_slots;
CREATE POLICY "time_slots_mutate_admin" ON public.time_slots
  FOR ALL USING (public.is_admin_user());
