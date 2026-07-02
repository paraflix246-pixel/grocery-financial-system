import { buildMoneyLeakReport, type MoneyLeakReport } from '@/src/services/moneyLeakService';
import type { OnboardingGoal } from '@/src/services/onboardingFlowState';
import { loadPantryItems } from '@/src/services/pantryService';
import { getReceipts } from '@/src/services/storageService';
import { useListStore } from '@/src/store/useListStore';

export type OnboardingValueInsights = {
  report: MoneyLeakReport;
  isEstimate: boolean;
  estimateLabelKey: string | null;
  personalizedHeadlineKey: string | null;
};

const GOAL_HEADLINE_KEYS: Record<OnboardingGoal, string> = {
  save_money: 'onboarding.flow.value.headlineSaveMoney',
  reduce_waste: 'onboarding.flow.value.headlineReduceWaste',
  organize_pantry: 'onboarding.flow.value.headlineOrganize',
  feed_family: 'onboarding.flow.value.headlineFeedFamily',
};

export async function loadOnboardingValueInsights(
  goals: OnboardingGoal[]
): Promise<OnboardingValueInsights> {
  const [pantryItems, receipts] = await Promise.all([loadPantryItems(), getReceipts()]);
  await useListStore.getState().loadLists();
  const listItems = useListStore.getState().lists.flatMap((list) => list.items ?? []);

  const report = buildMoneyLeakReport({ pantryItems, listItems, receipts });

  if (report.hasData && report.blindSpotCount > 0) {
    const primaryGoal = goals[0];
    return {
      report,
      isEstimate: report.estimatedAtRisk == null,
      estimateLabelKey: report.estimatedAtRisk == null ? 'onboarding.flow.value.labeledEstimate' : null,
      personalizedHeadlineKey: primaryGoal ? GOAL_HEADLINE_KEYS[primaryGoal] : null,
    };
  }

  return {
    report,
    isEstimate: true,
    estimateLabelKey: 'onboarding.flow.value.conservativeEstimate',
    personalizedHeadlineKey: goals[0] ? GOAL_HEADLINE_KEYS[goals[0]] : 'onboarding.flow.value.headlineDefault',
  };
}
