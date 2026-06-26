import { computeTrialStatus, TRIAL_DURATION_DAYS } from '@/src/services/trialService';

const TRIAL_REMINDER_SESSION_KEY = '__grocery_trial_reminder_shown__';

export type TrialReminderLevel = 'none' | 'banner' | 'modal';

export function getTrialReminderLevel(
  startedAt: string | null,
  now: Date = new Date()
): TrialReminderLevel {
  const status = computeTrialStatus(startedAt, now);
  if (!status.active) return 'none';

  const dayOfTrial =
    TRIAL_DURATION_DAYS - status.daysRemaining + 1;

  if (dayOfTrial >= 6) return 'modal';
  if (dayOfTrial >= 5) return 'banner';
  return 'none';
}

export function trialBannerMessage(daysRemaining: number): string {
  const dayWord = daysRemaining === 1 ? 'day' : 'days';
  return `Your Pro trial ends in ${daysRemaining} ${dayWord}`;
}

export function trialModalHeadline(daysRemaining: number): string {
  const dayWord = daysRemaining === 1 ? 'day' : 'days';
  return `Your Pro trial ends in ${daysRemaining} ${dayWord}`;
}

export function trialModalBody(): string {
  return 'Subscribe to keep unlimited scans, full price history, and every Pro feature after your trial.';
}

export function wasTrialReminderModalShownThisSession(): boolean {
  const globalState = globalThis as typeof globalThis & {
    [TRIAL_REMINDER_SESSION_KEY]?: boolean;
  };
  return Boolean(globalState[TRIAL_REMINDER_SESSION_KEY]);
}

export function markTrialReminderModalShown(): void {
  const globalState = globalThis as typeof globalThis & {
    [TRIAL_REMINDER_SESSION_KEY]?: boolean;
  };
  globalState[TRIAL_REMINDER_SESSION_KEY] = true;
}
