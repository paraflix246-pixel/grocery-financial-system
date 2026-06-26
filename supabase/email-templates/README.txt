Penny Pantry — Supabase Auth Email Templates
=============================================

These HTML templates replace Supabase's default auth emails (including the
"powered by Supabase" footer). Paste them manually in the Supabase Dashboard.

Files
-----
  reset-password.html   — Password reset flow
  confirm-signup.html   — Email confirmation after sign-up (optional)

Suggested subject lines
-----------------------
  Reset Password:  Reset your Penny Pantry password
  Confirm signup:  Confirm your Penny Pantry email

How to apply (Reset Password)
-----------------------------
1. Open Supabase Dashboard → your project → Authentication → Email Templates
2. Select "Reset Password"
3. Set Subject to: Reset your Penny Pantry password
4. Replace the entire Message body with the contents of reset-password.html
   (copy everything; keep {{ .ConfirmationURL }} exactly as written)
5. Click Save

How to apply (Confirm signup — optional)
----------------------------------------
1. Authentication → Email Templates → "Confirm signup"
2. Set Subject to: Confirm your Penny Pantry email
3. Replace the entire Message body with the contents of confirm-signup.html
4. Click Save

Important notes
---------------
- Replace the FULL template body. Do not append to the default template —
  that is what leaves "powered by Supabase" in the email.
- {{ .ConfirmationURL }} is a Supabase Go template variable. Do not edit it.
- Test after saving: trigger a password reset from your app and check the inbox.

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

Add redirect URLs your app uses for password reset, e.g.:
  https://pennypantry.xyz/reset-password
  https://pennypantry.xyz/onboarding/reset-password
