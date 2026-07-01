import {
  classifyAdminAccessError,
  type AdminAccessVerification,
} from '@/src/services/admin/adminAccessLogic';
import { getSession } from '@/src/services/authService';
import { resolveAppApiUrl } from '@/src/utils/appOrigin';

export type { AdminAccessVerification } from '@/src/services/admin/adminAccessLogic';

function resolveApiUrl(path: string): string | null {
  return resolveAppApiUrl(path);
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = resolveApiUrl(path);
  if (!apiUrl) {
    const err = new Error(
      'Admin API is only available when the app server is configured. Use npx expo start --web locally or deploy to Vercel.'
    ) as Error & { status?: number };
    err.status = 503;
    throw err;
  }

  const session = await getSession();
  const token = session?.access_token;
  if (!token) {
    const err = new Error('Sign in required.') as Error & { status?: number };
    err.status = 401;
    throw err;
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
    const payloadObj =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
    const message =
      payloadObj && typeof payloadObj.error === 'string' && payloadObj.error
        ? payloadObj.error
        : `Request failed (${response.status})`;
    const err = new Error(message) as Error & {
      status?: number;
      missingEnv?: string[];
      hint?: string;
    };
    err.status = response.status;
    if (Array.isArray(payloadObj?.missingEnv)) {
      err.missingEnv = payloadObj.missingEnv.filter((value): value is string => typeof value === 'string');
    }
    if (typeof payloadObj?.hint === 'string') {
      err.hint = payloadObj.hint;
    }
    throw err;
  }

  return payload as T;
}

export type DailyCount = { date: string; count: number };

export type AdminTopUser = {
  id: string;
  email: string | null;
  planTier: string;
  lastSeenAt: string | null;
  activityScore: number;
};

export type AdminChurnUser = {
  id: string;
  email: string | null;
  planTier: string;
  lastSeenAt: string | null;
  riskScore: number;
  daysInactive: number;
};

export type AdminAuditEvent = {
  id: string;
  actor_id: string | null;
  target_user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminStats = {
  totalUsers: number;
  signupsToday: number;
  proCount: number;
  bannedCount: number;
  onlineNow: number;
  receiptScansToday: number;
  pendingSignups: number;
  paymentsToday: number;
  premiumUsers: number;
  systemHealth: 'healthy' | 'degraded' | 'unknown';
  revenue30Day: number;
  revenue30DayNote: string;
  flaggedAccounts: number;
  supportTickets: number;
  tierFree: number;
  tierPro: number;
  tierFamily: number;
  totalReceiptScans: number;
  completedParses: number;
  completionRate: number;
  shoppingListsCreated: number;
  priceComparisonsRun: number;
  totalProRevenuePotential: number;
  dailySignups: DailyCount[];
  dailyScans: DailyCount[];
  cumulativeUsers: DailyCount[];
  topUsers: AdminTopUser[];
  churnRisk: AdminChurnUser[];
  recentActivity: AdminAuditEvent[];
  pastDueCount: number;
  abuseHeuristics: {
    bannedAccounts: number;
    pastDueSubscriptions: number;
    signupsLast24h: number;
    signupsLastHour: number;
    openFeedback: number;
    highVolumeEmailDomains: number;
  };
  stripeConfigured: boolean;
  resendConfigured: boolean;
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
  onboarding_completed_at: string | null;
  locale: string | null;
  healthScore?: number;
  receiptCount?: number;
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
  tier?: 'all' | 'free' | 'pro' | 'family' | 'premium';
  role?: 'all' | 'admin' | 'user';
  banned?: 'all' | 'banned' | 'active';
  sortBy?: 'created_at' | 'last_seen_at' | 'email';
  sortDir?: 'asc' | 'desc';
  locale?: 'all' | 'en' | 'es';
}): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (input.search?.trim()) params.set('search', input.search.trim());
  if (input.page) params.set('page', String(input.page));
  if (input.limit) params.set('limit', String(input.limit));
  if (input.tier && input.tier !== 'all') params.set('tier', input.tier);
  if (input.role && input.role !== 'all') params.set('role', input.role);
  if (input.banned && input.banned !== 'all') params.set('banned', input.banned);
  if (input.sortBy) params.set('sortBy', input.sortBy);
  if (input.sortDir) params.set('sortDir', input.sortDir);
  if (input.locale && input.locale !== 'all') params.set('locale', input.locale);
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

export async function sendReEngagementEmail(userId: string): Promise<void> {
  await adminFetch('/api/admin/re-engage', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export type AdminHealthReport = {
  overall: 'healthy' | 'degraded' | 'down' | 'unknown';
  checks: Array<{
    key: string;
    label: string;
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    detail: string;
    latencyMs?: number;
  }>;
  errorRate24h: number;
  errors24h: number;
  events24h: number;
  lastDeployAt: string | null;
  deployCommit: string | null;
  deployEnv: string | null;
};

export type AdminMessage = {
  id: string;
  title: string;
  body: string;
  audience: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
};

export type EmailLogEntry = {
  id: string;
  user_id: string | null;
  email: string | null;
  email_type: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminPaymentRow = {
  id: string;
  product: 'pro' | 'family';
  userId: string | null;
  email: string | null;
  plan: string | null;
  status: string;
  amountMonthly: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  cancelAtPeriodEnd: boolean;
};

export type AdminPaymentsSummary = {
  mrr: number;
  activeCount: number;
  trialingCount: number;
  pastDueCount: number;
  canceledCount: number;
  failedPayments: number;
  trialConversions30d: number;
};

export type SupportItem = {
  id: string;
  type: 'feedback' | 'ban' | 'privacy';
  status: string;
  userId: string | null;
  email: string | null;
  summary: string;
  createdAt: string;
};

export type UserFeedbackEntry = {
  id: string;
  user_id: string | null;
  email: string | null;
  message: string;
  category: string;
  status: 'open' | 'reviewed' | 'resolved';
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PlatformSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  featureFlags: Record<string, unknown>;
  alertSettings: {
    email?: string;
    slackWebhook?: string;
    thresholds?: {
      errorRatePercent?: number;
      pastDueCount?: number;
      churnRiskCount?: number;
    };
  };
  disableLogins: boolean;
  adminEmails: string[];
  adminEmailsMasked: string[];
  stripeConfigured: boolean;
  stripeMode: 'test' | 'live' | 'unknown';
  resendConfigured: boolean;
  updatedAt: string | null;
};

export type AdminExportType = 'users' | 'subscriptions' | 'feedback' | 'receipts';

export type AdminNavBadgeCounts = {
  messages: number;
  support: number;
};

export type PlatformStatus = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  disableLogins: boolean;
  newSignupsPaused: boolean;
  receiptScanningPaused: boolean;
  priceComparePaused: boolean;
  activeMessages: Array<{ id: string; title: string; body: string; created_at: string }>;
};

export async function fetchAdminHealth(): Promise<AdminHealthReport> {
  return adminFetch<AdminHealthReport>('/api/admin/health');
}

export async function fetchAdminActivity(input: {
  page?: number;
  limit?: number;
  eventType?: string;
}): Promise<{
  events: AdminAuditEvent[];
  total: number;
  page: number;
  limit: number;
}> {
  const params = new URLSearchParams();
  if (input.page) params.set('page', String(input.page));
  if (input.limit) params.set('limit', String(input.limit));
  if (input.eventType) params.set('eventType', input.eventType);
  const qs = params.toString();
  return adminFetch(`/api/admin/activity${qs ? `?${qs}` : ''}`);
}

export async function fetchAdminMessages(): Promise<{ messages: AdminMessage[] }> {
  return adminFetch('/api/admin/messages');
}

export async function createAdminMessage(input: {
  title: string;
  body: string;
  audience?: string;
}): Promise<void> {
  await adminFetch('/api/admin/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchAdminEmails(): Promise<{ emails: EmailLogEntry[] }> {
  return adminFetch('/api/admin/emails');
}

export async function fetchAdminPayments(): Promise<{
  subscriptions: AdminPaymentRow[];
  summary: AdminPaymentsSummary;
}> {
  return adminFetch('/api/admin/payments');
}

export async function fetchAdminSupport(): Promise<{ items: SupportItem[] }> {
  return adminFetch('/api/admin/support');
}

export async function fetchAdminFeedback(): Promise<{ feedback: UserFeedbackEntry[] }> {
  return adminFetch('/api/admin/feedback');
}

export async function updateAdminFeedbackStatus(
  id: string,
  status: UserFeedbackEntry['status']
): Promise<void> {
  await adminFetch('/api/admin/feedback', {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  });
}

export async function fetchAdminSettings(): Promise<PlatformSettings> {
  return adminFetch<PlatformSettings>('/api/admin/settings');
}

export async function updateAdminSettings(input: {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  featureFlags?: Record<string, unknown>;
  alertSettings?: PlatformSettings['alertSettings'];
  disableLogins?: boolean;
}): Promise<PlatformSettings> {
  return adminFetch<PlatformSettings>('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function downloadAdminExport(type: AdminExportType): Promise<void> {
  const apiUrl = resolveApiUrl(`/api/admin/export?type=${encodeURIComponent(type)}`);
  if (!apiUrl) throw new Error('Export API is not available.');

  const session = await getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Sign in required.');

  const response = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Export failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `penny-pantry-${type}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function fetchAdminBadges(): Promise<AdminNavBadgeCounts> {
  return adminFetch<AdminNavBadgeCounts>('/api/admin/badges');
}

export async function fetchPlatformStatus(): Promise<PlatformStatus> {
  const apiUrl = resolveApiUrl('/api/platform/status');
  if (!apiUrl) {
    return {
      maintenanceMode: false,
      maintenanceMessage: '',
      disableLogins: false,
      newSignupsPaused: false,
      receiptScanningPaused: false,
      priceComparePaused: false,
      activeMessages: [],
    };
  }
  const response = await fetch(apiUrl);
  if (!response.ok) {
    return {
      maintenanceMode: false,
      maintenanceMessage: '',
      disableLogins: false,
      newSignupsPaused: false,
      receiptScanningPaused: false,
      priceComparePaused: false,
      activeMessages: [],
    };
  }
  return (await response.json()) as PlatformStatus;
}

export async function submitUserFeedback(message: string, category?: string): Promise<void> {
  const apiUrl = resolveApiUrl('/api/feedback');
  if (!apiUrl) throw new Error('Feedback API is not available.');

  const session = await getSession();
  const token = session?.access_token;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, category }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }
}

type SyncedProfile = Pick<AdminProfile, 'id' | 'role'> & {
  onboarding_completed_at?: string | null;
};

let cachedProfileRole: AdminProfile['role'] | null = null;
let cachedAuthEmail: string | null = null;
let lastSyncedProfile: SyncedProfile | null = null;
let lastProfileSyncAt = 0;
let profileSyncInFlight: Promise<SyncedProfile | null> | null = null;

const PROFILE_SYNC_TTL_MS = 60_000;

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
  lastSyncedProfile = null;
  lastProfileSyncAt = 0;
  profileSyncInFlight = null;
}

async function fetchUserProfileSync(locale?: 'en' | 'es'): Promise<SyncedProfile | null> {
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
      body: JSON.stringify(locale ? { locale } : {}),
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
    lastSyncedProfile = {
      id: payload.profile.id,
      role,
      onboarding_completed_at: payload.profile.onboarding_completed_at ?? null,
    };
    return lastSyncedProfile;
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

/** Sync profile role from server; dedupes parallel calls and skips within TTL unless forced. */
export async function syncUserProfile(options?: {
  force?: boolean;
  locale?: 'en' | 'es';
}): Promise<SyncedProfile | null> {
  const force = options?.force ?? false;
  const now = Date.now();

  if (!force && lastProfileSyncAt > 0 && now - lastProfileSyncAt < PROFILE_SYNC_TTL_MS) {
    return lastSyncedProfile;
  }

  if (profileSyncInFlight) {
    return profileSyncInFlight;
  }

  profileSyncInFlight = fetchUserProfileSync(options?.locale)
    .then((profile) => {
      lastProfileSyncAt = Date.now();
      return profile;
    })
    .finally(() => {
      profileSyncInFlight = null;
    });

  return profileSyncInFlight;
}

export async function verifyAdminAccess(): Promise<AdminAccessVerification> {
  try {
    await fetchAdminStats();
    return { status: 'ok' };
  } catch (error) {
    return classifyAdminAccessError(error);
  }
}
