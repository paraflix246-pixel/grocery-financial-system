const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidInviteEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function buildHouseholdInviteMailto(params: {
  email: string;
  subject: string;
  code: string;
  inviteUrl: string;
  bodyTemplate: string;
}): string {
  const body = params.bodyTemplate
    .replace('{{code}}', params.code)
    .replace('{{url}}', params.inviteUrl);
  const query = new URLSearchParams({
    subject: params.subject,
    body,
  });
  return `mailto:${encodeURIComponent(params.email.trim())}?${query.toString()}`;
}
