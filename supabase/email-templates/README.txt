Penny Pantry — Supabase Auth Email Templates
=============================================

These HTML templates replace Supabase's default auth emails (including the
"powered by Supabase" footer). Paste them manually in the Supabase Dashboard.

Source of truth for design tokens and subject lines:
  src/services/auth/emailBranding.ts

Template map (file → Dashboard menu item)
-----------------------------------------
  confirm-signup.html    → Confirm signup
  invite-user.html       → Invite user
  magic-link.html        → Magic link
  change-email.html      → Change email address
  reset-password.html    → Reset password
  reauthentication.html  → Reauthentication

Recommended subject lines
-------------------------
  Confirm signup:     Confirm your Penny Pantry email
  Invite user:        You've been invited to Penny Pantry
  Magic link:         Your Penny Pantry sign-in link
  Change email:       Confirm your new Penny Pantry email
  Reset password:     Reset your Penny Pantry password
  Reauthentication:   {{ .Token }} is your Penny Pantry verification code
                      (keep {{ .Token }} in the subject — shows code in previews)

Which templates Penny Pantry actually uses
------------------------------------------
  REQUIRED (paste these now)
    • Confirm signup   — email/password sign-up (signUpWithEmail); required when
                         "Confirm email" is enabled in Auth settings
    • Reset password   — forgot-password flow (resetPasswordForEmail)

  OPTIONAL (paste when you enable the feature)
    • Magic link       — only if you add signInWithOtp / passwordless login
    • Invite user      — only if you invite users via Supabase Admin API or
                         Dashboard (not used in the app today)
    • Change email     — only if users can update their email address
    • Reauthentication — only if you call supabase.auth.reauthenticate() for
                         sensitive operations (not used in the app today)

  Not in this folder (security notification emails — separate Dashboard section):
    Password changed, Email address changed, etc. Enable under Authentication →
    Security notifications if you want those branded later.

How to apply any template
-------------------------
1. Supabase Dashboard → your project → Authentication → Email Templates
2. Select the template name from the list above
3. Set Subject to the recommended line (copy exactly, including {{ .Token }} for
   Reauthentication)
4. Replace the entire Message body with the contents of the matching .html file
   (copy everything; keep Go template variables exactly as written)
5. Click Save

Important notes
---------------
- Replace the FULL template body. Do not append to the default template —
  that is what leaves "powered by Supabase" in the email.
- Go template variables (do not edit):
    {{ .ConfirmationURL }} — auth action link (signup, invite, magic link,
                             change email, reset password)
    {{ .NewEmail }}        — new address (change email template only)
    {{ .Token }}           — 6-digit OTP (reauthentication template)
    {{ .SiteURL }}         — app Site URL (not used in these templates)
- Test after saving: trigger the flow from your app and check the inbox.

Custom SMTP (recommended)
-------------------------
For a branded From address (Penny Pantry <hello@pennypantry.xyz>) instead of
Supabase's default sender:

1. Supabase Dashboard → Project Settings → Authentication
2. Scroll to SMTP Settings → Enable custom SMTP
3. Use your Resend (or other) SMTP credentials
4. Set Sender email: hello@pennypantry.xyz
5. Set Sender name: Penny Pantry

Resend SMTP (typical values):
  Host: smtp.resend.com
  Port: 465 (SSL) or 587 (TLS)
  Username: resend
  Password: your Resend API key

Also verify your domain (pennypantry.xyz) in Resend so SPF/DKIM pass.

Site URL (redirect links)
-------------------------
Authentication → URL Configuration → Site URL should be:
  https://pennypantry.xyz

Add redirect URLs your app uses, e.g.:
  https://pennypantry.xyz/reset-password
  https://pennypantry.xyz/onboarding/reset-password
  https://pennypantry.xyz/onboarding/upgrade
