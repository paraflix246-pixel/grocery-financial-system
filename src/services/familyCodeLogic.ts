const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function generateFamilyCode(): string {
  let raw = '';
  for (let i = 0; i < 8; i++) {
    raw += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function normalizeFamilyCode(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.length !== 8) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function isFamilyCode(value: string): boolean {
  return CODE_PATTERN.test(value.trim().toUpperCase());
}

export type FamilyInviteParseResult =
  | { type: 'code'; code: string }
  | { type: 'snapshot'; raw: string };

export function parseFamilyInviteInput(input: string): FamilyInviteParseResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as { items?: unknown };
    if (parsed.items && Array.isArray(parsed.items)) {
      return { type: 'snapshot', raw: trimmed };
    }
  } catch {
    // not JSON — continue
  }

  const urlMatch = trimmed.match(/[?&]code=([A-Za-z0-9-]+)/i);
  if (urlMatch?.[1]) {
    const code = normalizeFamilyCode(urlMatch[1]);
    if (code) return { type: 'code', code };
  }

  const pathCodeMatch = trimmed.match(/\/join\?code=([A-Za-z0-9-]+)/i);
  if (pathCodeMatch?.[1]) {
    const code = normalizeFamilyCode(pathCodeMatch[1]);
    if (code) return { type: 'code', code };
  }

  if (isFamilyCode(trimmed)) {
    const code = normalizeFamilyCode(trimmed);
    if (code) return { type: 'code', code };
  }

  const compact = normalizeFamilyCode(trimmed);
  if (compact) return { type: 'code', code: compact };

  return null;
}

export function buildFamilyInvitePath(code: string): string {
  const normalized = normalizeFamilyCode(code) ?? code;
  return `/list/join?code=${encodeURIComponent(normalized)}`;
}
