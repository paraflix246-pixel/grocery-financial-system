import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_PROGRESS_KEY = '@pennypantry_onboarding_progress_v2';

export type OnboardingGoal = 'save_money' | 'reduce_waste' | 'organize_pantry' | 'feed_family';

export type OnboardingFirstAction = 'scan_receipt' | 'add_manual';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ONBOARDING_STEP_COUNT = 7;

export type OnboardingProgress = {
  step: OnboardingStep;
  goals: OnboardingGoal[];
  firstAction: OnboardingFirstAction | null;
  tryInProgress: boolean;
  skippedTryWithoutData: boolean;
};

export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  step: 1,
  goals: [],
  firstAction: null,
  tryInProgress: false,
  skippedTryWithoutData: false,
};

let memoryProgress: OnboardingProgress = { ...DEFAULT_ONBOARDING_PROGRESS };

export function isOnboardingTryInProgressSync(): boolean {
  return memoryProgress.tryInProgress;
}

export function clampOnboardingStep(step: number): OnboardingStep {
  const clamped = Math.min(Math.max(1, step), ONBOARDING_STEP_COUNT);
  return clamped as OnboardingStep;
}

export function parseOnboardingGoals(raw: unknown): OnboardingGoal[] {
  if (!Array.isArray(raw)) return [];
  const allowed: OnboardingGoal[] = [
    'save_money',
    'reduce_waste',
    'organize_pantry',
    'feed_family',
  ];
  return raw.filter((value): value is OnboardingGoal =>
    typeof value === 'string' && allowed.includes(value as OnboardingGoal)
  );
}

export function parseOnboardingFirstAction(raw: unknown): OnboardingFirstAction | null {
  if (raw === 'scan_receipt' || raw === 'add_manual') return raw;
  return null;
}

export function parseOnboardingProgressRaw(raw: unknown): OnboardingProgress {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ONBOARDING_PROGRESS };
  const parsed = raw as Partial<OnboardingProgress>;
  return {
    step: clampOnboardingStep(typeof parsed.step === 'number' ? parsed.step : 1),
    goals: parseOnboardingGoals(parsed.goals),
    firstAction: parseOnboardingFirstAction(parsed.firstAction),
    tryInProgress: parsed.tryInProgress === true,
    skippedTryWithoutData: parsed.skippedTryWithoutData === true,
  };
}

async function persistProgress(progress: OnboardingProgress): Promise<void> {
  memoryProgress = progress;
  try {
    await AsyncStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Native storage may be unavailable in tests or during early boot.
  }
}

export async function loadOnboardingProgress(): Promise<OnboardingProgress> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (raw) {
      memoryProgress = parseOnboardingProgressRaw(JSON.parse(raw));
      return { ...memoryProgress };
    }
  } catch {
    // Fall back to in-memory progress.
  }
  return { ...memoryProgress };
}

export async function saveOnboardingProgress(
  progress: Partial<OnboardingProgress>
): Promise<OnboardingProgress> {
  const current = memoryProgress;
  const next: OnboardingProgress = {
    step: progress.step != null ? clampOnboardingStep(progress.step) : current.step,
    goals: progress.goals ?? current.goals,
    firstAction: progress.firstAction !== undefined ? progress.firstAction : current.firstAction,
    tryInProgress: progress.tryInProgress ?? current.tryInProgress,
    skippedTryWithoutData:
      progress.skippedTryWithoutData ?? current.skippedTryWithoutData,
  };
  await persistProgress(next);
  return next;
}

export async function setOnboardingStep(step: OnboardingStep): Promise<OnboardingProgress> {
  return saveOnboardingProgress({ step });
}

export async function resetOnboardingToWelcome(): Promise<OnboardingProgress> {
  const next: OnboardingProgress = { ...DEFAULT_ONBOARDING_PROGRESS };
  await persistProgress(next);
  return next;
}

export async function toggleOnboardingGoal(goal: OnboardingGoal): Promise<OnboardingProgress> {
  const current = memoryProgress;
  const goals = current.goals.includes(goal)
    ? current.goals.filter((g) => g !== goal)
    : [...current.goals, goal];
  return saveOnboardingProgress({ goals });
}

export async function markOnboardingTryStarted(
  firstAction: OnboardingFirstAction
): Promise<OnboardingProgress> {
  return saveOnboardingProgress({
    firstAction,
    tryInProgress: true,
    skippedTryWithoutData: false,
  });
}

export async function skipOnboardingTryWithoutData(): Promise<OnboardingProgress> {
  return saveOnboardingProgress({
    step: 5,
    tryInProgress: false,
    firstAction: null,
    skippedTryWithoutData: true,
  });
}

export async function completeOnboardingTry(): Promise<OnboardingProgress> {
  return saveOnboardingProgress({
    tryInProgress: false,
    skippedTryWithoutData: false,
    step: 4,
  });
}

export async function finishOnboardingTryAndReturn(
  replace: (href: '/onboarding') => void
): Promise<void> {
  await completeOnboardingTry();
  replace('/onboarding');
}

export function resetOnboardingProgressForTests(): void {
  memoryProgress = { ...DEFAULT_ONBOARDING_PROGRESS };
}
