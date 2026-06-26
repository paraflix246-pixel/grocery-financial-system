import AsyncStorage from '@react-native-async-storage/async-storage';

/** Local app-managed trial — native store trials via RevenueCat can replace this later. */
export const TRIAL_DURATION_DAYS = 7;

const TRIAL_STORAGE_KEY = '@smartcart_pro_trial_started_at';

export type TrialStatus = {
  active: boolean;
  daysRemaining: number;
  expired: boolean;
  startedAt: string | null;
};

export function computeTrialStatus(
  startedAt: string | null,
  now: Date = new Date()
): TrialStatus {
  if (!startedAt) {
    return { active: false, daysRemaining: 0, expired: false, startedAt: null };
  }

  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) {
    return { active: false, daysRemaining: 0, expired: true, startedAt };
  }

  const end = new Date(start);
  end.setDate(end.getDate() + TRIAL_DURATION_DAYS);

  if (now >= end) {
    return { active: false, daysRemaining: 0, expired: true, startedAt };
  }

  const msRemaining = end.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  return { active: true, daysRemaining, expired: false, startedAt };
}

export async function getTrialStartedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TRIAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function getTrialStatus(now?: Date): Promise<TrialStatus> {
  const startedAt = await getTrialStartedAt();
  return computeTrialStatus(startedAt, now);
}

export async function isTrialActive(now?: Date): Promise<boolean> {
  const status = await getTrialStatus(now);
  return status.active;
}

export async function startProTrial(now: Date = new Date()): Promise<TrialStatus> {
  const startedAt = now.toISOString();
  await AsyncStorage.setItem(TRIAL_STORAGE_KEY, startedAt);
  return computeTrialStatus(startedAt, now);
}

export async function clearTrial(): Promise<void> {
  await AsyncStorage.removeItem(TRIAL_STORAGE_KEY);
}

/** Downgrade expired trial users who are not on a paid plan. */
export async function ensureTrialExpiredDowngrade(isPaidPro: boolean): Promise<boolean> {
  const status = await getTrialStatus();
  if (!status.expired || isPaidPro) return false;
  await clearTrial();
  return true;
}
