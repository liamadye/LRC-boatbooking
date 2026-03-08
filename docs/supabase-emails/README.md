# Supabase Email Templates

Branded HTML email templates for the LRC Boat Booking portal.

## Templates

| File | Supabase Setting | Description |
|------|-----------------|-------------|
| `confirm-signup.html` | Auth > Email Templates > Confirm signup | Sent when a new user signs up |
| `invite-user.html` | Auth > Email Templates > Invite user | Sent when an admin invites a member |
| `magic-link.html` | Auth > Email Templates > Magic Link | Sent for passwordless login |
| `reset-password.html` | Auth > Email Templates > Reset Password | Sent for password reset requests |
| `change-email.html` | Auth > Email Templates > Change Email Address | Sent to confirm email changes |

## How to Install

1. Go to your Supabase dashboard
2. Navigate to **Authentication** > **Email Templates**
3. For each template type, paste the HTML content from the corresponding file
4. The templates use `{{ .ConfirmationURL }}` — this is automatically replaced by Supabase

## Customisation

All templates use the LRC blue (#2563eb) branding. To change colours or text, edit the inline styles in each HTML file.
