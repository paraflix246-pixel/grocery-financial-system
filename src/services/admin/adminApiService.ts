import { Platform } from 'react-native';

import { getSession } from '@/src/services/authService';

function resolveApiUrl(path: string): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim();
  return appUrl ? `${appUrl.replace(/\/$/, '')}${path}` : null;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = resolveApiUrl(path);
  if (!apiUrl) {
    throw new Error('Admin API is only available when the app server is configured.');
  }

  const session = await getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Sign in required.');
  }

  const response = await fetch(apiUrl, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? payload.error
        : `Request failed (${response.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return payload as T;
}

export type AdminStats = {
  totalUsers: number;
  signupsToday: number;
  proCount: number;
  bannedCount: number;
};

export type AdminProfile = {
  id: string;
  email: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  signup_provider: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  signup_source: string | null;
};

export type AdminUserListResponse = {
  users: AdminProfile[];
  total: number;
  page: number;
  limit: number;
};

export type AdminUserDetailResponse = {
  profile: AdminProfile;
  lastSignIn: string | null;
  providers: unknown;
  userMetadata: Record<string, unknown>;
  auditEvents: Array<{
    id: string;
    actor_id: string | null;
    target_user_id: string | null;
    event_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  return adminFetch<AdminStats>('/api/admin/stats');
}

export async function fetchAdminUsers(input: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (input.search?.trim()) params.set('search', input.search.trim());
  if (input.page) params.set('page', String(input.page));
  if (input.limit) params.set('limit', String(input.limit));
  const qs = params.toString();
  return adminFetch<AdminUserListResponse>(`/api/admin/users${qs ? `?${qs}` : ''}`);
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetailResponse> {
  return adminFetch<AdminUserDetailResponse>(`/api/admin/users/${userId}`);
}

export async function banAdminUser(userId: string, reason: string): Promise<void> {
  await adminFetch(`/api/admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function unbanAdminUser(userId: string): Promise<void> {
  await adminFetch(`/api/admin/users/${userId}/unban`, { method: 'POST' });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await adminFetch(`/api/admin/users/${userId}/delete`, { method: 'POST' });
}

type SyncedProfile = Pick<AdminProfile, 'id' | 'role'>;

let cachedProfileRole: AdminProfile['role'] | null = null;
let cachedAuthEmail: string | null = null;

function getClientAdminEmails(): Set<string> {
  const raw = process.env.EXPO_PUBLIC_ADMIN_EMAILS?.trim() ?? '';
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isEmailInClientAdminAllowList(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getClientAdminEmails();
  if (allowlist.size === 0) return false;
  return allowlist.has(email.trim().toLowerCase());
}

function resolveCachedAdminRole(
  syncedRole: AdminProfile['role'] | null | undefined
): AdminProfile['role'] | null {
  if (syncedRole === 'admin') return 'admin';
  if (isEmailInClientAdminAllowList(cachedAuthEmail)) return 'admin';
  return syncedRole ?? null;
}

export function isAdminUser(): boolean {
  return resolveCachedAdminRole(cachedProfileRole) === 'admin';
}

export function clearCachedProfileRole(): void {
  cachedProfileRole = null;
  cachedAuthEmail = null;
}

export async function syncUserProfile(): Promise<SyncedProfile | null> {
  const apiUrl = resolveApiUrl('/api/profile/sync');
  if (!apiUrl) return null;

  const session = await getSession();
  const token = session?.access_token;
  cachedAuthEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  if (!token) {
    cachedProfileRole = null;
    return null;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; profile?: SyncedProfile }
      | null;

    if (!response.ok || !payload?.profile) {
      const fallbackRole = resolveCachedAdminRole(null);
      cachedProfileRole = fallbackRole;
      if (fallbackRole === 'admin' && session.user?.id) {
        return { id: session.user.id, role: 'admin' };
      }
      return null;
    }

    const role = resolveCachedAdminRole(payload.profile.role) ?? payload.profile.role;
    cachedProfileRole = role;
    return { id: payload.profile.id, role };
  } catch (error) {
    const fallbackRole = resolveCachedAdminRole(null);
    cachedProfileRole = fallbackRole;
    if (fallbackRole === 'admin' && session.user?.id) {
      return { id: session.user.id, role: 'admin' };
    }
    console.warn('[profile] sync failed:', error);
    return null;
  }
}

export async function verifyAdminAccess(): Promise<'ok' | 'unauthorized' | 'forbidden' | 'unavailable'> {
  try {
    await fetchAdminStats();
    return 'ok';
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 503) return 'unavailable';
    return 'forbidden';
  }
}
