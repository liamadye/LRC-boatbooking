# LRC Boat Booking Portal — Changelog

## Version 1.2 (March 2026)

### Performance Improvements
- **Client-side date navigation**: Switching between days within the same week no longer triggers a full server round-trip. Only changing weeks fetches new data, making day-to-day navigation instant.
- **Optimised rendering**: Booking grid uses memoised lookups and client-side state for responsive interactions on both desktop and mobile.

### New Features
- **Filter bar**: A search/filter bar above the booking grid allows filtering boats by name, classification (Black/Green), and status (Available/Not in use).
- **Crew/squad booking for big boats**: When booking a four (4+/4x) or eight (8+), the booker name defaults to the user's assigned crew/squad with a dropdown to select from all crews. Users can switch to "Individual" mode for personal bookings. Crews are allowed multiple simultaneous bookings.
- **Admin: Invite Users**: New "Invite User" tab in the admin panel lets admins pre-create member profiles with email, name, member type, role, and crew assignments. Members complete registration on first Supabase login.
- **Admin: Manage Bookings**: New "Manage Bookings" tab allows admins to view all bookings for any date and cancel bookings on behalf of members.
- **Admin: Black Boat Permissions**: The Members tab includes a prominent "Grant Black" / "Revoke Black" toggle button for each member, enabling admins to directly manage black boat eligibility without requiring an application.

### Changes
- **Weight validation disabled**: The ±10% crew weight check has been turned off. Boat weights are still displayed for reference but no longer block bookings.
- **Section counts updated**: Section headers now show boat counts (e.g., "14 boats · 12 free") instead of raw totals, making it clear how many individual boats are in each category and how many are available for the selected day.

### Supabase Email Templates
- Added branded HTML email templates for: Confirm Signup, Invite User, Magic Link, Password Reset, and Email Change. Located in `docs/supabase-emails/`.

---

## Version 1.1 (February 2026)

### Initial Release
- Full booking grid with 9 time slots matching the LRC Boat Usage Policy spreadsheet
- Club boats grouped by type (Eights, Fours, Pairs/Doubles, Singles) with collapsible sections
- Private boats, tinnies (coach boats), oar sets, and equipment (ergs, bikes, gym)
- Booking modal with crew count, multi-slot selection, race-specific booking support
- Black boat classification system with application workflow
- Member type time restrictions (senior competitive, student, recreational)
- Consecutive day booking warnings with race-specific override
- Admin panel with boat management, member management, and application review
- Supabase authentication with email/password login
- Responsive design for desktop and mobile
- Totals bar showing "In Shed" and "Rowing" crew counts with capacity warnings
- My Bookings page for viewing and cancelling personal bookings
- User profile page for updating name, weight, and viewing squad membership
- Database seeded with all LRC club boats, private boats, tinnies, equipment, and squads from the 2026 booking spreadsheet
