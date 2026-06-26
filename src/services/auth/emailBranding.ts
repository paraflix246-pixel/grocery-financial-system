/** Recommended Supabase Dashboard subject lines (paste into Authentication → Email Templates). */
export const SUPABASE_EMAIL_SUBJECTS = {
  confirmSignup: 'Confirm your Penny Pantry email',
  inviteUser: "You've been invited to Penny Pantry",
  magicLink: 'Your Penny Pantry sign-in link',
  changeEmail: 'Confirm your new Penny Pantry email',
  resetPassword: 'Reset your Penny Pantry password',
  /** Include {{ .Token }} so the code appears in mobile notification previews. */
  reauthentication: '{{ .Token }} is your Penny Pantry verification code',
} as const;

/** Shared Penny Pantry email design tokens (matches onboardingTheme / SmartCartColors). */
export const EMAIL_BRAND = {
  green: '#22C55E',
  greenDark: '#16A34A',
  pageBackground: '#F9FAFB',
  cardBackground: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  logoPath: '/assets/images/penny-pantry-logo.png',
  defaultAppUrl: 'https://pennypantry.xyz',
  supportEmail: 'hello@pennypantry.xyz',
} as const;

export function getEmailLogoUrl(appUrl: string): string {
  return `${appUrl.replace(/\/$/, '')}${EMAIL_BRAND.logoPath}`;
}

export function buildEmailDocument(title: string, bodyContent: string): string {
  const { pageBackground, fontFamily } = EMAIL_BRAND;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-card { width: 100% !important; }
      .email-body { padding: 24px 20px !important; }
      .email-header { padding: 24px 20px 16px !important; }
      .email-logo { width: 56px !important; height: 56px !important; }
      .email-title { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${pageBackground};font-family:${fontFamily};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${pageBackground};padding:32px 16px;">
    <tr>
      <td align="center">
        ${bodyContent}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailCard(content: string): string {
  const { cardBackground, border } = EMAIL_BRAND;
  return `<table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${cardBackground};border-radius:16px;border:1px solid ${border};overflow:hidden;">
${content}
</table>`;
}

export function buildEmailHeader(logoUrl: string): string {
  const { text, fontFamily } = EMAIL_BRAND;
  return `          <tr>
            <td class="email-header" style="padding:32px 32px 20px;text-align:center;">
              <img class="email-logo" src="${logoUrl}" width="64" height="64" alt="Penny Pantry" style="display:block;margin:0 auto 12px;border:0;border-radius:12px;width:64px;height:64px;">
              <p style="margin:0;color:${text};font-family:${fontFamily};font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">Penny Pantry</p>
            </td>
          </tr>`;
}

export function buildEmailCta(href: string, label: string): string {
  const { green, fontFamily } = EMAIL_BRAND;
  return `<p style="margin:0 0 28px;text-align:center;">
                <a href="${href}" style="display:inline-block;background:${green};color:#FFFFFF;text-decoration:none;font-family:${fontFamily};font-size:16px;font-weight:700;padding:14px 32px;border-radius:999px;line-height:1.2;mso-padding-alt:0;text-align:center;">
                  <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
                  <span style="mso-text-raise:15pt;">${label}</span>
                  <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%">&nbsp;</i><![endif]-->
                </a>
              </p>`;
}

export function buildEmailInnerFooter(appUrl: string): string {
  const { border, textMuted, greenDark, fontFamily } = EMAIL_BRAND;
  const siteHost = appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `<p style="margin:0;color:${textMuted};font-family:${fontFamily};font-size:13px;line-height:1.6;text-align:center;border-top:1px solid ${border};padding-top:24px;">
                Happy saving,<br>The Penny Pantry team<br>
                <a href="${appUrl}" style="color:${greenDark};text-decoration:none;">${siteHost}</a>
              </p>`;
}

export function buildEmailSupportFooter(): string {
  const { textMuted, greenDark, fontFamily, supportEmail } = EMAIL_BRAND;
  return `<p style="margin:16px 0 0;color:${textMuted};font-family:${fontFamily};font-size:12px;line-height:1.5;text-align:center;max-width:520px;">
          Need help? Reply to this email or contact us at
          <a href="mailto:${supportEmail}" style="color:${greenDark};text-decoration:none;">${supportEmail}</a>
        </p>`;
}

export function buildFallbackLink(href: string): string {
  const { textMuted, greenDark, fontFamily } = EMAIL_BRAND;
  return `<p style="margin:0 0 24px;color:${textMuted};font-family:${fontFamily};font-size:12px;line-height:1.5;word-break:break-all;">
                Button not working? Copy and paste this link into your browser:<br>
                <a href="${href}" style="color:${greenDark};text-decoration:underline;">${href}</a>
              </p>`;
}
